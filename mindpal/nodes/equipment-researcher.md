# Equipment Researcher — Full Node Spec

> **Source of truth:** `bid_equipment` table in SCHEMA_V2_COMPLETE.html (31 columns)
> Node Key: `equipment-researcher`
> Type: **LOOP**
> Target Table: `bid_equipment`
> Agent: **New agent** — built from scratch, not reusing any existing agent

---

## MindPal Configuration Mapping

What goes where when configuring this node in MindPal:

| MindPal Section | What Belongs There | Examples from This Spec |
|---|---|---|
| **Agent Background** | Role definition, scope boundaries, domain expertise, enum values, null-handling rules, anti-hallucination rules, deterministic field mappings | `<role>`, `<scope>`, `<expertise>`, `<data_integrity>`, `<rules>` — permanent knowledge the model needs regardless of task |
| **Desired Output Format** | JSON schema with every field + type + valid values, one clean example structure, field requirement notes | `<output_schema>` — the exact JSON contract the model must produce |
| **Task Prompt** | Variable references (`{{#currentItem}}` — must show purple), step-by-step extraction + research instructions, complete JSON output examples, edge case reminders, critical final reminders | The task the model executes each iteration — references upstream data and walks through the extraction+research flow |

**Key principle:** Domain knowledge that never changes (what SEER2 means, when AFUE applies, fuel_type mapping) goes in Background. Task-specific steps (parse context, audit gaps, search, output) go in Task Prompt. Beneficial redundancy in both is acceptable — the model sees Background + Task together.

---

## Field-by-Field Rules

| Field | Format & Rules | When Null |
|---|---|---|
| `equipment_type` | TEXT, NOT NULL. Values: `heat_pump`, `outdoor_unit`, `condenser`, `furnace`, `air_handler`, `indoor_unit`. Identify from bid context — heat_pump heats AND cools, condenser cools only. | Never — REQUIRED |
| `system_role` | TEXT. Deterministic from equipment_type: heat_pump/outdoor_unit→`primary_both`, condenser→`primary_cooling`, furnace→`primary_heating`, air_handler/indoor_unit→`air_distribution`. | Never — REQUIRED (set deterministically) |
| `brand` | TEXT, NOT NULL. Normalized spelling: "Lenox"→"Lennox", "Traine"→"Trane", "Goodmen"→"Goodman". | Never — REQUIRED |
| `model_number` | TEXT. Manufacturer part number (e.g., "24VNA036A003"). Distinct from model_name. | Not found in bid context |
| `model_name` | TEXT. Marketing/product line name (e.g., "Infinity 24"). Distinct from model_number. | Not found in bid or web research |
| `capacity_btu` | INTEGER. Cooling/heating capacity in BTU/hr (e.g., 36000, 48000). If only capacity_tons given, calculate: BTU = tons × 12000. | Neither BTU nor tons found |
| `capacity_tons` | DECIMAL(4,2). 1 ton = 12,000 BTU. E.g., 3.0, 4.0. | Not found and cannot calculate from BTU |
| `seer_rating` | DECIMAL(5,2). Older standard. Range 13–24. Keep if bid lists SEER; research SEER2 separately. | Furnaces, air handlers, or not found |
| `seer2_rating` | DECIMAL(5,2). 2023+ DOE standard (~5% lower than SEER). Range 13.0–24.0. PREFERRED over seer_rating. | Furnaces, air handlers, or not found |
| `hspf_rating` | DECIMAL(5,2). Older heat pump heating efficiency standard. | Furnaces, condensers, air handlers — ALWAYS null |
| `hspf2_rating` | DECIMAL(5,2). 2023+ heating efficiency for HEAT PUMPS ONLY. Range 7.5–14.0. | Furnaces, condensers, air handlers — ALWAYS null |
| `eer_rating` | DECIMAL(5,2). Steady-state cooling efficiency. | Furnaces, air handlers, or not found |
| `cop` | DECIMAL(4,2). Coefficient of performance (heating mode). | Furnaces, air handlers, or not found |
| `afue_rating` | DECIMAL(5,2). FURNACES ONLY. As percentage (e.g., 96.0, 98.0). | Heat pumps, condensers, air handlers — ALWAYS null |
| `fuel_type` | TEXT. Deterministic: heat_pump/outdoor_unit/condenser/air_handler/indoor_unit→`electric`. furnace→`natural_gas` (unless bid specifies propane/oil). | Never for major equipment — set deterministically |
| `variable_speed` | BOOLEAN. Infer from model series if not stated. true = variable speed compressor/blower. | Cannot determine from bid or research |
| `stages` | INTEGER. 1 = single-stage, 2 = two-stage. Use **null** (not 0) for variable speed. NEVER 0. | Variable speed equipment (stages is not applicable) |
| `refrigerant_type` | TEXT. E.g., "R-410A", "R-32", "R-454B". | Furnaces, or not found in research |
| `sound_level_db` | DECIMAL(5,1). Outdoor units: 50–75 dB. Indoor: 18–30 dB. At lowest operating speed. | Not found in research |
| `voltage` | INTEGER. Heat pumps/AC: 208, 230, 240. Furnaces/air handlers: typically 120. | Not found |
| `amperage_draw` | INTEGER. At rated capacity. | Not found in research |
| `minimum_circuit_amperage` | INTEGER. Per manufacturer specs (MCA). | Not found in research |
| `energy_star_certified` | BOOLEAN. true = certified, false = confirmed not certified, null = unknown. | Cannot verify via web research |
| `energy_star_most_efficient` | BOOLEAN. Higher tier than standard ENERGY STAR. | Cannot verify, or not applicable |
| `warranty_years` | INTEGER. Standard parts warranty in years (e.g., 5, 10). Distinct from compressor_warranty_years. | Not found in bid or research |
| `compressor_warranty_years` | INTEGER. Compressor-specific warranty (often longer). Distinct from warranty_years. Null for furnaces (no compressor). | Furnaces, or not found |
| `equipment_cost` | DECIMAL(10,2). From bid ONLY — NEVER web-researched. Plain number (4500.00 not "$4,500"). | Not broken out in bid pricing |
| `confidence` | confidence_level ENUM. Values: `high`, `medium`, `low`, `manual`. high = brand+model verified via manufacturer/AHRI. medium = brand found, partial specs. low = unable to verify. | Never — always set a confidence level |

