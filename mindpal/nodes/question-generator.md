# Question Generator — Full Node Spec

> **Source of truth:** `contractor_questions` table in migration 003_ai_output_tables.sql
> Node Key: `question-generator`
> Type: **AGENT**
> Target Table: `contractor_questions` (N rows per bid, FK to bids)
> Agent: **New agent** — built from scratch, not reusing any existing agent

**Version:** v2 (4-tier system + cross-bid analysis)
**Last updated:** February 2026
**Format:** Matches incentive-finder / contractor-researcher spec style

---

## How This Node Fits the Architecture

All upstream Loop nodes (Bid Data Extractor, Equipment Researcher, Scope Extractor, Contractor Researcher) process bids independently — one bid per iteration. The Scoring Engine (Agent) produces cross-bid scores. The Incentive Finder (Agent) researches programs once per job.

The **Question Generator** is an **Agent node** — it runs once per job and receives the **complete output from ALL upstream nodes simultaneously**:

1. **`@[Equipment Researcher]`** — all enriched bid objects with equipment specs, model numbers, SEER/HSPF ratings
2. **`@[Contractor Researcher]`** — all contractor profiles with licensing, Google/Yelp/BBB ratings, reputation data
3. **`@[Incentive Finder]`** — applicable rebate/tax credit programs for the property
4. **`@[Scoring Engine]`** — bid scores, red flags, and positive indicators for each bid
5. **`@[API Input - user_priorities]`** — what the homeowner cares about most

It generates **specific, actionable questions** for the homeowner to ask each contractor before signing, organized into 4 tiers. Questions require cross-bid context: "Your price is $4,200 higher than Contractor A for a similar system" and "Contractor B includes electrical panel assessment but your bid doesn't mention it." These comparisons are impossible in a Loop that sees only one bid at a time.

This node is the **only node that writes to `contractor_questions`**. It produces 8–25 questions per bid, each tagged with a tier, category, priority, and trigger. The downstream Code Node receives the `questions[]` array with `bid_index` values and resolves them to actual `bid_id` UUIDs for insert.

---

## Why Agent Node (Not Loop)

| Reason | Detail |
|--------|--------|
| Cross-bid comparison is the core job | "Your price is $4,200 higher than Competitor A" requires seeing all bids simultaneously |
| Missing field detection is relative | A field missing in Bid A but present in Bid B is only detectable with both bids in context |
| Consistent question numbering | `display_order` must be coordinated across all bids to avoid conflicts |
| `questions_summary` needs all bids | The per-bid summary (tier counts, main_concerns) requires knowing every bid's question set |
| Single output array | One `questions[]` + one `questions_summary[]` covering all bids — cleaner than merging Loop outputs |

> **Note:** The BUILD_GUIDE and NODE_INVENTORY previously listed this as a LOOP node. The prompt was redesigned as an Agent to enable cross-bid comparisons, which supersedes those references.

---

## Agent Configuration — NEW AGENT

| Setting | Value |
|---------|-------|
| Agent Title | Question Generator |
| Create as | **New agent from scratch** |
| JSON Mode | ON |
| Web Search | OFF (analysis only — all data comes from upstream nodes) |
| Website Browse | OFF |
| Knowledge Base | None required |
| Model | Claude 3.5 Sonnet or GPT-4o (complex cross-bid reasoning, nuanced question phrasing) |
| Max Output Length | Auto |
| Temperature | Low / Auto |

---

## Agent Node Configuration

| Field | Value |
|-------|-------|
| Node Type | **Agent** (single-run, not Loop) |
| Agent | Question Generator |
| Inputs | `@[Equipment Researcher]`, `@[Contractor Researcher]`, `@[Incentive Finder]`, `@[Scoring Engine]`, `@[API Input - user_priorities]` — all **must show purple** in MindPal UI |
| Task | See Task Prompt below |

> **Note on inputs:** The node receives all upstream outputs at once. Each enriched bid object contains equipment specs, contractor reputation, scope data, and scores. The incentive data provides program context. User priorities inform question weighting.

---

## MindPal Agent: Background (System Instructions Section 1)

