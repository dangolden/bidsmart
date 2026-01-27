# BidSmart - HomeDoc Internal Deployment Guide

**Audience:** HomeDoc development team
**Purpose:** Complete technical deployment instructions
**Client:** SwitchIsOn.org (embeds the application)

---

## Deployment Strategy

**Recommended Architecture:**
- **Hosting:** Netlify (static hosting with CDN)
- **Database:** Supabase (PostgreSQL + Storage + Auth)
- **Edge Functions:** Supabase Edge Functions
- **Domain:** Custom subdomain (e.g., bidsmart.homedoc.com or bidsmart.switchison.org)

**Why This Stack:**
- Production-grade reliability (99.99% uptime SLA)
- Auto-scaling and CDN included
- Zero-downtime deployments
- Built-in HTTPS and security headers
- Cost-effective (free tier sufficient for launch)

---

## Pre-Deployment Checklist

### 1. Supabase Project Setup

**Create Production Project:**
```bash
# If migrating from Bolt Database, claim it in Supabase
# OR create new project at supabase.com
```

- [ ] Create production Supabase project
- [ ] Note project URL: `https://xxxxx.supabase.co`
- [ ] Copy anon key from Settings > API
- [ ] Copy service role key (keep secure!)

**Run Database Migrations:**

```bash
# Apply all migrations in order:
supabase/migrations/001_create_bidsmart_schema.sql
supabase/migrations/20260120010409_002_create_project_requirements.sql
supabase/migrations/20260120063745_003_security_fixes.sql
supabase/migrations/20260120071915_004_add_data_sharing_consent.sql
supabase/migrations/20260120173813_005_optimize_rls_and_indexes.sql
supabase/migrations/20260124025656_006_add_mindpal_run_id.sql
supabase/migrations/20260124170718_007_add_demo_project_constraint.sql
supabase/migrations/20260124171224_008_add_foreign_key_indexes_and_security_fixes.sql
```

**Create Storage Bucket:**

```sql
-- Create 'bids' bucket for PDF uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('bids', 'bids', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bids' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bids' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'bids' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Verify Database:**
- [ ] All tables created
- [ ] RLS policies active
- [ ] Storage bucket exists
- [ ] Test data query works

---

### 2. Environment Variables

Create `.env.production`:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# MindPal (when ready)
VITE_MINDPAL_WEBHOOK_URL=https://api.mindpal.space/v1/workflows/WORKFLOW_ID/trigger
VITE_MINDPAL_API_KEY=your-mindpal-api-key

# Application
VITE_APP_ENV=production
```

**Security Note:** Never commit these to git! Use hosting platform's environment variable management.

---

### 3. Build Configuration

**Verify `vite.config.ts`:**

Security headers are pre-configured for multi-domain support:

```typescript
// Already configured - supports switchison.org, homedoc.us, bolt.new, and localhost
// See vite.config.ts for full configuration
```

**Authorized Domains:**
- Client: `switchison.org` and all subdomains
- HomeDoc: `homedoc.us` and all subdomains
- Test: `bolt.new`, `stackblitz.com` and all subdomains
- Dev: `localhost` (all ports)

**Note:** Configuration supports flexible deployment across all environments. See `docs/DEPLOYMENT_DOMAINS.md` for complete details.

**Test Build Locally:**

```bash
# Install dependencies
npm install

# Run type check
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

- [ ] Build succeeds without errors
- [ ] Type check passes
- [ ] Preview loads correctly
- [ ] No console errors

---

## Deployment: Option A - Netlify (Recommended)

### Initial Setup

1. **Connect Repository:**
   - Push code to GitHub (private repo recommended)
   - Go to app.netlify.com
   - Click "Add new site" > "Import from Git"
   - Select your BidSmart repository

2. **Configure Build Settings:**
   ```
   Build command: npm run build
   Publish directory: dist
   Node version: 18
   ```

3. **Add Environment Variables:**
   - Go to Site settings > Environment variables
   - Add all variables from `.env.production`

4. **Deploy:**
   - Click "Deploy site"
   - Wait for build to complete (2-3 minutes)
   - Note your deployment URL: `https://random-name.netlify.app`

### Custom Domain Setup

**Option A: Subdomain of SwitchIsOn.org**
```
bidsmart.switchison.org → Netlify site
```

1. In Netlify: Domain settings > Add custom domain
2. Enter: `bidsmart.switchison.org`
3. Netlify provides DNS instructions
4. SwitchIsOn.org admin adds DNS record:
   ```
   Type: CNAME
   Name: bidsmart
   Value: random-name.netlify.app
   ```
