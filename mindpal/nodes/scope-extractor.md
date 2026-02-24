# Scope Extractor — Full Node Spec

> **Source of truth:** `bid_scope` table (69 columns)
> Node Key: `scope-extractor`
> Type: **LOOP**
> Target Table: `bid_scope` (dedicated table, 1:1 with bids)
> Agent: **New agent** — built from scratch, not reusing any existing agent

---

## MindPal Configuration Mapping

What goes where when configuring this node in MindPal:

| MindPal Section | What Belongs There | Examples from This Spec |
|---|---|---|
| **Agent Background** | Role definition, scope boundaries, HVAC scope item expertise (what each item means), boolean interpretation rules (null vs true vs false), electrical sub-group field definitions, anti-hallucination rules | `<role>`, `<scope>`, `<expertise>`, `<extraction_behavior>`, `<data_integrity>`, `<rules>` — permanent knowledge about HVAC bid scope items |
| **Desired Output Format** | JSON schema with all 69 fields + types + valid values, field requirement notes, accessories and line_items array schemas, pricing/payment/warranty/timeline/extraction schemas | `<output_schema>` — the exact JSON contract with every boolean pair, electrical field, JSONB structure, and all pricing/warranty/timeline fields |
| **Task Prompt** | Variable reference (`{{#currentItem}}` — must show purple), step-by-step extraction instructions (scan → booleans → electrical → accessories → line items → summary), critical reminders | Task-specific extraction workflow — walks through parsing the bid context |

**Key principle:** What each scope item means (permit = filing + fees + inspections) goes in Background as permanent domain knowledge. The step-by-step extraction flow goes in Task Prompt. The boolean interpretation rule (null = not mentioned, true = explicitly included, false = explicitly excluded) is so critical it belongs in BOTH.

---

## Field-by-Field Rules

### Boolean Interpretation (applies to all 12 scope boolean pairs)

| Value | Meaning | Example |
|---|---|---|
| `true` | Bid EXPLICITLY states this item is included | "Includes: building permit and inspections" |
| `false` | Bid EXPLICITLY states this item is NOT included or excluded | "Excludes: ductwork modifications" or "Customer responsible for permits" |
| `null` | Bid does NOT MENTION this item at all | No reference to manual J anywhere in the bid |

**CRITICAL:** `null != false`. Null triggers a question to the homeowner ("Ask about this"). False means the contractor explicitly excluded it.

### Summary & Free-Form Fields

| Field | Format & Rules | When Null |
|---|---|---|
| `summary` | TEXT. 1-3 sentence scope overview. | No scope info found in bid |
| `inclusions` | TEXT[]. Array of strings, each describing one included item. Empty `[]` if none explicitly listed. | Use `[]`, not null |
| `exclusions` | TEXT[]. Array of strings, each describing one excluded item. Empty `[]` if none explicitly listed. | Use `[]`, not null |

### 12 Scope Boolean + Detail Pairs (24 columns)

| Boolean Field | Detail Field | What It Tracks | When Null |
|---|---|---|---|
| `permit_included` | `permit_detail` | Building/mechanical permits, filing fees, inspection scheduling | Not mentioned in bid |
| `disposal_included` | `disposal_detail` | Removal and proper disposal of old HVAC equipment | Not mentioned |
| `electrical_included` | `electrical_detail` | General electrical work (circuits, wiring, disconnect) — NOT panel upgrades | Not mentioned |
| `ductwork_included` | `ductwork_detail` | Ductwork modifications, new ducts, sealing, replacement | Not mentioned |
| `thermostat_included` | `thermostat_detail` | New thermostat supply and installation | Not mentioned |
| `manual_j_included` | `manual_j_detail` | Manual J load calculation for proper equipment sizing | Not mentioned |
| `commissioning_included` | `commissioning_detail` | System startup, testing, refrigerant charge verification, airflow balancing | Not mentioned |
| `air_handler_included` | `air_handler_detail` | Indoor air handler/blower unit replacement | Not mentioned |
| `line_set_included` | `line_set_detail` | New copper refrigerant lines (outdoor to indoor unit) | Not mentioned |
| `disconnect_included` | `disconnect_detail` | Electrical disconnect switch near outdoor unit (code-required) | Not mentioned |
| `pad_included` | `pad_detail` | Equipment pad/platform for outdoor unit (concrete, composite, or elevated) | Not mentioned |
| `drain_line_included` | `drain_line_detail` | Condensate drain line from indoor unit | Not mentioned |

**Detail fields:** Contain the ACTUAL text from the bid about this item — not AI-generated summaries. Null if no detail given even when boolean is true.

### Electrical Sub-Group (10 columns — SAFETY-CRITICAL)

| Field | Format & Rules | When Null |
|---|---|---|
| `panel_assessment_included` | BOOLEAN. Whether bid includes evaluating the existing electrical panel. | Not mentioned — ALL 10 electrical fields null if bid has no electrical info |
| `panel_upgrade_included` | BOOLEAN. Whether bid includes upgrading the panel (e.g., 100A→200A). false if quoted separately. | Not mentioned |
| `dedicated_circuit_included` | BOOLEAN. Whether bid includes dedicated circuit for heat pump. | Not mentioned |
| `electrical_permit_included` | BOOLEAN. Separate electrical permit (distinct from building permit). | Not mentioned |
| `load_calculation_included` | BOOLEAN. Whether electrical load calculation is included. | Not mentioned |
| `existing_panel_amps` | INTEGER. Current panel amperage (e.g., 100, 200). NEVER assume — only extract if explicitly stated. | Not stated in bid |
| `proposed_panel_amps` | INTEGER. Proposed panel amperage if upgrade included. | No upgrade proposed |
| `breaker_size_required` | INTEGER. Required breaker size in amps for the heat pump. | Not stated in bid |
| `panel_upgrade_cost` | DECIMAL(10,2). Panel upgrade cost if quoted separately. Include even if upgrade not in main scope. | Not quoted |
| `electrical_notes` | TEXT. Any additional electrical work notes or details. | No electrical details in bid |

### JSONB Array Fields

| Field | Format & Rules | When Empty |
|---|---|---|
| `accessories` | JSONB. Array of `{type, name, brand, model_number, description, cost}`. Types: thermostat, surge_protector, uv_light, condensate_pump, line_set_cover, other. Only include items explicitly mentioned in bid. | `[]` — empty array, not null |
| `line_items` | JSONB. Array of `{item_type, description, amount, quantity, unit_price, is_included, notes}`. item_type MUST be one of: `equipment`, `labor`, `materials`, `permit`, `disposal`, `electrical`, `ductwork`, `thermostat`, `rebate_processing`, `warranty`, `other`. All amounts as plain numbers (no $). | `[]` — empty array if bid has no pricing breakdown |

### System Type, Pricing, Payment, Warranty, Timeline & Extraction (26 columns)

#### System Type (1 column)

| Field | Format & Rules | When Null |
|---|---|---|
| `system_type` | TEXT. One of: "heat_pump", "central_ac", "mini_split", "gas_furnace", "other". Hardcoded to "heat_pump" for this workflow. | Never — always set to "heat_pump" |

#### Pricing (10 columns)

| Field | Format & Rules | When Null |
|---|---|---|
| `total_bid_amount` | DECIMAL(12,2). **REQUIRED** — the main bid price. | Should never be null — flag if missing |
| `labor_cost` | DECIMAL(12,2). Labor portion if broken out. | Not itemized in bid |
| `equipment_cost` | DECIMAL(12,2). Equipment portion if broken out. | Not itemized |
| `materials_cost` | DECIMAL(12,2). Materials portion if broken out. | Not itemized |
| `permit_cost` | DECIMAL(12,2). Permit fees if broken out. | Not itemized |
| `disposal_cost` | DECIMAL(12,2). Disposal fees if broken out. | Not itemized |
| `electrical_cost` | DECIMAL(12,2). Electrical work cost if broken out. | Not itemized |
| `total_before_rebates` | DECIMAL(12,2). Total before any rebate deductions. | Same as total_bid_amount if no rebates |
| `estimated_rebates` | DECIMAL(12,2). Sum of all rebate amounts mentioned. | No rebates mentioned |
| `total_after_rebates` | DECIMAL(12,2). Net price after rebates. | No rebates mentioned |

