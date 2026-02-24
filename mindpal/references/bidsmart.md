# BidSmart — Workflow Architecture & Agent Specifications

Source: BidSmart v8 spec + v18 workflow config (Feb 2026)

> **V2 Schema Restructure (Feb 2026):**
> - `bids` = 18-column identity stub (pre-created at PDF upload)
> - `bid_scope` = 69 columns (ALL extracted data: scope + pricing + warranty + payment + timeline + extraction metadata)
> - `bid_id` is pre-created and paired with each document via `documents_json`
> - Make.com is no longer in the pipeline — webhook goes directly to Supabase Edge Function
> - JSON Assembler Code Node is retired — each downstream node outputs DB-ready JSON
> - See `mindpal/MINDPAL_V2_INTEGRATION.md` for full migration instructions

---

## System Overview

BidSmart analyzes HVAC heat pump contractor bids. Customers upload 1-5 PDFs; the system extracts, enriches, scores, and compares them, delivering structured JSON to Supabase for a React frontend.

**Full pipeline (V2):**
```
Customer uploads PDFs
  → Frontend creates bid stubs in Supabase (bid_id pre-created per PDF)
  → Frontend uploads PDFs to Supabase Storage (signed URLs generated)
  → Supabase Edge Function: start-mindpal-analysis
       (payload: documents_json with {bid_id, doc_url, mime_type} pairs)
  → MindPal Workflow (agents process each bid, ~3-5 min)
       - Parse Documents JSON (Code Node — parses paired input)
       - Loop Node: iterate over {bid_id, doc_url} pairs
       - Bid Data Extractor agent (per PDF — outputs unstructured context)
       - Equipment Researcher → bid_equipment (DB-ready JSON)
       - Scope Extractor → bid_scope (DB-ready JSON, 69 columns)
       - Contractor Researcher → bid_contractors (DB-ready JSON)
       - Incentive Finder (Agent) → project_incentives
       - Scoring Engine (Agent) → bid_scores
       - Question Generator (Agent) → contractor_questions
       - Per-Bid FAQ Generator → bid_faqs
       - Overall FAQ Generator (Agent) → project_faqs
       - Format Callback Payload (Code Node — merges all outputs)
       - Webhook Node → Supabase Edge Function: mindpal-callback
  → Edge Function UPSERTs to normalized Supabase tables
  → Frontend polls/subscribes to job status + output tables
  → UI renders from DB records
```

---

## v18 Workflow IDs (current)

```javascript
WORKFLOW_ID: '699a33ac6787d2e1b0e9ed93'

FIELD_IDS: {
  documents:       '699a33ad6787d2e1b0e9ed96',  // JSON array of signed PDF URLs
  request_id:      '699a33ad6787d2e1b0e9ed97',  // unique string (batch correlation ID)
  user_priorities: '699a33ad6787d2e1b0e9ed98',  // JSON-stringified priority object
  project_id:      '699a33ad6787d2e1b0e9ed99',  // UUID of the project
  user_notes:      '699a33ad6787d2e1b0e9ed9a',  // optional user notes
  callback_url:    '699a33ad6787d2e1b0e9ed9b',  // Supabase Edge Function URL (direct)
  documents_json:  '699d42f8f6f83a173c0b6d4a',  // V2 — paired {bid_id, doc_url, mime_type} array
}
```

## Legacy Workflow IDs (archived — do not use)

<details>
<summary>v10 IDs (retired)</summary>

```
WORKFLOW_ID: '69860fd696be27d5d9cb4252'
```
</details>

<details>
<summary>v8 IDs (retired)</summary>

```
API Input:       697a111dfac1e3c184d4907e
URL Translator:  697bdb5b2d27d60a23326f48
Extract Bids:    697a111dfac1e3c184d49080
```
</details>

---

## Agent Configuration Table