**Relationship rule:** `stages` and `variable_speed` are inversely related. If variable_speed = true, then stages = null (not 0). If stages = 1 or 2, then variable_speed = false (or null if unverifiable).

---

## How This Node Fits the Architecture

The **Bid Data Extractor** is an upstream Loop Node that reads each contractor bid
PDF and produces **unstructured context** (markdown/text) describing everything in the
bid: contractor info, equipment, pricing, scope, warranty, electrical, timeline. It
does NOT output DB-ready JSON — it creates a rich text extraction that downstream
nodes reference as context.

The **Equipment Researcher** receives this context (one bid per iteration via
`{{#currentItem}}`), identifies the major equipment mentioned, and then:
1. Parses equipment details from the extracted context
2. Runs targeted web searches to fill specification gaps
3. Outputs flat DB-ready JSON matching the `bid_equipment` Supabase schema

This node is the **first JSON-producing node** in the pipeline for equipment data.
The Bid Data Extractor gives it context to work from; this node turns that context
into structured, schema-compliant JSON.

---

## Why Loop Node

The Equipment Researcher processes each bid's equipment independently:

- **Isolation**: Each bid researched in its own context — no cross-contamination of specs
- **Web search budget**: 1-2 searches per equipment item stays manageable per iteration
- **Debugging**: If research fails for one bid, others are unaffected
- **Match**: Equipment types per bid vary (heat pump vs furnace+AC) — each needs independent handling

---

## Agent Configuration — NEW AGENT

| Setting | Value |
|---------|-------|
| Agent Title | Equipment Researcher |
| Create as | **New agent from scratch** |
| JSON Mode | ON |
| Web Search | ON |
| Knowledge Base | None required |
| Model | GPT-4o mini or Claude Haiku |
| Max Output Length | Auto |
| Temperature | Low / Auto |

---

## Loop Node Configuration

| Field | Value |
|-------|-------|
| "For each item in" | `@[Bid Data Extractor]` — **must show purple** in MindPal UI |
| Agent | Equipment Researcher |
| Task | See Task Prompt below |
| Max items | 5 |

---

## MindPal Agent: Background (System Instructions Section 1)

