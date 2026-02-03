# Resend API Key Setup for Email Notifications

This guide explains how to configure the Resend API key for email notifications in BidSmart.

---

## Overview

BidSmart uses [Resend](https://resend.com) to send email notifications when bid analysis is complete. The email service is already implemented in the `send-completion-notification` edge function.

---

## Setup Steps

### 1. Get Your Resend API Key

1. Go to https://resend.com and sign up or log in
2. Navigate to **API Keys** in the dashboard
3. Click **Create API Key**
4. Give it a name like "BidSmart Production"
5. Copy the API key (starts with `re_`)

### 2. Set the API Key in Supabase

The Resend API key needs to be set as a **Supabase secret** (not an environment variable).

#### Option A: Using Supabase CLI (Recommended)

```bash
# Navigate to your project directory
cd /Users/dangolden/BidSmart/bidsmart

# Set the secret
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
```

#### Option B: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Click **Add Secret**
4. Name: `RESEND_API_KEY`
5. Value: Your Resend API key (e.g., `re_xxxxxxxxxxxxx`)
6. Click **Save**

### 3. Verify the Configuration

The edge function `send-completion-notification` will automatically use this secret. You can verify it's working by:

1. Checking the edge function logs:
   ```bash
   supabase functions logs send-completion-notification --tail
   ```

2. Testing the notification manually (after analysis completes)

---

## Do You Need to Set It in Netlify?

**No.** The Resend API key should **only** be set in Supabase secrets.

Here's why:
- Email notifications are sent from **Supabase Edge Functions**, not from the frontend
- The frontend (deployed on Netlify) never needs access to the Resend API key
- Edge functions run on Supabase's infrastructure and use Supabase secrets

### Environment Variables Summary

**Supabase Secrets (Edge Functions):**
- ✅ `RESEND_API_KEY` - Set this in Supabase
- ✅ `MINDPAL_API_KEY` - Already set
- ✅ `MINDPAL_CALLBACK_SECRET` - Already set
- ✅ `MAKE_WEBHOOK_SECRET` - If using Make.com

**Netlify Environment Variables (Frontend):**
- ✅ `VITE_SUPABASE_URL` - Your Supabase project URL
- ✅ `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
- ❌ `RESEND_API_KEY` - **NOT needed** in Netlify

---

## Email Configuration Details

### From Address
Emails are sent from: `bidsmart@theswitchison.org`

**Important:** You need to verify this domain in Resend:
1. Go to Resend dashboard → **Domains**
2. Add `theswitchison.org`
3. Follow DNS verification steps
4. Wait for verification (usually a few minutes)

### Email Template
The email template is defined in:
`supabase/functions/send-completion-notification/index.ts`

It includes:
- Subject: "Your Heat Pump Bid Analysis is Ready"
- HTML and plain text versions
- Link back to BidSmart
- Instructions for finding analysis

---

## Testing Email Notifications

### Test the Complete Flow

1. Upload 2+ bids in BidSmart
2. Enter your email address
3. Check "Notify me when analysis is complete"
4. Submit for analysis
5. Wait for analysis to complete (10-30 minutes in beta)
6. Check your email inbox

### Test the Edge Function Directly

```bash
# Get your project ID from a completed analysis
# Then call the edge function

curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-completion-notification \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"project_id": "your-project-uuid"}'
```

---

## Troubleshooting

### Email Not Sending

1. **Check Supabase Logs:**
   ```bash
   supabase functions logs send-completion-notification
   ```

2. **Verify API Key is Set:**
   ```bash
   supabase secrets list
   ```
   You should see `RESEND_API_KEY` in the list

3. **Check Resend Dashboard:**
   - Go to Resend → **Logs**
   - Look for recent email attempts
   - Check for errors

### Common Issues

**"RESEND_API_KEY not configured"**
- The secret isn't set in Supabase
- Run: `supabase secrets set RESEND_API_KEY=your_key`

**"Domain not verified"**
- You need to verify `theswitchison.org` in Resend
- Go to Resend → Domains → Add domain

**"Email sent but not received"**
- Check spam folder
- Verify email address is correct
- Check Resend logs for delivery status

---

## Cost & Limits

Resend Free Tier:
- 100 emails/day
- 3,000 emails/month
- Perfect for beta testing

For production, you may need to upgrade based on user volume.

---

## Security Notes

1. **Never commit the API key to git**
2. **Only set it as a Supabase secret**
3. **Rotate the key periodically**
4. **Use different keys for staging/production**

---

## Next Steps

After setting up the Resend API key:

1. ✅ Set `RESEND_API_KEY` in Supabase secrets
2. ✅ Verify domain in Resend dashboard
3. ✅ Test email delivery
4. ✅ Monitor Resend logs for first few days
5. ✅ Consider upgrading Resend plan if needed

---

## Support

- **Resend Docs:** https://resend.com/docs
- **Supabase Secrets:** https://supabase.com/docs/guides/functions/secrets
- **Edge Function Code:** `supabase/functions/send-completion-notification/index.ts`
