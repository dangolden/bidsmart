# BidSmart — Workflow Architecture & Agent Specifications

Source: BidSmart v8 implementation plan + v10 workflow config (Feb 2026)

---

## System Overview

BidSmart analyzes HVAC heat pump contractor bids. Customers upload 1-5 PDFs; the system extracts, enriches, scores, and compares them, delivering structured JSON to Supabase for a React frontend.

**Full pipeline:**
```
Customer uploads PDFs
  → Supabase Storage (signed URLs generated)
  → Supabase Edge Function: start-mindpal-analysis
  → MindPal Workflow (11-12 agents, ~3-5 min)
  → Webhook Node → Make.com (parses MindPal output)
  → Supabase Edge Function: mindpal-callback
  → Supabase DB (contractor_bids, bid_equipment, bid_questions, etc.)
  → React Frontend
```

---

## v10 Workflow IDs (current)

```javascript
WORKFLOW_ID: '69860fd696be27d5d9cb4252'

FIELD_IDS: {
  documents:       '69860fd696be27d5d9cb4258',  // JSON-stringified array of signed PDF URLs
  user_priorities: '69860fd696be27d5d9cb4255',  // JSON-stringified priority object
  request_id:      '69860fd696be27d5d9cb4257',  // unique string for this analysis job
  callback_url:    '69860fd696be27d5d9cb4256'   // Make.com webhook URL
}

NODE_IDS: {
  API_INPUT:             '69860fd696be27d5d9cb4253',
  DOCUMENT_NORMALIZER:   '69860fdb96be27d5d9cb426d',
  EXTRACT_ALL_BIDS:      '69860fd796be27d5d9cb4259',  // Loop Node
  EQUIPMENT_RESEARCHER:  '69860fd796be27d5d9cb425b',
  CONTRACTOR_RESEARCHER: '69860fd796be27d5d9cb425d',
  INCENTIVE_FINDER:      '69860fd896be27d5d9cb425f',
  SCORING_ENGINE:        '69860fd996be27d5d9cb4265',
  QUESTION_GENERATOR:    '69860fd996be27d5d9cb4267',  // ⚠️ CURRENTLY DEGRADED
  PER_BID_FAQ_GENERATOR: '69860fda96be27d5d9cb4269',
  OVERALL_FAQ_GENERATOR: '69860fda96be27d5d9cb426b',
  JSON_ASSEMBLER:        '69860fd896be27d5d9cb4261',  // Code Node
  SEND_RESULTS:          '69860fd996be27d5d9cb4263'   // Webhook Node
}
```

## v8 Reference IDs (last fully working — use for comparison/rollback)
```
API Input:       697a111dfac1e3c184d4907e
URL Translator:  697bdb5b2d27d60a23326f48
Extract Bids:    697a111dfac1e3c184d49080
Equipment:       697a111dfac1e3c184d49081
Contractor:      697a111efac1e3c184d49082
Incentive:       697a111efac1e3c184d49083
Scoring:         697a111efac1e3c184d49084
Question Gen:    697a111efac1e3c184d49085
FAQ Gen:         697a111efac1e3c184d49086
JSON Assembler:  697a111ffac1e3c184d49087
Send Results:    697a111ffac1e3c184d49088
```

---

## Agent Configuration Table

| Agent | JSON Mode | Web Search | Knowledge Base | Model |
|-------|-----------|------------|----------------|-------|
| Bid Data Extractor | ON | OFF | None | Claude Sonnet (image/PDF support required) |
| Equipment Researcher | ON | ON | HVAC specs docs | Claude Sonnet or Gemini 2.0 Pro |
| Contractor Researcher | ON | ON | None (sites in prompt) | Claude Sonnet or Gemini 2.0 Pro |
| Incentive Finder | ON | ON | "Incentive process" doc | Claude Sonnet or Gemini 2.0 Pro |
| Scoring Engine | ON | OFF | "SCORING A HEAT PUMP BID", example layout.xlsx | GPT-4o or Claude Sonnet |
| Question Generator | ON | OFF | None | Claude Sonnet |
| FAQ Generator | ON | OFF | Compliance rules doc | Claude Haiku or GPT-4o Mini |

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

## JSON Assembler — Full Code Node Pattern

```javascript
// All inputs arrive as strings per MindPal docs — must parse every one
function safeParseJSON(str) {
  if (!str) return null;
  const cleaned = str
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try { return JSON.parse(cleaned); }
  catch(e) { return null; }
}

// Input variable names must match what's declared in Code Node's "Define Inputs"
const enrichedBids   = safeParseJSON(enriched_bids_input);
const contractorData = safeParseJSON(contractor_profiles_input);
const incentivesData = safeParseJSON(incentives_input);
const scoresData     = safeParseJSON(scores_input);
const questionsData  = safeParseJSON(questions_input);
const faqsData       = safeParseJSON(faqs_input);

const result = {
  request_id:           request_id_input,
  status:               "success",
  bids:                 enrichedBids?.bids || [],
  contractor_profiles:  contractorData?.contractor_profiles || [],
  incentives:           incentivesData?.incentives || [],
  scores:               scoresData?.bid_scores || [],
  questions:            questionsData?.questions || [],
  questions_summary:    questionsData?.questions_summary || [],
  faqs:                 faqsData?.faqs || [],
  metadata: {
    bid_count:       (enrichedBids?.bids || []).length,
    processing_date: new Date().toISOString()
  }
};

// Output variable name must match what's declared in Code Node's "Define Outputs"
output = JSON.stringify(result);
```

---

## Make.com Integration

### Webhook Extraction Pattern
```
workflow_run_output[]
  → filter where .title = "JSON Assembler & Validator"
  → extract .content (it's a JSON string)
  → JSON.parse(.content)
  → use as structured result object
```

### Error Alert Route
If `result.status !== "success"` → Gmail notification to `dangolden@pandotic.ai`

### Key Bugs to Avoid
- **Spacing bug:** Make.com UI auto-adds spaces in `{{ variable }}`. Always edit raw JSON.
- **Indexing:** Make.com is 1-based; MindPal payload `index` is 0-based. Check preview pane.
