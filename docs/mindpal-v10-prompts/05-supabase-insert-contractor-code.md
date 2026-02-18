# Supabase Direct Insert v10 - FULL REPLACEMENT CODE

**Copy this ENTIRE code block to replace your Supabase Direct Insert CODE node.**

---

```python
import json
from datetime import datetime
from supabase import create_client

# ═══════════════════════════════════════════════════════════════════════════
# SUPABASE DIRECT INSERT v10 - FLAT STRUCTURE
# ═══════════════════════════════════════════════════════════════════════════
# 
# REQUIRED INPUT PARAMETERS (configure these in MindPal CODE node settings):
#   - assembled_json: Output from JSON Assembler v10 (string or dict)
#   - supabase_url: Your Supabase project URL (e.g., "https://xxxx.supabase.co")
#   - supabase_key: Your Supabase SERVICE ROLE key (not anon/public key)
#
# ═══════════════════════════════════════════════════════════════════════════

# Initialize Supabase client (uses input parameters from MindPal)
supabase = create_client(supabase_url, supabase_key)

# Parse input from JSON Assembler
if isinstance(assembled_json, str):
    data = json.loads(assembled_json)
else:
    data = assembled_json

project_id = data.get('project_id')
bids = data.get('bids', [])
analysis = data.get('analysis', {})

insert_report = {
    "status": "success",
    "bids_inserted": 0,
    "equipment_inserted": 0,
    "line_items_inserted": 0,
    "bid_faqs_inserted": 0,
    "questions_inserted": 0,
    "overall_faqs_inserted": 0,
    "errors": [],
    "warnings": []
}

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

def map_confidence_to_enum(confidence):
    """
    Map confidence value to Supabase enum.
    v10: Accepts "high"|"medium"|"low" strings or numeric 0-100
    """
    if not confidence:
        return "medium"
    
    # v10: Handle enum strings (preferred)
    if isinstance(confidence, str):
        lower = confidence.lower()
        if lower in ('high', 'medium', 'low'):
            return lower
        return "medium"
    
    # Handle numeric confidence (0-1 or 0-100)
    if isinstance(confidence, (int, float)):
        normalized = confidence / 100 if confidence > 1 else confidence
        if normalized >= 0.8:
            return "high"
        if normalized >= 0.5:
            return "medium"
        return "low"
    
    return "medium"

def clean_record(record):
    """Remove None values to avoid Supabase issues."""
    return {k: v for k, v in record.items() if v is not None}

def safe_text_array(val):
    """
    Convert value to TEXT[] compatible format for PostgreSQL.
    Supabase contractor_certifications is TEXT[] not JSONB.
    """
    if val is None:
        return None
    if isinstance(val, list):
        # Filter out None/empty strings and convert all to strings
        return [str(item).strip() for item in val if item is not None and str(item).strip()]
    if isinstance(val, str):
        return [val.strip()] if val.strip() else None
    return None

# ═══════════════════════════════════════════════════════════════════════════
# UPDATE PROJECTS TABLE WITH CUSTOMER INFO (v10)
# ═══════════════════════════════════════════════════════════════════════════

def update_project_with_customer_info(project_id, first_bid):
    """
    Update projects table with customer_info from first bid.
    v10: customer_info is nested object, maps to projects table columns.
    """
    customer_info = safe_dict(safe_get(first_bid, 'customer_info'))
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
        try:
            update_data['updated_at'] = datetime.utcnow().isoformat()
            supabase.table('projects').update(update_data).eq('id', project_id).execute()
        except Exception as e:
            insert_report['warnings'].append(f"Failed to update project customer_info: {str(e)}")

# ═══════════════════════════════════════════════════════════════════════════
# BUILD CONTRACTOR BID RECORD (v10 - FLAT STRUCTURE)
# ═══════════════════════════════════════════════════════════════════════════

def build_contractor_bid_record(bid, project_id):
    """
    Build contractor_bids table record from v10 flat bid structure.
    v10: All fields at top level (no nested objects).
    """
    deposit_amount = safe_float(safe_get(bid, 'deposit_amount'))
    
    return {
        # Required fields
        "project_id": project_id,
        "contractor_name": safe_str(safe_get(bid, 'contractor_name')) or "Unknown Contractor",
        "total_bid_amount": safe_float(safe_get(bid, 'total_bid_amount')) or 0,
        "financing_offered": safe_bool(safe_get(bid, 'financing_offered')) or False,
        "extraction_confidence": map_confidence_to_enum(safe_get(bid, 'extraction_confidence')),
        "verified_by_user": False,
        "is_favorite": False,
        
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
        
        # Certifications (v10: array at top level, column is TEXT[] not JSONB)
        "contractor_certifications": safe_text_array(safe_get(bid, 'contractor_certifications')),
        
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
        "rebates_mentioned": safe_text_array(safe_get(bid, 'rebates_mentioned')),
        
        # Timeline & Warranty (v10: flat)
        "estimated_days": safe_int(safe_get(bid, 'estimated_days')),
        "start_date_available": safe_str(safe_get(bid, 'start_date_available')),
        "labor_warranty_years": safe_int(safe_get(bid, 'labor_warranty_years')),
        "equipment_warranty_years": safe_int(safe_get(bid, 'equipment_warranty_years')),
        "compressor_warranty_years": safe_int(safe_get(bid, 'compressor_warranty_years')),
        "additional_warranty_details": safe_str(safe_get(bid, 'additional_warranty_details')),
        
        # Payment terms (v10: flat, deposit_amount is the dollar amount)
        "deposit_required": deposit_amount,
        "deposit_required_flag": (deposit_amount or 0) > 0,
        "deposit_percentage": safe_float(safe_get(bid, 'deposit_percentage')),
        "payment_schedule": safe_str(safe_get(bid, 'payment_schedule')),
        "financing_terms": safe_str(safe_get(bid, 'financing_terms')),
        
        # Scope of work (v10: flat, only 4 critical booleans extracted)
        "scope_summary": safe_str(safe_get(bid, 'scope_summary')),
        "inclusions": safe_text_array(safe_get(bid, 'inclusions')),
        "exclusions": safe_text_array(safe_get(bid, 'exclusions')),
        "scope_permit_included": safe_bool(safe_get(bid, 'scope_permit_included')),
        "scope_disposal_included": safe_bool(safe_get(bid, 'scope_disposal_included')),
        "scope_electrical_included": safe_bool(safe_get(bid, 'scope_electrical_included')),
        "scope_thermostat_included": safe_bool(safe_get(bid, 'scope_thermostat_included')),
        # Remaining 9 scope booleans (will be null from v10)
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
        
        # NEW v10 FIELDS: Red flags and positive indicators
        "red_flags": safe_get(bid, 'red_flags') or [],
        "positive_indicators": safe_get(bid, 'positive_indicators') or [],
        
        # Scores (v10: flattened from Scoring Engine via JSON Assembler)
        "overall_score": safe_float(safe_get(bid, 'overall_score')),
        "value_score": safe_float(safe_get(bid, 'value_score')),
        "quality_score": safe_float(safe_get(bid, 'quality_score')),
        "completeness_score": safe_float(safe_get(bid, 'completeness_score')),
        
        # Extraction metadata
        "extraction_notes": safe_str(safe_get(bid, 'extraction_notes')),
    }

# ═══════════════════════════════════════════════════════════════════════════
# BUILD EQUIPMENT RECORD (v10)
# ═══════════════════════════════════════════════════════════════════════════

def build_equipment_record(equipment, bid_id):
    """
    Build bid_equipment table record.
    v10: Equipment fields are already flat from Equipment Researcher.
    """
    return {
        "bid_id": bid_id,
        "equipment_type": safe_str(safe_get(equipment, 'equipment_type')) or "Unknown",
        "brand": safe_str(safe_get(equipment, 'brand')) or "Unknown",
        "model_number": safe_str(safe_get(equipment, 'model_number')),
        "model_name": safe_str(safe_get(equipment, 'model_name')),
        "capacity_btu": safe_int(safe_get(equipment, 'capacity_btu')),
        "capacity_tons": safe_float(safe_get(equipment, 'capacity_tons')),
        "seer_rating": safe_float(safe_get(equipment, 'seer_rating')),
        "seer2_rating": safe_float(safe_get(equipment, 'seer2_rating')),
        "hspf_rating": safe_float(safe_get(equipment, 'hspf_rating')),
        "hspf2_rating": safe_float(safe_get(equipment, 'hspf2_rating')),
        "eer_rating": safe_float(safe_get(equipment, 'eer_rating')),
        "cop": safe_float(safe_get(equipment, 'cop')),
        "variable_speed": safe_bool(safe_get(equipment, 'variable_speed')),
        "stages": safe_int(safe_get(equipment, 'stages')),
        "refrigerant_type": safe_str(safe_get(equipment, 'refrigerant_type')),
        "sound_level_db": safe_float(safe_get(equipment, 'sound_level_db')),
        "voltage": safe_int(safe_get(equipment, 'voltage')),
        "amperage_draw": safe_float(safe_get(equipment, 'amperage_draw')),
        "minimum_circuit_amperage": safe_float(safe_get(equipment, 'minimum_circuit_amperage')),
        "energy_star_certified": safe_bool(safe_get(equipment, 'energy_star_certified')),
        "energy_star_most_efficient": safe_bool(safe_get(equipment, 'energy_star_most_efficient')),
        "warranty_years": safe_int(safe_get(equipment, 'warranty_years')),
        "compressor_warranty_years": safe_int(safe_get(equipment, 'compressor_warranty_years')),
        "equipment_cost": safe_float(safe_get(equipment, 'equipment_cost')),
        "confidence": map_confidence_to_enum(safe_get(equipment, 'confidence')),
    }

# ═══════════════════════════════════════════════════════════════════════════
# BUILD LINE ITEM RECORD (v10)
# ═══════════════════════════════════════════════════════════════════════════

def build_line_item_record(line_item, bid_id, line_order):
    """
    Build bid_line_items table record.
    """
    return {
        "bid_id": bid_id,
        "item_type": safe_str(safe_get(line_item, 'item_type')) or "other",
        "description": safe_str(safe_get(line_item, 'description')) or "No description",
        "quantity": safe_int(safe_get(line_item, 'quantity')) or 1,
        "unit_price": safe_float(safe_get(line_item, 'unit_price')),
        "total_price": safe_float(safe_get(line_item, 'total_price')) or 0,
        "brand": safe_str(safe_get(line_item, 'brand')),
        "model_number": safe_str(safe_get(line_item, 'model_number')),
        "confidence": map_confidence_to_enum(safe_get(line_item, 'confidence')),
        "source_text": safe_str(safe_get(line_item, 'source_text')),
        "line_order": line_order,
        "notes": safe_str(safe_get(line_item, 'notes')),
    }

# ═══════════════════════════════════════════════════════════════════════════
# BUILD FAQ RECORDS
# ═══════════════════════════════════════════════════════════════════════════

def build_bid_faq_record(faq, bid_id):
    """Build bid_faqs table record."""
    return {
        "bid_id": bid_id,
        "question": safe_str(safe_get(faq, 'question')) or "Unknown question",
        "answer": safe_str(safe_get(faq, 'answer')) or "No answer provided",
        "category": safe_str(safe_get(faq, 'category')),
    }

def build_overall_faq_record(faq, project_id):
    """Build overall_faqs table record."""
    return {
        "project_id": project_id,
        "question": safe_str(safe_get(faq, 'question')) or "Unknown question",
        "answer": safe_str(safe_get(faq, 'answer')) or "No answer provided",
        "category": safe_str(safe_get(faq, 'category')),
    }

def build_question_record(question, bid_id, display_order):
    """
    Build bid_questions table record.
    Questions come from Question Generator via JSON Assembler.
    """
    # Handle both string and dict question formats
    if isinstance(question, str):
        return {
            "bid_id": bid_id,
            "question_text": question,
            "question_category": None,
            "priority": "medium",
            "is_answered": False,
            "auto_generated": True,
            "display_order": display_order,
        }
    
    return {
        "bid_id": bid_id,
        "question_text": safe_str(safe_get(question, 'question_text')) or safe_str(safe_get(question, 'question')) or "Unknown question",
        "question_category": safe_str(safe_get(question, 'category')) or safe_str(safe_get(question, 'question_category')),
        "priority": safe_str(safe_get(question, 'priority')) or "medium",
        "is_answered": False,
        "auto_generated": True,
        "missing_field": safe_str(safe_get(question, 'missing_field')),
        "display_order": display_order,
    }

# ═══════════════════════════════════════════════════════════════════════════
# MAIN INSERT LOOP
# ═══════════════════════════════════════════════════════════════════════════

try:
    # Update project with customer info from first bid
    if bids and len(bids) > 0:
        update_project_with_customer_info(project_id, bids[0])
    
    # Insert each bid
    for bid_idx, bid in enumerate(bids):
        try:
            # 1. Insert contractor_bid record
            bid_record = build_contractor_bid_record(bid, project_id)
            cleaned_bid = clean_record(bid_record)
            
            result = supabase.table('contractor_bids').insert(cleaned_bid).execute()
            
            if not result.data or len(result.data) == 0:
                insert_report['errors'].append(f"Bid {bid_idx}: Insert returned no data")
                continue
            
            bid_id = result.data[0]['id']
            insert_report['bids_inserted'] += 1
            
            # 2. Insert equipment records
            equipment_list = safe_list(safe_get(bid, 'equipment'))
            for equip in equipment_list:
                try:
                    equip_record = build_equipment_record(equip, bid_id)
                    cleaned_equip = clean_record(equip_record)
                    supabase.table('bid_equipment').insert(cleaned_equip).execute()
                    insert_report['equipment_inserted'] += 1
                except Exception as e:
                    insert_report['warnings'].append(f"Bid {bid_idx} equipment: {str(e)}")
            
            # 3. Insert line item records
            line_items = safe_list(safe_get(bid, 'line_items'))
            for line_idx, line_item in enumerate(line_items):
                try:
                    line_record = build_line_item_record(line_item, bid_id, line_idx)
                    cleaned_line = clean_record(line_record)
                    supabase.table('bid_line_items').insert(cleaned_line).execute()
                    insert_report['line_items_inserted'] += 1
                except Exception as e:
                    insert_report['warnings'].append(f"Bid {bid_idx} line item {line_idx}: {str(e)}")
            
            # 4. Insert bid FAQs if present (v10: field is 'bid_faqs' not 'faqs')
            bid_faqs = safe_list(safe_get(bid, 'bid_faqs')) or safe_list(safe_get(bid, 'faqs'))
            for faq in bid_faqs:
                try:
                    faq_record = build_bid_faq_record(faq, bid_id)
                    cleaned_faq = clean_record(faq_record)
                    supabase.table('bid_faqs').insert(cleaned_faq).execute()
                    insert_report['bid_faqs_inserted'] += 1
                except Exception as e:
                    insert_report['warnings'].append(f"Bid {bid_idx} FAQ: {str(e)}")
            
            # 5. Insert questions if present (v10: from Question Generator)
            questions = safe_list(safe_get(bid, 'questions'))
            for q_idx, question in enumerate(questions):
                try:
                    q_record = build_question_record(question, bid_id, q_idx)
                    cleaned_q = clean_record(q_record)
                    supabase.table('bid_questions').insert(cleaned_q).execute()
                    insert_report['questions_inserted'] += 1
                except Exception as e:
                    insert_report['warnings'].append(f"Bid {bid_idx} question {q_idx}: {str(e)}")
        
        except Exception as e:
            insert_report['errors'].append(f"Bid {bid_idx}: {str(e)}")
    
    # Insert overall FAQs
    overall_faqs = safe_list(safe_get(analysis, 'overall_faqs'))
    for faq in overall_faqs:
        try:
            faq_record = build_overall_faq_record(faq, project_id)
            cleaned_faq = clean_record(faq_record)
            supabase.table('overall_faqs').insert(cleaned_faq).execute()
            insert_report['overall_faqs_inserted'] += 1
        except Exception as e:
            insert_report['warnings'].append(f"Overall FAQ: {str(e)}")

except Exception as e:
    insert_report['status'] = 'error'
    insert_report['errors'].append(f"Fatal error: {str(e)}")

# Set final status
if insert_report['errors']:
    insert_report['status'] = 'error'
elif insert_report['warnings']:
    insert_report['status'] = 'warning'

# Output for next node or debugging
output_json = json.dumps(insert_report, indent=2)
```

