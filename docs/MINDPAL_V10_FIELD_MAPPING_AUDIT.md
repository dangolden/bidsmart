# MindPal v10 Workflow → Supabase → Front-End: Complete Field Mapping Audit

**Generated:** 2026-02-21
**Workflow File:** MindPal Workflow - BidSmart Analyzer v10 (26).json

---

## How to Read This Document

Each section is organized by **MindPal Workflow Node**. For every field that node outputs:

| Column | Meaning |
|--------|---------|
| **MindPal Field** | The exact field name in the MindPal node's output JSON |
| **Supabase Column** | The exact column name in the database (table noted in header) |
| **Insert Path** | How the data gets from MindPal → DB (Node 9 direct, callback, v8Mapper) |
| **Front-End Display** | Which React component displays this field and how |
| **Status** | ✅ Match, ⚠️ Mismatch, ❌ Missing, 🔇 Not displayed |

### Insert Paths Reference
- **Node 9 (Direct)** = MindPal "Send data to supabase" agent node — inserts directly via Supabase REST API
- **Callback** = `mindpal-callback` edge function — receives webhook POST, maps nested v8 format
- **v8Mapper** = `make-webhook` edge function using `v8Mapper.ts` — handles both v8 nested and v10 flat
- **Frontend** = `mindpalService.ts` `mapExtractionToBid()` — client-side mapping (v8 nested format only)

---

## NODE 0: API Input (HUMAN_INPUT)

Input fields provided to the workflow. These are NOT extracted — they come from BidSmart when triggering the analysis.

| MindPal Field | Supabase Column | Table | Insert Path | Front-End Display | Status |
|---|---|---|---|---|---|
| `document_urls` | — | — | Used to feed PDFs to Extract All Bids | Not displayed | ✅ Internal |
| `user_priorities` | `priority_price`, `priority_warranty`, etc. | `project_requirements` | Pre-existing in DB; passed TO MindPal | HomeownerQuestionnaire.tsx — sliders | ✅ Internal |
| `user_notes` | `project_details` | `projects` | Pre-existing in DB; passed TO MindPal | Not displayed after submission | ✅ Internal |
| `project_id` | `project_id` | `projects` | Used as FK for all inserts | Not directly displayed (URL param) | ✅ Internal |
| `request_id` | `id` (of `pdf_uploads`) | `pdf_uploads` | Used to correlate callback | Not displayed | ✅ Internal |
| `callback_url` | — | — | URL for MindPal to POST results back | Not displayed | ✅ Internal |

---

## NODE 1: Extract All Bids (LOOP)

Iterates over each PDF URL. Extracts structured bid data from each document.

### → `contractor_bids` table