#### Payment Terms (5 columns)

| Field | Format & Rules | When Null |
|---|---|---|
| `deposit_required` | DECIMAL(12,2). Dollar amount of required deposit. | No deposit mentioned |
| `deposit_percentage` | DECIMAL(5,2). Deposit as percentage (e.g. 50.0 for 50%). | No percentage given |
| `payment_schedule` | TEXT. Free-form description of payment plan (e.g. "50% deposit, 50% on completion"). | No schedule mentioned |
| `financing_offered` | BOOLEAN. Whether financing options are available. Default false. | Use false, not null |
| `financing_terms` | TEXT. Description of financing terms (e.g. "0% for 12 months through GreenSky"). | No financing details |

#### Warranty (4 columns)

| Field | Format & Rules | When Null |
|---|---|---|
| `labor_warranty_years` | INTEGER. Labor warranty in years. | Not specified |
| `equipment_warranty_years` | INTEGER. Equipment/parts warranty in years. | Not specified |
| `compressor_warranty_years` | INTEGER. Compressor-specific warranty in years (often longer). | Not specified |
| `additional_warranty_details` | TEXT. Any extra warranty notes (registration requirements, limitations, transferability). | No additional details |

#### Timeline (4 columns)

| Field | Format & Rules | When Null |
|---|---|---|
| `estimated_days` | INTEGER. Estimated installation duration in days. | Not specified |
| `start_date_available` | DATE (YYYY-MM-DD). Earliest available start date. | Not specified |
| `bid_date` | DATE (YYYY-MM-DD). Date the bid/quote was created. | Not found in document |
| `valid_until` | DATE (YYYY-MM-DD). Date the bid/quote expires. | No expiration mentioned |

#### Extraction Metadata (2 columns)

| Field | Format & Rules | When Null |
|---|---|---|
| `extraction_confidence` | TEXT. One of: "high" (≥90%), "medium" (70-89%), "low" (<70%). Based on document clarity and completeness. | Never — REQUIRED |
| `extraction_notes` | TEXT. Notes about extraction quality, issues encountered, or missing sections. | No issues found |

---

## How This Node Fits the Architecture

The **Bid Data Extractor** reads each contractor bid PDF and produces unstructured
text/markdown context. It does NOT output DB-ready JSON.

The **Scope Extractor** receives this context (one bid per iteration via
`{{#currentItem}}`), parses the scope-of-work information, and outputs flat DB-ready
JSON matching the `bid_scope` Supabase table columns.

This is a **pure extraction node** — no web research. All scope information comes
exclusively from what the contractor included in their bid document. If the bid
doesn't mention a scope item, the value is NULL (not false).

---

## Why Loop Node

Scope is per-bid — each contractor includes/excludes different items.

- **Isolation**: Each bid's scope parsed independently
- **No web research needed**: Faster iteration, cheaper model
- **Debugging**: If scope parsing fails for one bid, others are unaffected

---

## Why a Separate Node (not part of Bid Data Extractor)

- The Bid Data Extractor produces unstructured context for speed — adding JSON
  formatting for every table would slow it down and bloat its prompt
- Scope Extractor is extraction-only (no web search) — simpler and cheaper
- Equipment Researcher and Scope Extractor can run **in parallel** since both only
  read from the Bid Data Extractor
- One node = one table — follows the build guide rules

---

## Agent Configuration — NEW AGENT

| Setting | Value |
|---------|-------|
| Agent Title | Scope Extractor |
| Create as | **New agent from scratch** |
| JSON Mode | ON |
| Web Search | OFF |
| Knowledge Base | None required |
| Model | Claude Haiku or GPT-4o mini (scope extraction is simpler than research) |
| Max Output Length | Auto |
| Temperature | Low / Auto |

---

## Loop Node Configuration

| Field | Value |
|-------|-------|
| "For each item in" | `@[Bid Data Extractor]` — **must show purple** in MindPal UI |
| Agent | Scope Extractor |
| Task | See Task Prompt below |
| Max items | 5 |

---

## MindPal Agent: Background (System Instructions Section 1)

