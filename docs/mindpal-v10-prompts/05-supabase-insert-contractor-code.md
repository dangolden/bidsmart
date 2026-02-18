# Supabase Direct Insert - Contractor Fields (v10)

**Copy this code section to update contractor field mapping in your Supabase Direct Insert CODE node.**

---

## Problem

The old Supabase Insert expects nested contractor research paths:
```python
# OLD CODE (v24) - WILL BREAK WITH v10:
contractor_license = safe_str(safe_get(bid, 'contractor_verification', {}).get('verification', {}).get('license_number'))
yelp_rating = safe_float(safe_get(yelp_data, 'rating'))
bbb_rating = safe_str(safe_get(bbb_data, 'rating'))
```

The v10 JSON Assembler outputs flat contractor fields:
```json
{
  "contractor_name": "ABC HVAC",
  "contractor_license": "123456",
  "contractor_google_rating": 4.8,
  "contractor_yelp_rating": 4.5,
  "contractor_bbb_rating": "A+",
  "red_flags": [...],
  "positive_indicators": [...]
}
```

---

## Updated Contractor Bid Insert (v10 Compatible)

Replace the contractor_bids insert section with this:

```python
# ═══════════════════════════════════════════════════════════════════════════
# CONTRACTOR BIDS INSERT (v10 - FLAT STRUCTURE)
# ═══════════════════════════════════════════════════════════════════════════

def build_contractor_bid_record(bid, project_id, pdf_upload_id):
    """
    Build contractor_bids table record from v10 flat bid structure.
    v10: All contractor fields are at top level with contractor_ prefix.
    """
    return {
        # Required fields
        "project_id": project_id,
        "contractor_name": safe_str(safe_get(bid, 'contractor_name')) or "Unknown Contractor",
        "total_bid_amount": safe_float(safe_get(bid, 'total_bid_amount')) or 0,
        
        # Contractor info (v10: flat at top level)
        "contractor_company": safe_str(safe_get(bid, 'contractor_company')),
        "contractor_phone": safe_str(safe_get(bid, 'contractor_phone')),
        "contractor_email": safe_str(safe_get(bid, 'contractor_email')),
        "contractor_address": safe_str(safe_get(bid, 'contractor_address')),
        "contractor_contact_name": safe_str(safe_get(bid, 'contractor_contact_name')),
        "contractor_website": safe_str(safe_get(bid, 'contractor_website')),
        "contractor_years_in_business": safe_int(safe_get(bid, 'contractor_years_in_business')),
        
        # License info (v10: flat, from Contractor Researcher)
        "contractor_license": safe_str(safe_get(bid, 'contractor_license')),
        "contractor_license_state": safe_str(safe_get(bid, 'contractor_license_state')),
        "contractor_insurance_verified": safe_bool(safe_get(bid, 'contractor_insurance_verified')),
        
        # Ratings (v10: flat at top level with contractor_ prefix)
        "contractor_google_rating": safe_float(safe_get(bid, 'contractor_google_rating')),
        "contractor_google_review_count": safe_int(safe_get(bid, 'contractor_google_review_count')),
        "contractor_yelp_rating": safe_float(safe_get(bid, 'contractor_yelp_rating')),
        "contractor_yelp_review_count": safe_int(safe_get(bid, 'contractor_yelp_review_count')),
        "contractor_bbb_rating": safe_str(safe_get(bid, 'contractor_bbb_rating')),
        "contractor_bbb_accredited": safe_bool(safe_get(bid, 'contractor_bbb_accredited')),
        "contractor_bbb_complaints_3yr": safe_int(safe_get(bid, 'contractor_bbb_complaints_3yr')),
        "contractor_bonded": safe_bool(safe_get(bid, 'contractor_bonded')),
        
        # Business info (v10: flat)
        "contractor_employee_count": safe_str(safe_get(bid, 'contractor_employee_count')),
        "contractor_service_area": safe_str(safe_get(bid, 'contractor_service_area')),
        
        # Certifications (v10: array at top level)
        "contractor_certifications": safe_get(bid, 'contractor_certifications') or [],
        
        # Pricing (v10: flat at top level)
        "labor_cost": safe_float(safe_get(bid, 'labor_cost')),
        "equipment_cost": safe_float(safe_get(bid, 'equipment_cost')),
        "materials_cost": safe_float(safe_get(bid, 'materials_cost')),
        "permit_cost": safe_float(safe_get(bid, 'permit_cost')),
        "disposal_cost": safe_float(safe_get(bid, 'disposal_cost')),
        "electrical_cost": safe_float(safe_get(bid, 'electrical_cost')),
        "total_before_rebates": safe_float(safe_get(bid, 'total_before_rebates')),
        "estimated_rebates": safe_float(safe_get(bid, 'estimated_rebates')),
        "total_after_rebates": safe_float(safe_get(bid, 'total_after_rebates')),
        "rebates_mentioned": safe_get(bid, 'rebates_mentioned') or [],
        
        # Timeline & Warranty
        "estimated_days": safe_int(safe_get(bid, 'estimated_days')),
        "start_date_available": safe_str(safe_get(bid, 'start_date_available')),
        "labor_warranty_years": safe_int(safe_get(bid, 'labor_warranty_years')),
        "equipment_warranty_years": safe_int(safe_get(bid, 'equipment_warranty_years')),
        "compressor_warranty_years": safe_int(safe_get(bid, 'compressor_warranty_years')),
        "additional_warranty_details": safe_str(safe_get(bid, 'additional_warranty_details')),
        
        # Payment terms (v10: flat, deposit_amount is the dollar amount)
        "deposit_required": safe_float(safe_get(bid, 'deposit_amount')),
        "deposit_required_flag": (safe_float(safe_get(bid, 'deposit_amount')) or 0) > 0,
        "deposit_percentage": safe_float(safe_get(bid, 'deposit_percentage')),
        "payment_schedule": safe_str(safe_get(bid, 'payment_schedule')),
        "financing_offered": safe_bool(safe_get(bid, 'financing_offered')) or False,
        "financing_terms": safe_str(safe_get(bid, 'financing_terms')),
        
        # Scope of work (v10: flat, only 4 critical booleans extracted)
        "scope_summary": safe_str(safe_get(bid, 'scope_summary')),
        "inclusions": safe_get(bid, 'inclusions') or [],
        "exclusions": safe_get(bid, 'exclusions') or [],
        "scope_permit_included": safe_bool(safe_get(bid, 'scope_permit_included')),
        "scope_disposal_included": safe_bool(safe_get(bid, 'scope_disposal_included')),
        "scope_electrical_included": safe_bool(safe_get(bid, 'scope_electrical_included')),
        "scope_thermostat_included": safe_bool(safe_get(bid, 'scope_thermostat_included')),
        # Remaining scope booleans - pass through (will be null from v10)
        "scope_ductwork_included": safe_bool(safe_get(bid, 'scope_ductwork_included')),
        "scope_manual_j_included": safe_bool(safe_get(bid, 'scope_manual_j_included')),
        "scope_commissioning_included": safe_bool(safe_get(bid, 'scope_commissioning_included')),
        "scope_air_handler_included": safe_bool(safe_get(bid, 'scope_air_handler_included')),
        "scope_line_set_included": safe_bool(safe_get(bid, 'scope_line_set_included')),
        "scope_disconnect_included": safe_bool(safe_get(bid, 'scope_disconnect_included')),
        "scope_pad_included": safe_bool(safe_get(bid, 'scope_pad_included')),
        "scope_drain_line_included": safe_bool(safe_get(bid, 'scope_drain_line_included')),
        
        # Electrical (v10: flat with electrical_ prefix)
        "electrical_panel_assessment_included": safe_bool(safe_get(bid, 'electrical_panel_assessment_included')),
        "electrical_panel_upgrade_included": safe_bool(safe_get(bid, 'electrical_panel_upgrade_included')),
        "electrical_panel_upgrade_cost": safe_float(safe_get(bid, 'electrical_panel_upgrade_cost')),
        "electrical_existing_panel_amps": safe_int(safe_get(bid, 'electrical_existing_panel_amps')),
        "electrical_proposed_panel_amps": safe_int(safe_get(bid, 'electrical_proposed_panel_amps')),
        "electrical_breaker_size_required": safe_int(safe_get(bid, 'electrical_breaker_size_required')),
        "electrical_dedicated_circuit_included": safe_bool(safe_get(bid, 'electrical_dedicated_circuit_included')),
        "electrical_permit_included": safe_bool(safe_get(bid, 'electrical_permit_included')),
        "electrical_load_calculation_included": safe_bool(safe_get(bid, 'electrical_load_calculation_included')),
        "electrical_notes": safe_str(safe_get(bid, 'electrical_notes')),
        
        # Dates (v10: flat)
        "bid_date": safe_str(safe_get(bid, 'bid_date')),
        "quote_date": safe_str(safe_get(bid, 'quote_date')),
        "valid_until": safe_str(safe_get(bid, 'valid_until')),
        
        # NEW v10 FIELDS: Red flags and positive indicators (from Contractor Researcher)
        "red_flags": safe_get(bid, 'red_flags') or [],
        "positive_indicators": safe_get(bid, 'positive_indicators') or [],
        
        # Extraction metadata
        "pdf_upload_id": pdf_upload_id,
        "extraction_confidence": map_confidence_to_enum(safe_get(bid, 'extraction_confidence')),
        "extraction_notes": safe_str(safe_get(bid, 'extraction_notes')),
        "verified_by_user": False,
        "is_favorite": False,
    }


def map_confidence_to_enum(confidence):
    """
    Map confidence value to enum.
    v10: Accepts both numeric (0-100) and enum ("high"|"medium"|"low")
    """
    if not confidence:
        return "manual"
    
    # v10: Handle enum strings (preferred)
    if isinstance(confidence, str):
        lower = confidence.lower()
        if lower in ('high', 'medium', 'low'):
            return lower
        return "manual"
    
    # Handle numeric confidence (0-1 or 0-100)
    if isinstance(confidence, (int, float)):
        normalized = confidence / 100 if confidence > 1 else confidence
        if normalized >= 0.8:
            return "high"
        if normalized >= 0.5:
            return "medium"
        return "low"
    
    return "manual"
```