| MindPal Field | Supabase Column | Insert Path | Front-End Display | Status |
|---|---|---|---|---|
| `contractor_name` | `contractor_name` | Node 9: ✅ direct / Callback: via `contractor_info.company_name` / v8Mapper: flat or nested / Frontend: via `contractor_info.company_name` | BidCard.tsx (header), BidComparisonTable.tsx (header), ClarificationQuestionsSection.tsx (tabs) | ✅ Match |
| `contractor_company` | `contractor_company` | Node 9: not shown / Callback: via `contractor_info.company_name` / v8Mapper: flat or nested / Frontend: via `contractor_info.company_name` | 🔇 Not displayed | ⚠️ v10 outputs flat, callback expects nested |
| `contractor_contact_name` | `contractor_contact_name` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | 🔇 Not displayed | ⚠️ Node 9 doesn't include it; callback doesn't map it |
| `contractor_phone` | `contractor_phone` | Node 9: ✅ direct / Callback: via `contractor_info.phone` / v8Mapper: flat or nested / Frontend: via `contractor_info.phone` | BidCard.tsx (clickable phone link) | ✅ Match |
| `contractor_email` | `contractor_email` | Node 9: ✅ direct / Callback: via `contractor_info.email` / v8Mapper: flat or nested / Frontend: via `contractor_info.email` | BidCard.tsx (clickable email link) | ✅ Match |
| `contractor_address` | `contractor_address` | Node 9: ✅ direct / Callback: not mapped / v8Mapper: flat or nested | 🔇 Not displayed | ⚠️ Callback doesn't map this |
| `contractor_license` | `contractor_license` | Node 9: ✅ direct / Callback: via `contractor_info.license_number` / v8Mapper: flat or nested / Frontend: via `contractor_info.license_number` | BidCard.tsx, BidComparisonTable.tsx (license display) | ✅ Match |
| `contractor_license_state` | `contractor_license_state` | Node 9: not in schema / Callback: via `contractor_info.license_state` / v8Mapper: flat or nested / Frontend: ❌ NOT MAPPED | BidCard.tsx, BidComparisonTable.tsx (appended to license) | ⚠️ Node 9 missing; Frontend missing |
| `contractor_website` | `contractor_website` | Node 9: not in schema / Callback: via `contractor_info.website` / v8Mapper: flat or nested / Frontend: via `contractor_info.website` | BidCard.tsx (clickable link) | ⚠️ Node 9 missing |
| `contractor_years_in_business` | `contractor_years_in_business` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | BidCard.tsx, BidComparisonTable.tsx (quick stats) | ⚠️ Node 9 missing; Callback missing |
| `contractor_certifications` | `contractor_certifications` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | BidCard.tsx (comma list), BidComparisonTable.tsx (badge tags) | ⚠️ Node 9 missing; Callback missing |
| `total_bid_amount` | `total_bid_amount` | Node 9: ✅ direct / Callback: via `pricing.total_amount` / v8Mapper: flat or nested / Frontend: via `pricing.total_amount` | BidCard.tsx (large price header), BidComparisonTable.tsx | ✅ Match |
| `labor_cost` | `labor_cost` | Node 9: not in schema / Callback: via `pricing.labor_cost` / v8Mapper: flat or nested | BidComparisonTable.tsx (pricing section) | ⚠️ Node 9 missing |
| `equipment_cost` | `equipment_cost` | Node 9: not in schema / Callback: via `pricing.equipment_cost` / v8Mapper: flat or nested | BidComparisonTable.tsx (pricing section) | ⚠️ Node 9 missing |
| `materials_cost` | `materials_cost` | Node 9: not in schema / Callback: via `pricing.materials_cost` / v8Mapper: flat or nested | BidComparisonTable.tsx (pricing section) | ⚠️ Node 9 missing |
| `permit_cost` | `permit_cost` | Node 9: not in schema / Callback: via `pricing.permit_cost` / v8Mapper: flat or nested | BidComparisonTable.tsx (pricing section) | ⚠️ Node 9 missing |
| `disposal_cost` | `disposal_cost` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | BidComparisonTable.tsx (pricing section) | ⚠️ Node 9 missing; Callback missing |
| `electrical_cost` | `electrical_cost` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | BidComparisonTable.tsx (pricing section) | ⚠️ Node 9 missing; Callback missing |
| `total_before_rebates` | `total_before_rebates` | Node 9: ✅ direct / Callback: via `pricing.price_before_rebates` / v8Mapper: flat or nested | 🔇 Not directly displayed (used in calculations) | ✅ Match |
| `estimated_rebates` | `estimated_rebates` | Node 9: not in schema / Callback: calculated sum of `pricing.rebates_mentioned[].amount` / v8Mapper: flat or sum | BidCard.tsx (green text), BidComparisonTable.tsx | ⚠️ Node 9 missing |
| `total_after_rebates` | `total_after_rebates` | Node 9: not in schema / Callback: via `pricing.price_after_rebates` / v8Mapper: flat or nested | BidCard.tsx (green pricing), BidComparisonTable.tsx | ⚠️ Node 9 missing |
| `rebates_mentioned` | `rebates_mentioned` | Node 9: not in schema / Callback: not mapped as array / v8Mapper: flat or nested | 🔇 Not displayed | ⚠️ Node 9 missing; Callback doesn't store array |
| `labor_warranty_years` | `labor_warranty_years` | Node 9: not in schema / Callback: via `warranty.labor_warranty_years` / v8Mapper: nested only | BidCard.tsx, BidComparisonTable.tsx (warranty row) | ⚠️ Node 9 missing |
| `equipment_warranty_years` | `equipment_warranty_years` | Node 9: not in schema / Callback: via `warranty.equipment_warranty_years` / v8Mapper: nested only | BidCard.tsx, BidComparisonTable.tsx (warranty row) | ⚠️ Node 9 missing |
| `compressor_warranty_years` | `compressor_warranty_years` | Node 9: not in schema / Callback: ❌ NOT MAPPED / v8Mapper: ❌ NOT MAPPED | 🔇 Not displayed (used in comparisonService.ts) | ❌ Never inserted from any path |
| `additional_warranty_details` | `additional_warranty_details` | Node 9: not in schema / Callback: via `warranty.warranty_details` / v8Mapper: nested only | 🔇 Not displayed | ⚠️ Node 9 missing |
| `estimated_days` | `estimated_days` | Node 9: not in schema / Callback: via `timeline.estimated_days` / v8Mapper: nested only | BidCard.tsx (quick stats), BidComparisonTable.tsx (timeline) | ⚠️ Node 9 missing |
| `start_date_available` | `start_date_available` | Node 9: not in schema / Callback: via `timeline.start_date_available` | 🔇 Not displayed | ⚠️ Node 9 missing |
| `scope_summary` | `scope_summary` | Node 9: not in schema / Callback: via `scope_of_work.summary` / v8Mapper: flat or nested | BidCard.tsx (scope paragraph) | ⚠️ Node 9 missing |
| `inclusions` | `inclusions` | Node 9: not in schema / Callback: via `scope_of_work.inclusions` / v8Mapper: flat or nested | BidCard.tsx (green checkmark list) | ⚠️ Node 9 missing |
| `exclusions` | `exclusions` | Node 9: not in schema / Callback: via `scope_of_work.exclusions` / v8Mapper: flat or nested | BidCard.tsx (red X list) | ⚠️ Node 9 missing |
| `scope_permit_included` | `scope_permit_included` | Node 9: not in schema / Callback: via `scope_of_work.permit_included` / v8Mapper: flat or nested / Frontend: ❌ NOT MAPPED | BidComparisonTable.tsx (check/X icons) | ⚠️ Node 9 missing; Frontend missing |
| `scope_electrical_included` | `scope_electrical_included` | Node 9: not in schema / Callback: via `scope_of_work.electrical_work_included` / v8Mapper: flat or nested / Frontend: ❌ NOT MAPPED | BidComparisonTable.tsx (check/X icons) | ⚠️ Node 9 missing; Frontend missing |
| `scope_disposal_included` | `scope_disposal_included` | Node 9: not in schema / Callback: via `scope_of_work.disposal_included` / v8Mapper: flat or nested / Frontend: ❌ NOT MAPPED | BidComparisonTable.tsx (check/X icons) | ⚠️ Node 9 missing; Frontend missing |
| `scope_thermostat_included` | `scope_thermostat_included` | Node 9: not in schema / Callback: via `scope_of_work.thermostat_included` / v8Mapper: flat or nested / Frontend: ❌ NOT MAPPED | BidComparisonTable.tsx (check/X icons) | ⚠️ Node 9 missing; Frontend missing |
| `scope_ductwork_included` (hardcoded null) | `scope_ductwork_included` | Node 9: not in schema / Callback: via `scope_of_work.ductwork_included` / v8Mapper: flat or nested / Frontend: ❌ NOT MAPPED | BidComparisonTable.tsx (check/X icons) | ⚠️ v10 always null; Node 9 missing; Frontend missing |
| `scope_manual_j_included` (hardcoded null) | `scope_manual_j_included` | Node 9: not in schema / Callback: via `scope_of_work.manual_j_included` / v8Mapper: flat or nested / Frontend: ❌ NOT MAPPED | BidComparisonTable.tsx (check/X icons) | ⚠️ v10 always null; Node 9 missing; Frontend missing |
| `scope_commissioning_included` (hardcoded null) | `scope_commissioning_included` | Node 9: not in schema / Callback: via `scope_of_work.commissioning_included` / v8Mapper: flat or nested / Frontend: ❌ NOT MAPPED | BidComparisonTable.tsx (check/X icons) | ⚠️ v10 always null; Node 9 missing; Frontend missing |
| `scope_air_handler_included` (hardcoded null) | `scope_air_handler_included` | Node 9: not in schema / Callback: via `scope_of_work.air_handler_included` / v8Mapper: flat or nested / Frontend: ❌ NOT MAPPED | BidComparisonTable.tsx (check/X icons) | ⚠️ v10 always null; Node 9 missing; Frontend missing |
| `scope_line_set_included` (hardcoded null) | `scope_line_set_included` | Node 9: not in schema / Callback: via `scope_of_work.line_set_included` / v8Mapper: flat or nested / Frontend: ❌ NOT MAPPED | BidComparisonTable.tsx (check/X icons) | ⚠️ v10 always null; Node 9 missing; Frontend missing |
| `scope_disconnect_included` (hardcoded null) | `scope_disconnect_included` | Node 9: not in schema / Callback: via `scope_of_work.disconnect_included` / v8Mapper: flat or nested / Frontend: ❌ NOT MAPPED | BidComparisonTable.tsx (check/X icons) | ⚠️ v10 always null; Node 9 missing; Frontend missing |
| `scope_pad_included` (hardcoded null) | `scope_pad_included` | Node 9: not in schema / Callback: via `scope_of_work.pad_included` / v8Mapper: flat or nested / Frontend: ❌ NOT MAPPED | BidComparisonTable.tsx (check/X icons) | ⚠️ v10 always null; Node 9 missing; Frontend missing |
| `scope_drain_line_included` (hardcoded null) | `scope_drain_line_included` | Node 9: not in schema / Callback: via `scope_of_work.drain_line_included` / v8Mapper: flat or nested / Frontend: ❌ NOT MAPPED | BidComparisonTable.tsx (check/X icons) | ⚠️ v10 always null; Node 9 missing; Frontend missing |
| `electrical_panel_assessment_included` | `electrical_panel_assessment_included` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | BidComparisonTable.tsx, ElectricalComparisonTable.tsx | ⚠️ Node 9 missing; Callback missing |
| `electrical_panel_upgrade_included` | `electrical_panel_upgrade_included` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | BidComparisonTable.tsx | ⚠️ Node 9 missing; Callback missing |
| `electrical_panel_upgrade_cost` | `electrical_panel_upgrade_cost` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | BidComparisonTable.tsx (currency display) | ⚠️ Node 9 missing; Callback missing |
| `electrical_existing_panel_amps` | `electrical_existing_panel_amps` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | BidComparisonTable.tsx, ElectricalComparisonTable.tsx ("XA" format) | ⚠️ Node 9 missing; Callback missing |
| `electrical_proposed_panel_amps` | `electrical_proposed_panel_amps` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | BidComparisonTable.tsx ("XA" format) | ⚠️ Node 9 missing; Callback missing |
| `electrical_breaker_size_required` | `electrical_breaker_size_required` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | BidComparisonTable.tsx, ElectricalComparisonTable.tsx ("XA" format) | ⚠️ Node 9 missing; Callback missing |
| `electrical_dedicated_circuit_included` | `electrical_dedicated_circuit_included` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | BidComparisonTable.tsx (check/X icons) | ⚠️ Node 9 missing; Callback missing |
| `electrical_permit_included` | `electrical_permit_included` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | BidComparisonTable.tsx (check/X icons) | ⚠️ Node 9 missing; Callback missing |
| `electrical_load_calculation_included` | `electrical_load_calculation_included` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | BidComparisonTable.tsx (check/X icons) | ⚠️ Node 9 missing; Callback missing |
| `electrical_notes` | `electrical_notes` | Node 9: not in schema / Callback: not mapped / v8Mapper: flat or nested | BidComparisonTable.tsx (truncated text with tooltip) | ⚠️ Node 9 missing; Callback missing |
| `deposit_amount` | `deposit_required` | Node 9: ❌ uses `deposit_amount` (not a column) / Callback: via `payment_terms.deposit_amount` → `deposit_required` / v8Mapper: ✅ maps correctly | BidCard.tsx ("Deposit: $X") | ❌ NAME MISMATCH in Node 9 |
| `deposit_percentage` | `deposit_percentage` | Node 9: not in schema / Callback: via `payment_terms.deposit_percentage` / v8Mapper: flat or nested | BidCard.tsx (parenthetical %) | ⚠️ Node 9 missing |
| `payment_schedule` | `payment_schedule` | Node 9: not in schema / Callback: via `payment_terms.payment_schedule` / v8Mapper: flat or nested | comparisonService.ts (missing info detection) | ⚠️ Node 9 missing |
| `financing_offered` | `financing_offered` | Node 9: not in schema / Callback: via `payment_terms.financing_offered` / v8Mapper: flat or nested | BidCard.tsx, BidComparisonTable.tsx ("Financing available") | ⚠️ Node 9 missing |
| `financing_terms` | `financing_terms` | Node 9: not in schema / Callback: via `payment_terms.financing_terms` / v8Mapper: flat or nested | BidCard.tsx (appended text) | ⚠️ Node 9 missing |
| `bid_date` | `bid_date` | Node 9: not in schema / Callback: via `dates.bid_date` | 🔇 Not displayed | ⚠️ Node 9 missing |
| `quote_date` | `quote_date` | Node 9: not in schema / Callback: fallback for `bid_date` | 🔇 Not displayed | ⚠️ Node 9 missing |
| `extraction_confidence` | `extraction_confidence` | Node 9: ✅ direct / Callback: `mapConfidenceToLevel()` / v8Mapper: `mapConfidenceToLevel()` | BidCard.tsx (confidence badge: Verified/High/Medium/Low) | ⚠️ v10 outputs "high"/"medium"/"low" strings; Callback expects numeric 0-100 |
| `extraction_notes` | `extraction_notes` | Node 9: not in schema / Callback: joins array with `\n` as `[type] message` | 🔇 Not displayed | ⚠️ Node 9 missing |
| — (not in v10) | `deposit_required_flag` | v8Mapper: auto-calculates `deposit_amount > 0` / Callback: ❌ NOT CALCULATED | 🔇 Not displayed | ❌ Only v8Mapper sets this |
| — (not in v10) | `valid_until` | Callback: via `dates.valid_until` or `timeline.bid_valid_until` | 🔇 Not displayed | ⚠️ v10 doesn't output this field |

