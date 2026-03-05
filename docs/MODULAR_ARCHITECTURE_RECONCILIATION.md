# Modular Architecture Proposal — Reconciliation with MindPal Lessons

> Analysis of the proposed BidSmart rebuild architecture against hard-won lessons
> from the MindPal v18 workflow (11-12 agents, ~3-5 min per job).
>
> Date: 2026-03-05

---

## Executive Summary

The proposed modular architecture (Unstructured.io + specialized agents + layered data model) is a significant improvement over the MindPal workflow. The element-level document parsing unlocks capabilities that were impossible with MindPal's flat markdown approach — particularly multi-configuration bid detection.

However, the proposal underspecifies several areas where months of MindPal iteration produced critical domain knowledge. This document identifies what must carry forward.

---

## 1. Bid Type Identification (Heat Pump Gate)

### What MindPal Taught Us

- `is_heat_pump: boolean` is a **non-negotiable safety field** on every bid
- A Gate Node was designed (never fully deployed in v18) to halt processing before expensive agent calls on non-heat-pump bids
- System type is an enum, not binary: `heat_pump | gas_furnace | central_ac | mini_split | hybrid | boiler | other`
- **Hybrid systems** (heat pump + gas furnace backup) are valid heat pump projects and must NOT be rejected
- Without a gate, gas furnace bids get deep-analyzed alongside heat pumps → invalid recommendations

### What the Proposal Misses

- No bid type validation gate. The "Bid QA Agent" checks extraction quality but doesn't gate on system type.
- The canonical schema example includes `equipment.type` but not `is_heat_pump` or `system_type` at the bid level.
- No stop-before-enrichment concept — all bids flow through all agents regardless of type.

### Recommendation

Add an explicit **Classification + Gate step** between Unstructured parsing and canonical extraction:

```
Unstructured Parsing → Classification Agent → [GATE] → Canonical Extraction → ...
```

This agent should:
- Run before any expensive calls (equipment research, contractor research)
- Classify `system_type` from parsed elements (tables + narrative text are sufficient)
- Set `is_heat_pump: boolean`
- Halt processing with a user-facing message if bid is not a heat pump project
- Handle hybrid edge case: heat pump + furnace backup = valid, proceed
- Cost: minimal (small context, simple classification task)

---

## 2. Equipment Identification & AHRI Matching

### What MindPal Taught Us

- Equipment extraction is a **multi-row problem** per bid:
  - Heat pump bid → 1 `heat_pump` (primary_both) + 1 `air_handler` (air_distribution) = 2 rows
  - Furnace+AC → 1 `condenser` + 1 `furnace` + 1 `air_handler` = 3 rows
  - Hybrid → 1 `heat_pump` + 1 `furnace` (secondary) + 1 `air_handler` = 3 rows
- `equipment_type` → `system_role` mapping is **deterministic** (never guessed)
- Brand normalization matters for AHRI lookups ("Lenox" → "Lennox", "Traine" → "Trane")
- SEER2/HSPF2 (2023+ DOE standard) preferred over legacy SEER/HSPF — bids often cite the old standard
- Equipment cost is **NEVER researched**, only extracted from the bid document
- Thermostats, line sets, surge protectors are **accessories** (JSONB array in bid_scope), NOT equipment — this was a frequent early error
- Anti-hallucination rules are critical: never fabricate specs, never use "typical" values, null > guess
- Confidence uses enums (high/medium/low), not numeric scores

### What the Proposal Underspecifies

| Gap | Impact |
|-----|--------|
| Flat equipment schema (one entry per bid) | Real bids produce multiple equipment rows |
| No AHRI directory as authoritative source | Missing the primary spec verification mechanism |
| No SEER vs SEER2 distinction | Data quality issues when bids cite old standards |
| No anti-hallucination rules | Agents will fabricate specs without explicit guardrails |
| No equipment cost boundary | Agents may research pricing instead of only extracting from bid |

### Recommendation

The canonical bid schema's `equipment` section should be an **array** matching the proven 31-column `bid_equipment` schema:

```yaml
equipment:
  - equipment_type: heat_pump      # enum, not free text
    system_role: primary_both      # deterministic from type
    brand: "Carrier"               # normalized spelling
    model_number: "24VNA036A003"   # full alphanumeric
    capacity_tons: 3.0
    capacity_btu: 36000            # always = tons × 12,000
    seer2_rating: 20.5             # preferred (2023+ standard)
    hspf2_rating: 10.0             # preferred
    seer_rating: 22.0              # legacy, keep if provided
    hspf_rating: 10.5              # legacy
    refrigerant_type: "R-410A"
    variable_speed: true
    stages: null                   # null when variable_speed=true, NEVER 0
    voltage: 240
    minimum_circuit_amperage: 30   # safety-critical for panel assessment
    equipment_cost: null           # ONLY from bid, never researched
    confidence: "high"             # enum, not numeric
```

Equipment Research agent prompt must include:
- Source priority: manufacturer spec sheets → AHRI directory → Energy Star → retailer fallback
- Anti-hallucination rules: "NEVER fabricate specs, NEVER use AI training data, null is always better"
- Boundary: "research specs only, NEVER research or estimate pricing"

