# MindPal V2 Integration Guide

> **Purpose**: Step-by-step instructions for integrating the V2 schema changes into the MindPal workflow.
> **Date**: February 2026
> **Workflow ID**: `699a33ac6787d2e1b0e9ed93` (v18)
> **Status**: Database restructure COMPLETE and LIVE. MindPal workflow needs these changes.
>
> **Architecture**: Path A — inline Supabase POST agents (matches current v18 pattern).
> Each agent writes directly to Supabase via MindPal's HTTP integration tool.
> No callback webhook required during MindPal processing.
>
> **Nodes NOT in v18 yet (will be added later)**: Incentive Finder, Scoring Engine, Per-Bid FAQ, Overall FAQ.
> Focus on getting the existing nodes working with V2 schema first.

---

## What Changed and Why

### The Problem (409 FK Errors)
The old workflow had MindPal's callback edge function **creating bid rows** at callback time. Child tables (`bid_contractors`, `bid_equipment`, `contractor_questions`) have foreign keys to `bids`. When the callback tried to INSERT child rows before the parent bid row was committed, Supabase returned **409 Conflict / FK violation** errors.

### The Fix
1. **Bids are pre-created by the frontend** at PDF upload time (`status: 'pending'`). The `bid_id` UUID exists before MindPal ever runs.
2. **MindPal receives `bid_id` paired with each document URL** via a new `documents_json` field (instead of a flat URL array).
3. **Inline Supabase POST agents** (already in v18) write directly to Supabase via HTTP integration. They UPDATE existing bid rows and UPSERT child records using the pre-existing `bid_id`.
4. **26 columns moved from `bids` → `bid_scope`**: pricing, payment, warranty, timeline, extraction metadata now live in `bid_scope` (69 columns total). `bids` is a slim 18-column identity stub.

### Current v18 Workflow (10 nodes)
```
1. API Input (HUMAN_INPUT)
  → 2. Extract All Bid Info (LOOP — Bid Data Extractor per PDF)
    → 3. Equipment Analyzer (LOOP — Equipment Researcher per bid)
      → 4. Supabase Post (bid_equipment) — AGENT writes to Supabase directly
        → 5. Contractor Research (LOOP — Contractor Researcher per bid)
          → 6. Supabase Post (bid_contractor) — AGENT writes to Supabase directly
            → 7. Scope Extractor (LOOP — Scope Extractor per bid)
              → 8. Supabase Post (bid_scope) — AGENT writes to Supabase directly
                → 9. Contractor Questions (AGENT — cross-bid analysis)
                  → 10. Supabase Post (Contractor Questions) — AGENT (not yet configured)
```

### Database Architecture (V2)
```
bids (18 cols)          — Identity stub: status, request_id, storage_key, processing_attempts
  |-- 1:1 bid_scope (69 cols)      — ALL extracted data: scope + pricing + payment + warranty + timeline + extraction
  |-- 1:1 bid_contractors           — Company info, contact, license, ratings
  |-- 1:1 bid_scores                — Scoring, flags
  |-- 1:N bid_equipment             — Major appliances (heat pump, air handler)
  |-- 1:N contractor_questions      — Clarification questions for homeowner
  |-- 1:N bid_faqs                  — Per-bid FAQs
```

---

## Workflow Changes Required (Steps B1–B9)

### B1: Add `documents_json` Input Field ✅ DONE

**Where**: MindPal workflow settings → Input Fields

**Field ID**: `699d42f8f6f83a173c0b6d4a`
**Mention syntax**: `@[API Input - documents_json](type=WORKFLOW_HUMAN_INPUT_FIELD&workflowHumanInputFieldId=699d42f8f6f83a173c0b6d4a)`

**All input fields** (updated):
```
documents       → 699a33ad6787d2e1b0e9ed96  (JSON array of signed PDF URLs — legacy, keep for now)
documents_json  → 699d42f8f6f83a173c0b6d4a  (JSON array of {bid_id, doc_url, mime_type} — V2)
user_priorities → 699a33ad6787d2e1b0e9ed98
request_id      → 699a33ad6787d2e1b0e9ed97
callback_url    → 699a33ad6787d2e1b0e9ed9b
user_notes      → 699a33ad6787d2e1b0e9ed9a
project_id      → 699a33ad6787d2e1b0e9ed99
```

