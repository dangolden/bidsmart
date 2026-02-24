# MindPal Integration Guide for BidSmart

## Overview

This document provides the MindPal developer with everything needed to configure the BidSmart PDF extraction workflow. BidSmart uses MindPal to extract structured data from contractor bid PDFs for heat pump installations.

## Workflow Summary

1. **User uploads PDF** → Stored in Supabase Storage
2. **BidSmart triggers MindPal** → Webhook with PDF URL + project context
3. **MindPal extracts data** → AI analyzes the PDF
4. **MindPal returns JSON** → Webhook callback with structured extraction
5. **BidSmart imports data** → Creates bid records in database

---

## MindPal Workflow Configuration

### Workflow Name
`BidSmart Heat Pump Bid Extraction`

### Workflow Description
Extract contractor bid information from heat pump installation proposals, including pricing, equipment specifications, warranty terms, and scope of work.

### Input Trigger
- **Type**: Webhook
- **Method**: POST
- **Authentication**: API Key (header: `X-BidSmart-API-Key`)

---

## INPUT JSON SCHEMA

This is what BidSmart will send TO MindPal when triggering extraction:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "BidSmart PDF Extraction Request",
  "type": "object",
  "required": ["request_id", "pdf_url", "project_context"],
  "properties": {
    "request_id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier for this extraction request (matches pdf_uploads.id)"
    },
    "pdf_url": {
      "type": "string",
      "format": "uri",
      "description": "Signed URL to the PDF file in Supabase Storage (expires in 1 hour)"
    },
    "callback_url": {
      "type": "string",
      "format": "uri",
      "description": "Webhook URL for MindPal to POST the extraction results"
    },
    "project_context": {
      "type": "object",
      "description": "Context about the project to help with extraction accuracy",
      "properties": {
        "project_id": {
          "type": "string",
          "format": "uuid"
        },
        "heat_pump_type": {
          "type": "string",
          "enum": ["air_source", "ground_source", "water_source", "mini_split", "ducted", "hybrid", "other"]
        },
        "system_size_tons": {
          "type": "number",
          "description": "Expected system size in tons (e.g., 3.5)"
        },
        "property_state": {
          "type": "string",
          "description": "US state code (e.g., 'CA', 'NY') for rebate matching"
        },
        "property_zip": {
          "type": "string",
          "description": "ZIP code for utility rebate matching"
        },
        "square_footage": {
          "type": "integer",
          "description": "Home square footage"
        },
        "min_seer_requirement": {
          "type": "number",
          "description": "Minimum SEER rating requirement (for flagging if bid doesn't meet)"
        }
      }
    },
    "extraction_options": {
      "type": "object",
      "properties": {
        "extract_line_items": {
          "type": "boolean",
          "default": true,
          "description": "Whether to extract itemized line items"
        },
        "extract_equipment_specs": {
          "type": "boolean",
          "default": true,
          "description": "Whether to extract detailed equipment specifications"
        },
        "include_raw_text": {
          "type": "boolean",
          "default": false,
          "description": "Whether to include raw extracted text for debugging"
        }
      }
    }
  }
}
```

### Example Input Request

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "pdf_url": "https://your-project.supabase.co/storage/v1/object/sign/bids/project123/bid_acme_hvac.pdf?token=xxx",
  "callback_url": "https://your-bidsmart-domain.com/api/mindpal/callback",
  "project_context": {
    "project_id": "123e4567-e89b-12d3-a456-426614174000",
    "heat_pump_type": "air_source",
    "system_size_tons": 3.5,
    "property_state": "CA",
    "property_zip": "94102",
    "square_footage": 2200,
    "preferred_brands": ["Carrier", "Mitsubishi", "Daikin"]
  },
  "extraction_options": {
    "extract_line_items": true,
    "extract_equipment_specs": true,
    "include_raw_text": false
  }
}
```

---

## OUTPUT JSON SCHEMA

