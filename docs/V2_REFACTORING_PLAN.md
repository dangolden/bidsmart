# BidSmart Refactor — Fresh Supabase Project + Schema Restructure + Front-End Alignment

## Context

The BidSmart app has evolved rapidly, and the central `contractor_bids` table has become a 98-column "god table" mixing 7+ distinct data domains. The front-end loads all 98 columns for every view even though each tab only uses 10-20 fields. This creates ambiguity, errors, and fragility.

**Approach:** Create a **brand new Supabase project** AND a **new version of the app** (fresh codebase, not a branch merge to main). The scope of changes is too large for a branch merge — it's easier and safer to launch v2 as a new app. The old project + old app stay intact as reference. Current data is mostly test/demo and does not need to be preserved.

**Goal:** Decompose `contractor_bids` into clean, single-responsibility tables aligned with the front-end's three main sections (**Equipment**, **Contractor**, **Scope**) plus a new **Energy** sub-section.

**Source of truth:** `docs/SUPABASE_TABLE_FIELD_AUDIT.html`

---

## 1. Executive Summary

**Create a fresh Supabase project** and build the schema from scratch with these changes:

**The big change — split the 98-column `contractor_bids` into 4 focused tables:**
- **`bids`** (slimmed to ~30 cols) — pricing, payment, warranty, timeline, metadata
- **`bid_contractors`** (NEW, ~25 cols) — contractor company info, ratings, credentials
- **`bid_scope`** (NEW, ~39 cols) — scope booleans + details, inclusions/exclusions, AND all electrical scope work
- **`bid_scores`** (NEW, ~10 cols) — scores, red flags, positive indicators

**Key renames:**
- `contractor_bids` -> `bids` (shorter, clearer)
- `bid_questions` -> `contractor_questions` (clearer who the questions are for)
- `rebate_programs` -> `incentive_program_database` (covers rebates, tax credits, utility programs — with geo columns)
- `incentive_programs` + `project_rebates` -> `project_incentives` (one unified table per project)

**Hardcode into app (remove from DB):** `qii_checklist_items` (16 static ACCA/ANSI checklist items) — add printable PDF checklist

**NEW — Community Data Layer:** When users opt in via "Help other homeowners," anonymized bid data populates `community_contractors` and `community_bids` tables accessible in admin interface.

**Restructure `bid_equipment`:** Add `system_role`, `afue_rating`, `fuel_type` for function-based comparison (heat pump vs furnace+AC). Add `system_type` to `bids`. Accessories stored as JSONB on `bid_scope`.

**Keep unchanged:** `bid_faqs`, `project_faqs`, `project_qii_checklist`

**Bring over as-is:** `projects`, `users_ext`, `pdf_uploads`, `project_requirements`, auth/admin tables, analytics

**Drop:** `bid_analysis`, `mindpal_extractions`, `incentive_*` summary columns on old contractor_bids, `bid_electrical` (merged into `bid_scope`)

Create **6 SQL views** for pre-joined front-end queries. No more N+1 waterfalls.

---

## 2. Table Inventory by Category

The current Supabase project has **24 tables**. Below is the complete inventory organized by who uses each table, plus new tables being added.

### USER DATA — Per-user/per-project tables (require auth, have RLS)

| Table | Cols | Purpose | Disposition |
|---|---|---|---|
| `users_ext` | 24 | User profiles + property info | Keep as-is |
| `projects` | 36 | Heat pump installation projects | Keep as-is (includes `data_sharing_consent`) |
| `pdf_uploads` | 15 | PDF upload tracking + MindPal job IDs | Keep as-is |
| `project_requirements` | 15 | User priorities questionnaire | Keep as-is |
| `contractor_bids` | 98 | **GOD TABLE** — bids from contractors | **SPLIT into 4 tables** (see Section 5) |
| `bid_equipment` | 28 | Equipment specs per bid (1:N, per device) | **Restructure:** add `system_role`, `afue_rating`; move accessories out |
| `bid_line_items` | 14 | Itemized cost breakdown per bid | Keep (future UI) |
| `bid_questions` | 18 | Clarification questions per bid | **Rename -> `contractor_questions`** |
| `bid_faqs` | 10 | Per-bid FAQs | Keep as-is |
| `project_faqs` | 8 | Project-level comparison FAQs | Keep as-is |
| `project_rebates` | 11 | Per-project rebate eligibility | **Merge -> `project_incentives`** |
| `incentive_programs` | 18 | AI-discovered incentives per bid | **Merge -> `project_incentives`** |
| `project_qii_checklist` | 8 | Per-project QII verification tracking | Keep (FK changes to `item_key` TEXT) |
| `contractor_installation_reviews` | 20 | Post-installation homeowner reviews | Keep as-is (FK -> `bids`) |
| `user_feedback` | 7 | Early access feedback (liked/wishlist/bug) | Keep as-is |

### REFERENCE DATA — Read-only, app-wide (no user ownership)

| Table | Cols | Purpose | Disposition |
|---|---|---|---|
| `rebate_programs` | 18 | Master database of incentives | **Rename -> `incentive_program_database`** + add geo columns |
| `qii_checklist_items` | 8 | 16 static ACCA/ANSI checklist items | **HARDCODE into app, drop from DB** |

### COMMUNITY DATA — Anonymized, aggregated from opted-in users (NEW)

| Table | Cols | Purpose | Disposition |
|---|---|---|---|
| `community_contractors` | ~12 | **NEW** — Anonymized contractor data from consenting users | Admin-accessible |
| `community_bids` | ~15 | **NEW** — Anonymized pricing + scope data from consenting users | Admin-accessible |

### ADMIN / SYSTEM — Internal operations (service role only)

| Table | Cols | Purpose | Disposition |
|---|---|---|---|
| `analytics_events` | 12 | User interaction tracking | Keep as-is |
| `admin_users` | 7 | Admin portal accounts | Keep as-is |
| `admin_sessions` | 5 | Admin session management | Keep as-is |
| `email_verifications` | 8 | Email verification codes | Keep as-is |
| `verified_sessions` | 7 | Verified email sessions | Keep as-is |

### DROP (not bringing to new project)

| Table | Cols | Reason |
|---|---|---|
| `bid_analysis` | 18 | Legacy — FAQs/questions/scores now in dedicated tables |
| `mindpal_extractions` | 8 | Debug artifact — raw JSON audit trail |

**Note:** `quality_alerts` does NOT exist in any migration — it was a planned concept never implemented.

---

## 3. Focused Structural Findings (from Audit)

### 3.1 contractor_bids Is a God Table (98 cols, 7 domains)

Per the audit, this single table mixes:
- **Contractor Info** (27 cols) — 16 have "partial/issue" status
- **Pricing** (10 cols) — all populated and working
- **Payment** (6 cols) — all populated
- **Warranty & Timeline** (9 cols) — working except `quote_date` (never populated duplicate)
- **Scope** (16 cols) — all populated
- **Electrical** (10 cols) — all populated
- **Scoring** (9 cols) — 3 partial (missing from insert path)
- **Incentive Summary** (9 cols) — NOT READ by any front-end component
- **Metadata** (7 cols) — system + user actions

### 3.2 Ghost Columns: scope_*_detail

TypeScript defines 12 `scope_*_detail` string fields (types/index.ts lines 280-291) and `ComparePhase.tsx` reads them, but **no migration creates these columns**. They always return null. The new `bid_scope` table will create them properly.

