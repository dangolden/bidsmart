# Category Spec: Foundation & Concrete

> "You've got a foundation specialist"
>
> Phase 4 category.
> Covers: foundation repair, waterproofing, slab work, piers, retaining walls

---

## 1. System Types

| system_type | Description |
|-------------|-------------|
| `foundation_repair_piers` | Underpinning with push piers or helical piers |
| `foundation_repair_mudjacking` | Slab lifting via mudjacking or polyurethane foam |
| `foundation_crack_repair` | Epoxy/urethane crack injection |
| `waterproofing_interior` | Interior drainage system + sump pump |
| `waterproofing_exterior` | Exterior excavation + membrane + drain tile |
| `slab_replacement` | Garage, patio, or driveway slab replacement |
| `retaining_wall` | New or rebuilt retaining wall |
| `crawlspace_encapsulation` | Vapor barrier + dehumidifier + drainage |

---

## 2. Category Attributes JSON Schema

```jsonc
{
  "system_type": "foundation_repair_piers",

  // Assessment
  "structural_assessment": null,         // null = AUTO HIGH PRIORITY QUESTION
  "structural_assessment_detail": null,
  "engineer_report_included": null,      // structural engineer evaluation
  "engineer_report_detail": null,
  "soil_conditions_assessed": null,

  // Repair scope
  "pier_count": 12,
  "pier_type": "push",                  // push | helical | drilled
  "pier_depth_ft": 25,
  "linear_footage": null,               // for crack repair or waterproofing
  "sqft_coverage": null,                // for slab or waterproofing

  // Waterproofing scope
  "drainage_system_included": null,
  "drainage_detail": null,
  "sump_pump_included": null,
  "sump_pump_detail": null,
  "vapor_barrier_included": null,
  "vapor_barrier_detail": null,
  "dehumidifier_included": null,
  "dehumidifier_detail": null,
  "excavation_required": null,
  "excavation_detail": null,

  // Restoration
  "landscaping_repair_included": null,
  "landscaping_detail": null,
  "concrete_repair_included": null,
  "concrete_detail": null,
  "drywall_repair_included": null,
  "drywall_detail": null,

  // Monitoring
  "monitoring_included": null,           // post-repair settlement monitoring
  "monitoring_duration": null,
  "transferable_warranty": null          // important for home sale
}
```

---

## 3. Safety-Critical Fields

### Structural Engineering Assessment
Foundation work without engineering assessment is a major risk.
**Rule**: If `structural_assessment = null` → AUTO HIGH PRIORITY QUESTION
**Rule**: If `engineer_report_included = null` → HIGH priority question: "Was a licensed structural engineer involved in the assessment and repair design?"

### Soil Conditions
Foundation repair depends on soil type and conditions.
**Rule**: If `soil_conditions_assessed = null` → medium priority question

### Warranty Transferability
Foundation warranties matter for home resale.
**Rule**: If `transferable_warranty = null` → medium priority question

---

## 4. Comparison Normalization

| Metric | Normalization |
|--------|--------------|
| Total cost | Direct comparison |
| Cost per pier | total_bid_amount / pier_count (for pier repair) |
| Cost per linear foot | For waterproofing or crack repair |
| Engineering scope | Was a structural engineer involved? |
| Warranty | Duration + transferability |
| Restoration completeness | Landscaping, concrete, drywall repair included? |
| Monitoring | Post-repair monitoring included? |
