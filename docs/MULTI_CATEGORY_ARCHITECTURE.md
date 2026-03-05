# BidSmart Multi-Category Architecture

> Flexible bid comparison platform for home services — not just heat pumps.
>
> Date: 2026-03-05
> Status: Proposal / Design Document

---

## 1. The Shift: From Heat-Pump Tool to Home Services Platform

The original BidSmart was built exclusively for heat pump bid comparison. The new architecture must support:

- **HVAC**: heat pumps, furnace+AC, mini-splits, hybrids, boilers
- **Water heaters**: tank, tankless, heat pump water heaters
- **Windows**: replacement, new construction, storm windows
- **Roofing**: shingle, metal, tile, flat roof, repair vs replacement
- **Solar**: panels, inverters, batteries, grid-tie vs off-grid
- **Electrical**: panel upgrades, EV charger installation, rewiring
- **Future categories**: insulation, siding, plumbing, etc.

### Key Design Constraints

1. **Cross-type comparison must work** — heat pump vs furnace+AC for the same "heating and cooling" job
2. **Bundles must be decomposable** — user chooses whether to split "heat pump + water heater" into comparable items
3. **Schemas can't be rigid** — 100% column match across categories is impossible
4. **Domain knowledge must be preserved** — heat pump extraction rules represent months of iteration
5. **Within-bid technology comparison** — one contractor may offer both heat pump and furnace+AC options

---

## 2. Core Concept: Universal + Category Layers

Instead of one monolithic 69-column table, split extraction into two layers:

### Layer 1: Universal Scope (applies to ALL bid types)

Fields that every contractor bid has, regardless of what's being installed:

```
UNIVERSAL SCOPE (~35 fields)
├── Pricing (10 fields)
│   total_bid_amount, labor_cost, equipment_cost, materials_cost,
│   permit_cost, disposal_cost, electrical_cost,
│   total_before_rebates, estimated_rebates, total_after_rebates
├── Payment Terms (5 fields)
│   deposit_required, deposit_percentage, payment_schedule,
│   financing_offered, financing_terms
├── Warranty (4 fields)
│   labor_warranty_years, equipment_warranty_years,
│   compressor_warranty_years*, additional_warranty_details
│   (* only for applicable equipment — null otherwise)
├── Timeline (4 fields)
│   estimated_days, start_date_available, bid_date, valid_until
├── Universal Scope Booleans (6 boolean+detail pairs = 12 fields)
│   permit_included + permit_detail
│   disposal_included + disposal_detail
│   commissioning_included + commissioning_detail
│   thermostat_included + thermostat_detail  (smart home device, not just HVAC)
│   manual_j_included + manual_j_detail      (load calc — HVAC + solar)
│   cleanup_included + cleanup_detail
├── Extraction Meta (2 fields)
│   extraction_confidence, extraction_notes
└── Accessories & Line Items (2 JSONB)
    accessories[], line_items[]
```

These fields are **always extracted, always comparable** across any bid type.

### Layer 2: Category-Specific Attributes (JSONB)

Fields that only apply to certain categories, stored as validated JSONB:

```sql
CREATE TABLE bid_category_attributes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_id UUID NOT NULL REFERENCES bid_configurations(id),
    category        TEXT NOT NULL,  -- 'hvac', 'water_heater', 'windows', 'roofing', 'solar', 'electrical'
    attributes      JSONB NOT NULL, -- validated by extraction agent against category schema
    confidence      confidence_level NOT NULL DEFAULT 'medium',
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

Each category has a **defined JSON schema** that the extraction agent validates against — but it's enforced at the application layer, not Postgres DDL. This means:
- Adding a new category = adding a new JSON schema definition + extraction prompt
- No migrations needed for new categories
- Category schemas can evolve independently

#### Example Category Schemas

**HVAC Attributes:**
```jsonc
{
  "system_type": "heat_pump",       // heat_pump | furnace_ac | mini_split | hybrid | boiler
  "is_heat_pump": true,             // safety flag
  // Scope booleans (HVAC-specific)
  "electrical_included": true,
  "electrical_detail": "Includes 240V dedicated circuit",
  "ductwork_included": null,        // three-state: true/false/null
  "ductwork_detail": null,
  "air_handler_included": true,
  "air_handler_detail": "New variable speed air handler",
  "line_set_included": true,
  "line_set_detail": "New 50ft line set with cover",
  "disconnect_included": true,
  "disconnect_detail": "New weatherproof disconnect",
  "pad_included": true,
  "pad_detail": "New composite pad",
  "drain_line_included": true,
  "drain_line_detail": "New condensate drain with trap",
  // Electrical safety (10 fields — carried from proven schema)
  "panel_assessment_included": null, // null = HIGH priority question
  "panel_upgrade_included": null,
  "dedicated_circuit_included": true,
  "electrical_permit_included": null,
  "load_calculation_included": null,
  "existing_panel_amps": null,
  "proposed_panel_amps": null,
  "breaker_size_required": null,
  "panel_upgrade_cost": null,
  "electrical_notes": null
}
```

**Water Heater Attributes:**
```jsonc
{
  "system_type": "tank",            // tank | tankless | heat_pump_water_heater | solar_thermal
  "fuel_type": "electric",          // electric | natural_gas | propane | solar
  "capacity_gallons": 50,
  "first_hour_rating": 67,          // gallons per hour
  "energy_factor": 3.42,            // UEF for heat pump water heaters
  "recovery_rate_gph": null,
  "venting_type": "none",           // none | power_vent | direct_vent | atmospheric
  "recirculation_included": false,
  "recirculation_detail": "Not included",
  "expansion_tank_included": true,
  "expansion_tank_detail": "New expansion tank",
  // Electrical (shared concern with HVAC)
  "electrical_included": true,
  "electrical_detail": "New 30A circuit for HPWH",
  "panel_assessment_included": null,
  "breaker_size_required": 30
}
```

**Window Attributes:**
```jsonc
{
  "window_type": "double_hung",     // double_hung | casement | sliding | picture | bay | awning
  "frame_material": "vinyl",        // vinyl | wood | fiberglass | aluminum | composite
  "glass_type": "triple_pane",      // single | double | triple
  "u_factor": 0.22,
  "shgc": 0.25,                     // Solar Heat Gain Coefficient
  "visible_transmittance": 0.44,
  "window_count": 12,
  "total_united_inches": 1440,
  "low_e_coating": true,
  "argon_filled": true,
  "installation_type": "full_frame", // full_frame | insert | new_construction
  "trim_included": true,
  "trim_detail": "Interior and exterior trim replacement",
  "screen_included": true,
  "lead_paint_abatement": null,     // null triggers question for pre-1978 homes
  "structural_modifications": false,
  "structural_detail": "No structural changes needed"
}
```

**Roofing Attributes:**
```jsonc
{
  "roof_type": "shingle",           // shingle | metal | tile | flat | slate | cedar
  "material_brand": "GAF",
  "material_line": "Timberline HDZ",
  "scope": "full_replacement",      // full_replacement | partial | repair | overlay
  "tear_off_included": true,
  "tear_off_layers": 1,
  "square_footage": 2400,
  "squares": 24,                    // roofing squares (100 sq ft each)
  "underlayment_type": "synthetic",
  "ice_water_shield_included": true,
  "ridge_vent_included": true,
  "flashing_included": true,
  "flashing_detail": "Replace all step and counter flashing",
  "gutter_included": false,
  "gutter_detail": "Gutters not included",
  "structural_inspection": null,    // null triggers question
  "decking_repair_included": null,
  "decking_detail": null
}
```

**Solar Attributes:**
```jsonc
{
  "system_size_kw": 8.4,
  "panel_count": 21,
  "panel_brand": "REC",
  "panel_model": "Alpha Pure-R 400W",
  "panel_wattage": 400,
  "inverter_type": "microinverter",  // microinverter | string | hybrid | optimizer
  "inverter_brand": "Enphase",
  "inverter_model": "IQ8+",
  "battery_included": false,
  "battery_detail": null,
  "monitoring_included": true,
  "estimated_annual_production_kwh": 10200,
  "roof_mounting_type": "flush",     // flush | tilt | ground | carport
  "electrical_included": true,       // shared concern
  "panel_upgrade_included": null,
  "interconnection_included": true,
  "net_metering_eligible": true
}
```

### Why JSONB Instead of Separate Tables per Category

| Approach | Pros | Cons |
|----------|------|------|
| Separate table per category (bid_scope_hvac, bid_scope_windows, ...) | Strong typing, Postgres constraints | Migration per new category, rigid schema, many tables to maintain |
| Single JSONB column on bid_scope | Zero migrations for new categories, flexible | No Postgres-level validation, harder to query individual fields |
| **Hybrid: universal columns + category JSONB** | Universal fields are typed + indexed; category fields are flexible | Slightly more complex extraction logic |

The hybrid approach wins because:
- **Universal fields** (pricing, warranty, timeline) are queried constantly → they deserve real columns with indexes
- **Category fields** change as we learn → JSONB lets us iterate without migrations
- **Category JSON schemas** are defined in application code and enforced by extraction agents
- **New categories** = new JSON schema definition + new extraction prompt. No DB migration.

---

## 3. Data Model

### Entity Relationships

```
projects (1)
  └── bids (1-5 per project, one per uploaded document)
        ├── bid_documents (1:1 — file metadata)
        ├── bid_elements (1:N — Unstructured.io parsed elements)
        ├── bid_contractors (1:1 — contractor info, research)
        └── bid_configurations (1:N — options within this bid)
              ├── bid_scope (1:1 per config — universal fields)
              ├── bid_category_attributes (1:N per config — one per category detected)
              ├── bid_equipment (1:N per config — equipment items)
              └── contractor_questions (1:N per config — generated questions)

comparison_results (1 per project — cross-config analysis)
recommendation (1 per project — final recommendation)
```

### Key Tables

#### projects
```sql
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id),
    name            TEXT NOT NULL,
    project_type    TEXT NOT NULL,           -- 'hvac', 'water_heater', 'windows', 'roofing', 'solar', 'multi'
    address         TEXT,
    zip_code        TEXT,
    home_year_built INTEGER,                -- matters for lead paint (windows), asbestos (roofing), panel age (HVAC)
    user_priorities JSONB,                  -- {"price": 4, "efficiency": 5, "warranty": 3, ...}
    user_notes      TEXT,
    status          TEXT NOT NULL DEFAULT 'draft',  -- draft | processing | complete | failed
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