This is what MindPal should return TO BidSmart after extraction:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "BidSmart PDF Extraction Response",
  "type": "object",
  "required": ["request_id", "status", "extraction_timestamp"],
  "properties": {
    "request_id": {
      "type": "string",
      "format": "uuid",
      "description": "Echo back the original request_id for correlation"
    },
    "status": {
      "type": "string",
      "enum": ["success", "partial", "failed"],
      "description": "success = full extraction, partial = some fields missing, failed = could not extract"
    },
    "extraction_timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of when extraction completed"
    },
    "overall_confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Overall confidence score for the extraction (0-100)"
    },
    "contractor_info": {
      "type": "object",
      "description": "Contractor/company information",
      "properties": {
        "company_name": {
          "type": "string",
          "description": "Name of the contracting company"
        },
        "contact_name": {
          "type": "string",
          "description": "Name of the salesperson or contact"
        },
        "phone": {
          "type": "string",
          "description": "Contact phone number"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "Contact email address"
        },
        "address": {
          "type": "string",
          "description": "Business address"
        },
        "license_number": {
          "type": "string",
          "description": "Contractor license number"
        },
        "license_state": {
          "type": "string",
          "description": "State of license (2-letter code)"
        },
        "website": {
          "type": "string",
          "format": "uri",
          "description": "Company website"
        },
        "years_in_business": {
          "type": "integer",
          "description": "Number of years the company has been in business"
        },
        "year_established": {
          "type": "integer",
          "description": "Year the company was established (alternative to years_in_business)"
        },
        "certifications": {
          "type": "array",
          "items": {"type": "string"},
          "description": "Professional certifications (NATE, EPA 608, manufacturer certs, etc.)"
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      }
    },
    "pricing": {
      "type": "object",
      "description": "Pricing breakdown",
      "required": ["total_amount"],
      "properties": {
        "total_amount": {
          "type": "number",
          "description": "Total bid amount in USD"
        },
        "equipment_cost": {
          "type": "number",
          "description": "Cost of equipment only"
        },
        "labor_cost": {
          "type": "number",
          "description": "Labor cost"
        },
        "materials_cost": {
          "type": "number",
          "description": "Materials and supplies cost"
        },
        "permit_cost": {
          "type": "number",
          "description": "Permit fees"
        },
        "disposal_cost": {
          "type": "number",
          "description": "Old equipment disposal cost"
        },
        "electrical_cost": {
          "type": "number",
          "description": "Electrical work cost"
        },
        "other_costs": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "description": {"type": "string"},
              "amount": {"type": "number"}
            }
          }
        },
        "rebates_mentioned": {
          "type": "array",
          "description": "Rebates mentioned in the bid",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "amount": {"type": "number"},
              "type": {
                "type": "string",
                "enum": ["federal", "state", "utility", "manufacturer"]
              }
            }
          }
        },
        "price_before_rebates": {
          "type": "number",
          "description": "Total before any rebates applied"
        },
        "price_after_rebates": {
          "type": "number",
          "description": "Total after rebates (if contractor calculated)"
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      }
    },
    "timeline": {
      "type": "object",
      "properties": {
        "estimated_days": {
          "type": "integer",
          "description": "Number of days to complete installation"
        },
        "estimated_hours": {
          "type": "number",
          "description": "Estimated labor hours"
        },
        "start_date_available": {
          "type": "string",
          "format": "date",
          "description": "Earliest available start date"
        },
        "bid_valid_until": {
          "type": "string",
          "format": "date",
          "description": "Date until which the bid is valid"
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      }
    },
    "warranty": {
      "type": "object",
      "properties": {
        "labor_warranty_years": {
          "type": "integer",
          "description": "Years of labor warranty"
        },
        "equipment_warranty_years": {
          "type": "integer",
          "description": "Years of equipment warranty from manufacturer"
        },
        "compressor_warranty_years": {
          "type": "integer",
          "description": "Compressor-specific warranty (often longer)"
        },
        "extended_warranty_offered": {
          "type": "boolean",
          "description": "Whether extended warranty is offered"
        },
        "extended_warranty_cost": {
          "type": "number",
          "description": "Cost of extended warranty if offered"
        },
        "extended_warranty_years": {
          "type": "integer",
          "description": "Years of extended warranty"
        },
        "warranty_details": {
          "type": "string",
          "description": "Additional warranty notes"
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      }
    },
    "equipment": {
      "type": "array",
      "description": "List of equipment included in the bid",
      "items": {
        "type": "object",
        "required": ["equipment_type", "brand"],
        "properties": {
          "equipment_type": {
            "type": "string",
            "enum": ["outdoor_unit", "indoor_unit", "air_handler", "thermostat", "line_set", "disconnect", "pad", "other"],
            "description": "Type of equipment"
          },
          "brand": {
            "type": "string",
            "description": "Equipment brand (e.g., Carrier, Mitsubishi)"
          },
          "model_number": {
            "type": "string",
            "description": "Model number"
          },
          "model_name": {
            "type": "string",
            "description": "Marketing name of the model"
          },
          "capacity_btu": {
            "type": "integer",
            "description": "Capacity in BTU"
          },
          "capacity_tons": {
            "type": "number",
            "description": "Capacity in tons"
          },
          "seer_rating": {
            "type": "number",
            "description": "SEER efficiency rating"
          },
          "seer2_rating": {
            "type": "number",
            "description": "SEER2 efficiency rating (newer standard)"
          },
          "hspf_rating": {
            "type": "number",
            "description": "HSPF heating efficiency rating"
          },
          "hspf2_rating": {
            "type": "number",
            "description": "HSPF2 heating efficiency rating (newer standard)"
          },
          "eer_rating": {
            "type": "number",
            "description": "EER rating"
          },
          "variable_speed": {
            "type": "boolean",
            "description": "Whether it has variable speed technology"
          },
          "stages": {
            "type": "string",
            "enum": ["single", "two", "variable"],
            "description": "Number of stages"
          },
          "refrigerant": {
            "type": "string",
            "description": "Refrigerant type (e.g., R-410A, R-32)"
          },
          "voltage": {
            "type": "integer",
            "description": "Voltage requirement"
          },
          "sound_level_db": {
            "type": "number",
            "description": "Sound level in decibels"
          },
          "energy_star": {
            "type": "boolean",
            "description": "ENERGY STAR certified"
          },
          "energy_star_most_efficient": {
            "type": "boolean",
            "description": "ENERGY STAR Most Efficient designation"
          },
          "equipment_cost": {
            "type": "number",
            "description": "Cost of this specific equipment item"
          },
          "confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          }
        }
      }
    },
    "line_items": {
      "type": "array",
      "description": "Itemized breakdown of all costs",
      "items": {
        "type": "object",
        "required": ["description", "total_price"],
        "properties": {
          "item_type": {
            "type": "string",
            "enum": ["equipment", "labor", "materials", "permit", "disposal", "electrical", "ductwork", "thermostat", "rebate_processing", "warranty", "other"]
          },
          "description": {
            "type": "string",
            "description": "Description of the line item"
          },
          "quantity": {
            "type": "number",
            "default": 1
          },
          "unit_price": {
            "type": "number"
          },
          "total_price": {
            "type": "number"
          },
          "brand": {
            "type": "string",
            "description": "Brand if this is equipment"
          },
          "model_number": {
            "type": "string",
            "description": "Model number if this is equipment"
          },
          "source_text": {
            "type": "string",
            "description": "Original text from PDF for this line item"
          },
          "confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          }
        }
      }
    },
    "scope_of_work": {
      "type": "object",
      "properties": {
        "summary": {
          "type": "string",
          "description": "Summary of scope of work"
        },
        "inclusions": {
          "type": "array",
          "items": {"type": "string"},
          "description": "List of what's included"
        },
        "exclusions": {
          "type": "array",
          "items": {"type": "string"},
          "description": "List of what's NOT included"
        },
        "permit_included": {
          "type": "boolean",
          "description": "Whether permits are included"
        },
        "disposal_included": {
          "type": "boolean",
          "description": "Whether old equipment disposal is included"
        },
        "electrical_work_included": {
          "type": "boolean",
          "description": "Whether electrical work is included"
        },
        "ductwork_included": {
          "type": "boolean",
          "description": "Whether ductwork modifications are included"
        },
        "thermostat_included": {
          "type": "boolean",
          "description": "Whether a new thermostat is included"
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      }
    },
    "payment_terms": {
      "type": "object",
      "properties": {
        "deposit_required": {
          "type": "boolean"
        },
        "deposit_amount": {
          "type": "number"
        },
        "deposit_percentage": {
          "type": "number"
        },
        "payment_schedule": {
          "type": "string",
          "description": "Description of payment schedule"
        },
        "financing_offered": {
          "type": "boolean"
        },
        "financing_terms": {
          "type": "string",
          "description": "Financing terms if offered"
        },
        "accepted_payment_methods": {
          "type": "array",
          "items": {"type": "string"}
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      }
    },
    "dates": {
      "type": "object",
      "properties": {
        "bid_date": {
          "type": "string",
          "format": "date",
          "description": "Date the bid was created"
        },
        "quote_date": {
          "type": "string",
          "format": "date",
          "description": "Same as bid_date (alternate field name)"
        },
        "valid_until": {
          "type": "string",
          "format": "date"
        }
      }
    },
    "field_confidences": {
      "type": "object",
      "description": "Confidence scores for individual extracted fields",
      "additionalProperties": {
        "type": "number",
        "minimum": 0,
        "maximum": 100
      }
    },
    "extraction_notes": {
      "type": "array",
      "description": "Notes about extraction quality or issues",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["warning", "info", "error"]
          },
          "message": {
            "type": "string"
          },
          "field": {
            "type": "string",
            "description": "Which field this note relates to"
          }
        }
      }
    },
    "raw_text": {
      "type": "string",
      "description": "Raw extracted text (only if include_raw_text was true)"
    },
    "error": {
      "type": "object",
      "description": "Error details if status is 'failed'",
      "properties": {
        "code": {"type": "string"},
        "message": {"type": "string"},
        "details": {"type": "string"}
      }
    }
  }
}
```

### Example Output Response (Success)

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "extraction_timestamp": "2025-01-19T15:30:00Z",
  "overall_confidence": 87.5,
  
  "contractor_info": {
    "company_name": "Bay Area Heat Pump Pros",
    "contact_name": "John Smith",
    "phone": "(415) 555-1234",
    "email": "john@baheatpumppros.com",
    "address": "123 Main St, San Francisco, CA 94102",
    "license_number": "CSLB #1234567",
    "license_state": "CA",
    "website": "https://baheatpumppros.com",
    "confidence": 95
  },
  
  "pricing": {
    "total_amount": 18500,
    "equipment_cost": 9800,
    "labor_cost": 4500,
    "materials_cost": 1200,
    "permit_cost": 850,
    "disposal_cost": 350,
    "electrical_cost": 1800,
    "rebates_mentioned": [
      {
        "name": "Federal 25C Tax Credit",
        "amount": 2000,
        "type": "federal"
      },
      {
        "name": "BayREN Home+ Rebate",
        "amount": 1500,
        "type": "utility"
      }
    ],
    "price_before_rebates": 18500,
    "price_after_rebates": 15000,
    "confidence": 92
  },
  
  "timeline": {
    "estimated_days": 2,
    "estimated_hours": 16,
    "start_date_available": "2025-02-01",
    "bid_valid_until": "2025-02-28",
    "confidence": 88
  },
  
  "warranty": {
    "labor_warranty_years": 2,
    "equipment_warranty_years": 10,
    "compressor_warranty_years": 12,
    "extended_warranty_offered": true,
    "extended_warranty_cost": 750,
    "extended_warranty_years": 5,
    "warranty_details": "10-year parts warranty, 12-year compressor warranty from Carrier",
    "confidence": 90
  },
  
  "equipment": [
    {
      "equipment_type": "outdoor_unit",
      "brand": "Carrier",
      "model_number": "25VNA836A003",
      "model_name": "Infinity 26 Heat Pump",
      "capacity_btu": 36000,
      "capacity_tons": 3.0,
      "seer_rating": 26,
      "seer2_rating": 24.5,
      "hspf_rating": 13,
      "hspf2_rating": 10.5,
      "variable_speed": true,
      "stages": "variable",
      "refrigerant": "R-410A",
      "voltage": 240,
      "sound_level_db": 51,
      "energy_star": true,
      "energy_star_most_efficient": true,
      "equipment_cost": 7200,
      "confidence": 94
    },
    {
      "equipment_type": "indoor_unit",
      "brand": "Carrier",
      "model_number": "FV4CNB003",
      "model_name": "Infinity Series Air Handler",
      "variable_speed": true,
      "equipment_cost": 2600,
      "confidence": 91
    },
    {
      "equipment_type": "thermostat",
      "brand": "Carrier",
      "model_number": "SYSTXCCITC01-B",
      "model_name": "Infinity Touch Control",
      "equipment_cost": 450,
      "confidence": 85
    }
  ],
  
  "line_items": [
    {
      "item_type": "equipment",
      "description": "Carrier Infinity 26 Heat Pump - 3 Ton",
      "quantity": 1,
      "unit_price": 7200,
      "total_price": 7200,
      "brand": "Carrier",
      "model_number": "25VNA836A003",
      "confidence": 94
    },
    {
      "item_type": "equipment",
      "description": "Carrier Infinity Air Handler",
      "quantity": 1,
      "unit_price": 2600,
      "total_price": 2600,
      "brand": "Carrier",
      "model_number": "FV4CNB003",
      "confidence": 91
    },
    {
      "item_type": "thermostat",
      "description": "Carrier Infinity Touch Thermostat",
      "quantity": 1,
      "unit_price": 450,
      "total_price": 450,
      "brand": "Carrier",
      "model_number": "SYSTXCCITC01-B",
      "confidence": 85
    },
    {
      "item_type": "labor",
      "description": "Installation Labor (2 technicians x 8 hours)",
      "total_price": 4500,
      "confidence": 88
    },
    {
      "item_type": "materials",
      "description": "Line set, refrigerant, mounting hardware",
      "total_price": 1200,
      "confidence": 75
    },
    {
      "item_type": "electrical",
      "description": "200A panel upgrade and new circuit",
      "total_price": 1800,
      "confidence": 82
    },
    {
      "item_type": "permit",
      "description": "City permits and inspections",
      "total_price": 850,
      "confidence": 95
    },
    {
      "item_type": "disposal",
      "description": "Remove and dispose of old system",
      "total_price": 350,
      "confidence": 90
    }
  ],
  
  "scope_of_work": {
    "summary": "Complete heat pump system installation including removal of existing gas furnace and AC unit",
    "inclusions": [
      "Remove existing gas furnace and AC condenser",
      "Install Carrier Infinity 26 heat pump system",
      "Install new air handler",
      "Install Infinity Touch thermostat",
      "200A electrical panel upgrade",
      "New 240V circuit for heat pump",
      "Permits and final inspection",
      "System startup and commissioning",
      "Homeowner training"
    ],
    "exclusions": [
      "Ductwork modifications (existing ducts in good condition)",
      "Drywall repair if access needed",
      "Landscaping around outdoor unit"
    ],
    "permit_included": true,
    "disposal_included": true,
    "electrical_work_included": true,
    "ductwork_included": false,
    "thermostat_included": true,
    "confidence": 85
  },
  
  "payment_terms": {
    "deposit_required": true,
    "deposit_amount": 3700,
    "deposit_percentage": 20,
    "payment_schedule": "20% deposit, 40% at equipment delivery, 40% upon completion",
    "financing_offered": true,
    "financing_terms": "0% APR for 24 months with approved credit through GreenSky",
    "accepted_payment_methods": ["check", "credit card", "financing"],
    "confidence": 80
  },
  
  "dates": {
    "bid_date": "2025-01-15",
    "valid_until": "2025-02-28"
  },
  
  "field_confidences": {
    "contractor_info.company_name": 98,
    "contractor_info.license_number": 95,
    "pricing.total_amount": 96,
    "equipment[0].model_number": 94,
    "equipment[0].seer_rating": 92,
    "warranty.equipment_warranty_years": 90,
    "timeline.estimated_days": 85
  },
  
  "extraction_notes": [
    {
      "type": "info",
      "message": "Equipment model numbers verified against Carrier product database",
      "field": "equipment"
    },
    {
      "type": "warning",
      "message": "Materials cost appears to be bundled - individual items not itemized",
      "field": "pricing.materials_cost"
    }
  ]
}
```

