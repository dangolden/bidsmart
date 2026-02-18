# JSON Assembler - Contractor Research Handler (v10)

**Copy this code section to replace the contractor research handling in your JSON Assembler CODE node.**

---

## Problem

The old JSON Assembler expects nested contractor research structure:
```python
# OLD CODE (v24) - WILL BREAK WITH v10:
verification = safe_dict(safe_get(contractor_data, 'verification'))
license_number = safe_get(verification, 'license_number')
reputation = safe_dict(safe_get(contractor_data, 'reputation_and_reviews'))
yelp_data = safe_dict(safe_get(reputation, 'yelp'))
```

The new v10 Contractor Researcher returns flat structure:
```json
{
  "contractor_name": "ABC HVAC",
  "license_number": "123456",
  "google_rating": 4.8,
  "yelp_rating": 4.5,
  "red_flags": [...],
  "positive_indicators": [...]
}
```

---

## Updated Code (v10 Compatible)

Replace the contractor research merging section with this:

```python
# ═══════════════════════════════════════════════════════════════════════════
# CONTRACTOR RESEARCH MERGING (v10 - FLAT STRUCTURE)
# ═══════════════════════════════════════════════════════════════════════════

def merge_contractor_research_v10(bid_data, contractor_research):
    """
    Merge flat contractor research data into bid.
    v10: contractor_research is now FLAT (no nested verification/reputation objects)
    """
    if not contractor_research:
        return bid_data
    
    # v10: Fields are now at top level, not nested
    # License & verification
    if safe_get(contractor_research, 'license_number'):
        bid_data['contractor_license'] = safe_str(safe_get(contractor_research, 'license_number'))
    if safe_get(contractor_research, 'license_status'):
        bid_data['contractor_license_status'] = safe_str(safe_get(contractor_research, 'license_status'))
    if safe_get(contractor_research, 'license_expiration_date'):
        bid_data['contractor_license_expiration'] = safe_str(safe_get(contractor_research, 'license_expiration_date'))
    
    # Business info
    if safe_get(contractor_research, 'years_in_business') is not None:
        bid_data['contractor_years_in_business'] = safe_int(safe_get(contractor_research, 'years_in_business'))
    if safe_get(contractor_research, 'employee_count'):
        bid_data['contractor_employee_count'] = safe_str(safe_get(contractor_research, 'employee_count'))
    if safe_get(contractor_research, 'service_area'):
        bid_data['contractor_service_area'] = safe_str(safe_get(contractor_research, 'service_area'))
    
    # Google ratings (v10: flat, not nested)
    if safe_get(contractor_research, 'google_rating') is not None:
        bid_data['contractor_google_rating'] = safe_float(safe_get(contractor_research, 'google_rating'))
    if safe_get(contractor_research, 'google_review_count') is not None:
        bid_data['contractor_google_review_count'] = safe_int(safe_get(contractor_research, 'google_review_count'))
    
    # Yelp ratings (v10: flat, not nested in yelp object)
    if safe_get(contractor_research, 'yelp_rating') is not None:
        bid_data['contractor_yelp_rating'] = safe_float(safe_get(contractor_research, 'yelp_rating'))
    if safe_get(contractor_research, 'yelp_review_count') is not None:
        bid_data['contractor_yelp_review_count'] = safe_int(safe_get(contractor_research, 'yelp_review_count'))
    
    # BBB ratings (v10: flat, not nested in better_business_bureau object)
    if safe_get(contractor_research, 'bbb_rating'):
        bid_data['contractor_bbb_rating'] = safe_str(safe_get(contractor_research, 'bbb_rating'))
    if safe_get(contractor_research, 'bbb_accredited') is not None:
        bid_data['contractor_bbb_accredited'] = safe_bool(safe_get(contractor_research, 'bbb_accredited'))
    if safe_get(contractor_research, 'bbb_complaints_3yr') is not None:
        bid_data['contractor_bbb_complaints_3yr'] = safe_int(safe_get(contractor_research, 'bbb_complaints_3yr'))
    
    # Insurance/bonding (v10: renamed from bonding_status to bonded)
    if safe_get(contractor_research, 'bonded') is not None:
        bid_data['contractor_bonded'] = safe_bool(safe_get(contractor_research, 'bonded'))
    
    # Certifications (v10: flat array at top level)
    certs = safe_get(contractor_research, 'certifications')
    if certs and isinstance(certs, list):
        bid_data['contractor_certifications'] = certs
    
    # NEW v10 FIELDS: Red flags and positive indicators
    red_flags = safe_get(contractor_research, 'red_flags')
    if red_flags and isinstance(red_flags, list):
        bid_data['red_flags'] = red_flags
    
    positive_indicators = safe_get(contractor_research, 'positive_indicators')
    if positive_indicators and isinstance(positive_indicators, list):
        bid_data['positive_indicators'] = positive_indicators
    
    # Research confidence
    if safe_get(contractor_research, 'research_confidence') is not None:
        bid_data['contractor_research_confidence'] = safe_int(safe_get(contractor_research, 'research_confidence'))
    
    return bid_data


# ═══════════════════════════════════════════════════════════════════════════
# USAGE IN MAIN ASSEMBLY LOOP
# ═══════════════════════════════════════════════════════════════════════════

# In your main bid assembly loop, replace the old contractor merge with:

for bid_idx, bid in enumerate(extracted_bids):
    assembled_bid = dict(bid)  # Start with extracted bid data
    
    # Match contractor research by contractor_name (v10: top-level field)
    contractor_name = safe_str(safe_get(bid, 'contractor_name'))
    
    # Find matching contractor research
    matching_research = None
    for cr in contractor_research_list:
        if safe_str(safe_get(cr, 'contractor_name')) == contractor_name:
            matching_research = cr
            break
    
    # Merge contractor research (v10 flat structure)
    if matching_research:
        assembled_bid = merge_contractor_research_v10(assembled_bid, matching_research)
    
    # ... rest of assembly (equipment research, etc.)
```

---

## Helper Functions (if not already defined)

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
    return str(value)

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
        return value.lower() in ('true', 'yes', '1')
    return bool(value)

def safe_dict(value):
    """Return value if dict, else empty dict."""
    if isinstance(value, dict):
        return value
    return {}
```

---

## Key Changes from v24

| Old (v24 nested) | New (v10 flat) |
|------------------|----------------|
| `contractor_data['verification']['license_number']` | `contractor_research['license_number']` |
| `contractor_data['reputation_and_reviews']['google']['rating']` | `contractor_research['google_rating']` |
| `contractor_data['reputation_and_reviews']['yelp']['rating']` | `contractor_research['yelp_rating']` |
| `contractor_data['reputation_and_reviews']['better_business_bureau']['rating']` | `contractor_research['bbb_rating']` |
| `bonding_status` | `bonded` (renamed) |
| N/A | `red_flags` (NEW) |
| N/A | `positive_indicators` (NEW) |