#### bid_configurations
```sql
CREATE TABLE bid_configurations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id          UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    config_index    INTEGER NOT NULL DEFAULT 0,  -- 0-based index within this bid
    config_label    TEXT,                         -- "Option A: Carrier 3-ton Heat Pump"
    categories      TEXT[] NOT NULL,              -- ['hvac'], or ['hvac', 'water_heater'] for bundles
    primary_category TEXT NOT NULL,               -- main category for routing
    system_type     TEXT,                         -- category-specific: 'heat_pump', 'tank', 'shingle', etc.
    is_primary      BOOLEAN DEFAULT true,         -- user's preferred option (if indicated)
    is_bundle       BOOLEAN DEFAULT false,        -- true when bid covers multiple categories
    bundle_strategy TEXT,                         -- 'decomposed' | 'unified' | null
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(bid_id, config_index)
);
```

#### bid_scope (universal fields only)
```sql
CREATE TABLE bid_scope (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_id        UUID NOT NULL REFERENCES bid_configurations(id) ON DELETE CASCADE,
    -- Pricing (10)
    total_bid_amount        DECIMAL,
    labor_cost              DECIMAL,
    equipment_cost          DECIMAL,
    materials_cost          DECIMAL,
    permit_cost             DECIMAL,
    disposal_cost           DECIMAL,
    electrical_cost         DECIMAL,
    total_before_rebates    DECIMAL,
    estimated_rebates       DECIMAL,
    total_after_rebates     DECIMAL,
    -- Payment Terms (5)
    deposit_required        BOOLEAN,
    deposit_percentage      DECIMAL,
    payment_schedule        TEXT,
    financing_offered       BOOLEAN,
    financing_terms         TEXT,
    -- Warranty (4)
    labor_warranty_years    INTEGER,
    equipment_warranty_years INTEGER,
    extended_warranty_years  INTEGER,  -- renamed from compressor_warranty; category-agnostic
    additional_warranty_details TEXT,
    -- Timeline (4)
    estimated_days          INTEGER,
    start_date_available    DATE,
    bid_date                DATE,
    valid_until             DATE,
    -- Universal Scope Booleans (6 pairs = 12)
    permit_included         BOOLEAN,    -- three-state: true/false/null
    permit_detail           TEXT,
    disposal_included       BOOLEAN,
    disposal_detail         TEXT,
    commissioning_included  BOOLEAN,
    commissioning_detail    TEXT,
    thermostat_included     BOOLEAN,    -- smart device, broadly applicable
    thermostat_detail       TEXT,
    inspection_included     BOOLEAN,    -- post-install inspection
    inspection_detail       TEXT,
    cleanup_included        BOOLEAN,
    cleanup_detail          TEXT,
    -- Extraction Meta (2)
    extraction_confidence   TEXT NOT NULL DEFAULT 'medium',  -- high/medium/low
    extraction_notes        TEXT,
    -- Flexible storage
    accessories             JSONB DEFAULT '[]',
    line_items              JSONB DEFAULT '[]',
    created_at              TIMESTAMPTZ DEFAULT now(),
    UNIQUE(configuration_id)
);
```

#### bid_category_attributes
```sql
CREATE TABLE bid_category_attributes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_id    UUID NOT NULL REFERENCES bid_configurations(id) ON DELETE CASCADE,
    category            TEXT NOT NULL,       -- 'hvac', 'water_heater', 'windows', 'roofing', 'solar'
    attributes          JSONB NOT NULL,      -- validated against category schema by agent
    confidence          TEXT NOT NULL DEFAULT 'medium',
    created_at          TIMESTAMPTZ DEFAULT now(),
    UNIQUE(configuration_id, category)
);
```

#### bid_equipment (multi-row, category-aware)
```sql
CREATE TABLE bid_equipment (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_id        UUID NOT NULL REFERENCES bid_configurations(id) ON DELETE CASCADE,
    category                TEXT NOT NULL,       -- 'hvac', 'water_heater', 'solar', etc.
    equipment_type          TEXT NOT NULL,       -- category-specific: 'heat_pump', 'air_handler', 'panel', 'inverter'
    system_role             TEXT,                -- 'primary_both', 'primary_cooling', 'primary_heating', 'air_distribution', 'secondary', 'storage'
    brand                   TEXT,
    model_number            TEXT,
    model_name              TEXT,
    -- Capacity (universal)
    capacity_value          DECIMAL,            -- numeric value
    capacity_unit           TEXT,               -- 'tons', 'btu', 'gallons', 'kw', 'watts', 'sqft'
    -- Efficiency (universal container, category-specific meaning)
    efficiency_ratings      JSONB DEFAULT '{}', -- {"seer2": 20.5, "hspf2": 10.0} or {"uef": 3.42} or {"u_factor": 0.22}
    -- Electrical
    voltage                 INTEGER,
    amperage_draw           DECIMAL,
    minimum_circuit_amperage DECIMAL,
    -- Physical
    refrigerant_type        TEXT,
    variable_speed          BOOLEAN,
    stages                  INTEGER,
    sound_level_db          DECIMAL,
    -- Certifications
    energy_star_certified   BOOLEAN,
    energy_star_most_efficient BOOLEAN,
    -- Warranty
    warranty_years          INTEGER,
    extended_warranty_years  INTEGER,
    -- Cost (from bid only, NEVER researched)
    equipment_cost          DECIMAL,
    -- Research metadata
    research_sources        JSONB DEFAULT '[]',
    confidence              TEXT NOT NULL DEFAULT 'medium',
    created_at              TIMESTAMPTZ DEFAULT now()
);
```

