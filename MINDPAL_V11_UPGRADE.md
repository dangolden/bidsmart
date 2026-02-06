# MindPal v11 Upgrade Complete

## Summary

Successfully upgraded BidSmart from MindPal v10 to v11 workflow with new API endpoint and Base64 document handling.

---

## Changes Made

### 1. New Configuration File
**Created:** `src/config/mindpal.config.ts`
- Central configuration for all MindPal workflow IDs and field IDs
- Workflow ID: `69860fd696be27d5d9cb4252`
- API Base: `https://api.mindpal.io/v1`
- Field IDs for documents, priorities, request_id, callback_url

### 2. Edge Function Updates
**File:** `supabase/functions/start-mindpal-analysis/index.ts`
- Changed API endpoint from `app.mindpal.space/api/v2` to `api.mindpal.io/v1/workflows/{id}/run`
- Updated auth from `x-api-key` header to `Authorization: Bearer`
- Updated all field IDs to v11 values
- Removed URL-based mode (Base64-only now)

### 3. File Handler Updates
**File:** `src/lib/utils/fileHandler.ts`
- Updated `Base64Document` interface: `mime_type` and `base64_content` (was `mimeType` and `content`)
- Added image support: jpg, jpeg, png, gif
- Increased max file size from 10MB to 20MB

### 4. Service Updates
**File:** `src/lib/services/mindpalService.ts`
- Removed unused Base64Document import
- Uses fileHandler types directly

### 5. Supabase Secrets
Updated environment variables:
```
MINDPAL_WORKFLOW_ID=69860fd696be27d5d9cb4252
MINDPAL_API_BASE=https://api.mindpal.io/v1
MINDPAL_DOCUMENTS_FIELD_ID=69860fd696be27d5d9cb4258
MINDPAL_USER_PRIORITIES_FIELD_ID=69860fd696be27d5d9cb4255
MINDPAL_REQUEST_ID_FIELD_ID=69860fd696be27d5d9cb4257
MINDPAL_CALLBACK_URL_FIELD_ID=69860fd696be27d5d9cb4256
```

---

## Deployment Status

- ✅ Edge Function deployed to Supabase
- ✅ Frontend pushed to staging branch
- ✅ Netlify will auto-deploy from staging (~2-3 min)

---

## Testing Checklist

- [ ] Upload 2-3 PDF bid documents
- [ ] Verify Base64 conversion in browser console
- [ ] Check Edge Function logs for API request
- [ ] Verify MindPal receives documents correctly
- [ ] Monitor workflow execution in MindPal dashboard
- [ ] Confirm callback receives results
- [ ] Verify electrical requirements display

---

## API Endpoint Reference

**Old (v10):**
```
POST https://app.mindpal.space/api/v2/workflow/run?workflow_id={id}
Headers: x-api-key: {key}
```

**New (v11):**
```
POST https://api.mindpal.io/v1/workflows/{id}/run
Headers: Authorization: Bearer {key}
```

---

## Payload Format

**Request Body:**
```json
{
  "69860fd696be27d5d9cb4258": "[{\"filename\":\"bid1.pdf\",\"mime_type\":\"application/pdf\",\"base64_content\":\"...\"}]",
  "69860fd696be27d5d9cb4255": "{\"price\":3,\"efficiency\":3,...}",
  "69860fd696be27d5d9cb4257": "req-123456",
  "69860fd696be27d5d9cb4256": "https://..."
}
```

---

## Rollback Instructions

If needed, restore from backups:
```bash
cp backups/mindpal-url-workflow-2026-02-06/start-mindpal-analysis-index.ts supabase/functions/start-mindpal-analysis/index.ts
cp backups/mindpal-url-workflow-2026-02-06/mindpalService.ts src/lib/services/mindpalService.ts
# Redeploy
supabase functions deploy start-mindpal-analysis
git checkout HEAD~1 -- src/config/mindpal.config.ts src/lib/utils/fileHandler.ts
```

---

## Next Steps

1. **Test on staging:** https://bidcompare.netlify.app/
2. **Monitor MindPal workflow:** Check v11 workflow dashboard
3. **Verify electrical data:** Ensure new fields display correctly
4. **Update API key:** If using new MindPal account, update `MINDPAL_API_KEY` secret

---

## Notes

- Existing electrical display components (`ElectricalComparisonTable.tsx`, `ElectricalInfoCard.tsx`) are compatible
- No database schema changes required
- Frontend UI unchanged (same upload flow)
- Base64 conversion happens client-side (no storage upload needed)