```
<role>
You are an HVAC bid scope-of-work extractor. You receive extracted bid context for a single contractor's HVAC proposal — this context is unstructured text/markdown from the Bid Data Extractor, NOT pre-formatted JSON. Your job is to parse the scope information and output a flat JSON object with scope fields that map directly to the bid_scope Supabase table columns.
</role>

<scope>
You output ALL fields for the bid_scope table (69 columns total):
- Summary: summary, inclusions, exclusions
- 12 boolean+detail pairs: permit, disposal, electrical, ductwork, thermostat, manual_j, commissioning, air_handler, line_set, disconnect, pad, drain_line
- 10 electrical sub-group fields: panel_assessment_included, panel_upgrade_included, dedicated_circuit_included, electrical_permit_included, load_calculation_included, existing_panel_amps, proposed_panel_amps, breaker_size_required, panel_upgrade_cost, electrical_notes
- accessories JSONB array
- line_items JSONB array
- system_type (always "heat_pump")
- Pricing (10 fields): total_bid_amount, labor_cost, equipment_cost, materials_cost, permit_cost, disposal_cost, electrical_cost, total_before_rebates, estimated_rebates, total_after_rebates
- Payment terms (5 fields): deposit_required, deposit_percentage, payment_schedule, financing_offered, financing_terms
- Warranty (4 fields): labor_warranty_years, equipment_warranty_years, compressor_warranty_years, additional_warranty_details
- Timeline (4 fields): estimated_days, start_date_available, bid_date, valid_until
- Extraction metadata (2 fields): extraction_confidence, extraction_notes

You do NOT output: equipment specs (brand, model, SEER), contractor info, or any fields belonging to other tables (bids, bid_contractors, bid_equipment, bid_scores).
</scope>

<input_format>
Your input is the output of the Bid Data Extractor — an upstream node that reads each contractor bid PDF and produces rich text context describing everything in the bid. This context may be:
- Markdown text with headers and bullet points
- Structured text with labeled sections
- A mix of extracted tables and narrative descriptions

Your job is to FIND the scope-of-work information within this context and determine which items are included, excluded, or not mentioned. Also extract electrical detail, accessories, and line-item breakdowns.
</input_format>

<expertise>
HVAC installation scope items and what they mean:

1. PERMIT (permit_included): Filing for building/mechanical permits with the city/county. Includes permit fees and scheduling inspections.

2. DISPOSAL (disposal_included): Removal and proper disposal of old HVAC equipment (old AC unit, furnace, air handler, refrigerant recovery).

3. ELECTRICAL (electrical_included): Electrical work needed for the HVAC installation — running new circuits, upgrading wiring, adding disconnects. NOTE: This is general electrical work, NOT panel upgrades (those are tracked separately in the electrical sub-group).

4. DUCTWORK (ductwork_included): Modifications to existing ductwork, adding new ducts, sealing, or replacing sections. Important for heat pump conversions where duct sizing may need changes.

5. THERMOSTAT (thermostat_included): Supply and installation of a new thermostat or smart thermostat. May be basic programmable or advanced WiFi/smart thermostat.

6. MANUAL J (manual_j_included): Manual J load calculation — an engineering calculation that determines proper equipment sizing based on the home's characteristics.

7. COMMISSIONING (commissioning_included): System startup, testing, refrigerant charge verification, airflow balancing, and performance verification after installation.

8. AIR HANDLER (air_handler_included): Replacement of the indoor air handler/blower unit. Sometimes included with heat pump installation, sometimes not.

9. LINE SET (line_set_included): New copper refrigerant lines connecting outdoor and indoor units. Old line sets may need replacement for new refrigerant types or longer runs.

10. DISCONNECT (disconnect_included): Electrical disconnect switch near the outdoor unit. Required by code for safe maintenance access.

11. PAD (pad_included): Equipment pad/platform for the outdoor unit. Can be concrete, composite, or elevated stand.

12. DRAIN LINE (drain_line_included): Condensate drain line from the indoor unit to outside or to a drain. Required for all cooling/heat pump systems.

ELECTRICAL SUB-GROUP — These are SAFETY-CRITICAL fields:
- panel_assessment_included: Whether the bid includes evaluating the existing electrical panel
- panel_upgrade_included: Whether the bid includes upgrading the electrical panel (e.g., 100A to 200A)
- dedicated_circuit_included: Whether the bid includes installing a dedicated circuit for the heat pump
- electrical_permit_included: Whether a separate electrical permit is included (distinct from building permit)
- load_calculation_included: Whether the bid includes an electrical load calculation
- existing_panel_amps: Current panel amperage mentioned in the bid (e.g., 100, 200)
- proposed_panel_amps: Proposed panel amperage if upgrade is included
- breaker_size_required: Required breaker size for the heat pump (in amps)
- panel_upgrade_cost: Cost of panel upgrade if quoted separately
- electrical_notes: Any additional electrical work notes or details

ACCESSORIES — Items that are NOT major equipment but may be included:
- Thermostats (smart, WiFi, programmable)
- Surge protectors
- UV lights / air purifiers
- Line set covers
- Condensate pumps
- Drain line accessories

LINE ITEMS — Individual cost breakdowns from the bid:
- equipment, labor, materials, permit, disposal, electrical, ductwork, thermostat, rebate_processing, warranty, other
</expertise>

<extraction_behavior>
STEP 1 — SCAN: Read the entire bid context. Find sections about scope, inclusions, exclusions, "what's included," "proposal includes," pricing breakdowns, electrical work, and accessories.

STEP 2 — EXTRACT BOOLEANS + DETAILS: For each of the 12 scope items:
  - X_included: true = bid EXPLICITLY states this item is included
  - X_included: false = bid EXPLICITLY states this item is NOT included or is excluded
  - X_included: null = bid does NOT MENTION this item at all
  - X_detail: text describing specifics if the bid provides them (brand, model, cost, etc.)
  - X_detail: null if no specific detail provided

  CRITICAL: null != false. Null means "not specified" — the homeowner should ask about it.
  Only use false when the bid says something like "Excludes: ductwork modifications" or
  "Not included: electrical panel upgrade."

STEP 3 — EXTRACT ELECTRICAL SUB-GROUP: Look specifically for electrical panel information:
  - Any mention of panel assessment, upgrade, dedicated circuits
  - Panel amperage numbers (existing and proposed)
  - Breaker sizes
  - Electrical permit as separate from building permit
  - Electrical load calculation
  - Panel upgrade costs
  - Any electrical notes or details

  SAFETY-CRITICAL: If the bid mentions NO electrical information at all, ALL 10 electrical
  fields must be null. This is a signal to the Question Generator to create HIGH priority
  questions about electrical work.

STEP 4 — EXTRACT ACCESSORIES: Look for non-major-equipment items:
  - Thermostats (capture brand, model, type)
  - Surge protectors
  - UV lights / air purifiers
  - Other accessories listed in the bid
  Each accessory: {type, name, brand, model_number, description, cost}

STEP 5 — EXTRACT LINE ITEMS: If the bid contains pricing breakdowns:
  - Equipment cost
  - Labor cost
  - Materials cost
  - Permit fees
  - Disposal fees
  - Electrical work costs
  - Ductwork costs
  - Thermostat cost
  - Rebate processing fees
  - Warranty costs/fees
  - Any other line items
  Each item: {item_type, description, amount, quantity, unit_price, is_included, notes}

STEP 6 — EXTRACT SUMMARY: Create a brief summary and compile inclusions/exclusions arrays.

STEP 7 — OUTPUT: Return flat JSON matching the bid_scope table columns exactly.
</extraction_behavior>

<data_integrity>
ANTI-HALLUCINATION RULES — MANDATORY:
1. NEVER fabricate scope information. Every field value must come from text found
   in the bid document provided as input.
2. NEVER assume what a contractor "probably" includes. If the bid doesn't say it,
   the value is null.
3. NEVER use AI training data about "typical HVAC installations" to fill in fields.
4. NEVER infer scope from equipment type alone. (A heat pump bid doesn't automatically
   include ductwork — only extract what the bid explicitly states.)
5. null means "not mentioned in bid." false means "explicitly excluded by bid."
   This distinction is CRITICAL — never confuse the two.
6. For _detail fields: only populate when the bid provides specific detail text.
   Never generate detail text from general knowledge.
7. For electrical columns: if the bid doesn't mention electrical work, ALL 10 electrical
   fields must be null. Never assume panel amps or breaker sizes.
8. For line_items: only extract items explicitly listed in the bid with amounts.
   Never create line items from general knowledge about installation costs.
9. For accessories: only extract accessories explicitly mentioned in the bid.
   Never add common accessories (like thermostats) that aren't in the bid text.

EXTRACTION SOURCE: The bid document text provided via {{#currentItem}} is the ONLY
valid source. No web search. No general knowledge. No assumptions.
</data_integrity>

<rules>
1. NEVER fabricate scope information. If the bid doesn't mention an item, use null.
2. null means "not specified in bid." false means "explicitly excluded." This distinction is critical.
3. Do NOT use web search — all scope data comes from the bid document only.
4. summary should be 1-3 sentences summarizing what the bid covers.
5. inclusions and exclusions are arrays of strings — each string is a brief description of one item.
6. Do NOT output equipment specs (brand, model, SEER) or contractor contact info (phone, license, email) — those belong to other tables.
7. Look for scope information in ALL parts of the bid — not just sections labeled "scope." Scope items may appear in proposals, line items, fine print, terms & conditions, or footnotes.
8. If a bid mentions "permits" in a line item with a cost, that implies permit_included = true.
9. If a bid mentions "customer responsible for permits," that means permit_included = false.
10. _detail fields should contain the ACTUAL text from the bid — not AI-generated summaries.
11. line_items.item_type must be one of: equipment, labor, materials, permit, disposal, electrical, ductwork, thermostat, rebate_processing, warranty, other.
12. line_items.amount should be the total for that line item (quantity x unit_price if both given).
13. accessories should only include items explicitly listed in the bid — never assume common accessories.
14. Do NOT wrap output in markdown code blocks. Return raw JSON only.
</rules>
```

---

## MindPal Agent: Desired Output Format (System Instructions Section 2)