**Key design decision: `efficiency_ratings` as JSONB.**

Different equipment types have completely different efficiency metrics:
- HVAC heat pump: `{"seer2": 20.5, "hspf2": 10.0, "seer": 22.0, "hspf": 10.5, "cop": 4.2}`
- HVAC furnace: `{"afue": 96.0}`
- Water heater: `{"uef": 3.42, "first_hour_rating": 67}`
- Window: `{"u_factor": 0.22, "shgc": 0.25, "visible_transmittance": 0.44}`
- Solar panel: `{"efficiency_pct": 21.5, "temp_coefficient": -0.26}`

Putting these in a JSONB column means:
- No null SEER2 columns on window equipment rows
- Category-specific agents know which keys to populate
- Comparison logic reads the appropriate keys for the category
- New efficiency metrics don't require migrations

---

## 4. The Comparison Surface Concept

When bids don't share all fields, what CAN be compared?

### Definition

A **comparison surface** is the set of fields where two or more configurations overlap and can be meaningfully compared. It's computed dynamically based on what categories and fields are present in the bids being compared.

### Three Comparison Layers

```
Layer 1: Universal Comparison (ALWAYS available)
  ├── Total cost
  ├── Cost breakdown (labor, equipment, materials, permits)
  ├── Warranty duration
  ├── Timeline
  ├── Payment terms
  ├── Scope inclusions/exclusions (universal booleans)
  └── Contractor reputation

Layer 2: Same-Category Comparison (when categories match)
  ├── Category-specific attributes (side by side)
  ├── Equipment specs (efficiency ratings for same equipment types)
  ├── Category-specific scope items
  └── Category-specific safety concerns

Layer 3: Cross-Category Analysis (when categories differ)
  ├── Narrative bridge: "Heat pump vs Furnace+AC tradeoffs"
  ├── Operating cost projection (if data available)
  ├── Environmental impact comparison
  ├── Long-term cost of ownership
  └── Technology decision guidance (not just contractor decision)
```

### How It Works in Practice

**Scenario 1: Two heat pump bids (same category)**
→ Full comparison surface. All universal + all HVAC attributes compared 1:1.

**Scenario 2: Heat pump vs furnace+AC (same job, different system types)**
→ Universal fields compared directly (cost, warranty, timeline).
→ HVAC attributes compared with context: "Heat pump SEER2 20.5 vs Furnace AFUE 96% + AC SEER2 19.2"
→ Layer 3 narrative: "Heat pump provides both heating and cooling from one system. Furnace+AC requires two separate systems. Heat pump eliminates gas dependency. Furnace+AC may have lower upfront cost but higher operating cost."
→ This can happen WITHIN the same bid (contractor offers both options) — then it's comparing technology, not contractors.

**Scenario 3: Heat pump + water heater bundle vs standalone heat pump**
→ User chooses decomposition strategy:
  - **Decomposed**: Split bundle. Compare heat pump portions 1:1. Show water heater as "additional scope in Bid A."
  - **Unified**: Compare total costs with context: "Bid A includes water heater replacement ($X value). Adjusting for scope, the HVAC-only portion is approximately $Y."

**Scenario 4: Window quotes (completely different category)**
→ Only universal fields from HVAC bids are relevant (if comparing across projects).
→ Within a window project: full window attribute comparison (U-factor, frame material, glass type, window count, per-window cost).

**Scenario 5: Mixed project — HVAC + roofing quotes**
→ Each category gets its own comparison group.
→ Universal fields (cost, warranty, timeline) compared across all bids.
→ Category-specific comparisons only within matching categories.
→ Bundle detection: "Contractor A offers HVAC + roofing together for $X (vs $Y+$Z separately)."

### Comparison Surface Resolution

```python
def compute_comparison_surface(configurations):
    """Determine what can be compared across a set of configurations."""

    surface = {
        "universal": True,  # always available
        "categories": {},
        "cross_category_pairs": [],
        "bundle_notes": []
    }

    # Group by category
    by_category = group_by(configurations, key="primary_category")

    for category, configs in by_category.items():
        if len(configs) >= 2:
            # Same-category comparison available
            surface["categories"][category] = {
                "configs": configs,
                "shared_attributes": intersect_attributes(configs),
                "unique_attributes": diff_attributes(configs)
            }

    # Detect cross-category pairs (same job, different tech)
    for cat_a, cat_b in combinations(by_category.keys(), 2):
        if are_comparable_categories(cat_a, cat_b):
            surface["cross_category_pairs"].append({
                "categories": [cat_a, cat_b],
                "comparison_type": "technology_decision",
                "narrative_required": True
            })

    # Detect bundles
    for config in configurations:
        if config.is_bundle:
            surface["bundle_notes"].append({
                "config": config,
                "categories": config.categories,
                "strategy": config.bundle_strategy
            })

    return surface
```