### 3.3 Orphaned Incentive Summary (9 cols)

The `incentive_*` columns on contractor_bids are not read by any component. `IncentivesTable.tsx` reads from `rebate_programs`. These will not be carried over.

### 3.4 ElectricalComparisonTable Exists But Is Never Rendered

Fully built component reading electrical fields, but never imported by any parent. Will be activated as a sub-table in the Scope tab, pulling from electrical columns within `bid_scope`.

### 3.5 bid_line_items Has No UI

CRUD exists in service but no component renders line items. Keep the table for future cost detail views.

### 3.6 bid_faqs Callback Field Name Mismatch

Callback sends `question_text`/`answer_text` but DB columns are `question`/`answer`. Causes silent failures.

### 3.7 bid_questions: 4 Fields Displayed But Never Populated

`context`, `triggered_by`, `good_answer_looks_like`, `concerning_answer_looks_like` render in UI but no extraction node outputs them.

---

## 4. Design Decisions

### D1: Electrical merged INTO bid_scope (not a separate table)

All 10 `electrical_*` columns move into `bid_scope` as a sub-group. The rationale:

- **Both are 1:1 per bid** — one scope assessment, one electrical assessment
- **All 10 columns are scope questions** — "Is the contractor including panel upgrade / circuit install / electrical permit?" These are contractor scope of work items, not equipment specifications.
- **In the UI:** The Scope tab will have two visual sub-tables, both pulling from the same `bid_scope` table:
  - **Scope Comparison** — the 12 boolean+detail pairs (permit, disposal, ductwork, etc.)
  - **Electrical Work** — the electrical scope columns (panel upgrade, circuit, permits)
- **Equipment table keeps:** `amperage_draw`, `minimum_circuit_amperage`, `voltage` on `bid_equipment` — these are per-device manufacturer specs ("what does the heat pump need?")
- **MindPal:** Node 1 extracts both scope and electrical from the bid PDF. The mapper already handles them in the same `mapV8BidToDatabase()` call, so merging them into one table simplifies the insert path.

**Column classification within bid_scope:**

| Classification | Columns | Count |
|---|---|---|
| Scope booleans | `electrical_included` (scope bool), `panel_assessment_included`, `panel_upgrade_included`, `dedicated_circuit_included`, `electrical_permit_included`, `load_calculation_included` | 6 |
| Assessment data | `existing_panel_amps`, `proposed_panel_amps`, `breaker_size_required` | 3 |
| Pricing | `panel_upgrade_cost` | 1 |
| Notes | `electrical_notes` | 1 |

All 11 fit naturally as a "Electrical Work" sub-group within bid_scope.

### D2: Incentive architecture

**Two tables, clear separation:**

1. **`incentive_program_database`** (master reference) — The growing database of all known incentive programs. Seeded with 3 programs today. MindPal should check this database FIRST before searching the web, then add newly discovered programs to it. **New geo columns** (`available_states`, `available_zip_codes`, `available_utilities` — these already exist on old `rebate_programs`, will be carried over and expanded).

2. **`project_incentives`** (per-project) — All incentives applicable to a specific project, whether matched from the database, discovered by AI, or added manually by the user. Has `equipment_types_eligible` TEXT[] to handle "heat pump qualifies but furnace doesn't" scenarios.

**Data flow:** MindPal Incentive Finder node -> checks `incentive_program_database` by geo -> searches web for new ones -> writes new finds to both `incentive_program_database` (cache for future) AND `project_incentives` (for this project).

### D3: QII checklist — hardcoded + printable

- Remove `qii_checklist_items` table from DB
- Create `src/lib/constants/qiiChecklist.ts` with all 16 items
- `project_qii_checklist` stays in Supabase (FK changes from UUID to `item_key` TEXT)
- **NEW: Printable checklist** — Add a "Print Checklist" button to QIIChecklist component that generates a clean, printable PDF/page with all 16 items, categories, and checkboxes. Homeowner can print and hand to contractor or use during inspection.

### D4: Community data layer (data sharing)

When `projects.data_sharing_consent = true`, a trigger/function populates anonymized community tables on bid creation/update:

**`community_contractors`** — Anonymized contractor market data + user review ratings
| Group | Fields |
|---|---|
| System | `id` (PK), `created_at`, `updated_at` |
| Geo | `state`, `zip_code_area` (first 3 digits only), `service_area` |
| Profile | `years_in_business`, `employee_count`, `certifications` (TEXT[]) |
| Public Ratings | `google_rating`, `yelp_rating`, `bbb_rating`, `bbb_accredited` |
| **BidSmart Review** | `bidsmart_overall_rating` (INT 1-5), `bidsmart_quality_rating` (INT 1-5), `bidsmart_professionalism_rating` (INT 1-5), `bidsmart_communication_rating` (INT 1-5), `bidsmart_timeliness_rating` (INT 1-5), `bidsmart_would_recommend` (BOOL), `bidsmart_completed_on_time` (BOOL), `bidsmart_stayed_within_budget` (BOOL) |
| Source | `source_project_id` (FK, for admin dedup only — not exposed in UI) |

**`community_bids`** — Anonymized pricing + scope benchmarks
| Group | Fields |
|---|---|
| System | `id` (PK), `community_contractor_id` (FK), `created_at`, `bid_date` |
| Geo | `state`, `zip_code_area` (first 3 digits only) |
| Pricing | `total_bid_amount`, `labor_cost`, `equipment_cost`, `materials_cost`, `total_after_rebates` |
| Equipment | `equipment_type` (heat_pump/furnace_ac/etc), `primary_seer_rating`, `primary_capacity_tons` |
| Scope summary | `scope_items_included_count` (INT), `includes_permit`, `includes_electrical`, `includes_ductwork` (key scope booleans) |
| Warranty | `labor_warranty_years`, `equipment_warranty_years` |
| Timeline | `estimated_days` |
| Source | `source_bid_id` (FK, for admin dedup only — not exposed) |

**What's NOT stored:** Names, addresses, emails, phone numbers, exact ZIP codes, contractor company names, PDF documents, user notes, red flags.

**Admin interface:** Read-only dashboard showing:
- Average bid prices by region (ZIP area)
- Contractor rating distributions (Google/Yelp/BBB + BidSmart user reviews)
- BidSmart review trends (would recommend %, on-time %, within-budget %)
- Scope inclusion rates (what % include permits, ductwork, etc.)
- Equipment trends (most common SEER ratings, brands)
- Price trends over time

**Trigger logic:** When a bid is created/updated AND the parent project has `data_sharing_consent = true`, an `after_insert_or_update` trigger on `bids` calls a function that:
1. Checks `projects.data_sharing_consent`
2. If true, upserts anonymized data into `community_contractors` + `community_bids`
3. Uses `source_bid_id` to prevent duplicates on updates

### D5: Table naming — clear but simple

With only ~25 tables total, prefixes like `ref_` or `sys_` add noise without much benefit. Instead:
- **Group tables by comments in the migration SQL** (clear section headers)
- **Table names themselves tell the story:**
  - `bid_*` = per-bid data (child of `bids`)
  - `project_*` = per-project data (child of `projects`)
  - `community_*` = anonymized aggregate data
  - `admin_*` = admin-only tables
  - Standalone names = core entities (`users_ext`, `projects`, `bids`)
  - `incentive_program_database` = obviously a reference/lookup table by its name