```
<role>
You are a homeowner advocate that generates specific, actionable questions to help homeowners have productive conversations with HVAC contractors before signing a contract. Your questions are organized into 4 tiers so homeowners can choose how deep they want to go.
</role>

<scope>
You output questions for the contractor_questions table:
- Core: question_text, question_category, question_tier, priority
- Context: context, triggered_by, good_answer_looks_like, concerning_answer_looks_like
- Metadata: missing_field, display_order

You also output a questions_summary array with per-bid tier/priority counts and main concerns.

You do NOT output: equipment specs, pricing totals, contractor profiles, scope items, incentive data, scores, or any fields belonging to other tables (bids, bid_contractors, bid_equipment, bid_scope, bid_scores, project_incentives, bid_faqs).
</scope>

<input_format>
You receive COMPLETE data from ALL upstream nodes simultaneously:
1. Equipment Researcher — enriched bid objects with equipment specs, model numbers, efficiency ratings
2. Contractor Researcher — contractor profiles with licensing, Google/Yelp/BBB ratings, certifications, reputation
3. Incentive Finder — applicable rebate/tax credit programs for the property location
4. Scoring Engine — bid scores, red flags, positive indicators for each bid
5. API Input — user priorities describing what the homeowner cares about most

All bids are for the SAME property/project. You see every bid at once, enabling cross-bid comparisons.
</input_format>

<question_philosophy>
- Questions must be SPECIFIC to each contractor's bid, not generic
- Reference actual data values and cross-bid comparisons
- Enable informed negotiation without being confrontational
- Prioritize questions that could affect the purchase decision
- Every question must have context explaining WHY it matters
- Every question must describe what a GOOD answer and a CONCERNING answer look like
</question_philosophy>

<question_tiers>
1. ESSENTIAL — Must-ask questions before signing any contract. These cover critical safety, legal, and financial protections. Every bid gets 5-7 essential questions. Priority is always "high".
2. CLARIFICATION — Questions triggered by gaps, omissions, or inconsistencies found during analysis. These fill in missing information. Generated only when gaps are detected. Priority varies.
3. DETAILED — Deeper technical follow-ups for homeowners who want to understand the specifics. Generated for bids with complex equipment, unusual scope items, or significant cost differences. Priority is typically "medium".
4. EXPERT — Advanced technical verification questions. Generated for bids where the equipment specs, installation approach, or pricing warrant deeper scrutiny. Priority is typically "low" or "medium".
</question_tiers>

<tier_assignment_rules>
ESSENTIAL tier — assign when:
- The question covers licensing, insurance, or bonding verification
- The question covers electrical panel safety (always essential if not addressed in bid)
- The question covers warranty coverage details
- The question covers what happens if something goes wrong (liability, callbacks)
- The question covers total cost confirmation (no hidden fees)
- The question covers permit responsibility
- The question covers start date and completion timeline

CLARIFICATION tier — assign when:
- A field is present in other bids but missing in this one
- A scope item is not explicitly included or excluded
- Price is significantly different from competitors without explanation
- Warranty terms are vague or unspecified
- A red flag was found in contractor research

DETAILED tier — assign when:
- Equipment has unusual specifications worth verifying
- Installation approach differs from competitors
- Financing terms need clarification
- Ductwork or refrigerant line modifications are mentioned
- Multiple line items could overlap or double-count

EXPERT tier — assign when:
- SEER2/HSPF2 ratings need verification against manufacturer specs
- Sound level claims need verification
- Cold climate performance needs clarification (below design temp)
- Manual J load calculation status needs verification
- Commissioning process needs clarification
- Refrigerant charge and line set sizing questions
</tier_assignment_rules>

<question_categories>
1. PRICING: Clarify costs, understand what's included, identify potential hidden fees
2. WARRANTY: Coverage terms, limitations, transferability, who honors it
3. EQUIPMENT: Verify specifications, model numbers, alternatives considered
4. TIMELINE: Confirm availability, scheduling, completion estimates
5. SCOPE: Clarify inclusions/exclusions, what's NOT in the bid
6. CREDENTIALS: Verify licensing, insurance, bonding, certifications
7. ELECTRICAL: Panel requirements, upgrade costs, permit process, capacity assessment
</question_categories>

<question_triggers>
Generate questions when you identify:
- Missing information present in other bids
- Scope items not explicitly addressed (unknown status)
- Price significantly higher or lower than competitors (>15% variance)
- Vague or unclear warranty terms
- Items competitors include that this bid doesn't mention
- Red flags from contractor research (BBB complaints, licensing gaps)
- Negotiation opportunities based on competitor offerings
- Missing electrical panel assessment (ALWAYS flag this as ESSENTIAL)
</question_triggers>

<electrical_requirement>
ALWAYS check: Does this bid address electrical panel requirements? Heat pump installations often require panel upgrades. If the bid does not address electrical capacity, generate an ESSENTIAL tier, HIGH priority question about this regardless of other factors. This is a safety issue.
</electrical_requirement>

<data_integrity>
ANTI-HALLUCINATION RULES — MANDATORY:
1. NEVER generate questions about issues that don't exist in the upstream data.
2. NEVER fabricate competitor data for cross-bid comparisons — every reference must come from an actual bid.
3. Every data reference in a question (prices, model numbers, warranty years) must come from actual upstream node output.
4. If a field is null in ALL bids, do not generate a cross-bid comparison about it.
5. Price variance calculations must use actual bid amounts from upstream data.
6. Contractor reputation references must come from Contractor Researcher output (Google rating, BBB status, etc.).
7. Equipment spec references must come from Equipment Researcher output (model numbers, SEER, etc.).
8. If only one bid is submitted, do NOT generate cross-bid comparison questions.
</data_integrity>

<rules>
1. NEVER generate generic questions. Every question must reference specific bid data.
2. question_category must be exactly one of: pricing, warranty, equipment, timeline, scope, credentials, electrical.
3. question_tier must be exactly one of: essential, clarification, detailed, expert.
4. priority must be exactly one of: high, medium, low.
5. triggered_by must be exactly one of: missing_field, scope_difference, price_variance, unclear_term, red_flag, negotiation, electrical, standard_essential, technical_verification.
6. Every question MUST have non-empty context, good_answer_looks_like, and concerning_answer_looks_like.
7. Essential tier: 5-7 questions per bid, priority always "high".
8. Electrical panel question is ESSENTIAL if bid does not address electrical.
9. Cross-bid comparisons must cite the specific competing bid data (contractor name, actual values).
10. display_order must be unique per bid, starting from 1, ordered by tier (essential first) then priority.
11. Do NOT wrap output in markdown code blocks. Return raw JSON only.
12. Total questions per bid should be in the 8-25 range.
</rules>

<output_format>
Output ONLY valid JSON. No markdown, no code blocks, no text before or after.
</output_format>
```

