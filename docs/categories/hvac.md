# Category Spec: HVAC

> "You've got an HVAC expert"
>
> MVP category — build first.
> Covers: heat pumps, furnace+AC, mini-splits, hybrids, boilers

---

## 1. System Types

| system_type | Description | Equipment Rows Created |
|-------------|-------------|----------------------|
| `heat_pump` | Single system for heating + cooling | 1x heat_pump (primary_both) + 1x air_handler (air_distribution) |
| `furnace_ac` | Separate furnace + AC condenser | 1x furnace (primary_heating) + 1x condenser (primary_cooling) + 1x air_handler |
| `mini_split` | Ductless heat pump | 1x heat_pump (primary_both) — no air handler |
| `hybrid` | Heat pump + gas furnace backup | 1x heat_pump (primary_both) + 1x furnace (secondary) + 1x air_handler |
| `boiler` | Hydronic heating system | 1x boiler (primary_heating) + optional distribution equipment |

---

## 2. Category Attributes JSON Schema

Stored in `bid_category_attributes.attributes` where `category = 'hvac'`.

```jsonc
{
  // System identification
  "system_type": "heat_pump",           // heat_pump | furnace_ac | mini_split | hybrid | boiler
  "is_heat_pump": true,                 // safety flag — true for heat_pump, mini_split, hybrid

  // HVAC-specific scope booleans (three-state: true/false/null)
  "electrical_included": true,
  "electrical_detail": "Includes 240V dedicated circuit and disconnect",
  "ductwork_included": null,            // null = not mentioned → triggers question
  "ductwork_detail": null,
  "air_handler_included": true,
  "air_handler_detail": "New variable speed air handler included",
  "line_set_included": true,
  "line_set_detail": "New 50ft line set with cover",
  "disconnect_included": true,
  "disconnect_detail": "New weatherproof disconnect",
  "pad_included": true,
  "pad_detail": "New composite equipment pad",
  "drain_line_included": true,
  "drain_line_detail": "New condensate drain with trap",
  "manual_j_included": null,            // load calculation
  "manual_j_detail": null,

  // Electrical safety fields (10 fields — safety-critical for HVAC)
  "panel_assessment_included": null,    // null = AUTO HIGH PRIORITY QUESTION
  "panel_upgrade_included": null,
  "dedicated_circuit_included": true,
  "electrical_permit_included": null,
  "load_calculation_included": null,
  "existing_panel_amps": null,          // integer: 100, 150, 200
  "proposed_panel_amps": null,
  "breaker_size_required": null,        // integer: typically 30-60 for heat pumps
  "panel_upgrade_cost": null,           // decimal, from bid only
  "electrical_notes": null
}
```

### Validation Rules

- `system_type` is REQUIRED
- `is_heat_pump` is REQUIRED — must be `true` for heat_pump, mini_split, hybrid; `false` for furnace_ac, boiler
- All scope booleans use three-state logic (true/false/null)
- Electrical fields are safety-critical: if ANY are populated, the section is valid; if ALL are null, trigger HIGH priority question
- `panel_assessment_included = null` ALWAYS triggers a HIGH priority question for heat pumps (240V requirement)

---

## 3. Equipment Types & Efficiency Metrics

### Equipment Type → System Role Mapping (deterministic, never guessed)