---

## 5. Category Detection & Classification

### The Classification Agent

Runs immediately after Unstructured.io parsing, BEFORE any extraction.

**Input:** Parsed document elements (titles, tables, narrative text)

**Output per bid:**
```jsonc
{
  "bid_id": "uuid",
  "detected_categories": ["hvac", "water_heater"],  // what's in this bid
  "primary_category": "hvac",                         // main focus
  "is_bundle": true,                                  // multiple categories detected
  "configurations": [
    {
      "config_index": 0,
      "config_label": "Option A: Carrier 3-Ton Heat Pump + AO Smith HPWH",
      "categories": ["hvac", "water_heater"],
      "system_type": "heat_pump",
      "element_ranges": [                             // which document elements belong to this config
        {"start_element": 0, "end_element": 45},
        {"start_element": 82, "end_element": 95}
      ]
    },
    {
      "config_index": 1,
      "config_label": "Option B: Lennox Furnace + AC",
      "categories": ["hvac"],
      "system_type": "furnace_ac",
      "element_ranges": [
        {"start_element": 46, "end_element": 81}
      ]
    }
  ],
  "confidence": "high"
}
```

**Detection patterns** (leveraging Unstructured.io elements):
- Section headers: "Option A", "Option B", "System 1", "System 2", "Good/Better/Best", "Proposal 1"
- Multiple pricing tables with different equipment references
- Repeated equipment specification blocks
- Mixed category keywords: "heat pump" + "water heater" in same document
- Price subtotals that correspond to different systems

### The Gate Logic

After classification, apply category-appropriate validation:

```
IF project_type = 'hvac':
  - Verify at least one configuration has categories including 'hvac'
  - Flag non-HVAC-only configurations (don't reject — they may be bundles)
  - Check is_heat_pump if user specified heat pump project

IF project_type = 'multi':
  - Accept all categories
  - Group configurations by category for comparison routing

IF any configuration has unknown category:
  - Flag for user review: "We detected a bid that doesn't match your project type"
  - Don't halt — extract universal fields regardless
```

**Key change from MindPal**: The gate no longer rejects non-heat-pump bids. It **classifies and routes**. A furnace+AC bid in a heat pump project becomes a cross-category comparison opportunity, not a rejection.

---

## 6. Configuration Detection

### How It Works with Unstructured.io Elements

Unstructured returns typed elements. Configuration boundaries align with:

| Element Pattern | Likely Configuration Boundary |
|----------------|------------------------------|
| `Title` containing "Option A/B/C" | Explicit multi-option bid |
| `Title` containing "System 1/2/3" | Explicit multi-system bid |
| `Title` containing "Good/Better/Best" | Tiered pricing bid |
| Multiple `Table` elements with equipment specs | Implicit multi-option |
| `Header` with "Proposal" or "Quote" + number | Multiple proposals in one PDF |
| Repeated pricing structures | Same contractor, different options |

### Element Routing

Once configurations are identified, each downstream agent receives only the **relevant elements** for its configuration — not the entire document:

```
Document Elements [0-120]
  ├── Config 0 elements [0-45, 82-95]  → Extraction Agent (config 0)
  ├── Config 1 elements [46-81]        → Extraction Agent (config 1)
  └── Shared elements [96-120]         → Applied to ALL configs (terms, contractor info, etc.)
```

This is a massive efficiency win: agents process only relevant context, reducing token usage and improving accuracy.

### Single-Config Bids

Most bids have one configuration. The system handles this naturally:
- Configuration Detection creates one `bid_configurations` record with `config_index=0`
- All elements are assigned to that single configuration
- Downstream processing is identical — it just happens once instead of N times

---

## 7. Bundle Handling

### Detection

A bundle is a single configuration that spans multiple categories:
- "Heat pump installation + water heater replacement" = bundle
- "Option A: Heat Pump" and "Option B: Furnace+AC" = multi-config, NOT a bundle

### User Choice

When a bundle is detected, the system asks the user:

> "Contractor A's bid includes both HVAC and water heater work. How would you like to compare this?"
>
> **Option 1: Keep as unified bid** — Compare total cost and full scope. The extra work will be noted as additional scope that other bids don't include.
>
> **Option 2: Decompose into items** — Split into an HVAC portion and a water heater portion so each can be compared independently with other bids.

### Decomposition Strategy

When decomposed:
1. The single `bid_configurations` record gets `bundle_strategy = 'decomposed'`
2. Two `bid_category_attributes` records are created (one per category)
3. Cost allocation becomes the challenge:
   - If bid itemizes costs per category → use those numbers
   - If bid shows only total → extraction agent estimates split with LOW confidence
   - `extraction_notes` documents the allocation: "Total $22,000 split estimated: HVAC $18,000 + Water Heater $4,000 based on line items"
4. Questions are generated about the cost breakdown: "Can you provide separate pricing for the HVAC and water heater portions?"

### Unified Strategy

When kept unified:
1. `bundle_strategy = 'unified'`
2. Comparison shows the full cost alongside narrower-scope bids
3. A "scope adjustment" note: "Bid A includes water heater replacement (~$X value). Other bids cover HVAC only."
4. The comparison surface flags this as an apples-to-oranges situation

