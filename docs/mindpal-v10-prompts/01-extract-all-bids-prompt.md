# Extract All Bids Node Prompt (v10)

**Copy this entire prompt into the MindPal "Extract All Bids" LOOP node.**

---

You are extracting contractor bid information from HVAC documents provided via URL.

DOCUMENT URL:
{{url}}

EXTRACTION STRATEGY:

MindPal now supports native PDF scraping from public URLs. For this URL:

1. Fetch the PDF content directly from the URL using MindPal's native PDF scraping
2. Parse the extracted text carefully
3. Extract all structured bid data INCLUDING line-item breakdowns
4. Return structured JSON with all available data

EXTRACT INTO THIS JSON STRUCTURE:

{
  "contractor_name": "string (REQUIRED - company name exactly as appears in bid)",
  "contractor_company": "string or null",
  "contractor_contact_name": "string or null",
  "contractor_phone": "string or null",
  "contractor_email": "string or null",
  "contractor_address": "string or null",
  "contractor_license": "string or null",
  "contractor_license_state": "string or null",
  "contractor_website": "string or null",
  "contractor_years_in_business": "number or null",
  "contractor_certifications": ["array of strings"],
  
  "customer_info": {
    "property_address": "string or null",
    "property_city": "string or null",
    "property_state": "string or null",
    "property_zip": "string or null"
  },
  
  "total_bid_amount": "number (REQUIRED)",
  "labor_cost": "number or null",
  "equipment_cost": "number or null",
  "materials_cost": "number or null",
  "permit_cost": "number or null",
  "disposal_cost": "number or null",
  "electrical_cost": "number or null",
  "total_before_rebates": "number or null",
  "estimated_rebates": "number or null",
  "total_after_rebates": "number or null",
  "rebates_mentioned": ["array of strings"],
  
  "equipment": [{
    "equipment_type": "outdoor_unit|indoor_unit|air_handler|thermostat|line_set|disconnect|pad|other (REQUIRED)",
    "brand": "string (REQUIRED)",
    "model_number": "string or null",
    "capacity_tons": "number or null",
    "seer2_rating": "number or null",
    "hspf2_rating": "number or null",
    "variable_speed": "boolean or null",
    "refrigerant_type": "string or null",
    "voltage": "number or null",
    "amperage_draw": "number (max rated amps) or null",
    "minimum_circuit_amperage": "number (breaker size) or null",
    "confidence": "high|medium|low"
  }],
  
  "line_items": [{
    "item_type": "equipment|labor|materials|permit|disposal|electrical|ductwork|thermostat|other (REQUIRED)",
    "description": "string (REQUIRED - e.g., 'Carrier 5-ton Heat Pump Outdoor Unit' or 'Installation Labor')",
    "quantity": "number (default 1 if not specified)",
    "unit_price": "number or null",
    "total_price": "number (REQUIRED)",
    "brand": "string or null (for equipment items)",
    "model_number": "string or null (for equipment items)",
    "confidence": "high|medium|low",
    "line_order": "number or null"
  }],
  
  "labor_warranty_years": "number or null",
  "equipment_warranty_years": "number or null",
  "compressor_warranty_years": "number or null",
  "additional_warranty_details": "string or null",
  
  "estimated_days": "number or null",
  "start_date_available": "YYYY-MM-DD or null",
  
  "scope_summary": "string or null",
  "inclusions": ["array of strings"],
  "exclusions": ["array of strings"],
  "scope_permit_included": "boolean or null",
  "scope_disposal_included": "boolean or null",
  "scope_electrical_included": "boolean or null",
  "scope_ductwork_included": "boolean or null",
  "scope_thermostat_included": "boolean or null",
  "scope_manual_j_included": "boolean or null",
  "scope_commissioning_included": "boolean or null",
  "scope_air_handler_included": "boolean or null",
  "scope_line_set_included": "boolean or null",
  "scope_disconnect_included": "boolean or null",
  "scope_pad_included": "boolean or null",
  "scope_drain_line_included": "boolean or null",
  
  "electrical_panel_assessment_included": "boolean or null",
  "electrical_panel_upgrade_included": "boolean or null",
  "electrical_panel_upgrade_cost": "number or null",
  "electrical_existing_panel_amps": "number or null",
  "electrical_proposed_panel_amps": "number or null",
  "electrical_breaker_size_required": "number or null",
  "electrical_dedicated_circuit_included": "boolean or null",
  "electrical_permit_included": "boolean or null",
  "electrical_load_calculation_included": "boolean or null",
  "electrical_notes": "string or null",
  
  "deposit_required": "number or null (dollar amount)",
  "deposit_percentage": "number or null",
  "payment_schedule": "string or null",
  "financing_offered": "boolean or null",
  "financing_terms": "string or null",
  
  "bid_date": "YYYY-MM-DD or null",
  "quote_date": "YYYY-MM-DD or null",
  
  "extraction_confidence": "high|medium|low (REQUIRED)",
  "extraction_notes": "string or null (explain any issues or special notes)"
}

CRITICAL LINE ITEMS EXTRACTION RULES:
- Look for itemized pricing tables, breakdowns, or line-by-line cost sections
- EVERY pricing component should be represented: equipment, labor, materials, permits, disposal, electrical, ductwork, thermostat, etc.
- For equipment items, preserve brand + model_number if available
- Set quantity=1 if not explicitly specified
- Extract BOTH unit_price and total_price if available
- For summary-style bids, decompose the total into logical line items (e.g., Equipment $15,000, Labor $3,500, Permits $500)
- Assign high confidence (high) for explicitly itemized data
- Assign medium confidence (medium) for inferred/decomposed data
- Assign low confidence (low) for uncertain items

IMPORTANT NOTES:
- The input {{url}} is a single PDF URL string
- Fetch the PDF content directly using MindPal's native PDF scraping from the URL
- Parse the extracted PDF text carefully for all bid information
- If the URL is invalid or fetch fails, note this in extraction_notes and return extraction_confidence: low
- Return ONLY valid JSON. No explanations or extra text.
- Include all fields even if null/empty
- line_items array is MANDATORY - every bid must have at least one line item entry
- Use "high", "medium", or "low" for confidence fields (NOT numbers)
- All monetary values must be numbers (no $ or commas)
- All dates must be YYYY-MM-DD format
- All booleans must be true/false (not "yes"/"no")
- contractor_name is REQUIRED and must match the bid document exactly (case-sensitive)
