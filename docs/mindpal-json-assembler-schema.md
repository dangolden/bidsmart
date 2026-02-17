# MindPal JSON Assembler Output Schema

**Version:** bidsmart.v15  
**Last Updated:** 2026-02-14

This document defines the exact JSON structure that the MindPal JSON Assembler must output for successful insertion into BidSmart's Supabase database.

---

## Output Structure Overview

```json
{
  "schema_version": "bidsmart.v15",
  "project_id": "uuid",
  "request_id": "uuid",
  "callback_url": "string | null",
  "bids": [...],
  "analysis": {...},
  "incentives": {...},
  "overall_faqs": [...]
}
```

---

## 1. BIDS ARRAY → `contractor_bids` + `bid_equipment` + `bid_line_items` + `bid_questions`

Each item in the `bids` array maps to one row in `contractor_bids`, plus related rows in child tables.

```json
{
  "bids": [
    {
      "pdf_upload_id": "d3bdb048-5aa5-4e7f-bc21-aef6fc58e0e3",
      "extraction_confidence": 92,
      "extraction_notes": "string",
      
      "contractor_name": "Hassler Heating",
      "contractor_company": "Hassler Heating and Air Conditioning",
      "contractor_phone": "(415) 555-1234",
      "contractor_email": "info@hassler.com",
      "contractor_license": "770180",
      "contractor_license_state": "CA",
      "contractor_insurance_verified": true,
      "contractor_website": "www.hasslerheating.com",
      "contractor_years_in_business": 25,
      "contractor_year_established": 1999,
      "contractor_google_rating": 4.8,
      "contractor_google_review_count": 245,
      "contractor_certifications": ["NATE", "EPA 608", "Carrier Factory Authorized"],
      "contractor_yelp_rating": 4.7,
      "contractor_yelp_review_count": 703,
      "contractor_bbb_rating": "A+",
      "contractor_bbb_accredited": true,
      "contractor_bbb_complaints_3yr": 2,
      "contractor_bonded": true,
      "contractor_contact_name": "John Smith",
      "contractor_address": "123 Main St, San Francisco, CA 94102",
      "contractor_employee_count": "50-100",
      "contractor_service_area": "San Francisco Bay Area",
      "contractor_certifications_detailed": {
        "nate_certified": true,
        "epa_608_certified": true,
        "bpi_certified": true,
        "manufacturer_authorized": ["Carrier", "Lennox"],
        "other_certifications": ["Building Performance Institute"]
      },
      
      "total_bid_amount": 47072.00,
      "labor_cost": 16949.00,
      "equipment_cost": 22432.00,
      "materials_cost": 5241.00,
      "permit_cost": 500.00,
      "disposal_cost": 250.00,
      "electrical_cost": 2450.00,
      
      "total_before_rebates": 47072.00,
      "estimated_rebates": 2350.00,
      "total_after_rebates": 44722.00,
      "rebates_mentioned": ["Federal Tax Credit", "PG&E Rebate", "BayREN"],
      
      "estimated_days": 2,
      "start_date_available": "2026-03-15",
      
      "labor_warranty_years": 5,
      "equipment_warranty_years": 10,
      "compressor_warranty_years": 10,
      "additional_warranty_details": "Extended labor warranty available",
      
      "deposit_required": 4707.00,
      "deposit_required_flag": true,
      "deposit_percentage": 10.00,
      "payment_schedule": "10% deposit, 40% at equipment delivery, 50% at completion",
      "financing_offered": true,
      "financing_terms": "0% APR for 12 months with approved credit",
      
      "scope_summary": "Complete HVAC system replacement including...",
      "inclusions": [
        "Carrier Infinity 25VNA Heat Pump",
        "Carrier FE4ANF Air Handler",
        "City permit and inspections",
        "Removal and disposal of old equipment"
      ],
      "exclusions": [
        "Ductwork modifications",
        "Electrical panel upgrade"
      ],
      
      "electrical_panel_assessment_included": true,
      "electrical_panel_upgrade_included": false,
      "electrical_panel_upgrade_cost": 0,
      "electrical_existing_panel_amps": 200,
      "electrical_proposed_panel_amps": 200,
      "electrical_breaker_size_required": 30,
      "electrical_dedicated_circuit_included": true,
      "electrical_permit_included": true,
      "electrical_load_calculation_included": true,
      "electrical_notes": "Existing panel has capacity for new heat pump",
      
      "bid_date": "2026-02-10",
      "quote_date": "2026-02-10",
      "valid_until": "2026-03-10",
      
      "red_flags": [
        {
          "issue": "No specific model numbers listed",
          "source": "bid_document",
          "severity": "medium"
        }
      ],
      "positive_indicators": [
        {
          "indicator": "BBB Accredited since 2009 with A+ rating",
          "source": "BBB.org"
        },
        {
          "indicator": "Over 700 Yelp reviews with 4.7 rating",
          "source": "Yelp"
        }
      ],
      
      "equipment": [
        {
          "equipment_type": "Heat Pump - Outdoor Unit",
          "brand": "Carrier",
          "model_number": "25VNA036A003",
          "model_name": "Infinity 25VNA",
          "capacity_tons": 3.0,
          "capacity_btu": 36000,
          "seer_rating": null,
          "seer2_rating": 20.5,
          "hspf_rating": null,
          "hspf2_rating": 13.0,
          "eer_rating": 15.0,
          "cop": 3.8,
          "variable_speed": true,
          "stages": 0,
          "refrigerant_type": "R-410A",
          "sound_level_db": 51,
          "voltage": 220,
          "amperage_draw": 14,
          "minimum_circuit_amperage": 18,
          "energy_star_certified": true,
          "energy_star_most_efficient": true,
          "warranty_years": 10,
          "compressor_warranty_years": 10,
          "equipment_cost": 14183.00,
          "confidence": "high"
        }
      ],
      
      "line_items": [
        {
          "item_type": "equipment",
          "description": "Carrier Infinity 25VNA Variable-Speed Heat Pump",
          "quantity": 1,
          "unit_price": 14183.00,
          "total_price": 14183.00,
          "brand": "Carrier",
          "model_number": "25VNA036A003",
          "confidence": "high",
          "line_order": 1
        },
        {
          "item_type": "labor",
          "description": "Installation labor - 2 technicians, 2 days",
          "quantity": 1,
          "unit_price": 16949.00,
          "total_price": 16949.00,
          "brand": null,
          "model_number": null,
          "confidence": "high",
          "line_order": 2
        }
      ],
      
      "questions": [
        {
          "question_text": "What specific SEER2 rating does the proposed heat pump have?",
          "question_category": "equipment",
          "priority": "high",
          "missing_field": "seer2_rating",
          "display_order": 1
        }
      ],
      
      "faqs": [
        {
          "faq_key": "BID_FAQ_01",
          "question_text": "Are there any red flags or concerns with this bid?",
          "answer_text": "No major red flags identified...",
          "answer_confidence": "high"
        }
      ],
      
      "scores": {
        "price": { "score": 2, "rationale": "Highest price among bids" },
        "efficiency": { "score": 7, "rationale": "Good SEER2 rating of 20.5" },
        "warranty": { "score": 8, "rationale": "10-year equipment, 5-year labor" },
        "completeness": { "score": 7, "rationale": "Most details provided" },
        "contractor": { "score": 10, "rationale": "Excellent reputation" },
        "timeline": { "score": 4, "rationale": "No specific start date" }
      },
      "weighted_total": 6.2,
      "category_strengths": ["contractor", "warranty"],
      "category_weaknesses": ["price", "timeline"]
    }
  ]
}
```