- **The migration SQL will have clear section comments:**
  ```sql
  -- ========================================
  -- USER DATA TABLES
  -- ========================================

  -- ========================================
  -- REFERENCE DATA TABLES
  -- ========================================

  -- ========================================
  -- COMMUNITY DATA TABLES (anonymized)
  -- ========================================

  -- ========================================
  -- ADMIN / SYSTEM TABLES
  -- ========================================
  ```

### D6: Equipment redesign — Major vs. Accessories + System Type

**The problem:** A heat pump is ONE device that does both heating and cooling. A traditional system is TWO devices (furnace + AC). The current `bid_equipment` table treats all equipment as a flat array with no concept of "this is the primary system" vs "this is an accessory." The front-end only shows ONE equipment item per bid (using `.find('outdoor_unit')`), ignoring everything else.

Additionally, MindPal already extracts a `system_type` field per equipment item, but it's never stored in the database.

**The solution: Split `bid_equipment` into two tables + add system_type to `bids`**

#### New field on `bids`: `system_type`

Add `system_type` (TEXT) to the `bids` table to categorize what kind of HVAC system the bid proposes:
- `'heat_pump'` — Single heat pump system (heating + cooling)
- `'furnace_ac'` — Traditional furnace + AC combo
- `'mini_split'` — Ductless mini-split system
- `'hybrid'` — Heat pump + backup furnace
- `'boiler'` — Boiler-based system
- `'other'`

This enables the comparison grid header to show "Bid A: Heat Pump" vs "Bid B: Furnace + AC" and determines which incentives apply.

#### Table 1: `bid_equipment` (RESTRUCTURED — major HVAC appliances only)

**Purpose:** Primary HVAC equipment being compared. These are the big-ticket items: heat pump units, furnaces, AC condensers, air handlers.

| Group | Fields |
|---|---|
| System | `id` (PK), `bid_id` (FK -> bids, CASCADE), `created_at` |
| Identity | `equipment_type` (TEXT: 'heat_pump', 'outdoor_unit', 'indoor_unit', 'air_handler', 'furnace', 'condenser'), `system_role` (TEXT: 'primary_heating', 'primary_cooling', 'primary_both', 'secondary', 'air_distribution') |
| Brand/Model | `brand`, `model_number`, `model_name` |
| Capacity | `capacity_btu` (INT), `capacity_tons` (DECIMAL) |
| Efficiency | `seer_rating`, `seer2_rating`, `hspf_rating`, `hspf2_rating`, `eer_rating`, `cop`, `afue_rating` (DECIMAL — NEW, for furnaces), `fuel_type` (TEXT — NEW: 'electric', 'natural_gas', 'propane', 'oil') |
| Features | `variable_speed` (BOOL), `stages` (INT), `refrigerant_type` (TEXT), `sound_level_db` (DECIMAL) |
| Electrical | `voltage` (INT), `amperage_draw` (INT), `minimum_circuit_amperage` (INT) |
| Energy Star | `energy_star_certified` (BOOL), `energy_star_most_efficient` (BOOL) |
| Warranty | `warranty_years` (INT), `compressor_warranty_years` (INT) |
| Pricing | `equipment_cost` (DECIMAL) |
| Extraction | `confidence` (confidence_level ENUM) |

**Key changes from current bid_equipment:**
- Added `system_role` — identifies what role this equipment plays in the HVAC system
- Added `afue_rating` — Annual Fuel Utilization Efficiency for furnaces (heat pumps use HSPF, furnaces use AFUE)
- Added `'furnace'` and `'condenser'` to equipment_type values
- Removed accessory types ('thermostat', 'line_set', 'disconnect', 'pad') — they go to `bid_scope.accessories` JSONB

**How system comparison works:**

| Bid A: Heat Pump | Bid B: Furnace + AC |
|---|---|
| Heat pump outdoor unit (primary_both) | AC condenser (primary_cooling) |
| Air handler (air_distribution) | Furnace (primary_heating) |
| | Air handler (air_distribution) |

The `system_role` field enables the UI to align rows for comparison: show "Primary Heating" across bids (heat pump vs furnace), "Primary Cooling" (heat pump vs AC condenser), "Air Distribution" (air handler vs air handler).

#### Accessories — Part of Scope (not a separate table)

Accessories (thermostats, surge protectors, UV lights, etc.) are NOT a separate table. Instead, they're stored as a **JSONB array** column on `bid_scope` called `accessories`. Each entry has: type, name, brand, model_number, description, cost.

**Why JSONB on bid_scope instead of a separate table?**
- Accessories are scope items — "what's included in this bid's scope of work"
- The list is small (typically 2-5 items per bid) and variable
- Displayed as a sub-table within the Scope & Costs tab
- No need for SQL querying/filtering on individual accessories

**New column on `bid_scope`:**
```
accessories JSONB DEFAULT '[]'
-- Array of: { type, name, brand, model_number, description, cost }
```

**Front-end display in Scope tab — Accessories sub-table:**
The accessories sub-table shows the ACTUAL item names/details side by side (not yes/no booleans):

| Accessory | Bid A (ABC Heating) | Bid B (XYZ HVAC) | Bid C (Cool Air) |
|---|---|---|---|
| Thermostat | Honeywell T10 Pro Smart | Ecobee Premium | Basic Honeywell |
| Surge Protector | Included (unspecified) | Not included | Intermatic AG3000 |
| UV Light | Not included | RGF REME HALO | Not included |
| Line Set | 25ft copper, insulated | 30ft copper | Not specified |

This gives homeowners a real comparison of WHAT each contractor includes, not just whether they include it.

**Relationship to scope booleans:**
- `bid_scope.thermostat_included` (BOOL) = Quick filter: "Is a thermostat included?"
- `bid_scope.thermostat_detail` (TEXT) = Short description: "Honeywell T10 Pro Smart"
- `bid_scope.accessories` (JSONB) = Full details with brand, model, cost
- The scope booleans are the quick-glance comparison; accessories JSONB is the detailed view

#### Equipment Comparison: Conditional Layout Based on System Types

**The problem:** A heat pump is ONE device that does both heating and cooling. A furnace+AC combo is TWO devices. How do we compare them in the same grid?

**Key principle: BidSmart is PRIMARILY a heat pump comparison tool.** The default and most common case is comparing heat pump bids against each other. The UI should be simple in that case and only get more complex when a non-heat-pump bid appears.

**Solution: Two display modes, automatically selected based on the bids being compared.**

---

**MODE 1: Simple Mode (default) — All bids are heat pumps**

When every bid has `system_type = 'heat_pump'` (or `'mini_split'`), the Equipment tab looks exactly like it does today — a simple flat comparison grid with ONE device per bid:

| Spec | Bid A (ABC Heating) | Bid B (XYZ HVAC) | Bid C (Cool Air) |
|---|---|---|---|
| Brand & Model | Carrier 24VNA0 | Lennox XP25 | Daikin DZ20VC |
| SEER2 | 20.5 | 19.2 | 18.5 |
| HSPF2 | 10.0 | 9.5 | 9.2 |
| Cooling BTU | 36,000 | 36,000 | 36,000 |
| Heating BTU | 36,000 | 36,000 | 36,000 |
| Variable Speed | Yes | Yes | No (2-stage) |
| Sound Level | 56 dB | 58 dB | 62 dB |
| Refrigerant | R-410A | R-410A | R-410A |
| Energy Star | Most Efficient | Certified | Certified |
| Compressor Warranty | 10 yrs | 12 yrs | 10 yrs |

