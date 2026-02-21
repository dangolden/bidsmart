# MindPal v24 → Supabase → Front-End Schema Mapping

**Generated:** 2026-02-20  
**Source:** MindPal Workflow - BidSmart Analyzer v10 (24).json  
**Validated Against:** Migrations 027, 028, 029 + Front-end TypeScript interfaces

---

## Overview

This document maps each MindPal workflow node's output to:
1. **Supabase Table.Column** - Where the data is stored
2. **DB Status** - ✅ Exists | ⚠️ Missing | 🔄 Metadata (not stored)
3. **Front-End Interface.Property** - TypeScript interface consuming it
4. **UI Component/Tab** - Where user sees it

---

## NODE 1: Extract All Bids

**Node ID:** `697fc84a45bf3484d9a86102`  
**Type:** LOOP  
**Target Table:** `contractor_bids` + `bid_equipment` + `bid_line_items`

### contractor_bids Columns

| MindPal Output Field | DB Table.Column | DB Status | Front-End Type | UI Tab |
|---------------------|-----------------|-----------|----------------|--------|
| `contractor_name` | `contractor_bids.contractor_name` | ✅ | `ContractorBid.contractor_name` | Compare, All tabs |
| `contractor_company` | `contractor_bids.contractor_company` | ✅ | `ContractorBid.contractor_company` | Compare |
| `contractor_contact_name` | `contractor_bids.contractor_contact_name` | ✅ | `ContractorBid.contractor_contact_name` | Bid detail |
| `contractor_phone` | `contractor_bids.contractor_phone` | ✅ | `ContractorBid.contractor_phone` | Bid detail |
| `contractor_email` | `contractor_bids.contractor_email` | ✅ | `ContractorBid.contractor_email` | Bid detail |
| `contractor_address` | `contractor_bids.contractor_address` | ✅ | `ContractorBid.contractor_address` | Bid detail |
| `contractor_license` | `contractor_bids.contractor_license` | ✅ | `ContractorBid.contractor_license` | Compare (Contractor) |
| `contractor_license_state` | `contractor_bids.contractor_license_state` | ✅ | `ContractorBid.contractor_license_state` | Compare (Contractor) |
| `contractor_website` | `contractor_bids.contractor_website` | ✅ | `ContractorBid.contractor_website` | Bid detail |
| `contractor_years_in_business` | `contractor_bids.contractor_years_in_business` | ✅ | `ContractorBid.contractor_years_in_business` | Compare (Contractor) |
| `contractor_certifications` | `contractor_bids.contractor_certifications` | ✅ | `ContractorBid.contractor_certifications` | Compare (Contractor) |
| `total_bid_amount` | `contractor_bids.total_bid_amount` | ✅ | `ContractorBid.total_bid_amount` | Compare (Cost) |
| `labor_cost` | `contractor_bids.labor_cost` | ✅ | `ContractorBid.labor_cost` | Compare (Cost) |
| `equipment_cost` | `contractor_bids.equipment_cost` | ✅ | `ContractorBid.equipment_cost` | Compare (Cost) |
| `materials_cost` | `contractor_bids.materials_cost` | ✅ | `ContractorBid.materials_cost` | Compare (Cost) |
| `permit_cost` | `contractor_bids.permit_cost` | ✅ | `ContractorBid.permit_cost` | Compare (Cost) |
| `disposal_cost` | `contractor_bids.disposal_cost` | ✅ | `ContractorBid.disposal_cost` | Compare (Cost) |
| `electrical_cost` | `contractor_bids.electrical_cost` | ✅ | `ContractorBid.electrical_cost` | Compare (Cost) |
| `total_before_rebates` | `contractor_bids.total_before_rebates` | ✅ | `ContractorBid.total_before_rebates` | Compare (Cost) |
| `estimated_rebates` | `contractor_bids.estimated_rebates` | ✅ | `ContractorBid.estimated_rebates` | Decide (Incentives) |
| `total_after_rebates` | `contractor_bids.total_after_rebates` | ✅ | `ContractorBid.total_after_rebates` | Compare (Cost) |
| `rebates_mentioned` | `contractor_bids.rebates_mentioned` | ✅ | `ContractorBid.rebates_mentioned` | Decide (Incentives) |
| `labor_warranty_years` | `contractor_bids.labor_warranty_years` | ✅ | `ContractorBid.labor_warranty_years` | Compare (Warranty) |
| `equipment_warranty_years` | `contractor_bids.equipment_warranty_years` | ✅ | `ContractorBid.equipment_warranty_years` | Compare (Warranty) |
| `compressor_warranty_years` | `contractor_bids.compressor_warranty_years` | ✅ | `ContractorBid.compressor_warranty_years` | Compare (Warranty) |
| `additional_warranty_details` | `contractor_bids.additional_warranty_details` | ✅ | `ContractorBid.additional_warranty_details` | Bid detail |
| `estimated_days` | `contractor_bids.estimated_days` | ✅ | `ContractorBid.estimated_days` | Compare |
| `start_date_available` | `contractor_bids.start_date_available` | ✅ | `ContractorBid.start_date_available` | Compare |
| `scope_summary` | `contractor_bids.scope_summary` | ✅ | `ContractorBid.scope_summary` | Bid detail |
| `inclusions` | `contractor_bids.inclusions` | ✅ | `ContractorBid.inclusions` | Compare (Scope) |
| `exclusions` | `contractor_bids.exclusions` | ✅ | `ContractorBid.exclusions` | Compare (Scope) |
| `scope_permit_included` | `contractor_bids.scope_permit_included` | ✅ | `ContractorBid.scope_permit_included` | Compare (Scope) |
| `scope_electrical_included` | `contractor_bids.scope_electrical_included` | ✅ | `ContractorBid.scope_electrical_included` | Compare (Scope) |
| `scope_disposal_included` | `contractor_bids.scope_disposal_included` | ✅ | `ContractorBid.scope_disposal_included` | Compare (Scope) |
| `scope_thermostat_included` | `contractor_bids.scope_thermostat_included` | ✅ | `ContractorBid.scope_thermostat_included` | Compare (Scope) |
| `electrical_panel_*` (9 fields) | `contractor_bids.electrical_*` | ✅ | `ContractorBid.electrical_*` | Compare (Electrical) |
| `deposit_amount` | `contractor_bids.deposit_required` | ✅ | `ContractorBid.deposit_required` | Bid detail |
| `deposit_percentage` | `contractor_bids.deposit_percentage` | ✅ | `ContractorBid.deposit_percentage` | Bid detail |
| `payment_schedule` | `contractor_bids.payment_schedule` | ✅ | `ContractorBid.payment_schedule` | Bid detail |
| `financing_offered` | `contractor_bids.financing_offered` | ✅ | `ContractorBid.financing_offered` | Bid detail |
| `financing_terms` | `contractor_bids.financing_terms` | ✅ | `ContractorBid.financing_terms` | Bid detail |
| `bid_date` | `contractor_bids.bid_date` | ✅ | `ContractorBid.bid_date` | Bid detail |
| `quote_date` | `contractor_bids.quote_date` | ✅ | `ContractorBid.quote_date` | Bid detail |
| `extraction_confidence` | `contractor_bids.extraction_confidence` | ✅ | `ContractorBid.extraction_confidence` | Internal |
| `extraction_notes` | `contractor_bids.extraction_notes` | ✅ | `ContractorBid.extraction_notes` | Internal |

