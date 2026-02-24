# MindPal Node Build Guide — Rules, Process & Architecture

> This is the canonical guide for building ALL MindPal nodes going forward.
> Every node spec in `mindpal/nodes/` must follow these rules.
> Last updated: February 2026

---

## Core Architecture: Context Provider + JSON Nodes

### Bid Data Extractor = Context Provider

The Bid Data Extractor is a Loop Node that reads each contractor bid PDF and produces
**rich, unstructured text/markdown context** — NOT DB-ready JSON. It extracts everything
from the PDF (contractor info, equipment, pricing, scope, warranty, electrical, timeline)
into a readable format that downstream nodes reference.

**Why unstructured context?**
- Speed: no JSON formatting overhead per table in the extraction step
- Flexibility: new downstream nodes can be added without modifying the Extractor
- Isolation: each downstream node owns its own table schema and JSON output
- Debugging: if equipment JSON is wrong, fix the Equipment Researcher, not the Extractor

### Downstream Nodes = JSON Producers

Each downstream node:
1. Receives the Extractor's unstructured context via `@[Bid Data Extractor]` / `{{#currentItem}}`
2. Parses the relevant information from that context
3. (Optionally) enriches via web research
4. Outputs flat DB-ready JSON for its specific target table(s)

### No JSON Assembler

The old v10 workflow routed all node outputs through a JSON Assembler Code Node that
merged everything into one blob, then sent it via Make.com webhook to Supabase.

**That architecture is retired.**

The new approach:
- Each downstream MindPal node outputs JSON that maps **directly** to Supabase table columns
- No intermediate JSON Assembler step
- No Make.com webhook routing
- Each node's output = the exact insert/upsert payload for its target table(s)
- The Supabase insert is handled by a Code Node downstream, but the
  AI agent's job is to produce DB-ready JSON

---

## Source of Truth: Schema Docs

Every node spec MUST be built from the canonical Supabase table schema doc, NOT from
old v10 audit files, field mapping audits, or the mindpal-json-assembler-schema.

### Current Schema Docs (use these)

**Primary reference:** `docs/SCHEMA_V2_COMPLETE.html` — comprehensive HTML doc covering ALL tables.

| Table | Schema Doc | Status |
|-------|-----------|--------|
| ALL tables | `docs/SCHEMA_V2_COMPLETE.html` | ✅ Complete (V2 restructure applied) |
| `bid_equipment` | `docs/BID_EQUIPMENT_SCHEMA.md` | ✅ Complete (SQL + JSON + field rules) |
| `bids` | `docs/SCHEMA_V2_COMPLETE.html` | ✅ 18-column identity stub |
| `bid_scope` | `docs/SCHEMA_V2_COMPLETE.html` | ✅ 69 columns (43 scope + 26 migrated) |
| `bid_contractors` | `docs/SCHEMA_V2_COMPLETE.html` | ✅ |
| `contractor_questions` | `docs/SCHEMA_V2_COMPLETE.html` | ✅ |

> **V2 Note:** The old `contractor_bids` table has been split into `bids` (identity stub) + `bid_scope` (all extracted data) + `bid_contractors` (company info). References to `contractor_bids` in this codebase are outdated.

### Schema Doc Template

Every schema doc should follow the pattern established by `BID_EQUIPMENT_SCHEMA.md`:

1. **Purpose** — What this table stores, relationship to other tables
2. **Column Table** — Every column with: name, type, nullable, default, constraints, description
3. **Indexes** — All indexes on the table
4. **Value Mappings** — ENUM values, type mappings, valid combinations
5. **MindPal JSON Output Format** — The exact JSON the agent must produce, with examples
6. **Field-by-Field Extraction Notes** — How to populate each field, common pitfalls
7. **SQL CREATE TABLE** — The actual DDL

### Stale Docs (DO NOT USE as source of truth)

All stale docs have been moved to `docs/archive/` with an explanatory README.
Do NOT reference any files in `docs/archive/` when building nodes.

---

## Node Type Decision: Loop vs Agent

### The Rule