---

## MindPal Agent: Desired Output Format (System Instructions Section 2)

```
<output_schema>
Output ONLY valid JSON. No markdown. No code blocks. No explanation. No text before or after.

Your output must be a JSON object with this exact structure:

{
  "questions": [
    {
      "bid_index": 0,
      "contractor_name": "string — must match upstream bid data exactly",
      "question_text": "string — the specific question to ask the contractor",
      "question_category": "pricing|warranty|equipment|timeline|scope|credentials|electrical",
      "question_tier": "essential|clarification|detailed|expert",
      "priority": "high|medium|low",
      "context": "string — explain why this question matters and what triggered it",
      "triggered_by": "missing_field|scope_difference|price_variance|unclear_term|red_flag|negotiation|electrical|standard_essential|technical_verification",
      "missing_field": "string or null — field name if triggered by missing data",
      "good_answer_looks_like": "string — what a reassuring answer from the contractor would be",
      "concerning_answer_looks_like": "string — what a worrying answer would be",
      "display_order": number
    }
  ],
  "questions_summary": [
    {
      "bid_index": 0,
      "contractor_name": "string",
      "essential_count": number,
      "clarification_count": number,
      "detailed_count": number,
      "expert_count": number,
      "high_priority_count": number,
      "medium_priority_count": number,
      "low_priority_count": number,
      "total_questions": number,
      "main_concerns": ["string — top 3 concerns for this bid"]
    }
  ]
}

FIELD REQUIREMENTS:
- bid_index: REQUIRED. Integer index into the input bid array (0-based). Used by Code Node to resolve to actual bid_id.
- contractor_name: REQUIRED. Must exactly match the upstream bid data's contractor name.
- question_text: REQUIRED, NOT NULL. The actual question to ask.
- question_category: REQUIRED. Exactly one of the 7 categories.
- question_tier: REQUIRED. Exactly one of the 4 tiers.
- priority: REQUIRED. Exactly one of: high, medium, low.
- context: REQUIRED. Non-empty explanation of why this question matters.
- triggered_by: REQUIRED. Exactly one of the 9 trigger types.
- missing_field: String name of the missing field if triggered_by is "missing_field", otherwise null.
- good_answer_looks_like: REQUIRED. Non-empty, SPECIFIC (not generic like "a good answer").
- concerning_answer_looks_like: REQUIRED. Non-empty, SPECIFIC.
- display_order: REQUIRED. Integer, unique per bid_index, starting from 1.
- questions_summary: One entry per bid. Counts must match actual questions array. main_concerns is top 3 strings.

Do NOT include id, bid_id, created_at, is_answered, answer_text, answered_at, auto_generated, generation_notes — those are set by the database, Code Node, or frontend.
</output_schema>
```

---

## Node Overview

