# MindPal Node Inventory — Detailed Breakdown

> Each node maps to specific Supabase tables. This doc defines exactly what each
> node receives, what it outputs, and what schema doc it needs.
>
> Source of truth for table schemas: `docs/SCHEMA_V2_COMPLETE.html`
> Last updated: February 2026

---

## ⚠️ V2 Schema Restructure (Feb 2026) — KEY CHANGES

The database has been restructured. Key table changes:

1. **`bids`** = 18-column identity stub (status, request_id, storage_key, processing_attempts). Created by frontend at PDF upload time.
2. **`bid_scope`** = 69 columns (ALL extracted data). Expanded from 43 scope-only columns to include pricing (10), payment terms (5), warranty (4), timeline (4), extraction metadata (2), and system_type (1).
3. **`bid_contractors`** = contractor info (1:1 with bids)
4. **`bid_equipment`** = equipment specs (1:N with bids). FK is `bids(id)`.
5. **`contractor_questions`** = clarification questions (1:N with bids)
6. **Old `contractor_bids` table** = RENAMED to `bids`. All references to `contractor_bids` below are now `bids`.

**Document input pattern change**: MindPal now receives `documents_json` — a JSON array of `{bid_id, doc_url, mime_type}` objects pairing each PDF with its pre-created `bid_id`. This replaces the old flat URL array.

---

## Architecture: Bid Data Extractor as Context Provider

The **Bid Data Extractor does NOT output DB-ready JSON.** It reads each uploaded
bid PDF and produces rich, unstructured text/markdown context describing everything
in the bid — contractor info, equipment specs, pricing, scope, warranty, electrical,
timeline, payment terms.

This context is what downstream nodes reference via `@[Bid Data Extractor]` /
`{{#currentItem}}`. Each downstream node:
1. Parses the relevant information from the Extractor's unstructured context
2. (Optionally) enriches via web research
3. Outputs flat DB-ready JSON for its specific target table(s)

**Why this architecture?**
- The Bid Data Extractor runs fast — no JSON formatting overhead per table
- Each downstream node owns its own table schema and JSON output format
- Debugging is isolated: if equipment JSON is wrong, fix the Equipment Researcher, not the Extractor
- New tables can be added by creating new downstream nodes without modifying the Extractor

---

## NODE 1: Bid Data Extractor (Context Provider)

| | |
|---|---|
| **Type** | LOOP |
| **Input** | `documents_json` parsed objects — each iteration has `{bid_id, doc_url, mime_type}` |
| **Output** | Unstructured text/markdown context — NOT DB-ready JSON |
| **Populates** | ❌ No tables directly — serves as context for all downstream nodes |
| **Web Search** | OFF (extraction from document only) |
| **Model** | Claude Sonnet (needs multimodal PDF support) |

### V2 Change: bid_id Passthrough
The Bid Data Extractor now receives `bid_id` paired with each document via `@[item - bid_id]`.
It must include `bid_id` in its output so downstream nodes and the callback can route data
to the correct pre-created bid row. This eliminates the old pattern where bid_id was generated
inside the callback (which caused 409 FK timing errors).

### What This Node Does
Reads a single contractor bid PDF and extracts ALL information into rich text context:
contractor info, pricing, equipment specs, line items, scope of work, warranty,
electrical, timeline, payment terms. This is the heaviest extraction node — it creates
the foundation that all downstream nodes build on.

### What This Node Does NOT Do
- Does NOT output JSON formatted for any specific Supabase table
- Does NOT write to bids, bid_equipment, or other tables directly
- Does NOT need to know about database column names or types

### What Information It Extracts (as unstructured context)
- Contractor info: name, company, phone, email, license, website, years, certifications
- Pricing: total_bid_amount, labor, equipment, materials, permit, disposal, electrical, rebates
- Timeline & warranty: estimated_days, start_date, labor/equipment/compressor warranty
- Payment: deposit, financing, payment_schedule
- Scope of work: summary, inclusions, exclusions, specific scope items
- Electrical: panel assessment, upgrade, cost, amps, breaker, circuit, permit, notes
- Equipment: brand, model, capacity, ratings (whatever the PDF contains)
- Line items: itemized costs, descriptions, quantities

