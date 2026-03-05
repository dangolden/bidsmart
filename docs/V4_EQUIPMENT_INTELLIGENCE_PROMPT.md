# V4 Equipment Intelligence — Session Prompt

## What This Session Builds

A **direct equipment research system** that replaces MindPal's slow, unreliable web-search-based equipment extraction with:

1. **Gemini 2.0 Flash PDF extraction** — Extract equipment models, configurations, and scope from the full bid PDF at upload time (same pattern as the working quick-extract for contractor info)
2. **ENERGY STAR SODA API enrichment** — Look up verified specs (SEER2, HSPF2, capacity, COP, cold climate status) from the free government database
3. **AHRI Directory scraping** — Get matched system ratings (outdoor+indoor combos) from ahridirectory.org
4. **Tax credit / incentive eligibility** — Determine 25C, ENERGY STAR, CEE tier qualification from verified specs

The goal: **by the time MindPal finishes its 3-5 minute analysis, we already have verified equipment specs from official sources.**

---

## Branch & Constraints

**Branch:** `claude/research-contractor-databases-aUN2N` → merges into `claude/v4staging-aUN2N`
**All new docs include "V4" in filename.**

### CRITICAL CONSTRAINTS
1. **SAME DATABASE** — do NOT create tables or alter schema without explicit approval. Ask first.
2. **SAME MINDPAL WORKFLOW** — MindPal still runs. This is additive.
3. **New tables for V4 data** — do NOT write to `bid_equipment`, `bid_scope`, or `bid_configurations` (MindPal owns those). Create new V4 tables for equipment intelligence (like we did with `contractor_intelligence` for contractors).
4. **Supabase project ID:** `jzvmlgahptwixtrleaco` (BidCompare)

---

## What's Already Built (V4 so far)

### Quick-Extract Edge Function (contractor identity)
- **`supabase/functions/quick-extract/index.ts`** — Sends full bid PDF to Gemini 2.0 Flash, extracts contractor name/phone/license/address, updates `bids.contractor_name` from 'TBD'
- **`src/lib/services/quickExtractService.ts`** — Frontend service to call quick-extract
- **`src/components/UnifiedHomePage.tsx`** — Fires quick-extract non-blocking after each `uploadPdfFile()` in `handleAnalyze()`
- **Supabase secret `GOOGLE_AI_API_KEY`** is set (Gemini 2.0 Flash)

### Contractor Intelligence Tables (applied to DB)
- **`contractor_intelligence`** — Global contractor profile cache (CSLB, Google, BBB, permits). Separate from MindPal's `bid_contractors`.
- **`bid_contractor_intelligence`** — Junction table linking bids to contractor profiles
- **Migration file:** `supabase/migrations_v2/010_v4_contractor_intelligence.sql`

### Shared Edge Function Utilities
- `supabase/functions/_shared/cors.ts` — `handleCors()`, `jsonResponse()`, `errorResponse()`
- `supabase/functions/_shared/auth.ts` — `verifyEmailAuth()`, `verifyProjectOwnership()`
- `supabase/functions/_shared/supabase.ts` — `supabaseAdmin` (service-role client)

---

## Architecture: Two-Layer System

### Layer 1: PDF Extraction (Gemini 2.0 Flash)

Expand the existing `quick-extract` Edge Function (or create a new `equipment-extract` Edge Function) to extract equipment AND scope data from the full bid PDF. This replaces MindPal's "Bid Data Extractor" and "Scope Extractor" nodes for the fields we care about.

**What to extract from the PDF:**