---

## Required Input Variables

This CODE node expects these input variables:

| Variable | Type | Source |
|----------|------|--------|
| `assembled_json` | string/dict | Output from JSON Assembler v10 |
| `supabase_url` | string | Your Supabase project URL |
| `supabase_key` | string | Your Supabase service role key |

---

## Tables Written

| Table | Records | Source |
|-------|---------|--------|
| `projects` | 1 update | customer_info from first bid |
| `contractor_bids` | N inserts | Each bid in bids array (includes scores) |
| `bid_equipment` | M inserts | equipment array per bid |
| `bid_line_items` | L inserts | line_items array per bid |
| `bid_faqs` | K inserts | bid_faqs array per bid (from Per-Bid FAQ Generator) |
| `bid_questions` | Q inserts | questions array per bid (from Question Generator) |
| `overall_faqs` | J inserts | analysis.overall_faqs array |

---

## Key v10 Changes from Previous Version

| Feature | Old | New v10 |
|---------|-----|---------|
| Contractor fields | Nested in `contractor_verification` | Flat at top level |
| Deposit field | `payment_terms.deposit_amount` | `deposit_amount` (flat) |
| Deposit flag | Manual calculation | Auto-calculated `deposit_required_flag` |
| Red flags | Not present | `red_flags` JSONB array |
| Positive indicators | Not present | `positive_indicators` JSONB array |
| Confidence | Numeric 0-100 | Enum "high"/"medium"/"low" |
| Scope booleans | 13 extracted | 4 critical extracted, 9 null |
| Scores | Not in contractor_bids | Flattened: overall_score, value_score, quality_score, completeness_score |
| Per-bid FAQs | Field: `faqs` | Field: `bid_faqs` |
| Questions | Not handled | Now inserted to `bid_questions` table |
