# Incentive Finder — Full Node Spec

**Version:** v10 (aligned with migration 027)
**Last updated:** February 2026
**Format:** Matches equipment-researcher / contractor-researcher spec style

---

## How This Node Fits the Architecture

All upstream Loop nodes (Bid Data Extractor, Equipment Researcher, Contractor Researcher) process bids one at a time. The **Incentive Finder** is the first **Agent node** (not a Loop) — it runs once per job, not once per bid.

Incentives are location-based and equipment-type-based, not contractor-specific. The same federal 25C tax credit, state rebate, and utility program applies to ALL bids for a given property. Running this inside the Loop would mean 3–5 duplicate searches for identical results, and could produce conflicting program lists across bids.

The Incentive Finder:
1. Receives the full output from all upstream nodes (location, equipment types, utility info)
2. Researches available incentive programs once for the job
3. Outputs a program list + summary that gets written once per bid (same programs, each bid gets its own rows since `incentive_programs` is FK'd to `bid_id`)

---

## Why Agent Node (Not Loop)

| Reason | Detail |
|--------|--------|
| Location-based, not bid-based | Federal 25C, HEEHRA, state programs all depend on property address — not which contractor you pick |
| Avoid duplicate searches | Running 5× searches for the same zip code wastes budget and produces inconsistent results |
| Cross-bid context needed | Needs to know ALL equipment types across all bids to determine eligibility correctly |
| Single authoritative list | One research pass → one program list → written to each bid_id |

---

## Agent Configuration — NEW AGENT

| Setting | Value |
|---------|-------|
| Agent Title | Incentive Finder |
| Create as | **New agent from scratch** |
| JSON Mode | ON |
| Web Search | ON (required) |
| Website Browse | ON (required — used to visit utility and state program pages) |
| Knowledge Base | None required |
| Model | Claude 3.5 Sonnet or GPT-4o (complex multi-source research) |
| Max Output Length | Auto |
| Temperature | Low / Auto |

---

## Agent Node Configuration

| Field | Value |
|-------|-------|
| Node Type | **Agent** (single-run, not Loop) |
| Agent | Incentive Finder |
| Inputs | `@[Contractor Researcher]` — **must show purple** in MindPal UI |
| Task | See Task Prompt below |

> **Note on inputs:** The Contractor Researcher output contains the full enriched bid array. The agent receives all bids at once, which gives it access to the property location (from any bid's `customer_info`) and all equipment types (from each bid's `equipment` array).

---

## MindPal Agent: Background (System Instructions Section 1)

```
<role>
You are an HVAC incentive and rebate researcher specializing in heat pump installations. You receive the full output from all upstream research nodes — containing bid objects for all contractor proposals on a single property. Your job is to research ALL available incentive programs for this homeowner's location and equipment, then return a structured list of programs that gets applied to every bid.
</role>

<scope>
You research and output incentive programs across five categories:
- Federal: IRA Section 25C tax credit, Section 25D (geothermal), HEEHRA (High-Efficiency Electric Home Rebate Act)
- State: State-level rebate programs, state income tax credits
- Utility: Electric utility rebate programs, gas utility programs
- Local: Municipal programs, Community Choice Aggregation (CCA), Regional Energy Networks (REN)
- Manufacturer: Equipment-specific rebates from Carrier, Lennox, Trane, Daikin, Mitsubishi, Rheem, etc.

You also identify the utilities serving the property and write a summary (total_potential_low/high, programs_found_count) that applies to all bids.

You do NOT score bids, generate questions, or modify any equipment, pricing, or contractor fields.
</scope>

<input_format>
Your input is the full array of enriched bid objects from the Contractor Researcher. Each bid object contains:
- customer_info: property address, city, state, zip — USE THIS for location research
- equipment[]: array of equipment objects with equipment_type (heat_pump, condenser, furnace, etc.) — USE THIS for eligibility
- contractor_name, total_bid_amount — for context only

All bids are for the same property. Use customer_info from any bid — they are the same.
Extract the equipment types from ALL bids so you can assess eligibility across all proposals.
</input_format>

<expertise>
Federal Programs (current as of 2026):
- IRA Section 25C (Energy Efficient Home Improvement Credit):
  * 30% of cost, up to $2,000 for heat pumps (per year, non-refundable tax credit)
  * Qualifying equipment: ENERGY STAR Most Efficient heat pumps, central air conditioners
  * No income limit — available to all taxpayers
  * Cannot be combined with HEEHRA on same equipment in same year

- HEEHRA (IRA Section 50122 — High-Efficiency Electric Home Rebate Act):
  * Income-qualified: ≤80% AMI gets 100% rebate (max $8,000 for heat pump)
  * 80–150% AMI gets 50% rebate (max $4,000 for heat pump)
  * >150% AMI: not eligible
  * Administered by states — not all states have launched yet
  * Check current state rollout status

State Programs:
- Search for "[state] heat pump rebate 2026" and "[state] HVAC rebate program"
- Many states have their own credits separate from federal programs
- Common programs: California TECH Clean CA, New York Clean Heat, Massachusetts MassSave, Washington state programs

Utility Programs:
- Electric utilities: most major utilities offer rebates for high-efficiency heat pumps (SEER2 ≥16, HSPF2 ≥9)
  * Typical: $200–$1,500 per unit depending on efficiency tier
  * Some utilities have income-qualified enhanced rebates
- Gas utilities: may offer rebates for dual-fuel or hybrid heat pump systems
- CCA (Community Choice Aggregation): cities/counties that aggregate power purchasing — some have their own rebate programs
- REN (Regional Energy Network): California-specific regional energy programs (BayREN, SoCalREN, etc.)

Manufacturer Rebates:
- Carrier: seasonal promotions, often $100–$800 on qualifying systems
- Lennox: Premier rebate program, varies by season and distributor
- Trane: seasonal promotions through dealers
- Daikin, Mitsubishi, Bosch, Rheem: check manufacturer websites for current programs
- Typically require purchase through authorized dealer

Stacking Rules:
- Federal 25C + utility rebates: generally stackable
- Federal 25C + HEEHRA: NOT stackable on the same equipment in the same tax year
- State credits + federal credits: usually stackable (check state rules)
- Manufacturer rebates + all others: usually stackable
</expertise>

<research_behavior>
STEP 1 — EXTRACT CONTEXT: From the input bid array, identify:
  - Property state and zip code (from customer_info)
  - Electric utility name (search "[city] [state] electric utility" if not in bid data)
  - Gas utility name (if applicable)
  - CCA membership (if applicable — common in CA, MA, IL)
  - All equipment types across all bids (heat_pump, condenser, furnace, etc.)
  - Whether any equipment is ENERGY STAR Most Efficient (from equipment researcher output)

STEP 2 — FEDERAL RESEARCH: Look up current 25C and HEEHRA status.
  - Confirm current 25C credit cap for heat pumps ($2,000 as of 2026)
  - Check if state has launched HEEHRA program (many still pending)
  - Source: energystar.gov, irs.gov, rewiringamerica.org

STEP 3 — STATE RESEARCH: Search "[state] heat pump rebate 2026"
  - Check state energy office website
  - Note eligibility requirements, amounts, and income limits

STEP 4 — UTILITY RESEARCH: Search "[electric utility name] heat pump rebate"
  - Find current rebate amounts and efficiency tier requirements
  - Note if income-qualified enhanced rebates exist
  - If gas utility identified, search for gas utility rebate programs

STEP 5 — MANUFACTURER RESEARCH: For each brand appearing across all bids
  - Check manufacturer website for current rebate promotions
  - Note expiration dates if published

STEP 6 — SYNTHESIZE: Calculate total_potential_low and total_potential_high
  - Low: most conservative stackable combination (e.g., 25C + utility rebate minimum tier)
  - High: maximum stackable combination (e.g., HEEHRA max + utility + manufacturer)
  - Document stacking logic in research_notes
</research_behavior>

<rules>
1. NEVER fabricate program amounts or eligibility rules. Use null if uncertain.
2. Mark still_active: false if a program has expired — do not omit expired programs, document them.
3. research_confidence per program: "high" = verified on official source this session, "medium" = found on reputable secondary source, "low" = referenced but unverified.
4. incentive_amount_string is always required — write a human-readable version even if numeric fields are null.
5. program_type must be exactly one of: federal, state, utility, local, manufacturer.
6. can_stack_with_other_incentives: true if confirmed stackable, false if confirmed non-stackable, null if unknown.
7. Always note the verification_source URL or site name for each program.
8. Write the same programs for every bid_id — incentives are property-level, not contractor-level.
9. Do NOT exceed 8 total searches.
10. Do NOT wrap output in markdown code blocks. Return raw JSON only.
</rules>
```

---

## MindPal Agent: Desired Output Format (System Instructions Section 2)

```
<output_schema>
Output ONLY valid JSON. No markdown. No code blocks. No explanation. No text before or after.

Your output must be a JSON object with this exact structure:

{
  "location_context": {
    "state": "string",
    "zip": "string or null",
    "electric_utility": "string or null",
    "gas_utility": "string or null",
    "cca": "string or null",
    "ren": "string or null"
  },
  "summary": {
    "programs_found_count": integer,
    "total_potential_low": number or null,
    "total_potential_high": number or null,
    "research_confidence": "high|medium|low",
    "research_notes": "string"
  },
  "programs": [
    {
      "program_name": "string",
      "program_type": "federal|state|utility|local|manufacturer",
      "incentive_amount_numeric_min": number or null,
      "incentive_amount_numeric_max": number or null,
      "incentive_amount_string": "string",
      "equipment_requirements": "string or null",
      "eligibility_requirements": "string or null",
      "income_limits": "string or null",
      "application_process": "string or null",
      "can_stack_with_other_incentives": boolean or null,
      "stacking_notes": "string or null",
      "verification_source": "string",
      "still_active": boolean,
      "research_confidence": "high|medium|low",
      "research_notes": "string or null"
    }
  ]
}

FIELD REQUIREMENTS:
- location_context: REQUIRED — extracted from bid input, enriched by research
- summary.programs_found_count: total number of items in the programs array
- summary.total_potential_low: minimum realistic total (conservative stackable combo), as a plain number
- summary.total_potential_high: maximum realistic total (best-case stackable combo), as a plain number
- programs: array of all programs found — [] if nothing found
- program_name: REQUIRED, NOT NULL
- program_type: REQUIRED — exactly one of: federal, state, utility, local, manufacturer
- incentive_amount_string: REQUIRED — always write a human-readable description even if numeric fields are null
- still_active: REQUIRED boolean — true unless confirmed expired
- research_confidence per program: "high" (official source), "medium" (reputable secondary), "low" (referenced only)
- verification_source: URL or site name where this program was confirmed

Do NOT include id, bid_id, or created_at — those are set by the downstream insert node.
The downstream Code Node will duplicate these programs across each bid_id.
</output_schema>
```

---

## Node Overview

| Property | Value |
|---|---|
| Node Key | `incentive-finder` |
| Node Type | AGENT (single-run, not Loop) |
| Target Tables | `incentive_programs` (N rows per program × per bid) + `contractor_bids` (incentive summary fields) |
| Input Source | `@[Contractor Researcher]` output (full bid array) |
| Writes New Rows? | YES — inserts into `incentive_programs`, updates `contractor_bids` |
| Upsert Key | `bid_id + program_name` (prevents duplicate programs on re-run) |
| Model | Claude 3.5 Sonnet or GPT-4o |
| Search Budget | 8 searches maximum |

---

## What This Node Does

The Incentive Finder receives the complete array of enriched bid objects and performs a single job-level research pass to find all applicable incentive programs for the homeowner's property and equipment. It outputs:

1. **`programs[]`** — each item becomes one row in `incentive_programs`, duplicated for every `bid_id`
2. **`summary`** — the summary fields write to `incentive_*` columns on every `contractor_bids` row

**Rule:** This node researches once. The same program list applies to all bids. The downstream Code Node handles fan-out to individual `bid_id` rows.

---

## Database Columns This Node Populates

### `incentive_programs` table (one row per program, per bid)

| DB Column | Type | Source |
|---|---|---|
| `program_name` | TEXT NOT NULL | Research output |
| `program_type` | TEXT NOT NULL | federal / state / utility / local / manufacturer |
| `incentive_amount_numeric_min` | DECIMAL(12,2) | Research output |
| `incentive_amount_numeric_max` | DECIMAL(12,2) | Research output |
| `incentive_amount_string` | TEXT | Human-readable description |
| `equipment_requirements` | TEXT | Eligibility specs |
| `eligibility_requirements` | TEXT | Other criteria |
| `income_limits` | TEXT | Income qualification details |
| `application_process` | TEXT | How to apply |
| `can_stack_with_other_incentives` | BOOLEAN | Stacking eligibility |
| `stacking_notes` | TEXT | Stacking details |
| `verification_source` | TEXT | URL or site name |
| `still_active` | BOOLEAN | Whether program is current |
| `research_confidence` | TEXT | high / medium / low |
| `research_notes` | TEXT | Per-program notes |

### `contractor_bids` columns (written to every bid row for this job)

| DB Column | Type | Source |
|---|---|---|
| `incentive_electric_utility` | TEXT | Identified from location research |
| `incentive_gas_utility` | TEXT | Identified from location research |
| `incentive_cca` | TEXT | CCA name if applicable |
| `incentive_ren` | TEXT | REN name if applicable |
| `incentive_total_potential_low` | DECIMAL(12,2) | Calculated conservative total |
| `incentive_total_potential_high` | DECIMAL(12,2) | Calculated best-case total |
| `incentive_programs_found_count` | INTEGER | Count of programs array |
| `incentive_research_confidence` | TEXT | Overall research confidence |
| `incentive_research_notes` | TEXT | Summary research narrative |

---

## Task Prompt — Copy Into MindPal

> Paste this entire block as the agent's task prompt. The variable `{{contractor_researcher_output}}` (or whatever MindPal calls the upstream node reference) **must show purple** in the MindPal UI.

---

You are researching ALL available incentive programs for a heat pump installation at this homeowner's property. You receive the full array of bid objects from all upstream research nodes.

ALL BID DATA:
{{#contractor_researcher_output}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — EXTRACT CONTEXT FROM BID DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

From the bid array, extract:
  ✓ Property state (from customer_info.property_state)
  ✓ Property zip code (from customer_info.property_zip)
  ✓ Property city (from customer_info.property_city)
  ✓ All unique equipment types across all bids (heat_pump, condenser, furnace, etc.)
  ✓ Any ENERGY STAR Most Efficient equipment noted in equipment arrays
  ✓ Any utility names already extracted in the bid data

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — IDENTIFY UTILITIES (Search 1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If electric utility is not already known from bid data:
  Search: "[city] [state] electric utility provider"

Extract:
  ✓ Electric utility name
  ✓ Gas utility name (if applicable)
  ✓ CCA membership (common in CA, MA, IL — e.g., "MCE Clean Energy", "Marin Clean Energy")
  ✓ REN name (CA only — e.g., "BayREN", "SoCalREN")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — FEDERAL PROGRAMS (Search 2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Search: "IRA 25C heat pump tax credit 2026 current amount"

Research:
  ✓ Section 25C — current credit amount for heat pumps (30%, up to $2,000/year)
  ✓ Equipment eligibility requirements (ENERGY STAR Most Efficient)
  ✓ Income limit (there is none for 25C — note this)
  ✓ HEEHRA status for this state — is it launched? What are the current amounts?
  ✓ Stackability: 25C and HEEHRA cannot stack on the same equipment in the same tax year

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — STATE PROGRAMS (Search 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Search: "[state] heat pump rebate program 2026"

Research:
  ✓ State energy office rebate programs
  ✓ State income tax credits for heat pumps
  ✓ Eligibility requirements, amounts, income limits
  ✓ Application process and URL

If no state program found → note in research_notes, do not create a null entry.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — UTILITY PROGRAMS (Searches 4–5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Search: "[electric utility name] heat pump rebate 2026"

Research:
  ✓ Current rebate amount per unit
  ✓ Efficiency tier requirements (SEER2 threshold, HSPF2 threshold)
  ✓ Income-qualified enhanced rebate amounts (if available)
  ✓ Application process

If CCA identified:
  Search: "[CCA name] heat pump rebate"
  ✓ CCA-specific programs (some CCAs have programs on top of utility programs)

If gas utility identified:
  Search: "[gas utility name] heat pump rebate"
  ✓ Gas utility programs for dual-fuel/hybrid heat pump systems

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — MANUFACTURER REBATES (Search 6)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each brand that appears in any bid's equipment array:
  Search: "[brand] heat pump rebate promotion 2026"
  Example: "Carrier heat pump rebate 2026"

Research:
  ✓ Current promotional rebate amounts
  ✓ Qualifying model series
  ✓ Expiration date if published
  ✓ Whether rebate goes through dealer or direct to customer

Only include manufacturer rebates for brands actually quoted in the bids.
Skip if no current promotion found — do not invent one.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 7 — CALCULATE TOTALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Calculate total_potential_low and total_potential_high:
  - LOW = most conservative realistic scenario (only stackable, confirmed programs at minimum amounts)
  - HIGH = best-case scenario (all stackable programs at maximum amounts, income-qualified if HEEHRA available)
  - Do NOT double-count non-stackable programs (e.g., 25C and HEEHRA)
  - Explain the calculation in research_notes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON. No preamble, no explanation, no markdown wrappers.

{
  "location_context": {
    "state": "string",
    "zip": "string or null",
    "electric_utility": "string or null",
    "gas_utility": "string or null",
    "cca": "string or null",
    "ren": "string or null"
  },
  "summary": {
    "programs_found_count": 0,
    "total_potential_low": null,
    "total_potential_high": null,
    "research_confidence": "high|medium|low",
    "research_notes": "string"
  },
  "programs": [
    {
      "program_name": "string",
      "program_type": "federal|state|utility|local|manufacturer",
      "incentive_amount_numeric_min": null,
      "incentive_amount_numeric_max": null,
      "incentive_amount_string": "string",
      "equipment_requirements": "string or null",
      "eligibility_requirements": "string or null",
      "income_limits": "string or null",
      "application_process": "string or null",
      "can_stack_with_other_incentives": null,
      "stacking_notes": "string or null",
      "verification_source": "string",
      "still_active": true,
      "research_confidence": "high|medium|low",
      "research_notes": "string or null"
    }
  ]
}

VALIDATION RULES:
✅ MUST DO:
  1. programs_found_count must equal the actual length of the programs array
  2. All program_type values must be exactly: federal, state, utility, local, or manufacturer
  3. incentive_amount_string is REQUIRED on every program — always write a human-readable description
  4. still_active is REQUIRED boolean on every program
  5. verification_source is REQUIRED on every program — URL or site name
  6. research_confidence per program: "high", "medium", or "low" only
  7. total_potential_low and total_potential_high must be plain numbers (no $ sign, no commas)
  8. research_notes must explain what searches were performed and the stacking logic for totals

❌ DO NOT DO:
  1. Do NOT create programs you could not verify — use null fields and low confidence instead
  2. Do NOT stack 25C and HEEHRA on the same equipment in total calculations
  3. Do NOT include programs for states or utilities that don't serve this property
  4. Do NOT wrap output in ```json``` code blocks
  5. Do NOT omit still_active — set false for expired programs, don't skip them

---

## Example JSON Output

```json
{
  "location_context": {
    "state": "California",
    "zip": "94941",
    "electric_utility": "Pacific Gas and Electric (PG&E)",
    "gas_utility": "Pacific Gas and Electric (PG&E)",
    "cca": "MCE Clean Energy",
    "ren": "BayREN"
  },
  "summary": {
    "programs_found_count": 5,
    "total_potential_low": 2700,
    "total_potential_high": 10500,
    "research_confidence": "high",
    "research_notes": "All programs verified on official sources. LOW estimate: 25C ($2,000) + PG&E utility rebate ($700 standard tier). HIGH estimate: HEEHRA max ($8,000 for ≤80% AMI) + PG&E income-qualified rebate ($1,500) + Carrier promotion ($1,000) = $10,500. Note: 25C and HEEHRA cannot stack on same equipment — HIGH uses HEEHRA path, LOW uses 25C path. State TECH Clean CA program currently pending funding — listed with low confidence."
  },
  "programs": [
    {
      "program_name": "IRA Section 25C Energy Efficient Home Improvement Credit",
      "program_type": "federal",
      "incentive_amount_numeric_min": 600,
      "incentive_amount_numeric_max": 2000,
      "incentive_amount_string": "30% of cost, up to $2,000 per year for heat pumps",
      "equipment_requirements": "ENERGY STAR Most Efficient certified heat pump. Central ducted or ductless mini-split.",
      "eligibility_requirements": "Must own and occupy the home. Non-refundable tax credit — must owe federal income tax to benefit.",
      "income_limits": "None — available to all income levels",
      "application_process": "Claim on IRS Form 5695 when filing federal tax return. Keep equipment receipts and ENERGY STAR certification documentation.",
      "can_stack_with_other_incentives": true,
      "stacking_notes": "Stackable with utility rebates and manufacturer rebates. Cannot stack with HEEHRA on the same equipment in the same tax year.",
      "verification_source": "energystar.gov/tax-credits/central-air-conditioners-heat-pumps",
      "still_active": true,
      "research_confidence": "high",
      "research_notes": "Confirmed active for 2026 on energystar.gov. Credit expires 12/31/2032 under current IRA provisions."
    },
    {
      "program_name": "HEEHRA — High-Efficiency Electric Home Rebate Act",
      "program_type": "federal",
      "incentive_amount_numeric_min": 0,
      "incentive_amount_numeric_max": 8000,
      "incentive_amount_string": "Up to $8,000 for heat pumps. Income-qualified only: 100% rebate for ≤80% AMI, 50% for 80-150% AMI.",
      "equipment_requirements": "ENERGY STAR certified heat pump. Must replace fossil fuel system or be new installation.",
      "eligibility_requirements": "Income-qualified households only. Must be primary residence. Program administered by state — California program status: check TECH Clean CA for current availability.",
      "income_limits": "≤80% Area Median Income: 100% rebate up to $8,000. 80–150% AMI: 50% rebate up to $4,000. >150% AMI: not eligible.",
      "application_process": "Apply through participating contractor or state program portal. California: check tech.cleanca.net for current status.",
      "can_stack_with_other_incentives": false,
      "stacking_notes": "Cannot combine with Section 25C on the same equipment in the same tax year. Can stack with utility rebates.",
      "verification_source": "rewiringamerica.org/policy/high-efficiency-electric-home-rebate-act",
      "still_active": true,
      "research_confidence": "medium",
      "research_notes": "Federal program confirmed active. California implementation status as of Feb 2026: TECH Clean CA is the anticipated state administrator — verify current funding availability before advising customer."
    },
    {
      "program_name": "PG&E Heat Pump Rebate",
      "program_type": "utility",
      "incentive_amount_numeric_min": 700,
      "incentive_amount_numeric_max": 1500,
      "incentive_amount_string": "$700 standard rebate; up to $1,500 for income-qualified customers",
      "equipment_requirements": "ENERGY STAR certified ducted heat pump. Minimum SEER2 15.2, HSPF2 7.5.",
      "eligibility_requirements": "PG&E electric customer. Must use PG&E participating contractor. Rebate applies to replacement of gas furnace with heat pump.",
      "income_limits": "Standard rebate: no income limit. Enhanced rebate ($1,500): CARE or FERA program participants only.",
      "application_process": "Contractor submits rebate application on customer's behalf through PG&E rebate portal after installation.",
      "can_stack_with_other_incentives": true,
      "stacking_notes": "Stackable with federal 25C, HEEHRA, and manufacturer rebates. MCE customers may also be eligible for MCE programs.",
      "verification_source": "pge.com/en/account/save-energy-money/rebates-and-incentives/heating-cooling",
      "still_active": true,
      "research_confidence": "high",
      "research_notes": "Confirmed active on PG&E website Feb 2026. Amounts subject to change — advise customer to verify before purchase."
    },
    {
      "program_name": "MCE Clean Energy — Heat Pump Rebate",
      "program_type": "local",
      "incentive_amount_numeric_min": 300,
      "incentive_amount_numeric_max": 300,
      "incentive_amount_string": "$300 rebate for qualifying heat pump installations",
      "equipment_requirements": "ENERGY STAR certified heat pump. Customer must be in MCE service territory.",
      "eligibility_requirements": "MCE Clean Energy customer (Marin County and portions of surrounding counties). Stackable with PG&E distribution rebates.",
      "income_limits": "None listed",
      "application_process": "Apply through MCE website. Submit installation receipt and equipment spec sheet.",
      "can_stack_with_other_incentives": true,
      "stacking_notes": "MCE rebate stacks with PG&E rebates since MCE is generation-only and PG&E handles distribution. Customer may receive both.",
      "verification_source": "mcecleanenergy.org/rebates",
      "still_active": true,
      "research_confidence": "medium",
      "research_notes": "MCE program found on mcecleanenergy.org. Amount and availability should be verified directly — MCE programs change frequently."
    },
    {
      "program_name": "Carrier Heat Pump Seasonal Promotion",
      "program_type": "manufacturer",
      "incentive_amount_numeric_min": 200,
      "incentive_amount_numeric_max": 800,
      "incentive_amount_string": "$200–$800 depending on qualifying model and current promotion",
      "equipment_requirements": "Carrier Infinity or Performance series heat pump purchased through Carrier Factory Authorized Dealer.",
      "eligibility_requirements": "Must purchase through authorized dealer. Promotion may be limited by region and season.",
      "income_limits": "None",
      "application_process": "Dealer submits rebate on customer's behalf, or customer submits at carrier.com/promotions after installation.",
      "can_stack_with_other_incentives": true,
      "stacking_notes": "Manufacturer rebates generally stack with all federal, state, and utility programs.",
      "verification_source": "carrier.com/residential/offers-and-promotions",
      "still_active": true,
      "research_confidence": "low",
      "research_notes": "Carrier promotions change seasonally. Amount range based on historical promotions. Customer must verify current promotion with their Carrier dealer before purchase."
    }
  ]
}
```

---

## Edge Cases

| Scenario | Handling |
|---|---|
| HEEHRA not yet launched in this state | Still include as a program entry, `still_active: true`, note state rollout status in `research_notes`, set `research_confidence: "low"` |
| No state program found | Omit from programs array — do not create a null placeholder. Note in `summary.research_notes`. |
| Utility not identifiable | Set `electric_utility: null`, skip utility rebate search, note in `research_notes` |
| Multiple bids with different equipment brands | Include manufacturer rebates for all brands found across all bids |
| Equipment doesn't meet ENERGY STAR threshold | Still include the program but note equipment_requirements don't appear met — scoring node can use this |
| Program expired during current year | Set `still_active: false`, include the entry, note expiration in `research_notes` |
| Gas utility rebate for heat pump (dual-fuel) | Include only if any bid proposes a dual-fuel / hybrid system |
| CCA not identified | Set `cca: null`, skip CCA search |
| Manufacturer not offering current promotion | Skip that manufacturer — do not invent amounts |

---

## Idempotency / Upsert Strategy

The downstream Code Node must use this upsert key to prevent duplicate rows on re-runs:

```sql
ON CONFLICT (bid_id, program_name) DO UPDATE SET
  program_type = EXCLUDED.program_type,
  incentive_amount_numeric_min = EXCLUDED.incentive_amount_numeric_min,
  incentive_amount_numeric_max = EXCLUDED.incentive_amount_numeric_max,
  incentive_amount_string = EXCLUDED.incentive_amount_string,
  equipment_requirements = EXCLUDED.equipment_requirements,
  eligibility_requirements = EXCLUDED.eligibility_requirements,
  income_limits = EXCLUDED.income_limits,
  application_process = EXCLUDED.application_process,
  can_stack_with_other_incentives = EXCLUDED.can_stack_with_other_incentives,
  stacking_notes = EXCLUDED.stacking_notes,
  verification_source = EXCLUDED.verification_source,
  still_active = EXCLUDED.still_active,
  research_confidence = EXCLUDED.research_confidence,
  research_notes = EXCLUDED.research_notes;
```

The same programs list is inserted for every `bid_id` in the job. The Code Node loops over all `bid_ids` and inserts each program against each bid.

---

## What This Node Does NOT Do

- Does NOT process bids one at a time — it receives and processes ALL bids simultaneously
- Does NOT modify equipment specs, pricing, contractor ratings, scope, or electrical fields
- Does NOT create `bid_questions`, `bid_faqs`, or `project_faqs` rows
- Does NOT score bids or produce recommendations
- Does NOT include rebates already mentioned on the bid PDFs (those are captured by Bid Extractor in `rebates_mentioned`) — this node only researches externally verifiable programs

---

## Node File Location

`mindpal/nodes/incentive-finder.md` — this file is the source of truth for this node.