### → `bid_equipment` table

| MindPal Field | Supabase Column | Insert Path | Front-End Display | Status |
|---|---|---|---|---|
| `equipment[].equipment_type` | `equipment_type` | All paths: ✅ direct | BidComparisonTable.tsx (used to find outdoor_unit for SEER) | ✅ Match |
| `equipment[].brand` | `brand` | All paths: ✅ direct | 🔇 Not directly displayed in comparison | ✅ Match |
| `equipment[].model_number` | `model_number` | All paths: ✅ direct | 🔇 Not directly displayed in comparison | ✅ Match |
| `equipment[].capacity_tons` | `capacity_tons` | All paths: ✅ direct | BidComparisonTable.tsx (specs row) | ✅ Match |
| `equipment[].seer2_rating` | `seer2_rating` | All paths: ✅ direct | BidComparisonTable.tsx (SEER/SEER2 row, best value highlight) | ✅ Match |
| `equipment[].hspf2_rating` | `hspf2_rating` | All paths: ✅ direct | BidComparisonTable.tsx (HSPF/HSPF2 row, best value highlight) | ✅ Match |
| `equipment[].variable_speed` | `variable_speed` | All paths: ✅ direct | BidComparisonTable.tsx (check/X icon) | ✅ Match |
| `equipment[].refrigerant_type` | `refrigerant_type` | Node 9: ✅ direct / Callback: ⚠️ reads `eq.refrigerant` / v8Mapper: `eq.refrigerant_type` / Frontend: ⚠️ reads `eq.refrigerant` | BidComparisonTable.tsx (text) | ⚠️ v10 outputs `refrigerant_type`; Callback & Frontend read `refrigerant` |
| `equipment[].voltage` | `voltage` | All paths: ✅ direct | 🔇 Not displayed | ✅ Match |
| `equipment[].amperage_draw` | `amperage_draw` | All paths: ✅ direct | BidComparisonTable.tsx ("XA" format) | ✅ Match |
| `equipment[].minimum_circuit_amperage` | `minimum_circuit_amperage` | All paths: ✅ direct | BidComparisonTable.tsx ("XA" format) | ✅ Match |
| `equipment[].confidence` | `confidence` | All paths: `mapConfidenceToLevel()` | 🔇 Not displayed | ⚠️ v10 outputs "high"/"medium"/"low"; Callback expects numeric |
| — (not in v10 Extract) | `model_name` | Callback/v8Mapper: ✅ mapped | 🔇 Not displayed | ⚠️ v10 doesn't extract this |
| — (not in v10 Extract) | `capacity_btu` | Callback/v8Mapper: ✅ mapped | BidComparisonTable.tsx (converted to tons) | ⚠️ v10 doesn't extract this |
| — (not in v10 Extract) | `seer_rating` | Callback/v8Mapper: ✅ mapped | BidComparisonTable.tsx (fallback if seer2 missing) | ⚠️ v10 only outputs seer2 |
| — (not in v10 Extract) | `hspf_rating` | Callback/v8Mapper: ✅ mapped | BidComparisonTable.tsx (fallback if hspf2 missing) | ⚠️ v10 only outputs hspf2 |
| — (not in v10 Extract) | `eer_rating` | Callback/v8Mapper: ✅ mapped | BidComparisonTable.tsx (EER row) | ⚠️ v10 doesn't extract this (Equipment Researcher adds it) |
| — (not in v10 Extract) | `cop` | v8Mapper: ✅ mapped / Callback: ❌ NOT MAPPED | BidComparisonTable.tsx (COP row) | ❌ Callback never maps `cop` |
| — (not in v10 Extract) | `sound_level_db` | Callback/v8Mapper: ✅ mapped | BidComparisonTable.tsx ("XdB") | ⚠️ v10 doesn't extract this (Equipment Researcher adds it) |
| — (not in v10 Extract) | `energy_star_certified` | Callback: reads `eq.energy_star` / v8Mapper: reads `eq.energy_star` | BidComparisonTable.tsx (ENERGY STAR badge) | ⚠️ v10 doesn't extract this (Equipment Researcher adds it); name mismatch `energy_star` vs `energy_star_certified` |
| — (not in v10 Extract) | `energy_star_most_efficient` | Callback/v8Mapper: ✅ mapped | BidComparisonTable.tsx (part of ES badge) | ⚠️ v10 doesn't extract this |
| — (not in v10 Extract) | `equipment_cost` (per equipment) | Callback/v8Mapper: ✅ mapped | 🔇 Not displayed separately | ⚠️ v10 doesn't extract per-equipment cost |

