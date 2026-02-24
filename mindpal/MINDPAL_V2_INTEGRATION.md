# MindPal V2 Integration Guide

> **Purpose**: Step-by-step instructions for integrating the V2 schema changes into the MindPal workflow.
> **Date**: February 2026
> **Workflow ID**: `699a33ac6787d2e1b0e9ed93` (v18)
> **Status**: Database restructure COMPLETE and LIVE. MindPal workflow needs these changes.

---

## What Changed and Why

### The Problem (409 FK Errors)
The old workflow had MindPal's callback edge function **creating bid rows** at callback time. Child tables (`bid_contractors`, `bid_equipment`, `contractor_questions`) have foreign keys to `bids`. When the callback tried to INSERT child rows before the parent bid row was committed, Supabase returned **409 Conflict / FK violation** errors.

### The Fix
1. **Bids are pre-created by the frontend** at PDF upload time (`status: 'pending'`). The `bid_id` UUID exists before MindPal ever runs.
2. **MindPal receives `bid_id` paired with each document URL** via a new `documents_json` field (instead of a flat URL array).
3. **The callback UPDATEs existing bid rows** (not INSERT) and UPSERTs child records using the pre-existing `bid_id`.
4. **26 columns moved from `bids` → `bid_scope`**: pricing, payment, warranty, timeline, extraction metadata now live in `bid_scope` (69 columns total). `bids` is a slim 18-column identity stub.

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

### B1: Add `documents_json` Input Field

**Where**: MindPal workflow settings → Input Fields

1. Add a new input field: `documents_json` (type: **TEXT**)
2. Record the new field ID that MindPal generates
3. Send the field ID to the dev team to update `src/config/mindpal.config.ts`

**Current input fields** (for reference):
```
documents       → 699a33ad6787d2e1b0e9ed96  (JSON array of signed PDF URLs)
user_priorities → 699a33ad6787d2e1b0e9ed98
request_id      → 699a33ad6787d2e1b0e9ed97
callback_url    → 699a33ad6787d2e1b0e9ed9b
user_notes      → 699a33ad6787d2e1b0e9ed9a
project_id      → 699a33ad6787d2e1b0e9ed99
```

**What the frontend will send** in `documents_json`:
```json
[
  {"bid_id": "uuid-1", "doc_url": "https://signed-url-1.pdf", "mime_type": "application/pdf"},
  {"bid_id": "uuid-2", "doc_url": "https://signed-url-2.pdf", "mime_type": "application/pdf"}
]
```

> **Note**: The existing `documents` field (flat URL array) will be kept for backward compatibility during the transition. Once `documents_json` is working, `documents` can be deprecated.

---

### B2: Add "Parse Documents JSON" CODE Node

**Position**: First node in the workflow chain (before the Loop)
**Node Type**: CODE
**Input**: `@[documents_json]` — must show purple in MindPal UI

**Code** (paste this exactly):
```javascript
const raw = @[documents_json];
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

### B6: Verify Scope Extractor Outputs All bid_scope Fields

The `bid_scope` table now has **69 columns** (expanded from 43). The Scope Extractor agent's output must cover all of them.

**New columns that MUST be in the output** (moved from old `bids` table):

| Group | Columns | Count |
|-------|---------|-------|
| System Type | `system_type` | 1 |
| Pricing | `total_bid_amount`, `labor_cost`, `equipment_cost`, `materials_cost`, `permit_cost`, `disposal_cost`, `electrical_cost`, `total_before_rebates`, `estimated_rebates`, `total_after_rebates` | 10 |
| Payment Terms | `deposit_required`, `deposit_percentage`, `payment_schedule`, `financing_offered`, `financing_terms` | 5 |
| Warranty | `labor_warranty_years`, `equipment_warranty_years`, `compressor_warranty_years`, `additional_warranty_details` | 4 |
| Timeline | `estimated_days`, `start_date_available`, `bid_date`, `valid_until` | 4 |
| Extraction Metadata | `extraction_confidence`, `extraction_notes` | 2 |
| **Total new** | | **26** |

**Architecture note**: The current callback expects a single `MindPalBidResult` per bid with all sub-objects (pricing, payment_terms, warranty, timeline, dates, scope_of_work, equipment). If the Bid Data Extractor already outputs all of these in a single pass, the Scope Extractor may not need changes — but verify this is the case.

---

### B7: Update/Create "Format Callback Payload" CODE Node

**Position**: After the Loop completes
**Node Type**: CODE
**Inputs**: Loop results, `@[request_id]`, `@[project_id]`, `@[callback_url]`

**Code** (paste this exactly):
```javascript
const loopOutputs = @[loop_results]; // array of per-bid JSON strings
const requestId = @[request_id];
const projectId = @[project_id];
const callbackUrl = @[callback_url];

let bids = [];
for (const output of loopOutputs) {
  let parsed;
  try {
    let cleaned = output;
    if (typeof cleaned === 'string') {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse bid output:', e.message);
    continue;
  }
  bids.push(parsed);
}

const payload = {
  request_id: requestId,
  project_id: projectId,
  status: bids.length > 0 ? 'success' : 'failed',
  timestamp: new Date().toISOString(),
  bids: bids
};

// HMAC signature would be added here or by the webhook node

return JSON.stringify(payload);
```

> **Note**: The `@[loop_results]` variable name must match your actual Loop node output. Check that it shows purple.

---

### B8: Configure Webhook Node

**Position**: Final node in the workflow
**Node Type**: Webhook

| Setting | Value |
|---------|-------|
| **URL** | `@[callback_url]` (from workflow input — must show purple) |
| **Method** | POST |
| **Headers** | `Content-Type: application/json` |
| **Body** | Output of the Format Callback Payload CODE node |

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
| **Scope Extractor Output** | Verify all 69 fields covered — Step B6 |
| **Post-Loop CODE Node** | Format Callback Payload code — Step B7 |
| **Webhook Node** | `@[callback_url]`, POST, JSON body — Step B8 |
