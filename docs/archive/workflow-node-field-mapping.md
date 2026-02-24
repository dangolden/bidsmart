# MindPal Workflow Node → Schema Field Mapping

Complete mapping of which MindPal workflow node extracts which database fields.

---

## Workflow Structure (v10)

```
API Input
  ↓
Extract All Bids (LOOP)
  ↓
Equipment Researcher (LOOP)
  ↓
Contractor Researcher (LOOP)
  ↓
Scoring Engine (LOOP)
  ↓
Question Generator (LOOP)
  ↓
Per-Bid FAQ Generator (LOOP)
  ↓
Overall FAQ Generator (AGENT)
  ↓
JSON Assembler & Validator (CODE)
  ↓
Supabase Direct Insert (CODE)
  ↓
Send Results (WEBHOOK)
```

---

## Node Responsibilities

### 1. **Extract All Bids** (Node ID: `697fc84a45bf3484d9a86102`)
**Type:** LOOP (iterates over document_urls)  
**Agent:** Bid Extraction & Structuring Agent  
**Purpose:** Initial PDF parsing and structured data extraction

#### Extracts → `contractor_bids` table:
| Field | Extraction Method | Notes |
|-------|-------------------|-------|
| `contractor_name` | Direct from PDF | Required |
| `contractor_company` | Direct from PDF | |
| `contractor_phone` | Direct from PDF | |
| `contractor_email` | Direct from PDF | |
| `contractor_address` | Direct from PDF | |
| `contractor_license` | Direct from PDF | |
| `contractor_license_state` | Direct from PDF | |
| `contractor_website` | Direct from PDF | |
| `contractor_years_in_business` | Direct from PDF | |
| `contractor_certifications` | Direct from PDF | Array |
| `contractor_contact_name` | Direct from PDF | |
| `total_bid_amount` | Direct from PDF | **Required** |
| `labor_cost` | Direct from PDF | |
| `equipment_cost` | Direct from PDF | |
| `materials_cost` | Direct from PDF | |
| `permit_cost` | Direct from PDF | |
| `disposal_cost` | Direct from PDF | |
| `electrical_cost` | Direct from PDF | |
| `total_before_rebates` | Direct from PDF | |
| `estimated_rebates` | Direct from PDF | |
| `total_after_rebates` | Direct from PDF | |
| `rebates_mentioned` | Direct from PDF | Array |
| `labor_warranty_years` | Direct from PDF | |
| `equipment_warranty_years` | Direct from PDF | |
| `compressor_warranty_years` | Direct from PDF | |
| `additional_warranty_details` | Direct from PDF | |
| `estimated_days` | Direct from PDF | |
| `start_date_available` | Direct from PDF | |
| `deposit_required` | Calculated from deposit_amount | Boolean |
| `deposit_required_flag` | Direct from PDF | Boolean |
| `deposit_percentage` | Calculated | |
| `payment_schedule` | Direct from PDF | |
| `scope_summary` | Direct from PDF | |
| `inclusions` | Direct from PDF | Array |
| `exclusions` | Direct from PDF | Array |
| `scope_permit_included` | Direct from PDF | Boolean |
| `scope_disposal_included` | Direct from PDF | Boolean |
| `scope_electrical_included` | Direct from PDF | Boolean |
| `scope_ductwork_included` | Direct from PDF | Boolean |
| `scope_thermostat_included` | Direct from PDF | Boolean |
| `scope_manual_j_included` | Direct from PDF | Boolean |
| `scope_commissioning_included` | Direct from PDF | Boolean |
| `scope_air_handler_included` | Direct from PDF | Boolean |
| `scope_line_set_included` | Direct from PDF | Boolean |
| `scope_disconnect_included` | Direct from PDF | Boolean |
| `scope_pad_included` | Direct from PDF | Boolean |
| `scope_drain_line_included` | Direct from PDF | Boolean |
| `electrical_panel_assessment_included` | Direct from PDF | Boolean |
| `electrical_panel_upgrade_included` | Direct from PDF | Boolean |
| `electrical_panel_upgrade_cost` | Direct from PDF | |
| `electrical_existing_panel_amps` | Direct from PDF | |
| `electrical_proposed_panel_amps` | Direct from PDF | |
| `electrical_breaker_size_required` | Direct from PDF | |
| `electrical_dedicated_circuit_included` | Direct from PDF | Boolean |
| `electrical_permit_included` | Direct from PDF | Boolean |
| `electrical_load_calculation_included` | Direct from PDF | Boolean |
| `electrical_notes` | Direct from PDF | Text |
| `bid_date` | Direct from PDF | Date |
| `quote_date` | Direct from PDF | Date |
| `extraction_confidence` | Self-assessed | 0-100 |
| `extraction_notes` | Self-generated | Issues/gaps |