### → `bid_line_items` table

| MindPal Field | Supabase Column | Insert Path | Front-End Display | Status |
|---|---|---|---|---|
| `line_items[].item_type` | `item_type` | All paths: `mapLineItemType()` | 🔇 Not directly displayed (pricing breakdown uses bid-level costs) | ✅ Match |
| `line_items[].description` | `description` | All paths: ✅ direct | 🔇 Not directly displayed | ✅ Match |
| `line_items[].quantity` | `quantity` | All paths: fallback 1 | 🔇 Not directly displayed | ✅ Match |
| `line_items[].unit_price` | `unit_price` | All paths: ✅ direct | 🔇 Not directly displayed | ✅ Match |
| `line_items[].total_price` | `total_price` | All paths: ✅ direct | 🔇 Not directly displayed | ✅ Match |
| `line_items[].brand` | `brand` | All paths: ✅ direct | 🔇 Not directly displayed | ✅ Match |
| `line_items[].model_number` | `model_number` | All paths: ✅ direct | 🔇 Not directly displayed | ✅ Match |
| `line_items[].confidence` | `confidence` | All paths: `mapConfidenceToLevel()` | 🔇 Not directly displayed | ⚠️ v10 outputs string; Callback expects numeric |
| `line_items[].line_order` | `line_order` | All paths: array index | 🔇 Not directly displayed | ✅ Match |
| — (not in v10) | `source_text` | Callback: ✅ mapped / Frontend: ✅ mapped | 🔇 Not directly displayed | ⚠️ v10 prompt doesn't include this field |
| — (not in v10) | `notes` | None: never mapped | 🔇 Not displayed | 🔇 DB column exists but never populated |

---

## NODE 2: Equipment Researcher (LOOP)

Enhances equipment specs via web research. Returns the COMPLETE bid object with enhanced `equipment[]` array.

### → `bid_equipment` table (enhancements to Node 1 equipment)

| MindPal Field | Supabase Column | Insert Path | Front-End Display | Status |
|---|---|---|---|---|
| `equipment[].seer2_rating` | `seer2_rating` | Same as Node 1 (merged into bid object) | BidComparisonTable.tsx (SEER/SEER2 row) | ✅ Enhanced |
| `equipment[].hspf2_rating` | `hspf2_rating` | Same as Node 1 | BidComparisonTable.tsx (HSPF/HSPF2 row) | ✅ Enhanced |
| `equipment[].eer_rating` | `eer_rating` | Same as Node 1 | BidComparisonTable.tsx (EER row) | ✅ Enhanced |
| `equipment[].cop` | `cop` | v8Mapper: ✅ / Callback: ❌ NOT MAPPED | BidComparisonTable.tsx (COP row) | ❌ Callback drops this |
| `equipment[].sound_level_db` | `sound_level_db` | Same as Node 1 | BidComparisonTable.tsx ("XdB") | ✅ Enhanced |
| `equipment[].refrigerant_type` | `refrigerant_type` | Node 9/v8Mapper: `refrigerant_type` / Callback: reads `refrigerant` | BidComparisonTable.tsx (text) | ⚠️ Callback reads wrong field name |
| `equipment[].energy_star_certified` | `energy_star_certified` | Callback/Frontend: reads `energy_star` / v8Mapper: reads `energy_star` | BidComparisonTable.tsx (ES badge) | ⚠️ All paths read `energy_star` but v10 outputs `energy_star_certified` |
| `equipment[].energy_star_most_efficient` | `energy_star_most_efficient` | All paths: ✅ direct | BidComparisonTable.tsx | ✅ Match |
| `equipment[].amperage_draw` | `amperage_draw` | All paths: ✅ direct | BidComparisonTable.tsx ("XA") | ✅ Enhanced |
| `equipment[].minimum_circuit_amperage` | `minimum_circuit_amperage` | All paths: ✅ direct | BidComparisonTable.tsx ("XA") | ✅ Enhanced |

