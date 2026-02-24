# MindPal v8 Configuration Guide

This document provides the configuration details for the MindPal v8 workflow integration.

---

## Supabase Edge Function Secrets

Set these secrets in your Supabase Dashboard → Edge Functions → Secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `MINDPAL_API_ENDPOINT` | `https://api-v3.mindpal.io/api/v1/workflow-runs` | MindPal API endpoint |
| `MINDPAL_API_KEY` | Your MindPal API key | Authentication for MindPal API |
| `MINDPAL_WORKFLOW_ID` | `697a111dfac1e3c184d4907e` | BidSmart Analyzer v8 workflow ID |
| `MINDPAL_DOCUMENT_URLS_FIELD_ID` | `697a111ffac1e3c184d4908a` | Field ID for document URLs input |
| `MINDPAL_USER_PRIORITIES_FIELD_ID` | `697a111ffac1e3c184d4908b` | Field ID for user priorities input |
| `MINDPAL_REQUEST_ID_FIELD_ID` | `697a1120fac1e3c184d4908c` | Field ID for request ID input |
| `MINDPAL_CALLBACK_URL_FIELD_ID` | `697a1120fac1e3c184d4908d` | Field ID for callback URL input |

### Setting Secrets via Supabase CLI

```bash
# Set all MindPal v8 secrets at once
supabase secrets set \
  MINDPAL_API_ENDPOINT=https://api-v3.mindpal.io/api/v1/workflow-runs \
  MINDPAL_API_KEY=your-mindpal-api-key \
  MINDPAL_WORKFLOW_ID=697a111dfac1e3c184d4907e \
  MINDPAL_DOCUMENT_URLS_FIELD_ID=697a111ffac1e3c184d4908a \
  MINDPAL_USER_PRIORITIES_FIELD_ID=697a111ffac1e3c184d4908b \
  MINDPAL_REQUEST_ID_FIELD_ID=697a1120fac1e3c184d4908c \
  MINDPAL_CALLBACK_URL_FIELD_ID=697a1120fac1e3c184d4908d
```

---

## MindPal v8 Workflow Details

**Workflow Name:** BidSmart Analyzer v8  
**Workflow Node ID:** `697a111dfac1e3c184d4907e`

### Input Fields

| Field Name | Field ID | Type | Required | Description |
|------------|----------|------|----------|-------------|
| `document_urls` | `697a111ffac1e3c184d4908a` | DOCUMENT | No | Max 10 PDF documents |
| `user_priorities` | `697a111ffac1e3c184d4908b` | TEXT | No | JSON string with priority weights (1-5) |
| `request_id` | `697a1120fac1e3c184d4908c` | TEXT | No | Unique identifier for tracking |
| `callback_url` | `697a1120fac1e3c184d4908d` | TEXT | No | Webhook URL for results |

### Workflow Nodes

1. **API Input** (`697a111dfac1e3c184d4907e`) - Collects user input
2. **URL Translator** (`697bdb5b2d27d60a23326f48`) - Converts URLs to JSON array
3. **Extract All Bids** (`697a111dfac1e3c184d49080`) - Loops through documents
4. **Equipment Researcher** (`697a111dfac1e3c184d49081`) - Enriches equipment data
5. **Contractor Researcher** (`697a111efac1e3c184d49082`) - Researches contractors
6. **Incentive Finder** (`697a111efac1e3c184d49083`) - Finds rebates/incentives
7. **Scoring Engine** (`697a111efac1e3c184d49084`) - Calculates comparison scores
8. **Question Generator** (`697a111efac1e3c184d49085`) - Generates clarification questions
9. **FAQ Generator** (`697a111efac1e3c184d49086`) - Generates comparison FAQs
10. **JSON Assembler & Validator** (`697a111ffac1e3c184d49087`) - Combines outputs
11. **Send Results** (`697a111ffac1e3c184d49088`) - Sends to webhook

---

## Webhook Flow

```
BidSmart Frontend
    ↓
Supabase Edge Function (start-mindpal-analysis)
    ↓
MindPal v8 Workflow
    ↓
Make.com (webhook receiver - not yet configured)
    ↓
Supabase Database (bid_analysis table)
    ↓
BidSmart Frontend (displays results)
```

---

## Testing Configuration

### 1. Verify Secrets Are Set

```bash
supabase secrets list
```

### 2. Test Edge Function

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/start-mindpal-analysis \
  -H "Content-Type: application/json" \
  -H "X-User-Email: test@example.com" \
  -d '{
    "projectId": "YOUR_PROJECT_ID",
    "pdfUploadIds": ["PDF_UPLOAD_ID"],
    "userPriorities": {
      "price": 4,
      "warranty": 3,
      "efficiency": 5,
      "timeline": 3,
      "reputation": 4
    }
  }'
```

### 3. Check Logs

```bash
supabase functions logs start-mindpal-analysis
```

---

## Migration from v7 to v8

### Key Changes

1. **Field ID renamed**: `PDF_URLS_FIELD_ID` → `DOCUMENT_URLS_FIELD_ID`
2. **New workflow ID**: Updated to v8 workflow
3. **New response structure**: Includes FAQs, electrical info, clarification questions
4. **Make.com integration**: Added to webhook flow (pending configuration)

### Backward Compatibility

No backward compatibility is maintained. All new analyses will use v8.

---

## Troubleshooting

### "MindPal workflow configuration incomplete"

**Cause:** One or more field IDs are not set in Supabase secrets.

**Solution:** Verify all secrets are set:
```bash
supabase secrets list | grep MINDPAL
```

### "MindPal API failed: 401"

**Cause:** Invalid or missing `MINDPAL_API_KEY`.

**Solution:** Update the API key in Supabase secrets.

### "MindPal API failed: 400"

**Cause:** Invalid payload structure or field IDs.

**Solution:** 
1. Verify field IDs match the v8 workflow
2. Check that `document_urls` is a JSON array of strings
3. Ensure `user_priorities` is a valid JSON object

---

## Reference

- **MindPal Workflow Export**: `MindPal_Workflow_-_BidSmart_Analyzer_v8__6_.json`
- **Export Date**: January 31, 2026
- **Format Version**: 1.0