**What the frontend will send** in `documents_json`:
```json
[
  {"bid_id": "uuid-1", "doc_url": "https://signed-url-1.pdf", "storage_key": null, "mime_type": "application/pdf"},
  {"bid_id": "uuid-2", "doc_url": "https://signed-url-2.pdf", "storage_key": null, "mime_type": "application/pdf"}
]
```

> **Note**: The existing `documents` field (flat URL array) will be kept for backward compatibility during the transition. Once `documents_json` is working, `documents` can be deprecated.

---

### B2: Add "Parse Documents JSON" CODE Node

**Position**: First node in the workflow chain (before the Loop)
**Node Type**: CODE
**Input**: `@[API Input - documents_json]` — must show purple in MindPal UI

**Code** (paste this exactly):
```javascript
const raw = @[API Input - documents_json];
let docs;
try {
  // Strip markdown wrappers if present
  let cleaned = raw;
  if (typeof cleaned === 'string') {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  docs = JSON.parse(cleaned);
} catch (e) {
  throw new Error('Failed to parse documents_json: ' + e.message);
}

// Validate
if (!Array.isArray(docs) || docs.length === 0) {
  throw new Error('documents_json must be a non-empty array');
}

for (const doc of docs) {
  if (!doc.bid_id || !doc.doc_url) {
    throw new Error('Each document must have bid_id and doc_url');
  }
}

return JSON.stringify(docs);
```

**Output**: JSON string array of `{bid_id, doc_url, mime_type}` objects.

> **⚠️ CRITICAL**: All MindPal CODE node inputs are strings. The `JSON.parse()` and markdown stripping are required.

---

### B3: Update Loop Node Iteration

**What to change**: The Loop Node currently iterates over the flat URL array from the `documents` field. Change it to iterate over the output of the "Parse Documents JSON" CODE node.

**Each loop iteration now provides**:
- `@[item - bid_id]` — the UUID of the pre-created bid row
- `@[item - doc_url]` — the signed URL for the PDF
- `@[item - mime_type]` — "application/pdf"

> **⚠️ CRITICAL**: All variable references (`@[item - bid_id]`, etc.) must display **purple** in the MindPal UI. Plain text = broken = no data flows.

---

### B4: Update Bid Data Extractor Agent Prompt

The Bid Data Extractor agent must now:
1. **Receive the `bid_id`** from the loop item
2. **Include it in its output** without modification

**Add to the agent's system instructions (Background section)**:
```
CRITICAL: Your output JSON must include the bid_id field exactly as provided in the input.
Do NOT generate a new bid_id. Pass through the bid_id from: @[item - bid_id]

The bid_id is: @[item - bid_id]
```

**Add `bid_id` as the FIRST field in the output JSON schema**:
```json
{
  "bid_id": "@[item - bid_id]",
  "contractor_info": { ... },
  "pricing": { ... },
  "payment_terms": { ... },
  "warranty": { ... },
  "timeline": { ... },
  "dates": { ... },
  "scope_of_work": { ... },
  "equipment": [ ... ],
  "overall_confidence": 85,
  "extraction_notes": [ ... ]
}
```

---

### B5: Update ALL Downstream Loop Agents

Every agent inside the loop must pass through `bid_id` unchanged:

**Agents to update**:
- Equipment Researcher
- Contractor Researcher
- Scope Extractor

**Add to each agent's prompt** (both Background and Task sections):
```
Include bid_id in your output exactly as received: @[item - bid_id]
```

**Add to each agent's output schema**:
```json
{
  "bid_id": "@[item - bid_id]",
  ... (rest of agent's normal output)
}
```

---

### B6: Update Scope Extractor Agent for 69 Columns

**THIS IS THE MAIN CHANGE.** The `bid_scope` table now has **69 columns** (expanded from 43). The Scope Extractor agent's output must cover all of them including the 26 migrated columns.