---

## 2. FIELD MAPPING REFERENCE

### 2.1 `contractor_bids` Table (Main Bid Record)

| JSON Field | Supabase Column | Type | Required | Notes |
|------------|-----------------|------|----------|-------|
| `pdf_upload_id` | `pdf_upload_id` | UUID | No | Links to uploaded PDF |
| `contractor_name` | `contractor_name` | TEXT | **YES** | Company name |
| `contractor_company` | `contractor_company` | TEXT | No | Full legal name |
| `contractor_phone` | `contractor_phone` | TEXT | No | |
| `contractor_email` | `contractor_email` | TEXT | No | |
| `contractor_license` | `contractor_license` | TEXT | No | License number |
| `contractor_license_state` | `contractor_license_state` | TEXT | No | State code (CA, TX, etc.) |
| `contractor_insurance_verified` | `contractor_insurance_verified` | BOOLEAN | No | |
| `contractor_website` | `contractor_website` | TEXT | No | |
| `contractor_years_in_business` | `contractor_years_in_business` | INTEGER | No | |
| `contractor_year_established` | `contractor_year_established` | INTEGER | No | |
| `contractor_google_rating` | `contractor_google_rating` | DECIMAL(3,2) | No | 1.00-5.00 |
| `contractor_google_review_count` | `contractor_google_review_count` | INTEGER | No | |
| `contractor_certifications` | `contractor_certifications` | TEXT[] | No | Array of strings |
| `contractor_yelp_rating` | `contractor_yelp_rating` | DECIMAL(3,2) | No | 1.00-5.00 |
| `contractor_yelp_review_count` | `contractor_yelp_review_count` | INTEGER | No | |
| `contractor_bbb_rating` | `contractor_bbb_rating` | TEXT | No | "A+", "A", "B", etc. |
| `contractor_bbb_accredited` | `contractor_bbb_accredited` | BOOLEAN | No | |
| `contractor_bbb_complaints_3yr` | `contractor_bbb_complaints_3yr` | INTEGER | No | |
| `contractor_bonded` | `contractor_bonded` | BOOLEAN | No | |
| `contractor_contact_name` | `contractor_contact_name` | TEXT | No | |
| `contractor_address` | `contractor_address` | TEXT | No | |
| `contractor_employee_count` | `contractor_employee_count` | TEXT | No | "10-25", "50-100", etc. |
| `contractor_service_area` | `contractor_service_area` | TEXT | No | |
| `contractor_certifications_detailed` | `contractor_certifications_detailed` | JSONB | No | See structure below |
| `total_bid_amount` | `total_bid_amount` | DECIMAL(10,2) | **YES** | Total price |
| `labor_cost` | `labor_cost` | DECIMAL(10,2) | No | |
| `equipment_cost` | `equipment_cost` | DECIMAL(10,2) | No | |
| `materials_cost` | `materials_cost` | DECIMAL(10,2) | No | |
| `permit_cost` | `permit_cost` | DECIMAL(10,2) | No | |
| `disposal_cost` | `disposal_cost` | DECIMAL(10,2) | No | |
| `electrical_cost` | `electrical_cost` | DECIMAL(10,2) | No | |
| `total_before_rebates` | `total_before_rebates` | DECIMAL(10,2) | No | |
| `estimated_rebates` | `estimated_rebates` | DECIMAL(10,2) | No | |
| `total_after_rebates` | `total_after_rebates` | DECIMAL(10,2) | No | |
| `rebates_mentioned` | `rebates_mentioned` | TEXT[] | No | Array of strings |
| `estimated_days` | `estimated_days` | INTEGER | No | |
| `start_date_available` | `start_date_available` | DATE | No | YYYY-MM-DD format |
| `labor_warranty_years` | `labor_warranty_years` | INTEGER | No | |
| `equipment_warranty_years` | `equipment_warranty_years` | INTEGER | No | |
| `compressor_warranty_years` | `compressor_warranty_years` | INTEGER | No | |
| `additional_warranty_details` | `additional_warranty_details` | TEXT | No | |
| `deposit_required` | `deposit_required` | DECIMAL(10,2) | No | Dollar amount |
| `deposit_required_flag` | `deposit_required_flag` | BOOLEAN | No | true/false |
| `deposit_percentage` | `deposit_percentage` | DECIMAL(5,2) | No | 0-100 |
| `payment_schedule` | `payment_schedule` | TEXT | No | |
| `financing_offered` | `financing_offered` | BOOLEAN | No | |
| `financing_terms` | `financing_terms` | TEXT | No | |
| `scope_summary` | `scope_summary` | TEXT | No | |
| `inclusions` | `inclusions` | TEXT[] | No | Array of strings |
| `exclusions` | `exclusions` | TEXT[] | No | Array of strings |
| `electrical_panel_assessment_included` | `electrical_panel_assessment_included` | BOOLEAN | No | |
| `electrical_panel_upgrade_included` | `electrical_panel_upgrade_included` | BOOLEAN | No | |
| `electrical_panel_upgrade_cost` | `electrical_panel_upgrade_cost` | DECIMAL(10,2) | No | |
| `electrical_existing_panel_amps` | `electrical_existing_panel_amps` | INTEGER | No | |
| `electrical_proposed_panel_amps` | `electrical_proposed_panel_amps` | INTEGER | No | |
| `electrical_breaker_size_required` | `electrical_breaker_size_required` | INTEGER | No | |
| `electrical_dedicated_circuit_included` | `electrical_dedicated_circuit_included` | BOOLEAN | No | |
| `electrical_permit_included` | `electrical_permit_included` | BOOLEAN | No | |
| `electrical_load_calculation_included` | `electrical_load_calculation_included` | BOOLEAN | No | |
| `electrical_notes` | `electrical_notes` | TEXT | No | |
| `bid_date` | `bid_date` | DATE | No | YYYY-MM-DD format |
| `quote_date` | `quote_date` | DATE | No | YYYY-MM-DD format |
| `valid_until` | `valid_until` | DATE | No | YYYY-MM-DD format |
| `red_flags` | `red_flags` | JSONB | No | Array of objects |
| `positive_indicators` | `positive_indicators` | JSONB | No | Array of objects |
| `extraction_confidence` | `extraction_confidence` | ENUM | No | "high", "medium", "low", "manual" |
| `extraction_notes` | `extraction_notes` | TEXT | No | |

