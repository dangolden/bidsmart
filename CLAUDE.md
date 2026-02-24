# CLAUDE.md — Bid Compare Project Context

> Loaded automatically by Claude Code every session.
> Last updated: February 2026

---

## MindPal Skill Reference

Invoke with `/mindpal` — skill file at `.claude/skills/mindpal/SKILL.md`
Reference docs at `mindpal/references/`

---

## Part 1: What This Project Is

**Bid Compare** is a standalone web app for comparing HVAC contractor bids, focused specifically on heat pump installations.

The core promise: upload bid documents → tell us what you care about → get a structured comparison, a recommendation, and specific questions to ask each contractor.

This app lives on its own (not embedded in another product yet). Simple UI, clean workflow, single job-to-results experience.

### Current Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript |
| Database | Supabase (Postgres) |
| Storage | Supabase Storage (signed URLs for PDF access) |
| AI Workflow | MindPal (v10, 11-12 agents, ~3-5 min per job) |
| Automation middleware | Make.com (parses MindPal webhook → routes to Supabase) |
| Edge Functions | Supabase Edge Functions (`start-mindpal-analysis`, `mindpal-callback`) |
| Error alerts | Gmail → dangolden@pandotic.ai |

### What "Done" Looks Like for a Job

A job is complete when:
1. Each uploaded bid PDF is normalized into structured bid records in Supabase
2. Per-bid metrics are stored (equipment, pricing, warranty, electrical, scope)
3. A cross-bid comparison + recommendation is stored
4. The UI can render the full results from database records alone — no monolithic JSON blob required

---

## Part 2: User Experience Flow

1. User creates a new **Bid Comparison** job
2. Uploads 1–5 contractor bid PDFs
3. Answers a short "what matters to you" questionnaire:
   - **Priorities** (rank/weight): lowest cost, best efficiency, comfort, cold-climate performance, noise, warranty, installer reputation, speed, lowest risk
   - **Constraints**: budget range, timeline, ductwork preferences, panel/electrical work acceptability
4. Clicks "Analyze my bids"
5. UI shows progress: overall job status + per-bid status
6. Results page shows:
   - Quick recommendation with explanation
   - Clean heat pump comparison table
   - "Scope differences" section (items outside heat pump scope, e.g. water heater replacement)
   - "Questions to ask" section (generated per-bid based on gaps and inconsistencies)

### Job Status Values
`queued` | `processing` | `needs_info` | `complete` | `failed`

---

## Part 3: End-to-End System Flow

```
User uploads PDFs via frontend
  → Frontend creates job record in Supabase
  → Frontend uploads PDFs to Supabase Storage
  → Frontend calls Edge Function: start-mindpal-analysis
       (payload: job_id, signed PDF URLs, user priorities)
  → MindPal Workflow triggers (async)
       - Loop Node: extract each PDF → Bid Data Extractor agent
       - Equipment Researcher → enriches with web-searched specs
       - Contractor Researcher → reviews, BBB, licensing
       - Incentive Finder → HEEHRA rebates, federal tax credits, utility programs
       - Scoring Engine → comparison scores
       - Question Generator → per-bid questions for homeowner
       - FAQ Generator → 15 standard comparison FAQs
       - JSON Assembler (Code Node) → merges all outputs, validates schema
       - Webhook Node → sends to Make.com
  → Make.com scenario: extracts clean JSON from MindPal payload
  → Make.com → Supabase Edge Function: mindpal-callback
  → Edge Function writes to normalized Supabase tables
  → Frontend polls/subscribes to job status + output tables
  → UI renders from DB records (no giant JSON in memory)
```

### Key Architecture Rules

- **MindPal results are routed via Make.com → Edge Function** — not direct DB writes
- **Nodes must be idempotent** — safe to re-run without duplicating records
- **"Unknown" is explicit** — nodes write `null` + reason, never guess
- **Heat pump comparison focus** — non-heat-pump items (water heaters, etc.) are recorded as scope differences, not deep-compared
- **Frontend renders from DB records** — never depends on a single monolithic JSON blob

---

## Part 4: Supabase Data Model (Conceptual)

### User-Input Tables (populated by frontend, NOT MindPal)
- Job setup fields (job name, created_by, timestamps, status)
- User priorities and constraints
- Source document records (file metadata, storage paths)

### MindPal-Populated Tables (AI outputs)
- Normalized bid records (one per contractor proposal)
- Per-bid scope, assumptions, line-item notes
- Per-bid metrics (capacity, efficiency ratings, warranty, electrical, duct notes, risks)
- Cross-bid comparison and recommendation
- Clarification questions