**Loop Node** = the node processes items that arrive as an array, one at a time.
**Agent Node** = the node receives all data at once and produces one output.

### Decision Matrix for BidSmart

| Node | Type | Reasoning |
|------|------|-----------|
| **Bid Data Extractor** | LOOP | Processes each PDF independently. 1 PDF in → 1 extracted context out. Does NOT output JSON. |
| **Equipment Researcher** | LOOP | Parses equipment from Extractor context per bid. Web searches are per-bid — isolation prevents cross-contamination. |
| **Scope Extractor** | LOOP | Parses scope from Extractor context per bid. No web search — extraction only. |
| **Contractor Researcher** | LOOP | Parses contractor info from Extractor context per bid. Web search scoped per-contractor. |
| **Incentive Finder** | AGENT | Incentives are job-level, not per-bid. One lookup for the property's location/utility covers all bids. Output: array of incentive programs + summary fields. |
| **Scoring Engine** | AGENT | Needs ALL bids simultaneously to score and rank them against each other. Cross-bid comparison is the core job. Cannot score in isolation. |
| **Question Generator** | LOOP | Questions are per-bid. Each bid's gaps and issues are analyzed independently. Cross-bid references come from context (scores, other bids passed as read-only context). |
| **Per-Bid FAQ Generator** | LOOP | FAQs specific to each bid. Generated independently per contractor. |
| **Overall FAQ Generator** | AGENT | Job-level FAQs synthesizing across all bids. Needs full picture. |

### Why This Matters Without JSON Assembler

Now that each node outputs DB-ready JSON directly:

- **Loop Nodes** output one JSON object per iteration → downstream Code Node receives
  an array of results (one per bid). Each result maps to rows in a single bid's tables.

- **Agent Nodes** output one JSON object total → it contains data for the entire job
  (all bids, or job-level tables like incentives/overall FAQs).

The Supabase insert Code Node must handle both patterns:
- Loop output → iterate and insert per bid
- Agent output → insert directly (job-level) or iterate over its internal arrays

---

## Node Build Process (Repeatable for Every Node)

### Step 1: Schema First

Read the target table's schema doc (`docs/{TABLE}_SCHEMA.md`). If it doesn't exist yet,
create it first — following the `BID_EQUIPMENT_SCHEMA.md` template. The schema doc IS
the contract. The node spec is built to satisfy it.

### Step 2: Determine Node Type

Use the decision matrix above. The key question: "Does this node need to process items
independently (Loop) or does it need all data at once (Agent)?"

### Step 3: Determine Input

What does this node receive? All downstream nodes receive the Bid Data Extractor's
unstructured context as their primary input:
- Loop Node: `@[Bid Data Extractor]` as the array, `{{#currentItem}}` for each iteration
- Agent Node: `@[Bid Data Extractor]` directly in the task prompt
- Some nodes also receive outputs from other downstream nodes (e.g., Scoring Engine
  receives Equipment Researcher + Contractor Researcher + Incentive Finder outputs)

### Step 4: Build the Agent (New, From Scratch)

Every node gets a NEW agent. Never reuse existing agents. The agent has two sections:

**Background (Section 1):**
- `<role>` — What this agent does, in one sentence
- `<scope>` — What data it owns, what it does NOT touch
- `<input_format>` — Clarifies that input is unstructured context from Bid Data Extractor
- `<expertise>` — Domain knowledge relevant to this node
- `<behavior>` — Step-by-step process (parse → audit → prioritize → act → output)
- `<rules>` — Hard constraints, numbered, unambiguous

**Desired Output Format (Section 2):**
- `<output_schema>` — The exact JSON structure with types
- Field requirements (required vs nullable)
- Confidence rules
- What's NOT in the output (id, bid_id, created_at — set by DB)
- What's debugging-only (_research_meta, _scoring_notes — not inserted)

### Step 5: Write the Task Prompt

