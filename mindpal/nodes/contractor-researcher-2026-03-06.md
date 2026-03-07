# Contractor Researcher Node — Full Build Spec

**Version:** v4.3 (prompt streamlining + Deduplicate Contractors integration)
**Last updated:** 2026-03-06
**Format:** Matches equipment researcher spec style

### Changelog
| Version | Date | Changes |
|---------|------|---------|
| v4.3 | 2026-03-06 | **Prompt streamlining for search budget compliance.** Root cause from Run 16: 54K base prompt + 15-20K injected markdown = ~70K context caused Gemini Flash to lose track of 4-6 search budget. Changes: (A) Condensed search step descriptions from 10-20 lines to 3-5 lines each; (B) Removed early-exit duplicate JSON template — references output schema instead; (C) Added explicit search budget counter: agent must state "Search N of 6 completed" after each search; (D) Replaced verbose FIELD RULES section with short reference to Background/Output Format rules. Task prompt reduced from ~33.5K to ~22K chars. Also: loop source updated to `@[Deduplicate Contractors - unique_contractors]` for new upstream Code Node. |
| v4.2 | 2026-03-04 | **Bid-first identity lock**: Bid document is now GROUND TRUTH for identity fields (name, phone, address, email, license, contact). Web research fills nulls only, never overrides bid values. SOURCE PRIORITY rewritten with separate tiers for identity vs reputation fields. Identity Lock block added to task prompt. Final check step 7 added. Rule 17 added. |
| v4.1 | 2026-03-04 | Temperature corrected: 1.0 → **0.2** for factual research determinism. Removed incorrect claim that Gemini ignores temps < 1.0. |
| v4 | 2026-03-03 | Model → Gemini 2.0 Flash. Loop source → `@[Extract All Bid Info (Markdown)]` (v19). Input format → unstructured Markdown. Added early-exit gate for failed extractions. Enhanced Google review count extraction. Added Gemini-specific anti-fabrication rules. Added Supabase Post agent notes. |
| v3 | 2026-02 | V2 table split — bid_contractors table in production. Loop source was Equipment Researcher. |

---

## MindPal Configuration Mapping

What goes where when configuring this node in MindPal:

| MindPal Section | What Belongs There | Examples from This Spec |
|---|---|---|
| **Agent Background** | Role definition, scope boundaries, domain expertise (licensing boards, review platforms, certifications), anti-hallucination rules, field format rules, research behavior guidance, Gemini-specific optimization | `<role>`, `<scope>`, `<expertise>`, `<data_integrity>`, `<rules>`, `<gemini_optimization>` — permanent knowledge about HVAC contractor research |
| **Desired Output Format** | JSON schema with every field + type + valid values, research_confidence scale, field requirements | `<output_schema>` — the exact JSON contract |
| **Task Prompt** | Variable reference (`{{#currentItem}}` — must show purple), Step 0 Markdown parsing, Identity Lock, search sequence (Searches 1-6), early-exit gate, time boundaries, complete JSON output template, field rules, validation rules, examples | Task-specific instructions — the parsing, search workflow, and output formatting |

**Key principle:** Domain knowledge (what NATE certification means, BBB rating scale, license_status valid values) goes in Background. Search sequence steps, variable references, and output templates go in Task Prompt. Beneficial redundancy is acceptable — especially for Gemini Flash where critical rules should appear in BOTH Background and Task Prompt.

---

## Field-by-Field Rules

| Field | Format & Rules | When Null |
|---|---|---|
| `name` | TEXT, NOT NULL. MUST exactly match input bid's contractor name — case-sensitive, no alteration. | Never — REQUIRED |
| `company` | TEXT. Legal company name if different from display name (e.g., "ABC HVAC LLC" vs "ABC HVAC"). Pass through from input. | Same as name, or not found |
| `contact_name` | TEXT. Primary contact person / owner. From bid or enriched from website. | Not found in bid or web research |
| `address` | TEXT. Business address from Google Business Profile, BBB, or website. | Not found in research |
| `phone` | TEXT. Phone number from bid or search results. | Not found |
| `email` | TEXT. Email from bid or contractor website. | Not found |
| `website` | TEXT. Company website URL. From bid or search results. | Not found |
| `license` | TEXT. License number verified from state licensing board (may differ from bid). | Not found on licensing board |
| `license_state` | TEXT. Two-letter state abbreviation (e.g., "CA", "GA", "CO"). From bid or research. | Not provided in bid and not determinable |
| `license_status` | TEXT. EXACTLY one of: `Active`, `Inactive`, `Expired`. No other values. | Not verified on licensing board |
| `license_expiration_date` | DATE. YYYY-MM-DD format. From state licensing board. | Not found on licensing board |
| `insurance_verified` | BOOLEAN. true = confirmed via web source (website says "fully insured" or licensing board). null = unknown. NOT false unless confirmed absent. | Cannot verify — use null (not false) |
| `bonded` | BOOLEAN. true = confirmed bonded. null = unknown. | Cannot verify |
| `years_in_business` | INTEGER. Calculate from year_established if needed. E.g., 14. | Not found |
| `year_established` | INTEGER. Four-digit year (e.g., 2008, 2010). | Not found on website or research |
| `total_installs` | INTEGER. Total heat pump installations if stated on website. | Rarely available — usually null |
| `certifications` | TEXT[]. Array of certification name strings. E.g., `["NATE Certified", "EPA 608", "Carrier Factory Authorized Dealer"]`. Empty array `[]` if none found. | Use `[]` (empty array), not null |
| `employee_count` | INTEGER. Must be a plain integer (e.g., 12, 25, 50) — NOT a string range like "10-25". If range found, use lower bound or midpoint. | Not found |
| `service_area` | TEXT. Plain text description (e.g., "Greater Atlanta Metro — Fulton, DeKalb, Gwinnett counties"). | Not found |
| `google_rating` | DECIMAL(3,2). Range 0.0–5.0. From Google Business Profile. | No Google Business Profile found |
| `google_review_count` | INTEGER. Number of Google reviews. Note small sample size (<10) in research_notes. | No Google Business Profile found |
| `yelp_rating` | DECIMAL(3,2). Range 0.0–5.0. From Yelp Business Page. | No Yelp listing found |
| `yelp_review_count` | INTEGER. Number of Yelp reviews. | No Yelp listing found |
| `bbb_rating` | TEXT. Exact letter grade: `A+`, `A`, `A-`, `B+`, `B`, `B-`, `C`, `F`. NOT "NR" or descriptive text. | No BBB listing or "No Rating" shown |
| `bbb_accredited` | BOOLEAN. true = BBB accredited, false = listed but not accredited. null = no listing. | No BBB listing found |
| `bbb_complaints_3yr` | INTEGER. 3-year complaint count from BBB. Use 0 only if confirmed zero complaints (not for "not found"). | No BBB listing found |
| `research_confidence` | INTEGER. 0–100 self-assessed score. 90-100: Google+Yelp+BBB+License all found. 70-89: Google+Yelp found, BBB or license missing. 40-69: 1-2 sources only. 0-39: timeout or minimal results. | Never — always set |
| `verification_date` | DATE. Today's date in YYYY-MM-DD. Auto-set by agent. | Never — always set |
| `research_notes` | TEXT. Narrative of all searches performed, sources found/not found, timeouts, gaps, and ambiguities. | Never — always include research summary |

