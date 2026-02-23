# Contractor Researcher Node — Full Build Spec

**Version:** v2 (aligned with SCHEMA_V2_COMPLETE.html — bid_contractors table)
**Last updated:** February 2026
**Format:** Matches equipment researcher spec style

---

## How This Node Fits the Architecture

The **Equipment Researcher** is the upstream Loop Node that enriches equipment specs via web research and passes a fully populated bid object downstream. It does NOT research the contractor — it only touches the `equipment` array.

The **Contractor Researcher** receives that same bid object (one per iteration via `{{#currentItem}}`), takes the contractor name, city, state, and website already extracted from the PDF, and then:
1. Passes through identity fields (name, company, phone, email, website) from the upstream extraction
2. Runs consolidated web searches to verify licensing, ratings, and reputation
3. Visits the contractor's website to extract certifications and credentials
4. Outputs DB-ready JSON that maps directly to `bid_contractors` Supabase columns

This node is the **only node that writes contractor reputation data**. The Bid Data Extractor writes what's in the PDF; this node writes what's verifiable on the web.

---

## Why Loop Node

The Contractor Researcher processes each bid's contractor independently:

- **Isolation**: Each contractor researched in its own context — no cross-contamination of search results
- **Search budget**: 4-6 searches per contractor stays manageable per iteration
- **Debugging**: If research fails for one contractor, others are unaffected
- **Match**: Each bid has exactly one contractor — one iteration = one contractor profile

---

## Agent Configuration — NEW AGENT

| Setting | Value |
|---------|-------|
| Agent Title | Contractor Researcher |
| Create as | **New agent from scratch** |
| JSON Mode | ON |
| Web Search | ON (required — must be enabled) |
| Website Browse | ON (required — used for Search 6 website visit) |
| Knowledge Base | None required |
| Model | GPT-4o or Claude 3.5 Sonnet |
| Max Output Length | Auto |
| Temperature | Low / Auto |

---

## Loop Node Configuration

| Field | Value |
|-------|-------|
| "For each item in" | `@[Equipment Researcher]` — **must show purple** in MindPal UI |
| Agent | Contractor Researcher |
| Task | See Task Prompt below |
| Max items | 5 |

---

## MindPal Agent: Background (System Instructions Section 1)

```
<role>
You are an HVAC contractor reputation and licensing researcher. You receive a bid object for a single contractor's HVAC proposal — the bid has already been extracted from the PDF by the Bid Data Extractor and enriched by the Equipment Researcher. Your job is to research this contractor on the web and return verified business information: licensing status, Google/Yelp/BBB ratings, certifications, bonding, and reputation data as DB-ready JSON.
</role>

<scope>
You output contractor identity and reputation fields for the bid_contractors table:
- Identity: name, company, contact_name, address, phone, email, website
- Licensing: license, license_state, license_status, license_expiration_date, insurance_verified, bonded
- Experience: years_in_business, year_established, total_installs, certifications, employee_count, service_area
- Ratings: google_rating, google_review_count, yelp_rating, yelp_review_count, bbb_rating, bbb_accredited, bbb_complaints_3yr
- Research metadata: research_confidence, verification_date, research_notes

Identity fields (name, company, contact_name, phone, email, website) are PASSED THROUGH from the upstream extraction. You verify and enrich them via web research but do not discard them.

You do NOT output: pricing, equipment specs, scope items, electrical panel data, payment terms, bid dates, red_flags, positive_indicators, or scoring data. Red flags and positive indicators belong to bid_scores (Node 5: Scoring Engine).
</scope>

<input_format>
Your input is the output of the Equipment Researcher — a structured JSON bid object with contractor info at the top level (contractor_name, contractor_company, contractor_website, contractor_license, contractor_license_state, etc.) and equipment/pricing/scope data in nested fields.

The contractor fields you receive were extracted from the PDF — they tell you who the contractor is. Your job is to VERIFY and ENRICH those fields via web research, not to re-extract them. Pass through identity fields from the input and add research-verified fields.
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
STEP 1 — CONSOLIDATED SEARCH: Run Search 1 ("[Contractor Name] [City] reviews") and extract ALL available data from the results page before searching again. A single search results page will often show Google rating, Yelp rating, BBB link, and website simultaneously.

STEP 2 — CONDITIONAL SEARCHES: Only run Searches 2-5 if critical data is still missing after extracting everything from Search 1. Each search should target a specific gap (license, BBB, etc.) — do not repeat searches that already returned data.

STEP 3 — WEBSITE VISIT: Always visit the contractor's website (if available) as the last step. Contractor websites are the best source for certifications, manufacturer dealer status, bonding statements, and years in business.

STEP 4 — OUTPUT: Return flat JSON matching the bid_contractors Supabase schema exactly.
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

VALIDATED SOURCES ONLY:
- Google Business Profile (ratings, reviews, address, phone)
- Yelp Business Pages (ratings, reviews)
- Better Business Bureau / bbb.org (rating, accreditation, complaints)
- State licensing board websites (license status, expiration)
- Contractor's own website (certifications, credentials, years in business)
- Manufacturer dealer locators (authorized dealer status)

DO NOT cite or use:
- AI training data / general knowledge
- Assumptions based on company name or location
- "Common industry practice" as a substitute for actual data
- Data from unrelated businesses with similar names
</data_integrity>

<rules>
1. NEVER fabricate data. If you cannot find a value, use null.
2. NEVER modify name — it must exactly match the input bid's contractor name.
3. NEVER modify any pricing, equipment, scope, electrical, payment, or date fields from the bid.
4. null is always preferred over a guess, "Unknown", or empty string.
5. All numeric fields (ratings, counts, years, employee_count) must be numbers — not strings.
6. All date fields must be YYYY-MM-DD format.
7. bbb_rating must be an exact letter grade (A+, A, A-, B+, B, B-, C, F) or null — never a description.
8. license_status must be exactly "Active", "Inactive", or "Expired" or null — never other values.
9. research_confidence is a self-assessed integer 0-100 based on how many sources were found and verified.
10. verification_date must be today's date in YYYY-MM-DD format.
11. employee_count must be an INTEGER (e.g., 12, 25, 50) — NOT a string range. Use null if unknown.
12. Do NOT exceed 6 searches total per contractor.
13. Do NOT wrap output in markdown code blocks. Return raw JSON only.
14. Do NOT output red_flags or positive_indicators — those belong to bid_scores (Scoring Engine).
</rules>
```

