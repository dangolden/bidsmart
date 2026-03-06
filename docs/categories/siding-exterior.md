# Category Spec: Siding & Exterior

> "You've got an exterior specialist"
>
> Phase 4 category.
> Covers: vinyl, fiber cement, wood, metal, stucco, stone veneer

---

## 1. System Types

| system_type | Description | Typical Lifespan |
|-------------|-------------|-----------------|
| `vinyl` | Vinyl siding | 20-40 years |
| `fiber_cement` | Fiber cement (HardiePlank, etc.) | 30-50 years |
| `wood_clapboard` | Wood clapboard/lap | 20-40 years (with maintenance) |
| `wood_shingle` | Cedar shingle siding | 20-30 years |
| `metal` | Aluminum or steel siding | 40-60 years |
| `stucco` | Traditional or synthetic stucco | 50-80 years |
| `stone_veneer` | Natural or manufactured stone | 50+ years |
| `composite` | Engineered wood (LP SmartSide, etc.) | 25-40 years |

---

## 2. Category Attributes JSON Schema

```jsonc
{
  "system_type": "fiber_cement",
  "material_brand": "James Hardie",
  "material_line": "HardiePlank",
  "material_style": "lap",              // lap | panel | shingle | board_and_batten | shake
  "color_finish": "factory_primed",     // factory_painted | factory_primed | unfinished
  "painting_included": true,
  "painting_detail": "Two coats exterior latex, color of choice",

  // Coverage
  "total_sqft": 2200,
  "stories": 2,

  // Existing siding
  "removal_included": true,
  "removal_detail": "Remove existing vinyl siding and dispose",
  "removal_layers": 1,

  // Underlayment & protection
  "housewrap_included": true,
  "housewrap_detail": "New Tyvek housewrap over entire surface",
  "moisture_barrier_included": true,     // null = question trigger
  "moisture_barrier_detail": "Tyvek DrainWrap with drainage plane",
  "foam_board_included": false,
  "foam_board_detail": null,
  "r_value_added": null,

  // Trim & details
  "trim_included": true,
  "trim_detail": "All window and door trim replaced with HardieTrim",
  "soffit_included": true,
  "soffit_detail": "New vented soffit panels",
  "fascia_included": true,
  "fascia_detail": "New aluminum fascia wrap",
  "corner_posts_included": true,

  // Structural
  "sheathing_inspection": null,         // inspect structural sheathing under old siding
  "sheathing_repair_included": null,
  "structural_detail": null
}
```

---

## 3. Safety-Critical Fields

### Moisture Barrier
Siding without proper moisture management leads to rot and mold.
**Rule**: If `moisture_barrier_included = null` → HIGH priority question

### Structural Sheathing
Old siding may hide rotted sheathing.
**Rule**: If `sheathing_inspection = null` → HIGH priority question: "Will the structural sheathing be inspected after old siding removal? What happens if damage is found?"

### Lead Paint (Pre-1978)
If `home_year_built < 1978 AND removal_included = true` → HIGH priority question about EPA RRP-certified lead-safe practices.

---

## 4. Comparison Normalization

| Metric | Normalization |
|--------|--------------|
| Total cost | Direct comparison |
| Cost per sqft | total_bid_amount / total_sqft |
| Material lifespan | Years — long-term value |
| Maintenance requirements | Narrative (vinyl=low, wood=high, fiber cement=medium) |
| Energy improvement | R-value added (if foam board underlayment included) |
| Completeness | Trim, soffit, fascia scope |