**Full updated prompt**: Copy from `mindpal/nodes/scope-extractor.md` — it has:
- **Agent Background**: Updated `<scope>` section listing all 69 columns
- **Desired Output Format**: Full JSON schema with all 26 V2 migrated columns added
- **Task Prompt**: Steps 7-12 added for extracting pricing, payment, warranty, timeline, extraction metadata

**New columns that MUST be in the Scope Extractor output** (moved from old `bids` table):

| Group | Columns | Count |
|-------|---------|-------|
| System Type | `system_type` (always "heat_pump") | 1 |
| Pricing | `total_bid_amount`, `labor_cost`, `equipment_cost`, `materials_cost`, `permit_cost`, `disposal_cost`, `electrical_cost`, `total_before_rebates`, `estimated_rebates`, `total_after_rebates` | 10 |
| Payment Terms | `deposit_required`, `deposit_percentage`, `payment_schedule`, `financing_offered`, `financing_terms` | 5 |
| Warranty | `labor_warranty_years`, `equipment_warranty_years`, `compressor_warranty_years`, `additional_warranty_details` | 4 |
| Timeline | `estimated_days`, `start_date_available`, `bid_date`, `valid_until` | 4 |
| Extraction Metadata | `extraction_confidence`, `extraction_notes` | 2 |
| **Total new** | | **26** |

**After updating the Scope Extractor prompt**, also update the **"Supabase Post (bid_scope)" agent** (node 8) to include the new columns in its Supabase REST API call.

---

### B7: Update "Supabase Post (bid_scope)" Agent Tool

The "Supabase Post (bid_scope)" agent uses MindPal's HTTP integration to POST directly to Supabase. Its Custom API tool must be updated to include the 26 new columns.

**What to update in the Supabase REST API tool configuration:**
- The request body schema must include all 26 new fields (system_type, pricing, payment, warranty, timeline, extraction metadata)
- Field descriptions: copy from `docs/FIELD_DESCRIPTIONS.md` (bid_scope section)
- The UPSERT endpoint: `POST /rest/v1/bid_scope` with `Prefer: resolution=merge-duplicates` header and `on_conflict=bid_id`

---

### B8: Update "Supabase Post (Contractor Questions)" Agent

Node 10 exists but has an empty prompt. Configure it to:
1. Receive output from the Contractor Questions agent (node 9)
2. Parse the JSON questions array
3. For each question, POST to `contractor_questions` table via Supabase REST API
4. Include ALL fields: question_text, question_category, question_tier, priority, context, triggered_by, good_answer_looks_like, concerning_answer_looks_like, missing_field, display_order
5. Set `auto_generated = true` and `is_answered = false` for all

**Field descriptions**: Copy from `docs/FIELD_DESCRIPTIONS.md` (contractor_questions section)

> **Note**: The Question Generator outputs `bid_index` (0-based) not `bid_id`. The Supabase Post agent needs to resolve bid_index → bid_id. If this is complex, consider having the Question Generator include `bid_id` directly by adding bid_id passthrough from the upstream loop.

---

### B9: End-to-End Test Checklist

1. ☐ Upload one PDF through the frontend
2. ☐ Verify the `bids` row is created with `status: 'pending'` (check Supabase dashboard)
3. ☐ Click "Analyze my bids" to trigger analysis
4. ☐ Verify `bids.status` changes to `'processing'`
5. ☐ Wait for MindPal to complete (~3-5 min)
6. ☐ Verify callback arrives and:
   - ☐ `bids.status` → `'completed'`
   - ☐ `bid_scope` row created with all extracted data (check pricing, warranty, scope booleans)
   - ☐ `bid_contractors` row created (check company_name, phone, email)
   - ☐ `bid_equipment` rows created (check brand, model, SEER ratings)
   - ☐ `contractor_questions` rows created (if Question Generator ran)
7. ☐ Verify frontend renders the results (ComparePhase, BidCard, DecidePhase)

---

## Callback Contract Reference

### Full JSON Payload Example

This is the exact structure the `mindpal-callback` edge function expects:

```json
{
  "request_id": "string — batch correlation ID",
  "project_id": "string — UUID of the project",
  "signature": "string — HMAC-SHA256 for verification",
  "timestamp": "string — ISO timestamp",
  "status": "success | partial | failed",
  "bids": [
    {
      "bid_id": "string — UUID of the pre-created bid row",
      "contractor_info": {
        "company_name": "Acme HVAC",
        "contact_name": "John Smith",
        "phone": "555-1234",
        "email": "john@acme.com",
        "website": "https://acme-hvac.com",
        "license_number": "C20-12345",
        "license_state": "CA"
      },
      "pricing": {
        "total_amount": 18500.00,
        "labor_cost": 4500.00,
        "equipment_cost": 10000.00,
        "materials_cost": 1500.00,
        "permit_cost": 500.00,
        "disposal_cost": 300.00,
        "electrical_cost": 1200.00,
        "price_before_rebates": 18500.00,
        "rebates_mentioned": [
          {"name": "Federal 25C Tax Credit", "amount": 2000, "type": "federal"},
          {"name": "State Rebate", "amount": 1000, "type": "state"}
        ],
        "price_after_rebates": 15500.00,
        "confidence": 85
      },
      "payment_terms": {
        "deposit_amount": 5000.00,
        "deposit_percentage": 27.0,
        "payment_schedule": "50% deposit, 50% on completion",
        "financing_offered": true,
        "financing_terms": "0% for 12 months through GreenSky"
      },
      "warranty": {
        "labor_warranty_years": 2,
        "equipment_warranty_years": 10,
        "compressor_warranty_years": 12,
        "warranty_details": "Manufacturer warranty requires annual maintenance"
      },
      "timeline": {
        "estimated_days": 2,
        "start_date_available": "2026-03-15",
        "bid_valid_until": "2026-04-15"
      },
      "dates": {
        "bid_date": "2026-02-20",
        "valid_until": "2026-04-15"
      },
      "scope_of_work": {
        "summary": "Full heat pump installation with 3-ton Carrier system...",
        "inclusions": ["Permit and inspections", "Disposal of old system"],
        "exclusions": ["Ductwork modifications", "Drywall repair"],
        "permit_included": true,
        "disposal_included": true,
        "electrical_work_included": true,
        "ductwork_included": false,
        "thermostat_included": true,
        "manual_j_included": true,
        "commissioning_included": true,
        "air_handler_included": true,
        "line_set_included": true,
        "disconnect_included": true,
        "pad_included": true,
        "drain_line_included": true,
        "panel_assessment_included": true,
        "panel_upgrade_included": false,
        "dedicated_circuit_included": true,
        "electrical_permit_included": true,
        "load_calculation_included": false,
        "existing_panel_amps": 200,
        "proposed_panel_amps": null,
        "breaker_size_required": 40,
        "panel_upgrade_cost": null,
        "electrical_notes": "Existing 200A panel has capacity",
        "accessories": [
          {"type": "thermostat", "name": "Ecobee Premium", "brand": "Ecobee", "model_number": "EB-STATE6-01", "description": null, "cost": 249.99}
        ],
        "line_items": [
          {"item_type": "equipment", "description": "Carrier 25VNA036", "amount": 8500.00, "quantity": 1, "unit_price": 8500.00, "is_included": true, "notes": null}
        ]
      },
      "equipment": [
        {
          "equipment_type": "heat_pump",
          "brand": "Carrier",
          "model_number": "25VNA036A003",
          "model_name": "Infinity 24",
          "capacity_btu": 36000,
          "capacity_tons": 3.0,
          "seer_rating": 24.0,
          "seer2_rating": 22.5,
          "hspf_rating": 13.0,
          "hspf2_rating": 10.0,
          "eer_rating": 15.0,
          "variable_speed": true,
          "stages": "variable",
          "refrigerant": "R-410A",
          "sound_level_db": 56,
          "voltage": 240,
          "energy_star": true,
          "energy_star_most_efficient": true,
          "equipment_cost": 8500.00,
          "confidence": 90
        }
      ],
      "overall_confidence": 85,
      "extraction_notes": [
        {"type": "info", "message": "All major fields extracted cleanly"}
      ]
    }
  ],
  "faqs": [
    {
      "bid_id": "uuid",
      "faq_key": "what-is-seer",
      "question_text": "What does the SEER rating mean?",
      "answer_text": "SEER measures cooling efficiency...",
      "answer_confidence": "high",
      "is_answered": true,
      "display_order": 1
    }
  ],
  "questions": [
    {
      "bid_id": "uuid",
      "question_text": "Does your bid include a dedicated 240V circuit?",
      "question_category": "scope",
      "question_tier": "essential",
      "priority": "high",
      "context": "Heat pumps require a dedicated 240V circuit...",
      "triggered_by": "missing_field",
      "missing_field": "dedicated_circuit_included",
      "good_answer_looks_like": "Yes, we include a dedicated 40A 240V circuit with breaker installation",
      "concerning_answer_looks_like": "That would be extra / We don't handle electrical",
      "display_order": 1
    }
  ]
}
```