---

## MindPal Agent: Desired Output Format (System Instructions Section 2)

```
<output_schema>
Output ONLY valid JSON. No markdown. No code blocks. No explanation. No text before or after.

Your output must be a JSON object with this exact structure:

{
  "name": "string — must exactly match input contractor name",
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
- name: REQUIRED. Must exactly match input bid's contractor name — case-sensitive.
- All top-level keys MUST be present, even if values are null or [].
- Identity fields (company, contact_name, phone, email, website): pass through from input if available, enrich from web research if missing.
- employee_count: INTEGER (e.g., 12, 25) — NOT a string range. Null if unknown.
- research_confidence scale:
    90-100: Google + Yelp + BBB + License all found and verified
    70-89:  Google + Yelp found, BBB or license missing
    40-69:  Only 1-2 sources found
    0-39:   Timeout or minimal/no results

Output fields map 1:1 to bid_contractors columns. No transformation needed.
Do NOT include id, bid_id, created_at, or updated_at — those are set by the database.
Do NOT include red_flags or positive_indicators — those belong to bid_scores.
</output_schema>
```

---

## Node Overview

| Property | Value |
|---|---|
| Node Key | `contractor-researcher` |
| Node Type | LOOP (iterates over each bid) |
| Target Table | `bid_contractors` (1:1 with bids, UNIQUE on bid_id) |
| Loop Source | Output of Equipment Researcher node |
| Prerequisites | `bid.contractor_name`, `bid.customer_info.property_city`, `bid.customer_info.property_state`, `bid.contractor_website` |
| Upsert Key | `bid_id` (UNIQUE constraint) |
| Writes New Row? | YES — creates one `bid_contractors` row per bid |
| Model | GPT-4o or Claude 3.5 Sonnet (web search required — must have Browse/Search tool enabled) |
| Search Budget | 4-6 searches maximum per contractor |

---

## What This Node Does

The Contractor Researcher receives the enriched bid object from the Equipment Researcher and performs web-based research on the contractor. It passes through identity fields from upstream extraction and enriches contractor reputation, licensing, and certification fields via web research.

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

### Identity (passed through from upstream + enriched by research)
| DB Column | Type | Source |
|---|---|---|
| `name` | TEXT NOT NULL | From bid extraction (REQUIRED) |
| `company` | TEXT | From bid / web research |
| `contact_name` | TEXT | From bid / web research |
| `address` | TEXT | Web research |
| `phone` | TEXT | From bid / web research |
| `email` | TEXT | Web research |
| `website` | TEXT | From bid / web research |

