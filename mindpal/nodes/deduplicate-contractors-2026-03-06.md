# Deduplicate Contractors Code Node — Build Spec

**Version:** v1.0
**Created:** 2026-03-06
**Purpose:** Prevent Contractor Research from running multiple times for the same contractor

---

## Problem Statement

The Contractor Research (Step 9) loops over `@[Extract All Bid Info (Markdown)]`, which outputs **one item per uploaded PDF**. Two scenarios cause wasted research:

1. **Multiple PDFs from the same contractor** — If a contractor submits separate PDFs for each option (e.g., 3 PDFs from Lambert Heating: Basic, Deluxe, Premier), the loop researches Lambert 3 times identically.
2. **Merged bids** — Parse Configurations (Step 4) detects same-contractor bids and creates a `merge_report` marking secondary bids. But the Contractor Research still iterates over ALL extractions, including the secondary (merged) ones.

**Run 16 evidence:** Lambert Heating was researched 3 times (once per PDF), doing 14+ searches instead of the 4-6 budget, taking 30 minutes and consuming 223 AI credits.

### Additional Problem: Prompt Overload

The Contractor Research prompt is **54,246 characters** (system: 10,675 + task: 33,531 + outputFormat: 10,040). The `{{#currentItem}}` variable inlines the ENTIRE bid markdown — for Lambert with 4 configs, that's **15,000-20,000 additional characters** of equipment specs, scope of work, and pricing that the Contractor Research agent **does not need**.

Total runtime prompt: ~70,000+ characters. Gemini Flash loses track of the 4-6 search budget instruction buried in this massive context. The agent sees all the config-specific equipment data and tries to research each config separately.

**Fix:** Trim the markdown to only contractor-relevant sections BEFORE passing to the loop. This reduces the embedded markdown from ~15K chars to ~500-1,000 chars.

---

## Solution: New Code Node

**Node Name:** `Deduplicate Contractors`
**Node Type:** CODE
**Position:** Insert between `Supabase_Post_bid_equipment` (Step 8) and `Contractor Research` (Step 9)

### Inputs (configured in MindPal UI as variables)

| Variable Name | Source | Description |
|---|---|---|
| `bid_extractions` | `@[Extract All Bid Info (Markdown)]` | Array of markdown strings — one per PDF |
| `merge_report` | `@[Parse Configurations - merge_report]` | JSON with `{merges: [{primary_bid_id, secondary_bid_ids}]}` |

### Output

```json
{
  "unique_contractors": [
    "bid_id: 16d9ed80...\n\n# BID EXTRACTION: Lambert Heating\n\n## CONTRACTOR INFO\n- Company Name: Lambert Heating...\n\n## CUSTOMER & PROPERTY\n- Property Address: 369 Coronado Ave...\n\n## CONFIGURATIONS\nTotal: 4 (Basic, Deluxe, Premier, Optimum)\n[equipment/scope/pricing sections STRIPPED]",
    "bid_id: abc123...\n\n# BID EXTRACTION: Another Contractor..."
  ],
  "dedup_report": {
    "total_input": 4,
    "unique_output": 2,
    "skipped": [
      {"bid_id": "xxx", "reason": "merged_secondary"},
      {"bid_id": "yyy", "reason": "duplicate_contractor", "name": "Lambert Heating"}
    ]
  }
}
```

### Key Feature: Markdown Trimming

Each markdown is **trimmed to contractor-relevant sections only**:
- ✅ `bid_id:` line (preserved for downstream reference)
- ✅ `# BID EXTRACTION:` header
- ✅ `## CONTRACTOR INFO` section (name, company, contact, phone, email, license, website)
- ✅ `## CUSTOMER & PROPERTY` section (address, city/state for search queries)
- ✅ `=== CONFIGURATIONS ===` summary (config count/labels only)
- ❌ Equipment summaries, scope of work, pricing, warranty, timeline, payment terms → **STRIPPED**

This reduces the embedded markdown from **15,000-20,000 chars** (multi-config bid) to **500-1,500 chars**, bringing the total Contractor Research prompt from ~70K chars to ~55K chars.

### Downstream Change