5. Wait for DNS propagation (5-60 minutes)
6. Netlify auto-provisions SSL certificate

**Option B: Subdomain of HomeDoc.com**
```
bidsmart.homedoc.com → Netlify site
```

Same process as above, but HomeDoc controls DNS.

### Verify Security Headers

The `public/_headers` file is pre-configured with multi-domain support:

```
/*
  Content-Security-Policy: frame-ancestors 'self' https://switchison.org https://*.switchison.org https://homedoc.us https://*.homedoc.us https://bolt.new https://*.bolt.new https://stackblitz.com https://*.stackblitz.com
  X-Frame-Options: ALLOWALL
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

**Note:** This configuration allows embedding across client, HomeDoc, and test environments. The `netlify.toml` file automatically applies these headers during deployment.

### Verify Deployment

- [ ] Visit production URL
- [ ] Application loads without errors
- [ ] Can create a test project
- [ ] PDF upload works
- [ ] Check browser console (no errors)
- [ ] Test on mobile device
- [ ] Verify headers with `curl -I https://your-url.com`

---

## Deployment: Option B - Vercel

### Initial Setup

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables:**
   ```bash
   vercel env add VITE_SUPABASE_URL production
   vercel env add VITE_SUPABASE_ANON_KEY production
   # ... add all other env vars
   ```

4. **Custom Domain:**
   ```bash
   vercel domains add bidsmart.switchison.org
   ```

### Configure Security Headers

If using Vercel instead of Netlify, create `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "frame-ancestors 'self' https://switchison.org https://*.switchison.org https://homedoc.us https://*.homedoc.us https://bolt.new https://*.bolt.new https://stackblitz.com https://*.stackblitz.com"
        },
        {
          "key": "X-Frame-Options",
          "value": "ALLOWALL"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

**Note:** Netlify is recommended and already configured via `netlify.toml`. Only create `vercel.json` if deploying to Vercel instead.

---

## MindPal Integration Setup

### 1. Deploy Edge Functions

**Deploy send-to-mindpal:**

```bash
# Uses Supabase CLI or mcp__supabase__deploy_edge_function tool
# Function located at: supabase/functions/send-to-mindpal/index.ts
```

**Deploy mindpal-callback:**

```bash
# Function located at: supabase/functions/mindpal-callback/index.ts
```

**Set Environment Variables in Supabase:**

```bash
# In Supabase Dashboard > Edge Functions > Settings
MINDPAL_API_KEY=your-key
MINDPAL_WEBHOOK_URL=https://api.mindpal.space/v1/workflows/WORKFLOW_ID/trigger
MINDPAL_WEBHOOK_SECRET=shared-secret-for-hmac
```

### 2. Configure MindPal Webhook

Provide to MindPal team:

- **Callback URL:** `https://your-project.supabase.co/functions/v1/mindpal-callback`
- **Authentication:** HMAC-SHA256 signature in `X-MindPal-Signature` header
- **Input/Output Schemas:** See `docs/MINDPAL_INTEGRATION.md`

### 3. Test Integration

```bash
# Test PDF upload flow:
1. Upload PDF in BidSmart
2. Check Supabase logs for webhook sent
3. Verify MindPal receives request
4. Wait for extraction (30-60 seconds)
5. Check callback received in Supabase logs
6. Verify bid data imported correctly
```

---

## Post-Deployment Configuration

### 1. Update Client Documentation

Replace `YOUR-BIDSMART-URL.com` in:
- `FOR_SWITCHISON_EMBEDDING_ONLY.md`
- `docs/production-embed-example.html`

With actual production URL, then send to SwitchIsOn.org.

### 2. Set Up Monitoring

**Supabase Dashboard:**
- Monitor database usage
- Set up alerts for quota warnings
- Check storage usage weekly

**Netlify/Vercel Dashboard:**
- Monitor bandwidth usage
- Check build logs for failures
- Set up deploy notifications

**Optional: Error Tracking**

Install Sentry:
```bash
npm install @sentry/react @sentry/vite-plugin
```

Configure in `src/main.tsx`:
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

### 3. Set Up Backups

**Database Backups:**
- Supabase Pro includes daily backups
- Free tier: Export manually weekly
- CLI: `supabase db dump -f backup.sql`

**Code Backups:**
- GitHub is source of truth
- Tag releases: `git tag v1.0.0 && git push --tags`

---

## Continuous Deployment

### Auto-Deploy on Git Push