---

## PROMPT ENGINEERING GUIDANCE

### System Prompt for MindPal

```
You are a specialized AI assistant for extracting structured data from HVAC contractor bid documents, specifically for heat pump installations.

CONTEXT:
- These are residential heat pump installation proposals from HVAC contractors
- Common brands include: Carrier, Lennox, Trane, Daikin, Mitsubishi, Fujitsu, LG, Rheem
- Modern heat pumps use efficiency ratings: SEER/SEER2 (cooling), HSPF/HSPF2 (heating)
- Look for both pre-rebate and post-rebate pricing when available
- Federal tax credits (25C) and utility rebates are commonly mentioned

EXTRACTION PRIORITIES (in order):
1. Total bid amount (CRITICAL - must find this)
2. Contractor company name and contact info
3. Equipment brand and model numbers
4. Efficiency ratings (SEER, HSPF)
5. Warranty terms (labor and equipment separately)
6. Timeline/availability
7. Line item breakdown
8. Scope inclusions and exclusions

CONFIDENCE SCORING:
- 90-100: Value explicitly stated and clearly readable
- 70-89: Value inferred from context or partially visible
- 50-69: Value estimated based on typical patterns
- Below 50: Do not include, mark as not found

SPECIAL INSTRUCTIONS:
- If you find both SEER and SEER2, include both (SEER2 is the newer 2023 standard)
- Contractor license numbers often start with "CSLB" (California) or similar state prefixes
- Watch for "change order" or "additional cost" items - these should be separate line items
- Rebates may be listed as negative line items or in a separate section
- Installation timelines are often given in days OR hours - normalize to both if possible
```