### Key Tables
```
bids                  — identity stub (status, request_id, storage_key)
bid_scope             — all extracted data (69 columns)
bid_equipment         — normalized equipment records
bid_contractors       — company info, contact, license, ratings
contractor_questions  — generated questions for homeowner
mindpal_extractions   — raw extraction data + debug info
```

### Important DB Rules
- All AI-populated tables have an extraction quality/confidence field
- `is_heat_pump: boolean` is required — used for safety validation before comparison
- Electrical panel data is safety-critical — always stored separately, flagged when missing
- Upsert keys must prevent duplicates across re-runs (idempotency)

---

## Part 5: MindPal Workflow — Current State

### v10 Workflow (current)

```javascript
WORKFLOW_ID: '69860fd696be27d5d9cb4252'

FIELD_IDS: {
  documents:       '69860fd696be27d5d9cb4258',  // JSON array of signed PDF URLs
  user_priorities: '69860fd696be27d5d9cb4255',  // {"price":4,"warranty":3,...}
  request_id:      '69860fd696be27d5d9cb4257',  // unique string (job_id)
  callback_url:    '69860fd696be27d5d9cb4256'   // Make.com webhook URL
}
```

**API endpoint:**
```
POST https://api-v3.mindpal.io/api/v1/workflow-runs?workflow_id=69860fd696be27d5d9cb4252
Authorization: Bearer {MINDPAL_API_KEY}
```

**⚠️ Known issue:** Question Generator degraded in v10 to single-line instructions. The full v8 spec (7-category system, electrical category, `good_answer_looks_like` fields, `questions_summary` array) must be restored. Full spec in `mindpal/references/bidsmart.md`.

### How Documents Are Passed to MindPal
PDFs live in Supabase Storage. The frontend generates **signed URLs** and passes them as a JSON array string to MindPal. MindPal fetches documents via URL. No base64 encoding.

---

## Part 6: How We Use Claude Code

Claude Code is the spec + prompt generator for the node-by-node workflow rebuild.

For each Supabase table that MindPal populates, Claude Code produces:
1. The MindPal node prompt (system instructions + task prompt)
2. The strict JSON output schema
3. Example payloads (one-row + multi-row)
4. Field-by-field population rules
5. Edge case handling
6. Idempotency / upsert key strategy

### Standard Node/Table Deliverable

When asked to spec a node, produce this:

| Item | Content |
|------|---------|
| Node Key | Stable identifier, e.g. `bid-data-extractor` |
| Target table | Which Supabase table |
| Prerequisites | job_id, bid_id, signed URL, prior node outputs |
| Output JSON example | One-row + multi-row if applicable |
| Field-by-field rules | How to populate each field, when null, formatting |
| Edge cases | Multiple systems in one bid, missing models, combined pricing |
| Upsert strategy | What key prevents duplicates |

---

## Part 7: Active Refactoring Plan

> This section documents the current work-in-progress. Update as nodes are completed.

### Goal

Rebuild the MindPal workflow one node at a time using the Supabase schema as the contract. Each node owns exactly one table (or one tight table group). Debugging becomes "which node/table has wrong data" instead of "where did the blob break."

### Guiding Rules

**One major AI-output table = one MindPal node.**

Tables populated by user input (job creation, file uploads, priority settings) are frontend-handled — excluded from MindPal scope.

**Repeatable build loop per node:**
1. Inspect the target table schema (required fields, types, constraints, enums, FK relationships)
2. Define the node contract (inputs, output records, missing-data behavior)
3. Write the node prompt (Claude Code generates this)
4. Implement in MindPal — verify it can run independently
5. Test with real bids — validate completeness, schema compliance, idempotency
6. Lock — version the prompt + output schema

### Build Order (Planned)

```
1. Bid Data Extractor (LOOP)         → raw extraction per PDF
2. Equipment Analyzer (LOOP)         → bid_equipment (enriched specs)
3. Supabase Post (bid_equipment)     → writes directly to Supabase
4. Contractor Research (LOOP)        → bid_contractors (reputation fields)
5. Supabase Post (bid_contractor)    → writes directly to Supabase
6. Scope Extractor (LOOP)            → bid_scope (69 columns)
7. Supabase Post (bid_scope)         → writes directly to Supabase
8. Contractor Questions (AGENT)      → contractor_questions (cross-bid analysis)
9. Supabase Post (Questions)         → writes directly to Supabase
```

### Immediate Priority: Restore Question Generator

This is the most critical fix. Required fields currently missing in v10:

- `question_category` with all 7 values (including `electrical`)
- `good_answer_looks_like`
- `concerning_answer_looks_like`
- `triggered_by`
- `missing_field`
- `questions_summary` array (per-bid summary with counts and main_concerns)

Full v8 spec → `mindpal/references/bidsmart.md`