#### Extracts → `bid_equipment` table:
| Field | Extraction Method | Notes |
|-------|-------------------|-------|
| `equipment_type` | Direct from PDF | **Required** |
| `brand` | Direct from PDF | **Required** |
| `model_number` | Direct from PDF | |
| `model_name` | Direct from PDF | |
| `capacity_btu` | Direct from PDF | |
| `capacity_tons` | Direct from PDF | |
| `seer_rating` | Direct from PDF | |
| `seer2_rating` | Direct from PDF | |
| `hspf_rating` | Direct from PDF | |
| `hspf2_rating` | Direct from PDF | |
| `variable_speed` | Direct from PDF | Boolean |
| `refrigerant_type` | Direct from PDF | |
| `voltage` | Direct from PDF | |
| `amperage_draw` | Direct from PDF | Max rated amps |
| `minimum_circuit_amperage` | Direct from PDF | Breaker size |
| `confidence` | Self-assessed | 0-100 |

#### Extracts → `bid_line_items` table:
| Field | Extraction Method | Notes |
|-------|-------------------|-------|
| `item_type` | Direct from PDF | equipment/labor/materials/permit/disposal/electrical/ductwork/thermostat/other |
| `description` | Direct from PDF | **Required** |
| `quantity` | Direct from PDF | Default 1 |
| `unit_price` | Direct from PDF | |
| `total_price` | Direct from PDF | **Required** |
| `brand` | Direct from PDF | For equipment items |
| `model_number` | Direct from PDF | For equipment items |
| `confidence` | Self-assessed | 0-100 |

---

### 2. **Equipment Researcher** (Node ID: `6994d91de9cb0bba897fd725`)
**Type:** LOOP (iterates over extracted bids)  
**Agent:** Equipment Researcher  
**Purpose:** Web research to fill missing equipment specs

#### Enhances → `bid_equipment` table:
| Field | Research Method | Notes |
|-------|-----------------|-------|
| `seer_rating` | Web search by model | If missing from PDF |
| `seer2_rating` | Web search by model | If missing from PDF |
| `hspf_rating` | Web search by model | If missing from PDF |
| `hspf2_rating` | Web search by model | If missing from PDF |
| `eer_rating` | Web search by model | Advanced spec |
| `cop` | Web search by model | Advanced spec |
| `capacity_btu` | Web search by model | If missing from PDF |
| `capacity_tons` | Web search by model | If missing from PDF |
| `sound_level_db` | Web search by model | Advanced spec |
| `refrigerant_type` | Web search by model | If missing from PDF |
| `voltage` | Web search by model | If missing from PDF |
| `amperage_draw` | Web search by model | If missing from PDF |
| `minimum_circuit_amperage` | Web search by model | If missing from PDF |
| `stages` | Web search by model | Number of stages |
| `energy_star_certified` | Web search by model | Boolean |
| `energy_star_most_efficient` | Web search by model | Boolean |
| `warranty_years` | Web search by model | Manufacturer warranty |
| `compressor_warranty_years` | Web search by model | Compressor warranty |

**Data Attribution:** Marks each field as "extracted" or "researched" with confidence level.

---

### 3. **Contractor Researcher** (Node ID: `6994d9274bdf69a219bbb036`)
**Type:** LOOP (iterates over equipment-enhanced bids)  
**Agent:** Scoring Engine (misnamed - should be Contractor Researcher)  
**Purpose:** Web research for contractor verification and reputation