---

## Customer Info to Projects Table (v10)

```python
# ═══════════════════════════════════════════════════════════════════════════
# PROJECTS TABLE UPDATE (v10 - customer_info extraction)
# ═══════════════════════════════════════════════════════════════════════════

def update_project_with_customer_info(supabase_client, project_id, first_bid):
    """
    Update projects table with customer_info from first bid.
    v10: customer_info is nested object in bid, maps to projects table.
    """
    customer_info = safe_get(first_bid, 'customer_info')
    if not customer_info:
        return
    
    update_data = {}
    
    if safe_get(customer_info, 'property_address'):
        update_data['property_address'] = safe_str(safe_get(customer_info, 'property_address'))
    if safe_get(customer_info, 'property_city'):
        update_data['property_city'] = safe_str(safe_get(customer_info, 'property_city'))
    if safe_get(customer_info, 'property_state'):
        update_data['property_state'] = safe_str(safe_get(customer_info, 'property_state'))
    if safe_get(customer_info, 'property_zip'):
        update_data['property_zip'] = safe_str(safe_get(customer_info, 'property_zip'))
    
    if update_data:
        update_data['updated_at'] = datetime.utcnow().isoformat()
        supabase_client.table('projects').update(update_data).eq('id', project_id).execute()
```

---

## Helper Functions

