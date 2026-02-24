# bid_equipment — Supabase Table Schema & MindPal JSON Format

## Purpose

Primary HVAC equipment being compared across contractor bids. These are the major appliances: heat pump units, furnaces, AC condensers, air handlers. Each bid can have multiple equipment rows (1:N relationship — e.g., one outdoor unit + one air handler per bid).

**NOT stored here:** Thermostats, surge protectors, UV lights, line sets, disconnects, pads, and other accessories. Those go in `bid_scope.accessories` (JSONB).

---

## Supabase Table: `bid_equipment`

| # | Column Name | Data Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|---|
| 1 | `id` | UUID | NO | `uuid_generate_v4()` | PRIMARY KEY | Unique equipment record ID |
| 2 | `bid_id` | UUID | NO | — | FK -> `bids(id)` ON DELETE CASCADE | Parent bid this equipment belongs to |
| 3 | `equipment_type` | TEXT | NO | — | — | Type of equipment. Values: `'heat_pump'`, `'outdoor_unit'`, `'indoor_unit'`, `'air_handler'`, `'furnace'`, `'condenser'` |
| 4 | `system_role` | TEXT | YES | — | — | Role in the HVAC system. Values: `'primary_both'` (heat pump — heats AND cools), `'primary_heating'` (furnace), `'primary_cooling'` (AC condenser), `'air_distribution'` (air handler), `'secondary'` (backup/supplemental) |
| 5 | `brand` | TEXT | NO | — | — | Manufacturer name (e.g., "Carrier", "Lennox", "Daikin") |
| 6 | `model_number` | TEXT | YES | — | — | Manufacturer model number (e.g., "24VNA036A003") |
| 7 | `model_name` | TEXT | YES | — | — | Marketing/product line name (e.g., "Infinity 24 Heat Pump") |
| 8 | `capacity_btu` | INTEGER | YES | — | — | Cooling/heating capacity in BTU/hr (e.g., 36000, 48000, 60000) |
| 9 | `capacity_tons` | DECIMAL(4,2) | YES | — | — | Capacity in tons (1 ton = 12,000 BTU). E.g., 3.0, 4.0, 5.0 |
| 10 | `seer_rating` | DECIMAL(5,2) | YES | — | — | Seasonal Energy Efficiency Ratio (cooling efficiency, older standard). E.g., 16.0, 20.0 |
| 11 | `seer2_rating` | DECIMAL(5,2) | YES | — | — | SEER2 (cooling efficiency, 2023+ standard). E.g., 15.2, 20.5. **Preferred over seer_rating for new equipment.** |
| 12 | `hspf_rating` | DECIMAL(5,2) | YES | — | — | Heating Seasonal Performance Factor (heating efficiency for heat pumps, older standard). E.g., 10.0 |
| 13 | `hspf2_rating` | DECIMAL(5,2) | YES | — | — | HSPF2 (heating efficiency, 2023+ standard). E.g., 9.5, 10.0. **Preferred over hspf_rating.** NOT applicable to furnaces. |
| 14 | `eer_rating` | DECIMAL(5,2) | YES | — | — | Energy Efficiency Ratio (steady-state cooling efficiency). E.g., 13.5 |
| 15 | `cop` | DECIMAL(4,2) | YES | — | — | Coefficient of Performance (ratio of heating/cooling output to energy input). E.g., 3.5 |
| 16 | `afue_rating` | DECIMAL(5,2) | YES | — | — | Annual Fuel Utilization Efficiency (heating efficiency for FURNACES only, as percentage). E.g., 96.0, 98.0. NOT applicable to heat pumps. |
| 17 | `fuel_type` | TEXT | YES | — | — | Fuel source. Values: `'electric'` (heat pumps, AC), `'natural_gas'` (furnaces), `'propane'`, `'oil'`. Heat pumps are always electric. |
| 18 | `variable_speed` | BOOLEAN | YES | — | — | Whether the compressor/blower is variable speed (true = variable, false = single/multi-stage) |
| 19 | `stages` | INTEGER | YES | — | — | Number of operating stages. 1 = single-stage, 2 = two-stage, 0 or null for variable speed |
| 20 | `refrigerant_type` | TEXT | YES | — | — | Refrigerant used. E.g., `'R-410A'`, `'R-32'`, `'R-454B'` |
| 21 | `sound_level_db` | DECIMAL(5,1) | YES | — | — | Sound level in decibels at lowest operating speed. E.g., 56.0, 72.0 |
| 22 | `voltage` | INTEGER | YES | — | — | Required voltage. E.g., 208, 230, 240 (heat pumps/AC), 120 (furnaces/air handlers) |
| 23 | `amperage_draw` | INTEGER | YES | — | — | Equipment amperage draw at rated capacity |
| 24 | `minimum_circuit_amperage` | INTEGER | YES | — | — | Minimum circuit amperage required per manufacturer specs |
| 25 | `energy_star_certified` | BOOLEAN | YES | — | — | Whether the equipment is ENERGY STAR certified |
| 26 | `energy_star_most_efficient` | BOOLEAN | YES | — | — | Whether the equipment has the ENERGY STAR Most Efficient designation (higher tier) |
| 27 | `warranty_years` | INTEGER | YES | — | — | Standard parts warranty in years. E.g., 5, 10 |
| 28 | `compressor_warranty_years` | INTEGER | YES | — | — | Compressor-specific warranty in years (often longer than parts). E.g., 10, 12, lifetime |
| 29 | `equipment_cost` | DECIMAL(10,2) | YES | — | — | Cost of this specific equipment item from the bid. E.g., 4500.00 |
| 30 | `confidence` | confidence_level | YES | `'manual'` | — | Extraction confidence. ENUM values: `'high'`, `'medium'`, `'low'`, `'manual'` |
| 31 | `created_at` | TIMESTAMPTZ | YES | `NOW()` | — | Record creation timestamp |