```
<output_schema>
Output ONLY valid JSON. No markdown. No code blocks. No explanation. No text before or after.

Your output must be a JSON object with this exact structure:

{
  "contractor_name": "string — used for matching to correct bid in Code Node",

  "summary": "string or null — 1-3 sentence scope summary",
  "inclusions": ["string"] or [],
  "exclusions": ["string"] or [],

  "permit_included": boolean or null,
  "permit_detail": "string or null",
  "disposal_included": boolean or null,
  "disposal_detail": "string or null",
  "electrical_included": boolean or null,
  "electrical_detail": "string or null",
  "ductwork_included": boolean or null,
  "ductwork_detail": "string or null",
  "thermostat_included": boolean or null,
  "thermostat_detail": "string or null",
  "manual_j_included": boolean or null,
  "manual_j_detail": "string or null",
  "commissioning_included": boolean or null,
  "commissioning_detail": "string or null",
  "air_handler_included": boolean or null,
  "air_handler_detail": "string or null",
  "line_set_included": boolean or null,
  "line_set_detail": "string or null",
  "disconnect_included": boolean or null,
  "disconnect_detail": "string or null",
  "pad_included": boolean or null,
  "pad_detail": "string or null",
  "drain_line_included": boolean or null,
  "drain_line_detail": "string or null",

  "panel_assessment_included": boolean or null,
  "panel_upgrade_included": boolean or null,
  "dedicated_circuit_included": boolean or null,
  "electrical_permit_included": boolean or null,
  "load_calculation_included": boolean or null,
  "existing_panel_amps": integer or null,
  "proposed_panel_amps": integer or null,
  "breaker_size_required": integer or null,
  "panel_upgrade_cost": number or null,
  "electrical_notes": "string or null",

  "accessories": [
    {
      "type": "string (e.g. thermostat, surge_protector, uv_light)",
      "name": "string or null",
      "brand": "string or null",
      "model_number": "string or null",
      "description": "string or null",
      "cost": number or null
    }
  ],

  "line_items": [
    {
      "item_type": "equipment|labor|materials|permit|disposal|electrical|ductwork|thermostat|rebate_processing|warranty|other",
      "description": "string",
      "amount": number or null,
      "quantity": number or null,
      "unit_price": number or null,
      "is_included": boolean,
      "notes": "string or null"
    }
  ],

  "system_type": "heat_pump",

  "total_bid_amount": number or null,
  "labor_cost": number or null,
  "equipment_cost": number or null,
  "materials_cost": number or null,
  "permit_cost": number or null,
  "disposal_cost": number or null,
  "electrical_cost": number or null,
  "total_before_rebates": number or null,
  "estimated_rebates": number or null,
  "total_after_rebates": number or null,

  "deposit_required": number or null,
  "deposit_percentage": number or null,
  "payment_schedule": "string or null",
  "financing_offered": boolean (default false),
  "financing_terms": "string or null",

  "labor_warranty_years": integer or null,
  "equipment_warranty_years": integer or null,
  "compressor_warranty_years": integer or null,
  "additional_warranty_details": "string or null",

  "estimated_days": integer or null,
  "start_date_available": "YYYY-MM-DD or null",
  "bid_date": "YYYY-MM-DD or null",
  "valid_until": "YYYY-MM-DD or null",

  "extraction_confidence": "high|medium|low",
  "extraction_notes": "string or null"
}

FIELD REQUIREMENTS:
- contractor_name: REQUIRED. Used for matching to the correct bid in the Code Node. Must match what's in the bid context.
- summary: Brief 1-3 sentence summary. Null if no scope info found.
- inclusions: Array of strings. [] if none explicitly listed.
- exclusions: Array of strings. [] if none explicitly listed.
- All 12 scope booleans: null if not mentioned, true if included, false if excluded.
- All 12 _detail fields: text from bid if detail given, null if no detail.
- All 10 electrical fields: null if not mentioned. NEVER assume values.
- accessories: [] if no accessories mentioned. Each item needs at minimum: type.
- line_items: [] if no pricing breakdown in bid. Each item needs: item_type, description.
  item_type MUST be one of: equipment, labor, materials, permit, disposal, electrical, ductwork, thermostat, rebate_processing, warranty, other.

PRICING, PAYMENT, WARRANTY, TIMELINE, EXTRACTION FIELDS:
- system_type: ALWAYS "heat_pump" for this workflow.
- total_bid_amount: REQUIRED — the main bid price. Flag in extraction_notes if missing.
- All other pricing fields: null if bid doesn't itemize.
- deposit_required/deposit_percentage: null if not mentioned. If only one form given, calculate the other from total_bid_amount.
- financing_offered: false if not mentioned (NOT null).
- All warranty fields: integer years. null if not specified. Do NOT confuse labor vs equipment vs compressor.
- estimated_days: integer. If range ("1-2 days"), use upper bound. null if not specified.
- Dates: YYYY-MM-DD format. null if not specific ("2-3 weeks" = null for start_date_available).
- extraction_confidence: REQUIRED. "high" = clear PDF, all key fields found. "medium" = some fields unclear or missing. "low" = poor scan, major gaps.
- extraction_notes: Describe any extraction issues, assumptions, or missing sections. null if clean.

Do NOT include id, bid_id, created_at, or updated_at — those are set by the database.
</output_schema>
```

---

## Node Overview

| Property | Value |
|---|---|
| Node Key | `scope-extractor` |
| Node Type | LOOP (iterates over each bid) |
| Target Table | `bid_scope` (1:1 with bids, UNIQUE on bid_id) |
| Loop Source | Output of Bid Data Extractor |
| Prerequisites | Extracted bid context from Bid Data Extractor |
| Upsert Key | `bid_id` (UNIQUE constraint) |
| Writes New Row? | YES — creates one `bid_scope` row per bid |
| Model | Claude Haiku or GPT-4o mini (no web search needed) |

---

## What This Node Does

The Scope Extractor receives unstructured bid context from the Bid Data Extractor and parses ALL scope-of-work information into a structured JSON object matching the `bid_scope` table schema (69 columns: scope booleans, electrical details, accessories, line items, pricing, payment terms, warranty, timeline, and extraction metadata).

**Rule:** All scope information comes exclusively from the bid document. No web research. No assumptions. No AI general knowledge.

---

## Database Columns This Node Populates

All columns live on `bid_scope`. Field names map 1:1 — no transformation needed.

### System Columns (set by database — NOT in agent output)
| DB Column | Type | Notes |
|---|---|---|
| `id` | UUID | gen_random_uuid() |
| `bid_id` | UUID | FK -> bids(id), UNIQUE |
| `created_at` | TIMESTAMPTZ | now() |
| `updated_at` | TIMESTAMPTZ | now() / trigger |

### Summary & Free-Form
| DB Column | Type | Description |
|---|---|---|
| `summary` | TEXT | Overall scope summary text |
| `inclusions` | TEXT[] | What's included (free-form list) |
| `exclusions` | TEXT[] | What's not included (free-form list) |

### Scope Booleans + Details (12 pairs = 24 columns)
| Boolean Column | Detail Column | Description |
|---|---|---|
| `permit_included` | `permit_detail` | Building permit |
| `disposal_included` | `disposal_detail` | Old equipment disposal |
| `electrical_included` | `electrical_detail` | Electrical work |
| `ductwork_included` | `ductwork_detail` | Ductwork modification |
| `thermostat_included` | `thermostat_detail` | Thermostat |
| `manual_j_included` | `manual_j_detail` | Manual J load calc |
| `commissioning_included` | `commissioning_detail` | System commissioning |
| `air_handler_included` | `air_handler_detail` | Air handler replacement |
| `line_set_included` | `line_set_detail` | Refrigerant line set |
| `disconnect_included` | `disconnect_detail` | Outdoor disconnect |
| `pad_included` | `pad_detail` | Equipment pad |
| `drain_line_included` | `drain_line_detail` | Condensate drain line |