```json
{
  "configurations": [
    {
      "config_label": "Option A - Ducted Heat Pump",
      "config_index": 0,
      "system_type": "heat_pump",
      "equipment": [
        {
          "equipment_type": "outdoor_unit",
          "brand": "Mitsubishi",
          "model_number": "MXZ-4C36NAHZ2",
          "capacity_btu": 36000,
          "quantity": 1
        },
        {
          "equipment_type": "indoor_unit",
          "brand": "Mitsubishi",
          "model_number": "MSZ-FH12NA",
          "capacity_btu": 12000,
          "quantity": 4
        }
      ],
      "pricing": {
        "total_bid_amount": 28500,
        "equipment_cost": 14200,
        "labor_cost": 8300,
        "permit_cost": 450
      },
      "scope": {
        "permit_included": true,
        "electrical_included": true,
        "electrical_detail": "200A panel upgrade included",
        "ductwork_included": false,
        "thermostat_included": true,
        "disposal_included": true
      },
      "warranty": {
        "labor_warranty_years": 1,
        "equipment_warranty_years": 12,
        "compressor_warranty_years": 12
      },
      "timeline": {
        "estimated_days": 3,
        "start_date_available": "2026-04-01"
      }
    },
    {
      "config_label": "Option B - Ductless Mini-Split",
      "config_index": 1,
      "system_type": "mini_split",
      "equipment": [
        {
          "equipment_type": "outdoor_unit",
          "brand": "Mitsubishi",
          "model_number": "MXZ-3C30NAHZ2",
          "capacity_btu": 30000,
          "quantity": 1
        }
      ],
      "pricing": {
        "total_bid_amount": 22000
      }
    }
  ],
  "contractor": {
    "contractor_name": "Service Champions",
    "license_number": "1092474"
  }
}
```

**Key challenge: Multiple configurations per bid.** HVAC contractors commonly present 2-3 options in a single bid document (e.g., "Option A: ducted heat pump $28K", "Option B: ductless mini-split $22K", "Option C: hybrid system $25K"). The extraction must identify and separate these configurations. This is what MindPal's `bid_configurations` table was designed for.

**Gemini prompt for equipment+scope extraction:**

```
You are extracting HVAC equipment, pricing, scope, and configuration details from a contractor bid/proposal document.

A single bid may contain MULTIPLE configuration options (e.g., "Option A", "Option B", or "Good/Better/Best"). Identify ALL configurations presented.

For EACH configuration, extract:

EQUIPMENT (for each piece of equipment in this configuration):
- equipment_type: one of "heat_pump", "outdoor_unit", "indoor_unit", "air_handler", "furnace", "condenser", "thermostat", "other"
- brand: manufacturer name
- model_number: exact model number as written (do NOT normalize or abbreviate)
- model_name: product line name if stated (e.g., "Hyper-Heating INVERTER")
- capacity_btu: heating or cooling capacity in BTU
- capacity_tons: cooling capacity in tons (1 ton = 12,000 BTU)
- seer_rating or seer2_rating: efficiency rating if stated
- hspf_rating or hspf2_rating: heating efficiency if stated
- quantity: number of this unit (default 1)

PRICING:
- total_bid_amount, equipment_cost, labor_cost, materials_cost, permit_cost, disposal_cost, electrical_cost
- estimated_rebates, total_after_rebates
- deposit_required, deposit_percentage, financing_offered, financing_terms

SCOPE (what's included/excluded):
- For each: permit, disposal, electrical, ductwork, thermostat, manual_j, commissioning, air_handler, line_set, pad, disconnect, drain
- Use boolean _included and text _detail fields
- electrical_detail is CRITICAL — note panel upgrades, subpanel additions, breaker changes

WARRANTY:
- labor_warranty_years, equipment_warranty_years, compressor_warranty_years, additional_warranty_details

TIMELINE:
- estimated_days, start_date_available, bid_date, valid_until

CONFIGURATION METADATA:
- config_label: how the contractor labels this option (e.g., "Option A", "Premium Package", "System 1")
- config_index: 0-based index
- system_type: "heat_pump", "mini_split", "furnace_ac", "hybrid", "boiler", "other"

Rules:
- Return null for any field not found with high confidence. Do NOT guess.
- Model numbers must be EXACT as written in the document.
- If only one configuration exists, still wrap it in a configurations array with config_index: 0.
- Separate equipment items — each physical unit gets its own entry.
- If pricing is only given as a total (not broken out), put it in total_bid_amount and leave sub-costs null.
- Return raw JSON only, no markdown wrapping.
```

### Layer 2: Equipment Enrichment (API Lookups)

After extraction, take each model number and look it up in official databases to get **verified specs** that may differ from or supplement what's on the bid.

#### Data Source 1: ENERGY STAR SODA API (FREE, no key needed)

This is the primary enrichment source. Free Socrata API with model-level data.

**Datasets:**
- Air-Source Heat Pumps: `https://data.energystar.gov/resource/w7cv-9xjt.json`
- Ducted Heat Pumps: `https://data.energystar.gov/resource/3m3x-a2hy.json`
- Central Air Conditioners: `https://data.energystar.gov/resource/83eb-xbyy.json`

