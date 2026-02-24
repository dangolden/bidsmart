# MindPal → Supabase Complete Schema Reference

Complete field mapping for rebuilding the MindPal workflow. Each section corresponds to a Supabase table that MindPal populates.

---

## TABLES OVERVIEW

| Table | Purpose | MindPal Node |
|-------|---------|--------------|
| `contractor_bids` | Main bid record (1 per PDF) | JSON Assembler |
| `bid_equipment` | Equipment specs (N per bid) | JSON Assembler |
| `bid_line_items` | Line items (N per bid) | JSON Assembler |
| `bid_questions` | Auto-generated questions | JSON Assembler |
| `bid_faqs` | Per-bid FAQs | JSON Assembler |
| `overall_faqs` | Project-level FAQs | JSON Assembler |

---

## 1. `contractor_bids` TABLE

### 1.1 Required Fields (INSERT will fail without these)
| Field | Type | Notes |
|-------|------|-------|
| `project_id` | UUID | From workflow input |
| `contractor_name` | TEXT | **REQUIRED** |
| `total_bid_amount` | DECIMAL(10,2) | **REQUIRED** |

### 1.2 Contractor Information
| Field | Type | Workflow Node | Frontend Usage |
|-------|------|---------------|----------------|
| `contractor_company` | TEXT | Extract All Bids | BidCard |
| `contractor_phone` | TEXT | Extract All Bids | ✅ BidCard (clickable) |
| `contractor_email` | TEXT | Extract All Bids | ✅ BidCard (clickable) |
| `contractor_license` | TEXT | Extract All Bids + Contractor Researcher | ✅ BidCard, BidComparisonTable |
| `contractor_license_state` | TEXT | Extract All Bids | ✅ BidCard, BidComparisonTable |
| `contractor_insurance_verified` | BOOLEAN | Contractor Researcher | ✅ BidComparisonTable |
| `contractor_website` | TEXT | Extract All Bids | ✅ BidCard (clickable) |
| `contractor_years_in_business` | INTEGER | Extract All Bids + Contractor Researcher | ✅ BidCard, BidComparisonTable |
| `contractor_year_established` | INTEGER | Contractor Researcher | — |
| `contractor_total_installs` | INTEGER | Contractor Researcher | — |
| `contractor_google_rating` | DECIMAL(3,2) | Contractor Researcher | ✅ BidCard, BidComparisonTable |
| `contractor_google_review_count` | INTEGER | Contractor Researcher | ✅ BidCard, BidComparisonTable |
| `contractor_certifications` | TEXT[] | Extract All Bids | ✅ BidCard, BidComparisonTable |
| `contractor_is_switch_preferred` | BOOLEAN | (Manual/Backend) | ✅ BidCard badge |
| `contractor_yelp_rating` | DECIMAL(3,2) | Contractor Researcher | ✅ BidComparisonTable |
| `contractor_yelp_review_count` | INTEGER | Contractor Researcher | ✅ BidComparisonTable |
| `contractor_bbb_rating` | TEXT | Contractor Researcher | ✅ BidComparisonTable |
| `contractor_bbb_accredited` | BOOLEAN | Contractor Researcher | ✅ BidComparisonTable |
| `contractor_bbb_complaints_3yr` | INTEGER | Contractor Researcher | — |
| `contractor_bonded` | BOOLEAN | Contractor Researcher | ✅ BidComparisonTable |
| `contractor_contact_name` | TEXT | Extract All Bids | — |
| `contractor_address` | TEXT | Extract All Bids | — |
| `contractor_employee_count` | TEXT | Contractor Researcher | ✅ BidComparisonTable (contractor tab) |
| `contractor_service_area` | TEXT | Contractor Researcher | ✅ BidComparisonTable (contractor tab) |
| `contractor_certifications_detailed` | JSONB | Contractor Researcher | — |