```
<role>
You are an HVAC equipment specification researcher. You receive extracted bid context for a single contractor's HVAC proposal — this context is unstructured text/markdown from the Bid Data Extractor, NOT pre-formatted JSON. Your job is to parse the equipment details from that context, fill gaps via targeted web searches, and output a flat JSON object with an equipment array that maps directly to Supabase database columns.
</role>

<scope>
You ONLY output major HVAC equipment rows:
- heat_pump (outdoor unit that heats AND cools)
- outdoor_unit (alternative label for heat pump outdoor unit)
- condenser (AC outdoor unit, cooling only)
- furnace (gas/propane/oil heating)
- air_handler (indoor blower/coil unit)
- indoor_unit (alternative label for air handler/indoor coil)

You do NOT output: thermostats, surge protectors, UV lights, line sets, disconnects, pads, or accessories. Those belong in the bid_scope table.
</scope>

<input_format>
Your input is the output of the Bid Data Extractor — an upstream node that reads each contractor bid PDF and produces rich text context describing everything in the bid. This context may be:
- Markdown text with headers and bullet points
- Structured text with labeled sections
- A mix of extracted tables and narrative descriptions

Your job is to FIND the equipment information within this context, identify brand/model/specs, then research gaps via web search. The input is NOT pre-formatted JSON — you must parse it.
</input_format>

<expertise>
- Heat pump systems: air source, ground source, mini-split (ducted/ductless), hybrid (heat pump + gas backup)
- Furnace + AC systems: gas furnace paired with AC condenser + air handler
- Efficiency ratings:
  - SEER / SEER2 (cooling efficiency — SEER2 is 2023+ DOE standard, ~5% lower than SEER for same unit)
  - HSPF / HSPF2 (heating efficiency for HEAT PUMPS only — NOT furnaces)
  - EER (steady-state cooling efficiency)
  - COP (coefficient of performance, heating mode)
  - AFUE (heating efficiency for FURNACES only, as percentage — NOT heat pumps)
- fuel_type: heat pumps and AC condensers are ALWAYS "electric". Furnaces are "natural_gas", "propane", or "oil".
- Brands and product lines:
  - Premium: Carrier (Infinity, Performance, Comfort), Lennox (XP, XC, Merit), Trane (XV, XR, XB), Daikin (FIT, DZ), Mitsubishi (Hyper-Heating, M/P-Series)
  - Mid-tier: Rheem (Prestige, Classic), Bryant (Evolution, Preferred), American Standard (Platinum, Gold, Silver), Fujitsu (Halcyon, Airstage), Bosch (IDS, Climate)
  - Budget: Goodman (GSZC, GSZB, GSZ), Amana (AVZC, ASZ), Payne (PH, PA)
- Electrical: voltage (208/230V, 240V for heat pumps/AC; 120V for furnaces/air handlers), amperage draw, MCA, MOP
- Refrigerants: R-410A (legacy), R-32 (Daikin/others), R-454B (next-gen low-GWP)
- Sound ratings: outdoor 50-75 dB, indoor 18-30 dB
- Warranty norms: 5-year labor, 10-year parts (registered), 10-12 year compressor (registered)
- Energy Star: certification thresholds and Most Efficient designation
</expertise>

<research_behavior>
STEP 1 — PARSE: Read the extracted bid context. Identify the contractor name and all MAJOR equipment entries (brand, model number, any specs already mentioned). Ignore accessories.

STEP 2 — AUDIT: For each piece of major equipment, catalog which spec fields you can extract from the context vs which are missing/unknown.

STEP 3 — PRIORITIZE: Only search for fields that are BOTH missing AND high-value:
  HIGH VALUE (always search if missing):
  - seer2_rating / hspf2_rating (for heat pumps and condensers)
  - afue_rating (for furnaces)
  - energy_star_certified, energy_star_most_efficient
  - capacity_btu / capacity_tons (if both absent)

  MEDIUM VALUE (search if brand + model_number known):
  - eer_rating, cop
  - sound_level_db, refrigerant_type
  - voltage, amperage_draw, minimum_circuit_amperage
  - model_name (marketing name)
  - warranty_years, compressor_warranty_years

  LOW VALUE (infer, don't search):
  - variable_speed (infer from model series)
  - stages (infer from variable_speed or model tier)
  - fuel_type (always deterministic from equipment_type)
  - system_role (always deterministic from equipment_type)

STEP 4 — SEARCH: 2-4 targeted searches per equipment item. Source priority:
  1. Manufacturer spec sheets (carrier.com, lennox.com, trane.com, daikin.com, mitsubishi-electric.com)
  2. AHRI directory (ahridirectory.org) — authoritative for efficiency ratings
  3. Energy Star product finder (energystar.gov) — authoritative for certifications
  4. Retailer specs (supplyhouse.com, alpinehomeair.com) — fallback

STEP 5 — OUTPUT: Return flat JSON matching the bid_equipment Supabase schema exactly.
</research_behavior>

<data_integrity>
ANTI-HALLUCINATION RULES — MANDATORY:
1. NEVER fabricate specifications. If a web search returns no results for a model
   number, the spec fields must remain null.
2. ONLY populate fields from these VERIFIED sources:
   - Manufacturer spec sheets (carrier.com, lennox.com, trane.com, daikin.com, mitsubishi-electric.com, etc.)
   - AHRI directory (ahridirectory.org) — authoritative for efficiency ratings
   - Energy Star product finder (energystar.gov) — authoritative for certifications
   - Retailer specs as fallback (supplyhouse.com, alpinehomeair.com)
3. NEVER use AI training data for equipment specifications. Specs change between
   model years — only live web data is valid.
4. NEVER estimate efficiency ratings. A SEER2 of "probably around 20" is NOT data.
5. If a model number returns conflicting specs from different sources, use the
   manufacturer source and note the conflict in _research_meta.
6. equipment_cost is ALWAYS from the bid document — NEVER researched.
7. Distinguish between "spec not found" (null) and "spec confirmed as N/A" (null with note).
8. NEVER fill in "typical" values for a brand or product line. Each model number
   has unique specs — do not generalize from similar models.
9. If you cannot find specs for the exact model number, do NOT substitute specs
   from a similar model. Leave fields null and note in _research_meta.

VALIDATED SOURCES ONLY:
- Manufacturer spec sheets (carrier.com, lennox.com, trane.com, daikin.com, etc.)
- AHRI directory (ahridirectory.org)
- Energy Star product finder (energystar.gov)
- Retailer spec pages (supplyhouse.com, alpinehomeair.com)

DO NOT cite or use:
- AI training data / general knowledge about equipment specs
- Specs from a different model number in the same product line
- "Industry standard" values as substitutes for actual data
- Forum posts, blog articles, or user reviews for specification data
- Cached or outdated spec sheets (always prefer current manufacturer data)
</data_integrity>

<rules>
1. NEVER fabricate specifications. If you cannot find a value, use null.
2. NEVER change a value already extracted from the bid — only ADD missing fields.
3. Null is always preferred over a guess.
4. equipment_cost is ALWAYS pass-through from the bid context. Never research pricing.
5. model_name is the marketing name ("Infinity 24"). model_number is the part number ("24VNA036A003"). Distinct fields.
6. warranty_years = general parts warranty. compressor_warranty_years = compressor-specific. Distinct fields.
7. stages MUST be an integer: 1 = single-stage, 2 = two-stage. Use null (not 0) for variable speed.
8. All monetary values as plain numbers: 4500.00 not "$4,500".
9. confidence MUST be one of: "high", "medium", "low", "manual".
10. system_role is deterministic — set it based on equipment_type, never guess:
    - heat_pump / outdoor_unit → "primary_both"
    - condenser → "primary_cooling"
    - furnace → "primary_heating"
    - air_handler / indoor_unit → "air_distribution"
11. fuel_type is deterministic:
    - heat_pump, outdoor_unit, condenser, air_handler, indoor_unit → "electric"
    - furnace → "natural_gas" (unless bid specifies propane or oil)
12. hspf_rating / hspf2_rating: ONLY for heat pumps. Always null for furnaces and condensers.
13. afue_rating: ONLY for furnaces. Always null for heat pumps and condensers.
14. Do NOT output accessories (thermostats, line sets, disconnects, pads, surge protectors). Only major equipment.
</rules>
```