**Query by outdoor unit model number:**
```
GET https://data.energystar.gov/resource/w7cv-9xjt.json?$where=outdoor_unit_model_number LIKE '%MXZ-4C36NAHZ%'
```

**Fields returned:**
- `outdoor_unit_model_number`, `outdoor_unit_brand_name`
- `indoor_unit_model_number`, `indoor_unit_brand_name`
- `seer2_btu_wh` (SEER2 rating)
- `eer2_btu_wh` (EER2 rating)
- `hspf2_btu_wh` (HSPF2 rating)
- `cooling_capacity_btu_h`
- `heating_capacity_at_47_f_btu_h`
- `heating_capacity_at_17_f_btu_h`
- `heating_capacity_at_5_f_btu_h`
- `cop_at_5_f` (COP at 5°F — cold climate performance)
- `cold_climate` (Yes/No)
- `meets_peak_cooling_requirements`
- `refrigerant_with_gwp` (refrigerant type + GWP value)
- `compressor_staging`
- `installation_capabilities`
- `connected_capable`, `connects_using`, `dr_protocol`

**SoQL tips:**
- Use LIKE with `%` wildcards — model numbers in ENERGY STAR may have suffixes/prefixes
- Search both air-source and ducted datasets (union results)
- A single outdoor unit may match MANY indoor unit combinations — filter or group as needed
- No API key required, no rate limits documented, responses are JSON

**Create:** `supabase/functions/_shared/energystar.ts`
```typescript
export interface EnergyStarMatch {
  outdoor_unit_model_number: string;
  outdoor_unit_brand_name: string;
  indoor_unit_model_number: string;
  seer2: number;
  eer2: number;
  hspf2: number;
  cooling_capacity_btu: number;
  heating_capacity_47f: number;
  heating_capacity_17f: number;
  heating_capacity_5f: number;
  cop_at_5f: number;
  cold_climate: boolean;
  refrigerant: string;
  compressor_staging: string;
  energy_star_certified: true; // it's in the DB, so yes
}

export async function lookupByModelNumber(modelNumber: string): Promise<EnergyStarMatch[]> {
  // Query both air-source and ducted datasets
  // Use LIKE search with the model number
  // Return all matching rows (may be multiple indoor unit combos)
}

export async function lookupByBrandAndCapacity(brand: string, capacityBtu: number): Promise<EnergyStarMatch[]> {
  // Fallback search when model number doesn't match exactly
  // Filter by brand name + capacity range (±10%)
}
```

#### Data Source 2: AHRI Directory (NO free API — scrape the public site)

AHRI has no free API. The paid "AHRI Data Subscription" with API add-on requires an application, interview, and license agreement. However, the **public website at ahridirectory.org supports free manual searches**.

**Approach: Scrape the public search interface**
- The site at `ahridirectory.org` is a web app that makes XHR requests to internal endpoints
- Open browser DevTools → Network tab → perform a search → inspect the API calls
- The search accepts: outdoor unit model number, indoor unit model number, brand
- Returns: AHRI certified reference number, matched system ratings, all performance data

**What AHRI gives that ENERGY STAR doesn't:**
- **Matched system ratings** — AHRI certifies specific outdoor+indoor unit combinations. The SEER2/HSPF2 for "MXZ-4C36NAHZ2 with MSZ-FH12NA" may differ from "MXZ-4C36NAHZ2 with MSZ-FH09NA"
- **AHRI certificate number** — proof of certified performance, required for some rebate programs
- **More granular performance data** for specific matched combos

**Create:** `supabase/functions/_shared/ahri.ts`
- First attempt: reverse-engineer the XHR endpoints from ahridirectory.org
- If that fails or is unreliable: use ENERGY STAR data only (covers 80% of what we need)
- Mark AHRI data as "best-effort" — never block on it

#### Data Source 3: DOE Product Lookup (NO API — web-only)

The DOE Tax Credit Product Lookup Tool at `regulations.doe.gov/product-lookup/heat-pumps` determines if equipment qualifies for the 25C tax credit. No documented API exists.

**Approach: Derive eligibility from ENERGY STAR data instead**
- If the equipment is in the ENERGY STAR database AND meets CEE highest tier thresholds, it qualifies for 25C
- SEER2 ≥ 16.0 AND HSPF2 ≥ 9.0 → likely 25C eligible (up to $2,000 credit)
- ENERGY STAR Most Efficient → definitely 25C eligible
- Cold Climate designation → eligible for additional incentives