---

## Field-by-Field Mapping Tables

### MindPal → `bid_scope` table (UPSERT on bid_id)

| MindPal JSON path | → DB column | Notes |
|---|---|---|
| `scope_of_work` exists → `"heat_pump"` | `system_type` | Hardcoded |
| `pricing.total_amount` | `total_bid_amount` | REQUIRED |
| `pricing.labor_cost` | `labor_cost` | Optional |
| `pricing.equipment_cost` | `equipment_cost` | Optional |
| `pricing.materials_cost` | `materials_cost` | Optional |
| `pricing.permit_cost` | `permit_cost` | Optional |
| `pricing.disposal_cost` | `disposal_cost` | Optional |
| `pricing.electrical_cost` | `electrical_cost` | Optional |
| `pricing.price_before_rebates` | `total_before_rebates` | Optional |
| SUM of `pricing.rebates_mentioned[].amount` | `estimated_rebates` | Calculated |
| `pricing.price_after_rebates` | `total_after_rebates` | Optional |
| `payment_terms.deposit_amount` | `deposit_required` | Optional |
| `payment_terms.deposit_percentage` | `deposit_percentage` | Optional |
| `payment_terms.payment_schedule` | `payment_schedule` | Optional |
| `payment_terms.financing_offered` | `financing_offered` | Default false |
| `payment_terms.financing_terms` | `financing_terms` | Optional |
| `warranty.labor_warranty_years` | `labor_warranty_years` | Optional |
| `warranty.equipment_warranty_years` | `equipment_warranty_years` | Optional |
| `warranty.compressor_warranty_years` | `compressor_warranty_years` | Optional |
| `warranty.warranty_details` | `additional_warranty_details` | Optional |
| `timeline.estimated_days` | `estimated_days` | Optional |
| `timeline.start_date_available` | `start_date_available` | DATE |
| `dates.bid_date` | `bid_date` | DATE |
| `dates.valid_until` | `valid_until` | DATE |
| `overall_confidence` | `extraction_confidence` | ≥90→high, ≥70→medium, <70→low |
| `extraction_notes[]` joined | `extraction_notes` | "[TYPE] message\n..." |
| `scope_of_work.summary` | `summary` | TEXT |
| `scope_of_work.inclusions` | `inclusions` | TEXT[] |
| `scope_of_work.exclusions` | `exclusions` | TEXT[] |
| `scope_of_work.permit_included` | `permit_included` | BOOLEAN |
| `scope_of_work.disposal_included` | `disposal_included` | BOOLEAN |
| `scope_of_work.electrical_work_included` | `electrical_included` | ⚠️ NAME MISMATCH |
| `scope_of_work.ductwork_included` | `ductwork_included` | BOOLEAN |
| `scope_of_work.thermostat_included` | `thermostat_included` | BOOLEAN |
| `scope_of_work.manual_j_included` | `manual_j_included` | BOOLEAN |
| `scope_of_work.commissioning_included` | `commissioning_included` | BOOLEAN |
| `scope_of_work.air_handler_included` | `air_handler_included` | BOOLEAN |
| `scope_of_work.line_set_included` | `line_set_included` | BOOLEAN |
| `scope_of_work.disconnect_included` | `disconnect_included` | BOOLEAN |
| `scope_of_work.pad_included` | `pad_included` | BOOLEAN |
| `scope_of_work.drain_line_included` | `drain_line_included` | BOOLEAN |
| `scope_of_work.panel_assessment_included` | `panel_assessment_included` | BOOLEAN |
| `scope_of_work.panel_upgrade_included` | `panel_upgrade_included` | BOOLEAN |
| `scope_of_work.dedicated_circuit_included` | `dedicated_circuit_included` | BOOLEAN |
| `scope_of_work.electrical_permit_included` | `electrical_permit_included` | BOOLEAN |
| `scope_of_work.load_calculation_included` | `load_calculation_included` | BOOLEAN |
| `scope_of_work.existing_panel_amps` | `existing_panel_amps` | INTEGER |
| `scope_of_work.proposed_panel_amps` | `proposed_panel_amps` | INTEGER |
| `scope_of_work.breaker_size_required` | `breaker_size_required` | INTEGER |
| `scope_of_work.panel_upgrade_cost` | `panel_upgrade_cost` | DECIMAL |
| `scope_of_work.electrical_notes` | `electrical_notes` | TEXT |
| `scope_of_work.accessories` | `accessories` | JSONB array |
| `scope_of_work.line_items` | `line_items` | JSONB array |