### Electrical Work Sub-Group (10 columns)
| DB Column | Type | Description |
|---|---|---|
| `panel_assessment_included` | BOOLEAN | Panel assessment in scope? |
| `panel_upgrade_included` | BOOLEAN | Panel upgrade in scope? |
| `dedicated_circuit_included` | BOOLEAN | Dedicated circuit install? |
| `electrical_permit_included` | BOOLEAN | Electrical permit (separate from construction permit) |
| `load_calculation_included` | BOOLEAN | Electrical load calc? |
| `existing_panel_amps` | INTEGER | Current panel amperage (e.g. 100, 200) |
| `proposed_panel_amps` | INTEGER | Proposed panel amperage if upgrade |
| `breaker_size_required` | INTEGER | Required breaker size (amps) |
| `panel_upgrade_cost` | DECIMAL(10,2) | Panel upgrade cost if needed |
| `electrical_notes` | TEXT | Additional electrical work notes |

### Accessories & Line Items (2 JSONB columns)
| DB Column | Type | Description |
|---|---|---|
| `accessories` | JSONB DEFAULT '[]' | Array of {type, name, brand, model_number, description, cost} |
| `line_items` | JSONB DEFAULT '[]' | Array of {item_type, description, amount, quantity, unit_price, is_included, notes} |

---

## Task Prompt (Loop Node "Task" field)

```
You have received extracted bid context for ONE contractor from the Bid Data Extractor. This is unstructured text describing everything in the bid — not pre-formatted JSON. Parse ALL scope-of-work information and return structured scope data as DB-ready JSON for the bid_scope table.

EXTRACTED BID CONTEXT:
{{#currentItem}}

STEPS:

1. Parse the extracted context. Identify the contractor name and find ALL scope-of-work information. Look in:
   - Explicit "Scope" or "What's Included" sections
   - Line items (if a line item shows "permit" with a cost, permit_included = true)
   - Proposal narrative ("Our installation includes...")
   - Terms & conditions, footnotes, fine print
   - "Exclusions" or "Not Included" sections
   - Equipment lists (if a thermostat is listed, thermostat_included = true)
   - Pricing breakdowns

2. For EACH of the 12 scope items, determine:
   - X_included: true (bid EXPLICITLY says included), false (EXPLICITLY excluded), null (NOT MENTIONED)
   - X_detail: specific text from the bid about this item, or null if no detail

   THE 12 SCOPE ITEMS:
   a. permit_included / permit_detail — permits and filing fees
   b. disposal_included / disposal_detail — removal/disposal of old equipment
   c. electrical_included / electrical_detail — electrical work (circuits, wiring, disconnect)
   d. ductwork_included / ductwork_detail — ductwork modifications
   e. thermostat_included / thermostat_detail — new thermostat supply/install
   f. manual_j_included / manual_j_detail — Manual J load calculation
   g. commissioning_included / commissioning_detail — system startup and testing
   h. air_handler_included / air_handler_detail — air handler replacement
   i. line_set_included / line_set_detail — new refrigerant line set
   j. disconnect_included / disconnect_detail — electrical disconnect switch
   k. pad_included / pad_detail — equipment pad/platform
   l. drain_line_included / drain_line_detail — condensate drain line

3. Extract ELECTRICAL SUB-GROUP (SAFETY-CRITICAL):
   Look specifically for electrical panel information:
   - panel_assessment_included: Does the bid assess the existing panel?
   - panel_upgrade_included: Does the bid include upgrading the panel?
   - dedicated_circuit_included: Does the bid include a dedicated circuit?
   - electrical_permit_included: Is a separate electrical permit included?
   - load_calculation_included: Is an electrical load calculation included?
   - existing_panel_amps: What's the current panel amperage? (integer, e.g. 100, 200)
   - proposed_panel_amps: If upgrading, what amperage? (integer)
   - breaker_size_required: What breaker size for the heat pump? (integer, amps)
   - panel_upgrade_cost: Cost of panel upgrade if quoted separately? (number)
   - electrical_notes: Any other electrical details or notes? (text)

   If the bid has NO electrical information: ALL 10 electrical fields = null.
   Do NOT assume or estimate panel amperage or breaker sizes.

4. Extract ACCESSORIES:
   Look for non-major-equipment items listed in the bid:
   - Thermostats (brand, model, type if given)
   - Surge protectors
   - UV lights / air purifiers
   - Any other accessories
   Each: {type, name, brand, model_number, description, cost}
   If no accessories mentioned: accessories = []

5. Extract LINE ITEMS:
   If the bid has a pricing breakdown, extract each line item:
   - item_type must be: equipment | labor | materials | permit | disposal | electrical | ductwork | thermostat | rebate_processing | warranty | other
   - description: what the line item is
   - amount: total cost for this item (number, no $ sign)
   - quantity: number of units (default 1 if not specified, null if unclear)
   - unit_price: price per unit (null if same as amount)
   - is_included: true if this item is in the bid scope, false if quoted as optional/extra
   - notes: any additional notes about this line item
   If the bid gives only a total with no breakdown: line_items = []

6. Write summary (1-3 sentences) and compile inclusions/exclusions arrays.

7. Extract PRICING (10 fields):
   - total_bid_amount: REQUIRED — the main bottom-line price. Flag if missing.
   - labor_cost, equipment_cost, materials_cost, permit_cost, disposal_cost, electrical_cost: Only if bid itemizes these separately. null if lump sum only.
   - total_before_rebates: Same as total_bid_amount unless bid shows a separate pre-rebate total.
   - estimated_rebates: Sum of any rebate amounts the contractor mentions in the bid. null if no rebates mentioned.
   - total_after_rebates: total_before_rebates minus estimated_rebates. null if no rebates.
   NOTE: equipment_cost here is the bid-stated cost — NEVER use web-researched pricing.

8. Extract PAYMENT TERMS (5 fields):
   - deposit_required: Dollar amount. If only percentage given, calculate from total_bid_amount.
   - deposit_percentage: Percentage (e.g. 50.0 for 50%). If only dollar amount given, calculate.
   - payment_schedule: Free-form text (e.g. "50% deposit, 50% on completion").
   - financing_offered: true if mentioned, false if not mentioned (use false, NOT null).
   - financing_terms: Description of terms. Only if financing_offered = true.

9. Extract WARRANTY (4 fields):
   - labor_warranty_years: Installer's labor warranty in years. SEPARATE from equipment warranty.
   - equipment_warranty_years: Manufacturer's parts warranty in years.
   - compressor_warranty_years: Compressor-specific warranty if stated separately (often longer). null if not separately stated.
   - additional_warranty_details: Registration requirements, limitations, transferability, extended options.

10. Extract TIMELINE (4 fields):
    - estimated_days: Installation duration in days. If range ("1-2 days"), use upper bound.
    - start_date_available: YYYY-MM-DD format. Must be specific date. null for vague ("2-3 weeks").
    - bid_date: YYYY-MM-DD. Date the proposal was issued.
    - valid_until: YYYY-MM-DD. Expiration date. If stated as duration ("30 days"), calculate from bid_date.

11. Set EXTRACTION METADATA (2 fields):
    - extraction_confidence: REQUIRED. "high" = clear PDF, all key fields found. "medium" = some unclear. "low" = poor quality, major gaps.
    - extraction_notes: Describe any issues, assumptions, missing sections. null if clean extraction.

12. Set system_type = "heat_pump" (always for this workflow).

CRITICAL REMINDERS:
- null != false. Null means "not mentioned." False means "explicitly excluded."
- Do NOT use web search — everything comes from the bid context
- Do NOT output equipment specs (brand, model, SEER) or contractor info (phone, license)
- Look for scope info EVERYWHERE in the bid, not just labeled "Scope" sections
- _detail fields should contain ACTUAL text from the bid, not AI-generated summaries
- For electrical fields: NEVER assume or estimate values — only extract what's explicitly stated
- All monetary values as plain numbers: 400.00 not "$400"
- All dates as YYYY-MM-DD: "2026-03-15" not "March 15, 2026"
- For line_items.item_type: MUST be one of the allowed enum values
- financing_offered defaults to false (NOT null) when not mentioned
- extraction_confidence is REQUIRED — always assess document quality

Return ONLY the JSON object. No other text.
```