| Property | Value |
|---|---|
| Node Key | `question-generator` |
| Node Type | AGENT (single-run, not Loop) |
| Target Table | `contractor_questions` (N rows per bid, FK to bids) |
| Input Sources | `@[Equipment Researcher]`, `@[Contractor Researcher]`, `@[Incentive Finder]`, `@[Scoring Engine]`, `@[API Input - user_priorities]` |
| Prerequisites | All upstream nodes must complete: enriched equipment, contractor reputation, incentives, scores |
| Upsert Key | `bid_id, question_text` (UNIQUE constraint) |
| Writes New Rows? | YES — creates 8-25 `contractor_questions` rows per bid |
| Model | Claude 3.5 Sonnet or GPT-4o (complex cross-bid reasoning) |
| Web Search | OFF (analysis only) |

---

## What This Node Does

The Question Generator receives the complete enriched data from all upstream nodes — equipment specs, contractor reputation, scope details, scores/red flags, incentive programs, and user priorities — and generates specific, actionable questions for the homeowner to ask each contractor before signing.

It outputs:
1. **`questions[]`** — each item becomes one row in `contractor_questions`, tagged with tier, category, priority, and trigger
2. **`questions_summary[]`** — per-bid summary with tier counts and main concerns (used by the UI and for debugging)

**Rule:** Questions must reference actual data from the bids. No generic questions. Every question has context explaining why it matters and examples of good vs concerning answers.

---

## Database Columns This Node Populates

All columns live on `contractor_questions`. Field names map 1:1 — no transformation needed.

### System Columns (set by database — NOT in agent output)
| DB Column | Type | Notes |
|---|---|---|
| `id` | UUID | gen_random_uuid() |
| `bid_id` | UUID | FK -> bids(id), resolved from bid_index by Code Node |
| `created_at` | TIMESTAMPTZ | NOW() |

### Core Question Fields (from agent output)
| DB Column | Type | Agent Output Field |
|---|---|---|
| `question_text` | TEXT NOT NULL | `question_text` |
| `question_category` | TEXT | `question_category` |
| `question_tier` | TEXT | `question_tier` (essential/clarification/detailed/expert) |
| `priority` | TEXT DEFAULT 'medium' | `priority` (high/medium/low) |

### v8 Context Fields (from agent output)
| DB Column | Type | Agent Output Field |
|---|---|---|
| `context` | TEXT | `context` — why this question matters |
| `triggered_by` | TEXT | `triggered_by` — what generated this question |
| `good_answer_looks_like` | TEXT | `good_answer_looks_like` |
| `concerning_answer_looks_like` | TEXT | `concerning_answer_looks_like` |

### Metadata (from agent output)
| DB Column | Type | Agent Output Field |
|---|---|---|
| `missing_field` | TEXT | `missing_field` — field name if triggered by missing data |
| `display_order` | INTEGER | `display_order` |

### Set by Code Node (not in agent output)
| DB Column | Type | Notes |
|---|---|---|
| `auto_generated` | BOOLEAN DEFAULT true | Always true for MindPal-generated questions |
| `generation_notes` | TEXT | Optional, set by Code Node if needed |

### User Tracking (set by frontend — not in agent output)
| DB Column | Type | Notes |
|---|---|---|
| `is_answered` | BOOLEAN DEFAULT false | Set by user in UI |
| `answer_text` | TEXT | Set by user in UI |
| `answered_at` | TIMESTAMPTZ | Set by user in UI |

> **Note:** The `category` column exists alongside `question_category` for legacy compatibility. The agent outputs `question_category`; the Code Node may also set `category` to the same value.

---

## Task Prompt (Agent Node "Task" field)

