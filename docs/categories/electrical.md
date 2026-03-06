# Category Spec: Electrical

> "You've got an electrical specialist"
>
> Phase 3 category.
> Covers: panel upgrades, EV charger installation, rewiring, generator install, sub-panel

---

## 1. System Types

| system_type | Description |
|-------------|-------------|
| `panel_upgrade` | Main electrical panel upgrade (100A→200A, 200A→400A) |
| `ev_charger` | Level 2 EV charger installation |
| `rewire` | Whole-house or partial rewiring |
| `generator` | Standby or portable generator install |
| `sub_panel` | Sub-panel addition (garage, workshop, addition) |
| `heavy_up` | Service entrance upgrade (new meter, weatherhead, service cable) |

---

## 2. Category Attributes JSON Schema

```jsonc
{
  "system_type": "panel_upgrade",

  // Panel specs
  "existing_panel_amps": 100,
  "proposed_panel_amps": 200,
  "existing_panel_brand": "Federal Pacific",  // some brands are safety hazards
  "proposed_panel_brand": "Square D",
  "circuit_spaces": 40,
  "tandem_breakers_allowed": true,

  // Service entrance
  "service_entrance_upgrade": true,
  "service_entrance_detail": "New 200A service entrance, meter base, and weatherhead",
  "utility_coordination_included": true,
  "utility_coordination_detail": "Coordinate with utility for meter disconnect/reconnect",

  // Scope
  "permit_type": "electrical",           // electrical | building | both
  "inspection_included": true,
  "inspection_detail": "Final electrical inspection by city inspector",
  "code_compliance": true,              // bringing existing work up to current code?
  "code_compliance_detail": "All existing wiring inspected and brought to current NEC",
  "grounding_included": true,
  "grounding_detail": "New grounding electrode system per NEC",
  "surge_protection_included": null,
  "surge_protection_detail": null,

  // EV-specific (if applicable)
  "ev_charger_brand": null,
  "ev_charger_model": null,
  "ev_charger_amperage": null,
  "ev_circuit_length_ft": null,

  // Generator-specific (if applicable)
  "generator_fuel_type": null,          // natural_gas | propane | diesel | dual_fuel
  "transfer_switch_included": null,
  "transfer_switch_type": null,         // manual | automatic
  "whole_home_backup": null,
  "circuits_backed_up": null
}
```

---

## 3. Safety-Critical Fields

### Hazardous Panel Brands
Certain panel brands are known fire hazards.
**Rule**: If `existing_panel_brand IN ('Federal Pacific', 'Zinsco', 'Pushmatic', 'Sylvania')` → generate CRITICAL priority note: "Your existing panel is a [brand], which has known safety issues. Replacement is strongly recommended regardless of other project needs."

### Permit & Inspection
**Rule**: If `permit_included = null` OR `inspection_included = null` → HIGH priority question. Unpermitted electrical work is a safety and insurance liability.

### Code Compliance
**Rule**: If `code_compliance = null` → medium priority question about whether existing wiring will be brought to current code.

---

## 4. Comparison Normalization

| Metric | Notes |
|--------|-------|
| Total cost | Direct comparison |
| Panel capacity | Amps — higher = more capacity for future loads |
| Circuit spaces | More = more flexibility |
| Scope completeness | How much is included (service entrance, grounding, surge protection) |
| Code compliance | Bringing existing up to code vs just the new work |