### bid_equipment Columns (per equipment item)

| MindPal Output Field | DB Table.Column | DB Status | Front-End Type | UI Tab |
|---------------------|-----------------|-----------|----------------|--------|
| `equipment_type` | `bid_equipment.equipment_type` | ✅ | `BidEquipment.equipment_type` | Compare (Equipment) |
| `brand` | `bid_equipment.brand` | ✅ | `BidEquipment.brand` | Compare (Equipment) |
| `model_number` | `bid_equipment.model_number` | ✅ | `BidEquipment.model_number` | Compare (Equipment) |
| `capacity_tons` | `bid_equipment.capacity_tons` | ✅ | `BidEquipment.capacity_tons` | Compare (Equipment) |
| `seer2_rating` | `bid_equipment.seer2_rating` | ✅ | `BidEquipment.seer2_rating` | Compare (Equipment) |
| `hspf2_rating` | `bid_equipment.hspf2_rating` | ✅ | `BidEquipment.hspf2_rating` | Compare (Equipment) |
| `variable_speed` | `bid_equipment.variable_speed` | ✅ | `BidEquipment.variable_speed` | Compare (Equipment) |
| `refrigerant_type` | `bid_equipment.refrigerant_type` | ✅ | `BidEquipment.refrigerant_type` | Compare (Equipment) |
| `voltage` | `bid_equipment.voltage` | ✅ | `BidEquipment.voltage` | Compare (Equipment) |
| `amperage_draw` | `bid_equipment.amperage_draw` | ✅ | `BidEquipment.amperage_draw` | Compare (Equipment) |
| `minimum_circuit_amperage` | `bid_equipment.minimum_circuit_amperage` | ✅ | `BidEquipment.minimum_circuit_amperage` | Compare (Equipment) |
| `confidence` | `bid_equipment.confidence` | ✅ | `BidEquipment.confidence` | Internal |