| Agent | Type | JSON Mode | Web Search | Knowledge Base | Model |
|-------|------|-----------|------------|----------------|-------|
| Bid Data Extractor | LOOP | OFF (context) | OFF | None | Claude Sonnet (PDF support required) |
| Equipment Researcher | LOOP | ON | ON | HVAC specs docs | Claude Sonnet or Gemini 2.0 Pro |
| Scope Extractor | LOOP | ON | OFF | None | Claude Sonnet |
| Contractor Researcher | LOOP | ON | ON | None (sites in prompt) | Claude Sonnet or Gemini 2.0 Pro |
| Incentive Finder | AGENT | ON | ON | "Incentive process" doc | Claude Sonnet or Gemini 2.0 Pro |
| Scoring Engine | AGENT | ON | OFF | "SCORING A HEAT PUMP BID" | GPT-4o or Claude Sonnet |
| Question Generator | AGENT | ON | OFF | None | Claude Sonnet |
| Per-Bid FAQ Generator | LOOP | ON | OFF | Compliance rules doc | Claude Haiku or GPT-4o Mini |
| Overall FAQ Generator | AGENT | ON | OFF | None | Claude Haiku or GPT-4o Mini |

> **V2 Changes:**
> - Bid Data Extractor outputs **unstructured context** (NOT JSON) — downstream nodes parse it
> - Scope Extractor is a **new node** targeting `bid_scope` (69 columns)
> - Question Generator changed from LOOP to AGENT (needs cross-bid context)
> - JSON Assembler is **retired** — each node outputs DB-ready JSON directly

---

## Bid Data Extractor — Full v8 Spec

### System Instructions
```
<role>
You are a precision data extraction specialist for HVAC contractor bid documents. Your sole purpose is to extract structured information from bid proposals and output clean JSON.
</role>

<document_types>
You can process: PDF documents, Word documents (DOCX, DOC), Images of bid documents (JPG, PNG), Scanned documents.
</document_types>

<extraction_categories>
1. CONTRACTOR INFO: Company name, contact person, phone, email, address, license number/state, website, certifications
2. CUSTOMER INFO: Name, property address, city, state, zip
3. PRICING: Total amount, equipment cost, labor, materials, permits, disposal, electrical, rebates mentioned
4. EQUIPMENT: Each piece with brand, model, specs, efficiency ratings
5. WARRANTY: Labor years, equipment years, compressor years, extended options
6. TIMELINE: Estimated days, start availability, bid expiration
7. SCOPE OF WORK: Summary, boolean flags for each common inclusion item
8. PAYMENT TERMS: Deposit amount/percentage, payment schedule, financing
9. ELECTRICAL: Panel amperage, service upgrade needed, dedicated circuit required, upgrade included in price
10. DATES: Bid date, quote date
</extraction_categories>

<extraction_rules>
1. Extract ONLY information explicitly stated in the document
2. Do NOT guess, infer, or make assumptions
3. Omit fields entirely if not found — do NOT use null for optional fields
4. Prices as numbers without symbols: 18500 not "$18,500"
5. Dates in YYYY-MM-DD format
6. Scope booleans: true = explicitly included, false = explicitly excluded, omit = not mentioned
7. SYSTEM TYPE: Always identify system_type and set is_heat_pump boolean
8. Confidence: Estimate 0-100 based on document clarity and completeness
</extraction_rules>

<output_format>
Output ONLY a valid JSON object. No markdown. No code blocks. No explanatory text before or after.
</output_format>
```

