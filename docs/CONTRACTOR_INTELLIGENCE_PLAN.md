# Contractor Intelligence Service — California-First Build Plan

## Context

The current MindPal Contractor Researcher does 4-6 web searches per contractor (slow, unreliable, shallow). We're building a **standalone Contractor Intelligence module** — its own page, its own Edge Function, its own data table. Zero impact on the existing MindPal workflow. Later we wire them together.

**Scope:** California only (for now). Architecture supports multi-state expansion later via provider abstraction.

**Cost target: $0/month** — direct scraping, free Google API tier, free government data portals. No Apify, no Shovels.

---

## Part A: Quick-Extract at Upload — The Fast Path

### The Opportunity

Right now, contractor research can't start until MindPal finishes extracting bids (3-5 minutes). But the contractor name, phone, license#, and city are almost always on **page 1** of a bid PDF — in the letterhead, header, or signature block. If we extract just those fields immediately at upload, we can kick off contractor research + incentive finder **in parallel** with MindPal's deep analysis.

**User experience improvement:**
```
CURRENT:  Upload → Wait 3-5 min for MindPal → Then contractor research starts
PROPOSED: Upload → Quick-extract (2-3 sec) → Contractor research + incentive finder start immediately
                  └→ MindPal deep analysis runs in parallel (3-5 min)
```

### Recommended Approach: Edge Function + Lightweight LLM

**Why not client-side pdf.js + regex?**
- `pdfjs-dist` is ~500KB gzipped — significant bundle bloat for a one-time operation
- PDF text extraction with pdf.js produces unstructured text blocks — positional info is lost
- Regex for contractor names is unreliable (no consistent format across bid documents)
- HVAC bids often use non-standard layouts, tables, embedded images for logos
- Would need to handle scanned PDFs (image-only) — pdf.js can't extract text from those

**Why Edge Function + lightweight LLM is better:**
- **No frontend bundle impact** — all processing happens server-side
- **2-3 seconds** — a small model processes a single page in ~1-2s, plus network overhead
- **High accuracy** — LLM understands context ("this is a letterhead", "this is a license number") far better than regex
- **Already have the pattern** — the `start-mindpal-analysis` Edge Function already generates signed URLs for PDFs; we reuse that same flow
- **Handles messy formats** — tables, multi-column layouts, even OCR'd scans (multimodal models)

### Model Selection for Quick-Extract

This is a narrow extraction task: pull ~10 identity fields from page 1 of a PDF. Low reasoning complexity, high accuracy needed. At our volume (~100 bids/month), cost differences are pennies — speed and accuracy matter more.

**Cost per extraction (~1K input tokens, ~200 output tokens):**

| Model | Cost/call | 100 bids/mo | Multimodal | JSON Mode | Speed |
|-------|----------|-------------|-----------|-----------|-------|
| **Gemini 2.0 Flash** | $0.00013 | $0.013 | Yes | Yes | ~1s |
| **GPT-4o Mini** | $0.00027 | $0.027 | Yes | Yes | ~1-2s |
| **Gemini 2.5 Flash** | $0.00080 | $0.080 | Yes | Yes | ~1-2s |
| **Claude Haiku 4.5** | $0.00200 | $0.200 | Yes | Yes | ~1-2s |

**Recommendation: Gemini 2.0 Flash** — cheapest, fastest, multimodal, native JSON mode. Free tier covers 1,500 req/day on Google AI Studio.

**Alternative: GPT-4o Mini** — slightly more expensive but well-proven for structured extraction. Good if we want to avoid adding a Google AI dependency.

**Decision point:** Which API provider do you want to add? Gemini (cheapest, adds Google AI SDK), GPT-4o Mini (proven, adds OpenAI SDK), or Claude Haiku (most expensive but stays in-stack with Anthropic)?

The Edge Function is model-agnostic — we wrap the LLM call in a `quickExtractFromPdf(pdfText: string): Promise<ExtractedContractorInfo>` function that can swap models by changing one import.

### How It Works

```
User drops PDF into BidUploadZone
  → Frontend calls uploadPdfFile() (existing — creates pdf_upload + bid stub)
  → Frontend calls NEW Edge Function: "quick-extract"
       payload: { bid_id, pdf_upload_id, project_id }
  → Edge Function:
       1. Gets signed URL for the PDF (reuses existing getSignedUrlForPdf pattern)
       2. Downloads PDF, extracts first 2 pages of text (or sends as image to Haiku)
       3. Calls lightweight LLM (Gemini Flash / GPT-4o Mini / Haiku) with a tight prompt:
          "Extract ONLY these fields from this HVAC bid document:
           - contractor_name, company, phone, email, website
           - license_number, license_state
           - property_city, property_state, property_zip
           Return JSON. If a field is not visible, return null."
       4. Writes extracted fields to `bids` table (updates contractor_name from 'TBD')
       5. Returns extracted data to frontend
  → Frontend receives contractor_name + city + license# in ~2-3 seconds
  → Frontend immediately fires contractor-intelligence Edge Function
  → Frontend immediately fires incentive-finder (if we have zip code)
  → MindPal deep analysis continues running in parallel
```