### Licensing (research-verified)
| DB Column | Type | Source |
|---|---|---|
| `license` | TEXT | From bid / state licensing board |
| `license_state` | TEXT | From bid / state licensing board |
| `license_status` | TEXT | State licensing board |
| `license_expiration_date` | DATE | State licensing board |
| `insurance_verified` | BOOLEAN | Web research |
| `bonded` | BOOLEAN | License board / research |

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

> Paste this entire block as the agent's task prompt. Variables (`{{bid.contractor_name}}`, `{{bid.customer_info.property_city}}`, etc.) **must show purple** in the MindPal UI — if they appear as plain text, data won't flow.

---

You are researching ONE contractor's business information using CONSOLIDATED SHORT-TAIL SEARCHES with a STRICT SEARCH BUDGET OF 4-6 SEARCHES MAXIMUM.

CONTRACTOR TO RESEARCH:
Name: {{bid.contractor_name}}
City: {{bid.customer_info.property_city}}
State: {{bid.customer_info.property_state}}
Website (from bid): {{bid.contractor_website}}

IDENTITY FIELDS FROM BID (pass through to output):
Company: {{bid.contractor_company}}
Contact: {{bid.contractor_contact_name}}
Phone: {{bid.contractor_phone}}
Email: {{bid.contractor_email}}
License: {{bid.contractor_license}}
License State: {{bid.contractor_license_state}}

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
----------------------------------------------------------------------
SEARCH 1 (MANDATORY): Consolidated Short-Tail
----------------------------------------------------------------------
Query: "[Contractor Name] [City] reviews"
Example: "ABC HVAC Mill Valley reviews"

Extract ALL data from result page:
  Google Business Profile link
  Google rating (0-5 scale)
  Google review count
  Yelp profile link
  Yelp rating (0-5 scale)
  Yelp review count
  BBB link (if visible)
  Company website
  Phone number
  Business address
  Years in business (if mentioned)
  Service area

If Search 1 returns comprehensive data (Google rating + review count + Yelp + BBB):
  -> SKIP searches 2-5 immediately
  -> Proceed to Website Check (Search 6)
  -> Mark research_confidence: 85-95

----------------------------------------------------------------------
SEARCH 2 (CONDITIONAL): Enhanced Short-Tail
----------------------------------------------------------------------
ONLY search if Search 1 was incomplete.
Query: "[Contractor Name] [City] [State] contractor license"
Example: "ABC HVAC Mill Valley California contractor license"

Extract:
  License number
  License status (Active/Inactive/Expired)
  License expiration date
  License classification
  Bonding status (if visible)
  Insurance status (if visible)

If this search provides the missing licensing data:
  -> STOP here unless BBB is still missing
  -> Mark research_confidence: 80-90

----------------------------------------------------------------------
SEARCH 3 (LAST RESORT): BBB Direct Lookup
----------------------------------------------------------------------
ONLY search if BBB rating still missing from searches 1-2.
Query: "[Contractor Name] BBB"
Example: "ABC HVAC BBB"

Extract:
  BBB rating (A+, A, A-, B+, B, B-, C, F)
  BBB accreditation status
  BBB complaints (3-year)
  Business address
  Phone number

If NOT found:
  -> Mark bbb_rating: null, bbb_accredited: null, bbb_complaints_3yr: null
  -> Proceed to Website Check

----------------------------------------------------------------------
SEARCH 4 (ONLY IF NEEDED): State Licensing Verification
----------------------------------------------------------------------
ONLY search if no license data found in searches 1-3.
Query: "[State] contractor license lookup [Contractor Name]"
Example: "California contractor license lookup ABC HVAC"

Extract:
  License number
  License status
  License classification

If no results -> return null for all license fields

----------------------------------------------------------------------
SEARCH 5 (EMERGENCY ONLY): Final Data Recovery
----------------------------------------------------------------------
ONLY use this if critical data gaps remain.
Query: "[Contractor Name] business information"
DO NOT use this unless absolutely necessary.

----------------------------------------------------------------------
SEARCH 6 (ALWAYS DO THIS LAST): Contractor Website Check
----------------------------------------------------------------------
IF {{bid.contractor_website}} is not null, visit the contractor's website.

