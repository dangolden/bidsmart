# BidSmart Documentation Organization

This document explains how the BidSmart documentation is organized and who should read what.

---

## For SwitchIsOn.org (Client)

**READ THIS ONE FILE:**

📄 **`/FOR_SWITCHISON_EMBEDDING_ONLY.md`** (in project root)
- **What:** Simple instructions to embed BidSmart on your website
- **Length:** ~80 lines (5 minutes to read)
- **Action:** Copy iframe code, paste on your site, done!

**You can ignore everything else.** HomeDoc handles all technical operations.

---

## For HomeDoc Team (Internal)

### Quick Reference

📄 **`docs/INTERNAL_Responsibility_Matrix.md`**
- Who does what (HomeDoc vs. SwitchIsOn.org)
- Support workflows
- Cost breakdown
- Emergency contacts
- **Read this first!**

### Deployment & Operations

📄 **`docs/INTERNAL_HomeDoc_Deployment_Guide.md`**
- Complete technical deployment instructions
- Netlify + Supabase setup
- Environment configuration
- Monitoring and maintenance
- Troubleshooting
- **Your deployment bible**

📄 **`docs/INTERNAL_Hosting_Strategy_Analysis.md`**
- Comparison of hosting options
- Why Netlify + Supabase (recommended)
- Cost analysis
- Migration plan from Bolt
- Risk assessment
- **Decision documentation**

### Integration Documentation

📄 **`docs/MINDPAL_INTEGRATION.md`**
- MindPal API integration specs
- Input/output JSON schemas
- Webhook configuration
- For MindPal developers + HomeDoc integration team
- **Technical reference**

📄 **`docs/EMBED_SECURITY.md`**
- Security implementation details
- CSP headers explained
- RLS policies
- Best practices
- **Security reference**

### Client Handoff (Archive)

These were the original client delivery docs. Now replaced by the simpler `FOR_SWITCHISON_EMBEDDING_ONLY.md`:

📄 **`docs/CLIENT_DELIVERY_README.md`** *(Can archive)*
- Was: Mixed client/internal documentation
- Now: Superseded by new docs
- Keep for reference only

📄 **`docs/CLIENT_EMBEDDING_GUIDE.md`** *(Can archive)*
- Was: 400+ line technical guide
- Now: Superseded by `FOR_SWITCHISON_EMBEDDING_ONLY.md`
- Keep for reference only

📄 **`docs/DEPLOYMENT_CHECKLIST.md`** *(Can archive)*
- Was: Mixed checklist
- Now: Integrated into `INTERNAL_HomeDoc_Deployment_Guide.md`
- Keep for reference only

### Development (Archive)

📄 **`BOLT_DEPLOYMENT_GUIDE.md`** *(root directory, can archive)*
- Was: Instructions for Bolt.new deployment
- Now: Not recommended for production
- Keep for historical reference only

📄 **`docs/test-embed.html`** *(Development only)*
- Local testing example
- Not for production use

### Production Examples

📄 **`docs/production-embed-example.html`**
- Full-featured embedding example
- Professional layout with header/footer
- Loading states and error handling
- **Give to SwitchIsOn.org if they want a complete page**

📄 **`docs/production-embed-simple.html`**
- Minimal embedding example
- Just the iframe in a clean wrapper
- **Give to SwitchIsOn.org if they want minimal code**

---

## File Structure

```
bidsmart-standalone/
│
├── FOR_SWITCHISON_EMBEDDING_ONLY.md          ← CLIENT: READ THIS!
│
├── docs/
│   │
│   ├── INTERNAL_Responsibility_Matrix.md     ← HOMEDOC: Start here
│   ├── INTERNAL_HomeDoc_Deployment_Guide.md  ← HOMEDOC: Deployment
│   ├── INTERNAL_Hosting_Strategy_Analysis.md ← HOMEDOC: Strategy
│   ├── MINDPAL_INTEGRATION.md                ← HOMEDOC: MindPal API
│   ├── EMBED_SECURITY.md                     ← HOMEDOC: Security
│   │
│   ├── production-embed-example.html         ← Give to client (full)
│   ├── production-embed-simple.html          ← Give to client (minimal)
│   │
│   ├── README_DOCS_ORGANIZATION.md           ← THIS FILE
│   │
│   └── archive/ (optional)
│       ├── CLIENT_DELIVERY_README.md         ← Old docs (reference)
│       ├── CLIENT_EMBEDDING_GUIDE.md         ← Old docs (reference)
│       ├── DEPLOYMENT_CHECKLIST.md           ← Old docs (reference)
│       └── test-embed.html                   ← Dev testing only
│
├── BOLT_DEPLOYMENT_GUIDE.md                  ← Can archive (not for prod)
│
└── [rest of application code]
```

---

## Migration Notes

### What Changed

**Before:**
- Multiple long, mixed-audience documents
- Client had to read 1,500+ lines to find iframe code
- No clear separation of responsibilities

**After:**
- ONE simple doc for client (80 lines)
- Clear internal documentation for HomeDoc
- Explicit responsibility matrix
- Technical depth where needed, simplicity for client

### Benefits

**For SwitchIsOn.org:**
- 5 minutes to implement (down from 30+ minutes of reading)
- Clear expectations
- No technical jargon
- Simple support path

**For HomeDoc:**
- Clear responsibility boundaries
- Complete technical documentation
- Decision documentation (hosting strategy)
- Easy to onboard new team members

---

## Recommended Actions

### Immediate (Before Client Handoff)

1. ✅ Review `FOR_SWITCHISON_EMBEDDING_ONLY.md`
2. ✅ Deploy to Netlify + Supabase (follow `INTERNAL_HomeDoc_Deployment_Guide.md`)
3. ✅ Replace `YOUR-BIDSMART-URL.com` with actual URL in:
   - `FOR_SWITCHISON_EMBEDDING_ONLY.md`
   - `docs/production-embed-example.html`
   - `docs/production-embed-simple.html`
4. ✅ Send ONLY `FOR_SWITCHISON_EMBEDDING_ONLY.md` to SwitchIsOn.org
5. ✅ Optionally send one of the HTML examples if they want a complete page

### After Handoff

1. Monitor deployment (first 48 hours)
2. Respond to any client questions
3. Set up regular reporting schedule
4. Archive old documentation (move to `docs/archive/`)

---

## Questions?

**Client questions:** SwitchIsOn.org should contact HomeDoc support email
**Internal questions:** HomeDoc team discusses internally

---

## Summary

| Audience | Primary Document | Action |
|----------|-----------------|--------|
| **SwitchIsOn.org** | `FOR_SWITCHISON_EMBEDDING_ONLY.md` | Copy iframe, embed on site |
| **HomeDoc Team** | `INTERNAL_Responsibility_Matrix.md` | Understand boundaries |
| **HomeDoc DevOps** | `INTERNAL_HomeDoc_Deployment_Guide.md` | Deploy and maintain |
| **HomeDoc Leadership** | `INTERNAL_Hosting_Strategy_Analysis.md` | Review decisions |
| **MindPal Integration** | `MINDPAL_INTEGRATION.md` | API implementation |

**Bottom Line:** One simple doc for client, comprehensive docs for internal team. Clear separation, no confusion.