No Cooling/Heating split. No extra complexity. Just a clean apples-to-apples grid. This is the experience 90%+ of users will see.

---

**MODE 2: Function-Based Mode — Mixed system types (heat pump + furnace/AC)**

When ANY bid has a different `system_type` (e.g., 2 heat pump bids + 1 furnace/AC bid), the Equipment tab automatically switches to function-based comparison, organized by Cooling Performance, Heating Performance, and Air Distribution:

**Example: 2 Heat Pumps + 1 Furnace/AC**

| Spec | Bid A: Heat Pump | Bid B: Heat Pump | Bid C: Furnace + AC |
|---|---|---|---|
| **— SYSTEM OVERVIEW —** | | | |
| System Type | Heat Pump | Heat Pump | Furnace + AC |
| Brand | Carrier | Lennox | Trane |
| | | | |
| **— COOLING PERFORMANCE —** | | | |
| Equipment | Carrier 24VNA0 | Lennox XP25 | Trane XR15 (AC) |
| SEER2 | 20.5 | 19.2 | 15.2 |
| EER | 13.5 | 12.8 | 11.5 |
| Cooling BTU | 36,000 | 36,000 | 36,000 |
| Sound Level | 56 dB | 58 dB | 72 dB |
| | | | |
| **— HEATING PERFORMANCE —** | | | |
| Equipment | Carrier 24VNA0 | Lennox XP25 | Trane S9V2 (Furnace) |
| Efficiency | HSPF2: 10.0 | HSPF2: 9.5 | AFUE: 96% |
| Heating BTU | 36,000 | 36,000 | 80,000 |
| Fuel Type | Electric | Electric | Natural Gas |
| Stages | Variable | Variable | 2-stage |
| | | | |
| **— AIR DISTRIBUTION —** | | | |
| Air Handler | Carrier FE4ANF003 | Lennox CBX27UH | Trane GAM5A0 |
| Variable Speed | Yes | Yes | Yes |
| | | | |
| **— COMMON SPECS —** | | | |
| Refrigerant | R-410A | R-410A | R-410A |
| Energy Star | Most Efficient | Certified | Certified |
| Voltage | 240V | 240V | 240V / 120V |

**Key behaviors in Mode 2:**
- **Heat pump bids:** The same device appears in BOTH Cooling and Heating sections (because `system_role = 'primary_both'`). The UI shows only the relevant specs in each section (SEER2 in cooling, HSPF2 in heating).
- **Furnace+AC bids:** The AC condenser appears in Cooling, the furnace appears in Heating. Each shows only its relevant specs.
- **Mixed bids (2 HP + 1 Furnace/AC):** Works naturally — heat pump columns repeat the same device name in both sections; the furnace/AC column shows different devices.

---

**Mode selection logic (front-end):**

```
const allSystemTypes = bids.map(b => b.system_type);
const allHeatPumps = allSystemTypes.every(t => t === 'heat_pump' || t === 'mini_split');
const displayMode = allHeatPumps ? 'simple' : 'function_based';
```

**Database fields that drive this:**
- `bids.system_type` — determines which mode to use
- `bid_equipment.system_role` — determines row alignment in function-based mode
- `bid_equipment.afue_rating` — furnace efficiency (only shown when furnace present)
- `bid_equipment.fuel_type` — gas/electric/propane (only relevant for furnaces)

**No new columns needed for the comparison itself** — the existing spec columns (SEER, HSPF, BTU, etc.) already cover both system types. The difference is:
- Heat pumps use HSPF for heating efficiency
- Furnaces use AFUE for heating efficiency
- Heat pumps are always electric; furnaces need `fuel_type`

---

## 5. Recommended Target Schema

### 5.1 Relationship Diagram

```
users_ext
  |-- 1:N -- projects
                |-- 1:1 -- project_requirements
                |-- 1:N -- pdf_uploads
                |-- 1:N -- project_faqs
                |-- 1:N -- project_incentives --[optional FK]--> incentive_program_database
                |-- 1:N -- project_qii_checklist  (items hardcoded in app)
                |-- 1:N -- contractor_installation_reviews
                |-- 1:N -- bids (slim: pricing, payment, warranty, timeline)
                             |-- 1:1 -- bid_contractors (company, ratings, certs)
                             |-- 1:1 -- bid_scope (scope booleans + details + electrical work)
                             |-- 1:1 -- bid_scores (scores, flags)
                             |-- 1:N -- bid_equipment (MAJOR appliances: heat pump, furnace, AC, air handler)
                             |-- 1:N -- bid_line_items (itemized costs)
                             |-- 1:N -- contractor_questions (clarification Qs)
                             |-- 1:N -- bid_faqs (per-bid FAQs)

community_contractors (anonymized, from opted-in users)
  |-- 1:N -- community_bids (anonymized pricing + scope)

incentive_program_database (reference, geo-indexed)
```

### 5.2 Front-End Section -> Table Mapping

| UI Section | Primary Table(s) | View |
|---|---|---|
| **Equipment tab** | `bid_equipment` (aligned by `system_role`) | `v_bid_compare_equipment` |
| **Contractors tab** | `bid_contractors` + `bid_scores` (flags) | `v_bid_compare_contractors` |
| **Costs tab** | `bids` (pricing, payment, warranty, timeline) | Direct query (no join needed) |
| **Scope tab — Scope grid** | `bid_scope` (scope booleans + details) | `v_bid_compare_scope` |
| **Scope tab — Electrical sub-table** | `bid_scope` (electrical columns) | Same view, filtered in component |
| **Scope tab — Accessories sub-table** | `bid_scope.accessories` (JSONB) | Same view, rendered as detail comparison |
| **BidCard** | `bids` + `bid_contractors` + `bid_scores` | `v_bid_summary` |
| **DecidePhase Incentives** | `project_incentives` + `incentive_program_database` | Direct query |
| **DecidePhase Questions** | `contractor_questions` | Direct query |
| **DecidePhase FAQs** | `bid_faqs` + `project_faqs` | Direct query |
| **Admin — Community Data** | `community_contractors` + `community_bids` | Admin-only views |

---

## 6. Table-by-Table Field Grouping Plan

### 6.1 `bids` (Slimmed Core — ~30 columns)

**Purpose:** Core bid record with pricing, payment, warranty, timeline, and metadata. Renamed from `contractor_bids` to `bids`.

| Group | Fields |
|---|---|
| System | `id` (PK), `project_id` (FK), `pdf_upload_id` (FK), `bid_index`, `created_at`, `updated_at` |
| Display name | `contractor_name` (denormalized for sort/display convenience) |
| System | `system_type` (TEXT: 'heat_pump', 'furnace_ac', 'mini_split', 'hybrid', 'boiler', 'other') |
| Pricing | `total_bid_amount`, `labor_cost`, `equipment_cost`, `materials_cost`, `permit_cost`, `disposal_cost`, `electrical_cost`, `total_before_rebates`, `estimated_rebates`, `total_after_rebates` |
| Payment | `deposit_required`, `deposit_percentage`, `payment_schedule`, `financing_offered`, `financing_terms` |
| Warranty | `labor_warranty_years`, `equipment_warranty_years`, `compressor_warranty_years`, `additional_warranty_details` |
| Timeline | `estimated_days`, `start_date_available`, `bid_date`, `valid_until` |
| Extraction | `extraction_confidence`, `extraction_notes` |
| User actions | `verified_by_user`, `verified_at`, `user_notes`, `is_favorite` |