### bid_line_items Columns (per line item)

| MindPal Output Field | DB Table.Column | DB Status | Front-End Type | UI Tab |
|---------------------|-----------------|-----------|----------------|--------|
| `item_type` | `bid_line_items.item_type` | ✅ | `BidLineItem.item_type` | Compare (Cost) |
| `description` | `bid_line_items.description` | ✅ | `BidLineItem.description` | Compare (Cost) |
| `quantity` | `bid_line_items.quantity` | ✅ | `BidLineItem.quantity` | Compare (Cost) |
| `unit_price` | `bid_line_items.unit_price` | ✅ | `BidLineItem.unit_price` | Compare (Cost) |
| `total_price` | `bid_line_items.total_price` | ✅ | `BidLineItem.total_price` | Compare (Cost) |
| `brand` | `bid_line_items.brand` | ✅ | `BidLineItem.brand` | Compare (Cost) |
| `model_number` | `bid_line_items.model_number` | ✅ | `BidLineItem.model_number` | Compare (Cost) |
| `confidence` | `bid_line_items.confidence` | ✅ | `BidLineItem.confidence` | Internal |
| `line_order` | `bid_line_items.line_order` | ✅ | `BidLineItem.line_order` | Internal |

---

## NODE 2: Equipment Researcher

**Node ID:** `6994d91de9cb0bba897fd725`  
**Type:** LOOP  
**Target Table:** `bid_equipment` (updates/enhances existing rows)

| MindPal Output Field | DB Table.Column | DB Status | Front-End Type | UI Tab |
|---------------------|-----------------|-----------|----------------|--------|
| `seer2_rating` | `bid_equipment.seer2_rating` | ✅ | `BidEquipment.seer2_rating` | Compare (Equipment) |
| `hspf2_rating` | `bid_equipment.hspf2_rating` | ✅ | `BidEquipment.hspf2_rating` | Compare (Equipment) |
| `eer_rating` | `bid_equipment.eer_rating` | ✅ | `BidEquipment.eer_rating` | Compare (Equipment) |
| `cop` | `bid_equipment.cop` | ✅ | `BidEquipment.cop` | Compare (Equipment) |
| `sound_level_db` | `bid_equipment.sound_level_db` | ✅ | `BidEquipment.sound_level_db` | Compare (Equipment) |
| `energy_star_certified` | `bid_equipment.energy_star_certified` | ✅ | `BidEquipment.energy_star_certified` | Compare (Equipment) |
| `energy_star_most_efficient` | `bid_equipment.energy_star_most_efficient` | ✅ | `BidEquipment.energy_star_most_efficient` | Compare (Equipment) |