On the website, extract the following if available:
  Permits listed or mentioned (e.g., "licensed, bonded, and permitted in CA")
  Insurance mentioned (e.g., "fully insured")
  NATE certification badges or logos
  EPA 608 certification
  BPI certification
  Manufacturer authorized dealer status (e.g., "Carrier Factory Authorized Dealer")
  Other certification logos or seals
  Number of years in business / founding year
  Service area described
  Employee count or team size
  Contact email address
  Contact name / owner name
  Any awards or recognitions
  Specific heat pump installation experience mentioned

If {{bid.contractor_website}} is null:
  -> Skip this search, note in research_notes

----------------------------------------------------------------------
TIME BOUNDARIES
----------------------------------------------------------------------
If any single search takes >8 seconds:
  -> Stop that search immediately
  -> Return all data collected so far
  -> Do NOT retry that search
  -> Note "Search timeout" in research_notes

If you approach 20 seconds total:
  -> Do NOT start a new search
  -> Return all data collected
  -> Set research_confidence accordingly

Maximum allowed: 25 seconds per contractor total.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT (RETURN ONLY VALID JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "name": "{{bid.contractor_name}}",
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
FIELD RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IDENTITY FIELDS (pass through from input, enrich from research):
- name: MUST EXACTLY match {{bid.contractor_name}} — do not alter case or spelling
- company: Legal company name if different from display name. Pass through from input or null.
- contact_name: Primary contact person. Pass through from input or enrich from website.
- address: Business address from Google/BBB/website. Null if not found.
- phone: Phone number from bid or search results. Null if not found.
- email: Email from bid or website. Null if not found.
- website: Company website URL from bid or search results. Null if not found.

LICENSING FIELDS:
- license: Verified number from licensing board (may differ from bid). Null if not found.
- license_state: Two-letter state abbreviation (e.g., "CO", "CA"). From bid or research.
- license_status: Only "Active", "Inactive", or "Expired" — null if not found
- license_expiration_date: YYYY-MM-DD — null if not found
- insurance_verified: Boolean — true only if insurance confirmed via web source. Null if unknown.
- bonded: Boolean — null if unknown

EXPERIENCE FIELDS:
- years_in_business: Integer — calculate from year_established if needed
- year_established: Integer (e.g., 2008) — null if unknown
- total_installs: Integer — total heat pump installations if found on website. Null if unknown.
- certifications: String array of names found (e.g., ["NATE Certified", "EPA 608"])
- employee_count: INTEGER (e.g., 12, 25, 50) — NOT a string range. Null if unknown.
- service_area: Plain text (e.g., "Greater Atlanta Metro") — null if unknown

RATINGS FIELDS:
- google_rating: Decimal 0.0-5.0 — null if not found
- google_review_count: Integer — null if not found
- yelp_rating: Decimal 0.0-5.0 — null if not found
- yelp_review_count: Integer — null if not found
- bbb_rating: Exact grade (A+, A, A-, B+, B, B-, C, F) — null if no listing
- bbb_accredited: Boolean — null if no BBB listing
- bbb_complaints_3yr: Integer — null if no BBB listing (use 0 only if confirmed zero)

RESEARCH METADATA:
- research_confidence: Integer 0-100 (see scale below)
- verification_date: Today's date in YYYY-MM-DD
- research_notes: Narrative of searches performed, sources used, what was and wasn't found, timeouts or gaps

RESEARCH CONFIDENCE SCALE:
  90-100: Found Google + Yelp + BBB + License (comprehensive)
  70-89:  Found Google + Yelp, missing BBB or license
  40-69:  Found 1-2 sources only
  0-39:   Timeout or minimal/no results found

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATION RULES (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MUST DO:
  1. name MUST EXACTLY match {{bid.contractor_name}} — case-sensitive
  2. All numeric ratings must be numbers: 4.5 NOT "4.5"
  3. employee_count must be an integer: 12 NOT "10-25"
  4. All missing data uses null (not "Unknown", not "")
  5. Return ONLY valid JSON — no preamble, no explanation, no markdown blocks
  6. Start with { and end with }
  7. All top-level keys MUST be present even if null
  8. Explain all gaps in research_notes
  9. verification_date must be today's date in YYYY-MM-DD

DO NOT DO:
  1. Do NOT include any text before or after the JSON
  2. Do NOT wrap output in ```json``` code blocks
  3. Do NOT omit any fields from the schema
  4. Do NOT use "yes"/"no" for booleans — use true/false
  5. Do NOT invent or guess data — use null if not found
  6. Do NOT exceed 6 searches
  7. Do NOT output red_flags or positive_indicators (those belong to bid_scores)
  8. Do NOT use string ranges for employee_count (use integer or null)

HANDLING RESEARCH GAPS:
  - No license found -> license: null, license_status: null
  - No Google reviews -> google_rating: null, google_review_count: null
  - No BBB listing -> bbb_rating: null, bbb_accredited: null, bbb_complaints_3yr: null
  - No certifications -> certifications: []
  - Website unavailable -> skip website check, note in research_notes
  - Multiple businesses with same name -> lower research_confidence, explain in research_notes
  - Insurance not mentioned -> insurance_verified: null (NOT false)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE 1: Strong online presence
  Search 1: "Acme HVAC Sacramento reviews"
    -> Google (4.8/5, 120 reviews) + Yelp (4.6/5, 85 reviews) + BBB link (A+)
    -> Address: 456 Oak Ave, Sacramento, CA
    -> Phone: (916) 555-1234
  Search 6: Visit acmehvac.com
    -> "NATE Certified" badge found, "Carrier Factory Authorized Dealer" logo
    -> "Licensed, Bonded & Insured in CA"
    -> Contact: Mike Johnson, Owner
    -> Email: info@acmehvac.com
    -> Team of 15 technicians
  -> research_confidence: 93

EXAMPLE 2: Weak online presence
  Search 1: "Bob's HVAC Denver reviews" -> Google (4.0/5, 12 reviews), no Yelp
  Search 2: "Bob's HVAC Denver Colorado contractor license" -> Active license found
  Search 3: "Bob's HVAC BBB" -> No listing
  Search 6: Visit website -> "EPA 608 Certified" found
  -> research_confidence: 62

EXAMPLE 3: No online presence
  Search 1: "Unknown Contractor Portland reviews" -> No results
  Search 2: "Unknown Contractor Portland Oregon license" -> No results
  Search 3: "Unknown Contractor BBB" -> No results
  Search 6: Website null — skipped
  -> All ratings null
  -> research_confidence: 10

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
  "verification_date": "2026-02-22",
  "research_notes": "Search 1: 'Comfort King HVAC Atlanta reviews' — found Google (4.7/312), Yelp (4.5/87), BBB (A+, 1 complaint), address, phone. Search 2 skipped (comprehensive). Search 6: Visited comfortkinghvac.com — found NATE badge, Carrier dealer logo, 'Licensed, Bonded & Insured in GA' statement, owner name David King, ~18 employees mentioned on About page. License confirmed on GA State Licensing Board (#GA-HVAC-08812, expires 2026-09-30). total_installs not stated on website."
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
  "google_rating": 4.1,
  "google_review_count": 12,
  "yelp_rating": null,
  "yelp_review_count": null,
  "bbb_rating": null,
  "bbb_accredited": null,
  "bbb_complaints_3yr": null,
  "research_confidence": 22,
  "verification_date": "2026-02-22",
  "research_notes": "Search 1: 'Smith HVAC Services Atlanta reviews' — found Google (4.1/12), no Yelp, no BBB link. Search 2: License lookup returned no results for this name. Search 3: BBB search returned no listing. Website on bid (smithhvac.com) returned 404 — no website check possible. Could not verify license #12345 listed on bid. Low confidence due to inability to verify core credentials. license_state set to GA from bid input."
}
```

---

## Edge Cases

| Scenario | Handling |
|---|---|
| License number on bid doesn't match licensing board | Report board number in `license`. Note both numbers in `research_notes`. |
| Multiple businesses with same contractor name | Lower `research_confidence`. Explain ambiguity in `research_notes`. Only use data if city/state clearly matches. |
| No license state provided | Skip license board lookup. Note in `research_notes`. |
| Contractor website unreachable / 404 | Note in `research_notes`. Still proceed with other searches. |
| BBB shows "No Rating" or "NR" | Set `bbb_rating: null` — not `"NR"`. Note in `research_notes`. |
| BBB shows resolved complaints | Still record `bbb_complaints_3yr` count. |
| Google rating from < 10 reviews | Include rating but note small sample size in `research_notes`. |
| Manufacturer authorized for different brand than quoted | Note in `research_notes`. Still include in `certifications` array. |
| Website mentions "fully insured" | Set `insurance_verified: true`. Note source in `research_notes`. |
| Website lists heat pump-specific certifications | Include in `certifications` array. |
| employee_count found as range (e.g., "10-25") | Use the midpoint or lower bound as integer (e.g., 15 or 10). Note in `research_notes`. |
| Contact email found on website but not in bid | Include in `email` field. |

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

---

## Node File Location

`mindpal/nodes/contractor-researcher.md` — this file is the source of truth for this node.
