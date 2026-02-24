# BidSmart Deployment Checklist

This checklist ensures a smooth deployment and integration of BidSmart into TheSwitchIsOn.org.

## Pre-Deployment

### 1. Environment Setup

- [ ] **Production Supabase Project Ready**
  - Project URL configured in `.env`
  - Anon key configured in `.env`
  - Database migrations applied
  - Row Level Security (RLS) policies verified
  - Storage bucket created (`bids` bucket)

- [ ] **Environment Variables Configured**
  ```
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```

- [ ] **MindPal Integration (if using)**
  - MindPal API key obtained
  - Webhook endpoints configured
  - Test extraction completed successfully
  - Callback URL registered with MindPal

### 2. Build & Test

- [ ] **Local Build Success**
  ```bash
  npm run build
  ```
  Verify no errors or warnings

- [ ] **Type Check Passes**
  ```bash
  npm run typecheck
  ```

- [ ] **Production Build Testing**
  ```bash
  npm run preview
  ```
  Test all major features:
  - [ ] Project creation
  - [ ] PDF upload
  - [ ] Bid comparison
  - [ ] Navigation between phases
  - [ ] Mobile responsiveness

---

## Deployment

### 3. Choose Hosting Platform

Select and configure ONE of the following:

#### Option A: Netlify (Recommended)
- [ ] Create Netlify account
- [ ] Connect GitHub repository
- [ ] Configure build settings:
  - Build command: `npm run build`
  - Publish directory: `dist`
- [ ] Add environment variables in Netlify dashboard
- [ ] Deploy and verify

#### Option B: Vercel
- [ ] Create Vercel account
- [ ] Import project from GitHub
- [ ] Add environment variables
- [ ] Deploy and verify

#### Option C: Custom Server
- [ ] Server with Node.js 18+ installed
- [ ] SSL certificate configured
- [ ] Build and upload `dist/` folder
- [ ] Configure web server (Nginx/Apache) to serve static files
- [ ] Verify `_headers` file is being served

### 4. Post-Deployment Verification

- [ ] **Application Loads**
  - Visit production URL
  - No console errors
  - UI renders correctly

- [ ] **Database Connection**
  - Create a test project
  - Verify data is saved to Supabase
  - Check Supabase dashboard for new records

- [ ] **File Upload Works**
  - Upload a test PDF
  - Verify file appears in Supabase Storage
  - Check file permissions (should be private)