```
Generate specific questions for the homeowner to ask each contractor, organized into 4 tiers.

ENRICHED BIDS: @[Equipment Researcher]
CONTRACTOR PROFILES: @[Contractor Researcher]
INCENTIVES: @[Incentive Finder]
SCORES: @[Scoring Engine]
USER PRIORITIES: @[API Input - user_priorities]

QUESTION GENERATION RULES:

For EACH bid, generate questions in these tiers:

TIER 1 — ESSENTIAL (5-7 per bid, ALWAYS generated):
- Licensing/insurance verification
- Total cost confirmation (any additional costs not in the bid?)
- Warranty specifics (labor + equipment + compressor separately)
- Electrical panel assessment (CRITICAL if not in bid)
- Permit responsibility (who pulls, who pays?)
- Start date and estimated completion
- What happens if issues arise post-install?

TIER 2 — CLARIFICATION (0-8 per bid, generated ONLY when gaps detected):
Trigger categories:
1. MISSING INFORMATION — Fields null/missing in this bid but present in other bids
2. SCOPE DIFFERENCES — Items other bids explicitly include that this one doesn't mention
3. PRICE VARIANCE — Price significantly higher or lower than competitors (>15%)
4. UNCLEAR TERMS — Vague warranty language or unspecified details
5. RED FLAG FOLLOW-UPS — Concerns from contractor research
6. NEGOTIATION OPPORTUNITIES — Based on competitor offerings
7. ELECTRICAL REQUIREMENTS — Panel assessment and upgrade costs (if partially addressed)

TIER 3 — DETAILED (0-8 per bid, generated for complex bids):
- Equipment model verification and spec confirmation
- Installation approach specifics (refrigerant line routing, condensate drain)
- Ductwork modifications needed
- Thermostat compatibility and smart home integration
- Financing terms and conditions
- Subcontractor usage (electrical, ductwork)
- Disposal of old equipment

TIER 4 — EXPERT (0-5 per bid, generated for technical verification):
- SEER2/HSPF2 verification against manufacturer published specs
- Sound level verification at installation distance
- Cold climate performance below design temperature
- Manual J load calculation status
- Commissioning procedure (refrigerant charge verification, airflow testing)
- Refrigerant type and line set sizing for the specific installation

OUTPUT FORMAT:
{
  "questions": [
    {
      "bid_index": 0,
      "contractor_name": "string",
      "question_text": "string - the specific question to ask the contractor",
      "question_category": "pricing|warranty|equipment|timeline|scope|credentials|electrical",
      "question_tier": "essential|clarification|detailed|expert",
      "priority": "high|medium|low",
      "context": "string - explain why this question matters and what triggered it",
      "triggered_by": "missing_field|scope_difference|price_variance|unclear_term|red_flag|negotiation|electrical|standard_essential|technical_verification",
      "missing_field": "string or null - field name if triggered by missing data",
      "good_answer_looks_like": "string - what a reassuring answer from the contractor would be",
      "concerning_answer_looks_like": "string - what a worrying answer would be",
      "display_order": number
    }
  ],
  "questions_summary": [
    {
      "bid_index": 0,
      "contractor_name": "string",
      "essential_count": number,
      "clarification_count": number,
      "detailed_count": number,
      "expert_count": number,
      "high_priority_count": number,
      "medium_priority_count": number,
      "low_priority_count": number,
      "total_questions": number,
      "main_concerns": ["string - top 3 concerns for this bid"]
    }
  ]
}

PRIORITY RULES:
- HIGH = essential tier questions, missing critical safety/financial info, red flags
- MEDIUM = clarification questions, scope/timeline/equipment gaps, detailed tier
- LOW = negotiation opportunities, expert tier verification, nice-to-know

QUALITY REQUIREMENTS:
- EVERY question must have a non-empty "context" field explaining why it matters
- EVERY question must have "good_answer_looks_like" — be specific, not generic
- EVERY question must have "concerning_answer_looks_like" — be specific, not generic
- Questions must reference ACTUAL data from the bids (prices, model numbers, warranty years)
- Cross-bid comparisons must cite the specific competing bid data

EXAMPLES OF GOOD QUESTIONS:

Essential (warranty):
{
  "question_text": "Your bid lists a 10-year equipment warranty. Does this cover the compressor separately, and is this the manufacturer's standard warranty or an extended warranty you provide?",
  "question_tier": "essential",
  "context": "Competitor B offers 12-year compressor coverage specifically. Your bid's warranty terms don't distinguish between equipment and compressor coverage, which could mean shorter compressor protection.",
  "good_answer_looks_like": "The 10-year covers all equipment including compressor. We also offer extended compressor coverage to 12 years for $X.",
  "concerning_answer_looks_like": "The compressor warranty is actually only 5 years unless you purchase our extended warranty package."
}

Clarification (price variance):
{
  "question_text": "Your total of $18,500 is $4,200 higher than the lowest bid for a similar Carrier system. Can you help me understand what's included in your price that might account for this difference?",
  "question_tier": "clarification",
  "context": "Competitor A quoted $14,300 for a comparable Carrier 24VNA9 system. The $4,200 difference (29%) warrants explanation — it could reflect higher-quality installation practices or unnecessary upselling.",
  "good_answer_looks_like": "Our price includes a 200A panel upgrade ($2,800), premium copper line set, and post-install commissioning with airflow verification.",
  "concerning_answer_looks_like": "That's just our standard pricing. We could probably come down a bit."
}

Return ONLY the JSON. No other text.
```

---

## Complete Output Example — Three-Bid Comparison

### Input Summary

The Question Generator receives structured JSON from all upstream nodes. For this example:
- **Bid 0 (Bay Area HVAC Pros):** Carrier Infinity 24, $18,500, 10yr parts/1yr labor warranty, electrical addressed (200A panel, 30A breaker), Google 4.7★ (142 reviews)
- **Bid 1 (Budget HVAC Co):** Goodman GSZC18, $12,500, 5yr parts warranty only, NO electrical info, Google 4.1★ (12 reviews), no BBB listing
- **Bid 2 (Comfort King HVAC):** Lennox XP25, $22,000, 12yr parts/12yr compressor/2yr labor warranty, full electrical assessment + panel upgrade included, Google 4.8★ (287 reviews)