### 2.2 `contractor_certifications_detailed` Structure (JSONB)

```json
{
  "nate_certified": true,
  "epa_608_certified": true,
  "bpi_certified": false,
  "manufacturer_authorized": ["Carrier", "Lennox", "Trane"],
  "other_certifications": ["Building Performance Institute", "Energy Upgrade CA"]
}
```

### 2.3 `red_flags` Structure (JSONB Array)

```json
[
  {
    "issue": "Description of the concern",
    "source": "bid_document | BBB | Yelp | research",
    "severity": "high | medium | low"
  }
]
```

### 2.4 `positive_indicators` Structure (JSONB Array)

```json
[
  {
    "indicator": "Description of the positive indicator",
    "source": "BBB.org | Yelp | Google | research"
  }
]
```

---

### 2.5 `bid_equipment` Table

| JSON Field | Supabase Column | Type | Required | Notes |
|------------|-----------------|------|----------|-------|
| `equipment_type` | `equipment_type` | TEXT | **YES** | e.g., "Heat Pump - Outdoor Unit" |
| `brand` | `brand` | TEXT | **YES** | |
| `model_number` | `model_number` | TEXT | No | |
| `model_name` | `model_name` | TEXT | No | |
| `capacity_tons` | `capacity_tons` | DECIMAL(4,2) | No | |
| `capacity_btu` | `capacity_btu` | INTEGER | No | |
| `seer_rating` | `seer_rating` | DECIMAL(5,2) | No | |
| `seer2_rating` | `seer2_rating` | DECIMAL(5,2) | No | |
| `hspf_rating` | `hspf_rating` | DECIMAL(5,2) | No | |
| `hspf2_rating` | `hspf2_rating` | DECIMAL(5,2) | No | |
| `eer_rating` | `eer_rating` | DECIMAL(5,2) | No | |
| `cop` | `cop` | DECIMAL(4,2) | No | |
| `variable_speed` | `variable_speed` | BOOLEAN | No | |
| `stages` | `stages` | INTEGER | No | 0=variable, 1=single, 2=two-stage |
| `refrigerant_type` | `refrigerant_type` | TEXT | No | "R-410A", "R-32", etc. |
| `sound_level_db` | `sound_level_db` | DECIMAL(5,1) | No | |
| `voltage` | `voltage` | INTEGER | No | |
| `amperage_draw` | `amperage_draw` | INTEGER | No | |
| `minimum_circuit_amperage` | `minimum_circuit_amperage` | INTEGER | No | |
| `energy_star_certified` | `energy_star_certified` | BOOLEAN | No | |
| `energy_star_most_efficient` | `energy_star_most_efficient` | BOOLEAN | No | |
| `warranty_years` | `warranty_years` | INTEGER | No | |
| `compressor_warranty_years` | `compressor_warranty_years` | INTEGER | No | |
| `equipment_cost` | `equipment_cost` | DECIMAL(10,2) | No | |
| `confidence` | `confidence` | ENUM | No | "high", "medium", "low", "manual" |