---

## NODE 3: Contractor Researcher

**Node ID:** `6994d9274bdf69a219bbb036`  
**Type:** LOOP  
**Target Table:** `contractor_bids` (updates contractor fields)

⚠️ **IMPORTANT: Field Name Transformation Required**

The Contractor Researcher outputs **unprefixed** field names. The "Send data to supabase" AGENT must transform them to **prefixed** DB column names.

| MindPal Output Field | Transforms To | DB Table.Column | DB Status | Front-End Type |
|---------------------|---------------|-----------------|-----------|----------------|
| `license_number` | `contractor_license` | `contractor_bids.contractor_license` | ✅ | `ContractorBid.contractor_license` |
| `license_status` | `contractor_license_status` | `contractor_bids.contractor_license_status` | ✅ (mig 030) | `ContractorBid.contractor_license_status` |
| `license_expiration_date` | `contractor_license_expiration_date` | `contractor_bids.contractor_license_expiration_date` | ✅ (mig 030) | `ContractorBid.contractor_license_expiration_date` |
| `years_in_business` | `contractor_years_in_business` | `contractor_bids.contractor_years_in_business` | ✅ | `ContractorBid.contractor_years_in_business` |
| `employee_count` | `contractor_employee_count` | `contractor_bids.contractor_employee_count` | ✅ | `ContractorBid.contractor_employee_count` |
| `service_area` | `contractor_service_area` | `contractor_bids.contractor_service_area` | ✅ | `ContractorBid.contractor_service_area` |
| `google_rating` | `contractor_google_rating` | `contractor_bids.contractor_google_rating` | ✅ | `ContractorBid.contractor_google_rating` |
| `google_review_count` | `contractor_google_review_count` | `contractor_bids.contractor_google_review_count` | ✅ | `ContractorBid.contractor_google_review_count` |
| `yelp_rating` | `contractor_yelp_rating` | `contractor_bids.contractor_yelp_rating` | ✅ | `ContractorBid.contractor_yelp_rating` |
| `yelp_review_count` | `contractor_yelp_review_count` | `contractor_bids.contractor_yelp_review_count` | ✅ | `ContractorBid.contractor_yelp_review_count` |
| `bbb_rating` | `contractor_bbb_rating` | `contractor_bids.contractor_bbb_rating` | ✅ | `ContractorBid.contractor_bbb_rating` |
| `bbb_accredited` | `contractor_bbb_accredited` | `contractor_bids.contractor_bbb_accredited` | ✅ | `ContractorBid.contractor_bbb_accredited` |
| `bbb_complaints_3yr` | `contractor_bbb_complaints_3yr` | `contractor_bids.contractor_bbb_complaints_3yr` | ✅ | `ContractorBid.contractor_bbb_complaints_3yr` |
| `bonded` | `contractor_bonded` | `contractor_bids.contractor_bonded` | ✅ | `ContractorBid.contractor_bonded` |
| `certifications` | `contractor_certifications` | `contractor_bids.contractor_certifications` | ✅ | `ContractorBid.contractor_certifications` |
| `red_flags` | `red_flags` | `contractor_bids.red_flags` | ✅ | `ContractorBid.red_flags` |
| `positive_indicators` | `positive_indicators` | `contractor_bids.positive_indicators` | ✅ | `ContractorBid.positive_indicators` |
| `research_confidence` | `contractor_research_confidence` | `contractor_bids.contractor_research_confidence` | ✅ (mig 030) | `ContractorBid.contractor_research_confidence` |
| `verification_date` | `contractor_verification_date` | `contractor_bids.contractor_verification_date` | ✅ (mig 030) | `ContractorBid.contractor_verification_date` |
| `research_notes` | `contractor_research_notes` | `contractor_bids.contractor_research_notes` | ✅ (mig 030) | `ContractorBid.contractor_research_notes` |

