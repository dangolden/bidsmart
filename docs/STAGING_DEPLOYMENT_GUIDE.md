# BidSmart Staging Deployment Guide

> **Last updated**: January 28, 2026

This guide walks through setting up a staging environment for testing before pushing changes to production.

## Overview

The staging environment allows you to:
- Test new MindPal workflow configurations
- Validate signed token authentication with TheSwitchIsOn
- Test frontend changes before production
- Verify the full end-to-end flow

---

## Architecture Decision: Shared vs Separate Supabase

### ✅ Recommended: Shared Supabase (Same Database)

For most cases, use the **same Supabase project** for both staging and production:

| Component | Staging | Production |
|-----------|---------|------------|
| Git Branch | `staging` | `main` |
| Netlify Site | `bidsmart-staging.netlify.app` | Production URL |
| Supabase | **Same project** | **Same project** |
| Database | **Same database** | **Same database** |
| Edge Functions | **Same (shared)** | **Same (shared)** |

**Pros:**
- Simpler setup and maintenance
- No duplicate data management
- Edge Functions automatically shared
- Lower cost (one project)

**When to use separate Supabase:**
- Testing destructive database migrations
- Need completely isolated test data
- Multiple teams working simultaneously

---

## Prerequisites

- Git access to the BidSmart repository
- Netlify account (for staging deployment)
- MindPal access (for new workflow IDs)
- Coordination with TheSwitchIsOn team (for auth integration)

---

## Step-by-Step Instructions

### Phase 1: Create Staging Branch

```bash
# 1. Ensure you're on main and up to date
cd /Users/dangolden/BidSmart/bidsmart
git checkout main
git pull origin main

# 2. Create and switch to staging branch
git checkout -b staging

# 3. Commit any pending changes
git add .
git commit -m "feat: Add staging support, env-based MindPal config, signed token auth"

# 4. Push staging branch to remote
git push -u origin staging
```

---

### Phase 2: Update Supabase Edge Function Secrets

Since you're using the **same Supabase project**, just update the secrets with new MindPal IDs when ready.

In your existing Supabase Dashboard → **Edge Functions** → **Secrets**:

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `MINDPAL_WORKFLOW_ID` | New workflow ID | Get from MindPal when ready |
| `MINDPAL_PDF_URLS_FIELD_ID` | New field ID | Get from MindPal |
| `MINDPAL_USER_PRIORITIES_FIELD_ID` | New field ID | Get from MindPal |
| `MINDPAL_REQUEST_ID_FIELD_ID` | New field ID | Get from MindPal |
| `MINDPAL_CALLBACK_URL_FIELD_ID` | New field ID | Get from MindPal |
| `PARENT_AUTH_SECRET` | Shared secret | Optional - coordinate with TheSwitchIsOn |

> **Note**: If these secrets aren't set yet, the existing hardcoded values will not work. Add these when you have the new MindPal workflow IDs.

After updating secrets, redeploy Edge Functions:
```bash
supabase functions deploy
```

---

### Phase 3: Deploy Staging to Netlify

#### Option A: Netlify CLI

```bash
# 1. Install Netlify CLI if needed
npm install -g netlify-cli

# 2. Login to Netlify
netlify login

# 3. Create new site for staging
netlify sites:create --name bidsmart-staging

# 4. Set environment variables (use SAME Supabase as production)
netlify env:set VITE_SUPABASE_URL "https://your-existing-project.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-existing-anon-key"
netlify env:set VITE_APP_ENV "staging"

# 5. Link and deploy
netlify link
netlify deploy --build --prod
```

#### Option B: Netlify Dashboard

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to your Git repository
4. Configure:
   - **Branch to deploy**: `staging`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Add environment variables (Site Settings → Environment Variables):
   - `VITE_SUPABASE_URL` = **your existing production Supabase URL**
   - `VITE_SUPABASE_ANON_KEY` = **your existing anon key**
   - `VITE_APP_ENV` = `staging`

---

### Phase 4: Update MindPal Callback (When Ready)

When MindPal provides new workflow IDs:

1. Update the Supabase secrets with the new IDs
2. Ensure MindPal's callback URL points to your Supabase:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/mindpal-callback
   ```
3. Test by uploading a PDF on the staging Netlify site

---

### Phase 6: Coordinate with TheSwitchIsOn

For signed token authentication to work:

1. **Share the secret**: Provide `PARENT_AUTH_SECRET` value to TheSwitchIsOn team

2. **Provide token format documentation**:
   ```javascript
   // Token payload structure
   const payload = {
     email: "user@example.com",
     name: "User Name",
     exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
     iat: Math.floor(Date.now() / 1000)
   };
   
   // Token format: base64url(JSON.stringify(payload)).base64url(HMAC-SHA256(payload, secret))
   ```

3. **Provide staging embed URL**:
   ```html
   <iframe src="https://bidsmart-staging.netlify.app/?auth_token=TOKEN_HERE"></iframe>
   ```

4. **For testing without signed tokens** (development only):
   - Don't set `PARENT_AUTH_SECRET` in Supabase secrets
   - Legacy email header auth will still work

---

### Phase 7: Testing Checklist

#### Basic Functionality
- [ ] App loads in iframe on staging domain
- [ ] User creation works
- [ ] Project creation works
- [ ] PDF upload works

#### MindPal Integration
- [ ] PDF triggers MindPal extraction
- [ ] Callback is received successfully
- [ ] Data is mapped to database correctly
- [ ] Scores are calculated

#### Authentication (if enabled)
- [ ] Signed token auth works from parent platform
- [ ] Invalid tokens are rejected
- [ ] Expired tokens are rejected

#### Edge Cases
- [ ] Large PDF handling
- [ ] Multiple PDF batch processing
- [ ] Error states display correctly

---

### Phase 8: Merge to Production

Once testing is complete:

```bash
# 1. Ensure staging is up to date
git checkout staging
git pull origin staging

# 2. Create a PR from staging to main
# (Use GitHub/GitLab UI or gh CLI)
gh pr create --base main --head staging --title "Release: Staging to Production"

# 3. After PR approval and merge, update production secrets
# Go to production Supabase project and update:
# - MINDPAL_WORKFLOW_ID
# - MINDPAL_*_FIELD_ID values
# - PARENT_AUTH_SECRET (if enabling signed auth)

# 4. Redeploy production Edge Functions
supabase functions deploy --project-ref YOUR_PRODUCTION_PROJECT_REF
```

---

## Environment Variable Reference

### Frontend (Netlify)

| Variable | Staging | Production |
|----------|---------|------------|
| `VITE_SUPABASE_URL` | Staging project URL | Production project URL |
| `VITE_SUPABASE_ANON_KEY` | Staging anon key | Production anon key |
| `VITE_APP_ENV` | `staging` | `production` |

### Backend (Supabase Edge Functions)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin access) |
| `MINDPAL_API_KEY` | MindPal authentication |
| `MINDPAL_CALLBACK_SECRET` | HMAC signing for callbacks |
| `MINDPAL_WORKFLOW_ID` | MindPal workflow identifier |
| `MINDPAL_PDF_URLS_FIELD_ID` | MindPal field ID |
| `MINDPAL_USER_PRIORITIES_FIELD_ID` | MindPal field ID |
| `MINDPAL_REQUEST_ID_FIELD_ID` | MindPal field ID |
| `MINDPAL_CALLBACK_URL_FIELD_ID` | MindPal field ID |
| `PARENT_AUTH_SECRET` | Shared secret with TheSwitchIsOn |
| `RESEND_API_KEY` | Email service key |

---

## Troubleshooting

### "MindPal workflow configuration incomplete"
- Ensure all `MINDPAL_*` secrets are set in Supabase Edge Functions

### "Authentication token required"
- `PARENT_AUTH_SECRET` is set but no valid token provided
- Either provide a valid signed token or remove the secret for legacy mode

### "Invalid token signature"
- Secret mismatch between BidSmart and parent platform
- Check that both systems use the exact same secret

### Edge Functions not updating
```bash
# Force redeploy all functions
supabase functions deploy --project-ref YOUR_PROJECT_REF
```

### Database migration issues
```bash
# Check migration status
supabase db diff

# Reset and re-run (CAUTION: destroys data)
supabase db reset
```

---

## Quick Commands Reference

```bash
# Switch to staging
git checkout staging

# Deploy Edge Functions to staging
supabase functions deploy --project-ref STAGING_REF

# Deploy Edge Functions to production
supabase functions deploy --project-ref PROD_REF

# Check Netlify deploy status
netlify status

# View Supabase function logs
supabase functions logs FUNCTION_NAME --project-ref PROJECT_REF
```