**Dropped from old contractor_bids:** All `contractor_*` (-> bid_contractors), all `scope_*` + `electrical_*` + `inclusions`/`exclusions` (-> bid_scope), all score/flag fields (-> bid_scores), all `incentive_*` summary cols (dropped entirely), `quote_date` (duplicate), `deposit_required_flag` (redundant), `rebates_mentioned` (unused).

---

### 6.2 `bid_contractors` (NEW — ~25 columns)

**Purpose:** All contractor company information, ratings, credentials.

| Group | Fields |
|---|---|
| System | `id` (PK), `bid_id` (FK -> bids, CASCADE), `created_at`, `updated_at` |
| Identity | `name`, `company`, `contact_name`, `address`, `phone`, `email`, `website` |
| Licensing | `license`, `license_state`, `license_status`, `license_expiration_date`, `insurance_verified`, `bonded` |
| Experience | `years_in_business`, `year_established`, `total_installs`, `certifications` (TEXT[]), `employee_count`, `service_area` |
| Ratings | `google_rating`, `google_review_count`, `yelp_rating`, `yelp_review_count`, `bbb_rating`, `bbb_accredited`, `bbb_complaints_3yr` |
| Research | `research_confidence`, `verification_date`, `research_notes` |

**Note:** Drop `contractor_` prefix (table name provides context). Drop `contractor_switch_rating`, `contractor_is_switch_preferred`, `contractor_certifications_detailed` (never populated).

**Front-end:** Contractors tab, BidCard expanded details. **Cardinality:** 1 per bid.

---

### 6.3 `bid_scope` (NEW — ~39 columns) — includes electrical work

**Purpose:** Everything about the contractor's scope of work — what's included/excluded, plus all electrical scope work.

| Group | Fields |
|---|---|
| System | `id` (PK), `bid_id` (FK -> bids, CASCADE), `created_at`, `updated_at` |
| Summary | `summary` (TEXT) |
| Free-form | `inclusions` (TEXT[]), `exclusions` (TEXT[]) |
| **Scope booleans + details** (12 pairs) | |
| | `permit_included` / `permit_detail` |
| | `disposal_included` / `disposal_detail` |
| | `electrical_included` / `electrical_detail` |
| | `ductwork_included` / `ductwork_detail` |
| | `thermostat_included` / `thermostat_detail` |
| | `manual_j_included` / `manual_j_detail` |
| | `commissioning_included` / `commissioning_detail` |
| | `air_handler_included` / `air_handler_detail` |
| | `line_set_included` / `line_set_detail` |
| | `disconnect_included` / `disconnect_detail` |
| | `pad_included` / `pad_detail` |
| | `drain_line_included` / `drain_line_detail` |
| **Electrical work** (sub-group) | |
| Electrical scope | `panel_assessment_included` (BOOLEAN), `panel_upgrade_included` (BOOLEAN), `dedicated_circuit_included` (BOOLEAN), `electrical_permit_included` (BOOLEAN), `load_calculation_included` (BOOLEAN) |
| Electrical assessment | `existing_panel_amps` (INT), `proposed_panel_amps` (INT), `breaker_size_required` (INT) |
| Electrical pricing | `panel_upgrade_cost` (DECIMAL) |
| Electrical notes | `electrical_notes` (TEXT) |
| **Accessories** (sub-group) | |
| | `accessories` (JSONB DEFAULT '[]') — Array of {type, name, brand, model_number, description, cost} |

**Notes:**
- `_detail` columns are NEW to the database — fixes the ghost column bug
- Drop `scope_` prefix from all scope columns (table name provides context)
- Electrical columns drop the `electrical_` prefix where the table context is clear, but keep it for `electrical_permit_included` (distinct from `permit_included` which is the general construction permit) and `electrical_notes`
- The UI renders this as TWO visual sub-tables from the same data source

**Front-end:**
- Scope tab -> **Scope Comparison grid** (12 boolean+detail pairs)
- Scope tab -> **Electrical Work sub-table** (electrical columns) — powers re-activated `ElectricalComparisonTable.tsx`

**Cardinality:** 1 per bid.

---

### 6.4 `bid_scores` (NEW — ~10 columns)

**Purpose:** Scoring, quality indicators, analysis flags. Separated so scoring can be recalculated independently.

| Group | Fields |
|---|---|
| System | `id` (PK), `bid_id` (FK -> bids, CASCADE), `created_at`, `updated_at` |
| Scores | `overall_score`, `value_score`, `quality_score`, `completeness_score` |
| Meta | `score_confidence`, `scoring_notes`, `ranking_recommendation` |
| Flags | `red_flags` (JSONB), `positive_indicators` (JSONB) |

**Front-end:** BidCard (score badge), ComparePhase score row, DecidePhase flags. **Cardinality:** 1 per bid.

---

### 6.5 `project_incentives` (NEW — replaces incentive_programs + project_rebates)

**Purpose:** All incentives applicable to a project — whether from the master database, discovered by AI, or added by user.

| Group | Fields |
|---|---|
| System | `id` (PK), `project_id` (FK -> projects, CASCADE), `created_at`, `updated_at` |
| Source | `source` (TEXT: 'database_match', 'ai_discovered', 'user_added'), `incentive_database_id` (FK -> incentive_program_database, nullable) |
| Identity | `program_name`, `program_type` (TEXT: federal/state/utility/manufacturer/tax_credit) |
| Amounts | `amount_min` (DECIMAL), `amount_max` (DECIMAL), `amount_description` (TEXT) |
| Eligibility | `equipment_types_eligible` (TEXT[]) — e.g. ['heat_pump'] but not ['furnace'], `eligibility_requirements` (TEXT), `income_qualified` (BOOLEAN), `income_limits` (TEXT) |
| Application | `application_process` (TEXT), `application_url` (TEXT), `verification_source` (TEXT) |
| Stacking | `can_stack` (BOOLEAN), `stacking_notes` (TEXT) |
| Status | `still_active` (BOOLEAN), `confidence` (TEXT) |
| User tracking | `user_plans_to_apply` (BOOLEAN), `application_status` (TEXT: not_applied/applied/approved/received), `applied_amount` (DECIMAL) |

**Key design:** `equipment_types_eligible` TEXT[] solves the "heat pump gets the credit but furnace/AC doesn't" problem at the project level.

---

### 6.6 `incentive_program_database` (renamed from rebate_programs — with geo columns)

**Purpose:** Master reference database of all known incentive programs. Grows over time as MindPal discovers new programs. MindPal checks this database FIRST before searching the web.

| Group | Fields |
|---|---|
| System | `id` (PK), `created_at`, `updated_at` |
| Identity | `program_name`, `program_code` (UNIQUE), `description`, `program_type` (federal/state/utility/manufacturer/tax_credit) |
| **Geo** | `available_states` (TEXT[]), `available_zip_codes` (TEXT[]), `available_utilities` (TEXT[]), `available_nationwide` (BOOLEAN) |
| Amounts | `rebate_amount` (DECIMAL), `rebate_percentage` (DECIMAL), `max_rebate` (DECIMAL) |
| Requirements | `requirements` (JSONB), `income_qualified` (BOOLEAN), `income_limits` (JSONB) |
| Timing | `valid_from` (DATE), `valid_until` (DATE) |
| Application | `application_url`, `application_process`, `typical_processing_days` (INT) |
| Stacking | `stackable` (BOOLEAN), `cannot_stack_with` (TEXT[]) |
| Status | `is_active` (BOOLEAN), `last_verified` (DATE) |
| Discovery | `discovered_by` (TEXT: 'seed', 'mindpal', 'admin'), `discovery_source_url` (TEXT) |

