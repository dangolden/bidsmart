# BidSmart - Responsibility Matrix

## Quick Reference: Who Does What

### HomeDoc Responsibilities (You)

**Hosting & Infrastructure**
- ✅ Deploy and host BidSmart application
- ✅ Maintain production server/hosting account
- ✅ Configure and manage domain/subdomain
- ✅ Ensure 99.9%+ uptime
- ✅ SSL certificate management
- ✅ CDN configuration (if applicable)

**Database & Backend**
- ✅ Supabase project management
- ✅ Database backups and maintenance
- ✅ Monitor database usage/quotas
- ✅ Storage bucket management (PDF files)
- ✅ Row Level Security policies
- ✅ Database migrations and schema updates

**Application Maintenance**
- ✅ Code updates and bug fixes
- ✅ Security patches
- ✅ Dependency updates
- ✅ Performance optimization
- ✅ Error monitoring and resolution
- ✅ Build and deployment pipeline

**MindPal Integration**
- ✅ MindPal API integration
- ✅ Webhook configuration
- ✅ Edge function deployment
- ✅ Manage API keys and secrets
- ✅ Monitor extraction success rates
- ✅ Handle extraction failures

**Support**
- ✅ Technical support for application issues
- ✅ Bug investigation and fixes
- ✅ Feature requests evaluation
- ✅ Monitor error logs
- ✅ Respond to critical outages

**Costs**
- ✅ Pay for hosting (Netlify/Vercel/etc)
- ✅ Pay for Supabase (if exceeds free tier)
- ✅ Pay for MindPal API usage
- ✅ Pay for domain (if custom subdomain)

---

### SwitchIsOn.org Responsibilities (Client)

**Website Integration**
- ✅ Add iframe code to their website
- ✅ Choose where to place BidSmart (which page/URL)
- ✅ Style the iframe wrapper to match their site
- ✅ Add navigation links to BidSmart page
- ✅ Update their site menu/navigation

**User Communication**
- ✅ Promote BidSmart to their audience
- ✅ Provide user instructions (how to use the tool)
- ✅ First-level user support (general questions)
- ✅ Escalate technical issues to HomeDoc

**Feedback**
- ✅ Report bugs or issues noticed by users
- ✅ Provide feedback on user experience
- ✅ Request new features (HomeDoc evaluates feasibility)

**Costs**
- ✅ None (HomeDoc covers all application costs)
- ✅ Their normal website hosting costs

---

## Support Flow

```
User has issue
    ↓
User contacts SwitchIsOn.org
    ↓
Is it a technical/app issue?
    ↓ YES
    SwitchIsOn.org forwards to HomeDoc
    ↓
    HomeDoc investigates and fixes
    ↓
    HomeDoc notifies SwitchIsOn.org when resolved
    ↓ NO (general usage question)
    SwitchIsOn.org answers directly
```

---

## Cost Breakdown

### Free Tier (Expected Usage)

**Netlify:** Free
- 100 GB bandwidth/month
- 300 build minutes/month
- More than sufficient for BidSmart

**Supabase:** Free
- 500 MB database storage
- 1 GB file storage (PDFs)
- 50,000 monthly active users
- Should handle initial traffic easily

**MindPal:** Variable
- Depends on PDF extraction volume
- Estimate: $0.10-0.50 per extraction
- Depends on usage agreement

**Total Monthly Cost:** $0-50 (depending on PDF extraction volume)

### If Scale Exceeds Free Tier

**Netlify Pro:** $19/month
- 400 GB bandwidth
- 1,000 build minutes

**Supabase Pro:** $25/month
- 8 GB database storage
- 100 GB file storage
- 100,000 monthly active users

**Estimated Cost at Scale:** $44-94/month

---

## Communication Protocol

**Regular Updates:**
- HomeDoc sends monthly usage reports to SwitchIsOn.org
- Include: user count, uploads, any issues, costs

**Issue Reporting:**
- SwitchIsOn.org emails HomeDoc with issues
- HomeDoc responds within 24 hours (urgent: 4 hours)
- Resolution time varies by issue severity

**Feature Requests:**
- SwitchIsOn.org emails feature requests
- HomeDoc evaluates feasibility and provides estimate
- Billable if significant development time required

---

## Emergency Contacts

**Critical Outage (App Down):**
- Contact: [HomeDoc Emergency Email/Phone]
- Response Time: 2-4 hours

**Non-Critical Issues:**
- Contact: [HomeDoc Support Email]
- Response Time: 24-48 hours

**SwitchIsOn.org Primary Contact:**
- [Name and Email]

---

## Service Level Agreement (Informal)

**Uptime Target:** 99.5% (allows ~3.6 hours downtime/month)
**Support Response:** 24 hours for non-critical, 4 hours for critical
**Bug Fix Timeline:** Varies by severity
  - Critical (app broken): 24-48 hours
  - Major (feature broken): 1 week
  - Minor (cosmetic): Next update cycle

---

## Update Schedule

**Security Patches:** As needed (urgent)
**Bug Fixes:** As needed
**Feature Updates:** Quarterly or as agreed
**Dependency Updates:** Monthly review

**Deployment Notice:**
- HomeDoc notifies SwitchIsOn.org 24 hours before major updates
- Minor updates deployed without notice (zero downtime)

---

## Ownership & Licensing

**Code Ownership:** SwitchIsOn.org owns the BidSmart application code
**Hosting Account:** HomeDoc manages under their accounts
**Data Ownership:** SwitchIsOn.org users own their data
**Database Access:** HomeDoc has admin access for maintenance

---

## Transition Plan (if needed)

If SwitchIsOn.org wants to take over hosting:

1. HomeDoc provides full codebase access (already provided)
2. HomeDoc assists with Supabase project transfer
3. HomeDoc provides deployment documentation
4. Estimated transition time: 4-8 hours
5. HomeDoc provides 30 days of transition support

---

## Questions?

Contact HomeDoc team for any clarifications on responsibilities.