---

## 8. Agent Architecture

### Agent Routing by Category

```
ALWAYS RUN (all categories):
  1. Document Parser (Unstructured.io)
  2. Classification Agent (category detection, config detection)
  3. Universal Scope Extractor (pricing, warranty, timeline, universal booleans)
  4. Bid QA Agent (completeness check, confidence assessment)
  5. Question Generator (category-aware, cross-config)
  6. Comparison Agent (universal fields + comparison surface)
  7. Recommendation Agent

CATEGORY-SPECIFIC (run when category detected):
  HVAC:
    - HVAC Scope Extractor (electrical safety fields, ductwork, line sets, etc.)
    - Equipment Researcher (AHRI lookup, manufacturer specs)
    - HVAC Comparison Module (system type comparison, efficiency comparison)

  Water Heater:
    - Water Heater Scope Extractor (venting, recirculation, expansion tank)
    - Equipment Researcher (UEF lookup, first hour rating)

  Windows:
    - Window Scope Extractor (frame material, glass type, U-factor, window count)
    - Window Comparison Module (per-window cost normalization)

  Roofing:
    - Roofing Scope Extractor (material, tear-off, decking, flashing)
    - Roofing Comparison Module (per-square cost normalization)

  Solar:
    - Solar Scope Extractor (panel specs, inverter, battery, production estimate)
    - Equipment Researcher (panel efficiency, inverter specs)
    - Solar Comparison Module (cost-per-watt, payback period)

ON-DEMAND (user or QA-triggered):
  - Contractor Researcher (BBB, licensing, reviews)
  - Operating Cost Estimator (energy cost projections — useful for cross-type HVAC comparison)
  - Incentive Finder (rebates, tax credits — category-specific)
```

### Agent Prompt Structure

Each agent prompt follows a template:

```
SYSTEM:
  You are a {category} bid extraction specialist.

  ANTI-HALLUCINATION RULES:
  - NEVER fabricate data. If not in the document, output null.
  - NEVER use "typical" or "estimated" values.
  - null is ALWAYS better than a guess.
  - Equipment cost is ONLY extracted from the bid, NEVER researched.

  THREE-STATE BOOLEAN RULES:
  - true = explicitly included in bid
  - false = explicitly excluded by contractor
  - null = not mentioned (DIFFERENT from false — triggers clarification question)

  CONFIDENCE SCORING:
  - high: ≥90% of expected fields found and clearly stated
  - medium: 70-89% of fields found or some ambiguity
  - low: <70% of fields found or significant ambiguity

TASK:
  Extract {category}-specific attributes from the following document elements.
  Configuration: {config_label}
  Relevant elements: {filtered_elements}

OUTPUT:
  {category_json_schema}
```

### Category-Specific Safety Rules

| Category | Safety-Critical Fields | Auto-Question Trigger |
|----------|----------------------|----------------------|
| HVAC | Electrical panel assessment, breaker size, load calculation | panel_assessment_included = null |
| Water Heater | Venting type (CO risk), gas line work | venting_type = null AND fuel_type = 'natural_gas' |
| Windows | Lead paint (pre-1978 homes), structural modifications | home_year_built < 1978 AND lead_paint_abatement = null |
| Roofing | Structural inspection, decking condition, ice dam protection | structural_inspection = null |
| Solar | Roof structural assessment, panel upgrade, interconnection | panel_upgrade_included = null |
| Electrical | Permit, inspection, code compliance | electrical_permit_included = null |

---

## 9. Question Generator — Category-Aware Design

### Preserved from MindPal v8

- **4-tier priority**: critical, high, medium, low
- **Per-question fields**: `good_answer_looks_like`, `concerning_answer_looks_like`, `triggered_by`, `missing_field`, `context`
- **Per-config summary**: `questions_summary` with tier counts and `main_concerns`

### Expanded Question Categories

```
UNIVERSAL CATEGORIES (all bid types):
  pricing           — cost breakdowns, payment terms, hidden fees
  scope             — what's included/excluded, scope gaps between bids
  warranty          — coverage details, conditions, transferability
  timeline          — schedule, availability, project duration
  contractor        — licensing, insurance, experience, references

CATEGORY-SPECIFIC:
  electrical        — panel assessment, circuits, permits (HVAC, solar, water heater)
  equipment         — specs, models, efficiency, sizing (all categories)
  structural        — load bearing, modifications, inspections (roofing, solar, windows)
  safety            — venting, CO, lead paint, asbestos (water heater, windows, roofing)

CROSS-CONFIG:
  system_comparison — "Why should I choose Option A over Option B?"
  technology_choice — "What are the tradeoffs of heat pump vs furnace+AC?"
  bundle_value      — "Is the bundle discount worth it vs separate contractors?"
```

### Trigger Types (expanded from 9 to 12)

```
Existing (from MindPal v8):
  missing_field         — field present in other bids but not this one
  scope_difference      — scope items not explicitly addressed
  price_variance        — >15% spread across bids
  unclear_term          — vague warranty or conditions
  red_flag              — contractor research findings
  negotiation           — opportunities based on competitor bids
  electrical            — panel requirements (HVAC, solar)
  standard_essential    — basic protective questions (all categories)
  technical_verification — equipment/performance verification

New for multi-category:
  safety_critical       — category-specific safety concerns (lead paint, CO, structural)
  bundle_decomposition  — questions about cost allocation in bundled bids
  technology_decision   — cross-type comparison questions (heat pump vs furnace)
```