### Downstream Consumers
| Node | What it reads from Extractor context |
|------|-------------------------------------|
| Equipment Researcher | Equipment brand/model/specs → enriches via web → outputs `bid_equipment` JSON |
| Scope Extractor | Scope inclusions/exclusions/details + pricing/warranty/timeline → outputs `bid_scope` JSON (69 columns) |
| Contractor Researcher | Contractor name/company/license → enriches via web → outputs `bid_contractors` JSON |
| Incentive Finder | Location, equipment types → researches incentives → outputs `incentive_programs` JSON |
| All other nodes | Reference as background context for their specific tasks |

### Schema Docs Needed
- None — this node does not output DB-ready JSON

### Build Priority: **1st** (all other nodes depend on this context)

---

## NODE 2: Equipment Researcher

| | |
|---|---|
| **Type** | LOOP |
| **Input** | `@[Bid Data Extractor]` — unstructured context, one bid per iteration |
| **Populates** | `bid_equipment` (outputs DB-ready JSON per bid) |
| **Web Search** | ON |
| **Model** | GPT-4o mini or Claude Haiku |

### What This Node Does
Parses equipment details from the Bid Data Extractor's unstructured context,
identifies major HVAC equipment (heat pumps, condensers, furnaces, air handlers),
then fills specification gaps via targeted web research: SEER2/HSPF2/AFUE ratings,
Energy Star certification, model names, warranty periods, electrical specs.

### Target Table
**`bid_equipment`** — 28 agent-output columns

### Schema Doc
- `docs/BID_EQUIPMENT_SCHEMA.md` — ✅ EXISTS

### Node Spec
- `mindpal/nodes/equipment-researcher.md` — ✅ COMPLETE

### Status: **✅ READY TO BUILD IN MINDPAL**
(pending migration for system_role, afue_rating, fuel_type columns)

---

## NODE 3: Scope Extractor

| | |
|---|---|
| **Type** | LOOP |
| **Input** | `@[Bid Data Extractor]` — unstructured context, one bid per iteration |
| **Populates** | `bid_scope` (69 columns — ALL extracted data) |
| **Web Search** | OFF (extraction only — scope data comes exclusively from the bid PDF) |
| **Model** | Claude Haiku or GPT-4o mini |

### What This Node Does
Parses ALL extracted data from the Bid Data Extractor's unstructured context
and outputs flat JSON matching the `bid_scope` table columns (69 columns).
This is a pure extraction node — no web research. Everything comes from what the
contractor included/excluded in their bid document.

### V2 Change: Expanded to 69 Columns
In V2, `bid_scope` expanded from 43 scope-only columns to 69 columns. The 26 new
columns (pricing, payment, warranty, timeline, extraction metadata) were previously
on the `bids` table but are now on `bid_scope` so all extracted data lives together.

### Why a Separate Node (not part of Equipment Researcher)
- Equipment Researcher does web research; Scope Extractor does not
- Equipment data goes to `bid_equipment` table; scope data goes to `bid_scope` table
- Different models/costs — scope extraction is simpler and can use a cheaper model
- Separation of concerns: one node = one table (or tight column group)

### Target Table
**`bid_scope`** — 69 columns total:

**Scope Booleans + Details (24 columns — 12 pairs):**

| Column | Type | Description |
|--------|------|-------------|
| `permit_included` / `permit_detail` | BOOLEAN / TEXT | Permit fees and filing |
| `disposal_included` / `disposal_detail` | BOOLEAN / TEXT | Old equipment disposal |
| `electrical_included` / `electrical_detail` | BOOLEAN / TEXT | Electrical work |
| `ductwork_included` / `ductwork_detail` | BOOLEAN / TEXT | Ductwork modifications |
| `thermostat_included` / `thermostat_detail` | BOOLEAN / TEXT | New thermostat |
| `manual_j_included` / `manual_j_detail` | BOOLEAN / TEXT | Manual J load calc |
| `commissioning_included` / `commissioning_detail` | BOOLEAN / TEXT | System commissioning |
| `air_handler_included` / `air_handler_detail` | BOOLEAN / TEXT | Air handler |
| `line_set_included` / `line_set_detail` | BOOLEAN / TEXT | Refrigerant line set |
| `disconnect_included` / `disconnect_detail` | BOOLEAN / TEXT | Outdoor disconnect |
| `pad_included` / `pad_detail` | BOOLEAN / TEXT | Equipment pad |
| `drain_line_included` / `drain_line_detail` | BOOLEAN / TEXT | Condensate drain line |