---

## Complete Output Example — Comprehensive Bid

### Input (from Bid Data Extractor via {{#currentItem}})

```
Bay Area HVAC Pros — Bid Extraction

CONTRACTOR: Bay Area HVAC Pros
Phone: (408) 555-1234
License: CA #987654

EQUIPMENT:
- Carrier Infinity 24 Heat Pump, Model 24VNA036A003, 3 ton
- Carrier Air Handler, Model FE4ANF003L00
- Carrier Infinity Control Smart Thermostat

PRICING:
Total bid: $18,500
Equipment: $9,200
Labor: $5,500
Permit: $400
Disposal: $200
Thermostat: $350
Line set: $500
Equipment pad: $150
Electrical disconnect: $200

SCOPE OF WORK:
Includes:
- Removal and disposal of existing Lennox furnace and AC condenser
- Installation of new Carrier Infinity heat pump and air handler
- New smart thermostat installation (Carrier Infinity Control)
- Building permit filing and all inspection scheduling
- System startup and commissioning with refrigerant charge verification
- New composite equipment pad
- New condensate drain line
- Electrical disconnect installation
- New 30-foot copper line set (3/8" x 3/4")

Not Included:
- Ductwork modifications (existing ductwork in good condition)
- Electrical panel upgrade (if needed, quoted separately at $2,800)

ELECTRICAL NOTES:
- Current panel: 200A
- Dedicated 30A breaker for heat pump included
- No panel upgrade needed at this time
- Electrical permit included

WARRANTY:
10-year parts, 12-year compressor (with registration)
1-year labor warranty

PAYMENT:
No deposit mentioned. No financing mentioned.

TIMELINE:
No specific start date mentioned. No bid date or expiration found.
```

### Output
```json
{
  "contractor_name": "Bay Area HVAC Pros",

  "summary": "Full heat pump installation including removal of existing system, new thermostat, permits, commissioning, pad, drain line, line set, and disconnect. Excludes ductwork modifications and panel upgrade.",
  "inclusions": [
    "Removal and disposal of existing HVAC equipment",
    "Carrier Infinity heat pump and air handler installation",
    "Carrier Infinity Control smart thermostat",
    "Building permit and inspections",
    "System startup and commissioning with refrigerant charge verification",
    "Composite equipment pad",
    "Condensate drain line",
    "Electrical disconnect",
    "New 30-foot copper line set",
    "Dedicated 30A breaker",
    "Electrical permit"
  ],
  "exclusions": [
    "Ductwork modifications",
    "Electrical panel upgrade (quoted separately at $2,800)"
  ],

  "permit_included": true,
  "permit_detail": "Building permit filing and all inspection scheduling",
  "disposal_included": true,
  "disposal_detail": "Removal and disposal of existing Lennox furnace and AC condenser",
  "electrical_included": true,
  "electrical_detail": "Dedicated 30A breaker for heat pump, electrical disconnect installation",
  "ductwork_included": false,
  "ductwork_detail": "Existing ductwork in good condition — modifications not included",
  "thermostat_included": true,
  "thermostat_detail": "Carrier Infinity Control Smart Thermostat",
  "manual_j_included": null,
  "manual_j_detail": null,
  "commissioning_included": true,
  "commissioning_detail": "System startup and commissioning with refrigerant charge verification",
  "air_handler_included": true,
  "air_handler_detail": "Carrier Air Handler Model FE4ANF003L00",
  "line_set_included": true,
  "line_set_detail": "New 30-foot copper line set (3/8\" x 3/4\")",
  "disconnect_included": true,
  "disconnect_detail": "Electrical disconnect installation",
  "pad_included": true,
  "pad_detail": "New composite equipment pad",
  "drain_line_included": true,
  "drain_line_detail": "New condensate drain line",

  "panel_assessment_included": true,
  "panel_upgrade_included": false,
  "dedicated_circuit_included": true,
  "electrical_permit_included": true,
  "load_calculation_included": null,
  "existing_panel_amps": 200,
  "proposed_panel_amps": null,
  "breaker_size_required": 30,
  "panel_upgrade_cost": 2800.00,
  "electrical_notes": "Current panel 200A. Dedicated 30A breaker included. No panel upgrade needed. Panel upgrade quoted separately at $2,800 if needed.",

  "accessories": [
    {
      "type": "thermostat",
      "name": "Carrier Infinity Control Smart Thermostat",
      "brand": "Carrier",
      "model_number": null,
      "description": "WiFi smart thermostat",
      "cost": 350.00
    }
  ],

  "line_items": [
    {
      "item_type": "equipment",
      "description": "Carrier Infinity 24 Heat Pump + Air Handler",
      "amount": 9200.00,
      "quantity": 1,
      "unit_price": 9200.00,
      "is_included": true,
      "notes": null
    },
    {
      "item_type": "labor",
      "description": "Installation labor",
      "amount": 5500.00,
      "quantity": 1,
      "unit_price": 5500.00,
      "is_included": true,
      "notes": null
    },
    {
      "item_type": "permit",
      "description": "Building permit and inspections",
      "amount": 400.00,
      "quantity": 1,
      "unit_price": 400.00,
      "is_included": true,
      "notes": null
    },
    {
      "item_type": "disposal",
      "description": "Old equipment removal and disposal",
      "amount": 200.00,
      "quantity": 1,
      "unit_price": 200.00,
      "is_included": true,
      "notes": null
    },
    {
      "item_type": "thermostat",
      "description": "Carrier Infinity Control Smart Thermostat",
      "amount": 350.00,
      "quantity": 1,
      "unit_price": 350.00,
      "is_included": true,
      "notes": null
    },
    {
      "item_type": "materials",
      "description": "New copper line set (30 ft)",
      "amount": 500.00,
      "quantity": 1,
      "unit_price": 500.00,
      "is_included": true,
      "notes": null
    },
    {
      "item_type": "materials",
      "description": "Composite equipment pad",
      "amount": 150.00,
      "quantity": 1,
      "unit_price": 150.00,
      "is_included": true,
      "notes": null
    },
    {
      "item_type": "electrical",
      "description": "Electrical disconnect",
      "amount": 200.00,
      "quantity": 1,
      "unit_price": 200.00,
      "is_included": true,
      "notes": null
    }
  ],

  "system_type": "heat_pump",

  "total_bid_amount": 18500.00,
  "labor_cost": 5500.00,
  "equipment_cost": 9200.00,
  "materials_cost": 650.00,
  "permit_cost": 400.00,
  "disposal_cost": 200.00,
  "electrical_cost": 200.00,
  "total_before_rebates": 18500.00,
  "estimated_rebates": null,
  "total_after_rebates": null,

  "deposit_required": null,
  "deposit_percentage": null,
  "payment_schedule": null,
  "financing_offered": false,
  "financing_terms": null,

  "labor_warranty_years": 1,
  "equipment_warranty_years": 10,
  "compressor_warranty_years": 12,
  "additional_warranty_details": "Compressor warranty requires registration",

  "estimated_days": null,
  "start_date_available": null,
  "bid_date": null,
  "valid_until": null,

  "extraction_confidence": "high",
  "extraction_notes": null
}
```

**Key decisions in this example:**
- `electrical_included` = **true** — bid includes disconnect and dedicated circuit
- `ductwork_included` = **false** — bid explicitly says not included
- `manual_j_included` = **null** — bid doesn't mention Manual J at all
- `panel_upgrade_included` = **false** — bid says "not needed at this time" and quotes separately
- `panel_upgrade_cost` = **2800.00** — captured even though upgrade isn't in scope, because the bid quotes the cost
- `existing_panel_amps` = **200** — explicitly stated in bid
- `breaker_size_required` = **30** — explicitly stated ("30A breaker")
- Thermostat appears in both `accessories` (with brand/cost detail) and as scope boolean