#### Enhances → `contractor_bids` table:
| Field | Research Method | Notes |
|-------|-----------------|-------|
| `contractor_license` | License verification API/web | Verify status |
| `contractor_insurance_verified` | Web search | Boolean |
| `contractor_years_in_business` | Web search | If missing from PDF |
| `contractor_year_established` | Web search | Calculated |
| `contractor_google_rating` | Google Places API | Decimal |
| `contractor_google_review_count` | Google Places API | Integer |
| `contractor_yelp_rating` | Yelp API | Decimal |
| `contractor_yelp_review_count` | Yelp API | Integer |
| `contractor_bbb_rating` | BBB website scrape | A+, A, B, etc. |
| `contractor_bbb_accredited` | BBB website scrape | Boolean |
| `contractor_bbb_complaints_3yr` | BBB website scrape | Integer |
| `contractor_bonded` | Web search | Boolean |
| `contractor_employee_count` | Web search | Text (e.g., "10-50") |
| `contractor_service_area` | Web search | Text |
| `contractor_certifications_detailed` | Web search | JSONB with cert details |
| `red_flags` | Analysis of research | JSONB array |
| `positive_indicators` | Analysis of research | JSONB array |

**Output Structure:**
```json
{
  "contractor_verification": {
    "contractor_name": "string",
    "verification": {...},
    "business_information": {...},
    "reputation_and_reviews": {...},
    "certifications_and_qualifications": {...},
    "red_flags_and_negative_indicators": {...},
    "positive_indicators_and_strengths": {...},
    "research_confidence": 0-100,
    "verification_date": "YYYY-MM-DD",
    "research_notes": "string"
  }
}
```

---

### 4. **Scoring Engine** (Node ID: `6993af7cf915c1bcbe09c4b5`)
**Type:** LOOP (iterates over contractor-researched bids)  
**Agent:** Scoring Engine  
**Purpose:** Calculate objective comparison scores

#### Calculates → `contractor_bids` table:
| Field | Calculation Method | Notes |
|-------|-------------------|-------|
| `overall_score` | Weighted average | 0-100 scale |
| `value_score` | Price vs market rates | 0-100 scale |
| `quality_score` | Efficiency + warranty + reliability | 0-100 scale |
| `completeness_score` | Scope completeness | 0-100 scale |

**Scoring Categories:**
1. **Price Score** (25% default weight): Total cost vs market rates ($4,000-6,000/ton)
2. **Efficiency Score** (20% default weight): SEER2, HSPF2, EER, COP vs standards
3. **Warranty Score** (15% default weight): Labor + equipment + compressor years
4. **Completeness Score** (20% default weight): Scope inclusions vs exclusions
5. **Contractor Score** (15% default weight): Years, reviews, certifications, licensing
6. **Timeline Score** (5% default weight): Availability vs customer needs

**User Priority Weights:** Applied from `user_priorities` input field.

---

### 5. **Question Generator** (Node ID: `697ff3cc75bc7910e8aa1e14`)
**Type:** LOOP (iterates over scored bids)  
**Agent:** Bid Review Clarification Agent  
**Purpose:** Generate contractor-specific clarifying questions

#### Generates → `bid_questions` table:
| Field | Generation Method | Notes |
|-------|-------------------|-------|
| `question_text` | AI-generated | **Required** |
| `question_category` | AI-assigned | pricing/warranty/equipment/timeline/scope/credentials |
| `priority` | AI-assigned | high/medium/low |
| `context` | AI-generated | Why this question matters |
| `suggested_answer` | AI-generated | What to look for |

**Question Triggers:**
- Missing information vs competitors
- Scope items not addressed
- Price significantly higher/lower
- Vague/unclear terms
- Red flags from research
- Negotiation opportunities

**Output:** 5-10 specific questions per bid.

---

### 6. **Per-Bid FAQ Generator** (Node ID: `6980039a8b80633ac76a9e85`)
**Type:** LOOP (iterates over scored bids)  
**Agent:** HVAC Bid Comparison FAQ Generator  
**Purpose:** Generate bid-specific FAQ answers

#### Generates → `bid_faqs` table:
| Field | Generation Method | Notes |
|-------|-------------------|-------|
| `question` | Predefined template | **Required** |
| `answer` | AI-generated from bid data | **Required** |
| `answer_confidence` | Self-assessed | 0-100 |
| `sources` | Data attribution | JSONB array |
| `display_order` | Sequential | Integer |

**Standard Per-Bid Questions:**
1. What equipment will be installed?
2. What's the efficiency rating?
3. What's included in the scope?
4. What warranties apply?
5. What financing options are available?
6. When can work start?
7. Will incentives/rebates apply?

**Answer Length:** 2-3 sentences per answer.