The task prompt goes in the Loop Node's "Task" field or Agent Node's "Prompt" field.
It must:
1. Reference the input variable (purple highlight!)
2. Clarify that the input is unstructured context, not pre-formatted JSON
3. Give step-by-step instructions specific to this iteration
4. Include equipment-type-specific rules where applicable
5. End with critical reminders and "Return ONLY the JSON"

### Step 6: Write Complete Examples

Every node spec must include:
- At least 2 input/output examples covering different scenarios
- Input examples must show unstructured context (as the Bid Data Extractor produces)
- Output examples must show the EXACT JSON the agent should produce
- Examples must match the schema doc column-for-column

### Step 7: Document Edge Cases, Upsert Strategy, Validation

Standard deliverables per node (see template below).

---

## Standard Node Spec Deliverable

When building a node, produce a file at `mindpal/nodes/{node-key}.md` containing:

| Section | Content |
|---------|---------|
| Header | Node key, type (Loop/Agent), target table, source-of-truth schema doc |
| Architecture Context | How this node fits: receives Extractor context → outputs DB-ready JSON |
| Agent Configuration | New agent settings (JSON mode, web search, model, temp) |
| Node Configuration | Loop/Agent config, variable references, max items |
| Background | Full system instructions Section 1 |
| Desired Output Format | Full system instructions Section 2 |
| Task Prompt | The prompt with variable references |
| Output Examples | 2+ complete input/output examples (input = unstructured context, output = JSON) |
| Output → DB Mapping | Table showing every output field → DB column + type |
| Upsert Strategy | Key fields, behavior, idempotency |
| Edge Cases | Table of scenarios and handling |
| Validation Checklist | Post-run checks for Supervised mode |

---

## Rules Claude Code Must Follow When Building Nodes

1. **Schema doc is the contract.** Every field in the schema doc must appear in the agent output. Every field in the agent output must exist in the schema doc. No extras, no gaps.

2. **Never simplify a prompt.** Start from the full spec. Make targeted changes. Never rewrite from scratch or "clean up" by removing details.

3. **Flat JSON only.** Agent output must be flat objects matching DB columns. No `{value, source, confidence}` wrappers. No nested objects unless the DB column is JSONB.

4. **New agent for every node.** Never reuse existing agents. Build from scratch with fresh Background + Desired Output Format.

5. **One node, one table (or tight table group).** Each node owns exactly the tables listed in its spec. It does not pass through data for other nodes' tables.

6. **Null over guess.** Agents must output null for unknown values. Never fabricate, infer without basis, or fill with defaults.

7. **Deterministic fields are not AI decisions.** Fields like `system_role`, `fuel_type`, `is_heat_pump` are deterministic from other fields. Document the mapping. The agent follows the mapping, not its judgment.

8. **Purple highlight rule.** Every variable reference in MindPal must show purple. Plain text = no data flows. This is the #1 cause of empty outputs.

9. **Examples must be complete.** Every example must show ALL fields, including null ones. No "... other fields ..." shorthand.

10. **Confidence is an enum, not a score.** The `confidence` field is one of: "high", "medium", "low", "manual". Not a number. Not a percentage.

11. **equipment_cost is never researched.** This field is always pass-through from the bid document. No node should ever web-search for pricing.

12. **Test with real bids in Supervised mode.** Every node must be validated against actual contractor bid PDFs before being marked as locked.

13. **Input is unstructured context.** All downstream nodes receive unstructured text from the Bid Data Extractor, NOT pre-formatted JSON. Agents must parse relevant information from this context.

14. **Bid Data Extractor does not write to tables.** It produces context only. All DB-ready JSON is produced by downstream nodes (Equipment Researcher, Scope Extractor, Contractor Researcher, etc.).

---

## Build Order

Build nodes in dependency order. Each node can only reference outputs from nodes
that run before it.