**Contractor Research** listSource changes from:
```
@[Extract All Bid Info (Markdown)]
```
to:
```
@[Deduplicate Contractors - unique_contractors]
```

The Contractor Research prompt does NOT need to change. It still receives markdown strings via `{{#currentItem}}`, just:
1. Fewer of them (deduplicated)
2. Shorter (trimmed to contractor-relevant sections)

---

## Code

```javascript
// ====================================================================
// Deduplicate Contractors Code Node
// ====================================================================
// Purpose: Remove duplicate contractor entries before Contractor Research
//
// Input variables (configured in MindPal UI):
//   bid_extractions  → @[Extract All Bid Info (Markdown)]
//   merge_report     → @[Parse Configurations - merge_report]
//
// Output: { unique_contractors: [...], dedup_report: {...} }
// ====================================================================

// --- Parse inputs (MindPal Code Node inputs are always strings) ---

let extractions;
try {
  const raw = typeof bid_extractions === 'string'
    ? bid_extractions.replace(/```json\n?|```\n?/g, '').trim()
    : bid_extractions;
  extractions = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(extractions)) extractions = [extractions];
} catch (e) {
  console.log('ERROR parsing bid_extractions: ' + e.message);
  // Fallback: pass through everything unmodified
  return {
    unique_contractors: Array.isArray(bid_extractions) ? bid_extractions : [bid_extractions],
    dedup_report: { total_input: 1, unique_output: 1, skipped: [], error: e.message }
  };
}

let merge;
try {
  const raw = typeof merge_report === 'string'
    ? merge_report.replace(/```json\n?|```\n?/g, '').trim()
    : merge_report;
  merge = typeof raw === 'string' ? JSON.parse(raw) : raw;
} catch (e) {
  console.log('WARN: Could not parse merge_report, assuming no merges: ' + e.message);
  merge = { merges: [] };
}

// --- Build set of secondary (merged) bid_ids to skip ---

const secondaryBids = new Set();
if (merge && merge.merges && Array.isArray(merge.merges)) {
  for (const m of merge.merges) {
    if (m.secondary_bid_ids && Array.isArray(m.secondary_bid_ids)) {
      for (const secId of m.secondary_bid_ids) {
        secondaryBids.add(secId);
      }
    }
  }
}

// --- Helpers ---

function extractBidId(markdown) {
  if (typeof markdown !== 'string') return null;
  const match = markdown.match(/bid_id:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match ? match[1] : null;
}

function extractContractorName(markdown) {
  if (typeof markdown !== 'string') return null;
  const patterns = [
    /\*?\*?Company Name:\*?\*?\s*(.+?)(?:\s*$|\n)/im,
    /BID EXTRACTION:\s*(.+?)(?:\s*$|\n)/im,
    /# BID EXTRACTION:\s*(.+?)(?:\s*$|\n)/im,
    /Contractor(?:\s+Name)?:\s*(.+?)(?:\s*$|\n)/im
  ];
  for (const pat of patterns) {
    const match = markdown.match(pat);
    if (match) {
      const name = match[1].trim().replace(/\*\*/g, '');
      if (name && name !== '[not stated]' && name !== 'Unknown') {
        return name;
      }
    }
  }
  return null;
}

// --- Trim Markdown to Contractor-Relevant Sections ---
// The Contractor Research agent only needs:
//   1. bid_id line
//   2. BID EXTRACTION header (contractor name)
//   3. CONTRACTOR INFO section
//   4. CUSTOMER & PROPERTY section (for city/state)
//   5. CONFIGURATIONS summary (just the markers, not full equipment/scope)
// Everything else (equipment summaries, scope, pricing, warranty,
// timeline, payment terms) is STRIPPED to reduce prompt size.

function trimForContractorResearch(markdown) {
  if (typeof markdown !== 'string') return markdown;

  const lines = markdown.split('\n');
  const kept = [];
  let currentSection = 'preamble'; // what section we're in
  let keepCurrentSection = true;

  // Sections to KEEP
  const keepSections = new Set([
    'preamble',          // bid_id line and header
    'contractor_info',   // ## CONTRACTOR INFO
    'customer_property', // ## CUSTOMER & PROPERTY
    'configurations',    // === CONFIGURATIONS ===
    'data_completeness', // ## DATA COMPLETENESS & CONFIDENCE
    'extraction_notes'   // ## EXTRACTION NOTES & FLAGS
  ]);

  // Section header detection
  for (const line of lines) {
    const trimmed = line.trim();

    // Detect section transitions
    if (trimmed.match(/^#{1,3}\s+CONTRACTOR INFO/i)) {
      currentSection = 'contractor_info';
      keepCurrentSection = true;
    } else if (trimmed.match(/^#{1,3}\s+CUSTOMER\s*[&|AND]\s*PROPERTY/i)) {
      currentSection = 'customer_property';
      keepCurrentSection = true;
    } else if (trimmed.match(/^#{1,3}\s+HEAT PUMP EQUIPMENT SUMMARY/i)) {
      currentSection = 'equipment';
      keepCurrentSection = false;
    } else if (trimmed.match(/^#{1,3}\s+HEAT PUMP SCOPE OF WORK/i)) {
      currentSection = 'scope';
      keepCurrentSection = false;
    } else if (trimmed.match(/^#{1,3}\s+PRICING/i)) {
      currentSection = 'pricing';
      keepCurrentSection = false;
    } else if (trimmed.match(/^#{1,3}\s+WARRANTY/i)) {
      currentSection = 'warranty';
      keepCurrentSection = false;
    } else if (trimmed.match(/^#{1,3}\s+TIMELINE/i)) {
      currentSection = 'timeline';
      keepCurrentSection = false;
    } else if (trimmed.match(/^#{1,3}\s+PAYMENT TERMS/i)) {
      currentSection = 'payment';
      keepCurrentSection = false;
    } else if (trimmed.match(/^#{1,3}\s+DATES$/i)) {
      currentSection = 'dates';
      keepCurrentSection = false;
    } else if (trimmed.match(/^#{1,3}\s+NON.HEAT PUMP/i)) {
      currentSection = 'non_hp';
      keepCurrentSection = false;
    } else if (trimmed.match(/^#{1,3}\s+DATA COMPLETENESS/i)) {
      currentSection = 'data_completeness';
      keepCurrentSection = true;
    } else if (trimmed.match(/^#{1,3}\s+EXTRACTION NOTES/i)) {
      currentSection = 'extraction_notes';
      keepCurrentSection = true;
    } else if (trimmed.match(/^===\s*CONFIGURATIONS\s*===/i)) {
      currentSection = 'configurations';
      keepCurrentSection = true;
    }

    if (keepCurrentSection) {
      kept.push(line);
    }
  }

  // Add a note about what was stripped
  const strippedNote = '\n\n---\n[TRIMMED FOR CONTRACTOR RESEARCH: Equipment summaries, scope of work, pricing, warranty, timeline, and payment sections have been removed. This markdown contains only contractor identity and property location data needed for web research.]\n';

  const result = kept.join('\n') + strippedNote;
  console.log('Trimmed markdown: ' + markdown.length + ' → ' + result.length + ' chars (' + Math.round(100 - (result.length / markdown.length * 100)) + '% reduction)');
  return result;
}

// --- Deduplicate and Trim ---

const seen = new Map();  // lowercase contractor name → first bid_id
const unique = [];
const skipped = [];

for (const md of extractions) {
  const bidId = extractBidId(md);

  // 1. Skip secondary (merged) bids
  if (bidId && secondaryBids.has(bidId)) {
    skipped.push({ bid_id: bidId, reason: 'merged_secondary' });
    console.log('Skipping merged bid: ' + bidId);
    continue;
  }

  // 2. Deduplicate by contractor name (case-insensitive)
  const name = extractContractorName(md);
  if (name) {
    const key = name.toLowerCase().trim();
    if (seen.has(key)) {
      skipped.push({
        bid_id: bidId,
        reason: 'duplicate_contractor',
        name: name,
        first_bid_id: seen.get(key)
      });
      console.log('Skipping duplicate contractor: ' + name + ' (bid ' + bidId + ')');
      continue;
    }
    seen.set(key, bidId);
  }

  // 3. Trim markdown to contractor-relevant sections
  const trimmed = trimForContractorResearch(md);
  unique.push(trimmed);
}

console.log('Deduplicate Contractors: ' + extractions.length + ' inputs → ' + unique.length + ' unique');
if (skipped.length > 0) {
  console.log('Skipped ' + skipped.length + ' bids: ' + JSON.stringify(skipped));
}

return {
  unique_contractors: unique,
  dedup_report: {
    total_input: extractions.length,
    unique_output: unique.length,
    skipped: skipped
  }
};
```