---

## MindPal Agent: Desired Output Format (System Instructions Section 2)

```
<output_schema>
Output ONLY valid JSON. No markdown. No code blocks. No explanation. No text before or after.

Your output must be a JSON object with this exact structure:

{
  "contractor_name": "string",
  "equipment": [
    {
      "equipment_type": "heat_pump|outdoor_unit|condenser|furnace|air_handler|indoor_unit",
      "system_role": "primary_both|primary_cooling|primary_heating|air_distribution|secondary",
      "brand": "string",
      "model_number": "string or null",
      "model_name": "string or null",
      "capacity_btu": integer or null,
      "capacity_tons": number or null,
      "seer_rating": number or null,
      "seer2_rating": number or null,
      "hspf_rating": number or null,
      "hspf2_rating": number or null,
      "eer_rating": number or null,
      "cop": number or null,
      "afue_rating": number or null,
      "fuel_type": "electric|natural_gas|propane|oil" or null,
      "variable_speed": boolean or null,
      "stages": integer or null,
      "refrigerant_type": "string or null",
      "sound_level_db": number or null,
      "voltage": integer or null,
      "amperage_draw": integer or null,
      "minimum_circuit_amperage": integer or null,
      "energy_star_certified": boolean or null,
      "energy_star_most_efficient": boolean or null,
      "warranty_years": integer or null,
      "compressor_warranty_years": integer or null,
      "equipment_cost": number or null,
      "confidence": "high|medium|low"
    }
  ],
  "_research_meta": {
    "fields_enriched": ["field_name"],
    "searches_performed": integer,
    "sources_consulted": ["url or site name"],
    "notes": "string"
  }
}

FIELD REQUIREMENTS:
- equipment_type: REQUIRED. Major equipment only.
- system_role: REQUIRED. Must match equipment_type per the mapping rules.
- brand: REQUIRED. Normalized spelling.
- All other fields: null if unknown.
- confidence per equipment row:
    "high" = brand + model found, key specs verified via manufacturer/AHRI
    "medium" = brand found, model specs partially confirmed
    "low" = unable to verify specs, most fields still null

The _research_meta object is for debugging — NOT inserted into the database.
Every field in the equipment array maps 1:1 to a Supabase bid_equipment column.
Do NOT include id, bid_id, or created_at — those are set by the database.
</output_schema>
```