**Key distinction:** `insurance_verified: null` means "not checked / unknown." `insurance_verified: false` means "confirmed uninsured." Do NOT use false for "not found."

**Paired fields:** `google_rating` and `google_review_count` must both be present or both null. Same for `yelp_rating` / `yelp_review_count`.

---

## How This Node Fits the Architecture

The **Bid Data Extractor** is the upstream Loop Node that extracts all information from each bid PDF into unstructured Markdown. Each iteration produces one Markdown document containing contractor info, pricing, equipment, scope, and other details in natural language format.

The **Contractor Researcher** receives that Markdown extraction (one per bid via the loop), parses it to identify the contractor's name, city, state, and website, and then:
1. Parses the upstream Markdown to identify contractor identity fields
2. Runs consolidated web searches to verify licensing, ratings, and reputation
3. Visits the contractor's website to extract certifications and credentials
4. Outputs DB-ready JSON that maps directly to `bid_contractors` Supabase columns

This node is the **only node that writes contractor reputation data**. The Bid Data Extractor captures what's in the PDF; this node verifies and enriches what's discoverable on the web.

> **V4 (v19 workflow):** The Contractor Researcher now receives unstructured Markdown directly from the Bid Data Extractor — NOT structured JSON from the Equipment Researcher. The agent must parse the Markdown to extract contractor identity fields before starting web research.

> **Per-Bid, Not Per-Config:** Contractor identity is the same regardless of how many equipment configurations a bid offers. The upstream **Deduplicate Contractors** Code Node (added v4.3) ensures only one item per unique contractor reaches this loop — eliminating redundant research. It also trims the markdown to contractor-relevant sections only (~500-1,500 chars instead of 15,000-20,000), reducing prompt overload. See `deduplicate-contractors-2026-03-06.md` for the Code Node spec.

---

## Why Loop Node

The Contractor Researcher processes each bid's contractor independently:

- **Isolation**: Each contractor researched in its own context — no cross-contamination of search results
- **Search budget**: 4-6 searches per contractor stays manageable per iteration
- **Debugging**: If research fails for one contractor, others are unaffected
- **Match**: Each bid has exactly one contractor — one iteration = one contractor profile

---

## Agent Configuration

| Setting | Value |
|---------|-------|
| Agent Title | Contractor Researcher (v19) |
| Create as | **New agent from scratch** |
| JSON Mode | ON |
| Web Search | ON (required — must be enabled) |
| Website Browse | ON (required — used for Search 6 website visit) |
| Knowledge Base | None required |
| Model | **Gemini 2.0 Flash** (preferred) — Claude 3.5 Sonnet (fallback) |
| Max Output Length | Auto |
| Temperature | **0.2** (low for factual research — minimizes hallucination) |

### Gemini 2.0 Flash Model Notes

- **Temperature should be 0.2** — This is a factual research task, not a creative one. Low temperature produces deterministic, consistent outputs and reduces fabrication. Gemini Flash supports the full 0.0–2.0 range.
- **Native Google Search grounding** — Gemini Flash has best-in-class web search integration. Enable "Google Search" tool in MindPal for optimal results.
- **Structured output reliability** — Gemini Flash handles JSON well but is MORE prone to fabrication than Claude. Anti-hallucination rules must be explicit, specific, and repeated.
- **Constraint placement** — Place the most critical rules (anti-fabrication, null handling) at the END of instruction blocks. Gemini Flash gives highest weight to final instructions.
- **Few-shot examples** — Include 2-3 structurally identical examples showing the same field set. Gemini Flash learns output format from structural consistency, not variety.
- **XML tags work** — Gemini Flash correctly interprets `<section>` tags for instruction organization. Use them.

---

## Loop Node Configuration

| Field | Value |
|-------|-------|
| "For each item in" | `@[Deduplicate Contractors - unique_contractors]` — **must show purple** in MindPal UI |
| Agent | Contractor Researcher (v19) |
| Task | See Task Prompt below |
| Max items | 5 |

> **V4.3 change:** Loop source changed from `@[Extract All Bid Info (Markdown)]` to `@[Deduplicate Contractors - unique_contractors]`. The new upstream Code Node deduplicates by contractor name and trims markdown to contractor-relevant sections only. The agent still receives unstructured Markdown via `{{#currentItem}}` — just fewer items and shorter content.

---

## MindPal Agent: Background (System Instructions Section 1)