---

## Indexes

| Index | Columns | Notes |
|---|---|---|
| `bid_equipment_pkey` | `id` | Primary key (auto) |
| `idx_bid_equipment_bid_id` | `bid_id` | Fast lookup by parent bid |
| `idx_bid_equipment_type` | `equipment_type` | Filter by equipment type |
| `idx_bid_equipment_role` | `system_role` | Filter by system role (for function-based comparison) |

---

## Equipment Type + System Role Mapping

| equipment_type | system_role | Description | Efficiency Rating |
|---|---|---|---|
| `heat_pump` | `primary_both` | Heat pump outdoor unit — heats AND cools | SEER2 + HSPF2 |
| `outdoor_unit` | `primary_both` | Alternative name for heat pump outdoor unit | SEER2 + HSPF2 |
| `condenser` | `primary_cooling` | AC condenser (cooling only) | SEER2 + EER |
| `furnace` | `primary_heating` | Gas/propane/oil furnace (heating only) | AFUE |
| `air_handler` | `air_distribution` | Indoor air handler / blower unit | N/A (no efficiency rating) |
| `indoor_unit` | `air_distribution` | Alternative name for air handler / indoor coil | N/A |

---

## Common System Configurations

| System Type | Equipment Rows Created |
|---|---|
| **Heat Pump** | 1x `heat_pump` (primary_both) + 1x `air_handler` (air_distribution) |
| **Furnace + AC** | 1x `furnace` (primary_heating) + 1x `condenser` (primary_cooling) + 1x `air_handler` (air_distribution) |
| **Mini Split** | 1x `heat_pump` (primary_both) — ductless, no air handler |
| **Hybrid** | 1x `heat_pump` (primary_both) + 1x `furnace` (secondary) + 1x `air_handler` (air_distribution) |

---

## MindPal JSON Output Format

Each bid should output an `equipment` array. Each element in the array represents one piece of major HVAC equipment. MindPal should output one JSON object per equipment item:

### For a Heat Pump Bid (typical: 2 equipment items)

```json
{
  "equipment": [
    {
      "equipment_type": "heat_pump",
      "system_role": "primary_both",
      "brand": "Carrier",
      "model_number": "24VNA036A003",
      "model_name": "Infinity 24 Heat Pump",
      "capacity_btu": 36000,
      "capacity_tons": 3.0,
      "seer_rating": null,
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
      "equipment_cost": 4500.00,
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
      "equipment_cost": 1800.00,
      "confidence": "high"
    }
  ]
}
```

### For a Furnace + AC Bid (typical: 3 equipment items)

```json
{
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
      "equipment_cost": 3800.00,
      "confidence": "high"
    },
    {
      "equipment_type": "furnace",
      "system_role": "primary_heating",
      "brand": "Lennox",
      "model_number": "SL297NV060V36B",
      "model_name": "Dave Lennox Signature Series Gas Furnace",
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
      "equipment_cost": 3200.00,
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
      "equipment_cost": 1500.00,
      "confidence": "high"
    }
  ]
}
```

---

## Field-by-Field Extraction Notes for MindPal