### The Quick-Extract Edge Function

```typescript
// supabase/functions/quick-extract/index.ts
// Lightweight: extracts contractor identity fields from page 1-2 of a bid PDF
// Uses Claude Haiku for fast, accurate structured extraction
// ~2-3 seconds total, ~$0.001 per call

POST /functions/v1/quick-extract
Body: {
  bid_id: string,
  pdf_upload_id: string,
  project_id: string
}

Response: {
  success: true,
  bid_id: "uuid",
  extracted: {
    contractor_name: "Service Champions",
    company: "Service Champions Heating & Air Conditioning",
    phone: "(916) 555-1234",
    email: "info@servicechampions.net",
    website: "https://servicechampions.net",
    license_number: "1092474",
    license_state: "CA",
    property_city: "Sacramento",
    property_state: "CA",
    property_zip: "95814"
  },
  confidence: 0.92,
  elapsed_ms: 2100
}
```

### Haiku Prompt (Tight, Structured)

```
You are extracting contractor identity information from page 1 of an HVAC bid/proposal document.

Extract ONLY these fields. Return JSON with exactly these keys:
- contractor_name: The contracting company's name (from letterhead, header, or signature)
- company: Legal entity name if different from contractor_name, else null
- phone: Phone number in any format
- email: Email address
- website: Website URL
- license_number: Contractor license number (look for "License #", "Lic.", "CSLB", "License No.")
- license_state: 2-letter state code (usually from context or license format)
- property_city: The city where the work will be performed (from project address, not contractor address)
- property_state: 2-letter state code for the property
- property_zip: ZIP code for the property

Rules:
- Return null for any field you cannot find with confidence
- Do NOT guess or infer — only extract what is explicitly visible
- contractor_name is the MOST IMPORTANT field — look in letterhead, header, "Prepared by", signature block
- License numbers in California are 6-7 digits
- Return raw JSON only, no markdown
```

### Integration with Existing Upload Flow

The change to the existing code is minimal:

**`mindpalService.ts` — add after `uploadPdfFile()` returns:**
```typescript
// After each PDF uploads successfully, trigger quick-extract
const quickResult = await quickExtractContractorInfo(bidId, pdfUploadId, projectId);
if (quickResult.success && quickResult.extracted.contractor_name) {
  // Contractor name extracted — can immediately start contractor research
  onContractorIdentified?.(bidId, quickResult.extracted);
}
```

**`BidUploadZone.tsx` or parent component:**
- No changes needed — `onUpload` handler already calls `uploadPdfFile` per file
- The `quickExtractContractorInfo` call is added in the service layer
- Results flow back through existing bid polling/subscription

### What This Adds to the File List

| File | Purpose |
|------|---------|
| `supabase/functions/quick-extract/index.ts` | LLM-powered fast extraction from PDF page 1 (model-agnostic) |
| `src/lib/services/quickExtractService.ts` | Frontend service to call quick-extract |

**Existing files modified:**
| File | Change |
|------|--------|
| `src/lib/services/mindpalService.ts` | Add `quickExtractContractorInfo()` call after each `uploadPdfFile()` |

### Cost

| Component | Cost |
|-----------|------|
| LLM per extraction (Gemini Flash) | ~$0.0001 per call |
| LLM per extraction (GPT-4o Mini) | ~$0.0003 per call |
| LLM per extraction (Haiku 4.5) | ~$0.002 per call |
| 100 bids/month (worst case, Haiku) | ~$0.20/month |
| 100 bids/month (best case, Gemini) | ~$0.01/month |
| Supabase Edge Function | Free tier |

### Risk: Two Extraction Engines?

This is NOT a second extraction engine. It's a **quick pre-scan** that extracts 10 identity fields from page 1. MindPal's Bid Data Extractor remains the full extraction (69+ columns of scope, equipment, pricing, electrical data across all pages). They serve completely different purposes:

| | Quick-Extract | MindPal Bid Data Extractor |
|---|---|---|
| Purpose | Get contractor identity for parallel research | Full bid extraction |
| Fields | ~10 (name, phone, license, city) | 69+ (scope, equipment, pricing, everything) |
| Pages | 1-2 | All |
| Time | 2-3 seconds | 3-5 minutes |
| Model | Gemini Flash / GPT-4o Mini | GPT-4o / Claude Sonnet |
| When | Immediately at upload | After user clicks "Analyze" |

The quick-extract result is overwritten by MindPal's more thorough extraction when it completes — it's a fast preview, not a competing source of truth.

---

## Part A2: The Input Problem (Detailed)

### Where Contractor Data Comes From

