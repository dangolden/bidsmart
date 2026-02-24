# BidSmart Embedding Guide for TheSwitchIsOn.org

## Quick Start

BidSmart is ready to be embedded on your website. This guide provides everything you need to integrate it seamlessly.

## Table of Contents

1. [Simple Embedding](#simple-embedding)
2. [Responsive Design](#responsive-design)
3. [Security & Privacy](#security--privacy)
4. [Advanced Integration](#advanced-integration)
5. [Troubleshooting](#troubleshooting)

---

## Simple Embedding

### Basic Iframe Code

Add this code to any page on your website where you want BidSmart to appear:

```html
<iframe
  src="https://YOUR-BIDSMART-URL.com"
  width="100%"
  height="800"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
  title="BidSmart Heat Pump Bid Analysis"
  loading="lazy">
</iframe>
```

**Replace `YOUR-BIDSMART-URL.com`** with your actual BidSmart deployment URL.

### Recommended Minimum Height

- **Desktop**: 800px
- **Mobile**: 600px (full viewport recommended)

---

## Responsive Design

### Full-Width Container

For the best experience, wrap the iframe in a responsive container:

```html
<div class="bidsmart-container">
  <iframe
    src="https://YOUR-BIDSMART-URL.com"
    title="BidSmart Heat Pump Bid Analysis"
    loading="lazy">
  </iframe>
</div>

<style>
  .bidsmart-container {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
  }

  .bidsmart-container iframe {
    width: 100%;
    min-height: 800px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  /* Mobile optimization */
  @media (max-width: 768px) {
    .bidsmart-container {
      padding: 10px;
    }

    .bidsmart-container iframe {
      min-height: 600px;
      border-radius: 4px;
    }
  }
</style>
```

### WordPress Integration

If you're using WordPress, add this to a custom HTML block:

1. Add a new page or post
2. Insert a "Custom HTML" block
3. Paste the iframe code above
4. Publish

### Full-Page Embed

For a dedicated BidSmart page without your site's header/footer, use this approach:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compare Heat Pump Bids - TheSwitchIsOn.org</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      height: 100%;
      overflow: hidden;
    }

    iframe {
      width: 100%;
      height: 100vh;
      border: none;
    }
  </style>
</head>
<body>
  <iframe
    src="https://YOUR-BIDSMART-URL.com"
    title="BidSmart Heat Pump Bid Analysis"
    allow="clipboard-read; clipboard-write">
  </iframe>
</body>
</html>
```

---

## Security & Privacy

### Built-In Security

BidSmart includes enterprise-grade security:

- **Content Security Policy (CSP)**: Only switchison.org domains can embed BidSmart
- **HTTPS Required**: All connections are encrypted
- **No Third-Party Tracking**: User data stays private
- **Secure Headers**: XSS protection, MIME sniffing prevention

### Data Privacy

- User data is stored securely in Supabase (SOC 2 compliant)
- Each user session is isolated
- No data is shared between projects
- Users can delete their data at any time

### Testing Security

To verify security is working:

1. Try embedding on switchison.org (should work)
2. Try embedding on another domain (should be blocked)
3. Check browser console for CSP violation messages

---

## Advanced Integration

### Pre-Populating Data (URL Parameters)

You can pre-fill user information using URL parameters:

```html
<iframe
  src="https://YOUR-BIDSMART-URL.com?zip=94102&state=CA&projectId=demo"
  width="100%"
  height="800">
</iframe>
```

**Available Parameters:**
- `zip` - Property ZIP code
- `state` - Property state (2-letter code)
- `projectId` - Pre-load a specific project (for demo purposes)

### Deep Linking to Specific Phases

Link directly to a specific phase:

```html
<!-- Link to Compare phase -->
<iframe src="https://YOUR-BIDSMART-URL.com?phase=compare"></iframe>

<!-- Link to Verify phase -->
<iframe src="https://YOUR-BIDSMART-URL.com?phase=verify"></iframe>
```

**Available Phases:**
- `gather` - Data collection
- `compare` - Bid comparison
- `verify` - Quality checklist
- `decide` - Decision support

### Custom Styling (Context-Aware)

BidSmart automatically detects when it's embedded and adjusts its UI:

- Removes extra padding for tighter integration
- Optimizes scrolling behavior
- Adjusts header spacing

No configuration required!

---

## Troubleshooting

### Problem: Iframe Not Displaying

**Possible Causes:**
1. CSP blocking (not on switchison.org domain)
2. HTTPS mixed content (your site is HTTPS but iframe src is HTTP)
3. Incorrect URL

**Solutions:**
- Ensure you're testing on switchison.org or a subdomain
- Use HTTPS for the iframe src URL
- Check browser console for error messages

### Problem: Iframe Too Small

**Solution:**
Increase the iframe height or use the responsive container approach above.

### Problem: Scrolling Issues

**Solution:**
Use this CSS on the container:

```css
.bidsmart-container {
  overflow: auto;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
}
```

### Problem: Slow Loading

**Solutions:**
1. Add `loading="lazy"` attribute to iframe (already included in examples)
2. Use a CDN for your BidSmart deployment
3. Ensure adequate server resources

### Problem: Mobile Experience

**Solution:**
Use the responsive CSS provided above. Consider a full-page mobile layout:

```css
@media (max-width: 768px) {
  .bidsmart-container iframe {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    border: none;
    border-radius: 0;
  }
}
```

---

## Example Implementation

### Complete Integration Example

Here's a complete example showing best practices:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compare Heat Pump Bids | TheSwitchIsOn.org</title>
  <meta name="description" content="Compare contractor bids for your heat pump installation. Get expert analysis and recommendations.">

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: #f9fafb;
    }

    .page-header {
      background: #10b981;
      color: white;
      padding: 20px;
      text-align: center;
    }

    .page-header h1 {
      margin: 0;
      font-size: 28px;
    }

    .page-header p {
      margin: 8px 0 0;
      opacity: 0.9;
    }

    .bidsmart-wrapper {
      max-width: 1400px;
      margin: 20px auto;
      padding: 0 20px;
    }

    .bidsmart-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .bidsmart-container iframe {
      width: 100%;
      min-height: 800px;
      border: none;
      display: block;
    }

    .loading {
      text-align: center;
      padding: 100px 20px;
      color: #6b7280;
    }

    .footer-note {
      max-width: 1400px;
      margin: 20px auto;
      padding: 20px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .page-header h1 {
        font-size: 22px;
      }

      .bidsmart-wrapper {
        padding: 0 10px;
      }

      .bidsmart-container {
        border-radius: 8px;
      }

      .bidsmart-container iframe {
        min-height: 600px;
      }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <h1>BidSmart: Heat Pump Bid Analysis</h1>
    <p>Compare contractor bids and make an informed decision</p>
  </div>

  <div class="bidsmart-wrapper">
    <div class="bidsmart-container">
      <div class="loading" id="loading">
        Loading BidSmart...
      </div>
      <iframe
        id="bidsmart-iframe"
        src="https://YOUR-BIDSMART-URL.com"
        title="BidSmart Heat Pump Bid Analysis Tool"
        loading="lazy"
        onload="document.getElementById('loading').style.display='none'"
        allow="clipboard-read; clipboard-write">
      </iframe>
    </div>
  </div>

  <div class="footer-note">
    <p>Need help? Visit our <a href="https://switchison.org/help">Help Center</a> or <a href="https://switchison.org/contact">Contact Us</a></p>
  </div>

  <script>
    // Handle iframe load errors
    document.getElementById('bidsmart-iframe').addEventListener('error', function() {
      document.getElementById('loading').innerHTML =
        '<p style="color: #ef4444;">Unable to load BidSmart. Please refresh the page or contact support.</p>';
    });
  </script>
</body>
</html>
```

---

## Performance Tips

1. **Use CDN**: Deploy BidSmart on a CDN for faster global loading
2. **Lazy Loading**: The `loading="lazy"` attribute defers iframe loading until needed
3. **Preconnect**: Add this to your page `<head>` for faster loading:

```html
<link rel="preconnect" href="https://YOUR-BIDSMART-URL.com">
```

4. **Optimize Container Size**: Don't make the iframe unnecessarily large
5. **Cache Headers**: Ensure your hosting provider has proper caching enabled

---

## Support

For technical support or questions about embedding:

- **Email**: [Your support email]
- **Documentation**: https://YOUR-BIDSMART-URL.com/docs
- **GitHub Issues**: [If applicable]

---

## Next Steps

1. Deploy BidSmart to production
2. Replace `YOUR-BIDSMART-URL.com` with actual URL
3. Test embedding on switchison.org
4. Verify mobile responsiveness
5. Set up monitoring and analytics
6. Launch!
