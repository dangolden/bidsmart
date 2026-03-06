# Category Spec: Solar & Battery

> "You've got a solar expert"
>
> Phase 3 category.
> Covers: solar panels, inverters, batteries, grid-tie, off-grid

---

## 1. System Types

| system_type | Description |
|-------------|-------------|
| `grid_tie` | Solar panels connected to utility grid (most common) |
| `grid_tie_battery` | Grid-tied with battery backup |
| `off_grid` | Fully independent (rare for residential) |
| `battery_only` | Battery storage added to existing solar |

---

## 2. Category Attributes JSON Schema

```jsonc
{
  "system_type": "grid_tie_battery",

  // System sizing
  "system_size_kw": 8.4,
  "panel_count": 21,
  "estimated_annual_production_kwh": 10200,
  "estimated_offset_percentage": 85,    // % of home's electricity covered

  // Mounting
  "roof_mounting_type": "flush",        // flush | tilt | ground | carport | ballasted
  "roof_penetrations": true,            // does mounting penetrate roof?
  "roof_warranty_maintained": null,     // does installation maintain existing roof warranty?
  "roof_condition_assessed": null,      // was roof inspected for solar suitability?

  // Electrical
  "electrical_included": true,
  "electrical_detail": "Main panel upgrade to 200A, new solar disconnect, rapid shutdown",
  "panel_upgrade_included": true,       // many solar installs need panel upgrades
  "panel_upgrade_detail": "Upgrade from 100A to 200A service",
  "existing_panel_amps": 100,
  "proposed_panel_amps": 200,
  "rapid_shutdown_included": true,      // NEC 2017+ requirement

  // Interconnection & Net Metering
  "interconnection_included": true,
  "interconnection_detail": "Company handles utility interconnection application",
  "net_metering_eligible": true,
  "net_metering_detail": "1:1 net metering available with current utility",

  // Battery (if applicable)
  "battery_included": true,
  "battery_brand": "Tesla",
  "battery_model": "Powerwall 3",
  "battery_capacity_kwh": 13.5,
  "battery_count": 1,
  "backup_circuits": 4,                // number of circuits backed up
  "whole_home_backup": false,

  // Monitoring
  "monitoring_included": true,
  "monitoring_type": "app",             // app | web | display | none
  "monitoring_detail": "Tesla app with real-time production and consumption",

  // Permits & Compliance
  "structural_engineering": null,       // roof load calculation for panels
  "hoa_approval_included": null,
  "design_review_included": true
}
```

---

## 3. Equipment Types

| equipment_type | Example | Efficiency Metrics |
|---------------|---------|-------------------|
| `solar_panel` | REC Alpha Pure-R 400W | `{"efficiency_pct": 21.5, "temp_coefficient": -0.26, "degradation_rate": 0.25}` |
| `inverter` | Enphase IQ8+ | `{"type": "microinverter", "efficiency_pct": 97.5, "monitoring": true}` |
| `battery` | Tesla Powerwall 3 | `{"capacity_kwh": 13.5, "power_output_kw": 11.5, "round_trip_efficiency": 0.90}` |
| `optimizer` | SolarEdge P505 | `{"type": "power_optimizer"}` |

---

## 4. Safety-Critical Fields

### Roof Structural Assessment
Solar panels add ~2-4 lbs/sqft. Older roofs may not handle the load.
**Rule**: If `structural_engineering = null` → HIGH priority question

### Panel Upgrade
Solar systems often require 200A panel service.
**Rule**: If `panel_upgrade_included = null` → HIGH priority question

### Rapid Shutdown
NEC 2017+ requires rapid shutdown for firefighter safety.
**Rule**: If `rapid_shutdown_included = null` → HIGH priority question

### Roof Warranty
Panel mounting may void roof warranty.
**Rule**: If `roof_warranty_maintained = null` → medium priority question

---

## 5. Comparison Normalization

| Metric | Normalization | Notes |
|--------|--------------|-------|
| Total cost | Direct comparison | Before incentives vs after |
| Cost per watt | total_bid_amount / (system_size_kw × 1000) | Industry standard: $2.50-4.00/W |
| System size | kW DC | Directly comparable |
| Estimated production | kWh/year | Affected by roof orientation, shading |
| Panel efficiency | % | Higher = more power per sqft |
| Inverter type | Micro vs string vs optimizer | Narrative comparison of tradeoffs |
| Battery capacity | kWh | If applicable |
| Payback period | Years | Estimated from production + utility rate |
| 25-year savings | $ | Production × utility rate × 25 - system cost |