**New columns vs old rebate_programs:** `available_zip_codes` (TEXT[]), `discovered_by`, `discovery_source_url`. Geo columns already existed (`available_states`, `available_utilities`, `available_nationwide`) — just carried over.

**Data flow:** MindPal Incentive Finder node -> queries `incentive_program_database` by state/zip/utility -> searches web for new ones -> writes new finds to both `incentive_program_database` (cache) AND `project_incentives` (for this project).

---

### 6.7 `contractor_questions` (renamed from bid_questions)

**Purpose:** Questions the homeowner should ask each contractor, generated by MindPal Node 6 based on what's missing or unclear in each bid.

**Keep same columns as current `bid_questions`** — just rename. Still per-bid (`bid_id` FK -> `bids`), since each contractor gets different questions based on their specific bid gaps.

---

### 6.8 `community_contractors` (NEW — ~20 columns)

**Purpose:** Anonymized contractor market data from opted-in users, PLUS BidSmart user review ratings when available. Builds a growing database of contractor quality profiles across regions.

| Group | Fields |
|---|---|
| System | `id` (PK), `created_at`, `updated_at` |
| Geo | `state`, `zip_code_area` (TEXT, first 3 digits only), `service_area` |
| Profile | `years_in_business`, `employee_count`, `certifications` (TEXT[]) |
| Public Ratings | `google_rating`, `yelp_rating`, `bbb_rating`, `bbb_accredited` |
| BidSmart Review | `bidsmart_overall_rating` (INT 1-5), `bidsmart_quality_rating` (INT 1-5), `bidsmart_professionalism_rating` (INT 1-5), `bidsmart_communication_rating` (INT 1-5), `bidsmart_timeliness_rating` (INT 1-5), `bidsmart_would_recommend` (BOOL), `bidsmart_completed_on_time` (BOOL), `bidsmart_stayed_within_budget` (BOOL) |
| Source | `source_project_id` (FK -> projects, for admin dedup — not exposed in community views) |

**What's NOT stored:** Company name, address, phone, email, website, license number, contact name.

**BidSmart Review data:** When a homeowner submits a `contractor_installation_review` AND their project has `data_sharing_consent = true`, the anonymized ratings are copied to this community record. This means the community database includes not just third-party ratings (Google/Yelp/BBB) but also real BidSmart user experience ratings — powerful for future "contractor quality insights by region" features.

---

### 6.9 `community_bids` (NEW — ~15 columns)

**Purpose:** Anonymized bid pricing + scope benchmarks. Enables "fair market rate" insights by region.

| Group | Fields |
|---|---|
| System | `id` (PK), `community_contractor_id` (FK), `created_at`, `bid_date` |
| Geo | `state`, `zip_code_area` (TEXT, first 3 digits only) |
| Pricing | `total_bid_amount`, `labor_cost`, `equipment_cost`, `materials_cost`, `total_after_rebates` |
| Equipment summary | `equipment_type` (TEXT: heat_pump/furnace_ac/etc), `primary_seer_rating` (DECIMAL), `primary_capacity_tons` (DECIMAL) |
| Scope summary | `scope_items_included_count` (INT), `includes_permit` (BOOL), `includes_electrical` (BOOL), `includes_ductwork` (BOOL) |
| Warranty | `labor_warranty_years`, `equipment_warranty_years` |
| Timeline | `estimated_days` |
| Source | `source_bid_id` (FK -> bids, for admin dedup — not exposed) |

**What's NOT stored:** Contractor names, user notes, red flags, PDF documents, exact addresses, financing terms.

**Trigger logic:** `after_insert_or_update` trigger on `bids` -> checks `projects.data_sharing_consent` -> if true, upserts to `community_contractors` + `community_bids` using `source_bid_id` for dedup.

---

### 6.10 QII Checklist — Hardcoded + Printable

**Remove `qii_checklist_items` table from DB.** Move the 16 static items to:

```
File: src/lib/constants/qiiChecklist.ts
Export: QII_CHECKLIST_ITEMS — array of 16 items with:
  category, item_key, item_text, description, why_it_matters, is_critical, display_order
```

**Keep `project_qii_checklist` table in Supabase** — tracks which items each homeowner has verified. Change FK from `checklist_item_id` (UUID) to `checklist_item_key` (TEXT matching the hardcoded `item_key`).

**Printable checklist feature:**
- Add "Print Checklist" button to `QIIChecklist.tsx`
- Generates a clean, printer-friendly layout with all 16 items grouped by category
- Each item has a checkbox, description, and "why it matters" note
- Homeowner can print and hand to contractor before installation, or use during final inspection
- Implementation: CSS `@media print` styles or generate a PDF via browser print dialog

---

### 6.11 `bid_equipment` (RESTRUCTURED — major HVAC appliances only)

See **Section D6** for full design rationale. Key changes:
- Added `system_role` column to enable role-based comparison alignment across bids
- Added `afue_rating` for furnace efficiency
- Added `'furnace'` and `'condenser'` equipment types
- Removed accessory types (thermostat, line_set, disconnect, pad) — they move to `bid_accessories`

---

### 6.12 Existing Tables — No Changes (beyond FK updates)

- **`bid_line_items`** (14 cols) — Keep for future cost detail view. Update FK to `bids`.
- **`bid_faqs`** (10 cols) — Keep. Fix column name mismatch in new insert paths. Update FK to `bids`.
- **`project_faqs`** (8 cols) — Keep as-is.
- **`contractor_installation_reviews`** (20 cols) — Keep as-is. User-input post-installation survey (5 star ratings, yes/no questions, free text). Update FK to `bids`.
- **`user_feedback`** (7 cols) — Keep as-is. Early access feedback (liked/wishlist/bug).
- **All admin/auth tables** — Bring over unchanged.

---

## 7. Proposed SQL Views

| View | Joins | Purpose |
|---|---|---|
| `v_bid_summary` | `bids` + `bid_contractors` + `bid_scores` | BidCard, list views — name, price, score, rating, flags |
| `v_bid_compare_equipment` | `bids`(name, system_type) + `bid_equipment` | Equipment tab — function-based comparison (Cooling/Heating/Air Distribution), aligned by system_role |
| `v_bid_compare_contractors` | `bid_contractors` + `bid_scores`(flags) | Contractors tab comparison grid |
| `v_bid_compare_scope` | `bids`(name) + `bid_scope` | Scope tab — scope booleans AND electrical work |
| `v_bid_full` | All 4 bid tables joined | Full bid record for any edge case |
| `v_community_pricing` | `community_bids` + `community_contractors` | Admin dashboard — regional pricing benchmarks |

---

## 8. Front-End Alignment

### Component -> New Data Source