**Create:** `supabase/functions/_shared/incentive-eligibility.ts`
```typescript
export function deriveIncentiveEligibility(specs: EnergyStarMatch): IncentiveEligibility {
  return {
    federal_25c: {
      eligible: specs.seer2 >= 16.0 && specs.hspf2 >= 9.0,
      amount_up_to: 2000,
      reason: specs.energy_star_certified ? "ENERGY STAR certified" : `SEER2=${specs.seer2}, HSPF2=${specs.hspf2}`
    },
    energy_star: { certified: true },
    energy_star_most_efficient: { certified: specs.seer2 >= 19.0 && specs.hspf2 >= 10.5 }, // approximate threshold
    cold_climate: { qualified: specs.cold_climate },
    tech_clean_california: {
      eligible: specs.energy_star_certified && specs.cold_climate,
      amount_up_to: 3000
    }
  };
}
```

#### Data Source 4: NEEP ccASHP Database (NO API — SPA with internal endpoints)

NEEP's Cold Climate Air Source Heat Pump database at `ashp.neep.org` is an AngularJS SPA (hashbang routing: `#!/product_list/`). No documented API.

**Approach:**
- The SPA makes XHR calls to populate its product list — these can be reverse-engineered
- Lower priority than ENERGY STAR (ENERGY STAR already has cold_climate flag and COP at 5°F)
- Skip for Phase 1, add later if ENERGY STAR data is insufficient

---

## Database: New V4 Tables Needed

**DO NOT write to existing tables** (`bid_equipment`, `bid_scope`, `bid_configurations`). Create new V4 tables.

### Proposed: `equipment_intelligence`

Like `contractor_intelligence` — a global cache of verified equipment specs, keyed by model number.

