# Make.com Webhook Integration Guide

This document describes the Make.com webhook integration for MindPal v8 responses.

---

## Architecture Overview

```
MindPal v8 Workflow
    ↓ (sends results)
Make.com Scenario
    ↓ (transforms/validates)
Supabase Edge Function (make-webhook)
    ↓ (stores in database)
BidSmart Frontend
```

---

## Webhook Endpoint

**URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/make-webhook`  
**Method:** POST  
**Authentication:** Bearer token (MAKE_WEBHOOK_SECRET)

### Request Headers

```
Authorization: Bearer YOUR_MAKE_WEBHOOK_SECRET
Content-Type: application/json
```

### Request Body

The webhook expects a complete MindPal v8 response structure:

```json
{
  "request_id": "uuid-from-mindpal",
  "status": "success",
  "extraction_timestamp": "2026-01-31T12:00:00Z",
  "overall_confidence": 0.85,
  "bids": [
    {
      "bid_index": 0,
      "document_url": "https://...",
      "extraction_confidence": 0.9,
      "contractor_info": { ... },
      "pricing": { ... },
      "equipment": [ ... ],
      "warranty": { ... },
      "timeline": { ... },
      "scope_of_work": { ... },
      "electrical": {
        "panel_assessment_included": true,
        "panel_upgrade_included": false,
        "existing_panel_amps": 200,
        "breaker_size_required": 40,
        ...
      },
      "payment_terms": { ... },
      "dates": { ... },
      "scores": { ... },
      "red_flags": [
        {
          "issue": "No electrical permit mentioned",
          "source": "bid_document",
          "severity": "medium",
          "date": null
        }
      ],
      "positive_indicators": [
        {
          "indicator": "Energy Star Most Efficient equipment",
          "source": "bid_document"
        }
      ]
    }
  ],
  "analysis": {
    "scoring_metadata": { ... },
    "comparison_insights": { ... },
    "incentives": { ... }
  },
  "questions": [
    {
      "bid_index": 0,
      "contractor_name": "ABC HVAC",
      "question_text": "Does your bid include electrical panel assessment?",
      "question_category": "electrical",
      "priority": "high",
      ...
    }
  ],
  "faqs": {
    "overall": [
      {
        "faq_key": "price_difference",
        "question_text": "Why is there a price difference?",
        "answer_text": "...",
        "answer_confidence": "high",
        "evidence": [],
        "display_order": 1
      }
    ],
    "by_bid": []
  },
  "disclaimer": "..."
}
```

### Response

**Success (200):**
```json
{
  "success": true,
  "projectId": "uuid",
  "requestId": "uuid",
  "bidsCreated": 3,
  "bidIds": ["uuid1", "uuid2", "uuid3"],
  "faqsStored": true,
  "questionsStored": true,
  "message": "v8 data processed successfully"
}
```

**Error (400/401/500):**
```json
{
  "error": "Error message",
  "code": 400
}
```

---

## Make.com Scenario Setup

### 1. Webhook Trigger

**Module:** Webhooks → Custom webhook  
**Configuration:**
- Create a new webhook
- Copy the webhook URL
- Configure in MindPal v8 workflow as the callback URL

### 2. Data Transformation (Optional)

If MindPal output needs transformation:
- Add JSON parsing modules
- Add data mapping modules
- Add validation modules

### 3. HTTP Request to Supabase

**Module:** HTTP → Make a request  
**Configuration:**
- **URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/make-webhook`
- **Method:** POST
- **Headers:**
  - `Authorization`: `Bearer YOUR_MAKE_WEBHOOK_SECRET`
  - `Content-Type`: `application/json`
- **Body:** Pass through the MindPal v8 response (or transformed version)

### 4. Error Handling

**Module:** Error handler  
**Configuration:**
- Add error handler to HTTP request
- Log errors to Make.com data store
- Send alert email on critical failures
- Implement retry logic (3 attempts with exponential backoff)

---

## Configuration Steps

### 1. Set Supabase Secret

