# BidSmart Email Notification System — Implementation Plan

> Created: 2026-03-03
> Status: Ready for review

---

## Overview

Three levels of email notifications, all via **Resend** (`bidsmart@theswitchison.org`):

| Level | Recipient | Trigger | Status |
|-------|-----------|---------|--------|
| **Completion** | User (opt-in) | Job completes successfully | ✅ Exists — needs deep link fix |
| **Error/Retry** | User (opt-in) | Job fails | ❌ Not implemented |
| **Admin Alert** | dangolden@pandotic.ai | Any failure | ❌ Not implemented |

**Resend API Key:** `re_DzYPQK5u_2Sn1vwwJXhxUhU1312Txsi2C`

---

## 1. Update Completion Email with Deep Link

**File:** `supabase/functions/send-completion-notification/index.ts`

**Current:** CTA button links to generic `${APP_URL}` — user lands on homepage, must re-enter email to find their report.

**Fix:** Change CTA link to include deep link params:
```
${APP_URL}/?project_id=${projectId}&email=${encodeURIComponent(notificationEmail)}
```

This takes the user straight to their report without re-entering their email.

**Frontend change needed:** The app's routing/landing page needs to read `project_id` and `email` from URL query params and auto-navigate to that project's results. Check `UnifiedHomePage.tsx` for URL param handling.

---

## 2. Create `send-error-alert` Edge Function

**New file:** `supabase/functions/send-error-alert/index.ts`

Follows the same Resend pattern as `send-completion-notification/index.ts`.

### Payload
```json
{
  "project_id": "uuid",
  "error_type": "workflow_failure | bid_processing_error | internal_error",
  "error_details": "Human-readable error message",
  "failed_bid_ids": ["uuid1", "uuid2"]
}
```

### Sends TWO emails:

#### Email 1: Admin Alert (always sent)
- **To:** `ADMIN_ALERT_EMAIL` env var → `dangolden@pandotic.ai`
- **Subject:** `[BidSmart Alert] Analysis failed: {project_name}`
- **Body:**
  - Project name + ID
  - User's notification email
  - Error type + details
  - Failed bid IDs with `last_error` messages
  - Link to Supabase dashboard
  - Timestamp

#### Email 2: User Reassurance (opt-in only)
- **To:** `project.notification_email` (only if `notify_on_completion = true`)
- **Subject:** `We're working on your bid analysis`
- **Body:**
  > Hi! We hit a snag analyzing your bids for "{project_name}".
  > We're automatically retrying — you'll get an email when it's ready.
  > No action needed on your end.
  >
  > If you have questions, contact us at support@theswitchison.org
- **Idempotency:** Check `error_notification_sent_at` column — only send once per project

### Shared utilities to reuse:
- `supabase/functions/_shared/cors.ts` → `handleCors`, `jsonResponse`, `errorResponse`
- `supabase/functions/_shared/supabase.ts` → `supabaseAdmin`

---

## 3. Wire Error Alerts into mindpal-callback

**File:** `supabase/functions/mindpal-callback/index.ts`

### Trigger Point 1: Top-level workflow failure (line ~297-314)
When `payload.status === "failed"` — all bids are marked failed.
```typescript
// After marking bids as failed, trigger error alert
await triggerErrorAlert(resolvedProjectId, 'workflow_failure', payload.error?.message || 'MindPal workflow failed', payload.bids?.map(b => b.bid_id) || []);
```

### Trigger Point 2: Per-bid processing failures (line ~332-341)
After the bid processing loop, if any bids failed:
```typescript
const failedResults = results.filter(r => !r.success);
if (failedResults.length > 0) {
  await triggerErrorAlert(resolvedProjectId, 'bid_processing_error', `${failedResults.length} bid(s) failed processing`, failedResults.map(r => r.bidId));
}
```

### Trigger Point 3: Unhandled exception (line ~495-500)
In the top-level catch block:
```typescript
// Best-effort error alert
try {
  await triggerErrorAlert(null, 'internal_error', error instanceof Error ? error.message : 'Unknown error', []);
} catch { /* don't let alert failure mask original error */ }
```

### Helper function (add to mindpal-callback):
```typescript
async function triggerErrorAlert(projectId: string | null, errorType: string, errorDetails: string, failedBidIds: string[]) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) return;

  try {
    await fetch(`${supabaseUrl}/functions/v1/send-error-alert`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ project_id: projectId, error_type: errorType, error_details: errorDetails, failed_bid_ids: failedBidIds }),
    });
  } catch (err) {
    console.error("Failed to trigger error alert:", err);
  }
}
```

---

## 4. Database Migration

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS error_notification_sent_at TIMESTAMPTZ;
```

---

## 5. Admin Dashboard — "Submissions" Tab

**File:** `src/components/AdminDashboard.tsx`

Add a 5th tab between Overview and Features: **"Submissions"**

### Table columns:
| Column | Source |
|--------|--------|
| Project Name | `projects.project_name` |
| User Email | `projects.notification_email` |
| Status | `projects.status` (color-coded badge) |
| Bids | Count of `bids` related to project |
| Submitted At | `projects.analysis_queued_at` |
| Error Email Sent | `projects.error_notification_sent_at` (timestamp or "—") |
| Completion Email Sent | `projects.notification_sent_at` (timestamp or "—") |

### Filter buttons:
- **All** — all non-draft projects
- **Awaiting Retry** — `error_notification_sent_at IS NOT NULL` AND `notification_sent_at IS NULL` (users told "we're working on it" who are still waiting)
- **Failed** — `status = 'cancelled'` or any bid with `status = 'failed'`
- **Analyzing** — `status = 'analyzing'`
- **Completed** — `status IN ('comparing', 'completed')`

### Expandable row detail:
Click a row to see:
- Per-bid status and `last_error` messages
- `mindpal_run_id` for debugging
- Timestamps: created, queued, updated

**File:** `src/lib/services/adminService.ts`

Add `getSubmissions()` function and `AdminSubmission` type.

---

## 6. Environment Variables

Set in Supabase Dashboard → Edge Function Secrets:

| Key | Value | Notes |
|-----|-------|-------|
| `RESEND_API_KEY` | `re_DzYPQK5u_2Sn1vwwJXhxUhU1312Txsi2C` | Pandotic key |
| `ADMIN_ALERT_EMAIL` | `dangolden@pandotic.ai` | Admin error recipient |
| `APP_URL` | `https://bidsmart.theswitchison.org` | For deep links |

---

## 7. Verification Checklist

- [ ] **Completion email deep link:** Submit a job → receive completion email → click link → lands directly on report (no re-entering email)
- [ ] **Admin error alert:** Force a failure → email arrives at dangolden@pandotic.ai with project details
- [ ] **User error email:** Force a failure on a project with `notify_on_completion=true` → user receives "we're working on it" email
- [ ] **Idempotency:** Trigger same failure twice → only 1 user error email sent (check `error_notification_sent_at`)
- [ ] **Admin Submissions tab:** Log in → see all projects with status badges, email timestamps, filter to "Awaiting Retry"

---

## Implementation Order

1. Update completion email with deep link + frontend URL param handling
2. Run DB migration (`error_notification_sent_at`)
3. Create `send-error-alert` edge function
4. Wire error alerts into `mindpal-callback`
5. Add Submissions tab to Admin Dashboard
6. Deploy edge functions + test