```
1. Bid Data Extractor (LOOP) — CONTEXT PROVIDER
   → Output: Unstructured text/markdown context (NOT DB-ready JSON)
   → Input: PDFs (signed URLs)
   → No schema doc needed — does not produce JSON for any table

2. Equipment Researcher (LOOP) — can run in parallel with Scope Extractor
   → Target: bid_equipment (outputs DB-ready JSON)
   → Input: @[Bid Data Extractor] (unstructured context)
   → Schema doc: BID_EQUIPMENT_SCHEMA.md ✅ EXISTS
   → Node spec: mindpal/nodes/equipment-researcher.md ✅ DONE

3. Scope Extractor (LOOP) — can run in parallel with Equipment Researcher
   → Target: bid_scope (69 columns — all extracted data)
   → Input: @[Bid Data Extractor] (unstructured context)
   → Schema doc: SCHEMA_V2_COMPLETE.html ✅
   → Node spec: mindpal/nodes/scope-extractor.md ✅ DONE (updated for V2)

4. Contractor Researcher (LOOP)
   → Target: bid_contractors (enriches contractor fields)
   → Input: @[Bid Data Extractor] (unstructured context)
   → Schema doc: SCHEMA_V2_COMPLETE.html ✅

5. Incentive Finder (AGENT)
   → Target: project_incentives (project-level, not per-bid)
   → Input: @[Bid Data Extractor] + @[Equipment Researcher]
   → Schema doc: SCHEMA_V2_COMPLETE.html ✅

6. Scoring Engine (AGENT)
   → Target: bid_scores (score fields)
   → Input: @[Equipment Researcher] + @[Contractor Researcher] + @[Incentive Finder] + user priorities
   → Schema doc: SCHEMA_V2_COMPLETE.html ✅

7. Question Generator (AGENT — needs cross-bid context)
   → Target: contractor_questions
   → Input: All prior nodes + user priorities
   → Node spec: mindpal/nodes/question-generator.md ✅ DONE (v2 4-tier system)

8. Per-Bid FAQ Generator (LOOP)
   → Target: bid_faqs
   → Input: All prior nodes
   → Schema doc needed: BID_FAQS_SCHEMA.md

9. Overall FAQ Generator (AGENT)
   → Target: project_faqs
   → Input: All prior nodes
   → Schema doc needed: PROJECT_FAQS_SCHEMA.md
```

### Supabase Insert Strategy (replaces JSON Assembler)

After all AI nodes complete, a **Code Node** handles the actual Supabase insert:

1. Receives outputs from all nodes as string inputs
2. Parses each (JSON.parse with markdown stripping)
3. Updates `bids` identity stub (status → completed, contractor_name)
4. UPSERTs `bid_scope` (69 columns — all extracted data)
5. UPSERTs `bid_contractors` (company info, reputation)
6. DELETE + INSERT `bid_equipment` (idempotent re-runs)
7. UPSERTs `bid_scores`, `contractor_questions`
8. INSERTs `bid_faqs`, `project_faqs`, `project_incentives`

> **V2 Note:** `bid_id` is pre-created — no INSERT needed for `bids`. All child tables use the existing `bid_id` as FK.

---

## Node Status Tracker

| Node | Schema Doc | Node Spec | Agent Built | Tested |
|------|-----------|-----------|-------------|--------|
| Bid Data Extractor | N/A (context only) | ❌ | ❌ | ❌ |
| Equipment Researcher | ✅ `BID_EQUIPMENT_SCHEMA.md` | ✅ `equipment-researcher.md` | ❌ | ❌ |
| Scope Extractor | ❌ Part of CONTRACTOR_BIDS | ✅ `scope-extractor.md` | ❌ | ❌ |
| Contractor Researcher | ❌ Needs schema doc | ❌ | ❌ | ❌ |
| Incentive Finder | ❌ Needs schema doc | ❌ | ❌ | ❌ |
| Scoring Engine | ❌ Needs schema doc | ❌ | ❌ | ❌ |
| Question Generator | ❌ Needs schema doc | ❌ | ❌ | ❌ |
| Per-Bid FAQ Generator | ❌ Needs schema doc | ❌ | ❌ | ❌ |
| Overall FAQ Generator | ❌ Needs schema doc | ❌ | ❌ | ❌ |
| Supabase Insert (Code) | N/A (deterministic) | ❌ | N/A | ❌ |