| equipment_type | system_role | Efficiency Metrics |
|---------------|-------------|-------------------|
| `heat_pump` | `primary_both` | SEER2, HSPF2, SEER (legacy), HSPF (legacy), COP |
| `condenser` | `primary_cooling` | SEER2, EER — NEVER HSPF (condensers don't heat) |
| `furnace` | `primary_heating` or `secondary` (in hybrid) | AFUE — NEVER SEER, HSPF, EER, or COP |
| `air_handler` | `air_distribution` | NO independent efficiency rating (all fields null) |
| `boiler` | `primary_heating` | AFUE |

### Efficiency Rating Rules

- **SEER2/HSPF2** (2023+ DOE standard) is PREFERRED over legacy SEER/HSPF
- If bid cites SEER (not SEER2), extract as `seer_rating`, then research SEER2 from AHRI
- AFUE is for furnaces/boilers ONLY — never use for heat pumps
- When `variable_speed = true`, `stages` must be `null` (NEVER 0)
- `fuel_type` is deterministic: heat_pump/condenser/air_handler → `electric`; furnace → `natural_gas`/`propane`/`oil`

### efficiency_ratings JSONB Examples

Heat pump:
```json
{"seer2": 20.5, "hspf2": 10.0, "seer": 22.0, "hspf": 10.5, "cop": 4.2, "eer": 13.5}
```

Furnace:
```json
{"afue": 96.0}
```

Condenser (AC only):
```json
{"seer2": 19.2, "eer": 12.5}
```

Air handler:
```json
{}
```

---

## 4. Equipment Research — AHRI Matching

### Source Priority

1. **Manufacturer spec sheets**: carrier.com, lennox.com, trane.com, daikin.com, mitsubishi-electric.com, rheem.com, goodmanmfg.com
2. **AHRI directory** (ahridirectory.org): Authoritative for efficiency ratings (SEER2, HSPF2, AFUE, EER)
3. **Energy Star product finder** (energystar.gov): Authoritative for certifications
4. **Retailer specs as fallback**: supplyhouse.com, alpinehomeair.com

### Brand Normalization

Common misspellings in bids:
- "Lenox" → "Lennox"
- "Traine" → "Trane"
- "Goodmen" → "Goodman"
- "Carrier" (always title case)
- "Daikin" (always title case)
- "Mitsubishi" (always title case)

### Research Rules

**High-value (if missing, ALWAYS search):**
- SEER2 / HSPF2 (heat pumps and condensers)
- AFUE (furnaces)
- Energy Star certification
- Capacity BTU/tons (if neither in bid)

**Medium-value (search if brand + model known):**
- EER, COP, sound level dB, refrigerant type
- Voltage, amperage, minimum circuit amperage (MCA)
- Model name (marketing name)
- Warranty years, compressor warranty years

**Low-value (infer, don't search):**
- `variable_speed` (infer from model series designation)
- `stages` (infer from variable_speed)
- `fuel_type` (deterministic from equipment_type)
- `system_role` (deterministic from equipment_type)

### Anti-Hallucination Rules (MANDATORY)

- NEVER fabricate specifications
- NEVER use AI training data for equipment specs (specs change between model years)
- NEVER estimate efficiency ratings ("probably around 20" is NOT data)
- NEVER fill in "typical" values for a brand or product line
- NEVER use specs from a different model number to fill gaps
- If model number returns no results, ALL researched specs remain null
- Equipment cost is NEVER researched — only extracted from bid document

---

## 5. Safety-Critical Fields

### Electrical Panel Assessment

Heat pumps require 240V service. Many older homes need electrical panel upgrades.

**Rule**: If `panel_assessment_included = null` → generate HIGH priority question automatically, every time, no exceptions.

**10 Electrical Fields:**
1. `panel_assessment_included` — did the bid assess the electrical panel?
2. `panel_upgrade_included` — is a panel upgrade part of the scope?
3. `dedicated_circuit_included` — new dedicated circuit for the equipment?
4. `electrical_permit_included` — electrical permit in scope?
5. `load_calculation_included` — load calculation performed?
6. `existing_panel_amps` — current panel capacity (100, 150, 200)
7. `proposed_panel_amps` — proposed upgrade capacity
8. `breaker_size_required` — breaker amps for the equipment (typically 30-60)
9. `panel_upgrade_cost` — cost if separated in bid (from bid only, never estimated)
10. `electrical_notes` — any other electrical details

### Refrigerant Type

- Current standard: R-410A (being phased out)
- New standard: R-454B, R-32
- Always include "R-" prefix
- Flag if bid doesn't mention refrigerant type (medium priority question)

---

## 6. Extraction Edge Cases

### Multiple Equipment in One Bid

A heat pump bid typically has 2 equipment rows: outdoor unit (heat_pump) + indoor unit (air_handler).
A furnace+AC bid has 3: furnace + condenser + air_handler.
A hybrid has 3: heat pump + furnace + air_handler.

Each gets its own `bid_equipment` row with appropriate efficiency metrics.

### Missing Model Numbers

Bid mentions "Carrier heat pump, 3-ton" but no model number.
- Search brand + capacity alone
- Set confidence = "low"
- Skip model-specific research
- Generate medium priority question asking for model number

### Accessories vs Equipment

These are ACCESSORIES (stored in `bid_scope.accessories` JSONB), NOT equipment rows:
- Thermostats (including smart thermostats)
- Line set covers
- Surge protectors
- UV lights
- Condensate pumps
- Humidifiers/dehumidifiers

This was a frequent source of errors in earlier iterations. Thermostats are NOT major equipment.

### Capacity Unit Confusion

- If bid says "3 ton" but no BTU: `capacity_value = 3.0, capacity_unit = 'tons'`
- Equipment researcher calculates BTU equivalent (tons × 12,000) in research output
- If bid says "36,000 BTU" but no tons: `capacity_value = 36000, capacity_unit = 'btu'`
- Never assume; always derive from stated unit

### Hybrid Systems

- Heat pump + gas furnace backup is a VALID configuration, not a rejection
- system_type = 'hybrid'
- Create BOTH equipment rows: heat_pump (primary_both) + furnace (secondary)
- The furnace has AFUE; the heat pump has SEER2/HSPF2 — never mix metrics

### Zoned Systems

- Bid includes "two outdoor units, each 2-ton"
- Create TWO equipment rows, each with own model/specs/confidence
- No aggregation at equipment level

### SEER vs SEER2

- Bid lists "SEER 20" without specifying standard
- Extract as `seer_rating: 20`
- Research agent looks up SEER2 from AHRI → `seer2_rating: 18.5` (SEER2 is always lower)
- Document in research metadata when both found

---

## 7. HVAC-Specific Question Triggers

### Always HIGH Priority

| Trigger | Condition | Example Question |
|---------|-----------|-----------------|
| Missing electrical assessment | `panel_assessment_included = null` | "Has your electrical panel been assessed for the heat pump's requirements? Heat pumps require 240V service and a dedicated circuit." |
| Missing load calculation | `load_calculation_included = null` AND system_type is heat_pump | "Was a Manual J load calculation performed to size the system correctly?" |

### Cross-Bid Comparison Triggers

| Trigger | Condition | Example Question |
|---------|-----------|-----------------|
| Price variance | >15% spread on total_bid_amount | "Your bid is $4,200 higher than Contractor A's. What accounts for this difference?" |
| Scope difference | ductwork_included differs across bids | "Your bid doesn't mention ductwork. Do the existing ducts need modification for the new system?" |
| Equipment tier difference | One bid has variable_speed, another doesn't | "Why did you recommend a single-stage system when Contractor B proposed variable-speed?" |

### Technology Decision Triggers (heat pump vs furnace+AC)

| Trigger | Condition | Example Question |
|---------|-----------|-----------------|
| Cross-type in same project | heat_pump config vs furnace_ac config | "What are the heating cost differences between the heat pump and furnace options for this climate zone?" |
| Within-bid options | Same contractor offers both | "You've offered both a heat pump and furnace+AC option. Which do you recommend for this home and why?" |

---

## 8. Comparison Normalization

### Key Comparison Metrics for HVAC

| Metric | How to Normalize | Notes |
|--------|-----------------|-------|
| Total cost | Direct comparison (decimal) | Always comparable |
| Efficiency (heating) | HSPF2 for heat pumps, AFUE for furnaces | Can't directly compare — use narrative |
| Efficiency (cooling) | SEER2 for all | Comparable across heat pumps and AC condensers |
| Warranty | Years (labor vs equipment vs compressor) | Compare each separately |
| Electrical impact | Panel upgrade needed (yes/no/unknown) | Flag unknowns |
| Noise | Sound level dB (outdoor unit) | Lower is better |
| Cold climate | Minimum operating temperature, COP at 5°F | Critical in cold climates |

### Cross-Type Comparison Narrative

When comparing heat pump to furnace+AC, the comparison agent produces:
- Direct cost comparison (universal)
- Separate efficiency analysis: "Heat pump HSPF2 10.0 (heating) + SEER2 20.5 (cooling) vs Furnace AFUE 96% (heating) + AC SEER2 19.2 (cooling)"
- Operating cost context: "Heat pump uses electricity for both; furnace+AC uses gas for heating, electricity for cooling"
- Technology tradeoffs narrative
- This applies whether the options come from different contractors OR from the same contractor
