# BidSmart - Client Delivery Package

**For: TheSwitchIsOn.org**
**Date: January 2025**
**Version: 1.0**

---

## What is BidSmart?

BidSmart is a web application that helps homeowners compare heat pump installation bids from multiple contractors. It provides:

- **PDF Upload**: Upload contractor bid documents
- **AI Extraction**: Automatic extraction of pricing, equipment specs, warranties (via MindPal integration)
- **Side-by-Side Comparison**: Compare multiple bids in one view
- **Quality Checklist**: Verify contractor qualifications
- **Rebate Information**: See available incentives
- **Decision Support**: Get recommendations based on analysis

---

## Package Contents

This delivery includes:

### 📱 Application Code
- Complete React + TypeScript application
- Supabase backend integration
- Production-ready build
- Mobile-responsive design

### 📚 Documentation

| Document | Purpose |
|----------|---------|
| `CLIENT_EMBEDDING_GUIDE.md` | How to embed BidSmart on your website |
| `DEPLOYMENT_CHECKLIST.md` | Step-by-step deployment guide |
| `EMBED_SECURITY.md` | Security implementation details |
| `MINDPAL_INTEGRATION.md` | AI extraction webhook documentation |
| `production-embed-example.html` | Ready-to-use embedding example |
| `test-embed.html` | Testing page for local development |

### 🔧 Configuration Files
- `.env.example` - Environment variables template
- `vite.config.ts` - Build and security configuration
- `public/_headers` - Production security headers

---

## Quick Start Guide

### 1️⃣ Deploy BidSmart

Follow the **DEPLOYMENT_CHECKLIST.md** for complete instructions.

**Quick Deploy Options:**

**Option A: Netlify (Easiest)**
```bash
# 1. Push code to GitHub
# 2. Connect GitHub to Netlify
# 3. Configure:
#    - Build command: npm run build
#    - Publish directory: dist
#    - Add environment variables
# 4. Deploy!
```

**Option B: Vercel**
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel --prod
```

**Option C: Any Static Host**
```bash
# 1. Build
npm run build

# 2. Upload dist/ folder to your host
# 3. Configure headers (see DEPLOYMENT_CHECKLIST.md)
```

### 2️⃣ Configure Environment

Create `.env` file with your Supabase credentials:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3️⃣ Embed on Your Website

Open **CLIENT_EMBEDDING_GUIDE.md** for detailed instructions.

**Simple Embed:**
```html
<iframe
  src="https://your-bidsmart-url.com"
  width="100%"
  height="800"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
  title="BidSmart Heat Pump Bid Analysis">
