# Category Spec: Roofing

> "You've got a roofing specialist"
>
> Phase 3 category.
> Covers: shingle, metal, tile, flat, slate, cedar

---

## 1. System Types

| system_type | Description | Typical Lifespan |
|-------------|-------------|-----------------|
| `shingle_asphalt` | Asphalt/architectural shingles | 20-30 years |
| `metal_standing_seam` | Standing seam metal panels | 40-70 years |
| `metal_corrugated` | Corrugated/ribbed metal | 30-50 years |
| `tile_clay` | Clay tile | 50-100 years |
| `tile_concrete` | Concrete tile | 30-50 years |
| `slate` | Natural slate | 75-150 years |
| `cedar_shake` | Cedar shake/shingle | 20-40 years |
| `flat_tpo` | TPO membrane (flat roof) | 15-25 years |
| `flat_epdm` | EPDM rubber (flat roof) | 20-30 years |
| `flat_modified_bitumen` | Modified bitumen (flat roof) | 15-20 years |

---

## 2. Category Attributes JSON Schema

```jsonc
{
  "system_type": "shingle_asphalt",
  "material_brand": "GAF",
  "material_line": "Timberline HDZ",
  "material_color": "Charcoal",

  // Scope
  "scope_type": "full_replacement",     // full_replacement | partial_repair | overlay | re_roof
  "square_footage": 2400,
  "squares": 24,                        // roofing squares (1 square = 100 sq ft)

  // Tear-off
  "tear_off_included": true,
  "tear_off_layers": 1,                 // number of existing layers to remove
  "tear_off_detail": "Remove one layer of existing asphalt shingles",

  // Underlayment & Protection
  "underlayment_type": "synthetic",     // felt | synthetic | self_adhering
  "underlayment_detail": "Synthetic underlayment over entire deck",
  "ice_water_shield_included": true,
  "ice_water_shield_detail": "Ice and water shield on eaves and valleys (6 ft from edge)",

  // Ventilation
  "ridge_vent_included": true,
  "ridge_vent_detail": "New ridge vent full length of ridge",
  "soffit_vent_included": null,
  "soffit_vent_detail": null,
  "ventilation_detail": "Balanced intake and exhaust ventilation",

  // Flashing
  "flashing_included": true,
  "flashing_detail": "Replace all step, counter, and valley flashing with aluminum",
  "chimney_flashing_included": true,
  "chimney_flashing_detail": "New lead chimney flashing and counter flashing",
  "pipe_boot_included": true,

  // Additional scope
  "gutter_included": false,
  "gutter_detail": "Gutters not included in this proposal",
  "fascia_included": null,
  "fascia_detail": null,
  "drip_edge_included": true,
  "drip_edge_detail": "New aluminum drip edge on all eaves and rakes",

  // Structural
  "structural_inspection": null,         // null = question trigger
  "decking_repair_included": null,       // null = question trigger
  "decking_detail": null,
  "decking_repair_cost_per_sheet": null  // cost if repair needed (from bid only)
}
```

---

## 3. Equipment / Materials

Roofing is material-focused rather than equipment-focused. Equipment rows represent the primary roofing material:

| equipment_type | Example | Efficiency Metrics |
|---------------|---------|-------------------|
| `roofing_material` | GAF Timberline HDZ | `{"wind_rating_mph": 130, "algae_resistance": true, "impact_rating": "Class 4"}` |
| `underlayment` | Synthetic underlayment | `{}` |

---

## 4. Safety-Critical Fields

### Structural Inspection
**Rule**: If `structural_inspection = null` → HIGH priority question: "Will the roof deck be inspected for damage before new materials are installed?"

### Decking Condition
If `decking_repair_included = null` → HIGH priority question: "What happens if rotted or damaged decking is found during tear-off? What's the cost per sheet for replacement?"

### Asbestos (pre-1980 homes)
If `home_year_built < 1980 AND tear_off_included = true` → HIGH priority question about asbestos testing for existing roofing materials.

---

## 5. Comparison Normalization

| Metric | Normalization |
|--------|--------------|
| Total cost | Direct comparison |
| Cost per square | total_bid_amount / squares — enables fair comparison across different roof sizes |
| Material lifespan | Years — critical for long-term value |
| Wind rating | MPH — higher is better |
| Warranty | Manufacturer + workmanship (separate) |
| Tear-off scope | Full vs partial vs overlay affects long-term quality |