Inputs arrive from **three paths** — we must handle all:

**Path 1: Quick-Extract from Bid PDFs (new — immediate at upload)**
The quick-extract Edge Function pulls contractor identity from page 1 of the PDF within 2-3 seconds of upload. This gives us enough to start contractor research immediately.

**Path 2: Full MindPal Extraction (existing — after analysis starts)**
When a homeowner uploads contractor bid PDFs, MindPal's Bid Data Extractor parses each PDF and extracts:

| Field | Reliability | Notes |
|-------|------------|-------|
| `contractor_name` | HIGH | Almost always on the bid (letterhead, signature block) |
| `contractor_company` | HIGH | Usually same as name, sometimes legal entity differs |
| `contractor_phone` | MEDIUM | Often on letterhead |
| `contractor_email` | MEDIUM | Often on letterhead |
| `contractor_website` | MEDIUM | Often on letterhead or footer |
| `contractor_license` | VARIABLE | Sometimes on bid, sometimes not — CA requires it but not all bids include it |
| `contractor_license_state` | HIGH (inferred) | Almost always CA since property is in CA |
| `property_city` | HIGH | From the bid's project address |
| `property_state` | HIGH | CA |

**Key insight:** We often have the contractor name + city but NOT the license number. The license number is the golden key for CSLB lookup, so we need a name→license resolution step.

**Path 2: Manual Lookup (standalone /research page)**
User enters whatever they know: contractor name (required), license number (optional), city (optional).

### Input Resolution Strategy

```
Inputs received (name, city, maybe license#, maybe phone/website)
  │
  ├─ License # provided?
  │   YES → Direct CSLB lookup by license number (fast, exact)
  │   NO  → CSLB name search → may return multiple matches
  │           → Disambiguate using city, phone, or company name
  │           → If single match → use that license number
  │           → If multiple matches → return candidates, flag for user review
  │           → If no matches → proceed without CSLB data, flag as unverified
  │
  ├─ Google Places → search by "contractor_name city CA"
  │   → Use place_id for dedup, phone/address for cross-validation with CSLB
  │
  └─ County permits → search by contractor name (fuzzy match with LIKE)
```

### Disambiguation Rules

When CSLB name search returns multiple results:
1. **Match on city** — if only one result is in the bid's city, use it
2. **Match on phone** — if bid has phone number, match against CSLB records
3. **Match on company name** — legal entity name from CSLB vs bid
4. **Multiple still remain** — return all candidates with a `needs_disambiguation: true` flag

When Google Places returns multiple results:
1. Filter by `types` containing "general_contractor" or HVAC-related
2. Match website URL if available from bid
3. Match phone number if available
4. If still ambiguous, use the highest-review-count match (most likely the real business)

---

## Part B: Data Sources — California Direct (No Apify)

| # | Source | Method | Data Provided | Auth Required | Cost |
|---|--------|--------|--------------|---------------|------|
| 1 | **CSLB** | Direct HTTP scrape of `cslb.ca.gov/{license#}` | License status, classifications, bond, workers comp, disciplinary, complaints | None | $0 |
| 2 | **Google Places API** | Official REST API (Places New) | Rating, review count, address, phone, website, business status | API key | $0 (10K/mo free) |
| 3 | **BBB** | Direct HTTP scrape of `bbb.org/search` | Rating, accreditation, complaints, reviews | None | $0 |
| 4 | **County Permit Portals** | Socrata SODA REST API | Building permits by contractor, type, dates, status | None | $0 |
| 5 | **ENERGY STAR** | Free government API | Certified partner status | None | $0 |

### Source Detail: CSLB Direct Scrape

CSLB supports two lookup patterns:

**By license number (preferred):**
```
GET https://www.cslb.ca.gov/{license_number}
```
Returns HTML page with: business name, license status, classifications, bond info, workers comp, disciplinary actions, complaints. Parse with string matching or simple HTML parsing in Deno.

