# BidSmart Field Descriptions — MindPal API Tool Reference

> Copy descriptions directly into MindPal Custom API tool "Description" fields.
> Last updated: 2026-02-23
> Source: SCHEMA_V2_COMPLETE.html (Detailed Description column)
>
> **V2 Schema Restructure (Feb 2026):**
> - `bids` is now an 18-column identity stub (status, request_id, storage metadata)
> - `bid_scope` expanded to 69 columns (original 43 scope + 26 migrated from bids: pricing, payment, warranty, timeline, extraction metadata)
> - `bid_id` is pre-created at PDF upload — MindPal receives it paired with each document
> - The old `contractor_bids` table no longer exists

---

## bid_equipment

| Column | Type | Description for MindPal |
|--------|------|------------------------|
| id | UUID | Set by database. Do NOT include in MindPal output. |
| bid_id | UUID | Set by Code Node. Do NOT include in MindPal agent output. The Code Node resolves bid_index to actual bid_id UUID. |
| created_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |
| equipment_type | TEXT | Determined by AI from bid context. Values: 'heat_pump', 'outdoor_unit', 'indoor_unit', 'air_handler', 'furnace', 'condenser'. Only major equipment — NOT thermostats, line sets, pads, disconnects, surge protectors. Don't confuse 'heat_pump' (heats AND cools) with 'condenser' (cooling only). REQUIRED — never null. |
| system_role | TEXT | Determined by AI — deterministic from equipment_type. Values: 'primary_both', 'primary_heating', 'primary_cooling', 'air_distribution', 'secondary'. Mapping: heat_pump/outdoor_unit → 'primary_both', condenser → 'primary_cooling', furnace → 'primary_heating', air_handler/indoor_unit → 'air_distribution'. Use 'secondary' only for backup units in hybrid systems. Should always be set. |
| brand | TEXT | Extracted from bid PDF. Title case (e.g., "Carrier", "Lennox", "Daikin"). REQUIRED — never null. Common brands: Carrier, Lennox, Trane, Daikin, Mitsubishi, Rheem, Bryant, Goodman, Amana, Fujitsu, Bosch. |
| model_number | TEXT | Extracted from bid PDF. Full alphanumeric model number (e.g., "24VNA036A003"). This is the manufacturer part number, NOT the marketing name. Used as part of upsert key. Null when bid does not specify. |
| model_name | TEXT | Extracted from bid PDF or enriched via web search. Marketing/product line name (e.g., "Infinity 24 Heat Pump"). Distinct from model_number. Null when not found. |
| capacity_btu | INTEGER | Extracted from bid PDF or enriched via web search. Whole number in BTU/hr (e.g., 36000, 48000). For heat pumps/condensers: cooling capacity. For furnaces: heating input. If only tons given, calculate: capacity_btu = capacity_tons × 12000. Null when not found. Don't confuse cooling BTU vs heating BTU. |
| capacity_tons | DECIMAL(4,2) | Extracted from bid or calculated. Cooling capacity only (1 ton = 12,000 BTU). Common values: 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0. Null for furnaces (heating-only) or capacity unknown. |
| seer_rating | DECIMAL(5,2) | Extracted from bid PDF or web-enriched. SEER (pre-2023 standard). Use ONLY if bid lists SEER (not SEER2). Null for furnaces and air handlers (cooling-only metric). Don't put SEER2 values in this field. |
| seer2_rating | DECIMAL(5,2) | Web-enriched (preferred) or bid PDF. SEER2 is 2023+ DOE standard, PREFERRED over seer_rating. Range: 13.0–24.0. SEER2 ≈ SEER × 0.95. Always search manufacturer specs for SEER2 if missing from bid. Null for furnaces and air handlers. Don't confuse SEER (older, higher) with SEER2 (newer, ~5% lower). |
| hspf_rating | DECIMAL(5,2) | Extracted from bid PDF or web-enriched. HSPF (pre-2023 standard). HEAT PUMPS ONLY. Null for furnaces (use afue_rating), condensers (cooling only), air handlers. |
| hspf2_rating | DECIMAL(5,2) | Web-enriched (preferred) or bid PDF. HSPF2 is 2023+ DOE standard. HEAT PUMPS ONLY. Range: 7.5–14.0. Preferred over hspf_rating. NOT applicable to furnaces — furnace heating efficiency = afue_rating. |
| eer_rating | DECIMAL(5,2) | Web-enriched or bid PDF. Steady-state cooling efficiency. Heat pumps and condensers only. Null for furnaces, air handlers, or when not found. |
| cop | DECIMAL(4,2) | Web-enriched or bid PDF. Heating mode Coefficient of Performance for heat pumps. Range: 2.0–5.0. Null for furnaces (use afue_rating), condensers, air handlers. |
| afue_rating | DECIMAL(5,2) | Extracted from bid or web-enriched. FURNACES ONLY. Percentage of fuel converted to heat. Range: 80.0–99.0. ALWAYS null for non-furnace equipment. Never put AFUE values on heat pump rows. |
| fuel_type | TEXT | Determined by AI — deterministic from equipment_type. Values: 'electric', 'natural_gas', 'propane', 'oil'. Heat pumps are ALWAYS 'electric'. Furnace → 'natural_gas' unless bid specifies propane or oil. |
| variable_speed | BOOLEAN | Extracted from bid or inferred from model series. true if "variable speed", "inverter-driven", or "modulating". false for single/multi-stage. When variable_speed=true, set stages=null (not 0). Null when cannot determine. |
| stages | INTEGER | Extracted from bid or inferred. Values: 1 (single-stage) or 2 (two-stage). NEVER 0. When variable_speed=true, set stages=null. Never use 0 for variable speed. |
| refrigerant_type | TEXT | Web-enriched or bid PDF. Include "R-" prefix (e.g., "R-410A", "R-32", "R-454B"). Null for furnaces (no refrigerant) or when not found. |
| sound_level_db | DECIMAL(5,1) | Web-enriched or bid PDF. Outdoor units: 50–75 dB, indoor: 18–30 dB. Use lowest operating speed value. Null when not found. |
| voltage | INTEGER | Extracted from bid or web-enriched. Values: 120, 208, 230, 240. Heat pumps/condensers typically 208/230/240V. Furnaces/air handlers typically 120V. Null when not specified. |
| amperage_draw | INTEGER | Web-enriched or bid PDF. RLA or FLA from spec sheet. Different from MCA. Null when not found. |
| minimum_circuit_amperage | INTEGER | Web-enriched from manufacturer spec sheet. MCA determines minimum wire gauge and breaker size. Different from amperage_draw. Critical for panel assessment. Null when not found. |
| energy_star_certified | BOOLEAN | Web-enriched (energystar.gov) or bid PDF. true if this specific model is ENERGY STAR certified. Per-model, NOT per-brand. Null when cannot determine. |
| energy_star_most_efficient | BOOLEAN | Web-enriched (energystar.gov). true ONLY if "ENERGY STAR Most Efficient" designation (higher tier than basic ENERGY STAR). Null when cannot determine or energy_star_certified is false. |
| warranty_years | INTEGER | Extracted from bid or web-enriched. Standard parts warranty in years. Norms: 5-year (unregistered), 10-year (registered). Null when not mentioned. |
| compressor_warranty_years | INTEGER | Extracted from bid or web-enriched. Compressor-specific warranty, often longer than parts. Norms: 10-12 years. Null for furnaces, air handlers, or when not mentioned. |
| equipment_cost | DECIMAL(10,2) | Extracted from bid PDF ONLY — NEVER researched. Plain number (e.g., 4500.00). No "$", no commas. Null when bid doesn't itemize. NEVER web-search for equipment pricing. |
| confidence | confidence_level | Determined by AI. Values: 'high', 'medium', 'low', 'manual'. 'high' = brand + model found, specs verified. 'medium' = brand found, partial specs. 'low' = unable to verify. Be conservative — 'medium' is fine for most extractions. |