| Field | Extraction Guidance | Common Pitfalls |
|---|---|---|
| `equipment_type` | Identify from bid context: heat pump outdoor = `heat_pump` or `outdoor_unit`, AC only = `condenser`, gas heater = `furnace`, indoor blower = `air_handler` | Don't confuse "heat pump" (does both) with "AC" (cooling only) |
| `system_role` | Set based on equipment_type: heat pump = `primary_both`, AC = `primary_cooling`, furnace = `primary_heating`, air handler = `air_distribution` | Must match equipment_type correctly |
| `brand` | Extract manufacturer name exactly as written | Normalize: "Carrier" not "CARRIER", "Lennox" not "lennox" |
| `model_number` | Full alphanumeric model number from bid | Include all characters, hyphens, etc. |
| `model_name` | Marketing/product line name if mentioned | May not always be in bid; leave null if not found |
| `capacity_btu` | Cooling capacity in BTU for heat pumps/AC; heating capacity for furnaces | Don't confuse cooling BTU vs heating BTU |
| `capacity_tons` | Convert from BTU: divide by 12,000. E.g., 36,000 BTU = 3.0 tons | Only for cooling capacity |
| `seer2_rating` | SEER2 (preferred). If only SEER listed, put in `seer_rating` | SEER2 is the 2023+ standard; SEER is pre-2023 |
| `hspf2_rating` | HSPF2 for heat pumps only. Furnaces do NOT have HSPF. | Leave null for furnaces and AC condensers |
| `afue_rating` | For furnaces only (as percentage, e.g., 96.0). Heat pumps do NOT have AFUE. | Leave null for heat pumps and AC condensers |
| `fuel_type` | `electric` for heat pumps and AC, `natural_gas`/`propane`/`oil` for furnaces | Heat pumps are ALWAYS electric |
| `variable_speed` | true if "variable speed", "inverter-driven", or "modulating" | false for single-speed or multi-stage that isn't truly variable |
| `stages` | 1 for single-stage, 2 for two-stage, null for variable speed | Variable speed is NOT "stages" |
| `sound_level_db` | Usually listed as "as low as XX dB" — use the lowest number | Sometimes listed in multiple conditions; use the quietest |
| `energy_star_certified` | true if "ENERGY STAR" is mentioned for this equipment | Certification is per-model, not per-brand |
| `energy_star_most_efficient` | true only if "ENERGY STAR Most Efficient" is specified | This is a higher tier than basic ENERGY STAR |
| `equipment_cost` | The cost of THIS specific equipment item if broken out in the bid | May not always be itemized; leave null if only total bid amount given |
| `confidence` | `high` if model number + specs clearly extracted; `medium` if partial; `low` if inferred | Be conservative — `medium` is fine for most extractions |

---

## SQL CREATE TABLE Statement

```sql
CREATE TABLE IF NOT EXISTS bid_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id UUID REFERENCES bids(id) ON DELETE CASCADE NOT NULL,

  -- Equipment identity
  equipment_type TEXT NOT NULL,
  system_role TEXT,

  -- Brand and model
  brand TEXT NOT NULL,
  model_number TEXT,
  model_name TEXT,

  -- Capacity
  capacity_btu INTEGER,
  capacity_tons DECIMAL(4,2),

  -- Efficiency ratings
  seer_rating DECIMAL(5,2),
  seer2_rating DECIMAL(5,2),
  hspf_rating DECIMAL(5,2),
  hspf2_rating DECIMAL(5,2),
  eer_rating DECIMAL(5,2),
  cop DECIMAL(4,2),
  afue_rating DECIMAL(5,2),
  fuel_type TEXT,

  -- Features
  variable_speed BOOLEAN,
  stages INTEGER,
  refrigerant_type TEXT,
  sound_level_db DECIMAL(5,1),

  -- Electrical
  voltage INTEGER,
  amperage_draw INTEGER,
  minimum_circuit_amperage INTEGER,

  -- Energy Star
  energy_star_certified BOOLEAN,
  energy_star_most_efficient BOOLEAN,

  -- Warranty
  warranty_years INTEGER,
  compressor_warranty_years INTEGER,

  -- Pricing
  equipment_cost DECIMAL(10,2),

  -- Extraction metadata
  confidence confidence_level DEFAULT 'manual',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_equipment_bid_id ON bid_equipment(bid_id);
CREATE INDEX IF NOT EXISTS idx_bid_equipment_type ON bid_equipment(equipment_type);
CREATE INDEX IF NOT EXISTS idx_bid_equipment_role ON bid_equipment(system_role) WHERE system_role IS NOT NULL;
```