| Component | Old Source | New Source |
|---|---|---|
| ComparePhase -> Equipment | `contractor_bids.*` + `bid_equipment.*` | `v_bid_compare_equipment` (function-based: Cooling, Heating, Air Distribution) |
| ComparePhase -> Contractors | `contractor_bids.contractor_*` | `v_bid_compare_contractors` |
| ComparePhase -> Costs | `contractor_bids` pricing fields | `bids.*` (direct — no join) |
| ComparePhase -> Scope grid | `contractor_bids.scope_*` | `v_bid_compare_scope` (scope columns) |
| ComparePhase -> Scope -> Electrical | `contractor_bids.electrical_*` | `v_bid_compare_scope` (electrical columns) |
| ComparePhase -> Scope -> Accessories | N/A (not displayed) | `bid_scope.accessories` JSONB (detail comparison sub-table) |
| BidCard | `contractor_bids.*` (all 98 cols) | `v_bid_summary` |
| ElectricalComparisonTable | Unused | `bid_scope` electrical columns (activate!) |
| DecidePhase scores/flags | `contractor_bids.red_flags` etc | `bid_scores.*` |
| DecidePhase Incentives | `rebate_programs` + `incentive_programs` | `project_incentives` + `incentive_program_database` |
| DecidePhase Questions | `bid_questions` | `contractor_questions` |
| DecidePhase FAQs | `bid_faqs` + `project_faqs` | No change |
| QII Checklist | `qii_checklist_items` + `project_qii_checklist` | Hardcoded constant + `project_qii_checklist` |
| Admin Community Dashboard | N/A | `v_community_pricing` (NEW) |

### Energy/Electrical — Clean Split (same as before, just one table now)

- **Equipment's electrical needs** -> `bid_equipment`: amperage_draw, minimum_circuit_amperage, voltage ("What does the heat pump need?" — per device, 1:N)
- **Contractor's electrical work** -> `bid_scope`: panel upgrade, circuit install, permits, panel amps ("What electrical work is the contractor doing?" — per bid, 1:1, sub-group within scope)
- **No duplicate storage.** Equipment specs on equipment table. Scope work on scope table.

### Costs + Scope Tab Split Recommendation

Currently "Costs & Scope" share one tab. Recommend splitting into:
1. **Costs tab** -> reads from `bids` (pricing, payment, warranty, timeline)
2. **Scope tab** -> reads from `v_bid_compare_scope` (scope booleans + electrical work as two sub-tables)

---

## 9. Functions, Triggers, and Views to Recreate

### Functions to Bring Over (updated for new schema)

| Function | Change Needed |
|---|---|
| `update_updated_at()` | No change — reuse as-is |
| `calculate_bid_scores()` | Rewrite to update `bid_scores` table instead of `contractor_bids` |
| `trigger_recalculate_scores()` | Update trigger target |
| `get_project_summary()` | Rewrite to join new tables |
| `cleanup_expired_verifications()` | No change |
| `verify_admin_password()` | No change |
| `validate_admin_session()` | No change |

**New functions:**
| Function | Purpose |
|---|---|
| `populate_community_data()` | On bid insert/update, if `data_sharing_consent = true`, upsert anonymized data to community tables |

**Drop:** `update_contractor_switch_rating()` — Switch rating features are removed.

### Triggers to Recreate

| Trigger | Table | Notes |
|---|---|---|
| `*_updated` triggers | All tables with `updated_at` | Reuse `update_updated_at()` |
| `bid_score_trigger` | `bids` | Now writes to `bid_scores` instead |
| `community_data_trigger` | `bids` | After insert/update -> `populate_community_data()` |
| `community_review_trigger` | `contractor_installation_reviews` | After insert/update -> updates `community_contractors` with BidSmart review ratings (if consent) |

### RLS Policies

All new tables inherit the same pattern: access through `bids -> projects -> users_ext` FK chain. Each new 1:1 table (`bid_contractors`, `bid_scope`, `bid_scores`) gets a SELECT/INSERT/UPDATE/DELETE policy checking ownership through the `bid_id -> bids.project_id -> projects.user_id` path.

`project_incentives` uses `project_id -> projects.user_id` path directly.

`community_*` tables: public SELECT (anyone can read anonymized data), INSERT/UPDATE only via trigger function (service role).

`incentive_program_database`: public SELECT, INSERT/UPDATE via service role (MindPal callback or admin).

---

## 10. Refactor Sequence

### Phase 0: Schema Audit Document (FIRST — before any implementation)

**Produce a comprehensive HTML schema audit document** (`docs/SCHEMA_V2_COMPLETE.html`) that serves as the single source of truth for the new database. This document must be reviewable and shareable before any code is written.

**Contents of the HTML audit:**

For EACH of the 25 tables:
1. **Table name** and category (User Data / Reference Data / Community Data / Admin)
2. **Purpose** — one-line description
3. **Complete column listing** — every column with:
   - Column name
   - Data type (TEXT, INTEGER, BOOLEAN, DECIMAL, JSONB, UUID, TIMESTAMPTZ, TEXT[], etc.)
   - Nullable? (YES/NO)
   - Default value
   - Constraints (PK, FK references, UNIQUE, CHECK, CASCADE behavior)
   - Description/purpose of the column
4. **Indexes** — any non-PK indexes
5. **RLS policy summary** — who can SELECT/INSERT/UPDATE/DELETE
6. **MindPal JSON format** — the exact JSON structure that MindPal must output for this table to be populated correctly. Example:
   ```json
   // For bid_contractors:
   {
     "name": "ABC Heating & Cooling",
     "company": "ABC Heating LLC",
     "phone": "(555) 123-4567",
     "email": "info@abcheating.com",
     "google_rating": 4.7,
     "google_review_count": 142,
     ...
   }
   ```
7. **Which MindPal node populates this table** (Node 1, Node 2, Node 3, etc.)
8. **Front-end components that read this table** — list of component names

Also includes:
- **Relationship diagram** (visual or text)
- **SQL Views** — complete SELECT statements for all 6 views
- **Enums and custom types**
- **Functions and triggers** — signatures and descriptions

**Output:** Styled HTML file similar to `docs/SUPABASE_TABLE_FIELD_AUDIT.html` — viewable in browser, printable, shareable. Dan reviews and approves this BEFORE any Supabase project is created.

---

### Phase 1: New Supabase Project + New App Setup
1. Create new Supabase project
2. Create new app project (new repo or directory — NOT a branch of main)
3. Copy over reusable code from current app (components, styles, utilities)
4. Write complete CREATE TABLE migration for all tables (clean, from scratch, matching the Phase 0 audit)
5. Create all enums, functions, triggers, RLS policies
6. Create the 6 SQL views
7. Seed reference data (`incentive_program_database` with 3 programs, admin users)
8. Create `src/lib/constants/qiiChecklist.ts` with hardcoded checklist items

### Phase 2: Front-End TypeScript Types
9. Split monolithic `ContractorBid` interface into: `Bid` (with system_type), `BidContractor`, `BidScope` (with electrical sub-group + accessories JSONB), `BidScores`
10. Restructure `BidEquipment` type: add `system_role`, `afue_rating`, `fuel_type`. Add `accessories` JSONB type to `BidScope`.
11. Create: `ProjectIncentive`, `ContractorQuestion`, `CommunityContractor`, `CommunityBid` types
12. Create view-mapped types: `BidSummary`, `BidCompareEquipment`, etc.
13. Update `bidsmartService.ts` — new Supabase client URL/key, new query functions per table/view