```python
def safe_get(obj, key, default=None):
    """Safely get a value from dict or return default."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return default

def safe_str(value):
    """Convert value to string or return None."""
    if value is None:
        return None
    return str(value).strip() if str(value).strip() else None

def safe_int(value):
    """Convert value to int or return None."""
    if value is None:
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None

def safe_float(value):
    """Convert value to float or return None."""
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def safe_bool(value):
    """Convert value to boolean or return None."""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lower = value.lower()
        if lower in ('true', 'yes', '1'):
            return True
        if lower in ('false', 'no', '0'):
            return False
        return None
    return bool(value)
```

---

## Key Field Mapping Changes (v24 → v10)

| Database Column | Old v24 Path | New v10 Path |
|-----------------|--------------|--------------|
| `contractor_license` | `bid.contractor_verification.verification.license_number` | `bid.contractor_license` |
| `contractor_google_rating` | `bid.contractor_verification.reputation_and_reviews.google.rating` | `bid.contractor_google_rating` |
| `contractor_yelp_rating` | `bid.contractor_verification.reputation_and_reviews.yelp.rating` | `bid.contractor_yelp_rating` |
| `contractor_bbb_rating` | `bid.contractor_verification.reputation_and_reviews.better_business_bureau.rating` | `bid.contractor_bbb_rating` |
| `contractor_bonded` | `bid.contractor_verification.verification.bonding_status` | `bid.contractor_bonded` |
| `deposit_required` | `bid.payment_terms.deposit_amount` | `bid.deposit_amount` |
| `red_flags` | N/A | `bid.red_flags` (NEW) |
| `positive_indicators` | N/A | `bid.positive_indicators` (NEW) |