**Netlify/Vercel:**
Automatically deploy when pushing to `main` branch:

```bash
git add .
git commit -m "Update feature"
git push origin main
# Triggers automatic deployment
```

### Manual Deploy

```bash
# Build locally
npm run build

# Deploy dist/ folder
netlify deploy --prod --dir=dist
# OR
vercel --prod
```

---

## Troubleshooting

### Build Fails

**Check:**
- Node version (must be 18+)
- All dependencies installed (`npm install`)
- Type errors (`npm run typecheck`)
- Environment variables set

### Application Won't Load

**Check:**
- Environment variables in hosting platform
- HTTPS certificate active
- DNS propagated (use `dig` or `nslookup`)
- Browser console for errors

### Database Connection Error

**Check:**
- Supabase URL correct in environment variables
- Anon key valid (not service role key!)
- RLS policies allow access
- Supabase project not paused (free tier pauses after inactivity)

### Iframe Embedding Blocked

**Check:**
- CSP headers configured correctly
- Testing on switchison.org domain (not localhost)
- `frame-ancestors` allows switchison.org
- No browser extensions blocking iframes

### PDF Upload Fails

**Check:**
- Storage bucket exists
- RLS policies allow upload
- File size under limit (Supabase default: 50MB)
- Storage quota not exceeded

---

## Maintenance Schedule

**Weekly:**
- Check error logs
- Review Supabase usage metrics
- Monitor bandwidth

**Monthly:**
- Review and update dependencies
- Check for security patches
- Database backup verification
- Cost review

**Quarterly:**
- Performance audit
- Security review
- Feature planning
- User feedback review

---

## Rollback Procedure

If deployment breaks production:

**Quick Rollback (Netlify):**
1. Go to Deploys
2. Find last working deploy
3. Click "Publish deploy"
4. Site reverts in 30 seconds

**Quick Rollback (Vercel):**
```bash
vercel rollback
```

**Database Rollback:**
- More complex, requires backup restoration
- Contact Supabase support for assistance
- Why RLS and testing are critical!

---

## Security Checklist

Before going live:

- [ ] All environment variables in hosting platform (not in code)
- [ ] CSP headers restrict embedding to switchison.org only
- [ ] HTTPS enabled with valid certificate
- [ ] RLS policies tested and verified
- [ ] Service role key never exposed in frontend
- [ ] API keys not in git history
- [ ] Storage bucket is private (public: false)
- [ ] Error messages don't expose sensitive data
- [ ] Dependencies have no critical vulnerabilities (`npm audit`)

---

## Support Procedures

### Critical Outage (App Down)

1. Check hosting platform status page
2. Check Supabase dashboard (project paused?)
3. Review deploy logs
4. Roll back to last working version
5. Investigate root cause
6. Fix and redeploy
7. Notify SwitchIsOn.org

### Bug Reports from Client

1. Reproduce the issue
2. Check error logs (Sentry, Supabase logs, browser console)
3. Identify root cause
4. Create fix
5. Test locally
6. Deploy to production
7. Verify fix
8. Notify SwitchIsOn.org resolved

### Feature Requests

1. Evaluate complexity and time required
2. Discuss with SwitchIsOn.org (billable? timeline?)
3. Create feature branch
4. Develop and test
5. Deploy to production
6. Provide documentation if needed

---

## Cost Management

### Monitor Usage

**Supabase Free Tier Limits:**
- 500 MB database storage
- 1 GB file storage
- 2 GB bandwidth per month
- 50,000 monthly active users

**When to Upgrade:**
- Database > 400 MB
- File storage > 800 MB
- Approaching user limit

**Netlify Free Tier Limits:**
- 100 GB bandwidth/month
- 300 build minutes/month

**Optimization Tips:**
- Clean up old PDFs periodically
- Optimize images
- Enable caching headers
- Use CDN effectively

---

## Handoff to SwitchIsOn.org

Once deployed:

1. Send `FOR_SWITCHISON_EMBEDDING_ONLY.md`
2. Provide production URL
3. Offer to help with initial embedding
4. Verify embedding works on their site
5. Provide contact info for support
6. Done!

---

## Reference Documentation

- Full deployment checklist: `docs/DEPLOYMENT_CHECKLIST.md` (archived)
- MindPal integration: `docs/MINDPAL_INTEGRATION.md`
- Security details: `docs/EMBED_SECURITY.md`
- Responsibility matrix: `docs/INTERNAL_Responsibility_Matrix.md`

---

## Questions?

Internal team questions: [Internal channel/email]
