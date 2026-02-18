# MindPal v10 Prompt Templates

Ready-to-paste prompts for updating MindPal workflow nodes to v10 schema.

## Quick Start

1. Open your MindPal workflow in the editor
2. For each node below, copy the entire prompt from the corresponding file
3. Paste into the node's prompt field in MindPal
4. Save the workflow

## Node Prompts

### 1. Extract All Bids (LOOP Node)
**File:** `01-extract-all-bids-prompt.md`

**Changes from v8:**
- Flat contractor fields (contractor_name, contractor_phone, etc.) instead of nested contractor_info
- Added customer_info extraction (property_address, property_city, property_state, property_zip)
- Confidence values are now enums ("high", "medium", "low") instead of numbers (0-100)
- Added disposal_cost, electrical_cost fields
- Added quote_date field
- Flat scope, electrical, payment fields instead of nested objects

**Critical:** contractor_name is now a top-level REQUIRED field

---

### 2. Equipment Researcher (LOOP Node)
**File:** `02-equipment-researcher-prompt.md`

**Changes from v8:**
- Role changed from "re-extract everything" to "enhance equipment only"
- Input reference changed from {{bid.contractor_info.company_name}} to {{bid.contractor_name}}
- Returns same bid object with enhanced equipment array (not full re-extraction)
- Only performs web research for equipment with model_number present

**Critical:** This node should NOT modify contractor, pricing, scope, or other non-equipment fields

---

### 3. Contractor Researcher (LOOP Node)
**File:** `03-contractor-researcher-prompt.md`

**Changes from v8:**
- Input reference changed from {{bid.contractor_info.company_name}} to {{bid.contractor_name}}
- Output contractor_name must match input exactly (case-sensitive)

**Critical:** contractor_name matching is essential for data merging in JSON Assembler

---

## Validation Checklist

After updating all prompts, verify:

- [ ] Extract All Bids outputs flat contractor fields (not nested)
- [ ] Extract All Bids uses "high|medium|low" confidence (not 0-100)
- [ ] Equipment Researcher references {{bid.contractor_name}} (not {{bid.contractor_info.company_name}})
- [ ] Equipment Researcher only enhances equipment array (doesn't re-extract other fields)
- [ ] Contractor Researcher references {{bid.contractor_name}}
- [ ] All nodes output valid JSON only (no markdown, no explanations)

---

## Testing

After updating prompts:

1. Test with a sample PDF
2. Check Extract All Bids output structure (should be flat, not nested)
3. Verify Equipment Researcher doesn't duplicate contractor/pricing data
4. Verify Contractor Researcher output has matching contractor_name
5. Check that all confidence values are "high", "medium", or "low" (not numbers)

---

## Backend Compatibility

The backend webhook handler (`make-webhook/index.ts`) and data mapper (`v8Mapper.ts`) have been updated to support BOTH:
- v10 flat structure (contractor_name at top level)
- v8 nested structure (contractor_info.company_name) for backwards compatibility

This means you can update nodes incrementally without breaking the system.

---

## Need Help?

If you encounter issues:
1. Check that contractor_name is present in Extract All Bids output
2. Verify Equipment Researcher isn't re-extracting (should only enhance equipment)
3. Confirm Contractor Researcher output has exact contractor_name match
4. Test with MindPal's JSON validator before saving workflow