**IMPORTANT:** The `stages` field must be an INTEGER:
- `0` = variable speed
- `1` = single stage
- `2` = two stage

---

### 2.6 `bid_line_items` Table

| JSON Field | Supabase Column | Type | Required | Notes |
|------------|-----------------|------|----------|-------|
| `item_type` | `item_type` | ENUM | **YES** | See valid values below |
| `description` | `description` | TEXT | **YES** | |
| `quantity` | `quantity` | DECIMAL(10,2) | No | Default 1 |
| `unit_price` | `unit_price` | DECIMAL(10,2) | No | |
| `total_price` | `total_price` | DECIMAL(10,2) | **YES** | |
| `brand` | `brand` | TEXT | No | For equipment items |
| `model_number` | `model_number` | TEXT | No | For equipment items |
| `confidence` | `confidence` | ENUM | No | "high", "medium", "low", "manual" |
| `line_order` | `line_order` | INTEGER | No | Display order |

**Valid `item_type` values:**
- `equipment`
- `labor`
- `materials`
- `permit`
- `disposal`
- `electrical`
- `ductwork`
- `thermostat`
- `rebate_processing`
- `warranty`
- `other`

---

### 2.7 `bid_questions` Table

| JSON Field | Supabase Column | Type | Required | Notes |
|------------|-----------------|------|----------|-------|
| `question_text` | `question_text` | TEXT | **YES** | |
| `question_category` | `question_category` | TEXT | No | pricing, warranty, equipment, timeline, scope, credentials |
| `priority` | `priority` | TEXT | No | "high", "medium", "low" |
| `missing_field` | `missing_field` | TEXT | No | Field that triggered this question |
| `display_order` | `display_order` | INTEGER | No | |