### Safety Requirements (Non-Negotiable)

Every version of this workflow must enforce:
1. `is_heat_pump: boolean` extracted from every bid
2. Gate Node after extraction — stop workflow if any bid is not a heat pump
3. `electrical` section extracted — HIGH priority question generated if missing
4. Never silently compare gas furnace bids alongside heat pump bids

---

## Part 8: Rules Claude Code Must Always Follow

1. **Never simplify an agent prompt** — always start from the full existing prompt and make targeted changes. Never rewrite from scratch.
2. **Output schema = database contract** — every dropped field silently breaks the frontend or DB inserts.
3. **All Code Node inputs are strings** — always `JSON.parse()`, always strip markdown wrappers before parsing.
4. **Purple highlight rule** — a MindPal variable reference only works if it displays purple in the UI. Plain text = broken = no data.
5. **Make.com raw JSON editor** — never use the field mapper UI for dynamic JSON bodies. It adds spaces to `{{variables}}` and silently breaks parsing.
6. **Documents are signed URLs** — never encode PDFs as base64. MindPal fetches from Supabase Storage URLs.
7. **Confidence score thresholds**: >70% healthy | 50-70% marginal | <50% extraction failing upstream.
8. **Empty arrays in JSON Assembler** — root cause is almost always upstream, not the Code Node itself. Check upstream agent raw output first.

---

## Part 9: File Editing Rules — Worktrees vs Main Repo

### The Problem
This project uses multiple Git worktrees (under `.claude/worktrees/`). Each worktree is a separate branch checked out in a separate directory. **Edits to a file in one worktree do NOT appear in any other worktree or in the main repo.** This has repeatedly caused stale copies of `SCHEMA_V2_COMPLETE.html` to persist in the main repo and other worktrees while fixes only landed in one branch.

### Source of Truth Rules

**`docs/SCHEMA_V2_COMPLETE.html` — the schema spec doc:**
- **Single source of truth = `docs/SCHEMA_V2_COMPLETE.html` in the MAIN REPO** (branch: `staging`, path: `/Users/dangolden/BidSmart/bidsmart/docs/SCHEMA_V2_COMPLETE.html`)
- Always edit the main repo copy first. After editing, copy to any worktree that needs it.
- After every edit, run this sync to keep all copies identical:
  ```bash
  SRC="/Users/dangolden/BidSmart/bidsmart/docs/SCHEMA_V2_COMPLETE.html"
  for wt in /Users/dangolden/BidSmart/bidsmart/.claude/worktrees/*/; do
    [ -f "${wt}docs/SCHEMA_V2_COMPLETE.html" ] && cp "$SRC" "${wt}docs/SCHEMA_V2_COMPLETE.html"
  done
  ```
- Always commit the main repo copy on `staging` after changes.

**`supabase/migrations_v2/` — migration files:**
- Source of truth = `festive-curran` worktree (branch: `claude/festive-curran`)
- Always create new migration files there, apply via MCP, then commit there.

**`src/types/database.ts` — generated TypeScript types:**
- Lives in `festive-curran` worktree.
- Regenerate via MCP `generate_typescript_types` after any schema change, overwrite in `festive-curran`.

### Mandatory Check Before Any Doc Edit
Before editing `SCHEMA_V2_COMPLETE.html`, always:
1. Check which copy is newest: `ls -la /Users/dangolden/BidSmart/bidsmart/docs/SCHEMA_V2_COMPLETE.html` and compare with worktree copies
2. Edit the main repo copy (`/Users/dangolden/BidSmart/bidsmart/docs/`)
3. After editing, run the sync command above to propagate to all worktrees
4. Commit on `staging`

### Current Worktree Layout
```
/Users/dangolden/BidSmart/bidsmart/               ← MAIN REPO (branch: staging)
  docs/SCHEMA_V2_COMPLETE.html                    ← SOURCE OF TRUTH for schema doc
  supabase/migrations/                            ← V1 migrations (don't touch)

.claude/worktrees/festive-curran/                 ← branch: claude/festive-curran
  supabase/migrations_v2/                         ← V2 migration files (source of truth)
  src/types/database.ts                           ← generated TS types

.claude/worktrees/confident-perlman/              ← branch: claude/confident-perlman
  docs/SCHEMA_V2_COMPLETE.html                    ← REPLICA (sync from main repo)

.claude/worktrees/naughty-cannon/                 ← branch: claude/naughty-cannon
  docs/SCHEMA_V2_COMPLETE.html                    ← REPLICA (sync from main repo)
```

---

*Project: Bid Compare*
*Stack: React + TypeScript, Supabase, MindPal v10, Make.com*
*Contact: dangolden@pandotic.ai*
*Last updated: February 2026*
