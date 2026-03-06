# Category Spec: Plumbing

> "You've got a plumbing specialist"
>
> Phase 4 category.
> Covers: repipe, sewer line, water main, fixture replacement, gas line

---

## 1. System Types

| system_type | Description |
|-------------|-------------|
| `whole_house_repipe` | Replace all water supply pipes |
| `partial_repipe` | Replace specific sections |
| `sewer_line_replacement` | Main sewer line to street |
| `sewer_line_repair` | Spot repair or lining |
| `water_main_replacement` | Water service line from meter to house |
| `gas_line` | Gas line installation or replacement |
| `fixture_package` | Multiple fixture replacements |
| `drain_line` | Interior drain/waste line replacement |

---

## 2. Category Attributes JSON Schema

```jsonc
{
  "system_type": "whole_house_repipe",

  // Pipe specs
  "pipe_material": "pex",              // pex | copper | cpvc | pex_a | pex_b
  "existing_pipe_material": "galvanized", // galvanized | copper | polybutylene | lead | cpvc
  "pipe_diameter_main": "3/4 inch",
  "pipe_diameter_branch": "1/2 inch",
  "linear_footage": 350,

  // Scope
  "fixture_count": 14,                 // number of fixtures being connected
  "access_method": "open_wall",        // open_wall | attic_run | crawlspace | slab_tunnel | trenchless
  "wall_repair_included": true,
  "wall_repair_detail": "Patch and paint all access points",
  "ceiling_repair_included": true,
  "ceiling_repair_detail": "Patch drywall at all ceiling access points",

  // Sewer-specific
  "camera_inspection_included": null,   // pre-work camera inspection
  "camera_inspection_detail": null,
  "trenchless_method": null,            // pipe_bursting | pipe_lining | null (traditional dig)
  "cleanout_included": null,
  "cleanout_detail": null,
  "lateral_length_ft": null,

  // Water main-specific
  "meter_to_house_ft": null,
  "landscaping_repair_included": null,
  "landscaping_detail": null,
  "sidewalk_repair_included": null,

  // Testing
  "pressure_test_included": null,
  "pressure_test_detail": null,
  "water_quality_test": null,

  // Safety
  "lead_pipe_abatement": null,         // if existing pipes are lead
  "asbestos_pipe_insulation": null,    // if existing pipes have asbestos insulation
  "backflow_preventer_included": null
}
```

---

## 3. Safety-Critical Fields

### Camera Inspection (Sewer)
**Rule**: If system_type starts with `sewer` AND `camera_inspection_included = null` → HIGH priority question: "Will a camera inspection be performed before and after work to verify condition?"

### Lead Pipes
If `existing_pipe_material = 'lead'` → CRITICAL priority note about lead abatement requirements.

### Permit
All plumbing work requires permits in most jurisdictions.
**Rule**: If `permit_included = null` → HIGH priority question

### Pressure Testing
**Rule**: If `pressure_test_included = null` → medium priority question about post-work verification.

---

## 4. Comparison Normalization

| Metric | Normalization |
|--------|--------------|
| Total cost | Direct comparison |
| Cost per fixture (repipe) | total_bid_amount / fixture_count |
| Cost per linear foot (sewer/water main) | total_bid_amount / linear_footage |
| Pipe material quality | Narrative (PEX-A > PEX-B > CPVC for flexibility/durability) |
| Wall/ceiling repair scope | Completeness of restoration |
| Inspection scope | Camera, pressure test, water quality |
