# Category Spec: Water Heaters

> "You've got a water heater specialist"
>
> Phase 2 category.
> Covers: tank, tankless, heat pump water heater, solar thermal

---

## 1. System Types

| system_type | Description | Equipment Rows |
|-------------|-------------|---------------|
| `tank` | Traditional storage tank | 1x water_heater (primary) |
| `tankless` | On-demand / instantaneous | 1x water_heater (primary) |
| `heat_pump_water_heater` | Hybrid electric heat pump | 1x water_heater (primary) |
| `solar_thermal` | Solar collector + storage tank | 1x solar_collector + 1x storage_tank |

**Note**: A heat pump water heater is category `water_heater`, NOT `hvac`. It's a different appliance from an HVAC heat pump despite sharing the heat pump technology name.

---

## 2. Category Attributes JSON Schema

```jsonc
{
  "system_type": "tankless",           // tank | tankless | heat_pump_water_heater | solar_thermal
  "fuel_type": "natural_gas",          // electric | natural_gas | propane | solar

  // Capacity & Performance
  "capacity_gallons": null,            // tank: 40-80 gallons; tankless: null
  "flow_rate_gpm": 9.5,               // tankless: gallons per minute; tank: null
  "first_hour_rating": null,           // tank: gallons in first hour; tankless: null
  "recovery_rate_gph": null,           // gallons per hour recovery
  "temperature_rise": 77,             // °F rise at rated flow (tankless)

  // Venting (SAFETY-CRITICAL for gas units)
  "venting_type": "direct_vent",       // none | power_vent | direct_vent | atmospheric | sealed_combustion
  "venting_detail": "New direct vent through exterior wall",
  "venting_included": true,

  // Installation scope
  "expansion_tank_included": true,
  "expansion_tank_detail": "New thermal expansion tank",
  "recirculation_included": false,
  "recirculation_detail": "Not included — existing recirculation loop retained",
  "gas_line_included": true,           // for gas units
  "gas_line_detail": "New 3/4\" gas line from manifold",
  "drain_pan_included": true,
  "drain_pan_detail": "New aluminum drain pan with drain line",

  // Electrical (for heat pump water heaters and electric units)
  "electrical_included": true,
  "electrical_detail": "New 30A dedicated circuit",
  "breaker_size_required": 30,

  // Location
  "installation_location": "garage",    // garage | basement | utility_closet | exterior | attic
  "relocation_required": false,
  "relocation_detail": null
}
```

---

## 3. Equipment Efficiency Metrics

| system_type | Key Metric | efficiency_ratings JSONB |
|-------------|-----------|------------------------|
| tank (gas) | UEF (Uniform Energy Factor) | `{"uef": 0.70, "first_hour_rating": 67}` |
| tank (electric) | UEF | `{"uef": 0.93, "first_hour_rating": 58}` |
| tankless (gas) | UEF + flow rate | `{"uef": 0.96, "flow_rate_gpm": 9.5, "temperature_rise": 77}` |
| heat_pump_water_heater | UEF (typically 3.0+) | `{"uef": 3.42, "first_hour_rating": 67}` |
| solar_thermal | Solar fraction | `{"solar_fraction": 0.65, "backup_uef": 0.93}` |

---

## 4. Safety-Critical Fields

### Venting (CO Risk)

Gas water heaters produce combustion gases. Improper venting = carbon monoxide risk.

**Rule**: If `fuel_type IN ('natural_gas', 'propane') AND venting_type = null` → AUTO HIGH PRIORITY QUESTION

| Venting Type | Risk Level | Notes |
|-------------|-----------|-------|
| `atmospheric` | Higher | Relies on natural draft; can backdraft |
| `power_vent` | Medium | Fan-assisted; more reliable |
| `direct_vent` | Lower | Sealed combustion; safest for gas |
| `sealed_combustion` | Lowest | Fully sealed; no indoor air used |
| `none` | N/A | Electric units only |

### Expansion Tank

Required by code in most jurisdictions for closed plumbing systems.
- If `expansion_tank_included = null` → medium priority question

### Gas Line Sizing

Tankless gas units often need larger gas lines than tank units.
- If switching from tank → tankless AND `gas_line_included = null` → high priority question

---

## 5. Extraction Edge Cases

| Scenario | Handling |
|----------|---------|
| Tank → tankless conversion | Different infrastructure: gas line sizing, venting, electrical. Flag scope gaps. |
| Heat pump water heater in unheated space | Performance drops in cold ambient. Generate question about location suitability. |
| Bundle: HVAC + water heater | This is a cross-category bundle. Water heater portion gets its own `bid_category_attributes` record. |
| Solar thermal + backup tank | Two equipment rows. Solar fraction is the key metric. |
| Recirculation pump upgrade | Accessory, not equipment. Store in `bid_scope.accessories`. |

---

## 6. Comparison Normalization

| Metric | How to Compare |
|--------|---------------|
| Total cost | Direct (decimal) |
| Operating cost | Estimate from UEF + fuel cost per therm/kWh (if available) |
| Capacity | Gallons (tank) vs GPM (tankless) — narrative explanation needed |
| Energy efficiency | UEF — directly comparable within same fuel type |
| Space requirements | Tank needs floor space; tankless is wall-mounted |
| Recovery time | First-hour rating (tank) vs continuous flow (tankless) |

### Cross-Type Narrative

When comparing tank vs tankless: "Tank water heaters store 50 gallons of hot water ready for use but can run out during heavy demand. Tankless units heat water on demand with unlimited supply but may struggle with multiple simultaneous fixtures."