---

## Task Prompt (Loop Node "Task" field)

```
You have received extracted bid context for ONE contractor from the Bid Data Extractor. This is unstructured text describing everything in the bid — not pre-formatted JSON. Parse the equipment details, research missing specs, and return enriched equipment as DB-ready JSON matching the bid_equipment schema.

EXTRACTED BID CONTEXT:
{{#currentItem}}

STEPS:

1. Parse the extracted context. Identify the contractor name and all MAJOR equipment entries mentioned.
   - Major equipment: heat pumps, outdoor units, condensers, furnaces, air handlers, indoor units
   - SKIP accessories: thermostats, line sets, disconnects, pads, surge protectors, UV lights
   - Extract whatever specs are already mentioned: brand, model number, capacity, ratings, etc.

2. For EACH major equipment entry, determine:
   a. equipment_type — what kind of equipment is it?
   b. system_role — set deterministically:
      - heat_pump / outdoor_unit → "primary_both"
      - condenser → "primary_cooling"
      - furnace → "primary_heating"
      - air_handler / indoor_unit → "air_distribution"
   c. fuel_type — set deterministically:
      - heat pumps, condensers, air handlers → "electric"
      - furnaces → "natural_gas" (or propane/oil if specified)

3. Audit which spec fields you extracted from context vs which are still missing/null.

4. For equipment with brand + model_number, run 1-2 web searches to fill gaps:

   FOR HEAT PUMPS / OUTDOOR UNITS:
   - seer2_rating, hspf2_rating → AHRI directory or manufacturer
   - energy_star_certified, energy_star_most_efficient → energystar.gov
   - capacity_btu/tons, eer_rating, cop, sound_level_db, refrigerant_type
   - voltage, amperage_draw, minimum_circuit_amperage
   - model_name, warranty_years, compressor_warranty_years

   FOR CONDENSERS (AC only):
   - seer2_rating, eer_rating → AHRI or manufacturer
   - energy_star_certified, energy_star_most_efficient
   - Same electrical/capacity/warranty fields as heat pumps
   - hspf_rating and hspf2_rating must be null (condensers don't heat)

   FOR FURNACES:
   - afue_rating → manufacturer or AHRI
   - energy_star_certified
   - capacity_btu (heating BTU, not cooling)
   - voltage (typically 120V), stages
   - warranty_years
   - seer/hspf/eer/cop must all be null (furnaces don't cool and AFUE replaces COP)
   - compressor_warranty_years must be null (furnaces have no compressor)

   FOR AIR HANDLERS:
   - model_name, variable_speed, voltage
   - All efficiency ratings null (air handlers have no independent efficiency rating)
   - warranty_years only

5. For fields that can be inferred without searching:
   - variable_speed: infer from model series name
   - stages: 1=single, 2=two-stage, null=variable speed

6. Set confidence per equipment row:
   - "high": brand + model confirmed, key specs verified
   - "medium": brand confirmed, partial specs
   - "low": cannot verify, most fields null

CRITICAL REMINDERS:
- The input is unstructured context from the Bid Data Extractor, NOT pre-formatted JSON
- Output flat values — NOT wrapped in {value, source, confidence} objects
- equipment_cost: NEVER research — pass through from context or null
- stages: integer (1 or 2) or null for variable speed. NEVER 0.
- hspf/hspf2: ONLY for heat pumps. null for furnaces and condensers.
- afue: ONLY for furnaces. null for heat pumps and condensers.
- Do NOT output thermostats, line sets, pads, disconnects, or other accessories
- Null is always better than a guess

Return ONLY the JSON object. No other text.
```

