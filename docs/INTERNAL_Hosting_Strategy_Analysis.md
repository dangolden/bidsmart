# BidSmart - Hosting Strategy Analysis

**Date:** January 2026
**Decision Maker:** HomeDoc Team
**Client:** SwitchIsOn.org (embeds via iframe)

---

## Executive Summary

**Recommendation:** Deploy to **Netlify + Supabase** (Production-Grade)

**Why:** Bolt is a development/prototyping platform, not suitable for production hosting. Migrating to Netlify provides enterprise-grade reliability, performance, and professional domain support at minimal cost.

**Timeline:** 2-4 hours to migrate
**Cost Impact:** $0/month (free tier) or ~$44/month if scaling beyond free limits
**Risk:** Low (well-tested stack, can test before switching)

---

## Option Comparison

### Option 1: Keep Bolt Hosting

**Pros:**
- Already deployed in Bolt
- No migration work needed
- Works for demos/prototypes

**Cons:**
- ❌ Not designed for production workloads
- ❌ Limited performance optimization
- ❌ No custom domain support (or limited)
- ❌ Less reliable than production platforms
- ❌ Limited monitoring and analytics
- ❌ May have usage restrictions
- ❌ Not professionally supported
- ❌ Unclear long-term availability

**Cost:** Varies by Bolt pricing model

**Verdict:** ❌ **Not Recommended for Production**

---

### Option 2: Netlify + Supabase (RECOMMENDED)

**Pros:**
- ✅ Production-grade reliability (99.99% uptime SLA)
- ✅ Global CDN included (fast worldwide)
- ✅ Automatic HTTPS/SSL certificates
- ✅ Custom domain support (professional URLs)
- ✅ Zero-downtime deployments
- ✅ Git-based continuous deployment
- ✅ Built-in rollback capability
- ✅ Excellent performance (edge caching)
- ✅ Auto-scaling infrastructure
- ✅ Environment variable management
- ✅ Deploy previews for testing
- ✅ Professional monitoring and analytics
- ✅ Industry-standard platform (trusted by major companies)
- ✅ Already using Supabase (can claim/migrate database)

**Cons:**
- Requires 2-4 hours migration work
- Learning curve for deploy process (minimal)

**Cost:**

**Free Tier (Sufficient for Launch):**
- Netlify: $0/month
  - 100 GB bandwidth
  - 300 build minutes
  - Automatic HTTPS
  - Custom domain

- Supabase: $0/month
  - 500 MB database
  - 1 GB file storage
  - 50,000 monthly active users
  - Automatic backups (7 days)

**If Exceed Free Tier:**
- Netlify Pro: $19/month (400 GB bandwidth)
- Supabase Pro: $25/month (8 GB database, 100 GB storage)
- **Total:** $44/month at scale

**When to Upgrade:**
- If bandwidth exceeds 80 GB/month
- If storage exceeds 800 MB
- If users exceed 40,000/month

**Verdict:** ✅ **STRONGLY RECOMMENDED**

---

### Option 3: Vercel + Supabase

**Pros:**
- Similar to Netlify (production-grade)
- Excellent performance
- Good developer experience
- Auto-scaling

**Cons:**
- Slightly more complex than Netlify
- Free tier has lower bandwidth limits

**Cost:**
- Free: 100 GB bandwidth
- Pro: $20/month

**Verdict:** ✅ **Also Good, Netlify Slightly Preferred**

---

### Option 4: AWS S3 + CloudFront + Supabase

**Pros:**
- Maximum control
- Enterprise-grade
- Highly scalable

**Cons:**
- ❌ Much more complex setup
- ❌ Requires DevOps expertise
- ❌ Manual certificate management
- ❌ More time to configure
- ❌ Higher operational overhead

**Cost:** ~$5-50/month (variable, complex pricing)

**Verdict:** ❌ **Overkill for This Project**

---

### Option 5: Self-Hosted VPS (DigitalOcean, Linode, etc.)

**Pros:**
- Full control
- Predictable pricing

**Cons:**
- ❌ Requires server management
- ❌ Manual security updates
- ❌ No auto-scaling
- ❌ No built-in CDN
- ❌ Manual SSL setup
- ❌ Higher maintenance burden

