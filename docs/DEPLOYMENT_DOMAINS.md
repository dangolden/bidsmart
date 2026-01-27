# BidSmart - Multi-Domain Deployment Strategy

**Date:** January 2026
**For:** HomeDoc Internal Team
**Purpose:** Document authorized domains and deployment flexibility

---

## Overview

BidSmart is configured to work securely across multiple environments while maintaining enterprise-grade security. The application uses Content Security Policy (CSP) to explicitly whitelist authorized embedding domains.

---

## Authorized Domains

### Client Production Domains

**SwitchIsOn.org (Primary Client)**
- `https://switchison.org` - Main site
- `https://*.switchison.org` - All subdomains (e.g., www.switchison.org, bidcompare.switchison.org)

**Usage:**
- Client can embed on any switchison.org page or subdomain
- Main production environment for end users
- Examples: `/bidcompare`, `/tools/bidsmart`, `/resources/heat-pump-bids`

### HomeDoc Environments

**HomeDoc.us (Internal/Support)**
- `https://homedoc.us` - Main HomeDoc domain
- `https://*.homedoc.us` - All HomeDoc subdomains

**Usage:**
- Internal testing environments
- Client demos and training
- Support and troubleshooting
- Alternative hosting if needed

### Development & Test Platforms

**Bolt.new (Primary Development)**
- `https://bolt.new` - Bolt development platform
- `https://*.bolt.new` - All Bolt project subdomains

**StackBlitz (Alternative Development)**
- `https://stackblitz.com` - StackBlitz platform
- `https://*.stackblitz.com` - All StackBlitz project URLs

**Local Development**
- `http://localhost:*` - Local dev server (any port)
- `https://localhost:*` - Local HTTPS dev server

**Usage:**
- Development and testing
- Feature development before production
- Client preview and approval
- Multiple concurrent versions/branches

---

## Security Implementation

### Content Security Policy (CSP)

The primary security mechanism is the `frame-ancestors` directive in CSP:

```
Content-Security-Policy: frame-ancestors 'self'
  https://switchison.org https://*.switchison.org
  https://homedoc.us https://*.homedoc.us
  https://bolt.new https://*.bolt.new
  https://stackblitz.com https://*.stackblitz.com
```

**What This Means:**
- ✅ BidSmart CAN be embedded in iframes on listed domains
- ❌ BidSmart CANNOT be embedded on any other domains
- ✅ Direct access (not in iframe) works from anywhere
- ✅ Multiple concurrent deployments supported

### X-Frame-Options

Set to `ALLOWALL` to defer to CSP for domain control:

```
X-Frame-Options: ALLOWALL
```

**Why ALLOWALL?**
- Modern CSP provides better control than X-Frame-Options
- X-Frame-Options only supports DENY, SAMEORIGIN, or ALLOW-FROM (deprecated)
- ALLOWALL lets CSP handle the security logic
- Maintains compatibility with older browsers

---

## Deployment Scenarios

### Scenario 1: Client Production (switchison.org)

**Deployment:**
- Netlify or Vercel hosting
- Custom domain: `bidsmart.switchison.org` OR embedded on main domain
- Environment: Production
- Database: Production Supabase instance

**Embedding:**
```html
<!-- On switchison.org/bidcompare -->
<iframe src="https://bidsmart.switchison.org" width="100%" height="800"></iframe>

<!-- OR on any switchison.org subdomain -->
<iframe src="https://bidsmart.switchison.org" width="100%" height="800"></iframe>
```

### Scenario 2: HomeDoc Testing (homedoc.us)

**Deployment:**
- Netlify preview/branch deploy
- Custom domain: `bidsmart-test.homedoc.us`
- Environment: Staging/Test
- Database: Test Supabase instance or shared production

**Embedding:**
```html
<!-- On homedoc.us for demos -->
<iframe src="https://bidsmart-test.homedoc.us" width="100%" height="800"></iframe>
```

### Scenario 3: Development (Bolt.new)

**Deployment:**
- Bolt.new hosted environment
- URL: `https://[project-id].bolt.new`
- Environment: Development
- Database: Development or shared Supabase instance

**Embedding:**
```html
<!-- Can embed in test pages on any authorized domain -->
<iframe src="https://[project-id].bolt.new" width="100%" height="800"></iframe>
```

### Scenario 4: Local Development

**Deployment:**
- Local Vite dev server
- URL: `http://localhost:3000` or `http://localhost:5173`
- Environment: Local development
- Database: Usually development Supabase instance

**Testing:**
- Direct access works without embedding
- Can test embedding by creating local HTML file on authorized domain
- CSP allows localhost for development convenience

---

## Multiple Concurrent Deployments

BidSmart supports running multiple deployments simultaneously:

### Use Cases

**1. Production + Staging**
- Production: `bidsmart.switchison.org` (stable)
- Staging: `bidsmart-staging.homedoc.us` (new features)

**2. Version Testing**
- v1.0: `bidsmart.switchison.org`
- v1.1-beta: `bidsmart-beta.homedoc.us`
- v2.0-dev: Bolt.new project

**3. Client-Specific Customizations**
- Client A: `bidsmart-clienta.homedoc.us`
- Client B: `bidsmart-clientb.homedoc.us`
- All share same codebase with different configs

### Benefits

- ✅ Test features without disrupting production
- ✅ Client approval before going live
- ✅ Rollback capability (keep old version running)
- ✅ A/B testing different configurations
- ✅ Development continues while production stable

---

## Domain Configuration Files

### 1. vite.config.ts (Development Server)

Controls headers during `npm run dev`:

```typescript
res.setHeader(
  'Content-Security-Policy',
  "frame-ancestors 'self' http://localhost:* https://localhost:* " +
  "https://switchison.org https://*.switchison.org " +
  "https://homedoc.us https://*.homedoc.us " +
  "https://bolt.new https://*.bolt.new " +
  "https://stackblitz.com https://*.stackblitz.com"
);
```

### 2. public/_headers (Netlify Production)

Controls headers after deployment:

```
/*
  Content-Security-Policy: frame-ancestors 'self' https://switchison.org https://*.switchison.org https://homedoc.us https://*.homedoc.us https://bolt.new https://*.bolt.new https://stackblitz.com https://*.stackblitz.com
  X-Frame-Options: ALLOWALL
```

### 3. netlify.toml (Netlify Configuration)

Deployment configuration with headers:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "frame-ancestors 'self' https://switchison.org https://*.switchison.org https://homedoc.us https://*.homedoc.us https://bolt.new https://*.bolt.new https://stackblitz.com https://*.stackblitz.com"
    X-Frame-Options = "ALLOWALL"
```

---

## Adding New Domains

### Process

If you need to add a new authorized domain:

1. **Update vite.config.ts**
   - Add domain to CSP string in development server config
   - Format: `https://newdomain.com https://*.newdomain.com`

2. **Update public/_headers**
   - Add domain to CSP line
   - Maintain same format as existing domains

3. **Update netlify.toml**
   - Add domain to CSP value in headers section
   - Keep consistent with other config files

4. **Test**
   - Run `npm run build`
   - Deploy to test environment
   - Verify embedding works on new domain
   - Test that unauthorized domains still blocked

5. **Document**
   - Add to this file under Authorized Domains
   - Update EMBED_SECURITY.md
   - Notify team of change

### Format

Always add both root domain and wildcard subdomain:
- `https://example.com` - Root domain
- `https://*.example.com` - All subdomains

---

## Testing Domain Security

### Positive Tests (Should Work)

Test embedding on each authorized domain:

```bash
# Test on switchison.org
curl -H "Referer: https://switchison.org" https://your-bidsmart-url.com

# Test on homedoc.us
curl -H "Referer: https://homedoc.us" https://your-bidsmart-url.com

# Test on bolt.new
curl -H "Referer: https://project.bolt.new" https://your-bidsmart-url.com
```

### Negative Tests (Should Block)

Test that unauthorized domains are blocked:

```html
<!-- Create test file on unauthorized domain -->
<!DOCTYPE html>
<html>
<head><title>Unauthorized Test</title></head>
<body>
  <h1>This Should Be Blocked</h1>
  <iframe src="https://your-bidsmart-url.com" width="100%" height="800"></iframe>
  <!-- Check browser console for CSP violation -->
</body>
</html>
```

Expected: Browser console shows CSP error like:
```
Refused to display 'https://your-bidsmart-url.com' in a frame because
it violates the following Content Security Policy directive:
"frame-ancestors 'self' https://switchison.org ..."
```

---

## Troubleshooting

### Issue: Embedding works on unauthorized domain

**Cause:** CSP headers not being sent correctly

**Fix:**
1. Check `curl -I https://your-url.com` for CSP header
2. Verify `_headers` file in build output (`dist/_headers`)
3. Check hosting platform header configuration
4. Clear CDN cache if using one

### Issue: Embedding blocked on authorized domain

**Cause:** Domain not in whitelist or typo

**Fix:**
1. Check exact domain matches (including www)
2. Verify HTTPS vs HTTP
3. Check browser console for exact CSP error
4. Confirm domain is in all three config files

### Issue: Works in dev, breaks in production

**Cause:** Different headers in dev vs production

**Fix:**
1. Compare vite.config.ts vs public/_headers
2. Ensure both have same domain list
3. Rebuild and redeploy: `npm run build`
4. Verify `dist/_headers` has correct content

---

## Security Considerations

### Why Multiple Domains?

**Flexibility:**
- Client can deploy on any switchison.org subdomain
- HomeDoc can host multiple test environments
- Development can happen on preferred platforms

**Security:**
- Still restricted to explicit whitelist
- Not open to public embedding
- Each domain explicitly authorized
- Easy to audit and maintain

### Risk Assessment

**Low Risk:**
- All authorized domains controlled by HomeDoc or client
- No public/unknown domains in whitelist
- CSP enforced by all modern browsers
- Easy to add/remove domains as needed

**Best Practices:**
- Review domain list quarterly
- Remove unused domains promptly
- Monitor for CSP violations in logs
- Test security after any changes

---

## Quick Reference

### Current Authorized Domains

| Domain Pattern | Purpose | Owner |
|---------------|---------|-------|
| switchison.org, *.switchison.org | Client production | SwitchIsOn.org |
| homedoc.us, *.homedoc.us | Internal testing/demos | HomeDoc |
| bolt.new, *.bolt.new | Development platform | Bolt/StackBlitz |
| stackblitz.com, *.stackblitz.com | Alternative dev platform | StackBlitz |
| localhost:* | Local development | Developers |

### Configuration Files

| File | Purpose | Controls |
|------|---------|----------|
| vite.config.ts | Dev server headers | Development (`npm run dev`) |
| public/_headers | Production headers | Netlify static hosting |
| netlify.toml | Deployment config | Build + hosting settings |

### Contact

For questions about domain configuration:
- **Security:** HomeDoc security team
- **Deployment:** HomeDoc DevOps team
- **Client requests:** Review with team lead first

---

**Last Updated:** January 2026
**Next Review:** Quarterly or when adding new domains