### Phase 3: Front-End Components (Incremental)
14. Update `PhaseContext.tsx` to load from views
15. Redesign Equipment tab: conditional simple/function-based display mode (see D6)
16. Update ComparePhase remaining tabs (Contractors -> Costs -> Scope)
17. Build Scope tab with 3 sub-tables: scope booleans, electrical work, accessories details
18. Update BidCard to use `v_bid_summary` (show `system_type` badge)
19. Update DecidePhase to read from `bid_scores`, `contractor_questions`, `project_incentives`
20. Update QIIChecklist to read from hardcoded constant + `project_qii_checklist`
21. Add "Print Checklist" button to QIIChecklist component

### Phase 4: Ingestion Pipeline
22. Update `v8Mapper.ts` to write to 4 tables (bids, bid_contractors, bid_scope, bid_scores)
23. Update equipment mapper: set `system_role` + `fuel_type`; map accessories to `bid_scope.accessories` JSONB
24. Update incentive mapping to write to `project_incentives` AND `incentive_program_database`
25. Update edge functions with new Supabase URL/keys
26. Test end-to-end: PDF upload -> MindPal -> new DB -> front-end display

### Phase 5: Community Data Layer
27. Create `populate_community_data()` function (includes review data from `contractor_installation_reviews`)
28. Create community data triggers on `bids` and `contractor_installation_reviews`
29. Build admin dashboard for community data (regional pricing, contractor ratings + BidSmart reviews, scope trends)

### Phase 6: Launch New App Version
30. Deploy new app (separate from old app)
31. Verify all flows work end-to-end
32. Keep old app + old Supabase project as reference (can be decommissioned later)

---

## 11. Complete Table Name Summary

### Final Table Names (new project)

**USER DATA (17 tables):**

| # | Table | Renamed From | Change |
|---|---|---|---|
| 1 | `users_ext` | — | As-is |
| 2 | `projects` | — | As-is |
| 3 | `pdf_uploads` | — | As-is |
| 4 | `project_requirements` | — | As-is |
| 5 | `bids` | `contractor_bids` | **Renamed + split** |
| 6 | `bid_contractors` | — | **NEW** (from contractor_bids) |
| 7 | `bid_scope` | — | **NEW** (scope + electrical from contractor_bids) |
| 8 | `bid_scores` | — | **NEW** (from contractor_bids) |
| 9 | `bid_equipment` | — | **Restructured** (major appliances only + system_role + afue_rating + fuel_type) |
| 10 | `bid_line_items` | — | As-is |
| 11 | `contractor_questions` | `bid_questions` | **Renamed** |
| 12 | `bid_faqs` | — | As-is |
| 13 | `project_faqs` | — | As-is |
| 14 | `project_incentives` | `incentive_programs` + `project_rebates` | **Merged + renamed** |
| 15 | `project_qii_checklist` | — | As-is (FK changed to item_key TEXT) |
| 16 | `contractor_installation_reviews` | — | As-is |
| 17 | `user_feedback` | — | As-is |

**REFERENCE DATA (1 table):**

| # | Table | Renamed From | Change |
|---|---|---|---|
| 18 | `incentive_program_database` | `rebate_programs` | **Renamed + geo columns + discovery tracking** |

**COMMUNITY DATA (2 tables — NEW):**

| # | Table | Change |
|---|---|---|
| 19 | `community_contractors` | **NEW** — anonymized contractor profiles |
| 20 | `community_bids` | **NEW** — anonymized pricing + scope benchmarks |

**ADMIN / SYSTEM (5 tables):**

| # | Table | Change |
|---|---|---|
| 21 | `analytics_events` | As-is |
| 22 | `admin_users` | As-is |
| 23 | `admin_sessions` | As-is |
| 24 | `email_verifications` | As-is |
| 25 | `verified_sessions` | As-is |

**DROPPED (2 tables):**
- `bid_analysis` (replaced by dedicated tables)
- `mindpal_extractions` (debug artifact)

**HARDCODED (1 table -> TypeScript constant):**
- `qii_checklist_items` -> `src/lib/constants/qiiChecklist.ts`

**Total: 25 tables** (was 24, +2 community, -1 QII checklist from DB)

---

## Critical Files to Create / Modify

| File | Change |
|---|---|
| `docs/SCHEMA_V2_COMPLETE.html` | **NEW (Phase 0)** — Complete schema audit with all columns, types, constraints, MindPal JSON formats |
| New Supabase project | Complete schema creation SQL (matching Phase 0 audit) |
| New app project | Fresh codebase (copy reusable code from current app) |
| `src/lib/types/index.ts` | Split `ContractorBid` into 4+ interfaces; restructure `BidEquipment` (system_role, afue_rating, fuel_type); add `ProjectIncentive`, `ContractorQuestion`, community types |
| `src/lib/constants/qiiChecklist.ts` | **NEW** — hardcoded QII checklist items (16 items, 6 categories) |
| `src/lib/database/bidsmartService.ts` | New client, new query functions per table/view |
| `src/context/PhaseContext.tsx` | Load from views instead of monolithic query |
| `src/components/phases/ComparePhase.tsx` | Retarget tabs to new tables |
| `src/components/BidCard.tsx` | Use `v_bid_summary` view |
| `src/components/BidComparisonTable.tsx` | Update field paths |
| `src/components/ElectricalComparisonTable.tsx` | Activate, connect to `bid_scope` electrical columns |
| `src/components/IncentivesTable.tsx` | Read from `project_incentives` + `incentive_program_database` |
| `src/components/QIIChecklist.tsx` | Read items from hardcoded constant; add Print button |
| `supabase/functions/_shared/v8Mapper.ts` | Write to 4 tables; write incentives to `project_incentives` + `incentive_program_database` |
| `.env` / Netlify env vars | New Supabase URL + anon key |

---

## Verification Plan

0. **Schema Audit HTML:** `docs/SCHEMA_V2_COMPLETE.html` reviewed and approved by Dan before any implementation
1. **Schema:** All 25 tables created with correct columns, FKs, cascades, enums (matching Phase 0 audit exactly)
2. **Views:** Each of 6 views returns expected joined shape
3. **RLS:** New tables inherit ownership policies through FK chain; community tables are public read
4. **Front-end:** Each ComparePhase tab renders data identically to pre-refactor
5. **BidCard:** Contractor name, price, score all display correctly
6. **Scope tab:** Both scope grid AND electrical sub-table render from `bid_scope`
7. **Equipment tab:** Function-based comparison (Cooling/Heating/Air Distribution) renders correctly with system_role alignment; heat pump vs furnace+AC shows side-by-side with correct specs per row group
8. **Scope tab — Accessories:** JSONB accessories sub-table shows actual item names/details (not just booleans) across bids
9. **System type:** `bids.system_type` correctly identifies heat_pump vs furnace_ac across bids
10. **Ingestion:** MindPal extraction lands data in all 4 new tables + bid_equipment (restructured) + project_incentives
8. **Incentive DB:** `incentive_program_database` seeded with 3 reference programs; geo columns indexed
9. **QII:** Hardcoded checklist renders correctly; print button generates clean printable layout; `project_qii_checklist` tracks verification via `item_key`
10. **Community data:** When `data_sharing_consent = true`, bid creation populates anonymized `community_*` tables
11. **Admin dashboard:** Community data views show regional pricing, contractor ratings, scope trends
12. **Auth flow:** Email verification, admin login still work