### Few-Shot Examples

Include 2-3 example extractions in the prompt to show the expected format and level of detail.

---

## WEBHOOK SECURITY

### Outgoing Webhook (BidSmart → MindPal)

**Headers to send:**
```
Content-Type: application/json
X-BidSmart-API-Key: [configured API key]
X-BidSmart-Timestamp: [ISO 8601 timestamp]
X-BidSmart-Signature: [HMAC-SHA256 signature of body]
```

### Incoming Webhook (MindPal → BidSmart)

**Expected Headers:**
```
Content-Type: application/json
X-MindPal-Signature: [HMAC-SHA256 signature]
```

**Verification:**
BidSmart will verify the signature using the shared secret before processing.

---

## ERROR HANDLING

### Expected Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `PDF_UNREADABLE` | PDF is corrupted or password-protected | Notify user to re-upload |
| `LOW_CONFIDENCE` | Overall confidence below 50% | Flag for manual review |
| `NOT_A_BID` | Document doesn't appear to be a contractor bid | Notify user |
| `TIMEOUT` | Processing took too long | Retry with smaller batch |
| `RATE_LIMIT` | Too many requests | Queue and retry |

---

## TESTING

### Test PDF Documents

We will provide sample PDFs for testing:
1. `sample_bid_complete.pdf` - Full bid with all fields
2. `sample_bid_minimal.pdf` - Basic bid with minimal info
3. `sample_bid_poor_quality.pdf` - Scanned/low quality PDF
4. `sample_not_bid.pdf` - Generic HVAC brochure (should reject)

### Validation Checklist

- [ ] Correctly extracts total bid amount
- [ ] Identifies all equipment with model numbers
- [ ] Parses efficiency ratings correctly
- [ ] Extracts warranty terms
- [ ] Handles missing fields gracefully
- [ ] Returns appropriate confidence scores
- [ ] Correctly identifies non-bid documents
- [ ] Handles scanned/OCR PDFs
- [ ] Returns consistent JSON structure

---

## CONTACT

For questions about this integration:
- **Technical Contact**: [Your email]
- **API Documentation**: [Link to full API docs]
- **Sample PDFs**: [Link to test files]