---

## MindPal Implementation Steps

### Step 1: Add the Code Node

1. In MindPal workflow editor, click **Add Node** between `Supabase_Post_bid_equipment` and `Contractor Research`
2. Choose **Code** node type
3. Name it: `Deduplicate Contractors`
4. Paste the JavaScript code above

### Step 2: Configure Inputs

In the Code Node's input configuration:

| Input Variable | Source Reference |
|---|---|
| `bid_extractions` | `@[Extract All Bid Info (Markdown)]` |
| `merge_report` | `@[Parse Configurations - merge_report]` |

**CRITICAL:** Both variable names must be exactly `bid_extractions` and `merge_report` — these match the variable names used in the code.

### Step 3: Wire the Edges

1. Connect `Supabase_Post_bid_equipment` → `Deduplicate Contractors`
2. Connect `Deduplicate Contractors` → `Contractor Research`
3. Remove the direct edge from `Supabase_Post_bid_equipment` → `Contractor Research` (if one exists)

### Step 4: Update Contractor Research Loop Source

Change the Contractor Research **listSource** from:
```
@[Extract All Bid Info (Markdown)]
```
to:
```
@[Deduplicate Contractors - unique_contractors]
```

**The Contractor Research agent prompt does NOT need to change.** It still receives markdown strings via `{{#currentItem}}`, just fewer of them (deduplicated).