---

## NODE 3: Contractor Researcher (LOOP)

Researches contractor reputation online. Outputs a separate JSON per contractor.

### → `contractor_bids` table (contractor reputation fields)

| MindPal Field | Supabase Column | Insert Path | Front-End Display | Status |
|---|---|---|---|---|
| `contractor_name` | `contractor_name` | Matching key (not re-inserted) | — | ✅ Used for matching |
| `license_number` | `contractor_license` | Node 9: ✅ listed as `contractor_license` / v8Mapper: nested or flat | BidCard.tsx, BidComparisonTable.tsx | ⚠️ NAME MISMATCH: v10 outputs `license_number`, DB column is `contractor_license` |
| `license_status` | ❌ NO COLUMN | — | 🔇 Not displayed | ❌ DB has no column for this |
| `license_expiration_date` | ❌ NO COLUMN | — | 🔇 Not displayed | ❌ DB has no column for this |
| `years_in_business` | `contractor_years_in_business` | Node 9: must prefix `contractor_` / v8Mapper: flat or nested | BidCard.tsx, BidComparisonTable.tsx | ⚠️ NAME MISMATCH if Node 9 inserts as-is |
| `employee_count` | `contractor_employee_count` | Node 9: must prefix `contractor_` / v8Mapper: not mapped | BidComparisonTable.tsx | ⚠️ NAME MISMATCH; v8Mapper doesn't map this |
| `service_area` | `contractor_service_area` | Node 9: must prefix `contractor_` / v8Mapper: not mapped | BidComparisonTable.tsx (truncated with tooltip) | ⚠️ NAME MISMATCH; v8Mapper doesn't map this |
| `google_rating` | `contractor_google_rating` | Node 9: ✅ listed as `contractor_google_rating` / v8Mapper: nested or flat | BidCard.tsx, BidComparisonTable.tsx (star emoji) | ⚠️ NAME MISMATCH if Node 9 inserts as-is |
| `google_review_count` | `contractor_google_review_count` | Node 9: ✅ listed as `contractor_google_review_count` / v8Mapper: nested or flat | BidCard.tsx, BidComparisonTable.tsx (count in parens) | ⚠️ NAME MISMATCH if Node 9 inserts as-is |
| `yelp_rating` | `contractor_yelp_rating` | Node 9: not in schema / v8Mapper: not mapped / Callback: not mapped | BidComparisonTable.tsx (star emoji) | ❌ Never inserted from v10 |
| `yelp_review_count` | `contractor_yelp_review_count` | Node 9: not in schema / v8Mapper: not mapped / Callback: not mapped | BidComparisonTable.tsx (count in parens) | ❌ Never inserted from v10 |
| `bbb_rating` | `contractor_bbb_rating` | Node 9: not in schema / v8Mapper: not mapped / Callback: not mapped | BidComparisonTable.tsx | ❌ Never inserted from v10 |
| `bbb_accredited` | `contractor_bbb_accredited` | Node 9: not in schema / v8Mapper: not mapped / Callback: not mapped | BidComparisonTable.tsx ("Accredited" badge) | ❌ Never inserted from v10 |
| `bbb_complaints_3yr` | `contractor_bbb_complaints_3yr` | Node 9: not in schema / v8Mapper: not mapped / Callback: not mapped | 🔇 Not displayed | ❌ Never inserted from v10 |
| `bonded` | `contractor_bonded` | Node 9: not in schema / v8Mapper: not mapped / Callback: not mapped | BidComparisonTable.tsx (check/X icon) | ❌ Never inserted from v10 |
| `certifications` | `contractor_certifications` | Node 9: not in schema / v8Mapper: flat or nested | BidCard.tsx, BidComparisonTable.tsx (badge tags) | ⚠️ NAME MISMATCH; Node 9 missing |
| `red_flags` | `red_flags` | Node 9: not in schema / v8Mapper: ✅ / Callback: not mapped | BidComparisonTable.tsx (alert icon + count) | ⚠️ Node 9 missing; Callback missing |
| `positive_indicators` | `positive_indicators` | Node 9: not in schema / v8Mapper: ✅ / Callback: not mapped | BidComparisonTable.tsx (thumbs up + count) | ⚠️ Node 9 missing; Callback missing |
| `research_confidence` | ❌ NO COLUMN on `contractor_bids` | — | 🔇 Not displayed | ❌ DB has no column (only `incentive_research_confidence` exists) |
| `verification_date` | ❌ NO COLUMN | — | 🔇 Not displayed | ❌ DB has no column |
| `research_notes` | ❌ NO COLUMN on `contractor_bids` | — | 🔇 Not displayed | ❌ DB has no column (only `incentive_research_notes` exists) |

---

## NODE 4: Incentive Finder (AGENT)

Finds federal/state/utility incentives. Outputs ONE JSON for all bids.

### → `incentive_programs` table (per-bid child records)

