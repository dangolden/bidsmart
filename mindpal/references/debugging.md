# BidSmart / MindPal — Debugging Reference

Source: BidSmart v8→v10 migration lessons + MindPal official common issues (Feb 2026)

---

## Debugging Checklist — 8 Root Causes

| Symptom | Root Cause | Fix |
|---|---|---|
| **Confidence scores <50%** (~38% is the canary) | PDF not parsing; Bid Data Extractor failing | Check Extractor raw output in Supervised Mode; verify PDF URLs are accessible |
| **Empty arrays in JSON Assembler output** | Upstream agent failure (not Assembler bug) | Check purple highlight on all Code Node inputs; check if upstream agents wrap JSON in markdown |
| **Question Generator output is generic** | Agent degraded in v10 to single-line instructions | Restore full spec from `bidsmart.md` → "Question Generator v8 Spec" |
| **JSON parse errors in Make.com** | Markdown wrappers in agent output; variable spacing bug | Strip markdown before parsing; use raw JSON editor in Make.com |
| **Electrical data missing from output** | `electrical` section missing from Extractor schema | Add full `electrical` block back to Bid Data Extractor task prompt JSON schema |
| **Gas furnace bids being processed** | No `is_heat_pump` field or no Gate Node | Add `is_heat_pump: boolean` to Extractor + Gate Node after Loop that stops on `false` |
| **Incentives not found** | Incentive Finder lacks web search or model can't handle large context | Verify web search ON; use Gemini Pro or Sonar Pro (large context window) |
| **Loop only processes 1 of 5 PDFs** | "Max items to process" slider set to 1 in Loop Node config | Increase slider in EXTRACT_ALL_BIDS Loop Node; default max is 10 |

---

## Confidence Score Health Thresholds

- **>70%** — Healthy extraction from clear, well-formatted documents
- **50–70%** — Marginal — check document scan quality; may be handwritten or unclear
- **<50%** — Extraction failing — PDF likely not parsing, URL inaccessible, or extractor prompt degraded
- **~38% flat** — Classic "Extractor is running but producing near-empty output" signature; check Extractor raw output in Supervised Mode first

---

## Critical Lessons Learned (v8 → v10 Degradation)

### 1. Never Simplify Agent Prompts During Updates
The Question Generator was reduced from a 7-category system with detailed output schema (including `good_answer_looks_like`, `concerning_answer_looks_like`, `questions_summary` array, and `electrical` category) to single-line instructions in v10. The frontend silently broke because it expected fields that no longer existed.

**Rule:** When updating any agent, start from the full original prompt and make targeted additions. Never rewrite from scratch. Always audit the output schema field-by-field against the database schema before deploying.

### 2. Output Schema = Frontend/Database Contract
Every field in an agent's JSON output schema maps directly to a database column or UI component. Dropping a field breaks things silently — no error, just missing data in the UI.

**Rule:** Check `contractor_bids`, `bid_line_items`, `bid_equipment`, `bid_questions`, `mindpal_extractions` schema before changing any agent output format.

### 3. Empty Arrays: Bug Is Almost Always Upstream
When the Code Node (JSON Assembler) produces empty arrays, the bug is NOT in the Assembler. Look upstream:
- Agent output wrapped in markdown code blocks despite JSON mode ON
- Agent field names changed but Assembler still expects old names
- Variable reference not showing purple highlight (data never arriving)

**Diagnosis sequence:**
1. Run in Supervised Mode
2. Check the agent that should have produced the data
3. Copy its raw output and try `JSON.parse()` manually
4. If it fails → markdown wrapping issue; if it works → field name mismatch

### 4. Make.com Variable Spacing Bug
Make.com UI auto-adds spaces: `{{ variable }}` instead of `{{variable}}`. Valid JSON breaks silently. The only fix is to always use Make.com's raw JSON editor in HTTP Request modules. Never use the UI field mapper to build JSON bodies with dynamic variables.

### 5. Purple Highlight Rule = Non-Negotiable
A variable that appears as plain text in the MindPal UI is NOT connected. It will be treated as a literal string at runtime. Always check that every variable reference shows purple. Re-insert via the picker button if not.

### 6. Electrical Requirements Are Safety-Critical
If the `electrical` section is missing from the Extractor output, customers could approve heat pump installations that their electrical panel can't support. The `electrical` block is non-negotiable — always validate it's present in the schema and being extracted.

### 7. Never Compare Gas Furnaces to Heat Pumps
The Gate Node after EXTRACT_ALL_BIDS must check `is_heat_pump: true` for ALL bids. If any bid is a gas furnace/central AC, terminate the workflow immediately with a clear error message. Comparing fundamentally different systems produces meaningless scores.

### 8. Code Node Input Parsing Is Mandatory
Per MindPal official docs: ALL Code Node inputs arrive as strings, regardless of what type the upstream node produced. Never assume a JSON-mode agent's output will arrive pre-parsed. Always use `safeParseJSON()` with markdown stripping. Silently returning `null` from a failed parse is better than throwing an uncaught exception that kills the whole workflow.

---

## Debugging Workflow in Supervised Mode

1. Open the workflow in MindPal
2. Run → choose "Supervised Mode"
3. Step through each node; inspect raw output before proceeding
4. If an agent's output looks wrong:
   - Check if it's wrapped in markdown (```json ... ```)
   - Check if fields have the right names
   - Check if the variable reference showed purple before running
5. Regenerate individual steps if needed to test changes in isolation

---

## Common Workflow Structure Issues (from official docs)

- **Multiple starting points** → Only one node can have no incoming connections
- **Disconnected nodes** → Nodes not in the main flow are silently skipped (no error)
- **Variable shows wrong data** → Check which field you're referencing from a multi-field Human Input Node
- **Gate Node stops unexpectedly** → Clarify the logic; add explicit TRUE/FALSE examples in the decision prompt
- **Router takes wrong path** → Make conditions specific; test all paths explicitly