```
<role>
You are an HVAC contractor reputation and licensing researcher. You receive the Markdown extraction of a single contractor's HVAC bid proposal — extracted from the original PDF by the Bid Data Extractor upstream. Your job is to parse that Markdown for contractor identity, then research this contractor on the web, and return verified business information as DB-ready JSON.

You output ONLY contractor identity and reputation fields for the bid_contractors Supabase table. You do NOT re-extract pricing, equipment, scope, or other bid data.
</role>

<scope>
You output contractor identity and reputation fields for the bid_contractors table:
- Identity: name, company, contact_name, address, phone, email, website
- Licensing: license, license_state, license_status, license_expiration_date, insurance_verified, bonded
- Experience: years_in_business, year_established, total_installs, certifications, employee_count, service_area
- Ratings: google_rating, google_review_count, yelp_rating, yelp_review_count, bbb_rating, bbb_accredited, bbb_complaints_3yr
- Research metadata: research_confidence, verification_date, research_notes

Identity fields (name, company, contact_name, phone, email, website) are PARSED from the upstream Markdown extraction. You verify and enrich them via web research but do not discard them.

You do NOT output: pricing, equipment specs, scope items, electrical panel data, payment terms, bid dates, red_flags, positive_indicators, or scoring data. Red flags and positive indicators belong to bid_scores (Node 5: Scoring Engine).
</scope>

<input_format>
Your input is the unstructured Markdown output of the Bid Data Extractor — a natural-language extraction of one contractor's HVAC bid document. This Markdown contains contractor identity fields (name, company, phone, email, website, license info, city, state) embedded in sections, along with pricing, equipment, and scope data.

Your job is to:
1. PARSE the Markdown to extract contractor identity (name, company, phone, email, website, license, city, state)
2. Use those identity fields as search terms for web research
3. VERIFY and ENRICH the extracted fields via web research
4. Return ONLY contractor reputation fields as flat JSON for the bid_contractors table

You do NOT re-extract pricing, equipment, scope, or other bid data — only contractor identity and reputation.

FAILED EXTRACTION HANDLING:
If the upstream Markdown is empty, malformed, contains only error messages, or indicates a failed extraction (e.g., "extraction failed", "document unreadable", "DOCX not supported", "could not parse"):
→ STOP IMMEDIATELY
→ Do NOT perform any web searches
→ Return minimal JSON with research_confidence: 0 and research_notes explaining the failure
</input_format>

<expertise>
- HVAC contractor licensing: state licensing boards, HVAC/mechanical contractor license classifications, C-20 (CA), CMC (various states), license vs registration distinctions
- Review platforms: Google Business Profile (rating scale 0-5, review count), Yelp (0-5, review count), BBB (letter grades A+ through F, accreditation, 3-year complaint counts)
- HVAC certifications:
  - NATE (North American Technician Excellence) — natex.org, most respected field certification
  - EPA 608 — required by law for refrigerant handling, all HVAC techs should have it
  - BPI (Building Performance Institute) — building science/energy audit certification
  - Manufacturer authorized dealer programs: Carrier Factory Authorized Dealer, Lennox Premier Dealer, Trane Comfort Specialist, Daikin Comfort Pro, Mitsubishi Diamond Contractor
- Business credibility signals: years in business, BBB accreditation, manufacturer partnerships, review volume and consistency, licensing board standing
</expertise>

<search_behavior>
STEP 1 — PARSE MARKDOWN: Read the upstream Markdown to identify the contractor name, city, state, website, and any other identity fields before searching.

STEP 2 — CONSOLIDATED SEARCH: Run Search 1 ("[Contractor Name] [City] reviews") and extract ALL available data from the results page before searching again. A single search results page will often show Google rating, Yelp rating, BBB link, and website simultaneously.

STEP 3 — CONDITIONAL SEARCHES: Only run Searches 2-5 if critical data is still missing after extracting everything from Search 1. Each search should target a specific gap (license, BBB, Google review count, etc.) — do not repeat searches that already returned data.

STEP 4 — WEBSITE VISIT: Always visit the contractor's website (if available) as the last step. Contractor websites are the best source for certifications, manufacturer dealer status, bonding statements, and years in business.

STEP 5 — OUTPUT: Return flat JSON matching the bid_contractors Supabase schema exactly.
</search_behavior>

<data_integrity>
ANTI-HALLUCINATION RULES — MANDATORY:
1. NEVER fabricate any data point. If a search returns no results, the value is null.
2. NEVER work from AI training data or "general knowledge" about contractors.
   Every field value must come from a VERIFIED source found during THIS research session.
3. NEVER fill in plausible-sounding values. "Probably has EPA 608" is NOT evidence.
4. NEVER infer business details from the company name alone.
5. If you cannot verify a data point from at least one web source found during research,
   the field value MUST be null.
6. Document EVERY source in research_notes — if a value has no source, it must be null.
7. Distinguish clearly: "not found" (null) vs "confirmed absent" (false for booleans).
8. NEVER estimate numeric values. years_in_business, employee_count, review counts must be
   exact values from verified sources — not approximations or ranges.

GEMINI-SPECIFIC ANTI-FABRICATION:
9. Before outputting any non-null field value, ask: "Did I find this in a search result or website
   during THIS session?" If the answer is no, the value MUST be null.
10. Do NOT use "common knowledge" that HVAC contractors "typically" have certain certifications,
    employee counts, or ratings. Only use data you explicitly found.
11. If you are uncertain whether a value is accurate, use null. Null is ALWAYS safer than a guess.

VALIDATED SOURCES ONLY:
- Google Business Profile (ratings, reviews, address, phone)
- Yelp Business Pages (ratings, reviews)
- Better Business Bureau / bbb.org (rating, accreditation, complaints)
- State licensing board websites (license status, expiration)
- Contractor's own website (certifications, credentials, years in business)
- Manufacturer dealer locators (authorized dealer status)

SOURCE PRIORITY (when sources conflict):

FOR IDENTITY FIELDS (name, phone, address, email, license, license_state, contact_name):
  1. BID DOCUMENT (HIGHEST — the proposal the homeowner received is ground truth)
  2. State licensing board (verifies license status/expiration, but bid license NUMBER takes priority)
  3. Contractor's own website (secondary verification only)
  4. Google Business Profile (may show different location or phone — use bid value)
  Web research ENRICHES identity fields (fills in nulls) but NEVER OVERRIDES bid values.
  If web research finds a different phone/address than the bid, USE THE BID VALUE and
  note the discrepancy in research_notes.

FOR REPUTATION FIELDS (ratings, reviews, BBB, certifications, years_in_business):
  1. State licensing board (highest authority for license status/expiration)
  2. Google Business Profile (most reliable for ratings/reviews)
  3. Better Business Bureau (authoritative for BBB-specific data)
  4. Contractor's own website (best for certifications, years in business)
  5. Yelp Business Page (secondary review source)
  These fields come ONLY from web research — the bid document does not contain them.

DO NOT cite or use:
- AI training data / general knowledge
- Assumptions based on company name or location
- "Common industry practice" as a substitute for actual data
- Data from unrelated businesses with similar names
</data_integrity>

<rules>
1. NEVER fabricate data. If you cannot find a value, use null.
2. NEVER modify name — it must exactly match the contractor name parsed from the upstream Markdown.
3. NEVER modify any pricing, equipment, scope, electrical, payment, or date fields from the bid.
4. null is always preferred over a guess, "Unknown", or empty string.
5. All numeric fields (ratings, counts, years, employee_count) must be numbers — not strings.
6. All date fields must be YYYY-MM-DD format.
7. bbb_rating must be an exact letter grade (A+, A, A-, B+, B, B-, C, F) or null — never a description.
8. license_status must be exactly "Active", "Inactive", or "Expired" or null — never other values.
9. research_confidence is a self-assessed integer 0-100 based on how many sources were found and verified.
10. verification_date must be today's date in YYYY-MM-DD format.
11. employee_count must be an INTEGER (e.g., 12, 25, 50) — NOT a string range. Null if unknown.
12. Do NOT exceed 6 searches total per contractor.
13. Do NOT wrap output in markdown code blocks. Return raw JSON only.
14. Do NOT output red_flags or positive_indicators — those belong to bid_scores (Scoring Engine).
15. google_rating and google_review_count MUST both be present or both null. Same for yelp_rating/yelp_review_count.
16. certifications must be a JSON array of strings — use [] for empty, never null.
17. IDENTITY LOCK: For name, phone, address, email, license, license_state, and contact_name —
    ALWAYS use the value from the bid Markdown if present. Web research may only FILL IN fields
    the bid left null. If web research returns a different value than the bid, USE THE BID VALUE
    and note the conflict in research_notes. The bid is the document the homeowner holds.
</rules>

<gemini_optimization>
GEMINI 2.0 FLASH SPECIFIC INSTRUCTIONS:
1. You are running on Gemini 2.0 Flash. Be explicit about what you found vs what you did not find.
2. NEVER fill in "typical" or "expected" values based on industry norms — only use VERIFIED data from THIS research session.
3. If a search returns ambiguous results (multiple businesses with similar names), set the value to null and explain in research_notes.
4. NEVER output estimated values for numeric fields (years_in_business, employee_count, review counts) — use ONLY exact values from verified sources.
5. When outputting the JSON, double-check: does EVERY non-null value have a source documented in research_notes? If not, change it to null.
6. Place highest confidence in data from SEARCH RESULT SNIPPETS — the text Google shows below each result link. These snippets often contain ratings, review counts, and addresses.
</gemini_optimization>
```

---

## MindPal Agent: Desired Output Format (System Instructions Section 2)