---

## NODE 4: Incentive Finder

**Node ID:** `6995cd80e7cc97ea29f15f4c`  
**Type:** AGENT  
**Target Tables:** `incentive_programs` + `contractor_bids` (summary fields)

### incentive_programs Columns (per incentive found)

| MindPal Output Field | DB Table.Column | DB Status | Front-End Type | UI Tab |
|---------------------|-----------------|-----------|----------------|--------|
| `program_name` | `incentive_programs.program_name` | ✅ | `IncentiveProgram.program_name` | Decide (Incentives) |
| `program_type` | `incentive_programs.program_type` | ✅ | `IncentiveProgram.program_type` | Decide (Incentives) |
| `incentive_amount_numeric_min` | `incentive_programs.incentive_amount_numeric_min` | ✅ | `IncentiveProgram.incentive_amount` | Decide (Incentives) |
| `incentive_amount_numeric_max` | `incentive_programs.incentive_amount_numeric_max` | ✅ | `IncentiveProgram.max_incentive` | Decide (Incentives) |
| `equipment_requirements` | `incentive_programs.equipment_requirements` | ✅ | `IncentiveProgram.eligibility.equipment_requirements` | Decide (Incentives) |
| `eligibility_requirements` | `incentive_programs.eligibility_requirements` | ✅ | N/A | Decide (Incentives) |
| `income_limits` | `incentive_programs.income_limits` | ✅ | `IncentiveProgram.eligibility.income_qualified` | Decide (Incentives) |
| `application_process` | `incentive_programs.application_process` | ✅ | `IncentiveProgram.application.how_to_apply` | Decide (Incentives) |
| `can_stack_with_other_incentives` | `incentive_programs.can_stack_with_other_incentives` | ✅ | N/A | Decide (Incentives) |
| `stacking_notes` | `incentive_programs.stacking_notes` | ✅ | N/A | Decide (Incentives) |
| `verification_source` | `incentive_programs.verification_source` | ✅ | N/A | Internal |
| `still_active` | `incentive_programs.still_active` | ✅ | `IncentiveProgram.verified_active` | Decide (Incentives) |
| `research_confidence` | `incentive_programs.research_confidence` | ✅ | N/A | Internal |
| `research_notes` | `incentive_programs.research_notes` | ✅ | N/A | Internal |

### contractor_bids Summary Fields (from incentive output)

| MindPal Output Field | DB Table.Column | DB Status | Front-End Type | UI Tab |
|---------------------|-----------------|-----------|----------------|--------|
| `utilities.electric_utility` | `contractor_bids.incentive_electric_utility` | ✅ | `IncentivesData.utilities.electric_utility` | Decide (Incentives) |
| `utilities.gas_utility` | `contractor_bids.incentive_gas_utility` | ✅ | `IncentivesData.utilities.gas_utility` | Decide (Incentives) |
| `utilities.cca` | `contractor_bids.incentive_cca` | ✅ | `IncentivesData.utilities.cca` | Decide (Incentives) |
| `utilities.ren` | `contractor_bids.incentive_ren` | ✅ | `IncentivesData.utilities.ren` | Decide (Incentives) |
| `summary.total_incentive_potential_low` | `contractor_bids.incentive_total_potential_low` | ✅ | `IncentivesData.total_potential.minimum_estimate` | Decide (Incentives) |
| `summary.total_incentive_potential_high` | `contractor_bids.incentive_total_potential_high` | ✅ | `IncentivesData.total_potential.maximum_estimate` | Decide (Incentives) |
| (computed) | `contractor_bids.incentive_programs_found_count` | ✅ | N/A | Decide (Incentives) |
| `summary.research_confidence` | `contractor_bids.incentive_research_confidence` | ✅ | N/A | Internal |
| `summary.research_notes` | `contractor_bids.incentive_research_notes` | ✅ | N/A | Internal |