### 1.3 Pricing Fields
| Field | Type | Workflow Node | Frontend Usage |
|-------|------|---------------|----------------|
| `total_bid_amount` | DECIMAL(10,2) | Extract All Bids | ✅ BidCard, BidComparisonTable |
| `labor_cost` | DECIMAL(10,2) | Extract All Bids | ✅ BidComparisonTable (pricing tab) |
| `equipment_cost` | DECIMAL(10,2) | Extract All Bids | ✅ BidComparisonTable (pricing tab) |
| `materials_cost` | DECIMAL(10,2) | Extract All Bids | ✅ BidComparisonTable (pricing tab) |
| `permit_cost` | DECIMAL(10,2) | Extract All Bids | ✅ BidComparisonTable (pricing tab) |
| `disposal_cost` | DECIMAL(10,2) | Extract All Bids | ✅ BidComparisonTable (pricing tab) |
| `electrical_cost` | DECIMAL(10,2) | Extract All Bids | ✅ BidComparisonTable (pricing tab) |
| `total_before_rebates` | DECIMAL(10,2) | Extract All Bids | — |
| `estimated_rebates` | DECIMAL(10,2) | Extract All Bids | ✅ BidComparisonTable (pricing tab) |
| `total_after_rebates` | DECIMAL(10,2) | Extract All Bids | ✅ BidCard, BidComparisonTable |
| `rebates_mentioned` | TEXT[] | Extract All Bids | — |

### 1.4 Timeline & Warranty
| Field | Type | Workflow Node | Frontend Usage |
|-------|------|---------------|----------------|
| `estimated_days` | INTEGER | Extract All Bids | ✅ BidCard, BidComparisonTable |
| `start_date_available` | DATE | Extract All Bids | — |
| `labor_warranty_years` | INTEGER | Extract All Bids | ✅ BidCard, BidComparisonTable |
| `equipment_warranty_years` | INTEGER | Extract All Bids | ✅ BidCard, BidComparisonTable |
| `compressor_warranty_years` | INTEGER | Extract All Bids | — |
| `additional_warranty_details` | TEXT | Extract All Bids | — |

### 1.5 Payment Terms
| Field | Type | Workflow Node | Frontend Usage |
|-------|------|---------------|----------------|
| `deposit_required` | DECIMAL(10,2) | Extract All Bids | ✅ BidCard |
| `deposit_required_flag` | BOOLEAN | Extract All Bids | — |
| `deposit_percentage` | DECIMAL(5,2) | Extract All Bids | ✅ BidCard |
| `payment_schedule` | TEXT | Extract All Bids | — |
| `financing_offered` | BOOLEAN | Extract All Bids | ✅ BidCard, BidComparisonTable |
| `financing_terms` | TEXT | Extract All Bids | ✅ BidCard |

### 1.6 Scope of Work
| Field | Type | Workflow Node | Frontend Usage |
|-------|------|---------------|----------------|
| `scope_summary` | TEXT | Extract All Bids | ✅ BidCard |
| `inclusions` | TEXT[] | Extract All Bids | ✅ BidCard |
| `exclusions` | TEXT[] | Extract All Bids | ✅ BidCard |

### 1.7 Scope Booleans (Comparison Grid)
| Field | Type | Workflow Node | Frontend Usage |
|-------|------|---------------|----------------|
| `scope_permit_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (scope tab) |
| `scope_disposal_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (scope tab) |
| `scope_electrical_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (scope tab) |
| `scope_ductwork_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (scope tab) |
| `scope_thermostat_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (scope tab) |
| `scope_manual_j_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (scope tab) |
| `scope_commissioning_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (scope tab) |
| `scope_air_handler_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (scope tab) |
| `scope_line_set_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (scope tab) |
| `scope_disconnect_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (scope tab) |
| `scope_pad_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (scope tab) |
| `scope_drain_line_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (scope tab) |

### 1.8 Electrical Details
| Field | Type | Workflow Node | Frontend Usage |
|-------|------|---------------|----------------|
| `electrical_panel_assessment_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (electrical tab) |
| `electrical_panel_upgrade_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (electrical tab) |
| `electrical_panel_upgrade_cost` | DECIMAL(10,2) | Extract All Bids | ✅ BidComparisonTable (electrical tab) |
| `electrical_existing_panel_amps` | INTEGER | Extract All Bids | ✅ BidComparisonTable (electrical tab) |
| `electrical_proposed_panel_amps` | INTEGER | Extract All Bids | ✅ BidComparisonTable (electrical tab) |
| `electrical_breaker_size_required` | INTEGER | Extract All Bids | ✅ BidComparisonTable (electrical tab) |
| `electrical_dedicated_circuit_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (electrical tab) |
| `electrical_permit_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (electrical tab) |
| `electrical_load_calculation_included` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable (electrical tab) |
| `electrical_notes` | TEXT | Extract All Bids | ✅ BidComparisonTable (electrical tab) |

### 1.9 Dates & Metadata
| Field | Type | Workflow Node | Frontend Usage |
|-------|------|---------------|----------------|
| `bid_date` | DATE | Extract All Bids | — |
| `quote_date` | DATE | Extract All Bids | — |
| `valid_until` | DATE | (Not extracted) | — |
| `pdf_upload_id` | UUID | (Backend) | Links to uploaded PDF |
| `extraction_confidence` | ENUM | Extract All Bids | ✅ BidCard badge |
| `extraction_notes` | TEXT | Extract All Bids | ✅ BidCard (warning box) |