**Electrical Sub-Group (10 columns)** — SAFETY-CRITICAL

**Summary Fields (3 columns):** `summary`, `inclusions`, `exclusions`

**JSONB Fields (2 columns):** `accessories`, `line_items`

**V2 Migrated Columns (26 columns):**
- System type (1): `system_type`
- Pricing (10): `total_bid_amount`, `labor_cost`, `equipment_cost`, `materials_cost`, `permit_cost`, `disposal_cost`, `electrical_cost`, `total_before_rebates`, `estimated_rebates`, `total_after_rebates`
- Payment (5): `deposit_required`, `deposit_percentage`, `payment_schedule`, `financing_offered`, `financing_terms`
- Warranty (4): `labor_warranty_years`, `equipment_warranty_years`, `compressor_warranty_years`, `additional_warranty_details`
- Timeline (4): `estimated_days`, `start_date_available`, `bid_date`, `valid_until`
- Extraction (2): `extraction_confidence`, `extraction_notes`

**Important:** All scope booleans default to NULL. NULL means "not specified in bid."
FALSE means "explicitly excluded by the contractor." This distinction matters for
question generation.

### Schema Doc
- `docs/SCHEMA_V2_COMPLETE.html` — ✅ Updated with full 69-column bid_scope

### Node Spec
- `mindpal/nodes/scope-extractor.md` — ✅ COMPLETE (updated for V2)

### Build Priority: **2nd** (runs in parallel with Equipment Researcher — both read from Extractor)

---

## NODE 4: Contractor Researcher

| | |
|---|---|
| **Type** | LOOP |
| **Input** | `@[Bid Data Extractor]` — unstructured context, one bid per iteration |
| **Populates** | `contractor_bids` (enriches contractor reputation fields) |
| **Web Search** | ON |
| **Model** | Claude Sonnet or Gemini 2.0 Pro |

### What This Node Does
Parses contractor name/company/license from the Bid Data Extractor's unstructured
context and researches their online reputation: Google reviews, Yelp, BBB rating,
license verification, certifications, red flags.

### Target Table
**`contractor_bids`** — enriches these specific columns (~20):

| Column | Type | What to Research |
|--------|------|-----------------|
| `contractor_google_rating` | DECIMAL(3,2) | Google Business rating |
| `contractor_google_review_count` | INTEGER | Number of Google reviews |
| `contractor_yelp_rating` | DECIMAL(3,2) | Yelp rating |
| `contractor_yelp_review_count` | INTEGER | Number of Yelp reviews |
| `contractor_bbb_rating` | TEXT | BBB letter grade (A+, A, B, etc.) |
| `contractor_bbb_accredited` | BOOLEAN | BBB accreditation status |
| `contractor_bbb_complaints_3yr` | INTEGER | BBB complaints in last 3 years |
| `contractor_bonded` | BOOLEAN | Whether contractor is bonded |
| `contractor_insurance_verified` | BOOLEAN | Insurance verification |
| `contractor_years_in_business` | INTEGER | Enriched/verified |
| `contractor_year_established` | INTEGER | Year company established |
| `contractor_employee_count` | TEXT | Company size |
| `contractor_service_area` | TEXT | Geographic coverage |
| `contractor_certifications` | TEXT[] | NATE, EPA 608, etc. |
| `contractor_certifications_detailed` | JSONB | Detailed cert info |
| `contractor_license_status` | TEXT | Active/Inactive/Expired |
| `contractor_license_expiration_date` | DATE | License expiry |
| `contractor_research_confidence` | INTEGER | 0-100 confidence |
| `contractor_verification_date` | DATE | Date of research |
| `contractor_research_notes` | TEXT | Research notes |
| `red_flags` | JSONB | Array of concerns found |
| `positive_indicators` | JSONB | Array of positive findings |