---

## 10. Frontend Rendering Strategy

### Comparison Table — Dynamic Columns

Instead of a fixed comparison table, the frontend builds columns dynamically based on the comparison surface:

```
Universal Section (always shown):
  ┌──────────────┬───────────┬───────────┬───────────┐
  │              │ Bid A     │ Bid B     │ Bid C     │
  ├──────────────┼───────────┼───────────┼───────────┤
  │ Total Cost   │ $18,500   │ $22,000   │ $16,200   │
  │ Warranty     │ 10 years  │ 12 years  │ 5 years   │
  │ Timeline     │ 3 days    │ 5 days    │ 2 days    │
  │ Financing    │ Yes       │ No        │ Yes       │
  └──────────────┴───────────┴───────────┴───────────┘

Category Section (shown when categories match):
  HVAC Comparison:
  ┌──────────────┬───────────┬───────────┬───────────┐
  │ System Type  │ Heat Pump │ Heat Pump │ Furn+AC   │  ← different type highlighted
  │ SEER2        │ 20.5      │ 18.0      │ 19.2 (AC) │
  │ HSPF2        │ 10.0      │ 9.5       │ — (AFUE   │  ← different metric shown
  │              │           │           │    96.0%)  │
  │ Electrical   │ Included  │ ⚠ Unknown │ Included  │  ← null = warning
  └──────────────┴───────────┴───────────┴───────────┘

Cross-Type Narrative (when types differ):
  ┌────────────────────────────────────────────────────┐
  │ Technology Comparison: Heat Pump vs Furnace+AC     │
  │                                                    │
  │ Bids A and B propose heat pump systems that        │
  │ provide both heating and cooling from a single     │
  │ unit. Bid C proposes a gas furnace for heating     │
  │ paired with an AC condenser for cooling.           │
  │                                                    │
  │ Key tradeoffs:                                     │
  │ • Heat pump eliminates gas dependency              │
  │ • Furnace+AC may have lower upfront cost           │
  │ • Heat pump typically has lower operating cost     │
  │ • Furnace+AC may perform better in extreme cold    │
  └────────────────────────────────────────────────────┘

Bundle Note (when scope differs):
  ┌────────────────────────────────────────────────────┐
  │ ℹ Bid A includes water heater replacement          │
  │   (~$4,000 estimated value) that other bids        │
  │   do not include. Scope-adjusted HVAC cost:        │
  │   ~$14,500                                         │
  └────────────────────────────────────────────────────┘
```

### Missing Field Rendering

Three-state boolean rendering:

| Value | Display | Color |
|-------|---------|-------|
| `true` | "Included" + detail text | Green |
| `false` | "Not included" + detail text | Red |
| `null` | "Not specified" + question icon | Yellow/warning |

---

## 11. Edge Cases — Comprehensive List

### Within-Bid Edge Cases

| Scenario | Detection | Handling |
|----------|-----------|---------|
| 3 options in one PDF (Good/Better/Best) | Configuration Detection finds 3 title/pricing blocks | Create 3 `bid_configurations`, extract each independently |
| Bundle: HVAC + water heater | Classification detects multiple categories | Ask user: decompose or unified |
| Bundle: HVAC + electrical panel upgrade | Panel upgrade is part of HVAC scope, not separate category | Keep as single HVAC config, populate electrical safety fields |
| Bid with add-ons: "Base price $16k, add ductwork $3k" | Configuration Detection or Scope Extractor identifies add-on pricing | Extract base config + note add-ons in line_items JSONB |
| Photo of handwritten bid | Unstructured.io hi_res + OCR | Lower confidence, more null fields, more questions generated |
| Email chain with bid details | Unstructured.io email parsing | Extract from structured email content |

### Cross-Bid Edge Cases

| Scenario | Detection | Handling |
|----------|-----------|---------|
| Heat pump vs furnace+AC | Classification detects different system_types | Layer 3 cross-category narrative + universal comparison |
| 2 heat pump bids + 1 furnace+AC | Mixed categories in same project | Group heat pumps for direct comparison; furnace+AC gets cross-category analysis |
| Bid A includes ductwork, Bid B doesn't | Scope boolean difference (ductwork_included: true vs false) | Scope difference section + question to Bid B: "Is ductwork replacement needed?" |
| Bid A: $18k standalone, Bid B: $22k bundle with water heater | Bundle detection | Scope adjustment note: "Bid B includes ~$4k of water heater work" |
| Same contractor, 2 different bids for different options | Configuration Detection at upload (same contractor name) | Could be multi-config OR genuinely separate bids — ask user |
| Wildly different pricing (>50% spread) | Price variance trigger | HIGH priority question: "Why is this bid significantly higher/lower?" |
| One bid missing contractor info | Contractor name extraction failure | Flag in QA, generate question, proceed with extraction |

### Category-Specific Edge Cases