```sql
CREATE TABLE IF NOT EXISTS equipment_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cache key: normalized model number (uppercase, stripped whitespace)
  cache_key TEXT NOT NULL UNIQUE,

  -- Identity
  brand TEXT NOT NULL,
  model_number TEXT NOT NULL,
  model_name TEXT,
  equipment_type TEXT,  -- heat_pump, outdoor_unit, indoor_unit, air_handler, furnace
  system_type TEXT,     -- mini_split, ducted, hybrid, packaged

  -- Verified specs from ENERGY STAR
  seer2 DECIMAL(5,2),
  eer2 DECIMAL(5,2),
  hspf2 DECIMAL(5,2),
  cop_at_5f DECIMAL(4,2),
  cooling_capacity_btu INTEGER,
  heating_capacity_47f INTEGER,
  heating_capacity_17f INTEGER,
  heating_capacity_5f INTEGER,
  cold_climate BOOLEAN,
  refrigerant TEXT,
  refrigerant_gwp INTEGER,
  compressor_staging TEXT,

  -- AHRI data (if available)
  ahri_cert_number TEXT,
  ahri_matched_indoor_models TEXT[],

  -- Certifications
  energy_star_certified BOOLEAN,
  energy_star_most_efficient BOOLEAN,

  -- Incentive eligibility (derived)
  federal_25c_eligible BOOLEAN,
  federal_25c_amount INTEGER,
  tech_clean_ca_eligible BOOLEAN,

  -- Research metadata
  data_sources TEXT[] DEFAULT '{}',
  research_confidence INTEGER,
  last_researched_at TIMESTAMPTZ,
  raw_api_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Proposed: `bid_equipment_extract`

V4's version of bid_equipment + bid_scope + bid_configurations, populated by Gemini extraction.

```sql
CREATE TABLE IF NOT EXISTS bid_equipment_extract (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- The full Gemini extraction (entire JSON blob)
  raw_extraction JSONB NOT NULL,

  -- Per-configuration data (array of config objects)
  configurations JSONB NOT NULL DEFAULT '[]',

  -- Extraction metadata
  extracted_by TEXT DEFAULT 'gemini-2.0-flash',
  extraction_confidence INTEGER,
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  extraction_duration_ms INTEGER,

  -- Link to enriched equipment data
  equipment_intelligence_ids UUID[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(bid_id)
);
```

**ASK FOR APPROVAL before applying these migrations.**

---

## Edge Functions to Create

### 1. `supabase/functions/equipment-extract/index.ts`

Sends full bid PDF to Gemini 2.0 Flash with the equipment+scope extraction prompt. Saves results to `bid_equipment_extract`.

**Request:**
```json
POST /functions/v1/equipment-extract
{
  "bid_id": "uuid",
  "pdf_upload_id": "uuid",
  "project_id": "uuid"
}
```

**Logic:**
1. Verify auth (same pattern as quick-extract)
2. Get signed URL for PDF
3. Download PDF, base64 encode, send to Gemini with equipment extraction prompt
4. Parse response → save to `bid_equipment_extract`
5. For each model number found, trigger equipment enrichment (or return model numbers for frontend to trigger)
6. Return extracted data

### 2. `supabase/functions/equipment-research/index.ts`

Looks up verified specs for a specific model number from ENERGY STAR + AHRI.

**Request:**
```json
POST /functions/v1/equipment-research
{
  "model_number": "MXZ-4C36NAHZ2",
  "brand": "Mitsubishi",
  "equipment_type": "outdoor_unit"
}
```

**Logic:**
1. Normalize model number (uppercase, strip whitespace)
2. Check `equipment_intelligence` cache
3. If not cached or stale: query ENERGY STAR SODA API
4. Optionally query AHRI (best-effort)
5. Derive incentive eligibility from specs
6. Upsert to `equipment_intelligence`
7. Return verified specs

### 3. Shared modules

- `supabase/functions/_shared/energystar.ts` — ENERGY STAR SODA API queries
- `supabase/functions/_shared/ahri.ts` — AHRI directory scraping (best-effort)
- `supabase/functions/_shared/incentive-eligibility.ts` — Derive 25C, ENERGY STAR, CEE tier from specs

---

## Frontend

### 1. `src/lib/services/equipmentExtractService.ts`

```typescript
export async function extractEquipmentFromBid(bidId, pdfUploadId, projectId, userEmail): Promise<ExtractResult>
export async function researchEquipment(modelNumber, brand, equipmentType, userEmail): Promise<ResearchResult>
```

### 2. Integration into upload flow

In `UnifiedHomePage.tsx`, after quick-extract fires for contractor info, also fire equipment extraction:

```typescript
// After uploadPdfFile succeeds:
// 1. Quick-extract contractor info (already built)
quickExtractContractorInfo(bidId, pdfUploadId, projectId, email).catch(...)

// 2. NEW: Extract equipment + scope from full PDF
extractEquipmentFromBid(bidId, pdfUploadId, projectId, email)
  .then(result => {
    // For each model number found, trigger equipment research
    for (const config of result.configurations) {
      for (const equip of config.equipment) {
        if (equip.model_number) {
          researchEquipment(equip.model_number, equip.brand, equip.equipment_type, email).catch(...)
        }
      }
    }
  })
  .catch(err => console.warn('Equipment extract failed (non-critical):', err));
```

### 3. Equipment Research Page (standalone)

Create `/equipment` page (like the contractor `/research` page) where users can manually look up any model number.

---

## Existing Schemas (MindPal-owned — DO NOT MODIFY, reference only)

### bid_equipment (MindPal writes here)
Key columns: `bid_id`, `equipment_type` (heat_pump/outdoor_unit/indoor_unit/air_handler/furnace/condenser), `brand`, `model_number`, `capacity_btu`, `seer2_rating`, `hspf2_rating`, `energy_star_certified`, `sound_level_db`, `voltage`, `amperage_draw`, `warranty_years`, `equipment_cost`, `confidence`

### bid_scope (MindPal writes here — 73 columns)
Key columns: `bid_id`, `system_type`, `total_bid_amount`, `labor_cost`, `equipment_cost`, `materials_cost`, pricing breakdown, warranty years, timeline, 12 scope boolean+detail pairs (permit, disposal, electrical, ductwork, thermostat, manual_j, commissioning, air_handler, line_set, pad, disconnect, drain), `extraction_confidence`

### bid_configurations (planned, may not exist yet)
Key columns: `bid_id`, `config_index`, `config_label`, `system_type` — links to bid_equipment and bid_scope per configuration option

---

## Build Order

### Phase 1: Equipment Extraction (Gemini)
1. Create `equipment-extract` Edge Function
2. Create `equipmentExtractService.ts` frontend service
3. Hook into upload flow (parallel with quick-extract)
4. **PAUSE: Get approval for `bid_equipment_extract` table migration**
5. Test: upload a real bid → see extracted equipment + configurations in DB within 5 seconds

### Phase 2: ENERGY STAR Enrichment
1. Create `_shared/energystar.ts` — SODA API queries
2. Create `equipment-research` Edge Function
3. Create `_shared/incentive-eligibility.ts` — derive 25C eligibility
4. **PAUSE: Get approval for `equipment_intelligence` table migration**
5. Test: `GET /resource/w7cv-9xjt.json?outdoor_unit_model_number=MXZ-4C36NAHZ2` returns verified specs

### Phase 3: AHRI Scraping (best-effort)
1. Reverse-engineer ahridirectory.org XHR endpoints
2. Create `_shared/ahri.ts`
3. Add to equipment-research parallel fan-out
4. Test: search by model number → get AHRI cert number + matched system ratings

### Phase 4: Equipment Research Page + Comparison
1. Create `/equipment` standalone page
2. Create `EquipmentProfileCard.tsx`, `EquipmentComparisonTable.tsx`
3. Show verified specs vs bid-stated specs (highlight discrepancies)
4. Show incentive eligibility per configuration

---

## Key Files to Read First

- `supabase/functions/quick-extract/index.ts` — PATTERN TO FOLLOW (Gemini PDF extraction)
- `supabase/functions/_shared/cors.ts`, `auth.ts`, `supabase.ts` — shared utilities
- `supabase/migrations_v2/002_bid_tables.sql` — existing bid_equipment + bid_scope schemas (reference only)
- `supabase/migrations_v2/010_v4_contractor_intelligence.sql` — V4 table pattern to follow
- `src/components/results/EquipmentTab.tsx` — how equipment data is currently displayed
- `src/context/ProjectContext.tsx` — how bid data is loaded (including bid_configurations)
- `src/lib/services/quickExtractService.ts` — existing V4 service pattern

---

## API Reference

### ENERGY STAR SODA API (primary source — FREE)

**Base URLs:**
- Air-Source Heat Pumps: `https://data.energystar.gov/resource/w7cv-9xjt.json`
- Ducted Heat Pumps: `https://data.energystar.gov/resource/3m3x-a2hy.json`
- Central ACs + Heat Pumps: `https://data.energystar.gov/resource/83eb-xbyy.json`

**Example queries:**
```bash
# Exact model match
curl "https://data.energystar.gov/resource/w7cv-9xjt.json?outdoor_unit_model_number=MXZ-4C36NAHZ2"

# Partial match (recommended — model numbers vary)
curl "https://data.energystar.gov/resource/w7cv-9xjt.json?\$where=outdoor_unit_model_number%20LIKE%20'%25MXZ-4C36%25'"

# Filter by brand + capacity range
curl "https://data.energystar.gov/resource/w7cv-9xjt.json?\$where=outdoor_unit_brand_name='Mitsubishi'%20AND%20cooling_capacity_btu_h%20BETWEEN%2034000%20AND%2038000"

# Select specific fields only
curl "https://data.energystar.gov/resource/w7cv-9xjt.json?\$select=outdoor_unit_model_number,seer2_btu_wh,hspf2_btu_wh,cooling_capacity_btu_h,heating_capacity_at_5_f_btu_h,cop_at_5_f,cold_climate&\$where=outdoor_unit_model_number%20LIKE%20'%25MXZ-4C36%25'"

# Cold climate heat pumps only
curl "https://data.energystar.gov/resource/w7cv-9xjt.json?\$where=cold_climate='Yes'%20AND%20outdoor_unit_brand_name='Mitsubishi'&\$limit=10"
```

**No API key needed. No documented rate limits. Returns JSON arrays.**

### AHRI Directory (NO API — must scrape)

**Public search:** `https://ahridirectory.org/`
- No free API. Paid subscription required for programmatic access.
- Public site allows manual searches — reverse-engineer XHR endpoints from browser DevTools.
- Contact: `ahridataservices@ahrinet.org` for data subscription info.

### Gemini 2.0 Flash API (already configured)

**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
**Auth:** `GOOGLE_AI_API_KEY` Supabase secret (already set)
**Pattern:** See `supabase/functions/quick-extract/index.ts` for PDF-to-base64-to-Gemini flow.