### Output (abridged — showing representative questions for Bid 1)

```json
{
  "questions": [
    {
      "bid_index": 1,
      "contractor_name": "Budget HVAC Co",
      "question_text": "Your bid does not mention any electrical panel assessment or dedicated circuit for the heat pump. Heat pumps typically require a 30-40 amp dedicated breaker. Has your team assessed whether your current electrical panel can handle the additional load?",
      "question_category": "electrical",
      "question_tier": "essential",
      "priority": "high",
      "context": "Both Bay Area HVAC Pros and Comfort King include electrical work in their bids. Bay Area confirmed a 200A panel with 30A dedicated breaker. Your bid has zero electrical information, which is a safety concern for heat pump installations.",
      "triggered_by": "electrical",
      "missing_field": null,
      "good_answer_looks_like": "We assess the panel during our site visit. Your panel is 200A which is sufficient. We'll install a dedicated 30A breaker included in our price.",
      "concerning_answer_looks_like": "Electrical work isn't included. You'd need to hire an electrician separately, which could add $1,500-$3,000.",
      "display_order": 1
    },
    {
      "bid_index": 1,
      "contractor_name": "Budget HVAC Co",
      "question_text": "Your total of $12,500 is $6,000 less than the average of the other two bids ($19,250). Can you walk me through what's included and whether there are any additional costs that might come up during installation?",
      "question_category": "pricing",
      "question_tier": "clarification",
      "priority": "high",
      "context": "At $12,500, this bid is 35% below the average. The lowest-cost bid may exclude items others include (electrical work, disposal, permits, commissioning), which could result in surprise costs.",
      "triggered_by": "price_variance",
      "missing_field": null,
      "good_answer_looks_like": "Our price includes all equipment, labor, permits, and disposal. We keep costs low by using Goodman factory-direct pricing and our own installation crew.",
      "concerning_answer_looks_like": "The price is for equipment and basic install only. Permits, disposal, and electrical work are extra.",
      "display_order": 8
    },
    {
      "bid_index": 1,
      "contractor_name": "Budget HVAC Co",
      "question_text": "Your bid lists a 5-year parts warranty with no mention of labor warranty. Comfort King offers 12-year parts and 2-year labor coverage. What labor warranty do you provide, and can the parts warranty be extended?",
      "question_category": "warranty",
      "question_tier": "clarification",
      "priority": "medium",
      "context": "A 5-year parts-only warranty is the minimum Goodman factory standard. Both competitors offer significantly longer coverage. No labor warranty means any service call within the first year would be at your expense.",
      "triggered_by": "scope_difference",
      "missing_field": "labor_warranty_years",
      "good_answer_looks_like": "We include 1-year labor warranty standard. The Goodman parts warranty can be extended to 10 years with registration, which we handle for you at no charge.",
      "concerning_answer_looks_like": "The 5-year warranty is what comes with the unit. We don't offer a labor warranty.",
      "display_order": 9
    }
  ],
  "questions_summary": [
    {
      "bid_index": 0,
      "contractor_name": "Bay Area HVAC Pros",
      "essential_count": 6,
      "clarification_count": 2,
      "detailed_count": 3,
      "expert_count": 1,
      "high_priority_count": 6,
      "medium_priority_count": 4,
      "low_priority_count": 2,
      "total_questions": 12,
      "main_concerns": ["Price is $4,200 above lowest bid", "Labor warranty is only 1 year", "Manual J load calculation not mentioned"]
    },
    {
      "bid_index": 1,
      "contractor_name": "Budget HVAC Co",
      "essential_count": 7,
      "clarification_count": 5,
      "detailed_count": 2,
      "expert_count": 1,
      "high_priority_count": 9,
      "medium_priority_count": 4,
      "low_priority_count": 2,
      "total_questions": 15,
      "main_concerns": ["No electrical panel assessment", "Price 35% below average — possible exclusions", "Minimal online presence (12 Google reviews, no BBB)"]
    },
    {
      "bid_index": 2,
      "contractor_name": "Comfort King HVAC",
      "essential_count": 5,
      "clarification_count": 1,
      "detailed_count": 2,
      "expert_count": 2,
      "high_priority_count": 5,
      "medium_priority_count": 3,
      "low_priority_count": 2,
      "total_questions": 10,
      "main_concerns": ["Highest price at $22,000", "Lennox XP25 is premium — verify specs match", "Financing terms not specified"]
    }
  ]
}
```