</iframe>
```

**Use the production example:**
- Copy `docs/production-embed-example.html`
- Replace `YOUR-BIDSMART-URL.com` with your deployed URL
- Upload to switchison.org

---

## Security Features

BidSmart includes enterprise-grade security:

✅ **Content Security Policy (CSP)**
- Only switchison.org domains can embed the application
- Prevents unauthorized embedding

✅ **HTTPS Required**
- All connections encrypted
- Secure data transmission

✅ **Row Level Security (RLS)**
- Users can only access their own data
- Database-level protection

✅ **Secure Headers**
- XSS protection
- MIME sniffing prevention
- Clickjacking protection

See **EMBED_SECURITY.md** for complete details.

---

## MindPal Integration

BidSmart can integrate with MindPal for automatic PDF extraction.

### Setup Steps:

1. **Configure MindPal Workflow**
   - Follow instructions in `MINDPAL_INTEGRATION.md`
   - Provide input/output JSON schemas to MindPal team
   - Get API credentials

2. **Deploy Edge Functions**
   - Deploy `send-to-mindpal` function
   - Deploy `mindpal-callback` function
   - Configure webhook URLs

3. **Test Integration**
   - Upload test PDF
   - Verify extraction completes
   - Check data imports correctly

See **MINDPAL_INTEGRATION.md** for complete technical documentation.

---

## Testing Checklist

Before going live, test these features:

### Basic Features
- [ ] Application loads without errors
- [ ] Create a new project
- [ ] Fill out questionnaire
- [ ] Upload a PDF file
- [ ] View bid comparison table
- [ ] Navigate between phases
- [ ] Check mobile responsiveness

### Embedding
- [ ] Embed works on switchison.org
- [ ] Embedding blocked on other domains
- [ ] No CSP errors in console
- [ ] Iframe is responsive

### Data & Security
- [ ] Data saves to database
- [ ] PDFs stored securely
- [ ] User sessions isolated
- [ ] HTTPS working

---

## Support & Maintenance

### Getting Help

**Documentation:**
- All documentation is in the `docs/` folder
- Start with `DEPLOYMENT_CHECKLIST.md`
- Refer to specific guides as needed

**Common Issues:**

| Issue | Solution |
|-------|----------|
| Iframe not displaying | Check CSP headers, verify URL, test on switchison.org domain |
| PDF upload fails | Check Supabase Storage quotas and permissions |
| Database errors | Verify environment variables, check Supabase dashboard |
| Slow loading | Enable CDN, check hosting resources |

**Technical Support:**
- Supabase: https://supabase.com/support
- Hosting provider support channels

### Updating BidSmart

To update the application:

1. Make code changes
2. Test locally: `npm run dev`
3. Build: `npm run build`
4. Deploy updated `dist/` folder
5. Verify in production

### Monitoring

**What to Monitor:**
- Supabase database usage (quotas)
- Storage usage (PDF files)
- Error logs
- User feedback

**Recommended Tools:**
- Supabase Dashboard (built-in)
- Google Analytics or Plausible (optional)
- Sentry for error tracking (optional)

---

## File Structure Reference

```
bidsmart-standalone/
├── src/
│   ├── components/          # React components
│   │   ├── phases/         # Main phase components
│   │   └── ...            # Shared components
│   ├── lib/
│   │   ├── database/       # Supabase operations
│   │   ├── services/       # Business logic
│   │   └── types/          # TypeScript types
│   └── context/            # React context providers
├── supabase/
│   ├── migrations/         # Database schema
│   └── functions/          # Edge functions
├── docs/
│   ├── CLIENT_EMBEDDING_GUIDE.md       # ⭐ Embedding instructions
│   ├── DEPLOYMENT_CHECKLIST.md         # ⭐ Deployment guide
│   ├── MINDPAL_INTEGRATION.md          # MindPal setup
│   ├── EMBED_SECURITY.md               # Security details
│   ├── production-embed-example.html   # ⭐ Ready-to-use embed
│   └── test-embed.html                 # Local testing
├── public/
│   └── _headers            # Production security headers
└── dist/                   # Built application (after npm run build)
```

**⭐ = Start here**

---

## Technology Stack

BidSmart is built with modern, reliable technologies:

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Storage + Auth)
- **Hosting**: Static hosting (Netlify, Vercel, or custom)
- **Edge Functions**: Supabase Edge Functions (Deno)
- **AI Integration**: MindPal (optional)

---

## Project Highlights

### Key Features Implemented

✅ **4-Phase User Flow**
1. Gather - Collect homeowner requirements
2. Compare - Side-by-side bid comparison
3. Verify - Quality & installer checklist
4. Decide - Decision support & recommendations

✅ **Smart Data Management**
- Persistent storage across sessions
- Anonymous user support
- Secure file uploads
- Data export capabilities

✅ **Professional UI/UX**
- Clean, modern design
- Mobile-responsive layout
- Intuitive navigation
- Loading states & error handling

✅ **Production-Ready**
- Type-safe codebase
- Comprehensive error handling
- Security headers configured
- Build optimization

---

## Next Steps

1. ✅ **Read DEPLOYMENT_CHECKLIST.md**
   - Follow step-by-step deployment guide
   - Complete all checklist items

2. ✅ **Deploy to Production**
   - Choose hosting platform
   - Configure environment
   - Deploy application

3. ✅ **Test Thoroughly**
   - Verify all features work
   - Test on multiple devices
   - Check security headers

4. ✅ **Embed on SwitchIsOn.org**
   - Use production-embed-example.html
   - Test embedding
   - Launch!

5. ⚙️ **Optional: Configure MindPal**
   - Follow MINDPAL_INTEGRATION.md
   - Deploy edge functions
   - Test extraction

---

## Questions?

If you have questions about:

- **Deployment**: See `DEPLOYMENT_CHECKLIST.md`
- **Embedding**: See `CLIENT_EMBEDDING_GUIDE.md`
- **Security**: See `EMBED_SECURITY.md`
- **MindPal**: See `MINDPAL_INTEGRATION.md`
- **Code**: Check inline comments and TypeScript types

---

## License & Ownership

This application was developed for TheSwitchIsOn.org. All rights to the code, design, and documentation are transferred to the client upon delivery.

---

## Thank You!

BidSmart is ready for production deployment. We've built a robust, secure, and user-friendly application that will help homeowners make informed decisions about their heat pump installations.

Good luck with your launch! 🚀