### Task Prompt
```
Extract all information from the contractor bid document at:
{{document_url}}

Return ONLY this JSON structure (include only fields where data was found):

{
  "document_url": "{{document_url}}",
  "extraction_confidence": <0-100>,
  "system_type": "heat_pump|gas_furnace|central_ac|mini_split|other",
  "is_heat_pump": boolean,

  "contractor_info": {
    "company_name": "string",
    "contact_name": "string",
    "phone": "string",
    "email": "string",
    "address": "string",
    "license_number": "string",
    "license_state": "string",
    "website": "string",
    "years_in_business": number,
    "certifications": ["NATE", "EPA 608"]
  },

  "customer_info": {
    "customer_name": "string",
    "property_address": "string",
    "property_city": "string",
    "property_state": "string",
    "property_zip": "string"
  },

  "pricing": {
    "total_amount": number,
    "equipment_cost": number,
    "labor_cost": number,
    "permit_cost": number,
    "disposal_cost": number,
    "electrical_cost": number,
    "rebates_mentioned": [
      {"name": "string", "amount": number, "type": "federal|state|utility|manufacturer"}
    ]
  },

  "equipment": [
    {
      "equipment_type": "outdoor_unit|indoor_unit|air_handler|thermostat|line_set|disconnect|pad|other",
      "brand": "string",
      "model_number": "string",
      "capacity_btu": number,
      "capacity_tons": number,
      "seer2_rating": number,
      "hspf2_rating": number,
      "variable_speed": boolean,
      "stages": number,
      "refrigerant_type": "string",
      "voltage": number,
      "energy_star": boolean,
      "energy_star_most_efficient": boolean
    }
  ],

  "warranty": {
    "labor_warranty_years": number,
    "equipment_warranty_years": number,
    "compressor_warranty_years": number,
    "extended_warranty_offered": boolean,
    "extended_warranty_cost": number
  },

  "electrical": {
    "panel_upgrade_required": boolean,
    "panel_upgrade_included": boolean,
    "current_panel_amps": number,
    "required_panel_amps": number,
    "dedicated_circuit_required": boolean,
    "electrical_notes": "string"
  },

  "scope_of_work": {
    "summary": "string",
    "permit_included": boolean,
    "disposal_included": boolean,
    "thermostat_included": boolean,
    "line_set_included": boolean,
    "disconnect_included": boolean,
    "electrical_included": boolean,
    "manual_j_load_calc": boolean,
    "commissioning_included": boolean,
    "duct_assessment_included": boolean,
    "exclusions": ["string"]
  },

  "timeline": {
    "estimated_days": number,
    "start_availability": "string",
    "bid_expiration_date": "YYYY-MM-DD"
  },

  "payment_terms": {
    "deposit_percentage": number,
    "deposit_amount": number,
    "financing_available": boolean
  }
}
```

---

## Question Generator — v8 Spec ⚠️ RESTORE THIS IN v10

**Status:** DEGRADED in v10 — currently single-line instructions. This is the full spec to restore.

### System Instructions
```
<role>
You are a homeowner advocate that generates specific, actionable questions to help homeowners have productive conversations with contractors before making a decision.
</role>

<question_philosophy>
- Questions must be SPECIFIC to each contractor's bid, not generic
- Reference actual data values and cross-bid comparisons
- Enable informed negotiation without being confrontational
- Prioritize questions that could affect the purchase decision
</question_philosophy>

<question_categories>
1. PRICING: Clarify costs, understand what's included
2. WARRANTY: Coverage terms, limitations, transferability
3. EQUIPMENT: Verify specifications, alternatives
4. TIMELINE: Confirm availability and scheduling
5. SCOPE: Clarify inclusions/exclusions
6. CREDENTIALS: Verify licensing and insurance
7. ELECTRICAL: Panel requirements, upgrade costs, permit process
</question_categories>

<question_triggers>
Generate questions when you identify:
- Missing information present in other bids
- Scope items not explicitly addressed (unknown status)
- Price significantly higher or lower than competitors
- Vague or unclear warranty terms
- Items competitors include that this bid doesn't mention
- Red flags from contractor research
- Negotiation opportunities based on competitor offerings
- Missing electrical panel assessment (ALWAYS flag this)
</question_triggers>

<electrical_requirement>
ALWAYS check: Does this bid address electrical panel requirements? Heat pump installations often require panel upgrades. If the bid does not address electrical capacity, generate a HIGH priority question about this regardless of other factors.
</electrical_requirement>

<output_format>
Output ONLY valid JSON. No markdown, no code blocks, no text before or after.
</output_format>
```