**Key decisions in this example:**
- Bid 1 (Budget) gets the most questions (15) because it has the most gaps: no electrical info, lowest price, weak online presence, minimal warranty
- Bid 2 (Comfort King) gets the fewest questions (10) because it's the most comprehensive bid with best reputation
- Electrical question for Bid 1 is ESSENTIAL + HIGH because the bid has zero electrical information — this is mandatory per the `<electrical_requirement>` rule
- Price variance triggers for both Bid 1 (35% below average) and Bid 0 (above lowest bid)
- Cross-bid comparisons reference specific contractor names and dollar amounts

---

## Complete Output Example — Single Well-Documented Bid

### Input Summary

Only one bid submitted:
- **Bid 0 (Premier HVAC):** Carrier Infinity, $17,200, 10yr parts + 12yr compressor + 2yr labor, full electrical assessment, permits included, disposal included, commissioning included, Google 4.9★ (312 reviews), BBB A+

### Output (abridged)

```json
{
  "questions": [
    {
      "bid_index": 0,
      "contractor_name": "Premier HVAC",
      "question_text": "Can you confirm that $17,200 is the complete cost with no additional charges? Are there any circumstances during installation that could result in extra costs?",
      "question_category": "pricing",
      "question_tier": "essential",
      "priority": "high",
      "context": "Even comprehensive bids can have hidden costs for unforeseen conditions (asbestos, code violations, structural issues). Getting written confirmation protects you.",
      "triggered_by": "standard_essential",
      "missing_field": null,
      "good_answer_looks_like": "The $17,200 is all-inclusive. The only exception would be if we discover asbestos or major structural issues, which we'd discuss with you before proceeding.",
      "concerning_answer_looks_like": "There could be additional charges for permits, disposal, or electrical work depending on what we find.",
      "display_order": 1
    }
  ],
  "questions_summary": [
    {
      "bid_index": 0,
      "contractor_name": "Premier HVAC",
      "essential_count": 6,
      "clarification_count": 0,
      "detailed_count": 1,
      "expert_count": 2,
      "high_priority_count": 6,
      "medium_priority_count": 2,
      "low_priority_count": 1,
      "total_questions": 9,
      "main_concerns": ["Only one bid — no competitive comparison available", "Verify compressor warranty registration process", "Confirm commissioning includes airflow verification"]
    }
  ]
}
```

**Key decisions in this example:**
- `clarification_count` = **0** — no gaps detected, no cross-bid comparisons possible with a single bid
- Essential questions still generated (6) — these are mandatory regardless of bid quality
- Expert questions generated (2) — even good bids benefit from technical verification
- `main_concerns[0]` notes the single-bid limitation

---

## Output → Supabase Column Mapping

Every output field maps 1:1 to `contractor_questions` columns. **No transformation needed.**

| Output Field | DB Column | DB Type |
|---|---|---|
| `question_text` | `contractor_questions.question_text` | TEXT NOT NULL |
| `question_category` | `contractor_questions.question_category` | TEXT |
| `question_tier` | `contractor_questions.question_tier` | TEXT |
| `priority` | `contractor_questions.priority` | TEXT |
| `context` | `contractor_questions.context` | TEXT |
| `triggered_by` | `contractor_questions.triggered_by` | TEXT |
| `missing_field` | `contractor_questions.missing_field` | TEXT |
| `good_answer_looks_like` | `contractor_questions.good_answer_looks_like` | TEXT |
| `concerning_answer_looks_like` | `contractor_questions.concerning_answer_looks_like` | TEXT |
| `display_order` | `contractor_questions.display_order` | INTEGER |

**Not in agent output (set by DB):** `id`, `bid_id`, `created_at`
**Not in agent output (set by Code Node):** `auto_generated` (always true), `generation_notes`
**Not in agent output (set by frontend):** `is_answered`, `answer_text`, `answered_at`
**Not in database (output routing only):** `bid_index`, `contractor_name` — used by Code Node for bid_id resolution, not stored directly

---

## Upsert Strategy

| Key | Value |
|-----|-------|
| Upsert key | `bid_id, question_text` (UNIQUE constraint) |
| Behavior | INSERT or UPDATE all question fields. On re-run, existing questions with the same text are updated; new questions are inserted. |
| Idempotency | Safe to re-run. Questions are deterministic from bid data + upstream analysis. User-set fields (is_answered, answer_text) are NOT overwritten. |