### Schema Doc Needed
- `docs/CONTRACTOR_BIDS_SCHEMA.md` — ❌ NOT YET CREATED
  (this node only touches the contractor research subset, but the schema doc covers the whole table)

### Build Priority: **4th** (after Extractor + Equipment Researcher + Scope Extractor)

---

## NODE 5: Incentive Finder

| | |
|---|---|
| **Type** | AGENT (not Loop) |
| **Input** | `@[Bid Data Extractor]` + `@[Equipment Researcher]` |
| **Populates** | `incentive_programs` (N rows) + `contractor_bids` (incentive summary fields) |
| **Web Search** | ON |
| **Model** | Claude Sonnet or Gemini 2.0 Pro |

### What This Node Does
Researches available incentives for the homeowner's location and equipment: federal
tax credits (25C/25D), state rebates, HEEHRA income-qualified rebates, utility
programs, manufacturer rebates. This is a JOB-LEVEL lookup, not per-bid.

### Why Agent Node (not Loop)
Incentives are location-based, not bid-based. The same federal tax credit and utility
programs apply to ALL bids for this property. Running this per-bid would duplicate
searches and produce conflicting results. One research pass covers all.

### Target Tables

**`incentive_programs`** — 15 agent-output columns per incentive found:

| Column | Type | Description |
|--------|------|-------------|
| `program_name` | TEXT, NOT NULL | Program name |
| `program_type` | TEXT, NOT NULL | federal, state, utility, local, manufacturer |
| `incentive_amount_numeric_min` | DECIMAL(12,2) | Minimum incentive amount |
| `incentive_amount_numeric_max` | DECIMAL(12,2) | Maximum incentive amount |
| `incentive_amount_string` | TEXT | Human-readable amount description |
| `equipment_requirements` | TEXT | Required equipment specs for eligibility |
| `eligibility_requirements` | TEXT | Other eligibility criteria |
| `income_limits` | TEXT | Income qualification if applicable |
| `application_process` | TEXT | How to apply |
| `can_stack_with_other_incentives` | BOOLEAN | Stackability |
| `stacking_notes` | TEXT | Stacking details |
| `verification_source` | TEXT | Where this info was found |
| `still_active` | BOOLEAN | Whether program is currently active |
| `research_confidence` | TEXT | high/medium/low |
| `research_notes` | TEXT | Research notes |

**`contractor_bids`** — incentive summary fields (written per bid):

| Column | Type | Description |
|--------|------|-------------|
| `incentive_electric_utility` | TEXT | Identified electric utility |
| `incentive_gas_utility` | TEXT | Identified gas utility |
| `incentive_cca` | TEXT | Community Choice Aggregation |
| `incentive_ren` | TEXT | Regional Energy Network |
| `incentive_total_potential_low` | DECIMAL(12,2) | Minimum total incentive estimate |
| `incentive_total_potential_high` | DECIMAL(12,2) | Maximum total incentive estimate |
| `incentive_programs_found_count` | INTEGER | Number of programs found |
| `incentive_research_confidence` | TEXT | Research confidence |
| `incentive_research_notes` | TEXT | Research notes |

### Schema Doc Needed
- `docs/INCENTIVE_PROGRAMS_SCHEMA.md` — ❌ NOT YET CREATED

### Build Priority: **5th**

---

## NODE 6: Scoring Engine

| | |
|---|---|
| **Type** | AGENT (not Loop) |
| **Input** | `@[Equipment Researcher]` + `@[Contractor Researcher]` + `@[Incentive Finder]` + user priorities |
| **Populates** | `contractor_bids` (score fields) |
| **Web Search** | OFF |
| **Model** | GPT-4o or Claude Sonnet |