---

### 7. **Overall FAQ Generator** (Node ID: `69800400f3a816267bf9db64`)
**Type:** AGENT (single execution)  
**Agent:** HVAC Bid Comparison FAQ Generator  
**Purpose:** Generate comparison-level FAQ answers

#### Generates → `overall_faqs` table:
| Field | Generation Method | Notes |
|-------|-------------------|-------|
| `question` | Predefined template | **Required** |
| `answer` | AI-generated from all bids | **Required** |
| `answer_confidence` | Self-assessed | 0-100 |
| `sources` | Data attribution | JSONB array |
| `display_order` | Sequential | Integer |

**Standard Overall Questions:**
1. How should I compare these bids?
2. What key differences exist?
3. What questions should I ask all contractors?
4. What is the total incentive potential?
5. What are common pitfalls to avoid?
6. Are these bids truly "apples to apples"?
7. What information is missing?
8. What should I negotiate?

**Answer Length:** 3-4 sentences (OVERALL_03 may be 2-3 paragraphs).

**CRITICAL COMPLIANCE:** Must maintain strict neutrality - no recommendations, rankings, or subjective language.

---

### 8. **JSON Assembler & Validator** (Node ID: `6991d44b84d723f2e9aa1435`)
**Type:** CODE  
**Purpose:** Combine all outputs into final JSON structure

**Responsibilities:**
1. Collect outputs from all previous nodes
2. Validate JSON structure against schema
3. Ensure required fields are present
4. Format dates, numbers, and enums correctly
5. Build final payload for Supabase insertion

**Output Structure:** Matches `mindpal-json-assembler-schema.md` v15.

---

### 9. **Supabase Direct Insert** (Node ID: `698e28d674da75fc9e1803aa`)
**Type:** CODE  
**Purpose:** Insert validated data into Supabase

**Inserts into tables:**
1. `contractor_bids` (main bid records)
2. `bid_equipment` (equipment specs)
3. `bid_line_items` (itemized pricing)
4. `bid_questions` (clarifying questions)
5. `bid_faqs` (per-bid FAQs)
6. `overall_faqs` (comparison FAQs)
7. `bid_analysis` (scoring and analysis)

**Transaction:** All inserts in single transaction - rollback on any failure.

---

### 10. **Send Results** (Node ID: `697fc84d45bf3484d9a86112`)
**Type:** WEBHOOK  
**Purpose:** Notify callback_url of completion

**Payload:**
```json
{
  "request_id": "string",
  "project_id": "string",
  "status": "success|error",
  "bid_count": number,
  "message": "string"
}
```

---

## Field Extraction Summary by Node

### Direct PDF Extraction (Extract All Bids)
- **contractor_bids:** 60+ fields
- **bid_equipment:** 15 fields
- **bid_line_items:** 8 fields

### Web Research Enhancement (Equipment Researcher)
- **bid_equipment:** 18 fields (fills gaps)

### Web Research Enhancement (Contractor Researcher)
- **contractor_bids:** 15 fields (reputation, verification)
- **red_flags, positive_indicators:** JSONB arrays

### Calculated Fields (Scoring Engine)
- **contractor_bids:** 4 score fields

### Generated Content (Question Generator)
- **bid_questions:** 5-10 records per bid

### Generated Content (Per-Bid FAQ Generator)
- **bid_faqs:** 6-7 records per bid

### Generated Content (Overall FAQ Generator)
- **overall_faqs:** 8 records per project

---

## Node Output Validation

Each node must output **valid JSON only**:
- No markdown code blocks
- No explanatory text before/after
- Start with `{` and end with `}`
- Include confidence scores
- Include notes/sources for attribution

---

## Critical Compliance Notes

1. **Neutrality Protocol:** FAQ generators must avoid recommendations, rankings, or subjective language
2. **Data Attribution:** Distinguish "extracted" vs "researched" data
3. **Confidence Scoring:** Every extraction/research includes 0-100 confidence
4. **Missing Data Handling:** Omit fields (don't use null) when data not found
5. **Boolean Three-State:** `true` = included, `false` = excluded, omitted = not mentioned

---

## Next Steps

1. Update schema reference doc with "Workflow Node" column
2. Create node-specific extraction templates
3. Verify all schema fields are assigned to a node
4. Document any fields that are NOT extracted by any node
