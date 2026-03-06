# Category Spec: Insulation

> "You've got an insulation specialist"
>
> Phase 4 category.
> Covers: blown-in, spray foam, batt, rigid board, air sealing

---

## 1. System Types

| system_type | Description |
|-------------|-------------|
| `blown_in_cellulose` | Blown-in cellulose (attic, walls) |
| `blown_in_fiberglass` | Blown-in fiberglass (attic, walls) |
| `spray_foam_open` | Open-cell spray foam |
| `spray_foam_closed` | Closed-cell spray foam |
| `batt_fiberglass` | Fiberglass batt insulation |
| `batt_mineral_wool` | Mineral wool / Rockwool batt |
| `rigid_board` | Rigid foam board (XPS, EPS, polyiso) |
| `air_sealing_only` | Air sealing without insulation |

---

## 2. Category Attributes JSON Schema

```jsonc
{
  "system_type": "spray_foam_closed",

  // Coverage
  "areas_covered": ["attic", "crawlspace"],  // attic | walls | crawlspace | basement | rim_joist | garage
  "total_sqft": 1200,
  "thickness_inches": 3,

  // Performance
  "r_value_per_inch": 6.5,
  "total_r_value": 19.5,
  "existing_r_value": null,              // current insulation R-value (if assessed)
  "existing_insulation_removal": false,
  "existing_insulation_detail": "Existing insulation left in place",

  // Air sealing
  "air_sealing_included": true,
  "air_sealing_detail": "Seal all penetrations, top plates, can lights, and plumbing stacks",
  "blower_door_test_included": null,     // pre/post test to verify improvement
  "blower_door_detail": null,

  // Moisture & ventilation
  "vapor_barrier_included": true,
  "vapor_barrier_detail": "6-mil poly vapor barrier on crawlspace floor",
  "moisture_assessment": null,           // null = question trigger
  "ventilation_maintained": null,        // critical: spray foam can change ventilation needs
  "ventilation_detail": null,

  // Safety
  "fire_rating": null,                   // some foam requires thermal barrier
  "thermal_barrier_included": null,      // required over exposed spray foam in living spaces
  "pest_treatment_included": null        // sometimes needed before insulation
}
```

---

## 3. Safety-Critical Fields

### Moisture Assessment
Insulation traps moisture if installed incorrectly. Especially critical in crawlspaces and basements.
**Rule**: If `moisture_assessment = null` → HIGH priority question

### Ventilation Changes
Spray foam in attics changes ventilation requirements (unvented vs vented attic).
**Rule**: If system_type starts with `spray_foam` AND `ventilation_maintained = null` → HIGH priority question

### Fire Rating / Thermal Barrier
Exposed spray foam in living spaces requires a thermal barrier (typically 1/2" drywall).
**Rule**: If system_type starts with `spray_foam` AND `thermal_barrier_included = null` → medium priority question

---

## 4. Comparison Normalization

| Metric | Normalization |
|--------|--------------|
| Total cost | Direct comparison |
| Cost per sqft | total_bid_amount / total_sqft |
| R-value achieved | Total R-value — higher is better |
| Cost per R-value per sqft | Efficiency of spend |
| Air sealing scope | Completeness of air barrier |
| Moisture management | Vapor barrier + assessment completeness |