| MindPal Field | Supabase Column | Insert Path | Front-End Display | Status |
|---|---|---|---|---|
| `incentives[].program_name` | `program_name` | Node 9: ✅ direct | IncentivesTable.tsx (heading) | ✅ Match |
| `incentives[].program_type` | `program_type` | Node 9: ✅ direct | IncentivesTable.tsx (gray badge) | ✅ Match |
| `incentives[].incentive_amount` | ❌ NO COLUMN (string/number hybrid) | — | 🔇 Not displayed | ❌ v10 outputs string like "2000-4000"; DB has no column for this |
| `incentives[].incentive_amount_numeric_min` | `incentive_amount_numeric_min` | Node 9: ✅ direct | 🔇 Not directly displayed | ✅ Match |
| `incentives[].incentive_amount_numeric_max` | `incentive_amount_numeric_max` | Node 9: ✅ direct | IncentivesTable.tsx ("Up to $X") | ✅ Match |
| `incentives[].equipment_requirements` | `equipment_requirements` | Node 9: not in schema | 🔇 Not displayed | ⚠️ Node 9 missing |
| `incentives[].eligibility_requirements` | `eligibility_requirements` | Node 9: not in schema | 🔇 Not displayed | ⚠️ Node 9 missing |
| `incentives[].income_limits` | `income_limits` | Node 9: not in schema | IncentivesTable.tsx ("Income Qualified" badge) | ⚠️ Node 9 missing |
| `incentives[].application_process` | `application_process` | Node 9: not in schema | IncentivesTable.tsx (expanded section text) | ⚠️ Node 9 missing |
| `incentives[].can_stack_with_other_incentives` | `can_stack_with_other_incentives` | Node 9: not in schema | 🔇 Not displayed | ⚠️ Node 9 missing |
| `incentives[].stacking_notes` | `stacking_notes` | Node 9: not in schema | 🔇 Not displayed | ⚠️ Node 9 missing |
| `incentives[].verification_source` | `verification_source` | Node 9: not in schema | 🔇 Not displayed | ⚠️ Node 9 missing |
| `incentives[].still_active` | `still_active` | Node 9: ✅ direct | DecidePhase.tsx (filter: only active shown) | ✅ Match |
| `incentives[].research_confidence` | `research_confidence` | Node 9: not in schema | 🔇 Not displayed | ⚠️ Node 9 missing |
| `incentives[].research_notes` | `research_notes` | Node 9: not in schema | 🔇 Not displayed | ⚠️ Node 9 missing |
| — (not in v10) | `incentive_amount_string` | — | 🔇 Not displayed | 🔇 DB column exists but v10 doesn't output this |

### → `contractor_bids` table (incentive summary fields)

| MindPal Field | Supabase Column | Insert Path | Front-End Display | Status |
|---|---|---|---|---|
| `utilities.electric_utility` | `incentive_electric_utility` | Node 9: ✅ listed | 🔇 Not displayed | ⚠️ Not in front-end types |
| `utilities.gas_utility` | `incentive_gas_utility` | Node 9: ✅ listed | 🔇 Not displayed | ⚠️ Not in front-end types |
| `utilities.cca` | `incentive_cca` | Node 9: ✅ listed | 🔇 Not displayed | ⚠️ Not in front-end types |
| `utilities.ren` | `incentive_ren` | Node 9: ✅ listed | 🔇 Not displayed | ⚠️ Not in front-end types |
| `summary.total_incentive_potential_low` | `incentive_total_potential_low` | Node 9: ✅ listed | 🔇 Not displayed | ⚠️ Not in front-end types |
| `summary.total_incentive_potential_high` | `incentive_total_potential_high` | Node 9: ✅ listed | 🔇 Not displayed | ⚠️ Not in front-end types |
| — (not in v10) | `incentive_programs_found_count` | — | 🔇 Not displayed | 🔇 DB column exists but never populated |
| `summary.research_confidence` | `incentive_research_confidence` | Node 9: not in schema | 🔇 Not displayed | ⚠️ Node 9 missing |
| `summary.research_notes` | `incentive_research_notes` | Node 9: not in schema | 🔇 Not displayed | ⚠️ Node 9 missing |

---

## NODE 5: Scoring Engine (LOOP)

Scores each bid on multiple dimensions.

### → `contractor_bids` table (score columns)

| MindPal Field | Supabase Column | Insert Path | Front-End Display | Status |
|---|---|---|---|---|
| `overall_score` | `overall_score` | Node 9: ✅ direct / v8Mapper: via `scores.overall` | BidCard.tsx (color-coded score badge), BidComparisonTable.tsx (header) | ✅ Match |
| `value_score` | `value_score` | Node 9: not in schema / v8Mapper: via `scores.price` | 🔇 Not displayed (used in comparisonService.ts calculations) | ⚠️ Node 9 missing |
| `quality_score` | `quality_score` | Node 9: not in schema / v8Mapper: via `scores.efficiency` | 🔇 Not displayed (used in comparisonService.ts calculations) | ⚠️ Node 9 missing |
| `completeness_score` | `completeness_score` | Node 9: not in schema / v8Mapper: via `scores.completeness` | 🔇 Not displayed (used in comparisonService.ts calculations) | ⚠️ Node 9 missing |
| `score_confidence` | `score_confidence` | Node 9: not in schema / v8Mapper: ❌ NOT MAPPED | 🔇 Not displayed | ❌ Never inserted; not in front-end types |
| `scoring_notes` | `scoring_notes` | Node 9: not in schema / v8Mapper: ❌ NOT MAPPED | 🔇 Not displayed | ❌ Never inserted; not in front-end types |
| `ranking_recommendation` | `ranking_recommendation` | Node 9: not in schema / v8Mapper: ❌ NOT MAPPED | 🔇 Not displayed | ❌ Never inserted; not in front-end types |
| `bid_id` | — | Used for matching only | — | ✅ Internal |
| `contractor_name` | — | Used for matching only | — | ✅ Internal |
| `total_bid_amount` | — | Used for matching only | — | ✅ Internal |

---

## NODE 6: Question Generator (LOOP)

Generates clarifying questions per bid.

### → `bid_questions` table

| MindPal Field | Supabase Column | Insert Path | Front-End Display | Status |
|---|---|---|---|---|
| `questions[].question_text` | `question_text` | Node 9: ✅ direct / Callback: ✅ direct | ClarificationQuestionsSection.tsx (main text), ContractorQuestions.tsx | ✅ Match |
| `questions[].category` | `category` | Node 9: ✅ direct / Callback: maps to `question_category` | ClarificationQuestionsSection.tsx (category badge) | ⚠️ v10 outputs `category`; DB has BOTH `category` and `question_category`; Callback maps to `question_category` |
| `questions[].priority` | `priority` | Node 9: ✅ direct / Callback: ✅ direct | ClarificationQuestionsSection.tsx (priority badge with icon) | ✅ Match |
| `questions[].display_order` | `display_order` | Node 9: ✅ direct / Callback: ✅ direct | ClarificationQuestionsSection.tsx, ContractorQuestions.tsx (sorting) | ✅ Match |
| `generation_notes` | `generation_notes` | Node 9: not in schema / Callback: ❌ NOT MAPPED | 🔇 Not displayed | ⚠️ v10 outputs at wrapper level; never stored |
| — (not in v10) | `context` | — | ClarificationQuestionsSection.tsx (blue context box) | ❌ v10 doesn't output this; DISPLAYED but always null |
| — (not in v10) | `triggered_by` | — | ClarificationQuestionsSection.tsx (small text) | ❌ v10 doesn't output this; DISPLAYED but always null |
| — (not in v10) | `good_answer_looks_like` | — | ClarificationQuestionsSection.tsx (green box) | ❌ v10 doesn't output this; DISPLAYED but always null |
| — (not in v10) | `concerning_answer_looks_like` | — | ClarificationQuestionsSection.tsx (red box) | ❌ v10 doesn't output this; DISPLAYED but always null |
| — (not in v10) | `missing_field` | Callback: ✅ mapped | 🔇 Not displayed | ⚠️ v10 doesn't output this |

