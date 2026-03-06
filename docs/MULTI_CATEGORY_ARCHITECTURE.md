# BidSmart Architecture & Implementation Plan

> "You've got an HVAC expert." "You've got a roofing specialist." "You've got a window pro."
>
> A modular bid comparison platform for major home systems and projects.
>
> Date: 2026-03-06
> Status: Architecture Proposal
> MVP Focus: HVAC (heat pumps, furnace+AC, mini-splits, hybrids)

---

## 1. Overview

BidSmart is a web application that helps homeowners compare contractor bids for major home projects. Users upload one to five contractor proposals (PDFs, images, DOCX, etc.). The system processes these documents using Unstructured.io to convert them into structured document elements with metadata. These elements are stored in Supabase and used by specialized LLM agents to extract key information, research equipment specifications, compare proposals, and generate recommendations.

The system is **category-aware**: it detects what type of project each bid covers (HVAC, roofing, windows, etc.) and routes to specialized extraction agents with deep domain knowledge for that category. A universal extraction layer handles fields common to all bids (pricing, warranty, timeline), while category-specific agents extract the details that matter for each type of work.

Rather than relying on a single long markdown representation of each bid, the system stores multiple layers of structured data:

1. **Raw uploaded document** (immutable evidence)
2. **Parsed document elements** from Unstructured.io (typed, searchable, page-referenced)
3. **Universal + category-specific bid data** (structured JSON produced by agents)
4. **Derived outputs** (comparison tables, recommendations, questions to ask)

This layered architecture supports accurate comparisons, targeted AI analysis, and conversational question answering while maintaining traceability back to the original documents.

### Design Principle

> **Parsed elements are evidence. JSON is the application contract. HTML is optional presentation.**

Evidence remains traceable to the original documents. The UI operates on stable structured data. Narrative presentation is generated where needed but never the source of truth.

---

## 2. Core Technology Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | React + Vite | User interface, deployed on Netlify |
| Database | Supabase (Postgres) | Primary data store, auth, RLS |
| Storage | Supabase Storage | Private buckets for uploaded documents |
| Auth | Supabase Auth | User accounts, session management |
| Document Parsing | Unstructured.io | Converts PDFs/images/DOCX to typed elements |
| AI Agents | Specialized LLM agents (direct API) | Extraction, research, comparison, questions |
| Edge Functions | Supabase Edge Functions | Orchestration, Unstructured.io proxy |
| Deployment | Netlify | Frontend hosting, build pipeline |

### Frontend Responsibilities
- User authentication
- Bid upload interface with drag-and-drop
- Project dashboard with status tracking
- Bid comparison views (dynamic, category-aware)
- Chat assistant interface
- Category-aware branding ("You've got an HVAC expert")

### Backend Responsibilities (Supabase + Edge Functions)
- User accounts and session management
- Project and bid record management
- File storage with signed URLs
- Row Level Security for data isolation
- Edge Functions for agent orchestration
- Unstructured.io API proxy (server-side, protects API credentials)

---

## 3. "You've Got an Expert" — Category-Aware Branding

When the system detects what type of bids a user has uploaded, the UI adapts:

| Category | Greeting | Personality |
|----------|----------|-------------|
| HVAC | "You've got an HVAC expert" | Knows heat pumps, furnaces, efficiency ratings, electrical panels |
| Water Heaters | "You've got a water heater specialist" | Tank vs tankless, venting safety, energy factors |
| Roofing | "You've got a roofing specialist" | Materials, tear-off scope, structural integrity |
| Windows & Doors | "You've got a window pro" | U-factor, glass types, frame materials, lead paint |
| Solar & Battery | "You've got a solar expert" | Panel specs, inverters, production estimates, payback |
| Electrical | "You've got an electrical specialist" | Panel sizing, code compliance, permits |
| Insulation | "You've got an insulation specialist" | R-values, material types, air sealing |
| Siding & Exterior | "You've got an exterior specialist" | Materials, weather resistance, structural backing |
| Plumbing | "You've got a plumbing specialist" | Pipe materials, code requirements, water quality |
| Foundation & Concrete | "You've got a foundation specialist" | Structural assessment, waterproofing, soil conditions |

Gender-neutral throughout. The "expert" adapts its questions, comparisons, and recommendations to the category it's analyzing.

For multi-category or bundled bids, the system shows multiple expertises: "You've got an HVAC expert and a water heater specialist working on your project."

---

## 4. Supported Categories

BidSmart covers **major home systems and projects** where contractors provide detailed proposals. This is not for consumer appliances (refrigerators, dishwashers, microwaves) — it's for work that requires professional installation, permits, and significant investment.