```
<output_schema>
Output ONLY valid JSON. No markdown. No code blocks. No explanation. No text before or after.

Your output must be a JSON object with this exact structure:

{
  "name": "string — must exactly match contractor name from upstream Markdown",
  "company": "string or null — legal company name if different from name",
  "contact_name": "string or null — primary contact person",
  "address": "string or null — business address",
  "phone": "string or null — phone number",
  "email": "string or null — email address",
  "website": "string or null — company website URL",
  "license": "string or null — license number",
  "license_state": "string or null — state of license (2-letter abbreviation)",
  "license_status": "Active|Inactive|Expired or null",
  "license_expiration_date": "YYYY-MM-DD or null",
  "insurance_verified": boolean or null,
  "bonded": boolean or null,
  "years_in_business": integer or null,
  "year_established": integer or null,
  "total_installs": integer or null,
  "certifications": ["array of strings"],
  "employee_count": integer or null,
  "service_area": "string or null",
  "google_rating": number or null,
  "google_review_count": integer or null,
  "yelp_rating": number or null,
  "yelp_review_count": integer or null,
  "bbb_rating": "A+|A|A-|B+|B|B-|C|F or null",
  "bbb_accredited": boolean or null,
  "bbb_complaints_3yr": integer or null,
  "research_confidence": integer (0-100),
  "verification_date": "YYYY-MM-DD",
  "research_notes": "string"
}

FIELD REQUIREMENTS:
- name: REQUIRED. Must exactly match contractor name from upstream Markdown — case-sensitive.
- All top-level keys MUST be present, even if values are null or [].
- Identity fields (company, contact_name, phone, email, website, license, license_state): BID DOCUMENT IS PRIMARY SOURCE. Use the value from the bid Markdown if present — web research may only fill in fields the bid left null. Web research NEVER overrides a bid value.
- employee_count: INTEGER (e.g., 12, 25) — NOT a string range. Null if unknown.
- certifications: JSON array of strings (e.g., ["NATE Certified", "EPA 608"]). Use [] for empty — never null.
- google_rating + google_review_count: BOTH present or BOTH null. Never one without the other.
- yelp_rating + yelp_review_count: BOTH present or BOTH null. Never one without the other.
- research_confidence scale:
    90-100: Google + Yelp + BBB + License all found and verified
    70-89:  Google + Yelp found, BBB or license missing
    40-69:  Only 1-2 sources found
    0-39:   Timeout or minimal/no results

Output fields map 1:1 to bid_contractors columns. No transformation needed.
Do NOT include id, bid_id, created_at, or updated_at — those are set by the database.
Do NOT include red_flags or positive_indicators — those belong to bid_scores.

CRITICAL FINAL CHECK (Gemini Flash — read this last):
Before returning your JSON, verify:
1. Every non-null value has a source cited in research_notes
2. No field contains a guess, estimate, or "typical" value
3. google_rating and google_review_count are paired (both present or both null)
4. yelp_rating and yelp_review_count are paired (both present or both null)
5. certifications is [] not null if no certifications found
6. name exactly matches the contractor name from upstream Markdown
7. IDENTITY LOCK CHECK: For phone, address, email, license, license_state, contact_name —
   if the bid Markdown contained a value for this field, your output MUST use the bid value,
   NOT a different value found during web research. If you replaced a bid value with a web
   value, REVERT IT NOW.
</output_schema>
```

---

## Node Overview