| Category | Edge Case | Handling |
|----------|-----------|---------|
| HVAC | Hybrid system (heat pump + gas backup) | Valid config; extract both equipment rows; system_type = 'hybrid' |
| HVAC | Mini-split with multiple indoor heads | One heat_pump equipment row; heads noted in category attributes |
| Water Heater | Heat pump water heater (overlaps HVAC) | Category = 'water_heater'; system_type = 'heat_pump_water_heater'; distinct from HVAC heat pump |
| Windows | Different windows quoted per opening | Extract total window count + per-window details in line_items JSONB |
| Windows | Pre-1978 home, no lead paint mention | Safety trigger: lead_paint_abatement = null → HIGH priority question |
| Roofing | Tear-off vs overlay (different approaches) | system_type = 'full_replacement' vs 'overlay'; cross-type comparison with narrative |
| Roofing | Decking condition unknown | structural: decking_repair_included = null → question trigger |
| Solar | Battery included in one bid, not another | Scope difference flagged; comparison adjusts for scope |
| Solar | Different system sizes (6kW vs 10kW) | Not apples-to-apples; generate question about sizing rationale |
| Electrical | Panel upgrade as standalone bid vs bundled with HVAC | If standalone: separate project. If bundled: HVAC category attribute |

### Technology Comparison Edge Cases

| Scenario | Challenge | Approach |
|----------|-----------|---------|
| Heat pump vs furnace+AC | Different efficiency metrics (SEER2/HSPF2 vs AFUE+SEER2) | Show each system's metrics in its own units; narrative compares heating efficiency conceptually |
| Tank vs tankless water heater | Different capacity metrics (gallons vs GPM) | Show each in native units; narrative explains tradeoff (storage vs flow rate) |
| Shingle vs metal roof | Different lifespans, costs, maintenance | Universal cost comparison + narrative on lifespan and long-term value |
| String inverter vs microinverter | Different warranty, failure modes, monitoring | Equipment comparison with narrative on tradeoffs |
| Central heat pump vs mini-split | Same category but different installation approaches | system_type comparison within HVAC; narrative on ducted vs ductless |

---

## 12. Idempotency & Upsert Strategy

| Table | Upsert Key | Strategy | Rationale |
|-------|-----------|----------|-----------|
| bid_configurations | (bid_id, config_index) | UPSERT | Config detection may re-run |
| bid_scope | (configuration_id) | UPSERT | 1:1 per config |
| bid_category_attributes | (configuration_id, category) | UPSERT | 1:1 per config per category |
| bid_equipment | (configuration_id) | DELETE + INSERT | 1:N, set changes on re-run |
| bid_contractors | (bid_id) | UPSERT | 1:1 per bid (not per config) |
| contractor_questions | (configuration_id) | DELETE + INSERT | 1:N, regenerated fully |
| comparison_results | (project_id) | UPSERT | 1:1 per project |
| recommendation | (project_id) | UPSERT | 1:1 per project |

---

## 13. MVP vs Full Build

### MVP (Ship First)

1. Upload 1-3 bid documents
2. Unstructured.io parsing
3. Classification (category + config detection)
4. Universal scope extraction (pricing, warranty, timeline)
5. HVAC category extraction (preserve proven 69-column knowledge)
6. Equipment extraction (multi-row, AHRI research for HVAC)
7. Question Generator (universal + HVAC categories)
8. Universal comparison table
9. Recommendations

**MVP supports:** HVAC comparisons (heat pump, furnace+AC, mini-split, hybrid) with multi-config and cross-type comparison.

### Phase 2 (Fast Follow)

10. Water heater category extraction + comparison
11. Bundle detection + decomposition UI
12. Contractor research agent
13. Chat assistant

### Phase 3 (Expansion)

14. Window category
15. Roofing category
16. Solar category
17. Operating cost estimator (cross-type HVAC comparison)
18. Incentive finder

### Adding a New Category Checklist

To add a new category (e.g., "insulation"):

1. Define the category JSON schema (attribute fields, types, validation rules)
2. Define category-specific safety rules (what triggers HIGH priority questions)
3. Write the category extraction agent prompt
4. Define comparison normalization rules (cost-per-unit, key metrics)
5. Add category to Classification Agent's detection patterns
6. Add category-specific question triggers to Question Generator
7. Add frontend rendering for category-specific comparison columns
8. NO database migrations needed (JSONB handles it)

---

## 14. Key Architecture Principles

1. **Universal fields are columns; category fields are JSONB** — queryable where it matters, flexible where it needs to be
2. **Configuration is the unit of comparison, not the document** — one document may contain multiple comparable options
3. **Three-state booleans drive question generation** — null ≠ false, this is non-negotiable
4. **Comparison surfaces are computed, not assumed** — the system figures out what's comparable
5. **Anti-hallucination rules apply to ALL categories** — null is always better than a guess
6. **Category schemas are application-layer contracts** — not Postgres DDL, so they can evolve without migrations
7. **Agents receive filtered context** — only relevant elements for their configuration, reducing tokens and improving accuracy
8. **Cross-type comparison uses narrative, not force-fit tables** — heat pump vs furnace+AC can't be reduced to a single efficiency number
9. **Bundles are a user decision** — the system detects them, the user chooses how to handle them
10. **New categories don't require architectural changes** — just a schema definition + prompt + safety rules
