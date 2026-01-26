# Iframe Embedding Security (Phase 1)

## Implementation Complete

BidSmart now has basic security headers configured to allow embedding only on authorized domains.

## Security Configuration

### Allowed Domains
- `https://switchison.org` (main domain)
- `https://*.switchison.org` (all subdomains)
- `'self'` (same origin)

### Headers Applied

1. **Content-Security-Policy: frame-ancestors**
   - Modern standard for controlling iframe embedding
   - Supported by all modern browsers
   - Primary security mechanism

2. **X-Frame-Options**
   - Legacy fallback for older browsers
   - Set to `SAMEORIGIN` for production

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
          "value": "frame-ancestors 'self' https://switchison.org https://*.switchison.org"
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
Header always set Content-Security-Policy "frame-ancestors 'self' https://switchison.org https://*.switchison.org"
```

### Nginx
```nginx
add_header Content-Security-Policy "frame-ancestors 'self' https://switchison.org https://*.switchison.org" always;
```

## Security Notes

1. **Domain Restriction**: Only switchison.org domains can embed this application
2. **No Wildcards**: The CSP doesn't allow `*` - only specific domains
3. **HTTPS Required**: All allowed domains use HTTPS
4. **Self Allowed**: The app can embed itself (for testing/demos)

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