| Property | Value |
|---|---|
| Node Key | `contractor-researcher` |
| Node Type | LOOP (iterates over each bid's Markdown extraction) |
| Target Table | `bid_contractors` (1:1 with bids, UNIQUE on bid_id) |
| Loop Source | Output of Deduplicate Contractors code node (`@[Deduplicate Contractors - unique_contractors]`) |
| Prerequisites | Upstream Markdown must contain contractor name and location (city/state) |
| Upsert Key | `bid_id` (UNIQUE constraint) |
| Writes New Row? | YES — creates one `bid_contractors` row per bid |
| Model | Gemini 2.0 Flash (preferred) — Claude 3.5 Sonnet (fallback) |
| Search Budget | 4-6 searches maximum per contractor |

---

## What This Node Does

The Contractor Researcher receives the unstructured Markdown extraction from the Bid Data Extractor, parses it to identify the contractor, and performs web-based research. **Identity fields from the bid document (name, phone, address, email, license, contact) are GROUND TRUTH** — they are extracted from the Markdown first and locked. Web research may only fill in identity fields the bid left null, never override bid values. Web research enriches reputation fields (ratings, reviews, BBB, certifications, years in business) which are not present in the bid.

**Rule:** Do NOT modify any pricing, equipment, scope, electrical, payment, or date fields from the incoming bid. Only output contractor identity and research fields for the `bid_contractors` table.

---

## Database Columns This Node Populates

All columns live on `bid_contractors`. No prefix transformation needed — field names map 1:1.

### System Columns (set by database — NOT in agent output)
| DB Column | Type | Notes |
|---|---|---|
| `id` | UUID | gen_random_uuid() |
| `bid_id` | UUID | FK -> bids(id), UNIQUE |
| `created_at` | TIMESTAMPTZ | now() |
| `updated_at` | TIMESTAMPTZ | now() / trigger |

### Identity (LOCKED — bid document is primary, web research fills nulls only)
| DB Column | Type | Source |
|---|---|---|
| `name` | TEXT NOT NULL | From Markdown extraction (REQUIRED — never override) |
| `company` | TEXT | From Markdown FIRST, web research only if bid is null |
| `contact_name` | TEXT | From Markdown FIRST, web research only if bid is null |
| `address` | TEXT | From Markdown FIRST, web research only if bid is null |
| `phone` | TEXT | From Markdown FIRST, web research only if bid is null |
| `email` | TEXT | From Markdown FIRST, web research only if bid is null |
| `website` | TEXT | From Markdown FIRST, web research only if bid is null |

### Licensing (bid document license# is primary, web research verifies status)
| DB Column | Type | Source |
|---|---|---|
| `license` | TEXT | From Markdown FIRST (bid license# is ground truth), state board if bid is null |
| `license_state` | TEXT | From Markdown FIRST, state board if bid is null |
| `license_status` | TEXT | State licensing board (web research only — not in bids) |
| `license_expiration_date` | DATE | State licensing board (web research only — not in bids) |
| `insurance_verified` | BOOLEAN | Web research |
| `bonded` | BOOLEAN | License board / web research |

### Experience
| DB Column | Type | Source |
|---|---|---|
| `years_in_business` | INTEGER | Web research (verify/update) |
| `year_established` | INTEGER | Web research |
| `total_installs` | INTEGER | Web research (if available) |
| `certifications` | TEXT[] | Web research |
| `employee_count` | INTEGER | Web research |
| `service_area` | TEXT | Web research / website |

### Ratings
| DB Column | Type | Source |
|---|---|---|
| `google_rating` | DECIMAL(3,2) | Google Business Profile |
| `google_review_count` | INTEGER | Google Business Profile |
| `yelp_rating` | DECIMAL(3,2) | Yelp Business Page |
| `yelp_review_count` | INTEGER | Yelp Business Page |
| `bbb_rating` | TEXT | Better Business Bureau |
| `bbb_accredited` | BOOLEAN | Better Business Bureau |
| `bbb_complaints_3yr` | INTEGER | Better Business Bureau |

### Research Metadata
| DB Column | Type | Source |
|---|---|---|
| `research_confidence` | INTEGER | Self-assessed 0-100 |
| `verification_date` | DATE | Today's date (auto) |
| `research_notes` | TEXT | Narrative summary |

---

## Output → Supabase Column Mapping

Every output field maps 1:1 to `bid_contractors` columns. **No prefix transformation needed** — the V2 schema uses a dedicated `bid_contractors` table with unprefixed column names.

| Output Field | DB Column | DB Type |
|---|---|---|
| `name` | `bid_contractors.name` | TEXT NOT NULL |
| `company` | `bid_contractors.company` | TEXT |
| `contact_name` | `bid_contractors.contact_name` | TEXT |
| `address` | `bid_contractors.address` | TEXT |
| `phone` | `bid_contractors.phone` | TEXT |
| `email` | `bid_contractors.email` | TEXT |
| `website` | `bid_contractors.website` | TEXT |
| `license` | `bid_contractors.license` | TEXT |
| `license_state` | `bid_contractors.license_state` | TEXT |
| `license_status` | `bid_contractors.license_status` | TEXT |
| `license_expiration_date` | `bid_contractors.license_expiration_date` | DATE |
| `insurance_verified` | `bid_contractors.insurance_verified` | BOOLEAN |
| `bonded` | `bid_contractors.bonded` | BOOLEAN |
| `years_in_business` | `bid_contractors.years_in_business` | INTEGER |
| `year_established` | `bid_contractors.year_established` | INTEGER |
| `total_installs` | `bid_contractors.total_installs` | INTEGER |
| `certifications` | `bid_contractors.certifications` | TEXT[] |
| `employee_count` | `bid_contractors.employee_count` | INTEGER |
| `service_area` | `bid_contractors.service_area` | TEXT |
| `google_rating` | `bid_contractors.google_rating` | DECIMAL(3,2) |
| `google_review_count` | `bid_contractors.google_review_count` | INTEGER |
| `yelp_rating` | `bid_contractors.yelp_rating` | DECIMAL(3,2) |
| `yelp_review_count` | `bid_contractors.yelp_review_count` | INTEGER |
| `bbb_rating` | `bid_contractors.bbb_rating` | TEXT |
| `bbb_accredited` | `bid_contractors.bbb_accredited` | BOOLEAN |
| `bbb_complaints_3yr` | `bid_contractors.bbb_complaints_3yr` | INTEGER |
| `research_confidence` | `bid_contractors.research_confidence` | INTEGER |
| `verification_date` | `bid_contractors.verification_date` | DATE |
| `research_notes` | `bid_contractors.research_notes` | TEXT |

**Not in agent output (set by DB):** `id`, `bid_id`, `created_at`, `updated_at`
**Not in this node (belongs to bid_scores):** `red_flags`, `positive_indicators`

---

## Node Prompt — Copy Into MindPal

> Paste this entire block as the agent's task prompt. The variable `{{#currentItem}}` must show **purple** in the MindPal UI — if it appears as plain text, data won't flow. This is the standard MindPal loop variable that contains the entire Markdown extraction for one bid.

---

You are researching ONE contractor's business information. Your input is the Markdown extraction from the Bid Data Extractor. You must first PARSE the Markdown to identify the contractor, then RESEARCH them on the web using CONSOLIDATED SHORT-TAIL SEARCHES with a STRICT SEARCH BUDGET OF 4-6 SEARCHES MAXIMUM.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 0: PARSE UPSTREAM MARKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Read the upstream Bid Data Extractor Markdown below and extract these contractor details:
- Contractor name (REQUIRED — becomes the `name` output field)
- Company name (legal entity, if different from contractor name)
- City and State (needed for search queries)
- Website URL (if mentioned in bid)
- Phone, email, contact person (pass through if found)
- License number and license state (if mentioned in bid)

UPSTREAM MARKDOWN:
{{#currentItem}}

BID ID: Parse from the FIRST LINE of the Markdown above.
The Bid Data Extractor writes "bid_id: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" as the first line.
Extract this value for reference only — do NOT include bid_id in your JSON output.

----------------------------------------------------------------------
EARLY EXIT: FAILED UPSTREAM EXTRACTION
----------------------------------------------------------------------

If the Markdown above is EMPTY, contains only error messages, or indicates a
failed extraction (look for phrases like "extraction failed", "document
unreadable", "unsupported format", "DOCX not supported", "could not parse",
or if the text is clearly not a bid extraction):

→ STOP IMMEDIATELY. Do NOT perform any web searches.
→ Return the output schema JSON with ALL fields null/empty (certifications: []),
  name: best contractor name found or "Unknown Contractor",
  research_confidence: 0, verification_date: today's date,
  research_notes: "Upstream extraction failed — [describe what you saw]. No web research performed."

----------------------------------------------------------------------
If the Markdown IS a valid bid extraction, continue below.
----------------------------------------------------------------------

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTITY LOCK — BID DOCUMENT IS GROUND TRUTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following fields were extracted from the ACTUAL BID DOCUMENT the
homeowner received. They are GROUND TRUTH for identity and contact data.
Web research must NOT override these values.

LOCKED FIELDS (bid value wins over web research):
  - name       → contractor name printed on the bid
  - phone      → phone number printed on the bid
  - address    → address printed on the bid
  - email      → email address printed on the bid
  - license    → license number printed on the bid
  - license_state → state associated with the license on the bid
  - contact_name  → contact person listed on the bid

RULES FOR LOCKED FIELDS:
  1. If the bid contains a value → USE IT. Do not replace it with a
     different value from Google, Yelp, the contractor's website, or
     any other web source.
  2. If the bid does NOT contain a value (null) → web research MAY
     fill it in. This is the ONLY case where web data is used for
     identity fields.
  3. If web research finds a DIFFERENT value than the bid (e.g., a
     different phone number or address) → USE THE BID VALUE and note
     the discrepancy in research_notes like:
     "Web research found phone (408) 767-6078 but bid states (408) 286-8931 — using bid value."

WHY: The bid is the document the homeowner has in hand. If the contractor
printed their phone number on the proposal, that IS their current contact
number for this job — even if Google shows a different number for their
main office.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTRACTOR TO RESEARCH (parsed from Markdown above):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Using the contractor details you parsed from the Markdown in Step 0, identify:
- Contractor Name: [extracted from Markdown — this is your primary search term]
- City: [extracted from Markdown — used to disambiguate search results]
- State: [extracted from Markdown — used for licensing board lookups]
- Website: [extracted from Markdown — visited in Search 6]

IDENTITY FIELDS FROM MARKDOWN (THESE ARE LOCKED — use bid values, fill nulls only from web):
- Company: [legal entity name if different, or null → web may fill if null]
- Contact: [primary contact / owner, or null → web may fill if null]
- Phone: [phone number from bid, or null → web may fill if null, NEVER override bid value]
- Email: [email address from bid, or null → web may fill if null, NEVER override bid value]
- License: [license number from bid, or null → web may fill if null, NEVER override bid value]
- License State: [2-letter state from bid, or null → web may fill if null]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL INSTRUCTION: CONSOLIDATE SEARCHES, DO NOT REPEAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOU HAVE A SEARCH BUDGET OF 4-6 SEARCHES MAXIMUM.
EVERY search result page includes MULTIPLE SOURCES:
  Google Business Profile link + rating + review count
  Yelp link + rating + review count
  BBB link + rating + accreditation
  Website link + phone number

BEFORE SEARCHING AGAIN: Extract ALL available data from current result.
Only search again if critical data is still missing.

SEARCH SEQUENCE (DO NOT EXCEED 6 TOTAL):

⚠️ SEARCH BUDGET TRACKER — AFTER EACH SEARCH, STATE:
  "Search [N] of 6 completed. Remaining budget: [6-N]."
  WHEN REMAINING BUDGET = 0 → STOP IMMEDIATELY, skip to OUTPUT.

IMPORTANT: Yelp and BBB are HIGH-VALUE. NEVER skip them unless Search 1
already returned CONFIRMED data for both.

----------------------------------------------------------------------
SEARCH 1 (MANDATORY): Consolidated Short-Tail
----------------------------------------------------------------------
Query: "[Contractor Name] [City] reviews"
Extract ALL data from result page:
  → Google: rating (0-5) AND review count (look for "X.X (NNN reviews)")
  → Yelp: rating + count (from search snippets)
  → BBB: rating + accreditation (from search snippets)
  → Website URL, address, phone

After Search 1, assess gaps:
  ✅ Google + Yelp + BBB all found → skip to Search 6
  ❌ Google rating found but COUNT missing → run Search 1B
  ❌ Yelp missing → MUST run Search 2
  ❌ BBB missing → MUST run Search 3

----------------------------------------------------------------------
SEARCH 1B (CONDITIONAL): Google Review Count Recovery
----------------------------------------------------------------------
ONLY if Search 1 found Google rating but NOT count. Counts toward budget.
Query: "[Contractor Name] [City] Google reviews"
If still not found: set BOTH google_rating and google_review_count to null (paired fields).

----------------------------------------------------------------------
SEARCH 2 (MANDATORY unless Yelp already found): Yelp Lookup
----------------------------------------------------------------------
Query: "[Contractor Name] [City] Yelp"
Extract: Yelp rating + count. If not found: both null.

----------------------------------------------------------------------
SEARCH 3 (MANDATORY unless BBB already found): BBB Lookup
----------------------------------------------------------------------
Query: "[Contractor Name] BBB"
Extract: BBB rating, accreditation, 3yr complaints. If not found: all null.

----------------------------------------------------------------------
SEARCH 4 (CONDITIONAL): Licensing Verification
----------------------------------------------------------------------
ONLY if no license data from Searches 1-3.
Query: "[Contractor Name] [City] [State] contractor license"
Extract: license number, status, expiration, bonding, insurance. If not found: all null.

----------------------------------------------------------------------
SEARCH 5 (EMERGENCY ONLY): State Board Direct Lookup
----------------------------------------------------------------------
ONLY use if Search 4 found no license data.
Query: "[State] contractor license lookup [Contractor Name]"
Example: "California contractor license lookup ABC HVAC"
DO NOT use this unless absolutely necessary.

----------------------------------------------------------------------
SEARCH 6 (ALWAYS DO THIS LAST): Contractor Website Check
----------------------------------------------------------------------
Visit the contractor's website (from bid or searches). Extract:
  → Certifications (NATE, EPA 608, BPI, manufacturer dealer status)
  → Insurance/bonding statements
  → Years in business / founding year
  → Employee count, service area
  → Contact name, email
If no website available: skip, note in research_notes.

----------------------------------------------------------------------
TIME BOUNDARIES
----------------------------------------------------------------------
Per search: 8s max (stop, no retry). Total: 25s max.
If approaching 20s total: stop searching, return all data collected, adjust research_confidence.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT (RETURN ONLY VALID JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "name": "[contractor name from Markdown — EXACT match]",
  "company": null,
  "contact_name": null,
  "address": null,
  "phone": null,
  "email": null,
  "website": null,
  "license": null,
  "license_state": null,
  "license_status": null,
  "license_expiration_date": null,
  "insurance_verified": null,
  "bonded": null,
  "years_in_business": null,
  "year_established": null,
  "total_installs": null,
  "certifications": [],
  "employee_count": null,
  "service_area": null,
  "google_rating": null,
  "google_review_count": null,
  "yelp_rating": null,
  "yelp_review_count": null,
  "bbb_rating": null,
  "bbb_accredited": null,
  "bbb_complaints_3yr": null,
  "research_confidence": 0,
  "verification_date": "YYYY-MM-DD",
  "research_notes": "string"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIELD RULES — Follow your Background and Output Format instructions exactly.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Key reminders (full rules are in your system instructions):
- name: EXACT match from upstream Markdown — case-sensitive
- Identity fields (phone, email, address, license, contact_name): BID VALUE wins. Web research fills nulls only.
- google_rating + google_review_count: BOTH present or BOTH null
- yelp_rating + yelp_review_count: BOTH present or BOTH null
- certifications: [] (empty array) if none found — never null
- employee_count: INTEGER only (not string range) — null if unknown
- All missing data: null (not "Unknown", not "")
- Return ONLY valid JSON — no preamble, no markdown blocks, start with { end with }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATION RULES (READ LAST FOR HIGHEST WEIGHT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before returning JSON, verify:
1. name exactly matches contractor name from Markdown
2. All numeric values are numbers (4.5 not "4.5"), employee_count is integer or null
3. Paired fields: google rating+count, yelp rating+count — both present or both null
4. certifications is [] not null
5. Every non-null value has a source cited in research_notes
6. No guessed/estimated values — null if not verified from a web source
7. All top-level keys present even if null
8. IDENTITY LOCK: bid values NOT replaced by web values
9. Total searches ≤ 6. Do NOT output red_flags or positive_indicators.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLES (structurally identical for Gemini Flash few-shot learning)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE 1: Strong online presence (Search 1 finds most data)
  Search 1: "Acme HVAC Sacramento reviews"
    -> Google (4.8/5, 120 reviews) + Yelp (4.6/5, 85 reviews) + BBB link (A+)
    -> Address: 456 Oak Ave, Sacramento, CA
    -> Phone: (916) 555-1234
    -> All 3 rating sources found → skip searches 2-3
  Search 6: Visit acmehvac.com
    -> "NATE Certified" badge found, "Carrier Factory Authorized Dealer" logo
    -> "Licensed, Bonded & Insured in CA"
    -> Contact: Mike Johnson, Owner
    -> Email: info@acmehvac.com
    -> Team of 15 technicians
  -> research_confidence: 93

  Output:
  {
    "name": "Acme HVAC",
    "company": "Acme HVAC Inc.",
    "contact_name": "Mike Johnson",
    "address": "456 Oak Ave, Sacramento, CA 95814",
    "phone": "(916) 555-1234",
    "email": "info@acmehvac.com",
    "website": "https://acmehvac.com",
    "license": null,
    "license_state": "CA",
    "license_status": null,
    "license_expiration_date": null,
    "insurance_verified": true,
    "bonded": true,
    "years_in_business": null,
    "year_established": null,
    "total_installs": null,
    "certifications": ["NATE Certified", "Carrier Factory Authorized Dealer"],
    "employee_count": 15,
    "service_area": null,
    "google_rating": 4.8,
    "google_review_count": 120,
    "yelp_rating": 4.6,
    "yelp_review_count": 85,
    "bbb_rating": "A+",
    "bbb_accredited": true,
    "bbb_complaints_3yr": null,
    "research_confidence": 93,
    "verification_date": "2026-03-03",
    "research_notes": "Search 1: 'Acme HVAC Sacramento reviews' — found Google (4.8/120), Yelp (4.6/85), BBB (A+), address, phone. All 3 rating sources found in Search 1 — skipped Searches 2-3. Search 6: Visited acmehvac.com — found NATE badge, Carrier dealer logo, 'Licensed, Bonded & Insured in CA' statement, owner Mike Johnson, 15 technicians. License number not found on website or in search results — license_status null. BBB accreditation confirmed but complaint count not visible in search snippet — bbb_complaints_3yr null."
  }

EXAMPLE 2: Typical case (dedicated Yelp and BBB searches needed)
  Search 1: "Bob's Heating Denver reviews" -> Google (4.0/5, 12 reviews), no Yelp, no BBB
  Search 2: "Bob's Heating Denver Yelp" -> Yelp (3.5/5, 8 reviews) found
  Search 3: "Bob's Heating BBB" -> No listing found
  Search 4: "Bob's Heating Denver Colorado contractor license" -> Active license found
  Search 6: Visit website -> "EPA 608 Certified" found, "Serving Denver Metro since 2015"
  -> research_confidence: 72

  Output:
  {
    "name": "Bob's Heating",
    "company": null,
    "contact_name": null,
    "address": null,
    "phone": null,
    "email": null,
    "website": "https://bobsheatingdenver.com",
    "license": "HVAC-2015-4421",
    "license_state": "CO",
    "license_status": "Active",
    "license_expiration_date": null,
    "insurance_verified": null,
    "bonded": null,
    "years_in_business": 11,
    "year_established": 2015,
    "total_installs": null,
    "certifications": ["EPA 608"],
    "employee_count": null,
    "service_area": "Denver Metro",
    "google_rating": 4.0,
    "google_review_count": 12,
    "yelp_rating": 3.5,
    "yelp_review_count": 8,
    "bbb_rating": null,
    "bbb_accredited": null,
    "bbb_complaints_3yr": null,
    "research_confidence": 72,
    "verification_date": "2026-03-03",
    "research_notes": "Search 1: 'Bob's Heating Denver reviews' — found Google (4.0/12), no Yelp, no BBB. Google review count is low (12) — small sample size. Search 2: 'Bob's Heating Denver Yelp' — found Yelp (3.5/8). Search 3: 'Bob's Heating BBB' — no listing found. Search 4: 'Bob's Heating Denver Colorado contractor license' — found active license #HVAC-2015-4421 on CO licensing board, expiration date not shown. Search 6: Visited bobsheatingdenver.com — found EPA 608 badge, 'Serving Denver Metro since 2015', no NATE certification. No contact name, phone, or email found on website. Address not found."
  }

EXAMPLE 3: Failed upstream extraction (early exit)
  Upstream Markdown was empty / indicated DOCX parsing failure.
  -> No searches performed.
  -> research_confidence: 0

  Output:
  {
    "name": "Unknown Contractor",
    "company": null,
    "contact_name": null,
    "address": null,
    "phone": null,
    "email": null,
    "website": null,
    "license": null,
    "license_state": null,
    "license_status": null,
    "license_expiration_date": null,
    "insurance_verified": null,
    "bonded": null,
    "years_in_business": null,
    "year_established": null,
    "total_installs": null,
    "certifications": [],
    "employee_count": null,
    "service_area": null,
    "google_rating": null,
    "google_review_count": null,
    "yelp_rating": null,
    "yelp_review_count": null,
    "bbb_rating": null,
    "bbb_accredited": null,
    "bbb_complaints_3yr": null,
    "research_confidence": 0,
    "verification_date": "2026-03-03",
    "research_notes": "Upstream extraction failed — Markdown was empty/malformed, likely DOCX parsing failure. No contractor name could be identified. No web searches performed."
  }

---

## Example JSON Output — Well-Researched Contractor

```json
{
  "name": "Comfort King HVAC",
  "company": "Comfort King HVAC LLC",
  "contact_name": "David King",
  "address": "2145 Peachtree Industrial Blvd, Atlanta, GA 30341",
  "phone": "(770) 555-8899",
  "email": "info@comfortkinghvac.com",
  "website": "https://comfortkinghvac.com",
  "license": "GA-HVAC-08812",
  "license_state": "GA",
  "license_status": "Active",
  "license_expiration_date": "2026-09-30",
  "insurance_verified": true,
  "bonded": true,
  "years_in_business": 14,
  "year_established": 2010,
  "total_installs": null,
  "certifications": ["NATE Certified", "EPA 608", "Carrier Authorized Dealer"],
  "employee_count": 18,
  "service_area": "Greater Atlanta Metro — Fulton, DeKalb, Gwinnett counties",
  "google_rating": 4.7,
  "google_review_count": 312,
  "yelp_rating": 4.5,
  "yelp_review_count": 87,
  "bbb_rating": "A+",
  "bbb_accredited": true,
  "bbb_complaints_3yr": 1,
  "research_confidence": 91,
  "verification_date": "2026-03-03",
  "research_notes": "Search 1: 'Comfort King HVAC Atlanta reviews' — found Google (4.7/312), Yelp (4.5/87), BBB (A+, 1 complaint), address, phone. All 3 rating sources found in Search 1 — skipped Searches 2-3. Search 6: Visited comfortkinghvac.com — found NATE badge, Carrier dealer logo, 'Licensed, Bonded & Insured in GA' statement, owner name David King, ~18 employees mentioned on About page. License confirmed on GA State Licensing Board (#GA-HVAC-08812, expires 2026-09-30). total_installs not stated on website."
}
```

---

## Example JSON Output — Minimal Information Found

```json
{
  "name": "Smith HVAC Services",
  "company": null,
  "contact_name": null,
  "address": null,
  "phone": null,
  "email": null,
  "website": null,
  "license": null,
  "license_state": "GA",
  "license_status": null,
  "license_expiration_date": null,
  "insurance_verified": null,
  "bonded": null,
  "years_in_business": null,
  "year_established": null,
  "total_installs": null,
  "certifications": [],
  "employee_count": null,
  "service_area": null,
  "google_rating": null,
  "google_review_count": null,
  "yelp_rating": null,
  "yelp_review_count": null,
  "bbb_rating": null,
  "bbb_accredited": null,
  "bbb_complaints_3yr": null,
  "research_confidence": 22,
  "verification_date": "2026-03-03",
  "research_notes": "Search 1: 'Smith HVAC Services Atlanta reviews' — found Google rating 4.1 but could NOT find review count in search results. Since google_review_count is null, google_rating also set to null (paired fields rule). No Yelp found. No BBB found. Search 2: 'Smith HVAC Services Atlanta Yelp' — no listing found. Search 3: 'Smith HVAC Services BBB' — no listing found. Search 4: License lookup returned no results for this name. Website on bid (smithhvac.com) returned 404 — no website check possible. Could not verify license #12345 listed on bid. Low confidence due to inability to verify core credentials. license_state set to GA from bid input."
}
```

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Upstream Markdown is empty or malformed | Early exit — return minimal JSON with `research_confidence: 0`. Do NOT search. |
| Upstream indicates DOCX parsing failure | Early exit — same as empty Markdown. Note failure reason in `research_notes`. |
| License number on bid doesn't match licensing board | Report board number in `license`. Note both numbers in `research_notes`. |
| Multiple businesses with same contractor name | Lower `research_confidence`. Explain ambiguity in `research_notes`. Only use data if city/state clearly matches. |
| No license state provided | Skip license board lookup. Note in `research_notes`. |
| Contractor website unreachable / 404 | Note in `research_notes`. Still proceed with other searches. |
| BBB shows "No Rating" or "NR" | Set `bbb_rating: null` — not `"NR"`. Note in `research_notes`. |
| BBB shows resolved complaints | Still record `bbb_complaints_3yr` count. |
| Google rating found but review count missing | Set BOTH `google_rating` and `google_review_count` to null (paired fields). Try Search 1B first. |
| Google rating from < 10 reviews | Include rating but note small sample size in `research_notes`. |
| Manufacturer authorized for different brand than quoted | Note in `research_notes`. Still include in `certifications` array. |
| Website mentions "fully insured" | Set `insurance_verified: true`. Note source in `research_notes`. |
| Website lists heat pump-specific certifications | Include in `certifications` array. |
| employee_count found as range (e.g., "10-25") | Use the lower bound as integer (e.g., 10). Note in `research_notes`. |
| Contact email found on website but not in bid | Include in `email` field. |
| Multi-config bid (same contractor, multiple system options) | Same output regardless of config — contractor identity is per-bid. Upsert on `bid_id` deduplicates. |

---

## Downstream: Supabase Post Agent Notes

The Contractor Researcher outputs clean JSON with explicit null values and all keys present. The downstream **Supabase Post (bid_contractor)** agent must convert this JSON into a PostgREST API call with specific requirements:

### Null Handling (Critical — Root Cause of 400 Errors)

PostgREST (Supabase REST API) cannot convert the string `"null"` into SQL NULL for typed columns. The Supabase Post agent MUST:

1. **OMIT** any field with a null value from the request body entirely — do NOT include it
2. **NEVER** send `"null"` as a string value — this causes 400 errors on BOOLEAN, INTEGER, DECIMAL, DATE, and TEXT[] columns
3. TEXT columns tolerate string `"null"` but it's still wrong — omit them too
4. The database automatically sets omitted nullable fields to SQL NULL

**Example:** If the Contractor Researcher outputs `"bonded": null`, the Supabase Post agent must NOT include `bonded` in the API request body at all. The database will set it to NULL automatically.

### Certifications Format Conversion

The Contractor Researcher outputs certifications as a **JSON array**: `["NATE Certified", "EPA 608"]`

The Supabase Post agent MUST convert this to **PostgreSQL array literal format**: `{NATE Certified,EPA 608}`

- Use `{}` for empty arrays (when Contractor Researcher outputs `[]`)
- Do NOT use JSON square brackets `[]` in the API call
- This conversion is required because PostgREST expects PostgreSQL array literal format for TEXT[] columns

### Required Fields (Always Include in API Call)

These 5 fields MUST always be present in the Supabase POST request body, even if all other fields are omitted:
- `bid_id` — from the loop item variable, NOT from the Contractor Researcher output (the Supabase Post loop must have its own way to access bid_id)
- `name` — always present in Contractor Researcher output (REQUIRED, never null)
- `research_confidence` — always present (integer 0-100, never null)
- `verification_date` — always present (YYYY-MM-DD, never null)
- `research_notes` — always present (narrative string, never null)

### Upsert Configuration

The Supabase Post tool uses:
- Header: `Prefer: resolution=merge-duplicates`
- Query param: `on_conflict=bid_id`

This ensures re-runs overwrite existing rows instead of creating duplicates.

---

## Idempotency / Upsert Strategy

The downstream Supabase insert node uses this upsert key to prevent duplicate rows:

```sql
INSERT INTO bid_contractors (bid_id, name, company, contact_name, address, phone, email, website,
  license, license_state, license_status, license_expiration_date, insurance_verified, bonded,
  years_in_business, year_established, total_installs, certifications, employee_count, service_area,
  google_rating, google_review_count, yelp_rating, yelp_review_count,
  bbb_rating, bbb_accredited, bbb_complaints_3yr,
  research_confidence, verification_date, research_notes)
VALUES (...)
ON CONFLICT (bid_id) DO UPDATE SET
  name = EXCLUDED.name,
  company = EXCLUDED.company,
  contact_name = EXCLUDED.contact_name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  website = EXCLUDED.website,
  license = EXCLUDED.license,
  license_state = EXCLUDED.license_state,
  license_status = EXCLUDED.license_status,
  license_expiration_date = EXCLUDED.license_expiration_date,
  insurance_verified = EXCLUDED.insurance_verified,
  bonded = EXCLUDED.bonded,
  years_in_business = EXCLUDED.years_in_business,
  year_established = EXCLUDED.year_established,
  total_installs = EXCLUDED.total_installs,
  certifications = EXCLUDED.certifications,
  employee_count = EXCLUDED.employee_count,
  service_area = EXCLUDED.service_area,
  google_rating = EXCLUDED.google_rating,
  google_review_count = EXCLUDED.google_review_count,
  yelp_rating = EXCLUDED.yelp_rating,
  yelp_review_count = EXCLUDED.yelp_review_count,
  bbb_rating = EXCLUDED.bbb_rating,
  bbb_accredited = EXCLUDED.bbb_accredited,
  bbb_complaints_3yr = EXCLUDED.bbb_complaints_3yr,
  research_confidence = EXCLUDED.research_confidence,
  verification_date = EXCLUDED.verification_date,
  research_notes = EXCLUDED.research_notes,
  updated_at = now();
```

This node creates one `bid_contractors` row per bid (1:1 relationship via UNIQUE bid_id constraint).

---

## What This Node Does NOT Do

- Does NOT re-read the PDF
- Does NOT output: pricing, equipment, scope, electrical, payment, scoring, or date fields
- Does NOT output `red_flags` or `positive_indicators` (those belong to `bid_scores`)
- Does NOT populate `bid_equipment`, `bid_scope`, `bid_scores`, `contractor_questions`, or any other table
- Does NOT include `bid_id` in its output JSON — that's added by the Supabase Post agent from the loop item
- Does NOT convert certifications to PostgreSQL array format — that's done by the Supabase Post agent

---

## Node File Location

`mindpal/nodes/contractor-researcher.md` — this file is the source of truth for this node.