---

## NODE 7: Per-Bid FAQ Generator (LOOP)

Generates FAQ Q&A pairs for each bid.

### → `bid_faqs` table

| MindPal Field | Supabase Column | Insert Path | Front-End Display | Status |
|---|---|---|---|---|
| `faqs[].question` | `question` | Node 9: ✅ direct | BidFaqSection.tsx, BidSpecificFaqsCard.tsx (FAQ question text) | ✅ Match for Node 9 |
| `faqs[].answer` | `answer` | Node 9: ✅ direct | BidFaqSection.tsx, BidSpecificFaqsCard.tsx (expandable answer) | ✅ Match for Node 9 |
| `faqs[].category` | `category` | Node 9: not in schema | BidFaqSection.tsx (grouping by category) | ⚠️ Node 9 missing |
| `faqs[].answer_confidence` | `answer_confidence` | Node 9: ✅ direct | BidFaqSection.tsx, ProjectFAQSection.tsx (confidence badge) | ✅ Match |
| `faqs[].sources` | `sources` | Node 9: not in schema | 🔇 Not displayed | ⚠️ Node 9 missing |
| `faqs[].display_order` | `display_order` | Node 9: not in schema | ProjectFAQSection.tsx (sorting) | ⚠️ Node 9 missing |
| `faq_generation_confidence` | ❌ NO COLUMN | — | 🔇 Not displayed | ❌ Metadata not stored |

**CRITICAL CALLBACK MISMATCH:** The `mindpal-callback` expects v8 FAQ format:
| Callback Expects | v10 Outputs | DB Column | Status |
|---|---|---|---|
| `faq_key` | ❌ Not in v10 | ❌ Not a DB column | ❌ Callback tries to insert non-existent column |
| `question_text` | `question` | `question` | ❌ NAME MISMATCH |
| `answer_text` | `answer` | `answer` | ❌ NAME MISMATCH |
| `is_answered` | ❌ Not in v10 | ❌ Not a DB column | ❌ Callback tries to insert non-existent column |

---

## NODE 8: Overall FAQ Generator (AGENT)

Generates project-wide comparison FAQs.

### → `project_faqs` table

| MindPal Field | Supabase Column | Insert Path | Front-End Display | Status |
|---|---|---|---|---|
| `overall_faq_output.faqs[].question` | `question` | Node 9: ✅ direct | ProjectFAQSection.tsx (FAQ question text) | ✅ Match |
| `overall_faq_output.faqs[].answer` | `answer` | Node 9: ✅ direct | ProjectFAQSection.tsx (expandable prose answer) | ✅ Match |
| `overall_faq_output.faqs[].category` | `category` | Node 9: ✅ direct | Used internally for grouping | ✅ Match |
| `overall_faq_output.faqs[].sources` | `sources` | Node 9: ✅ direct | 🔇 Not displayed | ✅ Match (stored) |
| `overall_faq_output.faqs[].display_order` | `display_order` | Node 9: not in schema | ProjectFAQSection.tsx (sorting) | ⚠️ Node 9 missing |
| `overall_faq_output.faq_count` | ❌ NO COLUMN | — | 🔇 Not displayed | ❌ Metadata not stored |
| `overall_faq_output.generation_confidence` | ❌ NO COLUMN | — | 🔇 Not displayed | ❌ Metadata not stored |

**NOTE:** v10 wraps output in `{ "overall_faq_output": { "faqs": [...] } }`. Node 9 must unwrap this.

---

## NODE 9: Send Data to Supabase (AGENT)

This is the primary insert path for v10. It's an AI agent that uses Supabase REST tools.

**CRITICAL NOTE:** Node 9's prompt only shows a SUBSET of fields in its example schemas. The actual fields it inserts depend on what data the AI agent passes through. The schemas in the prompt are EXAMPLES, not exhaustive.

### Fields explicitly shown in Node 9's prompt:

**contractor_bids insert:**
- `project_id` ✅
- `contractor_name` ✅
- `total_bid_amount` ✅
- `overall_score` ✅
- `contractor_phone` ✅
- `contractor_email` ✅
- `contractor_address` ✅
- `total_before_rebates` ✅
- `contractor_license` ✅
- `contractor_google_rating` ✅
- `contractor_google_review_count` ✅
- `incentive_total_potential_low` ✅
- `incentive_total_potential_high` ✅
- `extraction_confidence` ✅

**bid_equipment insert:**
- `bid_id` ✅
- `equipment_type` ✅
- `brand` ✅
- `model_number` ✅
- `seer2_rating` ✅
- `hspf2_rating` ✅
- `energy_star_certified` ✅

**bid_line_items insert:**
- `bid_id` ✅
- `item_type` ✅
- `description` ✅
- `total_price` ✅
- `quantity` ✅
- `line_order` ✅

**incentive_programs insert:**
- `bid_id` ✅
- `program_name` ✅
- `program_type` ✅
- `incentive_amount_numeric_min` ✅
- `incentive_amount_numeric_max` ✅
- `still_active` ✅

**bid_questions insert:**
- `bid_id` ✅
- `question_text` ✅
- `category` ✅
- `priority` ✅

**bid_faqs insert:**
- `bid_id` ✅
- `question` ✅
- `answer` ✅
- `answer_confidence` ✅

**project_faqs insert:**
- `project_id` ✅
- `question` ✅
- `answer` ✅
- `category` ✅
- `sources` ✅

---

## NODE 10: Supabase Real Insert (CODE)

**Status: EMPTY** — No code exists in this node. It's wired after Node 9 but does nothing.

---

## NODE 11: Send Results (WEBHOOK)

Sends completion notification. No data mapping issues — this is a notification trigger.

---

## DB COLUMNS THAT EXIST BUT ARE NEVER POPULATED BY ANY v10 PATH