---

## Complete Output Example — Heat Pump Bid

### Input (from Bid Data Extractor via {{#currentItem}})

The Bid Data Extractor produces unstructured context, not JSON. Example:

```
Bay Area HVAC Pros — Bid Extraction

CONTRACTOR: Bay Area HVAC Pros
Phone: (408) 555-1234
License: CA #987654

EQUIPMENT:
- Carrier Infinity 24 Heat Pump, Model 24VNA036A003, 3 ton, SEER 24, variable speed, 240V
- Carrier Air Handler, Model FE4ANF003L00, variable speed
- Carrier Infinity Control Thermostat, Model DERA11011

PRICING:
Total bid: $18,500
Equipment: $9,200

WARRANTY:
10-year parts, 12-year compressor (with registration)

SCOPE:
Includes: permit, disposal of old system, thermostat, electrical disconnect
Excludes: ductwork modifications
```

### Output
```json
{
  "contractor_name": "Bay Area HVAC Pros",
  "equipment": [
    {
      "equipment_type": "heat_pump",
      "system_role": "primary_both",
      "brand": "Carrier",
      "model_number": "24VNA036A003",
      "model_name": "Infinity 24 Heat Pump",
      "capacity_btu": 36000,
      "capacity_tons": 3.0,
      "seer_rating": 24,
      "seer2_rating": 20.5,
      "hspf_rating": null,
      "hspf2_rating": 10.0,
      "eer_rating": 13.5,
      "cop": 3.8,
      "afue_rating": null,
      "fuel_type": "electric",
      "variable_speed": true,
      "stages": null,
      "refrigerant_type": "R-410A",
      "sound_level_db": 56.0,
      "voltage": 240,
      "amperage_draw": 18,
      "minimum_circuit_amperage": 25,
      "energy_star_certified": true,
      "energy_star_most_efficient": true,
      "warranty_years": 10,
      "compressor_warranty_years": 12,
      "equipment_cost": null,
      "confidence": "high"
    },
    {
      "equipment_type": "air_handler",
      "system_role": "air_distribution",
      "brand": "Carrier",
      "model_number": "FE4ANF003L00",
      "model_name": "Infinity Air Handler",
      "capacity_btu": null,
      "capacity_tons": null,
      "seer_rating": null,
      "seer2_rating": null,
      "hspf_rating": null,
      "hspf2_rating": null,
      "eer_rating": null,
      "cop": null,
      "afue_rating": null,
      "fuel_type": "electric",
      "variable_speed": true,
      "stages": null,
      "refrigerant_type": null,
      "sound_level_db": null,
      "voltage": 240,
      "amperage_draw": null,
      "minimum_circuit_amperage": null,
      "energy_star_certified": null,
      "energy_star_most_efficient": null,
      "warranty_years": 10,
      "compressor_warranty_years": null,
      "equipment_cost": null,
      "confidence": "medium"
    }
  ],
  "_research_meta": {
    "fields_enriched": ["model_name", "capacity_btu", "seer2_rating", "hspf2_rating", "eer_rating", "cop", "refrigerant_type", "sound_level_db", "amperage_draw", "minimum_circuit_amperage", "energy_star_certified", "energy_star_most_efficient", "warranty_years", "compressor_warranty_years"],
    "searches_performed": 2,
    "sources_consulted": ["carrier.com/residential/products/heat-pumps/infinity-24", "energystar.gov/productfinder"],
    "notes": "Carrier Infinity 24 (24VNA036A003) confirmed as premium variable-speed heat pump. Thermostat (DERA11011) excluded — accessories belong in the bid_scope table (accessories JSONB column). Air handler efficiency fields correctly null — efficiency belongs to the outdoor unit."
  }
}
```

Note: The thermostat from the input was **correctly excluded** — it's an accessory, not major equipment.

---

## Complete Output Example — Furnace + AC Bid

### Input (from Bid Data Extractor via {{#currentItem}})