**Cost:** $5-20/month + time

**Verdict:** ❌ **Too Much Maintenance**

---

## Detailed Recommendation: Netlify + Supabase

### Why Netlify?

**Performance:**
- Global CDN with 100+ edge locations
- Automatic asset optimization
- HTTP/2 and HTTP/3 support
- Smart caching strategies
- Fast builds (< 2 minutes typical)

**Reliability:**
- 99.99% uptime SLA
- Automatic failover
- DDoS protection included
- Redundant infrastructure
- No single point of failure

**Developer Experience:**
- Deploy with `git push` (continuous deployment)
- Instant rollbacks (one click)
- Deploy previews for testing
- Environment variable management
- Build logs and debugging tools

**Security:**
- Automatic HTTPS (Let's Encrypt)
- Security headers configuration
- Branch-based access control
- Secure environment variables
- SOC 2 Type II certified

**Cost:**
- Free tier perfect for launch
- Only pay if actually needed
- Transparent pricing
- No surprise charges

### Why Supabase?

**Already Using It:**
- Current database (can claim from Bolt)
- No new tech to learn
- Existing migrations work as-is

**Features:**
- PostgreSQL (reliable, powerful)
- Row Level Security (built-in auth)
- Storage (for PDF files)
- Real-time subscriptions
- Edge Functions (for MindPal)
- Automatic backups

**Reliability:**
- SOC 2 Type II compliant
- 99.9% uptime SLA
- Automated backups
- Point-in-time recovery (Pro tier)

---

## Migration Plan: Bolt → Netlify + Supabase

### Phase 1: Preparation (30 minutes)

1. **Set Up Netlify Account**
   - Create account at netlify.com
   - Connect GitHub repository

2. **Claim Supabase Project**
   - Go to supabase.com
   - Claim Bolt Database (or create new project)
   - Note credentials

3. **Configure Environment Variables**
   - Add to Netlify dashboard
   - Test locally with production values

### Phase 2: Deploy (1 hour)

1. **Initial Deployment**
   - Connect GitHub repo to Netlify
   - Configure build settings
   - Deploy

2. **Verify Deployment**
   - Test all features
   - Check database connectivity
   - Verify file uploads
   - Test on mobile

3. **Custom Domain Setup**
   - Add custom domain in Netlify
   - Configure DNS (wait for propagation)
   - Verify SSL certificate

### Phase 3: Edge Functions (1-2 hours)

1. **Deploy Supabase Edge Functions**
   - `send-to-mindpal`
   - `mindpal-callback`

2. **Configure MindPal Integration**
   - Update callback URLs
   - Test webhook flow

### Phase 4: Cutover (30 minutes)

1. **Update SwitchIsOn.org**
   - Replace iframe URL with new Netlify URL
   - Test embedding
   - Verify no errors

2. **Monitor**
   - Watch error logs
   - Monitor traffic
   - Ready to rollback if needed

3. **Decommission Bolt**
   - Keep for 7 days as backup
   - Then shut down

**Total Time:** 2-4 hours
**Downtime:** Zero (deploy new, then switch)

---

## Risk Analysis

### Low Risk

**Netlify + Supabase is Battle-Tested:**
- Used by thousands of production apps
- Well-documented
- Active community support
- Proven reliability

**Can Test Before Switching:**
- Deploy to Netlify in parallel
- Test thoroughly
- Switch only when confident
- Keep Bolt as backup during transition

**Easy Rollback:**
- DNS change reverts in minutes
- Netlify instant rollback feature
- Database unchanged (same Supabase)

### Risk Mitigation

**Backup Plan:**
- Keep Bolt deployment active for 7 days post-migration
- Can revert DNS if issues
- Database backups before migration

**Testing Protocol:**
1. Deploy to temporary Netlify URL
2. Test all features end-to-end
3. Load test (if concerned)
4. Only then update DNS/iframe URL

---

## Cost Projection

### Year 1 Costs (Estimated)

**Months 1-6 (Low Usage):**
- Netlify: $0 (free tier)
- Supabase: $0 (free tier)
- **Total:** $0/month

**Months 7-12 (Growing Usage):**
- Likely still free tier
- If exceeded: $44/month
- **Expected:** $0-44/month

**Year 1 Total:** $0-264

### Year 2+ (Scaled Usage)

**If Successful (Moderate Usage):**
- Netlify Pro: $19/month
- Supabase Pro: $25/month
- MindPal: $50-100/month (estimate)
- **Total:** $94-144/month

**If Very Successful (High Usage):**
- May need Supabase Team tier: $599/month
- But that means app is hugely successful!

### Cost vs. Value

**Value to SwitchIsOn.org:**
- Professional tool for their users
- Increased engagement
- Lead generation
- Brand authority

**$44-144/month is:**
- Less than 1-2 hours of developer time
- Fraction of typical SaaS tools
- Reasonable for professional hosting

---

## Technical Specifications

### Infrastructure

**Netlify:**
- Hosting: Global CDN, 100+ edge locations
- Build: Containerized, reproducible builds
- Deploy: Git-based, continuous deployment
- SSL: Automatic (Let's Encrypt)
- DNS: Built-in DNS management

**Supabase:**
- Database: PostgreSQL 15+ (AWS infrastructure)
- Storage: S3-compatible object storage
- Edge Functions: Deno runtime (V8 isolates)
- Auth: JWT-based authentication
- Backups: Automated daily backups

### Performance Metrics

**Expected Load Times:**
- Initial page load: < 2 seconds
- Time to interactive: < 3 seconds
- Subsequent navigation: < 500ms

**Capacity:**
- Concurrent users: 1,000+ (free tier)
- PDF uploads: Unlimited (within storage quota)
- Database queries: 100,000+/day (free tier)

---

## Monitoring & Analytics

### Built-In Monitoring

**Netlify:**
- Bandwidth usage
- Build success/failure
- Deploy frequency
- Form submissions (if used)

**Supabase:**
- Database queries per second
- Storage usage
- Active connections
- API requests

### Recommended Additional Tools

**Error Tracking:**
- Sentry (free for 5,000 events/month)
- Tracks JavaScript errors
- Stack traces and context

**Analytics:**
- Plausible or Simple Analytics ($9/month)
- Privacy-friendly
- No cookie consent needed

**Uptime Monitoring:**
- UptimeRobot (free for 50 monitors)
- Alerts if site goes down
- 5-minute check interval

---

## Decision Matrix

| Criteria | Bolt | Netlify + Supabase | Weight | Winner |
|----------|------|-------------------|--------|--------|
| Production-Ready | ⚠️ | ✅ | High | Netlify |
| Reliability | ⚠️ | ✅ | High | Netlify |
| Performance | ⚠️ | ✅ | High | Netlify |
| Custom Domain | ⚠️ | ✅ | High | Netlify |
| Setup Time | ✅ | ⚠️ | Low | Bolt |
| Cost (Free Tier) | ✅ | ✅ | Medium | Tie |
| Monitoring | ⚠️ | ✅ | Medium | Netlify |
| Scalability | ⚠️ | ✅ | High | Netlify |
| Support | ⚠️ | ✅ | Medium | Netlify |

**Clear Winner:** Netlify + Supabase

---

## Recommendation Summary

### For Immediate Launch

**Deploy to Netlify + Supabase**

**Timeline:**
- This week: Complete migration (2-4 hours)
- Test for 1-2 days
- Provide URL to SwitchIsOn.org
- Go live

**Confidence Level:** High
- Proven stack
- Low risk
- Professional result
- Scalable

### Action Items

1. [ ] Create Netlify account
2. [ ] Claim/migrate Supabase database
3. [ ] Deploy to Netlify
4. [ ] Configure custom domain
5. [ ] Test thoroughly
6. [ ] Deploy edge functions
7. [ ] Update SwitchIsOn.org with new URL
8. [ ] Monitor for 48 hours
9. [ ] Decommission Bolt

---

## Questions?

Contact HomeDoc technical lead for discussion.

**Bottom Line:** Netlify + Supabase is the right choice for production. The migration effort (2-4 hours) is worth the significant improvement in reliability, performance, and professionalism.