### MindPal → `bids` table (UPDATE by bid_id)

| MindPal JSON path | → DB column | Notes |
|---|---|---|
| `contractor_info.company_name` | `contractor_name` | Display name |
| (edge function) | `status` → `'completed'` | On success |
| (edge function) | `processing_attempts` += 1 | Counter |

### MindPal → `bid_contractors` table (UPSERT on bid_id)

| MindPal JSON path | → DB column |
|---|---|
| `contractor_info.company_name` | `name` AND `company` |
| `contractor_info.contact_name` | `contact_name` |
| `contractor_info.phone` | `phone` |
| `contractor_info.email` | `email` |
| `contractor_info.website` | `website` |
| `contractor_info.license_number` | `license` |
| `contractor_info.license_state` | `license_state` |

### MindPal → `bid_equipment` table (DELETE + INSERT per bid_id)

| MindPal JSON path | → DB column | Notes |
|---|---|---|
| `equipment[].equipment_type` | `equipment_type` | e.g. "heat_pump" |
| `equipment[].brand` | `brand` | |
| `equipment[].model_number` | `model_number` | |
| `equipment[].model_name` | `model_name` | |
| `equipment[].capacity_btu` | `capacity_btu` | |
| `equipment[].capacity_tons` | `capacity_tons` | |
| `equipment[].seer_rating` | `seer_rating` | |
| `equipment[].seer2_rating` | `seer2_rating` | |
| `equipment[].hspf_rating` | `hspf_rating` | |
| `equipment[].hspf2_rating` | `hspf2_rating` | |
| `equipment[].eer_rating` | `eer_rating` | |
| `equipment[].variable_speed` | `variable_speed` | |
| `equipment[].stages` | `stages` | ⚠️ "single"→1, "two"→2, "variable"→99 |
| `equipment[].refrigerant` | `refrigerant_type` | ⚠️ NAME MISMATCH |
| `equipment[].sound_level_db` | `sound_level_db` | |
| `equipment[].voltage` | `voltage` | |
| `equipment[].energy_star` | `energy_star_certified` | ⚠️ NAME MISMATCH |
| `equipment[].energy_star_most_efficient` | `energy_star_most_efficient` | |
| `equipment[].equipment_cost` | `equipment_cost` | |
| `equipment[].confidence` | `confidence` | Mapped via thresholds |

### MindPal → `contractor_questions` table (INSERT per bid_id)