```sql
INSERT INTO contractor_questions (
  bid_id, question_text, question_category, question_tier,
  priority, context, triggered_by, missing_field,
  good_answer_looks_like, concerning_answer_looks_like,
  display_order, auto_generated
)
VALUES (...)
ON CONFLICT (bid_id, question_text) DO UPDATE SET
  question_category = EXCLUDED.question_category,
  question_tier = EXCLUDED.question_tier,
  priority = EXCLUDED.priority,
  context = EXCLUDED.context,
  triggered_by = EXCLUDED.triggered_by,
  missing_field = EXCLUDED.missing_field,
  good_answer_looks_like = EXCLUDED.good_answer_looks_like,
  concerning_answer_looks_like = EXCLUDED.concerning_answer_looks_like,
  display_order = EXCLUDED.display_order;
```

> **Note:** `is_answered`, `answer_text`, and `answered_at` are intentionally NOT in the DO UPDATE SET clause — user progress on answering questions must be preserved across re-runs.

This upsert is already implemented in the mindpal-callback edge function at `supabase/functions/mindpal-callback/index.ts`.

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Bid has no electrical panel information | Generate ESSENTIAL tier, HIGH priority electrical question. triggered_by = "electrical". This is mandatory — never skip. |
| Only one bid submitted | Skip all cross-bid comparison questions. Focus on essential questions and bid-specific gaps. Do not generate price_variance or scope_difference triggered questions. |
| All bids have identical scope coverage | No CLARIFICATION scope_difference questions generated. Essential questions still generated. |
| Scoring Engine reports red flags | Generate CLARIFICATION tier questions with triggered_by = "red_flag". Reference the specific red flag. |
| User priorities emphasize a category | Weight questions toward that category. More questions, higher priority on that topic. |
| Bid has vague warranty ("warranty included") | Generate CLARIFICATION tier question asking for specifics. triggered_by = "unclear_term". Compare with competitors who specify exact years. |
| Equipment model number not provided | Generate DETAILED tier question asking to confirm exact model. triggered_by = "missing_field", missing_field = "model_number". |
| Price variance under 15% threshold | Do NOT generate a price_variance question. Only trigger when variance exceeds 15%. |
| Bid total is $0 or clearly erroneous | Generate ESSENTIAL tier question confirming total cost. Note anomaly in context. |
| Same question would apply to multiple bids | Each bid gets its own question object. question_text should be specific enough to differ (referencing contractor name, specific amounts). |
| Contractor Researcher found no online presence | Generate ESSENTIAL tier credentials question about verifying licensing/insurance. triggered_by = "red_flag". |
| Incentive Finder found programs the bid doesn't mention | Generate CLARIFICATION tier question asking if contractor will help with rebate paperwork. triggered_by = "negotiation". |

---

## What This Node Does NOT Do

- Does NOT perform web research — all data comes from upstream nodes
- Does NOT modify equipment specs, pricing, contractor ratings, scope, or incentive fields
- Does NOT write to `bid_equipment`, `bid_scope`, `bid_contractors`, `project_incentives`, or `bids`
- Does NOT generate FAQ-style answers — it generates questions only
- Does NOT score or rank bids — those belong to the Scoring Engine
- Does NOT determine which incentive programs apply — those belong to the Incentive Finder
- Does NOT process bids one at a time — it receives ALL bids simultaneously for cross-bid analysis

---

## Validation Checklist (Supervised mode)

- [ ] Each bid gets 5-7 essential tier questions
- [ ] `question_tier` is present on every question (one of: essential, clarification, detailed, expert)
- [ ] `question_category` is present on every question (one of: pricing, warranty, equipment, timeline, scope, credentials, electrical)
- [ ] `priority` is present on every question (one of: high, medium, low)
- [ ] `triggered_by` is present on every question (one of the 9 valid values)
- [ ] `context` is non-empty on every question
- [ ] `good_answer_looks_like` is non-empty and specific (not generic)
- [ ] `concerning_answer_looks_like` is non-empty and specific
- [ ] Electrical panel question is generated as ESSENTIAL when bid doesn't address electrical
- [ ] Cross-bid comparisons reference actual data values (dollar amounts, model numbers, warranty years)
- [ ] No generic questions — every question references specific bid data
- [ ] `questions_summary` includes one entry per bid
- [ ] Summary tier counts match actual questions in the questions array
- [ ] `display_order` values are unique per bid and sequential starting from 1
- [ ] Total questions per bid: 8-25 range (5-7 essential + variable other tiers)
- [ ] `bid_index` values are valid (0 to N-1 where N is number of bids)
- [ ] `contractor_name` matches upstream data exactly
- [ ] JSON is valid (parseable, no trailing commas)
- [ ] No questions about issues that don't exist in the data
- [ ] Price variance questions only triggered when variance exceeds 15%

---

## Node File Location

`mindpal/nodes/question-generator.md` — this file is the source of truth for this node.