| Category | Sub-Types | What Makes It Distinct |
|----------|-----------|----------------------|
| **HVAC** | Heat pumps, furnace+AC, mini-splits, hybrids, boilers | Efficiency ratings (SEER2/HSPF2/AFUE), electrical panel impact, ductwork scope, refrigerant type |
| **Water Heaters** | Tank, tankless, heat pump water heater, solar thermal | Capacity/flow rate, venting (CO safety), energy factor, fuel type |
| **Roofing** | Shingle, metal, tile, flat, slate, cedar | Material/brand, squares, tear-off scope, underlayment, structural inspection |
| **Windows & Doors** | Replacement, new construction, storm, entry doors | U-factor, SHGC, frame material, glass type, window count, lead paint (pre-1978) |
| **Solar & Battery** | Panels, inverters, batteries, grid-tie, off-grid | System size kW, cost-per-watt, production estimate, interconnection, net metering |
| **Electrical** | Panel upgrades, EV charger, rewiring, generator install | Panel amperage, circuit count, code compliance, permit requirements |
| **Insulation** | Blown-in, spray foam, batt, rigid board | R-value, coverage area, air sealing, vapor barrier, ventilation |
| **Siding & Exterior** | Vinyl, fiber cement, wood, metal, stucco | Material type, coverage sqft, trim/soffit, housewrap, moisture barrier |
| **Plumbing** | Repipe, sewer line, water main, fixture replacement | Pipe material, linear footage, code requirements, camera inspection |
| **Foundation & Concrete** | Repair, waterproofing, slab, piers, retaining walls | Structural assessment, soil conditions, drainage, warranty scope |