---

## bid_scope

> **V2 Note (Feb 2026):** The `bid_scope` table now has **69 columns** — the original 43 scope
> columns plus 26 columns migrated from the old `bids` table (pricing, payment terms, warranty,
> timeline, extraction metadata). This is the primary table for ALL extracted bid data.

| Column | Type | Description for MindPal |
|--------|------|------------------------|
| id | UUID | Set by database. Do NOT include in MindPal output. |
| bid_id | UUID | Set by Code Node. Do NOT include in MindPal agent output. One scope record per bid. |
| created_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |
| updated_at | TIMESTAMPTZ | Set by database trigger. Do NOT include in MindPal output. |
| **— System Type —** | | |
| system_type | TEXT | AI-determined from bid PDF. Values: 'heat_pump', 'furnace_ac', 'mini_split', 'hybrid', 'boiler', 'other'. "Dual fuel" = 'hybrid'. Ductless heat pump = 'mini_split'. Drives Equipment tab layout. |
| **— Pricing (10 columns) —** | | |
| total_bid_amount | DECIMAL(10,2) | Extracted from bid PDF. REQUIRED. Total price as number without currency symbols (e.g., 18500.00). Bottom line before rebates. If multiple options, extract the one matching quoted equipment and note in extraction_notes. |
| labor_cost | DECIMAL(10,2) | Extracted from bid PDF. Labor portion if broken out separately. Do not estimate if not itemized. Null when not itemized. |
| equipment_cost | DECIMAL(10,2) | Extracted from bid PDF ONLY. Bid-stated equipment cost. NEVER use web-researched pricing. Equipment Researcher finds retail prices for bid_equipment, not here. Null when not itemized. |
| materials_cost | DECIMAL(10,2) | Extracted from bid PDF. Materials (line sets, refrigerant, fittings) if broken out. Null when not itemized. |
| permit_cost | DECIMAL(10,2) | Extracted from bid PDF. Permit fees if itemized. May combine building and electrical permits. Null when not itemized. |
| disposal_cost | DECIMAL(10,2) | Extracted from bid PDF. Old equipment removal/disposal cost if itemized. Null when not itemized. |
| electrical_cost | DECIMAL(10,2) | Extracted from bid PDF. Electrical work cost if itemized separately. Null when not itemized or not applicable. |
| total_before_rebates | DECIMAL(10,2) | Extracted from bid or AI-calculated. Pre-incentive total. Often equals total_bid_amount. If bid shows "before rebates" separately, use that. |
| estimated_rebates | DECIMAL(10,2) | Extracted from bid PDF. Contractor's estimated rebates/incentives. Separate from Incentive Finder's independent research. Null when bid doesn't mention rebates. |
| total_after_rebates | DECIMAL(10,2) | Extracted from bid or AI-calculated. Net cost after rebates: total_before_rebates minus estimated_rebates. Null when no rebates estimated. |
| **— Payment Terms (5 columns) —** | | |
| deposit_required | DECIMAL(10,2) | Extracted from bid PDF. Dollar amount of deposit. If only percentage given, calculate from total_bid_amount. Null when not mentioned. |
| deposit_percentage | DECIMAL(5,2) | Extracted from bid PDF. Deposit as percentage (e.g., 20.00 = 20%). If only dollar amount, calculate from total. Null when not mentioned. |
| payment_schedule | TEXT | Extracted from bid PDF. Payment milestone schedule (e.g., "20% deposit, 30% at rough-in, 50% at completion"). Null when not described. |
| financing_offered | BOOLEAN | Extracted from bid PDF. true = financing options mentioned. false = explicitly no financing. null = not mentioned. |
| financing_terms | TEXT | Extracted from bid PDF. Terms if offered (e.g., "0% APR for 18 months through GreenSky"). Only populate if financing_offered = true. |
| **— Warranty (4 columns) —** | | |
| labor_warranty_years | INTEGER | Extracted from bid PDF. Installer's labor warranty in years. Separate from equipment warranty (manufacturer). Do not confuse with equipment or compressor warranty. |
| equipment_warranty_years | INTEGER | Extracted from bid PDF. Manufacturer's equipment warranty in years. Typically 5-10 years. Null when not specified. |
| compressor_warranty_years | INTEGER | Extracted from bid PDF. Compressor-specific warranty if stated separately and longer than equipment warranty. If not stated separately, null (don't copy equipment_warranty_years). |
| additional_warranty_details | TEXT | Extracted from bid PDF. Extended warranty options, lifetime heat exchanger warranty, conditions, registration requirements. Null when no additional details. |
| **— Timeline (4 columns) —** | | |
| estimated_days | INTEGER | Extracted from bid PDF. Installation days. If range ("1-2 days"), use upper bound. Null when not specified. |
| start_date_available | DATE | Extracted from bid PDF. YYYY-MM-DD. Must be specific date, not relative. If "2-3 weeks", leave null. |
| bid_date | DATE | Extracted from bid PDF. YYYY-MM-DD. Date the proposal was issued. Null when no date found. |
| valid_until | DATE | Extracted from bid PDF. YYYY-MM-DD. Expiration date. If stated as duration ("30 days"), calculate from bid_date. Null when not mentioned. |
| **— Extraction Metadata (2 columns) —** | | |
| extraction_confidence | confidence_level | AI-determined. Values: 'high', 'medium', 'low', 'manual'. high = clear PDF, all fields found. medium = some fields unclear. low = poor scan, gaps. Thresholds: ≥90% = high, ≥70% = medium, <70% = low. |
| extraction_notes | TEXT | AI-determined. Notes about extraction quality, issues, assumptions, ambiguities. Null when clean extraction. |
| **— Original Scope Columns (43 columns) —** | | |
| summary | TEXT | Determined by AI. 2-4 sentence overview of the full scope: what's being installed, major work included, notable exclusions. Written for homeowner audience. Null when bid has no discernible scope. |
| inclusions | TEXT[] | Extracted from bid PDF. Array of short phrases (e.g., "Permit and inspections", "Disposal of old system"). Items should not duplicate the 12 boolean scope fields. Use empty array [] rather than null. |
| exclusions | TEXT[] | Extracted from bid PDF. Array of short phrases (e.g., "Ductwork modifications", "Electrical panel upgrade"). Critical for cross-bid comparison. Use empty array [] rather than null. |
| permit_included | BOOLEAN | Extracted from bid PDF. Boolean rules: true = explicitly included, false = explicitly excluded, null = not mentioned. This is the general building permit — separate from electrical_permit_included. |
| permit_detail | TEXT | Extracted from bid PDF. Additional context about permit. Only populate if bid provides detail beyond yes/no. Null when no additional detail or permit_included is null. |
| disposal_included | BOOLEAN | Extracted from bid PDF. true = includes removal/disposal of existing HVAC equipment. false = homeowner arranges. null = not mentioned. |
| disposal_detail | TEXT | Extracted from bid PDF. Details like "Haul away and recycle old AC unit and furnace". Null when no detail or disposal_included is null. |
| electrical_included | BOOLEAN | Extracted from bid PDF. true = includes some electrical work. false = all electrical excluded. null = not mentioned. SAFETY-CRITICAL: missing triggers high-priority questions. |
| electrical_detail | TEXT | Extracted from bid PDF. Summary of electrical work described. Null when no detail or electrical_included is null. |
| ductwork_included | BOOLEAN | Extracted from bid PDF. true = includes ductwork modification/repair/replacement. false = excluded. null = not mentioned. |
| ductwork_detail | TEXT | Extracted from bid PDF. What ductwork work is described. Null when no detail or ductwork_included is null. |
| thermostat_included | BOOLEAN | Extracted from bid PDF. true = includes new thermostat. false = excluded/"homeowner to provide". null = not mentioned. Thermostat is an accessory — goes here, NOT in bid_equipment. |
| thermostat_detail | TEXT | Extracted from bid PDF. Brand and model if specified (e.g., "Ecobee Smart Thermostat Premium"). Null when not identified or thermostat_included is null/false. |
| manual_j_included | BOOLEAN | Extracted from bid PDF. true = includes Manual J load calculation (ACCA-approved sizing). false = excluded. null = not mentioned. Important quality indicator. |
| manual_j_detail | TEXT | Extracted from bid PDF. Details about load calculation. Null when no detail or manual_j_included is null. |
| commissioning_included | BOOLEAN | Extracted from bid PDF. true = includes system startup/commissioning. false = excluded. null = not mentioned. Quality indicator. |
| commissioning_detail | TEXT | Extracted from bid PDF. What commissioning includes. Null when no detail or commissioning_included is null. |
| air_handler_included | BOOLEAN | Extracted from bid PDF. true = includes air handler replacement. false = reusing existing. null = not mentioned. Equipment details go in bid_equipment — this just tracks scope. |
| air_handler_detail | TEXT | Extracted from bid PDF. Details about air handler scope. Null when no detail or air_handler_included is null. |
| line_set_included | BOOLEAN | Extracted from bid PDF. true = includes new refrigerant line set. false = reusing existing. null = not mentioned. |
| line_set_detail | TEXT | Extracted from bid PDF. Details about line set. Null when no detail or line_set_included is null. |
| disconnect_included | BOOLEAN | Extracted from bid PDF. true = includes new outdoor electrical disconnect box. false = excluded. null = not mentioned. Required by code for outdoor HVAC. |
| disconnect_detail | TEXT | Extracted from bid PDF. Null when no detail or disconnect_included is null. |
| pad_included | BOOLEAN | Extracted from bid PDF. true = includes new equipment pad. false = excluded/reusing. null = not mentioned. |
| pad_detail | TEXT | Extracted from bid PDF. Null when no detail or pad_included is null. |
| drain_line_included | BOOLEAN | Extracted from bid PDF. true = includes new condensate drain line. false = excluded. null = not mentioned. |
| drain_line_detail | TEXT | Extracted from bid PDF. Null when no detail or drain_line_included is null. |
| panel_assessment_included | BOOLEAN | Extracted from bid PDF. true = includes electrical panel assessment. false = excluded. null = not mentioned. SAFETY-CRITICAL: missing triggers high-priority question. |
| panel_upgrade_included | BOOLEAN | Extracted from bid PDF. true = includes panel upgrade (e.g., 100A to 200A). false = excluded/"if needed, additional cost". null = not mentioned. |
| dedicated_circuit_included | BOOLEAN | Extracted from bid PDF. true = includes new dedicated circuit. false = excluded. null = not mentioned. Heat pumps typically require dedicated 240V circuit. |
| electrical_permit_included | BOOLEAN | Extracted from bid PDF. true = includes separate electrical permit. false = excluded. null = not mentioned. SEPARATE from permit_included (general building permit). |
| load_calculation_included | BOOLEAN | Extracted from bid PDF. true = includes electrical load calculation for panel capacity. false = excluded. null = not mentioned. Different from manual_j_included (HVAC sizing). |
| existing_panel_amps | INTEGER | Extracted from bid PDF. Common values: 100, 125, 150, 200, 225, 320, 400. SAFETY-CRITICAL for heat pump installations. Null when not mentioned. |
| proposed_panel_amps | INTEGER | Extracted from bid PDF. Common values: 200, 225, 320, 400. Only populate if panel_upgrade_included = true. Null when no upgrade proposed or size not mentioned. |
| breaker_size_required | INTEGER | Extracted from bid or equipment MCA specs. Common values: 20, 25, 30, 40, 50, 60. Often derived from equipment MCA. Null when not specified. |
| panel_upgrade_cost | DECIMAL(10,2) | Extracted from bid PDF ONLY — NEVER researched. Plain number (e.g., 2500.00). Null when no upgrade proposed or cost not itemized. |
| electrical_notes | TEXT | Extracted from bid PDF. Additional electrical info not captured in structured fields. Null when no additional notes. |
| accessories | JSONB | Extracted from bid PDF. Array of objects: {"type": "thermostat|surge_protector|uv_light|filter|wifi_adapter|other", "name": "string", "brand": "string or null", "model_number": "string or null", "description": "string or null", "cost": number or null}. Non-major items — NOT in bid_equipment. Use empty array [] not null. |
| line_items | JSONB | Extracted from bid PDF. Array of objects: {"item_type": "equipment|labor|material|permit|disposal|other", "description": "string", "amount": number or null, "quantity": number or null, "unit_price": number or null, "is_included": boolean, "notes": "string or null"}. Itemized breakdown from bid. Use empty array [] if bid doesn't itemize. |

---

## bid_contractors

| Column | Type | Description for MindPal |
|--------|------|------------------------|
| id | UUID | Set by database. Do NOT include in MindPal output. |
| bid_id | UUID | Set by database. Do NOT include in MindPal output. UNIQUE — one contractor record per bid. |
| created_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |
| updated_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |
| name | TEXT | Passed through from bid PDF extraction. REQUIRED. Must EXACTLY match the contractor name from upstream bid extraction — do not alter case, spelling, or formatting. Display name used across UI. |
| company | TEXT | Bid PDF or web research. Legal entity name when different from display name (e.g., name="ABC Heating", company="ABC Heating & Cooling LLC"). Null when same as display name or not found. |
| contact_name | TEXT | Bid PDF or web research. Full name of primary contact person or owner. Null when not found. |
| address | TEXT | Web research (Google Business Profile, BBB, website). Full street address with city/state/zip. Null when not found. |
| phone | TEXT | Bid PDF or web research. Business phone, e.g., "(555) 123-4567". Null when not found. |
| email | TEXT | Bid PDF or web research. Business email address. Null when not found. |
| website | TEXT | Bid PDF or web research. Full URL with protocol (e.g., "https://abcheating.com"). If website returns 404, still store URL but note in research_notes. Null when not found. |
| license | TEXT | Bid PDF or state licensing board (web research). Exact license number (e.g., "EC.0042391"). If board shows different number from bid, use board's number and note discrepancy. Null when not found. |
| license_state | TEXT | Bid PDF or web research. 2-letter state abbreviation (e.g., "CO", "CA"). Null when unknown. |
| license_status | TEXT | State licensing board (web research). Values: 'Active', 'Inactive', 'Expired' — exactly these only. Must come from verified board lookup. Null when lookup returned no results. Never use "Suspended", "Pending", "Valid". |
| license_expiration_date | DATE | State licensing board (web research). YYYY-MM-DD format. Null when not found on board. |
| insurance_verified | BOOLEAN | Web research. true = confirmed insured. false = confirmed NOT insured (rare). null = unknown. Do NOT set false when simply not mentioned — use null. |
| bonded | BOOLEAN | Web research. true = bonding confirmed. null = unknown. Bonding = surety bond protecting homeowner. Null when not mentioned. |
| years_in_business | INTEGER | Web research (Google Business Profile, website). Integer, e.g., 15. Can calculate from year_established. Null when not found. |
| year_established | INTEGER | Web research. 4-digit year (e.g., 2008). Null when not found. |
| total_installs | INTEGER | Web research. Heat pump-specific installs only if explicitly stated on website. Do NOT estimate. Null when not explicitly stated (almost always null). |
| certifications | TEXT[] | Web research (contractor website, manufacturer dealer locators). Array of strings: "NATE Certified", "EPA 608", "Carrier Factory Authorized Dealer", etc. Empty array [] if none found — not null. |
| employee_count | INTEGER | Web research. Must be INTEGER, not string range. If website gives "10-25", use lower bound or midpoint and note in research_notes. Null when not found. Never use strings like "10-25". |
| service_area | TEXT | Web research. Plain description (e.g., "Greater Atlanta Metro — Fulton, DeKalb, Gwinnett counties"). Null when not found. |
| google_rating | DECIMAL(3,2) | Web research (Google Business Profile). Range 0.00–5.00 (e.g., 4.70). Must be decimal, not string. Null when no Google Business Profile found. |
| google_review_count | INTEGER | Web research (Google Business Profile). Total reviews. Pair with google_rating — both present or both null. |
| yelp_rating | DECIMAL(3,2) | Web research (Yelp). Range 0.00–5.00. Must be decimal. Null when no Yelp listing. |
| yelp_review_count | INTEGER | Web research (Yelp). Pair with yelp_rating — both present or both null. |
| bbb_rating | TEXT | Web research (bbb.org). Letter grade only: 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C', 'F'. If BBB shows "No Rating", use null. BBB rating is a LETTER — not numeric stars. |
| bbb_accredited | BOOLEAN | Web research (bbb.org). true = BBB Accredited Business. false = has listing but NOT accredited. null = no listing. A+ rating does NOT mean accredited — separate concepts. |
| bbb_complaints_3yr | INTEGER | Web research (bbb.org). Number of complaints in last 3 years. Use 0 only if BBB shows zero. Null when no listing. |
| research_confidence | INTEGER | AI-determined (self-assessed). Range 0–100. Scale: 90-100 = all sources found. 70-89 = Google+Yelp found, missing BBB or license. 40-69 = 1-2 sources. 0-39 = timeout/minimal. Should always have a value. |
| verification_date | DATE | AI-determined. Set to today's date when research is performed. YYYY-MM-DD. Should always have a value. |
| research_notes | TEXT | AI-determined. Narrative of all searches performed, sources found/not found, timeouts, data gaps. Must document source for every non-null field. Include search queries used. Should always have a value. |

---

## bids

> **V2 Note (Feb 2026):** The `bids` table is now an 18-column identity stub. All extracted data
> (pricing, warranty, payment terms, timeline, extraction metadata) has been moved to `bid_scope`.
> The bid row is **pre-created at PDF upload time** — MindPal receives the `bid_id` and UPDATEs
> the existing row instead of INSERTing a new one.

| Column | Type | Description for MindPal |
|--------|------|------------------------|
| id | UUID | Pre-created at upload. Passed to MindPal as `bid_id`. Do NOT generate a new one. |
| project_id | UUID | Set at upload time. Do NOT include in MindPal output. |
| pdf_upload_id | UUID | Set at upload time. Do NOT include in MindPal output. |
| created_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |
| updated_at | TIMESTAMPTZ | Set by database trigger. Do NOT include in MindPal output. |
| contractor_name | TEXT | Extracted from bid PDF. REQUIRED. Company name as it appears on the bid. Must match bid_contractors.name exactly. Denormalized for fast sort/display. |
| status | TEXT | Set by edge function. Values: 'pending', 'processing', 'completed', 'failed'. MindPal does NOT set this directly — the callback edge function manages status transitions. |
| request_id | TEXT | Set at upload time. Batch correlation ID linking all bids in one analysis run. Do NOT include in MindPal output. |
| storage_key | TEXT | Set at upload time. Supabase Storage path to the PDF file. Do NOT include in MindPal output. |
| storage_bucket | TEXT | Set at upload time. Supabase Storage bucket name. Do NOT include in MindPal output. |
| original_filename | TEXT | Set at upload time. Original PDF filename. Do NOT include in MindPal output. |
| file_size_bytes | INTEGER | Set at upload time. PDF file size. Do NOT include in MindPal output. |
| mime_type | TEXT | Set at upload time. Always 'application/pdf'. Do NOT include in MindPal output. |
| processing_attempts | INTEGER | Set by edge function. Counter incremented on each analysis attempt. Do NOT include in MindPal output. |
| processing_started_at | TIMESTAMPTZ | Set by edge function when analysis begins. Do NOT include in MindPal output. |
| processing_completed_at | TIMESTAMPTZ | Set by edge function when callback received. Do NOT include in MindPal output. |
| error_message | TEXT | Set by edge function on failure. Do NOT include in MindPal output. |
| verified_by_user | BOOLEAN | Frontend (user action). Not populated by MindPal. |

---

## bid_scores

| Column | Type | Description for MindPal |
|--------|------|------------------------|
| id | UUID | Set by database. Do NOT include in MindPal output. |
| bid_id | UUID | Set by database. Do NOT include in MindPal output. UNIQUE — one score record per bid. |
| created_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |
| updated_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |
| overall_score | DECIMAL(5,2) | AI-determined (Scoring Engine). Weighted composite 0.00–100.00. Weights from user_priorities. Primary ranking metric. Null when insufficient data. |
| value_score | DECIMAL(5,2) | AI-determined (Scoring Engine). Quality-to-price ratio 0.00–100.00. High = good equipment/warranty relative to cost. Null when insufficient pricing or equipment data. |
| quality_score | DECIMAL(5,2) | AI-determined (Scoring Engine). Pure quality assessment 0.00–100.00 ignoring price. Factors: brand/tier, efficiency, warranty, certifications, scope completeness, Manual J. Null when insufficient quality indicators. |
| completeness_score | DECIMAL(5,2) | AI-determined (Scoring Engine). Data completeness 0.00–100.00. Counts expected fields found. A sparse bid scores low. Should always have a value. |
| score_confidence | DECIMAL(5,2) | AI-determined (Scoring Engine self-assessment). 0.00–100.00. Higher when all upstream data complete and verified. Should always have a value. |
| scoring_notes | TEXT | AI-determined (Scoring Engine). Human-readable scoring explanation referencing specific strengths, weaknesses, and how user priorities influenced the score. Null when engine fails to generate. |
| ranking_recommendation | TEXT | AI-determined (Scoring Engine). Values: 'excellent', 'good', 'fair', 'poor'. Generally: excellent = 85+, good = 70-84, fair = 50-69, poor = <50. Null when cannot determine. |
| red_flags | JSONB | AI-determined (Scoring Engine). Array: {"issue": "string", "severity": "high|medium|low", "detail": "string"}. Use empty array [] if none — not null. Only Scoring Engine outputs red_flags, NOT Contractor Researcher. |
| positive_indicators | JSONB | AI-determined (Scoring Engine). Array: {"indicator": "string", "detail": "string"}. Use empty array [] if none — not null. Only Scoring Engine outputs this, NOT Contractor Researcher. |

---

## project_incentives

| Column | Type | Description for MindPal |
|--------|------|------------------------|
| id | UUID | Set by database. Do NOT include in MindPal output. |
| project_id | UUID | Set by database/middleware. Do NOT include in MindPal output. |
| created_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |
| updated_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |
| source | TEXT | AI-determined (Incentive Finder). REQUIRED. Values: 'database_match', 'ai_discovered', 'user_added'. MindPal should use 'database_match' or 'ai_discovered'. |
| incentive_database_id | UUID | AI-determined/database. FK to incentive_program_database. Set when source = 'database_match'. Null when source = 'ai_discovered' or 'user_added'. |
| program_name | TEXT | Web research or incentive_program_database. REQUIRED. Official program name (e.g., "Federal 25C Tax Credit", "HEEHRA Heat Pump Rebate"). Use official name, not paraphrase. |
| program_type | TEXT | AI-determined or database. REQUIRED. Values: 'federal', 'state', 'utility', 'manufacturer', 'tax_credit'. Federal 25C is 'tax_credit', NOT 'federal'. HEEHRA is 'federal'. |
| amount_min | DECIMAL(12,2) | Web research or database. Minimum possible amount. For fixed rebates, amount_min = amount_max. Null when unknown. |
| amount_max | DECIMAL(12,2) | Web research or database. Maximum possible amount or cap. For fixed rebates, equals amount_min. For "30% up to $2,000" → amount_max = 2000.00. Null when unknown. |
| amount_description | TEXT | AI-determined or web research. Human-readable (e.g., "30% of cost up to $2,000"). For frontend display. Null when unclear. |
| equipment_types_eligible | TEXT[] | Web research or database. Array of system types: 'heat_pump', 'mini_split', etc. Uses same values as bids.system_type. Empty array [] if all eligible. |
| eligibility_requirements | TEXT | Web research or database. Narrative of requirements (e.g., "Must meet ENERGY STAR criteria. SEER2 ≥ 16.0"). Null when no specific requirements beyond equipment type. |
| income_qualified | BOOLEAN | Web research or database. true = has income-based eligibility (e.g., HEEHRA tiers). false = no income requirements (e.g., 25C). Critical for HEEHRA. |
| income_limits | TEXT | Web research or database. Income threshold details if income_qualified = true. Null when income_qualified = false or limits unknown. |
| application_process | TEXT | Web research or database. How to apply (e.g., "File with annual tax return using IRS Form 5695"). Null when not documented. |
| application_url | TEXT | Web research. Direct URL to application. Must be verified, working URL. Null when not found. |
| verification_source | TEXT | Web research. URL used to verify this incentive. Audit trail. Null when matched from database. |
| can_stack | BOOLEAN | AI-determined or database. true = can combine with other incentives. false = exclusive. Most programs can stack. Null when unknown. |
| stacking_notes | TEXT | AI-determined or web research. Stacking limitations. Null when no restrictions or unknown. |
| still_active | BOOLEAN | Web research or database. true = currently accepting applications. false = ended/expired. Verify via web search. Should always have a value. |
| confidence | TEXT | AI-determined (Incentive Finder). Values: 'high', 'medium', 'low'. 'high' = verified from authoritative source. 'medium' = likely applicable but amounts uncertain. 'low' = may or may not apply. |
| user_plans_to_apply | BOOLEAN | Frontend (user action). Not populated by MindPal. |
| application_status | TEXT | Frontend (user action). Not populated by MindPal. Values: 'not_applied', 'applied', 'approved', 'received'. |
| applied_amount | DECIMAL(12,2) | Frontend (user action). Not populated by MindPal. |

---

## contractor_questions

| Column | Type | Description for MindPal |
|--------|------|------------------------|
| id | UUID | Set by database. Do NOT include in MindPal output. |
| bid_id | UUID | Set by database/middleware. Do NOT include in MindPal output. Multiple questions per bid. |
| question_text | TEXT | AI-determined (Question Generator). REQUIRED. The actual question for the homeowner to ask. Must be specific, actionable, and conversational — not a generic template. |
| question_category | TEXT | AI-determined (Question Generator). Values: 'pricing', 'warranty', 'equipment', 'timeline', 'scope', 'credentials', 'electrical'. All 7 categories from v8 spec — especially 'electrical'. |
| category | TEXT | AI-determined (Question Generator). Parallel field for MindPal compatibility. Should match question_category. Set both to the same value. |
| priority | TEXT | AI-determined (Question Generator). Values: 'high', 'medium', 'low'. 'high' = safety-critical or major cost impact. Electrical category defaults to 'high'. |
| context | TEXT | AI-determined (Question Generator). 1-2 sentences explaining why this question matters. Educational, non-technical, for homeowner audience. Null when self-evident. |
| triggered_by | TEXT | AI-determined (Question Generator). What specific finding triggered this question (e.g., "Bid does not mention electrical panel capacity"). Null for general best-practice questions. |
| good_answer_looks_like | TEXT | AI-determined (Question Generator). Example of a trustworthy contractor answer. Helps homeowner evaluate response. Should always have a value for high/medium priority. |
| concerning_answer_looks_like | TEXT | AI-determined (Question Generator). Red flag answers to watch for (e.g., vague "we'll figure it out"). Should always have a value for high/medium priority. |
| missing_field | TEXT | AI-determined (Question Generator). Database column name that was null and triggered this question (e.g., "bid_scope.existing_panel_amps"). Null when not triggered by specific field. |
| generation_notes | TEXT | AI-determined (Question Generator). Internal notes for debugging. Not shown to user. Null when no special notes. |
| auto_generated | BOOLEAN | AI-determined. true = generated by MindPal (always set to true). false = user-added. |
| is_answered | BOOLEAN | Frontend (user action). Not populated by MindPal. Default false. |
| answer_text | TEXT | Frontend (user action). Not populated by MindPal. |
| answered_at | TIMESTAMPTZ | Frontend (user action). Not populated by MindPal. |
| display_order | INTEGER | AI-determined (Question Generator). 1-indexed. High-priority questions first. Electrical near the top. Null for default ordering. |
| created_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |

---

## bid_faqs

| Column | Type | Description for MindPal |
|--------|------|------------------------|
| id | UUID | Set by database. Do NOT include in MindPal output. |
| bid_id | UUID | Set by database/middleware. Do NOT include in MindPal output. Multiple FAQs per bid. |
| question | TEXT | AI-determined (Per-Bid FAQ Generator). REQUIRED. Question a homeowner might ask about this specific bid. Conversational, bid-specific. |
| answer | TEXT | AI-determined (Per-Bid FAQ Generator). REQUIRED. 2-4 sentences. Clear, factual answer referencing specific bid values. Avoid speculation. Plain language for homeowners. |
| category | TEXT | AI-determined (Per-Bid FAQ Generator). Values: 'pricing', 'warranty', 'equipment', 'scope', 'contractor', 'timeline'. Should always have a value. |
| answer_confidence | TEXT | AI-determined (Per-Bid FAQ Generator). Values: 'high', 'medium', 'low'. 'high' = based on explicit bid data. 'medium' = partial data. 'low' = limited information. Should always have a value. |
| sources | TEXT[] | AI-determined (Per-Bid FAQ Generator). Array of source references (e.g., ['bid_document', 'bid_equipment']). Null for general knowledge. |
| display_order | INTEGER | AI-determined (Per-Bid FAQ Generator). 1-indexed. Most important questions first. Null for default ordering. |
| created_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |
| updated_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |

---

## project_faqs

| Column | Type | Description for MindPal |
|--------|------|------------------------|
| id | UUID | Set by database. Do NOT include in MindPal output. |
| project_id | UUID | Set by database/middleware. Do NOT include in MindPal output. |
| question | TEXT | AI-determined (Overall FAQ Generator). REQUIRED. Cross-bid comparison question (e.g., "Which bid offers the best warranty coverage?"). Project-level, not bid-specific. |
| answer | TEXT | AI-determined (Overall FAQ Generator). REQUIRED. 2-5 sentences. Comparison answer referencing multiple bids by contractor name. Balanced, factual, with specific data points. |
| category | TEXT | AI-determined (Overall FAQ Generator). Values: 'comparison', 'recommendation', 'general', 'incentives'. 'comparison' = bid-vs-bid. 'recommendation' = which to choose. 'general' = HVAC guidance. 'incentives' = rebate comparison. |
| sources | TEXT[] | AI-determined (Overall FAQ Generator). Array of data source references. Null for general knowledge. |
| display_order | INTEGER | AI-determined (Overall FAQ Generator). 1-indexed. Recommendation first, then comparison, then general. Null for default. |
| created_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |

---

## incentive_program_database

| Column | Type | Description for MindPal |
|--------|------|------------------------|
| id | UUID | Set by database. Do NOT include in MindPal output. |
| program_name | TEXT | Web research or seed data. REQUIRED. Official program name (e.g., "Federal Energy Efficient Home Improvement Credit (25C)"). Full official name, not abbreviations. |
| program_code | TEXT | Seed data or admin. UPPER_SNAKE_CASE (e.g., "FED_25C", "FED_HEEHR"). UNIQUE. Convention: PREFIX_SHORTNAME. Null for AI-discovered programs not yet coded. |
| description | TEXT | Web research or seed data. 1-3 sentence description of what program offers. Null when not yet written. |
| program_type | TEXT | Web research or seed data. Values: 'federal', 'state', 'utility', 'manufacturer'. Note: this table doesn't use 'tax_credit' (that's project_incentives only). Null when unclear. |
| available_states | TEXT[] | Web research or seed data. Array of 2-letter state codes (e.g., ['CA', 'OR']). Null when available_nationwide = true. GIN-indexed. |
| available_zip_codes | TEXT[] | Web research or seed data. ZIP codes or 3-digit prefixes for utility programs. Null when statewide or nationwide. |
| available_utilities | TEXT[] | Web research or seed data. Utility company names (e.g., ['PG&E', 'SCE']). Only for program_type = 'utility'. Null otherwise. |
| available_nationwide | BOOLEAN | Web research or seed data. true = all 50 states (federal programs). false = geographically limited. Should always have a value. |
| rebate_amount | DECIMAL(10,2) | Web research or seed data. Fixed dollar amount. For variable programs, use max amount. Null when percentage-based. |
| rebate_percentage | DECIMAL(5,2) | Web research or seed data. Percentage of eligible costs (e.g., 30.00 = 30%). Used with max_rebate. Null when fixed amount. |
| max_rebate | DECIMAL(10,2) | Web research or seed data. Cap on percentage-based rebates (e.g., $2,000 for 25C). Null when no cap or fixed amounts. |
| requirements | JSONB | Web research or seed data. Object with technical requirements: {"min_seer2": 16.0, "energy_star": true}. Keys match bid_equipment columns. Null when purely narrative. |
| income_qualified | BOOLEAN | Web research or seed data. true = income-based eligibility (HEEHRA). false = available regardless (25C). Should always have a value. |
| income_limits | JSONB | Web research or seed data. Object with income tiers: {"low_income_pct_ami": 80, "moderate_income_pct_ami": 150}. Only when income_qualified = true. |
| valid_from | DATE | Web research or seed data. YYYY-MM-DD. Program start date. Null when unknown. |
| valid_until | DATE | Web research or seed data. YYYY-MM-DD. Expiration date. For 25C: 2032-12-31. Null for "until funds exhausted". |
| application_url | TEXT | Web research or seed data. Direct link to application. Must be verified, authoritative. Null when not documented. |
| application_process | TEXT | Web research or seed data. Summary of how to apply. For tax credits: "File with annual tax return using IRS Form 5695". Null when not documented. |
| typical_processing_days | INTEGER | Web research or seed data. Days from application to receiving rebate. Null when unknown. |
| stackable | BOOLEAN | Web research or seed data. true = can combine. false = exclusive. Should always have a value (default true). |
| cannot_stack_with | TEXT[] | Web research or seed data. Array of program_code values that conflict. Null when no conflicts. |
| is_active | BOOLEAN | Web research or admin. true = accepting applications. false = expired/discontinued. MindPal only queries active. Should always have a value. |
| last_verified | DATE | Admin or MindPal. YYYY-MM-DD. Date details were last verified. >90 days = stale. Null when never verified. |
| discovered_by | TEXT | System-determined. Values: 'seed', 'mindpal', 'admin'. Tracks provenance of each record. |
| discovery_source_url | TEXT | Web research or MindPal. URL where program was first discovered. Null for seed or admin-added. |
| created_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |
| updated_at | TIMESTAMPTZ | Set by database. Do NOT include in MindPal output. |
