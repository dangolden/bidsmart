# Category Spec: Windows & Doors

> "You've got a window pro"
>
> Phase 3 category.
> Covers: replacement windows, new construction, storm windows, entry doors

---

## 1. System Types

| system_type | Description |
|-------------|-------------|
| `replacement_insert` | Insert replacement into existing frame |
| `replacement_full_frame` | Full frame replacement (remove to studs) |
| `new_construction` | New window openings |
| `storm_windows` | Exterior storm window overlay |
| `entry_door` | Front/back door replacement |
| `patio_door` | Sliding or French patio doors |

---

## 2. Category Attributes JSON Schema

```jsonc
{
  "system_type": "replacement_full_frame",

  // Window specifications
  "window_type": "double_hung",         // double_hung | casement | sliding | picture | bay | awning | fixed
  "frame_material": "vinyl",            // vinyl | wood | fiberglass | aluminum | composite | clad_wood
  "glass_type": "double_pane",          // single_pane | double_pane | triple_pane
  "low_e_coating": true,
  "argon_filled": true,
  "spacer_type": "warm_edge",           // warm_edge | aluminum | stainless
  "grid_pattern": "none",               // none | colonial | prairie | custom

  // Performance ratings
  "u_factor": 0.28,                     // lower is better (insulation)
  "shgc": 0.25,                         // Solar Heat Gain Coefficient
  "visible_transmittance": 0.44,
  "air_leakage": 0.15,                  // cfm/ft — lower is better
  "condensation_resistance": 60,         // 1-100, higher is better

  // Quantities
  "window_count": 12,
  "total_united_inches": 1440,          // sum of (width + height) for all windows
  "sizes_vary": true,                   // true if multiple sizes quoted

  // Installation scope
  "installation_type": "full_frame",    // full_frame | insert | new_construction
  "trim_included": true,
  "trim_detail": "Interior and exterior trim replacement included",
  "screen_included": true,
  "screen_type": "full",                // full | half | retractable | none
  "caulking_included": true,
  "insulation_around_frame": true,

  // Safety concerns
  "lead_paint_abatement": null,         // CRITICAL for pre-1978 homes
  "lead_paint_detail": null,
  "structural_modifications": false,
  "structural_detail": "No structural changes needed — same opening sizes",

  // Additional
  "hardware_upgrade": null,
  "hardware_detail": null,
  "egress_compliant": null,             // required for bedroom windows
  "historic_district_compliant": null   // restrictions on window style/material
}
```

---

## 3. Equipment / Window Products

Each window product gets an equipment row:

| equipment_type | Example | Efficiency Metrics |
|---------------|---------|-------------------|
| `window` | Andersen 400 Series | `{"u_factor": 0.28, "shgc": 0.25, "visible_transmittance": 0.44}` |
| `entry_door` | Therma-Tru Benchmark | `{"u_factor": 0.17, "shgc": 0.20}` |
| `patio_door` | Marvin Elevate | `{"u_factor": 0.27, "shgc": 0.23}` |

---

## 4. Safety-Critical Fields

### Lead Paint (Pre-1978 Homes)
**Rule**: If `home_year_built < 1978 AND lead_paint_abatement = null` → AUTO HIGH PRIORITY QUESTION

Federal law (EPA RRP Rule) requires certified lead-safe work practices for pre-1978 homes. Contractors must be EPA-certified. Non-compliance = federal violation.

Question: "This home was built before 1978. Does your bid include EPA-certified lead paint procedures? Are your workers RRP-certified?"

### Egress Compliance
Bedroom windows must meet egress requirements (minimum opening size for emergency exit).
If `egress_compliant = null` AND windows are in bedrooms → medium priority question.

### Structural Modifications
Changing window sizes requires structural headers.
If `structural_modifications = null` AND installation_type = 'new_construction' → high priority question.

---

## 5. Comparison Normalization

| Metric | Normalization |
|--------|--------------|
| Total cost | Direct comparison |
| Cost per window | total_bid_amount / window_count |
| Cost per united inch | total_bid_amount / total_united_inches (fairest comparison when sizes differ) |
| Energy performance | U-factor (lower = better insulation) |
| Solar performance | SHGC (lower = less heat gain; depends on climate whether lower is better) |
| Frame material | Durability comparison narrative (vinyl vs wood vs fiberglass) |
| Installation quality | Full frame vs insert (full frame typically better long-term) |