---

## 3. ANALYSIS Object → `bid_analysis` Table

```json
{
  "analysis": {
    "analysis_summary": "Overall analysis of the bids...",
    "scoring_weights": {
      "price": 0.25,
      "efficiency": 0.20,
      "warranty": 0.15,
      "completeness": 0.15,
      "contractor": 0.15,
      "timeline": 0.10
    },
    "recommended_bid_index": 0,
    "recommendation_reasoning": "Based on the analysis...",
    "price_comparison": {...},
    "efficiency_comparison": {...},
    "warranty_comparison": {...},
    "negotiation_points": [...],
    "comparison_report": "Full markdown report...",
    "questions_to_ask": ["Question 1", "Question 2"],
    "faqs": [...],
    "clarification_questions": [...],
    "analysis_version": "bidsmart.v15",
    "model_used": "gpt-4"
  }
}
```

---

## 4. INCENTIVES Object (Pass-through, stored in analysis)

```json
{
  "incentives": {
    "customer_location": {
      "address": "364 Ridgewood Ave.",
      "city": "Mill Valley",
      "state": "CA",
      "zip": "94941"
    },
    "utilities": {
      "electric_utility": "Pacific Gas & Electric (PG&E)",
      "gas_utility": "Pacific Gas & Electric (PG&E)"
    },
    "incentives": [...],
    "total_potential_incentives": {
      "minimum_estimate": 12000,
      "maximum_estimate": 22500
    }
  }
}
```

---

## 5. CONVERSION RULES

### 5.1 extraction_confidence (Number → ENUM)

```
if (confidence >= 80) return "high"
if (confidence >= 50) return "medium"
if (confidence >= 0) return "low"
return "manual"
```

### 5.2 stages (String → INTEGER)

```
"variable" → 0
"single" → 1
"two" → 2
"two-stage" → 2
```

### 5.3 Dates (String → DATE)

Must be in `YYYY-MM-DD` format. Invalid dates should be `null`.

### 5.4 Nested Objects with `.value`

If your inputs have `{value: X, source: "...", confidence: N}` structures, **extract only the `.value`**:

```javascript
// Input from Equipment Researcher
capacity_tons: { value: 3, source: "extracted", confidence: 75 }

// Output for Supabase
capacity_tons: 3
```

---

## 6. MINIMAL REQUIRED FIELDS

For a bid to insert successfully, you need AT MINIMUM:

```json
{
  "contractor_name": "Company Name",
  "total_bid_amount": 50000.00
}
```

Everything else is optional and will be NULL if not provided.

---

## 7. EXAMPLE MINIMAL BID

```json
{
  "schema_version": "bidsmart.v15",
  "project_id": "abc123-uuid",
  "bids": [
    {
      "pdf_upload_id": "pdf-uuid",
      "contractor_name": "ABC Heating",
      "total_bid_amount": 45000.00,
      "extraction_confidence": "high"
    }
  ]
}
```

---

## 8. EXAMPLE COMPLETE BID

See Section 1 above for the complete structure.