**By business name (fallback when no license# available):**
```
POST https://www.cslb.ca.gov/onlineservices/checklicenseII/checklicense.aspx
```
ASP.NET WebForms page — requires fetching `__VIEWSTATE` + `__EVENTVALIDATION` tokens first, then POSTing with the search fields. Returns a results list that may have multiple matches. More complex but necessary for the "name only" path.

**CSLB downtime:** Sundays 8 PM – Monday 6 AM PT (scheduled maintenance).

### Source Detail: Google Places API (New)

```
POST https://places.googleapis.com/v1/places:searchText
Headers:
  X-Goog-Api-Key: {key}
  X-Goog-FieldMask: places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.businessStatus,places.types
Body: { "textQuery": "Service Champions HVAC Sacramento CA" }
```

Field mask stays in **Essentials SKU** (free tier). Requesting `reviews` or `priceLevel` would bump to Pro SKU (paid). The fields above give us everything we need.

**Budget:** 1,000 contractor lookups = ~2,000 API calls (search + details) = well within 10K free/month.

### Source Detail: BBB Direct Scrape

```
GET https://www.bbb.org/search?find_text={contractor_name}&find_loc={city}%2C+CA
```
Parse the results page HTML for: rating badge, accreditation status, complaint count. BBB may block automated requests — if so, we degrade gracefully (BBB section shows "unavailable") and revisit.

**Fallback if BBB blocks:** Skip BBB data entirely for v1. It's nice-to-have, not critical. CSLB + Google covers the most important signals.

### Source Detail: County Permit Portals (Socrata SODA)

Free government APIs, no auth, JSON responses:

| County | Endpoint | Population Coverage |
|--------|----------|-------------------|
| San Francisco | `data.sfgov.org/resource/i98e-djp9.json` | 870K |
| San Diego | `data.sandiegocounty.gov/resource/76h4-nnmj.json` | 3.3M |
| Los Angeles | TBD — research specific dataset ID during build | 10M |
| Sacramento | TBD | 1.5M |

Query pattern:
```
GET https://data.sfgov.org/resource/i98e-djp9.json?
  $where=contractor LIKE '%ACME HVAC%'
  &$limit=50
  &$order=filed_date DESC
```

Covers ~60-70% of CA population through major metro portals. Rural areas won't have portal data — that's acceptable for v1.

---

## Part C: Architecture

### How It Works

```
Bid PDF uploaded → MindPal extracts contractor_name, city, license#, phone, website
  │
  ├─ (existing flow continues unchanged — MindPal Contractor Researcher still runs)
  │
  └─ NEW: Frontend calls Edge Function "contractor-intelligence"
       with extracted fields as inputs
       │
       ├── CSLB lookup (direct HTTP scrape)
       │     ├── By license# if available → exact match
       │     └── By name if no license# → name search → disambiguate
       ├── Google Places API (official REST)
       ├── BBB lookup (direct HTTP scrape, best-effort)
       └── County permits (Socrata SODA API, if city is known)
       │
       → Merge results → compute derived scores → upsert to contractor_profiles
       → Return enriched profile to frontend
```

### Provider Abstraction (for future multi-state)

```typescript
// Each state gets a license lookup provider
interface LicenseLookupProvider {
  lookupByLicense(licenseNumber: string): Promise<LicenseData | null>;
  lookupByName(name: string, city?: string): Promise<LicenseData[]>;
}

// California provider (direct CSLB scrape)
const providers: Record<string, LicenseLookupProvider> = {
  CA: new CSLBProvider(),
  // Future: NV: new NevadaProvider(), AZ: new AZROCProvider(), etc.
  // Future: fallback: new CobaltIntelligenceProvider() // aggregator for all states
};
```

This means when we expand beyond CA, we just add a new provider class — frontend, database, Edge Function structure all stay the same.

---

## Part D: Edge Function Design

### `supabase/functions/contractor-intelligence/index.ts`

**Request:**
```typescript
POST /functions/v1/contractor-intelligence
Body: {
  // Required
  contractor_name: string,

  // Optional — improve accuracy and speed
  license_number?: string,      // if extracted from bid or known
  city?: string,                // from bid's property address
  state?: string,               // defaults to "CA"
  phone?: string,               // for disambiguation
  website?: string,             // for cross-validation
  company?: string,             // legal entity name if different

  // Optional — linking
  bid_id?: string,              // if called from bid context, also updates bid_contractors
  project_id?: string,          // for logging/association

  // Control
  force_refresh?: boolean       // bypass cache
}
```

**Response:**
```typescript
{
  success: true,
  profile_id: "uuid",
  data: { /* full contractor_profiles record */ },
  sources_checked: ["cslb", "google", "bbb", "county_permits"],
  sources_failed: ["bbb"],       // graceful degradation
  disambiguation: null,           // or { candidates: [...] } if multiple CSLB matches
  elapsed_ms: 3200,
  from_cache: false
}
```

**Core logic:**
```typescript
Deno.serve(async (req) => {
  // 1. CORS + Auth
  // 2. Parse request body, validate contractor_name present
  // 3. Build cache_key: license_number (if known) or sha256(name|city|state)
  // 4. Check cache (contractor_profiles by cache_key)
  //    → If fresh (<7 days) and !force_refresh → return cached
  // 5. Resolve license number if not provided:
  //    → CSLB name search → disambiguate → get license#
  // 6. Fan out API calls with resolved data:
  const results = await Promise.allSettled([
    lookupCSLB(resolvedLicenseNumber),              // exact lookup now
    lookupGooglePlaces(contractor_name, city, "CA"),
    lookupBBB(contractor_name, city, "CA"),
    lookupCountyPermits(contractor_name, city),
  ]);
  // 7. Merge results into contractor_profiles record
  // 8. Compute derived fields (red flags, specialization, confidence)
  // 9. Upsert to contractor_profiles
  // 10. If bid_id provided, also update bid_contractors with relevant fields
  // 11. Return merged result
});
```

### API Modules

**`_shared/cslb.ts`**
- `lookupByLicense(licenseNumber: string)` — fetch `cslb.ca.gov/{num}`, parse HTML
- `lookupByName(name: string, city?: string)` — POST to CheckLicense ASP.NET form, handle ViewState tokens, return array of matches
- Returns: `{ license_number, status, classifications[], bond_amount, bond_status, workers_comp_status, disciplinary_count, complaints_open, business_name, issue_date, expiration_date }`

**`_shared/google-places.ts`**
- `lookupContractor(name: string, city: string, state: string)` — Text Search with Essentials field mask
- Returns: `{ place_id, rating, review_count, address, phone, website, business_status }`

**`_shared/bbb.ts`**
- `lookupContractor(name: string, city: string, state: string)` — scrape bbb.org search results
- Returns: `{ rating, accredited, complaints_3yr, reviews_count }` or null if blocked/not found
- **Best-effort only** — BBB scraping may be unreliable, module designed to fail gracefully

**`_shared/county-permits.ts`**
- `lookupPermits(name: string, city: string)` — routes to correct Socrata endpoint by city/county
- Returns: `{ total_permits, hvac_permits, recent_3yr, completion_rate, permit_records[] }`

---

## Part D2: Caching Strategy — Don't Re-Research Known Contractors

### The Problem

A homeowner uploads 3 bids. Two are from the same contractor (maybe different configurations or revisions), or across multiple projects, different homeowners may be comparing bids from the same popular HVAC company. We should **never** hit CSLB, Google, and BBB twice for the same contractor.

### How Caching Works

The `contractor_profiles` table is a **global cache** — not tied to any specific project or bid. Once we research "Service Champions" in Sacramento, that data is available to every future bid that mentions them.

**Cache key strategy:**
```
IF license_number is known:
  cache_key = "{license_number}"           (e.g., "1092474")
  → Exact, unique, best key. CSLB license numbers are unique per contractor.

ELSE:
  cache_key = sha256("{name}|{city}|{state}")  (e.g., sha256("Service Champions|Sacramento|CA"))
  → Fuzzy key for when we don't have a license number yet.
  → Once CSLB lookup resolves the license#, we UPDATE the cache_key to the license number
     (promoting the record from fuzzy to exact key).
```

**Cache freshness per source:**
| Source | TTL | Reason |
|--------|-----|--------|
| CSLB | 30 days | License status rarely changes; bond/workers comp updates quarterly |
| Google Places | 7 days | Ratings shift with new reviews |
| BBB | 14 days | Complaints and ratings update periodically |
| County Permits | 30 days | Permit records are historical, rarely change |

**Cache hit logic in the Edge Function:**
```typescript
// 1. Build cache_key from inputs
const cacheKey = licenseNumber || sha256(`${name}|${city}|${state}`);

// 2. Look up existing profile
const existing = await supabaseAdmin
  .from('contractor_profiles')
  .select('*')
  .eq('cache_key', cacheKey)
  .maybeSingle();

// 3. If exists and fresh enough, return immediately
if (existing && !forceRefresh) {
  const allFresh =
    isFresh(existing.cslb_fetched_at, 30) &&
    isFresh(existing.google_fetched_at, 7) &&
    isFresh(existing.bbb_fetched_at, 14) &&
    isFresh(existing.permits_fetched_at, 30);

  if (allFresh) {
    return jsonResponse({ success: true, data: existing, from_cache: true });
  }

  // 4. Partial refresh — only re-fetch stale sources
  const stale = {
    cslb: !isFresh(existing.cslb_fetched_at, 30),
    google: !isFresh(existing.google_fetched_at, 7),
    bbb: !isFresh(existing.bbb_fetched_at, 14),
    permits: !isFresh(existing.permits_fetched_at, 30),
  };
  // Only call APIs for stale sources, merge with cached data
}

// 5. No cache hit — full research
```

### Multi-Bid Scenario

```
Bid 1 uploaded: "ABC HVAC" — quick-extract finds name + license #1092474
  → contractor-intelligence called → full research → saved to contractor_profiles
  → Takes ~3-5 seconds

Bid 2 uploaded: "ABC HVAC" — quick-extract finds same name + license #1092474
  → contractor-intelligence called → cache hit on license #1092474
  → Returns instantly (from_cache: true)
  → Zero API calls

Bid 3 uploaded: "XYZ Heating" — different contractor
  → contractor-intelligence called → no cache → full research
  → Takes ~3-5 seconds
```

### Cache Key Promotion

When we first encounter a contractor by name only (no license#), we create a profile with a sha256 cache key. Later, if CSLB resolves the license number:

```typescript
// After CSLB lookup succeeds and returns license_number:
if (existing.cache_key !== licenseNumber) {
  // Promote cache key from sha256 to exact license number
  await supabaseAdmin
    .from('contractor_profiles')
    .update({ cache_key: licenseNumber, license_number: licenseNumber })
    .eq('id', existing.id);
}
```

This means future lookups that DO have the license number will hit the same cached record, even if the original lookup was by name only.

### Cross-Project Sharing

The `contractor_profiles` table has no `project_id` or `bid_id` column — it's global. Any project, any user, any bid that looks up "Service Champions" gets the same cached profile. The `bid_contractors` table (per-bid) links to it for display, but the research data is shared.

This is a huge advantage for popular contractors — the first homeowner to research them pays the 3-5 second cost, everyone after that gets instant results.

---

## Part E: Files to Create

### New Files

| File | Purpose |
|------|---------|
| `src/pages/ResearchPage.tsx` | Standalone page at `/research` |
| `src/components/research/ContractorSearchForm.tsx` | Search form (name required, license/city/phone optional) |
| `src/components/research/ContractorProfileCard.tsx` | Results display — all sections |
| `src/components/research/LicenseSafetySection.tsx` | CSLB data with status badges |
| `src/components/research/RatingsSection.tsx` | Google/BBB ratings |
| `src/components/research/PermitHistorySection.tsx` | County permit data |
| `src/components/research/DisambiguationCard.tsx` | Shows multiple CSLB matches for user to pick |
| `src/lib/services/contractorIntelligenceService.ts` | Frontend service to call contractor-intelligence Edge Function |
| `src/lib/services/quickExtractService.ts` | Frontend service to call quick-extract Edge Function |
| `supabase/functions/quick-extract/index.ts` | LLM-powered fast extraction from PDF page 1 (model-agnostic) |
| `supabase/functions/contractor-intelligence/index.ts` | Main Edge Function orchestrator |
| `supabase/functions/_shared/cslb.ts` | CSLB direct scrape (by license# and by name) |
| `supabase/functions/_shared/google-places.ts` | Google Places API module |
| `supabase/functions/_shared/bbb.ts` | BBB scrape (best-effort) |
| `supabase/functions/_shared/county-permits.ts` | Socrata SODA API for county permit data |

### Existing Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` (or router config) | Add `/research` route |
| `src/lib/services/mindpalService.ts` | Add `quickExtractContractorInfo()` call after `uploadPdfFile()` to trigger quick-extract + contractor research in parallel with MindPal |
| `supabase/functions/_shared/cors.ts` | Verify CORS allows new function names |

### New Migration (spec only — not applied yet)

```sql
-- contractor_profiles: Global cache, keyed by license or name+city
CREATE TABLE IF NOT EXISTS contractor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity / Cache Key
  cache_key TEXT NOT NULL UNIQUE,  -- license# or sha256(name|city|state)
  name TEXT NOT NULL,
  company TEXT,
  city TEXT,
  state TEXT DEFAULT 'CA',

  -- CSLB Data (CA-specific, via provider abstraction)
  license_number TEXT,
  license_status TEXT,           -- Active, Inactive, Expired, Cancelled, Revoked
  license_issue_date DATE,
  license_expiration_date DATE,
  license_classifications TEXT[],  -- ['C-20', 'B']
  bond_amount DECIMAL(10,2),
  bond_status TEXT,
  workers_comp_status TEXT,      -- has_coverage, no_coverage, exempt
  disciplinary_actions_count INTEGER DEFAULT 0,
  complaints_open INTEGER DEFAULT 0,
  license_business_name TEXT,    -- official name on license (may differ from trade name)
  license_raw_html TEXT,         -- raw CSLB page for debugging

  -- Google Places
  google_place_id TEXT,
  google_rating DECIMAL(3,2),
  google_review_count INTEGER,
  google_business_status TEXT,
  google_address TEXT,
  google_phone TEXT,
  google_website TEXT,

  -- BBB
  bbb_rating TEXT,               -- A+, A, A-, B+, B, B-, C, F
  bbb_accredited BOOLEAN,
  bbb_complaints_3yr INTEGER,

  -- Permit Data (from county portals)
  total_permits INTEGER,
  hvac_permits_count INTEGER,
  recent_permits_3yr INTEGER,
  permit_completion_rate INTEGER,  -- derived percentage
  permit_data_source TEXT,         -- county name/portal
  permits_raw_data JSONB,          -- array of permit records

  -- Derived
  heat_pump_specialization_score INTEGER,  -- 0-100
  contractor_red_flags JSONB DEFAULT '[]',
  contractor_positive_signals JSONB DEFAULT '[]',
  research_confidence INTEGER DEFAULT 0,
  data_sources TEXT[],             -- ['cslb', 'google', 'bbb', 'county']

  -- Disambiguation
  needs_disambiguation BOOLEAN DEFAULT false,
  disambiguation_candidates JSONB,  -- array of CSLB matches if multiple found

  -- Cache Management
  cslb_fetched_at TIMESTAMPTZ,
  google_fetched_at TIMESTAMPTZ,
  bbb_fetched_at TIMESTAMPTZ,
  permits_fetched_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for lookup by license number
CREATE INDEX idx_contractor_profiles_license ON contractor_profiles(license_number);
-- Index for name+city fuzzy matching
CREATE INDEX idx_contractor_profiles_name_city ON contractor_profiles(name, city);
```

---

## Part F: Standalone Page Design

### `/research` — Contractor Research Page

```
┌─────────────────────────────────────────────────────────┐
│  Contractor Research                                    │
│  Verify any California contractor — license, ratings,   │
│  and permit history from official sources               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Contractor Name: [________________________] (required) │
│  License #:       [____________] (optional — speeds up  │
│                                    lookup significantly) │
│  City:            [____________] (optional — helps       │
│                                    disambiguation)      │
│  Phone:           [____________] (optional — helps       │
│                                    match verification)  │
│  State:           [CA ▾]                                │
│                                                         │
│                                       [ Research ]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌── ⚠ Multiple Matches Found ────────────────────┐    │
│  │ We found 3 contractors matching "ABC HVAC":     │    │
│  │                                                 │    │
│  │ ○ ABC HVAC Inc — Lic #1092474 — Sacramento     │    │
│  │ ○ ABC HVAC Services — Lic #887231 — Roseville  │    │
│  │ ○ ABC HVAC & Plumbing — Lic #1156892 — Folsom  │    │
│  │                                                 │    │
│  │ [ Select ] to continue research                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌── License & Safety ────────────────────────────┐    │
│  │ ✓ Active License #1092474                      │    │
│  │   Classifications: C-20 (HVAC), B (General)    │    │
│  │   Issued: 2008-03-15 | Expires: 2026-09-30    │    │
│  │   Bond: $25,000 (current)                      │    │
│  │   Workers Comp: Coverage verified              │    │
│  │   Disciplinary Actions: 0                      │    │
│  │   Open Complaints: 0                           │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  ┌── Ratings & Reviews ──────────────────────────┐     │
│  │ Google  4.7/5 (312 reviews)                   │     │
│  │ BBB     A+ Accredited | 1 complaint (3yr)     │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌── Permit History (San Francisco) ─────────────┐     │
│  │ 47 total permits | 23 HVAC/mechanical          │     │
│  │ 12 permits in last 3 years                     │     │
│  │ Completion rate: 94%                            │     │
│  └────────────────────────────────────────────────┘     │
│                                                         │
│  ┌── Red Flags ──────────────────────────────────┐     │
│  │ None found ✓                                   │     │
│  └────────────────────────────────────────────────┘     │
│                                                         │
│  ┌── Sources & Confidence ───────────────────────┐     │
│  │ Sources: CSLB ✓ | Google ✓ | BBB ✓ | Permits ✓│     │
│  │ Confidence: 91/100                             │     │
│  │ Researched: 2026-03-04                         │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## Part G: Build Phases

### Phase 0: Quick-Extract at Upload

**Goal:** Extract contractor name/license/city from PDF page 1 within 2-3 seconds of upload, enabling parallel research.

**Backend:**
1. Create `supabase/functions/quick-extract/index.ts`:
   - Receives `bid_id`, `pdf_upload_id`, `project_id`
   - Gets signed URL for PDF (reuses existing pattern from `start-mindpal-analysis`)
   - Calls Claude Haiku with first 1-2 pages + structured extraction prompt
   - Updates `bids.contractor_name` from 'TBD' to extracted name
   - Returns extracted identity fields
2. Set LLM API key as Supabase secret (e.g., `GOOGLE_AI_API_KEY` for Gemini, or `OPENAI_API_KEY` for GPT-4o Mini)
3. Deploy Edge Function

**Frontend:**
4. Create `src/lib/services/quickExtractService.ts`
5. Modify `mindpalService.ts` upload flow: after each `uploadPdfFile()` succeeds, call `quick-extract`
6. On quick-extract success, immediately fire `contractor-intelligence` (if contractor_name found)

**Test:**
- Upload a real HVAC bid PDF → within 3 seconds, `bids.contractor_name` updates from 'TBD' to actual name
- Contractor research kicks off immediately after, in parallel with MindPal

### Phase 1: CSLB + Standalone Page

**Goal:** Working `/research` page that does CSLB license lookups via direct scrape. Also serves as the backend for auto-research triggered by Phase 0.

**Backend:**
1. Create `supabase/functions/contractor-intelligence/index.ts` — scaffold with CORS, auth, caching logic, request parsing
2. Create `supabase/functions/_shared/cslb.ts`:
   - `lookupByLicense()` — fetch `cslb.ca.gov/{num}`, parse HTML for license details
   - `lookupByName()` — handle ASP.NET form POST for name search, return candidates
3. Create `contractor_profiles` migration (spec → apply)
4. Implement caching: check `contractor_profiles` by cache_key before calling any APIs
5. Deploy Edge Function

**Frontend:**
6. Create `ResearchPage.tsx` + `ContractorSearchForm.tsx`
7. Create `ContractorProfileCard.tsx` + `LicenseSafetySection.tsx`
8. Create `DisambiguationCard.tsx` (for multiple CSLB matches)
9. Create `contractorIntelligenceService.ts`
9. Add `/research` route

**Test:**
- Enter license "1092474" → see Active status, C-20 classification, bond info
- Enter "Service Champions" (no license#) → disambiguation if multiple matches, then full CSLB data
- Enter bogus name → graceful "no results" message

### Phase 2: Google Places

**Goal:** Ratings + reviews from official Google API alongside CSLB data.

1. Set up Google Cloud project + Places API key (15 min)
2. Create `_shared/google-places.ts` — Text Search + Essentials field mask
3. Update Edge Function to fan out CSLB + Google in parallel via `Promise.allSettled`
4. Create `RatingsSection.tsx`
5. Implement caching (check `contractor_profiles` before calling APIs)
6. Test: "Service Champions Sacramento" → CSLB data + Google rating in <5 seconds

**Supabase secret:**
```bash
supabase secrets set GOOGLE_PLACES_API_KEY=AIza...
```

### Phase 3: BBB + County Permits

**Goal:** BBB ratings (best-effort) + county permit history from free government portals.

1. Create `_shared/bbb.ts` — scrape bbb.org search results (may fail, that's OK)
2. Create `_shared/county-permits.ts` — Socrata SODA for SF, San Diego, LA
3. Add to Edge Function parallel fan-out
4. Create `PermitHistorySection.tsx`
5. Implement red flag / positive signal auto-generation logic:
   - Red flags: license expired/cancelled/revoked, open complaints, low bond, no workers comp
   - Positive: 10+ years active, high Google rating with many reviews, clean complaint history, C-20 classification
6. Implement heat pump specialization score (% of HVAC permits vs total)
7. Test: known SF HVAC contractor → permit count from DataSF

### Phase 4: Wire to Bid Comparison

**Goal:** Auto-research contractors when bids are uploaded.

1. After MindPal extracts contractor_name/city/license from a bid:
   - Frontend (or a new Edge Function trigger) calls `contractor-intelligence` with extracted fields
   - `bid_id` passed so results also populate `bid_contractors`
2. Update existing `ContractorsTab.tsx` to show enriched data (CSLB status, Google rating, permit count)
3. Add "Research" as 7th tab in `ResultsTabBar` — embeds `ContractorProfileCard` pre-filled with each bid's contractors
4. MindPal Contractor Researcher becomes optional/supplementary

---

## Part H: What This Does NOT Touch

- No changes to MindPal workflow or agents
- No changes to `mindpal-callback` or `start-mindpal-analysis` Edge Functions
- No changes to existing `bid_contractors` table schema (Phase 4 writes to it, doesn't alter it)
- No changes to ContractorsTab.tsx (until Phase 4)
- No changes to any existing tab or data flow

The Research page is purely additive — new page, new Edge Function, new table. Everything else stays as-is.

---

## Part I: Multi-State Future (Architecture Only, Not Built Now)

When we need to expand beyond California:

| Approach | Cost | Effort | When |
|----------|------|--------|------|
| **Add state providers one at a time** | $0 per state | High (each state is different HTML) | If expanding to 2-3 specific states |
| **Cobalt Intelligence** | Per-lookup pricing, free trial | Low (single API for multiple states) | If expanding to 5+ states |
| **LicenseLookup.org** | Unknown (free signup) | Low | If Cobalt is too expensive |
| **BuildZoom Data API** | Enterprise pricing (contact sales) | Low (single API, 350M permits) | If need national permit data |

The provider abstraction in Phase 1 means this is a **configuration change**, not an architecture change. Add a new provider class, map it to a state code, done.

---

## Setup Checklist (What You Need To Do)

| Priority | Action | Time | Cost |
|----------|--------|------|------|
| 1 | Nothing — CSLB is free, no auth needed | 0 min | $0 |
| 2 | Google Cloud project + Places API key | 15 min | $0 |
| 3 | Socrata — no setup, free open APIs | 0 min | $0 |
| 4 | (Optional) BBB developer account at developer.bbb.org | 10 min | $0 |

```bash
# Only secret needed for Phase 1: none
# Phase 2 adds:
supabase secrets set GOOGLE_PLACES_API_KEY=AIza...
# Phase 3 adds (if BBB API approved):
supabase secrets set BBB_API_KEY=xxx
```

**Total cost: $0/month** — direct scraping + free API tiers + free government data.