| MindPal JSON path | → DB column | Notes |
|---|---|---|
| `questions[].bid_id` | `bid_id` | FK to bids |
| `questions[].question_text` | `question_text` | NOT NULL |
| `questions[].question_category` | `question_category` | 7 values including "electrical" |
| `questions[].question_tier` | `question_tier` | essential/clarification/detailed/expert |
| `questions[].priority` | `priority` | high/medium/low |
| `questions[].context` | `context` | Why this question matters |
| `questions[].triggered_by` | `triggered_by` | What triggered this question |
| `questions[].good_answer_looks_like` | `good_answer_looks_like` | Reassuring answer example |
| `questions[].concerning_answer_looks_like` | `concerning_answer_looks_like` | Worrying answer example |
| `questions[].missing_field` | `missing_field` | Field name if triggered by missing data |
| `questions[].display_order` | `display_order` | Per-bid ordering |
| (edge function) | `auto_generated` | Always `true` |
| (edge function) | `is_answered` | Always `false` initially |

---

## Known Name Mismatches (Edge Function Handles)

| MindPal outputs | DB column expects | Conversion |
|---|---|---|
| `electrical_work_included` | `electrical_included` | Renamed in callback |
| `refrigerant` | `refrigerant_type` | Renamed in callback |
| `energy_star` | `energy_star_certified` | Renamed in callback |
| `stages`: "single"/"two"/"variable" | `stages`: 1/2/99 | Converted to integer |
| `overall_confidence`: 0-100 number | `extraction_confidence`: "high"/"medium"/"low" | ≥90→high, ≥70→medium, <70→low |

---

## Quick Reference: What Goes Where in MindPal UI

| MindPal UI Section | What to Put There |
|---|---|
| **Workflow Input Fields** | `documents_json` (new TEXT field) — Step B1 |
| **First CODE Node** | Parse Documents JSON code — Step B2 |
| **Loop Node** | Iterate Parse Documents JSON output — Step B3 |
| **Bid Data Extractor Background** | `bid_id` passthrough instruction — Step B4 |
| **Bid Data Extractor Output** | Add `bid_id` as first field — Step B4 |
| **All Loop Agent Prompts** | `bid_id` passthrough — Step B5 |
| **Scope Extractor Prompt** | Update for 69 columns (copy from `mindpal/nodes/scope-extractor.md`) — Step B6 |
| **Supabase Post (bid_scope) Tool** | Add 26 V2 columns to API tool schema — Step B7 |
| **Supabase Post (Questions) Agent** | Configure empty agent with full question schema — Step B8 |

### What's NOT changing (keep as-is)
| Node | Status |
|---|---|
| Equipment Analyzer (JSON Output) | ✅ Already outputs correct bid_equipment schema |
| Supabase Post (bid_equipment) | ✅ Already writes directly to Supabase |
| Contractor Research (JSON Output) | ✅ Already outputs bid_contractors schema |
| Supabase Post (bid_contractor) | ✅ Already writes directly to Supabase |
| Contractor Questions agent | ✅ Already has 4-tier system, full output schema |

### What's NOT in v18 yet (add later)
| Node | Target Table | Priority |
|---|---|---|
| Incentive Finder | `project_incentives` | Deferred — using static DB |
| Scoring Engine | `bid_scores` | Deferred |
| Per-Bid FAQ Generator | `bid_faqs` | Deferred |
| Overall FAQ Generator | `project_faqs` | Deferred |

### Frontend impact of deferred nodes

The frontend gracefully handles missing data from deferred nodes — no crashes, just empty/fallback states:

| Missing Table | Frontend Behavior |
|---|---|
| `bid_scores` | BidCard score badge shows "—". BidComparisonTable "Overall Score" row shows "—". Red Flags row shows "None". Positive Indicators shows "—". DecidePhase red flags / positive indicators alerts don't render. |
| `bid_faqs` + `project_faqs` | DecidePhase "FAQs" tab shows "No Common Questions Data Available Yet — check back soon!" |
| `contractor_questions` (if node 10 not configured yet) | DecidePhase "Contractor Questions" tab shows empty list. |

All of these are guarded with optional chaining (`?.`) and explicit empty-state UI. No code changes needed — just be aware these sections will be blank until the deferred nodes are added.