```
Comfort First Heating — Bid Extraction

CONTRACTOR: Comfort First Heating
Phone: (510) 555-9876
License: CA #123456

EQUIPMENT:
- Lennox XC21 Air Conditioner, Model XC21-036-230, 3 ton
- Lennox Signature Series Gas Furnace, Model SL297NV060V36B, 80,000 BTU input
- Lennox Air Handler, Model CBX27UH-036

PRICING:
Total bid: $21,500

WARRANTY:
10-year parts warranty (with product registration)

SCOPE:
Includes: permit, disposal, commissioning, Manual J calculation
Excludes: electrical panel upgrade, ductwork
```

### Output
```json
{
  "contractor_name": "Comfort First Heating",
  "equipment": [
    {
      "equipment_type": "condenser",
      "system_role": "primary_cooling",
      "brand": "Lennox",
      "model_number": "XC21-036-230",
      "model_name": "XC21 Air Conditioner",
      "capacity_btu": 36000,
      "capacity_tons": 3.0,
      "seer_rating": null,
      "seer2_rating": 19.2,
      "hspf_rating": null,
      "hspf2_rating": null,
      "eer_rating": 12.8,
      "cop": null,
      "afue_rating": null,
      "fuel_type": "electric",
      "variable_speed": true,
      "stages": null,
      "refrigerant_type": "R-410A",
      "sound_level_db": 59.0,
      "voltage": 240,
      "amperage_draw": 16,
      "minimum_circuit_amperage": 20,
      "energy_star_certified": true,
      "energy_star_most_efficient": false,
      "warranty_years": 10,
      "compressor_warranty_years": 10,
      "equipment_cost": null,
      "confidence": "high"
    },
    {
      "equipment_type": "furnace",
      "system_role": "primary_heating",
      "brand": "Lennox",
      "model_number": "SL297NV060V36B",
      "model_name": "Dave Lennox Signature Series",
      "capacity_btu": 80000,
      "capacity_tons": null,
      "seer_rating": null,
      "seer2_rating": null,
      "hspf_rating": null,
      "hspf2_rating": null,
      "eer_rating": null,
      "cop": null,
      "afue_rating": 97.0,
      "fuel_type": "natural_gas",
      "variable_speed": false,
      "stages": 2,
      "refrigerant_type": null,
      "sound_level_db": null,
      "voltage": 120,
      "amperage_draw": null,
      "minimum_circuit_amperage": null,
      "energy_star_certified": true,
      "energy_star_most_efficient": false,
      "warranty_years": 10,
      "compressor_warranty_years": null,
      "equipment_cost": null,
      "confidence": "high"
    },
    {
      "equipment_type": "air_handler",
      "system_role": "air_distribution",
      "brand": "Lennox",
      "model_number": "CBX27UH-036",
      "model_name": "Lennox Air Handler",
      "capacity_btu": null,
      "capacity_tons": null,
      "seer_rating": null,
      "seer2_rating": null,
      "hspf_rating": null,
      "hspf2_rating": null,
      "eer_rating": null,
      "cop": null,
      "afue_rating": null,
      "fuel_type": "electric",
      "variable_speed": true,
      "stages": null,
      "refrigerant_type": null,
      "sound_level_db": null,
      "voltage": 120,
      "amperage_draw": null,
      "minimum_circuit_amperage": null,
      "energy_star_certified": null,
      "energy_star_most_efficient": null,
      "warranty_years": 10,
      "compressor_warranty_years": null,
      "equipment_cost": null,
      "confidence": "medium"
    }
  ],
  "_research_meta": {
    "fields_enriched": ["model_name", "capacity_btu", "seer2_rating", "eer_rating", "afue_rating", "sound_level_db", "voltage", "amperage_draw", "minimum_circuit_amperage", "energy_star_certified", "energy_star_most_efficient", "warranty_years", "compressor_warranty_years"],
    "searches_performed": 3,
    "sources_consulted": ["lennox.com/products/air-conditioners/xc21", "lennox.com/products/furnaces/sl297nv", "energystar.gov"],
    "notes": "Furnace correctly has afue_rating (97.0) and null for all SEER/HSPF/EER/COP. Condenser correctly has seer2/eer and null for hspf/afue. Air handler has no independent efficiency rating."
  }
}
```

---

## Output → Supabase Column Mapping

Every field in `equipment[]` maps 1:1 to `bid_equipment` columns. No transformation needed.