Each category has its own spec file at `docs/categories/`. See [Section 13: Category Specs](#13-category-specifications).

---

## 5. High-Level System Flow

```
Step 1: User uploads 1-5 bid documents
  → Supabase Storage (private bucket)
  → bid_documents record created

Step 2: Document Parsing (Unstructured.io)
  → Server-side Edge Function calls Unstructured API
  → Returns typed elements (Title, NarrativeText, Table, ListItem, Header, Footer)
  → Each element has metadata: page_number, coordinates, filename, text_as_html
  → Stored in bid_elements table

Step 3: Classification + Configuration Detection
  → Lightweight agent analyzes parsed elements
  → Identifies category (HVAC, roofing, etc.) and system_type (heat_pump, shingle, etc.)
  → Detects multi-option bids (Option A/B/C) → creates bid_configurations
  → Detects bundles (HVAC + water heater) → flags for user choice
  → Routes downstream agents to appropriate category specialists

Step 4: Universal Extraction (all categories)
  → Pricing, warranty, timeline, payment terms, universal scope booleans
  → Stored in bid_scope (real Postgres columns, queryable)

Step 5: Category-Specific Extraction
  → Category expert agent extracts domain-specific fields
  → HVAC: electrical safety, ductwork, line sets, refrigerant
  → Roofing: material, tear-off, decking, flashing
  → Stored in bid_category_attributes (JSONB, validated by agent)

Step 6: Equipment Extraction + Research
  → Multiple equipment rows per configuration
  → Category-aware: AHRI lookup for HVAC, UEF for water heaters, U-factor for windows
  → Anti-hallucination enforced: never fabricate specs, null > guess
  → Stored in bid_equipment

Step 7: Contractor Research (on-demand)
  → Licensing, BBB, reviews, insurance verification
  → 1:1 per bid (not per configuration)
  → Stored in bid_contractors

Step 8: QA Check
  → Validates extraction completeness
  → Flags missing configurations
  → Reports per-config confidence scores

Step 9: Comparison
  → Computes comparison surface (what CAN be compared)
  → Universal comparison (cost, warranty, timeline) — always available
  → Same-category comparison (full attribute-level) — when categories match
  → Cross-category narrative (technology tradeoffs) — when types differ
  → Stored in comparison_results

Step 10: Question Generation
  → 4-tier priority system, category-aware triggers
  → Per-question: good_answer_looks_like, concerning_answer_looks_like
  → Safety-critical triggers per category (electrical for HVAC, lead paint for windows)
  → Stored in contractor_questions

Step 11: Recommendation
  → Best value, lowest risk, best performance
  → Reasoning tied to user priorities and category expertise
  → Stored in recommendation

Step 12: Chat Assistant
  → Context: canonical schema + relevant element chunks + agent outputs
  → Element-level page/section citations
  → Category-aware responses
```

---

## 6. Unstructured.io Configuration

Documents are processed server-side to protect API credentials.

```
React Upload → Supabase Storage → Edge Function → Unstructured API → bid_elements table
```

### Recommended Settings for Contractor Bids

| Setting | Value | Why |
|---------|-------|-----|
| `strategy` | `hi_res` | Better layout detection for PDFs and scanned bids |
| `chunking_strategy` | `by_title` | Preserves document sections (scope, equipment, warranty, pricing) |
| `infer_table_structure` | `true` | Critical for extracting pricing tables and equipment spec tables |

### Element Types Returned

| Type | Useful For |
|------|-----------|
| `Title` | Section headers, configuration boundaries ("Option A", "System 1") |
| `NarrativeText` | Scope descriptions, warranty terms, notes |
| `ListItem` | Itemized inclusions/exclusions |
| `Table` | Pricing breakdowns, equipment specs, scope matrices |
| `Header` / `Footer` | Company info, page numbers, bid dates |

Each element includes metadata: `page_number`, `coordinates`, `filename`, `text_as_html` (for tables). This allows:
- **Targeted agent prompts** — send only relevant elements, not the whole document
- **Table-specific extraction** — pricing and scope details live in tables
- **Page-level referencing** — chat assistant can cite "page 3, pricing table"
- **Configuration boundary detection** — section headers signal multi-option bids

---

## 7. Layered Data Architecture

### Layer 1: Raw Documents (Immutable Evidence)

Stored in Supabase Storage. Never modified after upload.

```
Path: bids/{user_id}/{project_id}/{bid_id}/source.{ext}
```

### Layer 2: Parsed Document Elements

Returned from Unstructured.io. Stored in Postgres. Queryable by page, element type, or table.

```sql
-- bid_elements: one record per document element
id, document_id, element_id, type, text, metadata (jsonb),
page_number, is_table, created_at
```

Optionally, if chunking is enabled:

```sql
-- bid_chunks: chunked text for retrieval/chat context
id, document_id, chunk_text, chunk_metadata (jsonb), created_at
```

### Layer 3: Structured Bid Data

Agent-extracted data in two layers:
- **Universal fields** in typed Postgres columns (`bid_scope`)
- **Category-specific fields** in validated JSONB (`bid_category_attributes`)
- **Equipment** in shared table with category-aware efficiency ratings (`bid_equipment`)

### Layer 4: Derived Outputs

Agent-generated analysis:
- `comparison_results` — cross-config comparison JSON
- `recommendation` — final recommendation with reasoning
- `contractor_questions` — prioritized questions per configuration
- `agent_runs` — execution metadata for traceability and debugging

---

## 8. Data Model

### Entity Relationships

```
projects (1)
  └── bids (1-5 per project, one per uploaded document)
        ├── bid_documents (1:1 — file metadata, parse status)
        ├── bid_elements (1:N — Unstructured.io parsed elements)
        ├── bid_chunks (1:N — optional, for chat retrieval)
        ├── bid_contractors (1:1 — contractor info + research)
        └── bid_configurations (1:N — options within this bid)
              ├── bid_scope (1:1 per config — universal fields)
              ├── bid_category_attributes (1:N per config — one per category)
              ├── bid_equipment (1:N per config — equipment items)
              └── contractor_questions (1:N per config — generated questions)

comparison_results (1 per project)
recommendation (1 per project)
agent_runs (1:N per project — execution log)
```

### Core Tables

#### projects
```sql
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id),
    name            TEXT NOT NULL,
    project_type    TEXT NOT NULL,       -- 'hvac', 'water_heater', 'roofing', 'windows', 'solar', 'electrical', 'insulation', 'siding', 'plumbing', 'foundation', 'multi'
    address         TEXT,
    zip_code        TEXT,
    home_year_built INTEGER,            -- safety triggers: lead paint (<1978), asbestos, panel age
    user_priorities JSONB,              -- {"price": 4, "efficiency": 5, "warranty": 3, ...}
    user_notes      TEXT,
    status          TEXT NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

#### bids
```sql
CREATE TABLE bids (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    contractor_name TEXT,
    status          TEXT NOT NULL DEFAULT 'uploaded',  -- uploaded | parsing | extracting | complete | failed
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### bid_documents
```sql
CREATE TABLE bid_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id          UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    file_path       TEXT NOT NULL,
    file_name       TEXT,
    file_type       TEXT,               -- pdf, png, jpg, docx, txt
    file_size       INTEGER,
    parse_status    TEXT DEFAULT 'pending',  -- pending | processing | complete | failed
    upload_timestamp TIMESTAMPTZ DEFAULT now(),
    UNIQUE(bid_id)
);
```

#### bid_elements
```sql
CREATE TABLE bid_elements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES bid_documents(id) ON DELETE CASCADE,
    element_id      TEXT,               -- Unstructured's element ID
    type            TEXT NOT NULL,      -- Title, NarrativeText, ListItem, Table, Header, Footer
    text            TEXT,
    metadata        JSONB DEFAULT '{}',
    page_number     INTEGER,
    is_table        BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_bid_elements_document ON bid_elements(document_id);
CREATE INDEX idx_bid_elements_type ON bid_elements(type);
CREATE INDEX idx_bid_elements_page ON bid_elements(page_number);
```

#### bid_chunks (optional, for chat retrieval)
```sql
CREATE TABLE bid_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES bid_documents(id) ON DELETE CASCADE,
    chunk_text      TEXT NOT NULL,
    chunk_metadata  JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### bid_configurations
```sql
CREATE TABLE bid_configurations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id          UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    config_index    INTEGER NOT NULL DEFAULT 0,
    config_label    TEXT,                   -- "Option A: Carrier 3-ton Heat Pump"
    categories      TEXT[] NOT NULL,        -- ['hvac'] or ['hvac', 'water_heater'] for bundles
    primary_category TEXT NOT NULL,         -- main category for agent routing
    system_type     TEXT,                   -- category-specific: 'heat_pump', 'tank', 'shingle'
    is_primary      BOOLEAN DEFAULT true,   -- user's preferred option if indicated
    is_bundle       BOOLEAN DEFAULT false,  -- multiple categories in one config
    bundle_strategy TEXT,                   -- 'decomposed' | 'unified' | null
    element_ranges  JSONB,                  -- which document elements belong to this config
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(bid_id, config_index)
);
```

#### bid_scope (universal fields — real columns, always comparable)
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
    deposit_required        BOOLEAN,        -- three-state: true/false/null
    deposit_percentage      DECIMAL,
    payment_schedule        TEXT,
    financing_offered       BOOLEAN,
    financing_terms         TEXT,
    -- Warranty (4)
    labor_warranty_years    INTEGER,
    equipment_warranty_years INTEGER,
    extended_warranty_years  INTEGER,
    additional_warranty_details TEXT,
    -- Timeline (4)
    estimated_days          INTEGER,
    start_date_available    DATE,
    bid_date                DATE,
    valid_until             DATE,
    -- Universal Scope Booleans (6 pairs = 12)
    permit_included         BOOLEAN,        -- three-state: true/false/null
    permit_detail           TEXT,
    disposal_included       BOOLEAN,
    disposal_detail         TEXT,
    commissioning_included  BOOLEAN,
    commissioning_detail    TEXT,
    thermostat_included     BOOLEAN,
    thermostat_detail       TEXT,
    inspection_included     BOOLEAN,
    inspection_detail       TEXT,
    cleanup_included        BOOLEAN,
    cleanup_detail          TEXT,
    -- Extraction Meta
    extraction_confidence   TEXT NOT NULL DEFAULT 'medium',  -- high | medium | low
    extraction_notes        TEXT,
    -- Flexible storage for variable-length items
    accessories             JSONB DEFAULT '[]',
    line_items              JSONB DEFAULT '[]',
    created_at              TIMESTAMPTZ DEFAULT now(),
    UNIQUE(configuration_id)
);
```

#### bid_category_attributes (category-specific fields — JSONB, flexible)
```sql
CREATE TABLE bid_category_attributes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_id    UUID NOT NULL REFERENCES bid_configurations(id) ON DELETE CASCADE,
    category            TEXT NOT NULL,
    attributes          JSONB NOT NULL,     -- validated by category extraction agent
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
    category                TEXT NOT NULL,
    equipment_type          TEXT NOT NULL,
    system_role             TEXT,            -- primary_both, primary_cooling, primary_heating, air_distribution, secondary, storage
    brand                   TEXT,
    model_number            TEXT,
    model_name              TEXT,
    -- Capacity (universal container)
    capacity_value          DECIMAL,
    capacity_unit           TEXT,            -- tons, btu, gallons, kw, watts, sqft
    -- Efficiency (JSONB — different metrics per category)
    efficiency_ratings      JSONB DEFAULT '{}',
    -- Electrical
    voltage                 INTEGER,
    amperage_draw           DECIMAL,
    minimum_circuit_amperage DECIMAL,
    -- Physical
    refrigerant_type        TEXT,
    variable_speed          BOOLEAN,
    stages                  INTEGER,        -- null when variable_speed=true, NEVER 0
    sound_level_db          DECIMAL,
    -- Certifications
    energy_star_certified   BOOLEAN,
    energy_star_most_efficient BOOLEAN,
    -- Warranty
    warranty_years          INTEGER,
    extended_warranty_years  INTEGER,
    -- Cost (from bid ONLY — never researched)
    equipment_cost          DECIMAL,
    -- Research metadata
    research_sources        JSONB DEFAULT '[]',
    confidence              TEXT NOT NULL DEFAULT 'medium',
    created_at              TIMESTAMPTZ DEFAULT now()
);
```

**`efficiency_ratings` as JSONB** — different equipment types have different metrics:
- HVAC heat pump: `{"seer2": 20.5, "hspf2": 10.0, "seer": 22.0, "hspf": 10.5}`
- HVAC furnace: `{"afue": 96.0}`
- Water heater: `{"uef": 3.42, "first_hour_rating": 67}`
- Window: `{"u_factor": 0.22, "shgc": 0.25, "visible_transmittance": 0.44}`
- Solar panel: `{"efficiency_pct": 21.5, "temp_coefficient": -0.26}`

No null SEER2 columns on window rows. No null U-factor columns on HVAC rows.

#### bid_contractors
```sql
CREATE TABLE bid_contractors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id          UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    company_name    TEXT,
    contact_name    TEXT,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    license_number  TEXT,
    license_verified BOOLEAN,
    insurance_verified BOOLEAN,
    bbb_rating      TEXT,
    bbb_complaints  INTEGER,
    google_rating   DECIMAL,
    google_review_count INTEGER,
    years_in_business INTEGER,
    research_sources JSONB DEFAULT '[]',
    confidence      TEXT NOT NULL DEFAULT 'medium',
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(bid_id)
);
```

#### contractor_questions
```sql
CREATE TABLE contractor_questions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_id        UUID NOT NULL REFERENCES bid_configurations(id) ON DELETE CASCADE,
    question_tier           TEXT NOT NULL,   -- critical | high | medium | low
    question_category       TEXT NOT NULL,   -- pricing | scope | warranty | timeline | contractor | electrical | equipment | structural | safety | system_comparison | technology_choice | bundle_value
    question_text           TEXT NOT NULL,
    context                 TEXT,            -- why this question matters
    good_answer_looks_like  TEXT,            -- specific example of reassuring answer
    concerning_answer_looks_like TEXT,       -- specific example of red flag
    triggered_by            TEXT,            -- missing_field | scope_difference | price_variance | unclear_term | red_flag | negotiation | electrical | standard_essential | technical_verification | safety_critical | bundle_decomposition | technology_decision
    missing_field           TEXT,            -- which field triggered this (if applicable)
    created_at              TIMESTAMPTZ DEFAULT now()
);
```

#### comparison_results
```sql
CREATE TABLE comparison_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    comparison_data JSONB NOT NULL,     -- structured comparison output
    comparison_surface JSONB,           -- which fields were comparable
    narrative       TEXT,               -- cross-type analysis narrative
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id)
);
```

#### recommendation
```sql
CREATE TABLE recommendation (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    best_value      JSONB,              -- {config_id, reasoning}
    lowest_risk     JSONB,
    best_performance JSONB,
    overall_recommendation JSONB,       -- {config_id, reasoning, caveats}
    questions_summary JSONB,            -- per-config: {tier_counts, main_concerns[]}
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id)
);
```

#### agent_runs (traceability)
```sql
CREATE TABLE agent_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agent_type      TEXT NOT NULL,      -- classification | universal_extraction | hvac_extraction | equipment_research | comparison | questions | recommendation
    configuration_id UUID,              -- null for project-level agents
    status          TEXT NOT NULL,      -- running | complete | failed
    input_summary   JSONB,
    output_summary  JSONB,
    tokens_used     INTEGER,
    duration_ms     INTEGER,
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## 9. The Comparison Surface Concept

When bids don't share all fields, what CAN be compared?

### Definition

A **comparison surface** is the set of fields where two or more configurations overlap and can be meaningfully compared. It's computed dynamically based on what categories and fields are present.

### Three Comparison Layers

```
Layer 1: Universal Comparison (ALWAYS available)
  ├── Total cost + cost breakdown
  ├── Warranty duration
  ├── Timeline
  ├── Payment terms
  ├── Scope inclusions/exclusions (universal booleans)
  └── Contractor reputation

Layer 2: Same-Category Comparison (when categories match)
  ├── Category-specific attributes side by side
  ├── Equipment specs (efficiency ratings for same equipment types)
  ├── Category-specific scope items
  └── Category-specific safety concerns

Layer 3: Cross-Category Analysis (when types differ)
  ├── Narrative bridge: "Heat pump vs Furnace+AC tradeoffs"
  ├── Operating cost projection (if data available)
  ├── Long-term cost of ownership
  └── Technology decision guidance
```

### Scenarios

**Same type, same category** (2 heat pump bids): Full comparison surface. All universal + all HVAC attributes compared 1:1.

**Different types, same category** (heat pump vs furnace+AC): Universal fields compared directly. HVAC attributes compared with context — different efficiency metrics shown in native units with narrative explaining tradeoffs. This can happen WITHIN the same bid when a contractor offers multiple options — comparing technology, not contractors.

**Bundle vs standalone** (heat pump + water heater vs just heat pump): User chooses decomposition strategy. Decomposed: compare heat pump portions 1:1, show water heater as additional scope. Unified: compare totals with scope adjustment note.

**Different categories** (HVAC bid + roofing bid in a multi project): Each category gets its own comparison group. Universal fields comparable across all.

---

## 10. Classification, Configuration & Bundle Detection

### Classification Agent

Runs immediately after Unstructured.io parsing, BEFORE any extraction.

**Input:** Parsed document elements (titles, tables, narrative text)

**Output:**
```jsonc
{
  "bid_id": "uuid",
  "detected_categories": ["hvac", "water_heater"],
  "primary_category": "hvac",
  "is_bundle": true,
  "configurations": [
    {
      "config_index": 0,
      "config_label": "Option A: Carrier 3-Ton Heat Pump + AO Smith HPWH",
      "categories": ["hvac", "water_heater"],
      "system_type": "heat_pump",
      "element_ranges": [{"start": 0, "end": 45}, {"start": 82, "end": 95}]
    },
    {
      "config_index": 1,
      "config_label": "Option B: Lennox Furnace + AC",
      "categories": ["hvac"],
      "system_type": "furnace_ac",
      "element_ranges": [{"start": 46, "end": 81}]
    }
  ],
  "confidence": "high"
}
```

### Configuration Detection Patterns

Leverages Unstructured.io's element types:

| Element Pattern | Likely Boundary |
|----------------|----------------|
| `Title` with "Option A/B/C" | Explicit multi-option bid |
| `Title` with "System 1/2/3" | Explicit multi-system bid |
| `Title` with "Good/Better/Best" | Tiered pricing bid |
| Multiple `Table` elements with equipment specs | Implicit multi-option |
| `Header` with "Proposal" or "Quote" + number | Multiple proposals in one PDF |

### Element Routing

Each downstream agent receives only relevant elements for its configuration:

```
Document Elements [0-120]
  ├── Config 0 elements [0-45, 82-95]  → Category Extraction (config 0)
  ├── Config 1 elements [46-81]        → Category Extraction (config 1)
  └── Shared elements [96-120]         → Applied to ALL configs (terms, contractor info)
```

### Bundle Handling

When a bundle is detected (one config covering multiple categories), the system asks the user:

**Decompose**: Split into items. Each category compared independently. Cost allocation estimated if not itemized (LOW confidence, generates question about breakdown).

**Unified**: Keep as one bid. Extra scope noted as adjustment: "Bid A includes water heater replacement (~$4k value) not in other bids."

### Gate Logic

The gate no longer rejects bids — it **classifies and routes**:

- If project is HVAC and a furnace+AC bid comes in → cross-type comparison opportunity, not rejection
- If a bid doesn't match the project type at all → flag for user review, but still extract universal fields
- Unknown category → extract universal fields, ask user to clarify

---

## 11. Agent Architecture

### Agent Routing

```
ALWAYS RUN (all categories):
  1. Document Parser (Unstructured.io — not an LLM agent)
  2. Classification Agent (category + config detection)
  3. Universal Scope Extractor (pricing, warranty, timeline, scope booleans)
  4. Category-Specific Extractor (routed by classification)
  5. Equipment Extractor (multi-row, category-aware)
  6. QA Agent (completeness, confidence)
  7. Question Generator (category-aware, cross-config)
  8. Comparison Agent (universal + comparison surface)
  9. Recommendation Agent

ON-DEMAND (user or QA-triggered):
  - Contractor Researcher (BBB, licensing, reviews)
  - Equipment Researcher (AHRI for HVAC, manufacturer specs)
  - Operating Cost Estimator (energy projections)
  - Incentive Finder (rebates, tax credits)
```

### Agent Prompt Rules (All Categories)

Every extraction agent follows these rules:

**Anti-Hallucination:**
- NEVER fabricate data. If not in the document, output null.
- NEVER use "typical" or "estimated" values.
- null is ALWAYS better than a guess.
- Equipment cost is ONLY extracted from the bid, NEVER researched.

**Three-State Boolean Logic:**
- `true` = explicitly included in bid
- `false` = explicitly excluded by contractor
- `null` = not mentioned (DIFFERENT from false — triggers clarification question)

**Confidence Scoring:**
- `high`: ≥90% of expected fields found and clearly stated
- `medium`: 70-89% of fields found or some ambiguity
- `low`: <70% of fields found or significant ambiguity

### Category-Specific Safety Triggers

Each category has fields that ALWAYS generate HIGH priority questions when missing:

| Category | Safety-Critical Fields | Auto-Trigger When |
|----------|----------------------|-------------------|
| HVAC | Electrical panel assessment, load calculation | `panel_assessment_included = null` |
| Water Heater | Venting type (CO risk for gas) | `venting_type = null AND fuel_type IN ('natural_gas', 'propane')` |
| Windows | Lead paint abatement | `home_year_built < 1978 AND lead_paint_abatement = null` |
| Roofing | Structural inspection, decking condition | `structural_inspection = null` |
| Solar | Roof structural assessment, panel upgrade | `panel_upgrade_included = null` |
| Electrical | Permit, code compliance | `electrical_permit_included = null` |
| Insulation | Moisture assessment, ventilation | `moisture_assessment = null` |
| Siding | Moisture barrier, structural sheathing | `moisture_barrier_included = null` |
| Plumbing | Permit, camera inspection (sewer) | `permit_included = null` |
| Foundation | Structural engineering assessment | `structural_assessment = null` |

---

## 12. Question Generator — Category-Aware Design

### Priority Tiers
- **critical**: Must-ask before signing. Licensing, total cost confirmation, safety items.
- **high**: Should ask before deciding. Missing scope items, electrical concerns, warranty gaps.
- **medium**: Good to ask. Clarifications, scope details, scheduling.
- **low**: Nice to know. Brand preferences, maintenance tips.

### Question Categories

```
UNIVERSAL (all bid types):
  pricing         — cost breakdowns, payment terms, hidden fees
  scope           — what's included/excluded, gaps between bids
  warranty        — coverage details, conditions, transferability
  timeline        — schedule, availability, project duration
  contractor      — licensing, insurance, experience, references

CATEGORY-SPECIFIC:
  electrical      — panel assessment, circuits, permits (HVAC, solar, water heater)
  equipment       — specs, models, efficiency, sizing (all categories)
  structural      — load bearing, modifications, inspections (roofing, solar, windows)
  safety          — venting, CO, lead paint, asbestos (water heater, windows, roofing)

CROSS-CONFIG:
  system_comparison  — "Why choose Option A over Option B?"
  technology_choice  — "What are the tradeoffs of heat pump vs furnace+AC?"
  bundle_value       — "Is the bundle discount worth it vs separate contractors?"
```

### Trigger Types (12)

```
missing_field          — field present in other bids but not this one
scope_difference       — scope item not explicitly addressed
price_variance         — >15% spread across bids
unclear_term           — vague warranty or conditions
red_flag               — contractor research findings
negotiation            — opportunities based on competitor bids
electrical             — panel requirements (HVAC, solar)
standard_essential     — basic protective questions
technical_verification — equipment/performance verification
safety_critical        — category-specific safety concerns
bundle_decomposition   — cost allocation questions for bundled bids
technology_decision    — cross-type comparison questions
```

### Per-Question Output

Every generated question includes:
- `question_text` — the actual question to ask
- `question_tier` — critical / high / medium / low
- `question_category` — from the categories above
- `context` — why this question matters
- `good_answer_looks_like` — specific example of a reassuring answer
- `concerning_answer_looks_like` — specific example of a red flag
- `triggered_by` — which trigger generated this
- `missing_field` — which specific field, if applicable

---

## 13. Category Specifications

Each category has a dedicated spec file defining:
1. JSON schema for `bid_category_attributes`
2. Equipment types and efficiency metrics
3. Safety-critical field triggers
4. Extraction rules and edge cases
5. Comparison normalization (cost-per-unit metrics)

```
docs/categories/
  ├── hvac.md              ← MVP, build first
  ├── water-heaters.md
  ├── roofing.md
  ├── windows-doors.md
  ├── solar-battery.md
  ├── electrical.md
  ├── insulation.md
  ├── siding-exterior.md
  ├── plumbing.md
  └── foundation-concrete.md
```

### Adding a New Category

To add a new category (e.g., "fencing"):

1. Create `docs/categories/fencing.md` with JSON schema + safety rules + extraction rules
2. Write the category extraction agent prompt
3. Define comparison normalization (cost-per-linear-foot, etc.)
4. Add to Classification Agent's detection patterns
5. Add category-specific triggers to Question Generator
6. Add frontend rendering for category-specific columns
7. **NO database migrations needed** — JSONB handles it

---

## 14. Frontend Rendering Strategy

### Component Types

**Hard-coded components** (stability):
- Navigation, page layout, loading states
- Confidence indicators (green/yellow/red)
- Export controls
- Category-aware branding header

**Data-driven components** (from canonical JSON):
- Cost comparison tables
- Equipment spec tables
- Scope comparison grids
- Dynamic columns based on comparison surface

**LLM-generated narrative** (optional presentation):
- Cross-type analysis summaries
- Recommendation narrative
- Contractor profiles
- Rendered in sandboxed container; primary data is always JSON

### Comparison Table — Dynamic Columns

The frontend builds columns based on the comparison surface:

```
Universal Section (always shown):
  Total Cost | Warranty | Timeline | Financing | Contractor

Category Section (when categories match):
  [Category-specific fields rendered dynamically]

Cross-Type Narrative (when types differ):
  [Generated analysis of technology tradeoffs]

Bundle Note (when scope differs):
  [Scope adjustment context]
```

### Three-State Boolean Rendering

| Value | Display | Visual |
|-------|---------|--------|
| `true` | "Included" + detail text | Green |
| `false` | "Not included" + detail text | Red |
| `null` | "Not specified" | Yellow warning + question icon |

---

## 15. Security & Data Protection

- **Row Level Security (RLS)**: Users can only access bids tied to their account
- **Private storage buckets**: Documents accessible only via signed URLs
- **Server-side API calls**: Unstructured.io and LLM API keys never exposed to frontend
- **Agent run traceability**: Every agent execution logged with input/output summaries
- **Authenticated access tokens**: Supabase handles session management

---

## 16. Cost & Performance Controls

### Agent Tiers

**Always run** (core pipeline):
- Classification, Universal Extraction, Category Extraction, Equipment Extraction, QA, Questions, Comparison, Recommendation

**On-demand** (user or QA-triggered):
- Contractor research, equipment deep research, operating cost estimates, incentive finder

### Cost Reduction Strategies

- **Element routing**: Agents receive only relevant elements, not full documents → fewer tokens
- **Cached agent results**: Re-running agents uses cached outputs if inputs haven't changed
- **Lightweight classification**: Small context, simple task, cheap to run
- **On-demand research**: Contractor and equipment web research only when requested

---

## 17. Idempotency & Re-Run Safety

Every table has defined upsert keys. Re-running agents never duplicates records.

| Table | Upsert Key | Strategy |
|-------|-----------|----------|
| bid_configurations | (bid_id, config_index) | UPSERT |
| bid_scope | (configuration_id) | UPSERT |
| bid_category_attributes | (configuration_id, category) | UPSERT |
| bid_equipment | (configuration_id) | DELETE + INSERT |
| bid_contractors | (bid_id) | UPSERT |
| contractor_questions | (configuration_id) | DELETE + INSERT |
| comparison_results | (project_id) | UPSERT |
| recommendation | (project_id) | UPSERT |

---

## 18. MVP Scope & Phasing

### MVP (HVAC First)

1. Upload 1-5 bid documents
2. Unstructured.io parsing → bid_elements
3. Classification (detect HVAC, config detection)
4. Universal scope extraction
5. HVAC category extraction (electrical safety, ductwork, full attribute set)
6. Equipment extraction + AHRI research
7. Question generation (universal + HVAC categories)
8. Comparison (universal + HVAC comparison surface)
9. Recommendation
10. "You've got an HVAC expert" branding

**MVP supports**: Heat pump, furnace+AC, mini-split, hybrid comparisons. Multi-config bids. Cross-type comparison (heat pump vs furnace+AC with narrative bridge).

### Phase 2 (Fast Follow)

11. Water heater category
12. Bundle detection + decomposition UI
13. Contractor research agent
14. Chat assistant with element-level citations

### Phase 3 (Expansion)

15. Roofing, Windows, Solar categories
16. Electrical, Insulation categories
17. Operating cost estimator
18. Incentive finder

### Phase 4 (Full Platform)

19. Siding, Plumbing, Foundation categories
20. Multi-project dashboard
21. Contractor marketplace / reviews
22. Export / share reports