---

## 3. Multi-Configuration Parsing — The Biggest Opportunity

### What MindPal Taught Us

This is the **single most common source of incomplete extractions**. Real-world findings:

- Many contractors submit 2-3 options in a single PDF: "Option A: 3-ton for $18.5k, Option B: 4-ton for $22k"
- MindPal's workaround: pick ONE configuration, note alternatives in `extraction_notes`
- `bid_configurations` table with `config_index` and `config_label` was planned but **never implemented**
- The Question Generator has `bid_index` routing that hints at multi-config support but was never fully realized
- This gap means homeowners comparing bids may not see all their options

### What the Proposal Misses

- Canonical schema assumes one configuration per document
- No `config_index`, `config_label`, or multi-option handling
- Bid QA Agent doesn't check for unextracted configurations

### Where the New Architecture Has a Real Advantage

**Unstructured.io's element-level parsing gives you something MindPal never had: structural awareness of the document.**

Table elements and section headers are natural configuration boundaries. You can detect:
- Section headers: "Option A", "Option B", "System 1", "System 2", "Good/Better/Best"
- Multiple pricing tables in one document
- Repeated equipment specification blocks

### Recommended Approach

Add a **Configuration Detection step** after Unstructured parsing:

```
Unstructured Parsing
  → Configuration Detector (analyzes elements for multi-option patterns)
    → Creates bid_configurations records:
        config_index=0, config_label="Option A: Carrier 3-ton Heat Pump"
        config_index=1, config_label="Option B: Carrier 4-ton Heat Pump"
        config_index=2, config_label="Option C: Lennox Furnace+AC" (flagged: not heat pump)
  → Downstream extraction runs PER CONFIGURATION, not per document
```

**Schema impact**: Every downstream table should FK to `bid_configurations`, not directly to `bids`:

```
bids (1) → bid_configurations (N) → bid_scope (1:1 per config)
                                   → bid_equipment (1:N per config)
                                   → contractor_questions (1:N per config)
```

This is the **single biggest improvement opportunity** in the rebuild. Element-level parsing makes it feasible where MindPal's flat markdown made it nearly impossible.

---

## 4. Broader Architectural Concerns

### 4a. Preserve the 69-Column Scope Schema

The proposal's canonical schema is much simpler than what's been battle-tested. The 69-column `bid_scope` represents months of iteration:

- **12 boolean+detail pairs** (permit, disposal, electrical, ductwork, thermostat, manual_j, commissioning, air_handler, line_set, disconnect, pad, drain_line)
- **10 electrical safety fields** (panel assessment, upgrade, dedicated circuit, electrical permit, load calculation, existing/proposed panel amps, breaker size, panel upgrade cost, notes)
- **10 pricing fields** (total, labor, equipment, materials, permit, disposal, electrical, before rebates, rebates, after rebates)
- **5 payment terms** (deposit required, percentage, schedule, financing offered, terms)
- **4 warranty fields** (labor, equipment, compressor, additional details)
- **4 timeline fields** (estimated days, start date, bid date, valid until)
- **2 JSONB arrays** (accessories, line items)

**Do not simplify this.** Start from this schema, not a minimal version.

### 4b. Three-State Boolean Logic

The proposal doesn't mention this. In MindPal, this distinction was critical:

| Value | Meaning | Action |
|-------|---------|--------|
| `true` | Explicitly included in bid | Display as included |
| `false` | Explicitly excluded by contractor | Display as excluded |
| `null` | Not mentioned in bid | **Trigger clarification question** |

`null ≠ false`. This drives the Question Generator: missing information prompts questions, excluded items don't.

### 4c. Electrical Panel Data is Safety-Critical

The proposal has no dedicated electrical section. Heat pumps require 240V service; many homes need panel upgrades. MindPal's 10 electrical fields + "always generate HIGH priority question if missing" rule is non-negotiable.

If `panel_assessment_included = null` → automatic HIGH priority question, every time, no exceptions.

### 4d. Question Generator Complexity

The proposal lists a simple "Questions Generator Agent." MindPal's v8 Question Generator (the most refined node) had:

- **4-tier priority system**: critical, high, medium, low
- **8 question categories**: pricing, scope, equipment, warranty, timeline, electrical, contractor, system_comparison
- **Per-question fields**: `good_answer_looks_like`, `concerning_answer_looks_like`, `triggered_by`, `missing_field`
- **Per-bid summary**: `questions_summary` array with counts and `main_concerns`
- **Electrical as always-high-priority** when missing
- **system_comparison** category for multi-config bids

This level of detail is what makes the output actionable for homeowners. Don't regress to generic questions.

### 4e. Idempotency Strategy

The proposal doesn't mention upsert keys or re-run safety. Each table needs defined keys:

| Table | Upsert Key | Strategy |
|-------|-----------|----------|
| `bid_scope` | `bid_id` (1:1) | UPSERT on bid_id |
| `bid_equipment` | `bid_id` + `equipment_type` + `model_number` (1:N) | DELETE + INSERT on bid_id |
| `bid_contractors` | `bid_id` (1:1) | UPSERT on bid_id |
| `contractor_questions` | `bid_id` + `question_category` + `question_text` | DELETE + INSERT on bid_id |