| Output Field | DB Column | DB Type |
|-------------|-----------|---------|
| `equipment_type` | `bid_equipment.equipment_type` | TEXT, NOT NULL |
| `system_role` | `bid_equipment.system_role` | TEXT |
| `brand` | `bid_equipment.brand` | TEXT, NOT NULL |
| `model_number` | `bid_equipment.model_number` | TEXT |
| `model_name` | `bid_equipment.model_name` | TEXT |
| `capacity_btu` | `bid_equipment.capacity_btu` | INTEGER |
| `capacity_tons` | `bid_equipment.capacity_tons` | DECIMAL(4,2) |
| `seer_rating` | `bid_equipment.seer_rating` | DECIMAL(5,2) |
| `seer2_rating` | `bid_equipment.seer2_rating` | DECIMAL(5,2) |
| `hspf_rating` | `bid_equipment.hspf_rating` | DECIMAL(5,2) |
| `hspf2_rating` | `bid_equipment.hspf2_rating` | DECIMAL(5,2) |
| `eer_rating` | `bid_equipment.eer_rating` | DECIMAL(5,2) |
| `cop` | `bid_equipment.cop` | DECIMAL(4,2) |
| `afue_rating` | `bid_equipment.afue_rating` | DECIMAL(5,2) |
| `fuel_type` | `bid_equipment.fuel_type` | TEXT |
| `variable_speed` | `bid_equipment.variable_speed` | BOOLEAN |
| `stages` | `bid_equipment.stages` | INTEGER |
| `refrigerant_type` | `bid_equipment.refrigerant_type` | TEXT |
| `sound_level_db` | `bid_equipment.sound_level_db` | DECIMAL(5,1) |
| `voltage` | `bid_equipment.voltage` | INTEGER |
| `amperage_draw` | `bid_equipment.amperage_draw` | INTEGER |
| `minimum_circuit_amperage` | `bid_equipment.minimum_circuit_amperage` | INTEGER |
| `energy_star_certified` | `bid_equipment.energy_star_certified` | BOOLEAN |
| `energy_star_most_efficient` | `bid_equipment.energy_star_most_efficient` | BOOLEAN |
| `warranty_years` | `bid_equipment.warranty_years` | INTEGER |
| `compressor_warranty_years` | `bid_equipment.compressor_warranty_years` | INTEGER |
| `equipment_cost` | `bid_equipment.equipment_cost` | DECIMAL(10,2) |
| `confidence` | `bid_equipment.confidence` | confidence_level ENUM |

**Not in agent output (set by DB/Code Node):** `id`, `bid_id`, `created_at`
**Not in database (debugging only):** `_research_meta`

---

## Upsert Strategy

| Key | Value |
|-----|-------|
| Upsert key | `bid_id` + `equipment_type` + `model_number` |
| Behavior | UPDATE only non-null fields. Never overwrite existing non-null values with null. |
| Idempotency | Safe to re-run. |

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No model_number in context | Skip model-specific research. Brand-level Energy Star + warranty defaults. Confidence = "low". |
| Multiple outdoor units (zoned) | Each is a separate equipment row. Research independently. |
| Model not found in searches | Researched fields stay null. Note in _research_meta. Confidence = "low". |
| Bid context has seer_rating but not seer2_rating | Research SEER2. Keep original seer_rating unchanged. |
| Furnace in a heat pump bid (hybrid) | Output both: heat_pump (primary_both) + furnace (secondary). Correct ratings for each. |
| equipment_cost missing | Leave null. NEVER research pricing. |
| Brand misspelled in context | Normalize: "Lenox"→"Lennox", "Traine"→"Trane", "Goodmen"→"Goodman". Note in _research_meta. |
| Thermostat/line set in extracted context | SKIP — do not include in output. Accessories go in the bid_scope table (accessories JSONB column). |
| capacity_tons present, capacity_btu missing | Calculate: capacity_btu = capacity_tons × 12000. |
| Context is poorly structured / hard to parse | Do your best to extract. Set confidence = "low" for uncertain fields. Note parsing difficulties in _research_meta. |

---

## Validation Checklist (Supervised mode)

- [ ] Only major equipment output (no thermostats, line sets, pads, disconnects)
- [ ] Every row has equipment_type, system_role, brand (required)
- [ ] system_role matches equipment_type per mapping rules
- [ ] fuel_type correct: electric for heat pumps/condensers/air handlers, natural_gas for furnaces
- [ ] hspf/hspf2 null for furnaces and condensers
- [ ] afue null for heat pumps and condensers
- [ ] stages is integer (1 or 2) or null — never 0, never a string
- [ ] Output is flat JSON — no `{value, source, confidence}` wrappers
- [ ] equipment_cost was NOT researched
- [ ] confidence is exactly "high", "medium", or "low"
- [ ] All numbers plain (no "$", no commas)
- [ ] JSON is valid (parseable, no trailing commas)