---

## NODE 5: Scoring Engine

**Node ID:** `6993af7cf915c1bcbe09c4b5`  
**Type:** LOOP  
**Target Table:** `contractor_bids` (score fields)

| MindPal Output Field | DB Table.Column | DB Status | Front-End Type | UI Tab |
|---------------------|-----------------|-----------|----------------|--------|
| `overall_score` | `contractor_bids.overall_score` | ✅ | `ContractorBid.overall_score` | Compare (all views) |
| `value_score` | `contractor_bids.value_score` | ✅ | `ContractorBid.value_score` | Compare |
| `quality_score` | `contractor_bids.quality_score` | ✅ | `ContractorBid.quality_score` | Compare |
| `completeness_score` | `contractor_bids.completeness_score` | ✅ | `ContractorBid.completeness_score` | Compare |
| `score_confidence` | `contractor_bids.score_confidence` | ✅ | N/A | Internal |
| `scoring_notes` | `contractor_bids.scoring_notes` | ✅ | N/A | Internal |
| `ranking_recommendation` | `contractor_bids.ranking_recommendation` | ✅ | N/A | Decide |
| `bid_id` | Used for matching | 🔄 | N/A | N/A |
| `contractor_name` | Used for matching | 🔄 | N/A | N/A |
| `total_bid_amount` | Already stored | 🔄 | N/A | N/A |

---

## NODE 6: Question Generator

**Node ID:** `697ff3cc75bc7910e8aa1e14`  
**Type:** LOOP  
**Target Table:** `bid_questions`

| MindPal Output Field | DB Table.Column | DB Status | Front-End Type | UI Tab |
|---------------------|-----------------|-----------|----------------|--------|
| `question_text` | `bid_questions.question_text` | ✅ | `BidQuestion.question_text` | Decide (Questions) |
| `category` | `bid_questions.category` | ✅ | `BidQuestion.category` | Decide (Questions) |
| `priority` | `bid_questions.priority` | ✅ | `BidQuestion.priority` | Decide (Questions) |
| `display_order` | `bid_questions.display_order` | ✅ | `BidQuestion.display_order` | Decide (Questions) |
| `generation_notes` | `bid_questions.generation_notes` | ✅ | `BidQuestion.generation_notes` | Internal |

**Note:** `bid_questions` also has legacy fields from migration 001: `question_category`, `is_answered`, `answer_text`, `answered_at`, `auto_generated`, `missing_field`. MindPal uses the new `category` field; the front-end supports both.

---

## NODE 7: Per-Bid FAQ Generator

**Node ID:** `6980039a8b80633ac76a9e85`  
**Type:** LOOP  
**Target Table:** `bid_faqs`

| MindPal Output Field | DB Table.Column | DB Status | Front-End Type | UI Tab |
|---------------------|-----------------|-----------|----------------|--------|
| `question` | `bid_faqs.question` | ✅ | `BidFaq.question` | Decide (FAQs) |
| `answer` | `bid_faqs.answer` | ✅ | `BidFaq.answer` | Decide (FAQs) |
| `category` | `bid_faqs.category` | ✅ | `BidFaq.category` | Decide (FAQs) |
| `answer_confidence` | `bid_faqs.answer_confidence` | ✅ | `BidFaq.answer_confidence` | Decide (FAQs) |
| `sources` | `bid_faqs.sources` | ✅ | `BidFaq.sources` | Decide (FAQs) |
| `display_order` | `bid_faqs.display_order` | ✅ | `BidFaq.display_order` | Decide (FAQs) |
| `faq_generation_confidence` | Not stored | 🔄 | N/A | N/A |