### 4f. Confidence Scoring at Every Layer

The proposal mentions `extraction_confidence` once. MindPal has confidence at every layer:
- Per equipment row
- Per scope extraction
- Per question generated
- Per contractor research result

Granular confidence matters for the QA Agent and for showing users which parts of the comparison are solid vs uncertain.

### 4g. Unstructured.io is Not a Silver Bullet

Contractor bids are messy: scanned PDFs, hand-written notes, email screenshots, photos of printed proposals. `hi_res` strategy helps but won't solve everything. The same "null is better than a guess" philosophy must apply to element parsing failures.

---

## 5. Proposed Revised Pipeline

Incorporating MindPal lessons into the new architecture:

```
Step 1: Upload & Store
  User uploads 1-3 bid documents → Supabase Storage

Step 2: Document Parsing
  Unstructured.io (hi_res, by_title, infer_table_structure)
  → bid_elements table (typed elements with metadata)

Step 3: Classification + Gate                          ← NEW
  Lightweight agent classifies system_type per bid
  Sets is_heat_pump boolean
  HALTS if any bid is not a heat pump project
  (hybrid = valid, proceed)

Step 4: Configuration Detection                        ← NEW
  Analyzes parsed elements for multi-option patterns
  Creates bid_configurations records (config_index, config_label)
  Single-config bids get one record (config_index=0)

Step 5: Canonical Extraction (per configuration)
  Uses 69-column bid_scope schema
  Three-state booleans (true/false/null)
  10 electrical safety fields
  Accessories in JSONB, not equipment table

Step 6: Equipment Research (per configuration)
  Multi-row output per config
  AHRI directory as authoritative source
  Anti-hallucination rules enforced
  Never researches pricing

Step 7: Contractor Research (per bid, on-demand)
  BBB, licensing, reviews
  1:1 per bid (not per configuration)

Step 8: Bid QA Agent
  Checks extraction completeness
  Validates is_heat_pump consistency
  Flags missing configurations
  Reports per-config confidence

Step 9: Comparison Agent (cross-configuration)
  Compares ALL configurations across ALL bids
  Normalizes costs, equipment, scope
  Produces structured comparison JSON

Step 10: Question Generator
  4-tier priority system, 8 categories
  good_answer_looks_like / concerning_answer_looks_like
  Electrical always HIGH priority when missing
  system_comparison category for multi-config
  Per-bid questions_summary

Step 11: Recommendation Agent
  Best value, lowest risk, best performance
  Reasoning tied to user priorities
  References specific configurations

Step 12: Chat Assistant
  Context: canonical schema + relevant chunks + agent outputs
  Element-level references for page/section citations
```

---

## 6. What to Carry Forward — Summary

| Lesson | Source | Apply To |
|--------|--------|----------|
| `is_heat_pump` gate before expensive agents | MindPal safety rules | Classification + Gate step |
| 69-column bid_scope schema | Scope Extractor v2 | Canonical extraction |
| Three-state booleans (true/false/null) | Field extraction rules | All extraction agents |
| Multi-row equipment per bid | bid_equipment schema | Equipment extraction |
| AHRI as authoritative spec source | Equipment Researcher | Equipment Research agent |
| SEER2/HSPF2 preferred over legacy | Equipment Researcher | Efficiency rating rules |
| Anti-hallucination rules | All MindPal node specs | All agent prompts |
| Accessory vs equipment boundary | Learned from repeated errors | Extraction rules |
| 10 electrical safety fields | bid_scope | Scope extraction |
| Electrical = HIGH priority when missing | Question Generator v8 | Questions agent |
| 4-tier priority + 8 categories | Question Generator v8 | Questions agent |
| Idempotent upsert keys per table | MindPal re-run testing | All DB writes |
| Confidence enums per output | All nodes | All agent outputs |
| Equipment cost NEVER researched | Equipment Researcher | Agent prompt boundary |
| Brand normalization for AHRI lookup | Equipment Researcher | Equipment Research agent |
| **Multi-config detection via elements** | **NEW capability** | **Configuration Detection step** |
| **Element-level document references** | **NEW capability** | **Chat assistant** |

---

## 7. Key Risks in the Rebuild

1. **Schema regression** — Starting with a simpler canonical schema than what exists is tempting but dangerous. The 69-column scope, 31-column equipment, and 4-tier question schemas represent real-world iteration. Begin from these.

2. **Unstructured.io table parsing quality** — Table extraction is critical for pricing and scope. Test with real contractor bids early; don't assume clean output.

3. **Multi-config complexity** — This is the most ambitious new feature. Consider shipping MVP with single-config support (matching MindPal's current capability) and adding multi-config as a fast-follow.

4. **Agent cost control** — The proposal separates "always run" from "on-demand" agents, which is good. But the new Configuration Detection and Classification Gate steps add two more always-run steps. Keep them lightweight.

5. **Migration from MindPal** — If the rebuild runs in parallel with MindPal during transition, both systems writing to the same Supabase tables will conflict. Plan for schema versioning or separate environments.