```bash
supabase secrets set MAKE_WEBHOOK_SECRET=your-secure-random-string
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

### 2. Configure MindPal v8 Workflow

In MindPal workflow node "Send Results" (Node ID: `697a111ffac1e3c184d49088`):
- Set webhook URL to your Make.com webhook trigger URL
- MindPal will POST the v8 response to Make.com

### 3. Test the Flow

```bash
# Test Make.com webhook endpoint
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/make-webhook \
  -H "Authorization: Bearer YOUR_MAKE_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d @test-v8-response.json
```

---

## Monitoring & Debugging

### Check Make.com Execution History

1. Go to Make.com dashboard
2. Select your scenario
3. View execution history
4. Check for errors or warnings

### Check Supabase Logs

```bash
supabase functions logs make-webhook --tail
```

### Common Issues

**401 Unauthorized:**
- Check MAKE_WEBHOOK_SECRET is set correctly in Supabase
- Verify Authorization header in Make.com HTTP request

**400 Invalid payload:**
- Verify v8 response structure matches expected format
- Check that `request_id` is present
- Ensure `bids` array exists

**404 Request ID not found:**
- Verify `request_id` matches a `mindpal_run_id` in `pdf_uploads` table
- Check that analysis was started via `start-mindpal-analysis` endpoint

---

## Fallback: Direct Callback

If Make.com is unavailable, the system can fall back to direct MindPal → Supabase callback:

**Fallback URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/mindpal-callback`

The `mindpal-callback` endpoint will detect v8 responses and process them using the same mapping logic as the Make.com webhook.

---

## Data Flow Details

### What Gets Stored

1. **contractor_bids table:**
   - All bid data including electrical fields
   - Red flags (JSONB array)
   - Positive indicators (JSONB array)

2. **bid_equipment table:**
   - Equipment specs
   - Amperage draw and minimum circuit amperage (v8 new)

3. **bid_analysis table:**
   - FAQs (overall and per-bid)
   - Clarification questions
   - Scoring metadata

4. **pdf_uploads table:**
   - Status updated to "extracted"
   - Extraction confidence
   - Processing timestamps

5. **projects table:**
   - Status updated to "comparing"

### Mapping Logic

All v8 → database mapping is handled by shared functions in:
- `supabase/functions/_shared/v8Mapper.ts`
- `supabase/functions/_shared/v8Types.ts`

This ensures consistency between Make.com webhook and direct callback.

---

## Security Considerations

1. **Authentication:** Always use Bearer token authentication
2. **HTTPS Only:** Never use HTTP for webhook endpoints
3. **Secret Rotation:** Rotate MAKE_WEBHOOK_SECRET periodically
4. **Rate Limiting:** Make.com has built-in rate limiting
5. **Validation:** Webhook validates v8 structure before processing

---

## Performance

- **Average processing time:** 2-5 seconds for 3 bids
- **Database writes:** ~10-15 inserts per bid
- **Make.com operations:** 1-3 operations per scenario run
- **Total latency:** MindPal (60-120s) + Make.com (1-2s) + Supabase (2-5s)

---

## Testing Checklist

- [ ] Make.com scenario receives MindPal v8 output
- [ ] Make.com successfully POSTs to Supabase webhook
- [ ] Supabase creates bids with electrical fields
- [ ] Red flags and positive indicators stored correctly
- [ ] FAQs stored in bid_analysis
- [ ] Clarification questions stored in bid_analysis
- [ ] Equipment amperage fields populated
- [ ] Project status updated to "comparing"
- [ ] Frontend displays all v8 data correctly
- [ ] Error handling works (retry logic, alerts)

---

## Migration from Direct Callback

When Make.com is ready:

1. **Test in parallel:** Run both Make.com and direct callback
2. **Compare results:** Verify identical data in database
3. **Monitor errors:** Check Make.com execution history
4. **Gradual rollout:** Start with 10% of requests
5. **Full cutover:** Update MindPal callback URL to Make.com
6. **Keep fallback:** Maintain direct callback as backup

---

## Support

**Make.com Issues:**
- Check Make.com status page
- Review scenario execution logs
- Contact Make.com support

**Supabase Issues:**
- Check Supabase function logs
- Review database error logs
- Contact Supabase support

**MindPal Issues:**
- Verify workflow configuration
- Check MindPal API status
- Contact MindPal support