**Front-End Components:**
- `BidSpecificFaqsCard.tsx` - Tabbed view per contractor
- `BidFaqSection.tsx` - Grouped by category

---

## NODE 8: Overall FAQ Generator

**Node ID:** `69800400f3a816267bf9db64`  
**Type:** AGENT  
**Target Table:** `project_faqs`

| MindPal Output Field | DB Table.Column | DB Status | Front-End Type | UI Tab |
|---------------------|-----------------|-----------|----------------|--------|
| `question` | `project_faqs.question` | ✅ | `OverallFaq.question` | Decide (FAQs) |
| `answer` | `project_faqs.answer` | ✅ | `OverallFaq.answer` | Decide (FAQs) |
| `category` | `project_faqs.category` | ✅ | `OverallFaq.category` | Decide (FAQs) |
| `sources` | `project_faqs.sources` | ✅ | `OverallFaq.sources` | Decide (FAQs) |
| `display_order` | `project_faqs.display_order` | ✅ | `OverallFaq.display_order` | Decide (FAQs) |
| `generation_confidence` | Not stored | 🔄 | N/A | N/A |
| `faq_count` | Not stored | 🔄 | N/A | N/A |

**Front-End Components:**
- `OverallFaqsCard.tsx` - Expandable FAQ list

**Note:** `project_faqs` does NOT have `answer_confidence` (unlike `bid_faqs`). This is intentional per migration 027.

---

## NODE 9: Supabase Real Insert (CODE)

**Node ID:** `6997adeb985dab78cfbec2ae`  
**Type:** CODE  
**Purpose:** Executes actual HTTP POST calls to Supabase REST API

This node receives validated data from the "Send data to supabase" AGENT node and performs insertions in this order:

1. `contractor_bids` → Returns `bid_id` for FK references
2. `bid_equipment` → Uses `bid_id`
3. `bid_line_items` → Uses `bid_id`
4. `bid_questions` → Uses `bid_id`
5. `bid_faqs` → Uses `bid_id`
6. `incentive_programs` → Uses `bid_id`
7. `project_faqs` → Uses `project_id`

---

## Summary: Tables & Column Counts

| Table | Total Columns | MindPal-Populated | Front-End Used |
|-------|---------------|-------------------|----------------|
| `contractor_bids` | ~80 | ~65 | ~50 |
| `bid_equipment` | ~25 | ~20 | ~15 |
| `bid_line_items` | ~12 | ~10 | ~8 |
| `bid_questions` | ~15 | ~6 | ~8 |
| `bid_faqs` | ~9 | ~7 | ~7 |
| `project_faqs` | ~7 | ~6 | ~5 |
| `incentive_programs` | ~17 | ~15 | ~10 |

---

## Front-End Tab → Data Source Mapping

| UI Tab | Tables Queried | Key Components |
|--------|----------------|----------------|
| **Gather** | `projects`, `project_requirements` | `GatherPhase.tsx` |
| **Compare** | `contractor_bids`, `bid_equipment`, `bid_line_items` | `ComparePhase.tsx`, `BidComparisonTable.tsx` |
| **Decide** | `bid_questions`, `bid_faqs`, `project_faqs`, `incentive_programs` | `DecidePhase.tsx`, `OverallFaqsCard.tsx`, `BidSpecificFaqsCard.tsx` |

---

## Known Gaps / Notes

1. **IncentiveProgram interface mismatch**: Front-end uses nested structure (`eligibility.equipment_requirements`) but DB uses flat columns. Service layer transforms this.

2. **Metadata fields not stored**: `generation_confidence`, `faq_generation_confidence`, `verification_date`, `research_notes` (from contractor researcher) are MindPal workflow metadata, not persisted.

3. **Legacy question fields**: `bid_questions.question_category` exists alongside new `category` for backward compatibility.

4. **project_faqs lacks answer_confidence**: By design - overall FAQs don't have per-answer confidence since they synthesize across all bids.
