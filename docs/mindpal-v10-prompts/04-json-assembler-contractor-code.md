# JSON Assembler v10 - FULL REPLACEMENT CODE

**Copy this ENTIRE code block to replace your JSON Assembler CODE node.**

---

```python
import json
import re

# ═══════════════════════════════════════════════════════════════════════════
# JSON ASSEMBLER v10 - FLAT STRUCTURE
# ═══════════════════════════════════════════════════════════════════════════

validation_report = {"status": "success", "bids_processed": 0, "errors": [], "warnings": []}
project_id = project_id_input

# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def safe_get(obj, key, default=None):
    return obj.get(key, default) if isinstance(obj, dict) else default

def safe_list(val):
    return val if isinstance(val, list) else []

def safe_dict(val):
    return val if isinstance(val, dict) else {}

def safe_str(val, default=None):
    if val is None:
        return default
    s = str(val).strip()
    return s if s else default

def safe_float(val, default=None):
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def safe_int(val, default=None):
    if val is None:
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default

def safe_bool(val):
    if val is None:
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        lower = val.lower()
        if lower in ('true', 'yes', '1'):
            return True
        if lower in ('false', 'no', '0'):
            return False
        return None
    return bool(val)

def parse_json_output(data):
    if isinstance(data, dict):
        return data
    if isinstance(data, str):
        data = data.strip()
        try:
            return json.loads(data)
        except json.JSONDecodeError:
            match = re.search(r'{.*}', data, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except:
                    return {}
    if isinstance(data, list):
        return {"items": data}
    return {}

def unwrap_agent_output(data, expected_key=None):
    if isinstance(data, dict):
        if expected_key and expected_key in data:
            return data[expected_key]
        if 'bids' in data:
            return data['bids']
        for key, val in data.items():
            if isinstance(val, list) and len(val) > 0:
                return val
    return data

# ═══════════════════════════════════════════════════════════════════════════
# v10: MERGE CONTRACTOR RESEARCH (FLAT STRUCTURE)
# ═══════════════════════════════════════════════════════════════════════════

def merge_contractor_research_v10(bid_record, contractor_research):
    """
    Merge flat contractor research into bid record.
    v10: All fields at top level with contractor_ prefix.
    """
    if not contractor_research or not isinstance(contractor_research, dict):
        return bid_record
    
    # License & verification (v10: flat)
    if safe_get(contractor_research, 'license_number'):
        bid_record['contractor_license'] = safe_str(safe_get(contractor_research, 'license_number'))
    if safe_get(contractor_research, 'license_status'):
        bid_record['contractor_license_status'] = safe_str(safe_get(contractor_research, 'license_status'))
    
    # Business info (v10: flat)
    if safe_get(contractor_research, 'years_in_business') is not None:
        bid_record['contractor_years_in_business'] = safe_int(safe_get(contractor_research, 'years_in_business'))
    if safe_get(contractor_research, 'employee_count'):
        bid_record['contractor_employee_count'] = safe_str(safe_get(contractor_research, 'employee_count'))
    if safe_get(contractor_research, 'service_area'):
        bid_record['contractor_service_area'] = safe_str(safe_get(contractor_research, 'service_area'))
    
    # Google ratings (v10: flat, not nested)
    if safe_get(contractor_research, 'google_rating') is not None:
        bid_record['contractor_google_rating'] = safe_float(safe_get(contractor_research, 'google_rating'))
    if safe_get(contractor_research, 'google_review_count') is not None:
        bid_record['contractor_google_review_count'] = safe_int(safe_get(contractor_research, 'google_review_count'))
    
    # Yelp ratings (v10: flat)
    if safe_get(contractor_research, 'yelp_rating') is not None:
        bid_record['contractor_yelp_rating'] = safe_float(safe_get(contractor_research, 'yelp_rating'))
    if safe_get(contractor_research, 'yelp_review_count') is not None:
        bid_record['contractor_yelp_review_count'] = safe_int(safe_get(contractor_research, 'yelp_review_count'))
    
    # BBB ratings (v10: flat)
    if safe_get(contractor_research, 'bbb_rating'):
        bid_record['contractor_bbb_rating'] = safe_str(safe_get(contractor_research, 'bbb_rating'))
    if safe_get(contractor_research, 'bbb_accredited') is not None:
        bid_record['contractor_bbb_accredited'] = safe_bool(safe_get(contractor_research, 'bbb_accredited'))
    if safe_get(contractor_research, 'bbb_complaints_3yr') is not None:
        bid_record['contractor_bbb_complaints_3yr'] = safe_int(safe_get(contractor_research, 'bbb_complaints_3yr'))
    
    # Bonding (v10: renamed from bonding_status to bonded)
    if safe_get(contractor_research, 'bonded') is not None:
        bid_record['contractor_bonded'] = safe_bool(safe_get(contractor_research, 'bonded'))
    
    # Certifications (v10: flat array)
    certs = safe_get(contractor_research, 'certifications')
    if certs and isinstance(certs, list):
        bid_record['contractor_certifications'] = certs
    
    # NEW v10 FIELDS: Red flags and positive indicators
    red_flags = safe_get(contractor_research, 'red_flags')
    if red_flags and isinstance(red_flags, list):
        bid_record['red_flags'] = red_flags
    
    positive_indicators = safe_get(contractor_research, 'positive_indicators')
    if positive_indicators and isinstance(positive_indicators, list):
        bid_record['positive_indicators'] = positive_indicators
    
    return bid_record

# ═══════════════════════════════════════════════════════════════════════════
# PARSE INPUTS
# ═══════════════════════════════════════════════════════════════════════════

equipment_data = parse_json_output(equipment_output)
scoring_data = parse_json_output(scoring_output)
contractor_research_data = parse_json_output(contractor_research_output)
overall_faq_data = parse_json_output(overall_faq_output)

if isinstance(scoring_data, list):
    scoring_list = scoring_data
else:
    scoring_list = [scoring_data] if scoring_data else []

if isinstance(contractor_research_data, list):
    contractor_research_list = contractor_research_data
else:
    unwrapped = unwrap_agent_output(contractor_research_data)
    if isinstance(unwrapped, list):
        contractor_research_list = unwrapped
    else:
        contractor_research_list = [contractor_research_data] if contractor_research_data else []

bids_array_raw = safe_list(safe_get(equipment_data, 'bids', []))

if not bids_array_raw:
    unwrapped = unwrap_agent_output(equipment_data, 'bids')
    if isinstance(unwrapped, list):
        bids_array_raw = unwrapped
    else:
        validation_report['errors'].append('No bids found in equipment_output')
        bids_array = []

# ═══════════════════════════════════════════════════════════════════════════
# MAIN BID ASSEMBLY LOOP (v10 - FLAT STRUCTURE)
# ═══════════════════════════════════════════════════════════════════════════

if bids_array_raw:
    bids_array = []
    for bid_idx, bid_raw in enumerate(bids_array_raw):
        try:
            bid = safe_dict(bid_raw)
            
            # v10: contractor_name is at TOP LEVEL (not nested in contractor_info)
            contractor_name = safe_str(safe_get(bid, 'contractor_name'))
            
            # v10: total_bid_amount at top level
            total_amount = safe_float(safe_get(bid, 'total_bid_amount'))
            
            if not contractor_name or total_amount is None:
                validation_report['warnings'].append(f'Bid {bid_idx}: Incomplete contractor name or pricing')
                continue
            
            # v10: Build flat bid record (no nested objects)
            bid_record = {
                'bid_index': bid_idx,
                
                # Contractor info (v10: flat at top level)
                'contractor_name': contractor_name,
                'contractor_company': safe_str(safe_get(bid, 'contractor_company')),
                'contractor_phone': safe_str(safe_get(bid, 'contractor_phone')),
                'contractor_email': safe_str(safe_get(bid, 'contractor_email')),
                'contractor_address': safe_str(safe_get(bid, 'contractor_address')),
                'contractor_contact_name': safe_str(safe_get(bid, 'contractor_contact_name')),
                'contractor_license': safe_str(safe_get(bid, 'contractor_license')),
                'contractor_license_state': safe_str(safe_get(bid, 'contractor_license_state')),
                'contractor_website': safe_str(safe_get(bid, 'contractor_website')),
                'contractor_years_in_business': safe_int(safe_get(bid, 'contractor_years_in_business')),
                'contractor_certifications': safe_list(safe_get(bid, 'contractor_certifications', [])),
                
                # Customer info (v10: nested object, maps to projects table)
                'customer_info': safe_dict(safe_get(bid, 'customer_info', {})),
                
                # Pricing (v10: flat at top level)
                'total_bid_amount': total_amount,
                'labor_cost': safe_float(safe_get(bid, 'labor_cost')),
                'equipment_cost': safe_float(safe_get(bid, 'equipment_cost')),
                'materials_cost': safe_float(safe_get(bid, 'materials_cost')),
                'permit_cost': safe_float(safe_get(bid, 'permit_cost')),
                'disposal_cost': safe_float(safe_get(bid, 'disposal_cost')),
                'electrical_cost': safe_float(safe_get(bid, 'electrical_cost')),
                'total_before_rebates': safe_float(safe_get(bid, 'total_before_rebates')),
                'estimated_rebates': safe_float(safe_get(bid, 'estimated_rebates')),
                'total_after_rebates': safe_float(safe_get(bid, 'total_after_rebates')),
                'rebates_mentioned': safe_list(safe_get(bid, 'rebates_mentioned', [])),
                
                # Equipment & line items (arrays)
                'equipment': safe_list(safe_get(bid, 'equipment', [])),
                'line_items': safe_list(safe_get(bid, 'line_items', [])),
                
                # Warranty (v10: flat)
                'labor_warranty_years': safe_int(safe_get(bid, 'labor_warranty_years')),
                'equipment_warranty_years': safe_int(safe_get(bid, 'equipment_warranty_years')),
                'compressor_warranty_years': safe_int(safe_get(bid, 'compressor_warranty_years')),
                'additional_warranty_details': safe_str(safe_get(bid, 'additional_warranty_details')),
                
                # Timeline (v10: flat)
                'estimated_days': safe_int(safe_get(bid, 'estimated_days')),
                'start_date_available': safe_str(safe_get(bid, 'start_date_available')),
                
                # Scope of work (v10: flat, only 4 critical booleans)
                'scope_summary': safe_str(safe_get(bid, 'scope_summary')),
                'inclusions': safe_list(safe_get(bid, 'inclusions', [])),
                'exclusions': safe_list(safe_get(bid, 'exclusions', [])),
                'scope_permit_included': safe_bool(safe_get(bid, 'scope_permit_included')),
                'scope_electrical_included': safe_bool(safe_get(bid, 'scope_electrical_included')),
                'scope_disposal_included': safe_bool(safe_get(bid, 'scope_disposal_included')),
                'scope_thermostat_included': safe_bool(safe_get(bid, 'scope_thermostat_included')),
                # Remaining 9 scope booleans (will be null from v10)
                'scope_ductwork_included': safe_bool(safe_get(bid, 'scope_ductwork_included')),
                'scope_manual_j_included': safe_bool(safe_get(bid, 'scope_manual_j_included')),
                'scope_commissioning_included': safe_bool(safe_get(bid, 'scope_commissioning_included')),
                'scope_air_handler_included': safe_bool(safe_get(bid, 'scope_air_handler_included')),
                'scope_line_set_included': safe_bool(safe_get(bid, 'scope_line_set_included')),
                'scope_disconnect_included': safe_bool(safe_get(bid, 'scope_disconnect_included')),
                'scope_pad_included': safe_bool(safe_get(bid, 'scope_pad_included')),
                'scope_drain_line_included': safe_bool(safe_get(bid, 'scope_drain_line_included')),
                
                # Electrical (v10: flat with electrical_ prefix)
                'electrical_panel_assessment_included': safe_bool(safe_get(bid, 'electrical_panel_assessment_included')),
                'electrical_panel_upgrade_included': safe_bool(safe_get(bid, 'electrical_panel_upgrade_included')),
                'electrical_panel_upgrade_cost': safe_float(safe_get(bid, 'electrical_panel_upgrade_cost')),
                'electrical_existing_panel_amps': safe_int(safe_get(bid, 'electrical_existing_panel_amps')),
                'electrical_proposed_panel_amps': safe_int(safe_get(bid, 'electrical_proposed_panel_amps')),
                'electrical_breaker_size_required': safe_int(safe_get(bid, 'electrical_breaker_size_required')),
                'electrical_dedicated_circuit_included': safe_bool(safe_get(bid, 'electrical_dedicated_circuit_included')),
                'electrical_permit_included': safe_bool(safe_get(bid, 'electrical_permit_included')),
                'electrical_load_calculation_included': safe_bool(safe_get(bid, 'electrical_load_calculation_included')),
                'electrical_notes': safe_str(safe_get(bid, 'electrical_notes')),
                
                # Payment terms (v10: flat, deposit_amount is dollar amount)
                'deposit_amount': safe_float(safe_get(bid, 'deposit_amount')),
                'deposit_percentage': safe_float(safe_get(bid, 'deposit_percentage')),
                'payment_schedule': safe_str(safe_get(bid, 'payment_schedule')),
                'financing_offered': safe_bool(safe_get(bid, 'financing_offered')),
                'financing_terms': safe_str(safe_get(bid, 'financing_terms')),
                
                # Dates (v10: flat)
                'bid_date': safe_str(safe_get(bid, 'bid_date')),
                'quote_date': safe_str(safe_get(bid, 'quote_date')),
                
                # Extraction metadata
                'extraction_confidence': safe_str(safe_get(bid, 'extraction_confidence'), 'medium'),
                'extraction_notes': safe_str(safe_get(bid, 'extraction_notes')),
            }
            
            # ═══════════════════════════════════════════════════════════════
            # MERGE CONTRACTOR RESEARCH (v10: by name matching)
            # ═══════════════════════════════════════════════════════════════
            
            # First try: match by index
            if isinstance(contractor_research_list, list) and len(contractor_research_list) > bid_idx:
                contractor_data = contractor_research_list[bid_idx]
                if isinstance(contractor_data, dict):
                    bid_record = merge_contractor_research_v10(bid_record, contractor_data)
                elif isinstance(contractor_data, str):
                    try:
                        bid_record = merge_contractor_research_v10(bid_record, json.loads(contractor_data))
                    except:
                        pass
            
            # Fallback: match by contractor_name
            if 'contractor_google_rating' not in bid_record and isinstance(contractor_research_list, list):
                for contractor_data in contractor_research_list:
                    if isinstance(contractor_data, dict):
                        res_name = safe_str(safe_get(contractor_data, 'contractor_name'))
                        if res_name and res_name.lower() == contractor_name.lower():
                            bid_record = merge_contractor_research_v10(bid_record, contractor_data)
                            break
            
            # ═══════════════════════════════════════════════════════════════
            # MERGE SCORING DATA
            # ═══════════════════════════════════════════════════════════════
            
            if isinstance(scoring_list, list) and len(scoring_list) > bid_idx:
                score_item = scoring_list[bid_idx]
                if isinstance(score_item, dict):
                    bid_record['scoring'] = score_item
                elif isinstance(score_item, str):
                    try:
                        bid_record['scoring'] = json.loads(score_item)
                    except:
                        bid_record['scoring'] = {}
            
            if 'scoring' not in bid_record and isinstance(scoring_list, list):
                for score_item in scoring_list:
                    if isinstance(score_item, dict):
                        score_name = safe_str(safe_get(score_item, 'contractor_name'))
                        if score_name and score_name.lower() == contractor_name.lower():
                            bid_record['scoring'] = score_item
                            break
            
            bids_array.append(bid_record)
            validation_report['bids_processed'] += 1
        
        except Exception as e:
            validation_report['errors'].append(f"Exception bid {bid_idx}: {str(e)}")
else:
    bids_array = []

# ═══════════════════════════════════════════════════════════════════════════
# FINAL OUTPUT
# ═══════════════════════════════════════════════════════════════════════════

final_output = {
    'schema_version': 'bidsmart.v10',
    'project_id': project_id,
    'bids': bids_array,
    'analysis': {
        'overall_faqs': safe_list(safe_get(overall_faq_data, 'faqs', [])) or safe_list(safe_get(overall_faq_data, 'overall_faq_output', {}).get('faqs', []))
    }
}

final_json = json.dumps(final_output, indent=2, default=str)
bids = bids_array

if validation_report['errors']:
    validation_report['status'] = 'error'
elif validation_report['warnings']:
    validation_report['status'] = 'warning'

validation_report['merged_bids_count'] = len(bids_array)
```

---

## Key Changes from v25

| v25 (Old) | v10 (New) |
|-----------|-----------|
| `contractor_info.company_name` | `contractor_name` (top level) |
| `pricing.total_amount` | `total_bid_amount` (top level) |
| `scope_of_work.summary` | `scope_summary` (top level) |
| `electrical.panel_upgrade_cost` | `electrical_panel_upgrade_cost` (flat) |
| `payment_and_financing.deposit_amount` | `deposit_amount` (flat) |
| `contractor_verification` nested object | Flat `contractor_*` fields |
| `schema_version: 'bidsmart.v25'` | `schema_version: 'bidsmart.v10'` |
| No red_flags/positive_indicators | NEW: `red_flags`, `positive_indicators` arrays |