---

## Complete Output Example — Minimal Scope Bid

### Input (from Bid Data Extractor via {{#currentItem}})

```
Budget HVAC Co — Bid Extraction

CONTRACTOR: Budget HVAC Co
Phone: (925) 555-4567

EQUIPMENT:
- Goodman GSZC180361 Heat Pump, 3 ton, 18 SEER

PRICING:
Total bid: $12,500 (equipment and labor)

NOTES:
"Price includes equipment and standard installation. Permits are the homeowner's
responsibility. Old equipment will be removed at no extra charge."
```

### Output
```json
{
  "contractor_name": "Budget HVAC Co",

  "summary": "Basic heat pump installation with old equipment removal. Permits are homeowner's responsibility. Most scope details not specified.",
  "inclusions": [
    "Equipment and standard installation",
    "Old equipment removal"
  ],
  "exclusions": [
    "Building permits (homeowner's responsibility)"
  ],

  "permit_included": false,
  "permit_detail": "Homeowner's responsibility",
  "disposal_included": true,
  "disposal_detail": "Old equipment removed at no extra charge",
  "electrical_included": null,
  "electrical_detail": null,
  "ductwork_included": null,
  "ductwork_detail": null,
  "thermostat_included": null,
  "thermostat_detail": null,
  "manual_j_included": null,
  "manual_j_detail": null,
  "commissioning_included": null,
  "commissioning_detail": null,
  "air_handler_included": null,
  "air_handler_detail": null,
  "line_set_included": null,
  "line_set_detail": null,
  "disconnect_included": null,
  "disconnect_detail": null,
  "pad_included": null,
  "pad_detail": null,
  "drain_line_included": null,
  "drain_line_detail": null,

  "panel_assessment_included": null,
  "panel_upgrade_included": null,
  "dedicated_circuit_included": null,
  "electrical_permit_included": null,
  "load_calculation_included": null,
  "existing_panel_amps": null,
  "proposed_panel_amps": null,
  "breaker_size_required": null,
  "panel_upgrade_cost": null,
  "electrical_notes": null,

  "accessories": [],

  "line_items": [],

  "system_type": "heat_pump",

  "total_bid_amount": 12500.00,
  "labor_cost": null,
  "equipment_cost": null,
  "materials_cost": null,
  "permit_cost": null,
  "disposal_cost": null,
  "electrical_cost": null,
  "total_before_rebates": 12500.00,
  "estimated_rebates": null,
  "total_after_rebates": null,

  "deposit_required": null,
  "deposit_percentage": null,
  "payment_schedule": null,
  "financing_offered": false,
  "financing_terms": null,

  "labor_warranty_years": null,
  "equipment_warranty_years": null,
  "compressor_warranty_years": null,
  "additional_warranty_details": null,

  "estimated_days": null,
  "start_date_available": null,
  "bid_date": null,
  "valid_until": null,

  "extraction_confidence": "medium",
  "extraction_notes": "Bid provides only a lump sum total with no line-item breakdown. No warranty, payment terms, timeline, or electrical information found."
}
```

**Key decisions in this example:**
- `permit_included` = **false** — bid explicitly says "homeowner's responsibility"
- `disposal_included` = **true** — "Old equipment will be removed at no extra charge"
- Everything else = **null** — not mentioned anywhere in the bid
- All 10 electrical fields = **null** — no electrical information in bid
- `accessories` = **[]** — no accessories mentioned
- `line_items` = **[]** — bid gives only a total, no breakdown
- `total_bid_amount` = **12500.00** — extracted from "Total bid: $12,500"
- `total_before_rebates` = **12500.00** — same as total (no rebates mentioned)
- `financing_offered` = **false** — not mentioned, so default false
- `extraction_confidence` = **"medium"** — price found but many fields missing
- All warranty/timeline/payment fields = **null** — nothing in bid

---

## Output → Supabase Column Mapping

Every output field maps 1:1 to `bid_scope` columns. **No transformation needed.**

| Output Field | DB Column | DB Type |
|---|---|---|
| `summary` | `bid_scope.summary` | TEXT |
| `inclusions` | `bid_scope.inclusions` | TEXT[] |
| `exclusions` | `bid_scope.exclusions` | TEXT[] |
| `permit_included` | `bid_scope.permit_included` | BOOLEAN |
| `permit_detail` | `bid_scope.permit_detail` | TEXT |
| `disposal_included` | `bid_scope.disposal_included` | BOOLEAN |
| `disposal_detail` | `bid_scope.disposal_detail` | TEXT |
| `electrical_included` | `bid_scope.electrical_included` | BOOLEAN |
| `electrical_detail` | `bid_scope.electrical_detail` | TEXT |
| `ductwork_included` | `bid_scope.ductwork_included` | BOOLEAN |
| `ductwork_detail` | `bid_scope.ductwork_detail` | TEXT |
| `thermostat_included` | `bid_scope.thermostat_included` | BOOLEAN |
| `thermostat_detail` | `bid_scope.thermostat_detail` | TEXT |
| `manual_j_included` | `bid_scope.manual_j_included` | BOOLEAN |
| `manual_j_detail` | `bid_scope.manual_j_detail` | TEXT |
| `commissioning_included` | `bid_scope.commissioning_included` | BOOLEAN |
| `commissioning_detail` | `bid_scope.commissioning_detail` | TEXT |
| `air_handler_included` | `bid_scope.air_handler_included` | BOOLEAN |
| `air_handler_detail` | `bid_scope.air_handler_detail` | TEXT |
| `line_set_included` | `bid_scope.line_set_included` | BOOLEAN |
| `line_set_detail` | `bid_scope.line_set_detail` | TEXT |
| `disconnect_included` | `bid_scope.disconnect_included` | BOOLEAN |
| `disconnect_detail` | `bid_scope.disconnect_detail` | TEXT |
| `pad_included` | `bid_scope.pad_included` | BOOLEAN |
| `pad_detail` | `bid_scope.pad_detail` | TEXT |
| `drain_line_included` | `bid_scope.drain_line_included` | BOOLEAN |
| `drain_line_detail` | `bid_scope.drain_line_detail` | TEXT |
| `panel_assessment_included` | `bid_scope.panel_assessment_included` | BOOLEAN |
| `panel_upgrade_included` | `bid_scope.panel_upgrade_included` | BOOLEAN |
| `dedicated_circuit_included` | `bid_scope.dedicated_circuit_included` | BOOLEAN |
| `electrical_permit_included` | `bid_scope.electrical_permit_included` | BOOLEAN |
| `load_calculation_included` | `bid_scope.load_calculation_included` | BOOLEAN |
| `existing_panel_amps` | `bid_scope.existing_panel_amps` | INTEGER |
| `proposed_panel_amps` | `bid_scope.proposed_panel_amps` | INTEGER |
| `breaker_size_required` | `bid_scope.breaker_size_required` | INTEGER |
| `panel_upgrade_cost` | `bid_scope.panel_upgrade_cost` | DECIMAL(10,2) |
| `electrical_notes` | `bid_scope.electrical_notes` | TEXT |
| `accessories` | `bid_scope.accessories` | JSONB |
| `line_items` | `bid_scope.line_items` | JSONB |
| **Pricing, Payment, Warranty, Timeline, Extraction** | | |
| `system_type` | `bid_scope.system_type` | TEXT |
| `total_bid_amount` | `bid_scope.total_bid_amount` | DECIMAL |
| `labor_cost` | `bid_scope.labor_cost` | DECIMAL |
| `equipment_cost` | `bid_scope.equipment_cost` | DECIMAL |
| `materials_cost` | `bid_scope.materials_cost` | DECIMAL |
| `permit_cost` | `bid_scope.permit_cost` | DECIMAL |
| `disposal_cost` | `bid_scope.disposal_cost` | DECIMAL |
| `electrical_cost` | `bid_scope.electrical_cost` | DECIMAL |
| `total_before_rebates` | `bid_scope.total_before_rebates` | DECIMAL |
| `estimated_rebates` | `bid_scope.estimated_rebates` | DECIMAL |
| `total_after_rebates` | `bid_scope.total_after_rebates` | DECIMAL |
| `deposit_required` | `bid_scope.deposit_required` | DECIMAL |
| `deposit_percentage` | `bid_scope.deposit_percentage` | DECIMAL(5,2) |
| `payment_schedule` | `bid_scope.payment_schedule` | TEXT |
| `financing_offered` | `bid_scope.financing_offered` | BOOLEAN |
| `financing_terms` | `bid_scope.financing_terms` | TEXT |
| `labor_warranty_years` | `bid_scope.labor_warranty_years` | INTEGER |
| `equipment_warranty_years` | `bid_scope.equipment_warranty_years` | INTEGER |
| `compressor_warranty_years` | `bid_scope.compressor_warranty_years` | INTEGER |
| `additional_warranty_details` | `bid_scope.additional_warranty_details` | TEXT |
| `estimated_days` | `bid_scope.estimated_days` | INTEGER |
| `start_date_available` | `bid_scope.start_date_available` | DATE |
| `bid_date` | `bid_scope.bid_date` | DATE |
| `valid_until` | `bid_scope.valid_until` | DATE |
| `extraction_confidence` | `bid_scope.extraction_confidence` | confidence_level ENUM |
| `extraction_notes` | `bid_scope.extraction_notes` | TEXT |