### Task Prompt
```
Generate specific questions for the homeowner to ask each contractor.

ENRICHED BIDS: @[Equipment Researcher]
CONTRACTOR PROFILES: @[Contractor Researcher]
INCENTIVES: @[Incentive Finder]
SCORES: @[Scoring Engine]
USER PRIORITIES: @[API Input - user_priorities]

For EACH bid, generate 5-10 targeted questions across these 7 trigger categories:
1. MISSING INFORMATION — Fields null/missing in this bid but present in other bids
2. SCOPE DIFFERENCES — Items other bids explicitly include that this one doesn't mention
3. PRICE VARIANCE — Price significantly higher or lower than competitors
4. UNCLEAR TERMS — Vague warranty language or unspecified details
5. RED FLAG FOLLOW-UPS — Concerns from contractor research
6. NEGOTIATION OPPORTUNITIES — Based on competitor offerings
7. ELECTRICAL REQUIREMENTS — Panel assessment and upgrade costs (always generate if electrical data missing)

OUTPUT FORMAT:
{
  "questions": [
    {
      "bid_index": 0,
      "contractor_name": "string",
      "question_text": "string - the actual question to ask",
      "question_category": "pricing|warranty|equipment|timeline|scope|credentials|electrical",
      "priority": "high|medium|low",
      "context": "string - why this question is being generated",
      "triggered_by": "missing_field|scope_difference|price_variance|unclear_term|red_flag|negotiation|electrical",
      "missing_field": "string - field name if triggered by missing data",
      "good_answer_looks_like": "string",
      "concerning_answer_looks_like": "string",
      "display_order": number
    }
  ],
  "questions_summary": [
    {
      "bid_index": 0,
      "contractor_name": "string",
      "high_priority_count": number,
      "medium_priority_count": number,
      "low_priority_count": number,
      "total_questions": number,
      "main_concerns": ["string"]
    }
  ]
}

PRIORITY: HIGH = missing critical info or red flags | MEDIUM = scope/timeline/equipment | LOW = negotiation/nice-to-know

Return ONLY the JSON. No other text.
```

---

## V2 Code Nodes

### Parse Documents JSON (first in chain)

Parses the `documents_json` TEXT input into an array of `{bid_id, doc_url, mime_type}` objects.
Full implementation: see `mindpal/MINDPAL_V2_INTEGRATION.md`, Step M2.

### Format Callback Payload (after Loop completes)

Merges all per-bid outputs into the single callback payload sent to the Edge Function.
Full implementation: see `mindpal/MINDPAL_V2_INTEGRATION.md`, Step M7.

---

## V2 Database Target Tables

| Node | Target Table | Insert Strategy |
|------|-------------|----------------|
| Scope Extractor | `bid_scope` (69 cols) | UPSERT on `bid_id` |
| Equipment Researcher | `bid_equipment` (1:N) | DELETE existing + INSERT |
| Contractor Researcher | `bid_contractors` (1:1) | UPSERT on `bid_id` |
| Incentive Finder | `project_incentives` | INSERT (project-level) |
| Scoring Engine | `bid_scores` (1:1) | UPSERT on `bid_id` |
| Question Generator | `contractor_questions` (1:N) | UPSERT on `bid_id,question_text` |
| Per-Bid FAQ Generator | `bid_faqs` (1:N) | INSERT per bid |
| Overall FAQ Generator | `project_faqs` (1:N) | INSERT (project-level) |
| Edge Function | `bids` (identity stub) | UPDATE existing row (status, contractor_name) |

> **Make.com is retired.** The webhook goes directly from MindPal → Supabase Edge Function (`mindpal-callback`).
> No JSON Assembler needed — each node outputs DB-ready JSON.

---

## Key Rules

- **All Code Node inputs are strings** — always `JSON.parse()`, always strip markdown wrappers
- **Purple highlight rule** — a MindPal variable reference only works if it displays purple in the UI
- **Documents are signed URLs** — never encode PDFs as base64
- **bid_id passthrough** — every Loop agent must include `bid_id` from `@[item - bid_id]` unchanged
- **equipment_cost is never researched** — always pass-through from bid document
- **Confidence is an enum** — 'high', 'medium', 'low', 'manual' (not a number)