### 1.10 Quality Scores
| Field | Type | Workflow Node | Frontend Usage |
|-------|------|---------------|----------------|
| `overall_score` | DECIMAL(5,2) | Scoring Engine | ✅ BidCard, BidComparisonTable |
| `value_score` | DECIMAL(5,2) | Scoring Engine | — |
| `quality_score` | DECIMAL(5,2) | Scoring Engine | — |
| `completeness_score` | DECIMAL(5,2) | Scoring Engine | — |

### 1.11 Red Flags & Positive Indicators (JSONB)
| Field | Type | Workflow Node | Frontend Usage |
|-------|------|---------------|----------------|
| `red_flags` | JSONB | Contractor Researcher | ✅ BidComparisonTable (contractor tab) |
| `positive_indicators` | JSONB | Contractor Researcher | ✅ BidComparisonTable (contractor tab) |

**red_flags structure:**
```json
[
  {
    "issue": "No specific model numbers listed",
    "source": "bid_document",
    "severity": "high|medium|low"
  }
]
```

**positive_indicators structure:**
```json
[
  {
    "indicator": "BBB Accredited since 2009",
    "source": "BBB.org"
  }
]
```

---

## 2. `bid_equipment` TABLE

| Field | Type | Workflow Node | Frontend Usage | Required |
|-------|------|---------------|----------------|----------|
| `bid_id` | UUID | (FK) | FK to contractor_bids | **YES** |
| `equipment_type` | TEXT | Extract All Bids | ✅ BidComparisonTable | **YES** |
| `brand` | TEXT | Extract All Bids | ✅ BidComparisonTable | **YES** |
| `model_number` | TEXT | Extract All Bids | — | No |
| `model_name` | TEXT | Extract All Bids | — | No |
| `capacity_btu` | INTEGER | Extract All Bids + Equipment Researcher | ✅ BidComparisonTable | No |
| `capacity_tons` | DECIMAL(4,2) | Extract All Bids + Equipment Researcher | ✅ BidComparisonTable | No |
| `seer_rating` | DECIMAL(5,2) | Extract All Bids + Equipment Researcher | ✅ BidComparisonTable | No |
| `seer2_rating` | DECIMAL(5,2) | Extract All Bids + Equipment Researcher | ✅ BidComparisonTable | No |
| `hspf_rating` | DECIMAL(5,2) | Extract All Bids + Equipment Researcher | ✅ BidComparisonTable | No |
| `hspf2_rating` | DECIMAL(5,2) | Extract All Bids + Equipment Researcher | ✅ BidComparisonTable | No |
| `eer_rating` | DECIMAL(5,2) | Equipment Researcher | ✅ BidComparisonTable (specs tab - advanced) | No |
| `cop` | DECIMAL(4,2) | Equipment Researcher | ✅ BidComparisonTable (specs tab - advanced) | No |
| `variable_speed` | BOOLEAN | Extract All Bids | ✅ BidComparisonTable | No |
| `stages` | INTEGER | Equipment Researcher | — | No |
| `refrigerant_type` | TEXT | Extract All Bids + Equipment Researcher | ✅ BidComparisonTable (specs tab - advanced) | No |
| `sound_level_db` | DECIMAL(5,1) | Equipment Researcher | ✅ BidComparisonTable (specs tab - advanced) | No |
| `voltage` | INTEGER | Extract All Bids + Equipment Researcher | — | No |
| `amperage_draw` | INTEGER | Extract All Bids + Equipment Researcher | ✅ BidComparisonTable (specs tab - advanced) | No |
| `minimum_circuit_amperage` | INTEGER | Extract All Bids + Equipment Researcher | ✅ BidComparisonTable (specs tab - advanced) | No |
| `energy_star_certified` | BOOLEAN | Equipment Researcher | ✅ BidComparisonTable | No |
| `energy_star_most_efficient` | BOOLEAN | Equipment Researcher | — | No |
| `warranty_years` | INTEGER | Equipment Researcher | — | No |
| `compressor_warranty_years` | INTEGER | Equipment Researcher | — | No |
| `equipment_cost` | DECIMAL(10,2) | Extract All Bids | — | No |
| `confidence` | ENUM | Extract All Bids + Equipment Researcher | — | No |