| Table | Column | Front-End Display | Notes |
|---|---|---|---|
| `contractor_bids` | `contractor_year_established` | 🔇 Not displayed | No node outputs this |
| `contractor_bids` | `contractor_total_installs` | 🔇 Not displayed | No node outputs this |
| `contractor_bids` | `contractor_switch_rating` | 🔇 Not displayed | No node outputs this |
| `contractor_bids` | `contractor_is_switch_preferred` | BidCard.tsx ("Preferred" badge) | No node outputs this |
| `contractor_bids` | `contractor_certifications_detailed` | 🔇 Not displayed | No node outputs this |
| `contractor_bids` | `bid_index` | ClarificationQuestionsSection.tsx, ProjectFAQSection.tsx | v8 only; not in v10 extraction |
| `contractor_bids` | `incentive_programs_found_count` | 🔇 Not displayed | No node outputs this |
| `contractor_bids` | `score_confidence` | 🔇 Not displayed | Scoring Engine outputs it but no insert path maps it |
| `contractor_bids` | `scoring_notes` | 🔇 Not displayed | Scoring Engine outputs it but no insert path maps it |
| `contractor_bids` | `ranking_recommendation` | 🔇 Not displayed | Scoring Engine outputs it but no insert path maps it |
| `bid_equipment` | `warranty_years` | 🔇 Not displayed | No node outputs per-equipment warranty |
| `bid_equipment` | `compressor_warranty_years` (equip) | comparisonService.ts (warranty calc) | No node outputs per-equipment warranty |
| `bid_equipment` | `stages` | 🔇 Not displayed | v10 doesn't extract this; v8 stages is numeric |
| `bid_line_items` | `notes` | 🔇 Not displayed | No node outputs this |
| `bid_questions` | `context` | ClarificationQuestionsSection.tsx (blue box) | ❌ DISPLAYED but v10 never populates |
| `bid_questions` | `triggered_by` | ClarificationQuestionsSection.tsx (small text) | ❌ DISPLAYED but v10 never populates |
| `bid_questions` | `good_answer_looks_like` | ClarificationQuestionsSection.tsx (green box) | ❌ DISPLAYED but v10 never populates |
| `bid_questions` | `concerning_answer_looks_like` | ClarificationQuestionsSection.tsx (red box) | ❌ DISPLAYED but v10 never populates |
| `bid_questions` | `generation_notes` | 🔇 Not displayed | v10 outputs at wrapper level but never stored |

---

## FRONT-END TYPES NOT IN DB

| TypeScript Field | Table Expected | Notes |
|---|---|---|
| `scope_permit_detail` | `contractor_bids` | In types but ❌ NO DB COLUMN |
| `scope_disposal_detail` | `contractor_bids` | In types but ❌ NO DB COLUMN |
| `scope_electrical_detail` | `contractor_bids` | In types but ❌ NO DB COLUMN |
| `scope_ductwork_detail` | `contractor_bids` | In types but ❌ NO DB COLUMN |
| `scope_thermostat_detail` | `contractor_bids` | In types but ❌ NO DB COLUMN |
| `scope_manual_j_detail` | `contractor_bids` | In types but ❌ NO DB COLUMN |
| `scope_commissioning_detail` | `contractor_bids` | In types but ❌ NO DB COLUMN |
| `scope_air_handler_detail` | `contractor_bids` | In types but ❌ NO DB COLUMN |
| `scope_line_set_detail` | `contractor_bids` | In types but ❌ NO DB COLUMN |
| `scope_disconnect_detail` | `contractor_bids` | In types but ❌ NO DB COLUMN |
| `scope_pad_detail` | `contractor_bids` | In types but ❌ NO DB COLUMN |
| `scope_drain_line_detail` | `contractor_bids` | In types but ❌ NO DB COLUMN |
| All `incentive_*` fields | `contractor_bids` | In DB but ❌ NOT IN FRONT-END TYPES |

---

## CRITICAL ISSUES SUMMARY (ordered by severity)

### 🔴 CRITICAL

1. **Callback FAQ field names don't match v10 output OR DB columns** — Callback inserts `faq_key`, `question_text`, `answer_text`, `is_answered` but DB columns are `question`, `answer` and `faq_key`/`is_answered` don't exist. This will cause silent insert failures.

2. **Node 9 only shows ~14 contractor_bids fields** but DB has 90+ columns. The AI agent must infer which fields to include. Many fields will be silently dropped.

3. **`deposit_amount` → `deposit_required` name mismatch** — v10 outputs `deposit_amount`; DB column is `deposit_required`. Node 9 direct insert will silently drop this.

4. **Equipment `energy_star_certified` vs `energy_star`** — v10 Equipment Researcher outputs `energy_star_certified`; Callback and Frontend read `energy_star` (wrong name). Data never reaches DB through Callback.

5. **Equipment `refrigerant_type` vs `refrigerant`** — v10 outputs `refrigerant_type`; Callback reads `eq.refrigerant` (wrong name). Data never reaches DB through Callback.

### 🟡 HIGH

6. **Contractor Researcher field names missing `contractor_` prefix** — v10 outputs `google_rating`, `yelp_rating`, `bonded`, etc. DB columns are `contractor_google_rating`, `contractor_yelp_rating`, `contractor_bonded`. Node 9 must rename; other paths don't handle this.

7. **8 scope booleans hardcoded to null in v10** — v10 explicitly sets `scope_ductwork_included` through `scope_drain_line_included` to null. These are all DISPLAYED in BidComparisonTable.tsx and will always show as unknown.

8. **Question Generator dropped 4 displayed fields** — `context`, `triggered_by`, `good_answer_looks_like`, `concerning_answer_looks_like` are all rendered in ClarificationQuestionsSection.tsx but v10 never outputs them. Users see empty UI sections.

9. **Yelp/BBB/bonded data never inserted** — Contractor Researcher outputs these but NO insert path maps them to DB. Front-end displays them.

10. **`cop` never reaches DB via Callback** — Equipment Researcher enhances this but Callback doesn't map it. Only v8Mapper handles `cop`.

### 🟠 MEDIUM

11. **Frontend `mindpalService.ts` is stale** — Still expects v8 nested format (`contractor_info.company_name`, `pricing.total_amount`). Won't work with v10 flat output.

12. **`compressor_warranty_years` never inserted** — v10 extracts it but NO insert path maps it. comparisonService.ts uses it for scoring.

13. **Extraction confidence type mismatch** — v10 outputs "high"/"medium"/"low" strings; Callback's `mapConfidenceToLevel()` expects numeric 0-100.

14. **Scoring Engine's `score_confidence`, `scoring_notes`, `ranking_recommendation`** — Output by v10 but never mapped by any insert path. DB columns exist but are always null.

15. **`incentive_programs_found_count`** — DB column exists but never populated by any node.

16. **12 `scope_*_detail` fields** — Exist in front-end TypeScript types but have NO DB columns and are not output by any MindPal node.