### What This Node Does
Scores and ranks all bids against each other using the homeowner's stated priorities
(price, efficiency, warranty, contractor reputation, etc.). Produces overall score,
sub-scores, and a recommendation.

### Why Agent Node (not Loop)
**Cannot score in isolation.** Scoring requires cross-bid comparison — "Bid A is 20%
cheaper than Bid B" and "Bid C has the highest efficiency." The Scoring Engine needs
ALL bids simultaneously to produce relative rankings.

### Target Table
**`contractor_bids`** — score fields per bid:

| Column | Type | Description |
|--------|------|-------------|
| `overall_score` | DECIMAL(5,2) | Weighted overall score |
| `value_score` | DECIMAL(5,2) | Price/value sub-score |
| `quality_score` | DECIMAL(5,2) | Equipment/contractor quality sub-score |
| `completeness_score` | DECIMAL(5,2) | Bid completeness sub-score |
| `score_confidence` | DECIMAL(5,2) | Confidence in scoring |
| `scoring_notes` | TEXT | Explanation of scoring |
| `ranking_recommendation` | TEXT | Overall recommendation text |

### Schema Doc Needed
- Part of `docs/CONTRACTOR_BIDS_SCHEMA.md` — ❌ NOT YET CREATED

### Build Priority: **6th**

---

## NODE 7: Question Generator

| | |
|---|---|
| **Type** | **AGENT** (not Loop — needs cross-bid context) |
| **Input** | `@[Equipment Researcher]`, `@[Contractor Researcher]`, `@[Incentive Finder]`, `@[Scoring Engine]`, `@[API Input - user_priorities]` |
| **Populates** | `contractor_questions` (N rows per bid) |
| **Web Search** | OFF |
| **Model** | Claude Sonnet |

### What This Node Does
Generates specific, actionable questions for the homeowner to ask each contractor.
Questions are triggered by missing information, scope gaps, price anomalies, red
flags, and cross-bid comparisons. Uses a 4-tier system (essential, clarification,
detailed, expert) with 7 question categories including electrical.

### Why Agent Node (not Loop)
Questions require cross-bid context: "Your price is $4,200 higher than Contractor A"
and "Contractor B includes electrical panel assessment but your bid doesn't mention it."
These comparisons are impossible in a Loop that sees only one bid at a time.

### Target Table
**`contractor_questions`** — agent-output columns:

| Column | Type | Description |
|--------|------|-------------|
| `question_text` | TEXT, NOT NULL | The actual question |
| `question_category` | TEXT | pricing, warranty, equipment, timeline, scope, credentials, **electrical** |
| `question_tier` | TEXT | essential, clarification, detailed, expert |
| `priority` | TEXT | high, medium, low |
| `context` | TEXT | Why this question was generated |
| `triggered_by` | TEXT | missing_field, scope_difference, price_variance, unclear_term, red_flag, negotiation, electrical, standard_essential, technical_verification |
| `good_answer_looks_like` | TEXT | What a good answer would be |
| `concerning_answer_looks_like` | TEXT | What a concerning answer would be |
| `missing_field` | TEXT | Which field triggered this (if applicable) |
| `generation_notes` | TEXT | Agent notes |
| `display_order` | INTEGER | Sort order for display |

### Node Spec
- `mindpal/nodes/question-generator.md` — ✅ COMPLETE (v2 with 4-tier system)

### Build Priority: **7th** (⚠️ Restored from degraded v10 single-line instructions)

---

## NODE 8: Per-Bid FAQ Generator

| | |
|---|---|
| **Type** | LOOP |
| **Input** | All prior nodes |
| **Populates** | `bid_faqs` (N rows per bid) |
| **Web Search** | OFF |
| **Model** | Claude Haiku or GPT-4o mini |

### What This Node Does
Generates frequently asked questions and answers specific to each contractor's bid.
"What does Contractor A's warranty cover?" "Is Contractor B's pricing typical?"

### Target Table
**`bid_faqs`** — agent-output columns:

| Column | Type | Description |
|--------|------|-------------|
| `question` | TEXT, NOT NULL | The FAQ question |
| `answer` | TEXT, NOT NULL | The FAQ answer |
| `category` | TEXT | FAQ category |
| `answer_confidence` | TEXT | Confidence in the answer |
| `sources` | TEXT[] | Sources used |
| `display_order` | INTEGER | Sort order |

### Schema Doc Needed
- `docs/BID_FAQS_SCHEMA.md` — ❌ NOT YET CREATED

### Build Priority: **8th**

---

## NODE 9: Overall FAQ Generator

| | |
|---|---|
| **Type** | AGENT (not Loop) |
| **Input** | All prior nodes |
| **Populates** | `project_faqs` (N rows per project) |
| **Web Search** | OFF |
| **Model** | Claude Haiku or GPT-4o mini |

### What This Node Does
Generates project-level FAQs that span across all bids. "How do the bids compare on
efficiency?" "What's the difference between SEER and SEER2?" "Should I worry about
electrical panel upgrades?"

### Why Agent Node (not Loop)
FAQs are job-level, not per-bid. They synthesize across all bids to answer comparison
questions. Running per-bid would miss the cross-cutting perspective.

### Target Table
**`project_faqs`** — agent-output columns:

| Column | Type | Description |
|--------|------|-------------|
| `question` | TEXT, NOT NULL | The FAQ question |
| `answer` | TEXT, NOT NULL | The FAQ answer |
| `category` | TEXT | FAQ category |
| `sources` | TEXT[] | Sources used |
| `display_order` | INTEGER | Sort order |

Note: `project_faqs` does NOT have `answer_confidence` (unlike `bid_faqs`). This is
intentional — overall FAQs synthesize across all bids so per-answer confidence is
less meaningful.

### Schema Doc Needed
- `docs/PROJECT_FAQS_SCHEMA.md` — ❌ NOT YET CREATED

### Build Priority: **9th** (last AI node, lowest complexity)

---

## NODE 10: Supabase Insert (Code Node)

| | |
|---|---|
| **Type** | CODE (not AI) |
| **Input** | All node outputs |
| **Populates** | All tables (executes the actual DB writes) |

### What This Node Does
Deterministic JavaScript. Receives all AI node outputs as string inputs, parses
each, and makes HTTP POST/PATCH calls to the Supabase REST API.

### V2 Insert Strategy
In V2, `bid_id` is pre-created by the frontend at PDF upload time. The callback UPDATEs
existing rows instead of INSERTing new ones. FK timing errors are eliminated.

1. `bids` → UPDATE existing row (set status, contractor_name)
2. `bid_scope` → UPSERT on bid_id (all 69 columns of extracted data)
3. `bid_contractors` → UPSERT on bid_id
4. `bid_equipment` → DELETE + INSERT using `bid_id`
5. `contractor_questions` → INSERT using `bid_id`
6. `bid_faqs` → INSERT using `bid_id`
7. `project_faqs` → INSERT using `project_id`

### Schema Doc Needed
- None (code, not AI) — but needs the Supabase REST API URL and service key

### Build Priority: **Last** (after all AI nodes are spec'd and tested)

---

## Schema Documentation

**Primary schema reference:** `docs/SCHEMA_V2_COMPLETE.html` — comprehensive HTML doc covering all tables with column details, relationships, indexes, and V2 migration notes.

Individual table schema docs (where they exist):

| Table | Schema Doc | Status |
|-------|-----------|--------|
| ALL tables | `docs/SCHEMA_V2_COMPLETE.html` | ✅ Complete (V2 updated) |
| `bid_equipment` | `docs/BID_EQUIPMENT_SCHEMA.md` | ✅ Exists |
| `bids` | In SCHEMA_V2_COMPLETE.html | ✅ (18-col identity stub) |
| `bid_scope` | In SCHEMA_V2_COMPLETE.html | ✅ (69 columns) |
| `bid_contractors` | In SCHEMA_V2_COMPLETE.html | ✅ |
| `contractor_questions` | In SCHEMA_V2_COMPLETE.html | ✅ |