**equipment_type values:**
- `outdoor_unit` / `Heat Pump - Outdoor Unit`
- `indoor_unit` / `Heat Pump - Indoor Unit`
- `air_handler` / `Air Handler`
- `thermostat` / `Thermostat`
- `line_set`
- `disconnect`
- `pad`
- `other`

**stages values (INTEGER):**
- `0` = variable speed
- `1` = single stage
- `2` = two stage

---

## 3. `bid_line_items` TABLE

| Field | Type | Workflow Node | Frontend Usage | Required |
|-------|------|---------------|----------------|----------|
| `bid_id` | UUID | (FK) | FK to contractor_bids | **YES** |
| `item_type` | ENUM | Extract All Bids | — | **YES** |
| `description` | TEXT | Extract All Bids | — | **YES** |
| `quantity` | DECIMAL(10,2) | Extract All Bids | — | No (default 1) |
| `unit_price` | DECIMAL(10,2) | Extract All Bids | — | No |
| `total_price` | DECIMAL(10,2) | Extract All Bids | — | **YES** |
| `brand` | TEXT | Extract All Bids | — | No |
| `model_number` | TEXT | Extract All Bids | — | No |
| `confidence` | ENUM | Extract All Bids | — | No |
| `line_order` | INTEGER | Extract All Bids | — | No |

**item_type ENUM values:**
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

## 4. `bid_questions` TABLE

| Field | Type | Workflow Node | Frontend Usage | Required |
|-------|------|---------------|----------------|----------|
| `bid_id` | UUID | (FK) | FK to contractor_bids | **YES** |
| `question_text` | TEXT | Question Generator | ✅ Questions section | **YES** |
| `question_category` | TEXT | Question Generator | — | No |
| `priority` | TEXT | Question Generator | — | No |
| `is_answered` | BOOLEAN | (User interaction) | — | No (default false) |
| `answer_text` | TEXT | (User interaction) | — | No |
| `auto_generated` | BOOLEAN | (Always true) | — | No (default true) |
| `missing_field` | TEXT | Question Generator | — | No |
| `display_order` | INTEGER | Question Generator | — | No |

**question_category values:**
- `pricing`
- `warranty`
- `equipment`
- `timeline`
- `scope`
- `credentials`
- `electrical`

**priority values:**
- `high`
- `medium`
- `low`

---

## 5. `bid_faqs` TABLE

| Field | Type | Workflow Node | Frontend Usage | Required |
|-------|------|---------------|----------------|----------|
| `bid_id` | UUID | (FK) | FK to contractor_bids | **YES** |
| `faq_key` | TEXT | Per-Bid FAQ Generator | — | **YES** |
| `question_text` | TEXT | Per-Bid FAQ Generator | ✅ FAQ section | **YES** |
| `answer_text` | TEXT | Per-Bid FAQ Generator | ✅ FAQ section | No |
| `answer_confidence` | ENUM | Per-Bid FAQ Generator | — | No |
| `is_answered` | BOOLEAN | (Always true) | — | No (default true) |
| `display_order` | INTEGER | Per-Bid FAQ Generator | — | No |

---

## 6. `overall_faqs` TABLE

| Field | Type | Workflow Node | Frontend Usage | Required |
|-------|------|---------------|----------------|----------|
| `project_id` | UUID | (FK) | FK to projects | **YES** |
| `faq_key` | TEXT | Overall FAQ Generator | — | **YES** |
| `question_text` | TEXT | Overall FAQ Generator | ✅ FAQ section | **YES** |
| `answer_text` | TEXT | Overall FAQ Generator | ✅ FAQ section | No |
| `answer_confidence` | ENUM | Overall FAQ Generator | — | No |
| `display_order` | INTEGER | Overall FAQ Generator | — | No |

---

## CONFIDENCE ENUM VALUES

Used across multiple tables:
- `high` (extraction_confidence >= 80)
- `medium` (extraction_confidence >= 50)
- `low` (extraction_confidence >= 0)
- `manual` (user-entered)

---

## MINDPAL NODE → TABLE MAPPING

```
┌─────────────────────────┐
│ PDF Extractor           │
│ (Step 1-8)              │
└────────────┬────────────┘
             │ raw extracted data
             ▼
┌─────────────────────────┐
│ JSON Assembler          │
│ (Step 11)               │
│                         │
│ Outputs:                │
│ - contractor_bids[]     │
│   - equipment[]         │
│   - line_items[]        │
│   - questions[]         │
│   - faqs[]              │
│ - overall_faqs[]        │
└────────────┬────────────┘
             │ assembled JSON
             ▼
┌─────────────────────────┐
│ Supabase Insert         │
│ (Step 12)               │
│                         │
│ Inserts into:           │
│ 1. contractor_bids      │
│ 2. bid_equipment        │
│ 3. bid_line_items       │
│ 4. bid_questions        │
│ 5. bid_faqs             │
│ 6. overall_faqs         │
└─────────────────────────┘
```