- [ ] **Security Headers Active**
  ```bash
  curl -I https://your-bidsmart-url.com
  ```
  Verify headers:
  - `Content-Security-Policy: frame-ancestors 'self' https://switchison.org https://*.switchison.org`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`

- [ ] **Mobile Experience**
  - Test on actual mobile device
  - Verify responsive layout
  - Test touch interactions

---

## Integration with TheSwitchIsOn.org

### 5. Embedding Setup

- [ ] **Get Production URL**
  - Note your BidSmart production URL
  - Verify HTTPS is enabled
  - Test direct access

- [ ] **Update Documentation**
  - Replace `YOUR-BIDSMART-URL.com` in all docs with actual URL
  - Update `docs/production-embed-example.html`
  - Update `docs/CLIENT_EMBEDDING_GUIDE.md`

- [ ] **Create Integration Page**
  - Choose where BidSmart will be embedded on switchison.org
  - Options:
    - Dedicated page: `/tools/bidsmart`
    - Resource section: `/resources/compare-bids`
    - Help section: `/help/bid-comparison`

- [ ] **Add Iframe Code**
  - Use code from `production-embed-example.html`
  - Replace URL with production BidSmart URL
  - Adjust styling to match your site

- [ ] **Test Embedding**
  - Verify iframe loads on switchison.org
  - Check browser console for errors
  - Confirm no CSP violations
  - Test on multiple browsers:
    - [ ] Chrome
    - [ ] Firefox
    - [ ] Safari
    - [ ] Edge
    - [ ] Mobile browsers

### 6. Security Testing

- [ ] **CSP Protection Works**
  - Create test page on different domain
  - Attempt to embed BidSmart
  - Verify it's blocked by CSP
  - Check browser console shows violation

- [ ] **Data Isolation**
  - Create test user A with project
  - Create test user B with project
  - Verify User B cannot see User A's data

- [ ] **Authentication Flow**
  - Test anonymous user creation
  - Verify session persistence
  - Test cross-device session (should be isolated)

---

## MindPal Integration (Optional)

### 7. PDF Extraction Webhook

- [ ] **Edge Function Deployed**
  - `send-to-mindpal` function deployed
  - `mindpal-callback` function deployed
  - Environment variables configured

- [ ] **Webhook Security**
  - HMAC signatures verified
  - Test malformed requests (should be rejected)
  - Test unauthorized requests (should be rejected)

- [ ] **End-to-End Test**
  - Upload test PDF in BidSmart
  - Verify webhook sent to MindPal
  - Confirm extraction completes
  - Check callback received
  - Verify bid data imported correctly

- [ ] **Error Handling**
  - Test with corrupted PDF
  - Test with non-bid document
  - Verify user sees appropriate error messages

---

## Monitoring & Maintenance

### 8. Setup Monitoring

- [ ] **Supabase Dashboard**
  - Monitor database usage
  - Set up alerts for quota limits
  - Check storage usage

- [ ] **Error Tracking (Optional)**
  - Set up Sentry or similar
  - Configure error reporting
  - Test error capture

- [ ] **Analytics (Optional)**
  - Add Google Analytics or Plausible
  - Track:
    - Page views
    - Projects created
    - PDFs uploaded
    - Comparison views

### 9. Documentation

- [ ] **Internal Documentation**
  - Document deployment process
  - List all environment variables
  - Note admin access credentials
  - Document backup procedures

- [ ] **User Documentation**
  - Help page: How to use BidSmart
  - FAQ section
  - Troubleshooting guide
  - Contact information for support

---

## Go-Live

### 10. Pre-Launch

- [ ] **Final Testing**
  - Complete user journey test
  - Test all features end-to-end
  - Verify mobile experience
  - Check all links work

- [ ] **Performance Check**
  - Test page load speed
  - Verify images optimized
  - Check API response times
  - Test with slow network (throttling)

- [ ] **Backup Plan**
  - Document rollback procedure
  - Have previous version ready
  - Know how to revert DNS/deployment

### 11. Launch

- [ ] **Soft Launch**
  - Share with internal team first
  - Get feedback
  - Fix any critical issues

- [ ] **Public Launch**
  - Update switchison.org navigation
  - Add BidSmart to resources page
  - Announce to users
  - Monitor for issues

- [ ] **Post-Launch Monitoring**
  - Watch error logs for 24 hours
  - Monitor Supabase usage
  - Check user feedback
  - Be ready to respond to issues

---

## Maintenance

### 12. Ongoing

- [ ] **Weekly**
  - Check error logs
  - Review Supabase usage
  - Monitor storage consumption

- [ ] **Monthly**
  - Review user feedback
  - Check for needed updates
  - Verify backups are working
  - Update dependencies if needed

- [ ] **Quarterly**
  - Security audit
  - Performance review
  - Feature planning based on usage
  - Cost optimization review

---

## Emergency Contacts

**Technical Issues:**
- Supabase Support: [support@supabase.io](mailto:support@supabase.io)
- Hosting Support: [Your hosting provider support]

**Critical Procedures:**
1. **Site Down**: Check hosting status page, verify DNS, check build logs
2. **Database Issues**: Check Supabase dashboard, verify connection strings
3. **Upload Failures**: Check Supabase Storage quotas and permissions

---

## Sign-Off

- [ ] **Development Team Lead**: _________________ Date: _______
- [ ] **QA/Testing**: _________________ Date: _______
- [ ] **Project Manager**: _________________ Date: _______
- [ ] **Client Approval**: _________________ Date: _______

---

## Notes

Use this section for deployment-specific notes, custom configurations, or lessons learned:

```
[Your notes here]
```

---

## Quick Reference

### Production URLs
- BidSmart Application: `https://___________________________`
- Supabase Project: `https://___________________________`
- Embedded Page: `https://switchison.org/___________________________`

### Important Credentials
- Stored in: [Password manager / secure location]
- Access: [Who has access]

### Support Contacts
- Technical Lead: [Name] - [Email]
- Project Manager: [Name] - [Email]
- Emergency: [Phone]