---

## Validation Checklist

- [ ] Code Node added between Steps 8 and 9
- [ ] Input variables configured correctly (both must show purple in MindPal)
- [ ] Edges wired: Post_bid_equipment → Deduplicate → Contractor Research
- [ ] Contractor Research listSource updated to `@[Deduplicate Contractors - unique_contractors]`
- [ ] Test run: Contractor Research loop count matches unique contractor count (not total PDFs)
- [ ] Console output shows dedup report (how many skipped and why)

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| All PDFs from different contractors | unique_contractors = all extractions (no dedup needed) |
| 3 PDFs from Lambert, 1 from another | unique_contractors = 2 items (Lambert + other) |
| merge_report has merges | Secondary bids skipped before name dedup |
| merge_report is empty/null | Graceful fallback — only name-based dedup |
| bid_extractions parse failure | Graceful fallback — pass through all items |
| Extraction has no contractor name | Item passes through (not deduped, to be safe) |
| Same contractor, different names (typo) | Not caught — name must match exactly (case-insensitive) |

---

## Impact

| Metric | Before (Run 16) | After (Expected) |
|---|---|---|
| Loop iterations | 4 (one per PDF) | 2-4 (one per unique contractor) |
| Markdown per item | 15,000-20,000 chars | 500-1,500 chars (trimmed) |
| Total prompt size | ~70,000+ chars | ~55,000 chars |
| Searches per run | 14+ (budget violated) | 4-6 per contractor × unique count |
| Runtime | ~30 minutes | ~5-10 minutes |
| AI credits | 223 | ~60-100 (estimated) |

### Why This Fixes the Search Budget Violation

The 14+ searches in Run 16 were caused by **prompt overload**. The Gemini Flash agent received ~70K chars of context including 15K+ chars of multi-config equipment/scope/pricing data that it doesn't need. The agent couldn't track the 4-6 search budget instruction buried in that massive input.

By trimming the markdown to only contractor-relevant sections, the agent receives a focused input and can follow the search budget instruction more reliably.

---

## Related Spec Updates

After deploying this Code Node, update `contractor-researcher.md`:
- Change the "How This Node Fits the Architecture" section to reference the dedup node
- Remove the "Future optimization: deduplicate at the loop level" note — it's now done
- Update the listSource reference in MindPal Configuration Mapping