---

## FRONTEND USAGE SUMMARY

### Actively Used in UI:
- **BidCard.tsx**: contractor info, pricing, warranty, scope, payment terms
- **BidComparisonTable.tsx**: all comparison fields, equipment specs, scope booleans

### Not Currently Displayed:
- `contractor_certifications_detailed` (JSONB) - complex structure, needs custom renderer
- `compressor_warranty_years` - at bid level (equipment table also has this)
- `stages` - covered by variable_speed boolean
- `voltage` - less critical than amperage

---

## FRONTEND UPDATE PROPOSALS

### Missing Fields → Where to Add

#### 1. NEW: Electrical Details Section (BidComparisonTable - specs tab)
Add after "ENERGY STAR" row in specs view:

| Field | Display Label | Notes |
|-------|--------------|-------|
| `electrical_panel_assessment_included` | Panel Assessment | ✓/✗ |
| `electrical_panel_upgrade_included` | Panel Upgrade Needed | ✓/✗ |
| `electrical_panel_upgrade_cost` | Upgrade Cost | Currency |
| `electrical_existing_panel_amps` | Current Panel | "200A" |
| `electrical_proposed_panel_amps` | Required Panel | "200A" |
| `electrical_breaker_size_required` | Breaker Size | "30A" |
| `electrical_dedicated_circuit_included` | Dedicated Circuit | ✓/✗ |
| `electrical_permit_included` | Electrical Permit | ✓/✗ |
| `electrical_load_calculation_included` | Load Calculation | ✓/✗ |
| `electrical_notes` | Notes | Text (tooltip?) |

**Implementation:** Add new "Electrical" tab to `BidComparisonTable.tsx` alongside specs/scope/contractor/pricing.

#### 2. Contractor Tab Additions
| Field | Display Label | Current Status |
|-------|--------------|----------------|
| `contractor_employee_count` | Company Size | Not shown |
| `contractor_service_area` | Service Area | Not shown |
| `contractor_certifications_detailed` | Detailed Certs | Not shown |
| `positive_indicators` | Positives | Not shown |

**Implementation:** Add rows to contractor comparison tab.

#### 3. Pricing Tab Additions
| Field | Display Label | Current Status |
|-------|--------------|----------------|
| `disposal_cost` | Disposal | Not shown |
| `electrical_cost` | Electrical Work | Not shown |

**Implementation:** Add rows between Permits and Rebates.

#### 4. Equipment Display Additions
| Field | Display Label | Current Status |
|-------|--------------|----------------|
| `amperage_draw` | Amperage Draw | Not shown |
| `minimum_circuit_amperage` | Min Circuit Amps | Not shown |
| `cop` | COP (Heating) | Not shown |
| `eer_rating` | EER Rating | Not shown |
| `refrigerant_type` | Refrigerant | Not shown |
| `sound_level_db` | Noise Level | Not shown |

**Implementation:** Add to specs tab, consider grouping in "Advanced Specs" expandable section.

---

## FRONTEND UI ↔ SUPABASE TABLE MAPPING

**Q: Is it okay that frontend sections don't map 1:1 to Supabase tables?**

**A: Yes, this is normal and correct.** The frontend is optimized for user experience, not database structure.

| Frontend Section | Supabase Sources |
|-----------------|------------------|
| **Equipment Specs** | `bid_equipment` + `contractor_bids` (electrical fields) |
| **Contractors** | `contractor_bids` (contractor_* fields) |
| **Cost & Scope** | `contractor_bids` (pricing + scope fields) |
| **Incentives** | `bid_analysis` (incentives JSONB) + `rebate_programs` |
| **Common Questions** | `overall_faqs` |
| **Contractor Questions** | `bid_questions` + `bid_faqs` |

This is a **view layer pattern** - the database is normalized for data integrity, the UI denormalizes for display.

---

## NEXT STEPS

1. **Use this doc** as the field reference for each MindPal extraction node
2. **Map each extractor** to output the exact field names listed here
3. **JSON Assembler** combines all nodes into the final structure
4. **Supabase Insert** writes to the 6 tables above

Confirm this schema looks correct and I'll provide the JSON Assembler structure next.
