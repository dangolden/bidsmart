# Iframe Embedding Security (Phase 1)

## Implementation Complete

BidSmart now has basic security headers configured to allow embedding only on authorized domains.

## Security Configuration

### Allowed Domains
The application is configured to work across multiple authorized environments:

**Client Domains:**
- `https://switchison.org` (main domain)
- `https://*.switchison.org` (all subdomains)

**HomeDoc Environments:**
- `https://homedoc.us` (main domain)
- `https://*.homedoc.us` (all subdomains)

**Development & Test Environments:**
- `https://bolt.new` (Bolt development platform)
- `https://*.bolt.new` (Bolt subdomains)
- `https://stackblitz.com` (alternative dev environment)
- `https://*.stackblitz.com` (StackBlitz subdomains)
- `'self'` (same origin)
- `http://localhost:*` (local development - dev server only)
- `https://localhost:*` (local development - dev server only)

### Headers Applied

1. **Content-Security-Policy: frame-ancestors**
   - Modern standard for controlling iframe embedding
   - Supported by all modern browsers
   - Primary security mechanism
   - Explicitly lists all authorized domains

2. **X-Frame-Options**
   - Legacy fallback for older browsers
   - Set to `ALLOWALL` to defer to CSP for domain control
   - CSP provides more granular control than X-Frame-Options

## How It Works

### Development (Local)
The Vite dev server applies headers via middleware (see `vite.config.ts`).

### Production (Deployed)
The `public/_headers` file is copied to the build output and used by hosting providers.

## Testing

### Test 1: Verify Headers Are Set
```bash
# Development
curl -I http://localhost:3000

# Production (replace with your URL)
curl -I https://your-bidsmart-url.com
```

Look for:
```
Content-Security-Policy: frame-ancestors 'self' https://switchison.org https://*.switchison.org
```

### Test 2: Test Embedding (Allowed)
Create a test HTML file on switchison.org:

```html
<!DOCTYPE html>
<html>
<head>
  <title>BidSmart Embed Test</title>
</head>
<body>
  <h1>Embedding Test - Should Work</h1>
  <iframe
    src="https://your-bidsmart-url.com"
    width="100%"
    height="800"
    frameborder="0">
  </iframe>
</body>
</html>
```

### Test 3: Test Embedding (Blocked)
Create a test HTML file on a different domain:

```html
<!DOCTYPE html>
<html>
<head>
  <title>BidSmart Embed Test - Should Fail</title>
</head>
<body>
  <h1>Embedding Test - Should Be Blocked</h1>
  <iframe
    src="https://your-bidsmart-url.com"
    width="100%"
    height="800"
    frameborder="0">
  </iframe>
  <script>
    // Check console for CSP violation error
  </script>
</body>
</html>
```

Expected: Browser console shows CSP violation error.

## Hosting-Specific Configuration

### Netlify
✅ Automatic - uses `_headers` file from build output

### Vercel
Create `vercel.json` in project root:
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
        }
      ]
    }
  ]
}
```

### AWS S3 + CloudFront
Add response headers in CloudFront distribution settings or Lambda@Edge.

### Apache (.htaccess)
```apache
Header always set Content-Security-Policy "frame-ancestors 'self' https://switchison.org https://*.switchison.org https://homedoc.us https://*.homedoc.us https://bolt.new https://*.bolt.new https://stackblitz.com https://*.stackblitz.com"
Header always set X-Frame-Options "ALLOWALL"
```

### Nginx
```nginx
add_header Content-Security-Policy "frame-ancestors 'self' https://switchison.org https://*.switchison.org https://homedoc.us https://*.homedoc.us https://bolt.new https://*.bolt.new https://stackblitz.com https://*.stackblitz.com" always;
add_header X-Frame-Options "ALLOWALL" always;
```

## Security Notes

1. **Multi-Domain Support**: Application works across client, HomeDoc, and test environments
2. **Explicit Whitelisting**: CSP explicitly lists all authorized domains (no open wildcards)
3. **HTTPS Required**: All production domains use HTTPS (localhost allows HTTP for dev)
4. **Self Allowed**: The app can embed itself (for testing/demos)
5. **Flexible Deployment**: Works on switchison.org subpages, HomeDoc environments, and test platforms
6. **Permanent Test Access**: Bolt.new and other test environments remain authorized for ongoing development

## Troubleshooting

### Issue: Headers not appearing in production
- Check hosting provider's header configuration
- Verify `_headers` file is in build output (`dist/` folder)
- Some hosts require manual header configuration

### Issue: Still blocked on allowed domain
- Clear browser cache
- Check browser console for specific CSP error
- Verify domain matches exactly (including www vs non-www)
- Ensure HTTPS is used

### Issue: Working locally but not in production
- Development and production use different header mechanisms
- Verify hosting provider configuration
- Check that `_headers` file is being deployed

## Next Steps

Phase 1 is complete. Ready for:
- **Phase 2**: Embed mode detection and styling
- **Phase 3**: PostMessage API for parent-child communication
- **Phase 4**: Complete embedding documentation