**Not in agent output (set by DB):** `id`, `bid_id`, `created_at`, `updated_at`
**Not in agent output (used for matching only):** `contractor_name` — used by Code Node, not stored in bid_scope

---

## Upsert Strategy

| Key | Value |
|-----|-------|
| Upsert key | `bid_id` (UNIQUE constraint) |
| Behavior | INSERT or UPDATE all scope columns. |
| Idempotency | Safe to re-run. Scope fields are deterministic from bid content. |

```sql
INSERT INTO bid_scope (bid_id,
  -- Summary
  summary, inclusions, exclusions,
  -- 12 scope boolean+detail pairs (24 columns)
  permit_included, permit_detail, disposal_included, disposal_detail,
  electrical_included, electrical_detail, ductwork_included, ductwork_detail,
  thermostat_included, thermostat_detail, manual_j_included, manual_j_detail,
  commissioning_included, commissioning_detail, air_handler_included, air_handler_detail,
  line_set_included, line_set_detail, disconnect_included, disconnect_detail,
  pad_included, pad_detail, drain_line_included, drain_line_detail,
  -- Electrical sub-group (10 columns)
  panel_assessment_included, panel_upgrade_included, dedicated_circuit_included,
  electrical_permit_included, load_calculation_included,
  existing_panel_amps, proposed_panel_amps, breaker_size_required,
  panel_upgrade_cost, electrical_notes,
  -- JSONB arrays
  accessories, line_items,
  -- System type
  system_type,
  -- Pricing (10)
  total_bid_amount, labor_cost, equipment_cost, materials_cost,
  permit_cost, disposal_cost, electrical_cost,
  total_before_rebates, estimated_rebates, total_after_rebates,
  -- Payment (5)
  deposit_required, deposit_percentage, payment_schedule,
  financing_offered, financing_terms,
  -- Warranty (4)
  labor_warranty_years, equipment_warranty_years,
  compressor_warranty_years, additional_warranty_details,
  -- Timeline (4)
  estimated_days, start_date_available, bid_date, valid_until,
  -- Extraction metadata (2)
  extraction_confidence, extraction_notes
)
VALUES (...)
ON CONFLICT (bid_id) DO UPDATE SET
  summary = EXCLUDED.summary,
  inclusions = EXCLUDED.inclusions,
  exclusions = EXCLUDED.exclusions,
  -- ... all 65 agent-output columns updated ...
  extraction_confidence = EXCLUDED.extraction_confidence,
  extraction_notes = EXCLUDED.extraction_notes,
  updated_at = now();
```

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No scope section in bid | All booleans = null. All details = null. summary = "No scope information found in bid." accessories = []. line_items = []. |
| Bid says "includes everything needed" | Set clearly mentioned items to true. Unspecified items stay null — vague language doesn't confirm specifics. |
| Scope item in line items only | If a line item shows "Permit: $400", permit_included = true and permit_detail = "Permit: $400". |
| "Electrical work" ambiguous | If bid says "includes electrical work" without specifying, set electrical_included = true. Electrical sub-group fields stay null unless specific panel/circuit info is given. |
| Thermostat listed in equipment but not scope | If a thermostat appears in the equipment list, thermostat_included = true. Also add to accessories array. |
| "Customer responsible for X" | Set that item to false — it's explicitly excluded. Detail = "Customer responsible". |
| Bid mentions "standard installation" | Don't assume what "standard" includes. Only set true for items explicitly listed. Others stay null. |
| Air handler in equipment list | If an air handler appears in the equipment list, air_handler_included = true. |
| Panel upgrade quoted separately | panel_upgrade_included = false (not in main scope). panel_upgrade_cost = quoted amount. Note in electrical_notes. |
| Multiple electrical mentions scattered throughout | Consolidate all electrical info into the electrical sub-group fields. Use electrical_notes for anything that doesn't fit the structured fields. |
| Line item without clear category | Use item_type = "other" and describe in description field. |
| Accessory cost not broken out | Set accessory cost = null. Still include the accessory with available info. |

---

## Validation Checklist (Supervised mode)

### Scope & Electrical (43 columns)
- [ ] All 12 scope booleans present in output (even if null)
- [ ] All 12 _detail fields present in output (even if null)
- [ ] All 10 electrical fields present in output (even if null)
- [ ] accessories array present (even if empty [])
- [ ] line_items array present (even if empty [])
- [ ] No scope boolean set to true without explicit mention in bid context
- [ ] No scope boolean set to false without explicit exclusion in bid context
- [ ] Unmentioned items are null (not false)
- [ ] _detail fields contain actual bid text (not AI-generated summaries)
- [ ] summary is concise (1-3 sentences)
- [ ] inclusions array contains only items actually listed as included
- [ ] exclusions array contains only items actually listed as excluded
- [ ] line_items.item_type values are all valid enum values

### Pricing, Payment, Warranty, Timeline & Extraction (26 columns)
- [ ] system_type present and set to "heat_pump"
- [ ] total_bid_amount present (flag in extraction_notes if null)
- [ ] All 10 pricing fields present (null when not itemized)
- [ ] All 5 payment fields present (financing_offered = false when not mentioned, NOT null)
- [ ] All 4 warranty fields present (null when not specified — do NOT confuse labor vs equipment vs compressor)
- [ ] All 4 timeline fields present (dates in YYYY-MM-DD, null for vague timeframes)
- [ ] extraction_confidence present and is one of: "high", "medium", "low"
- [ ] extraction_notes present (null if clean extraction, descriptive text if issues)

### General
- [ ] All monetary values are plain numbers (no $ sign, no commas)
- [ ] No equipment specs (brand, model, SEER) or contractor info in output
- [ ] JSON is valid (parseable, no trailing commas)
- [ ] contractor_name matches what's in the bid context
- [ ] Total field count: 65 agent-output fields + contractor_name = 66 keys in JSON

---

## Node File Location

`mindpal/nodes/scope-extractor.md` — this file is the source of truth for this node.
