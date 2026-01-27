# BidSmart - Embedding Instructions for SwitchIsOn.org

## Quick Start (5 minutes)

BidSmart is ready to embed on your website. HomeDoc handles all hosting, maintenance, and technical operations. You just need to add an iframe.

---

## Step 1: Copy This Code

```html
<div style="max-width: 1400px; margin: 0 auto; padding: 20px;">
  <iframe
    src="https://YOUR-BIDSMART-URL.com"
    width="100%"
    height="800"
    style="border: 1px solid #e5e7eb; border-radius: 8px; display: block;"
    title="BidSmart Heat Pump Bid Comparison Tool"
    loading="lazy">
  </iframe>
</div>
```

**Note:** HomeDoc will provide the actual production URL to replace `YOUR-BIDSMART-URL.com`

---

## Step 2: Add to Your Website

**Option A: WordPress**
1. Create a new page: "Compare Heat Pump Bids"
2. Add a "Custom HTML" block
3. Paste the code above
4. Publish

**Option B: Custom CMS**
1. Create a new page at: `/tools/bidsmart` or `/resources/compare-bids`
2. Paste the iframe code
3. Publish

**Option C: Direct HTML**
- See `docs/production-embed-example.html` for a complete standalone page example

---

## Step 3: Test

1. Visit the page where you added the iframe
2. Verify BidSmart loads inside the iframe
3. Test on mobile devices
4. Done!

---

## What You're Getting

- **Hosting**: HomeDoc manages all hosting and infrastructure
- **Maintenance**: HomeDoc handles updates, bug fixes, and monitoring
- **Support**: HomeDoc provides technical support for the application
- **Your Role**: Embed the iframe and report any issues you notice

---

## Security

The iframe is configured to work securely on authorized domains including:
- **switchison.org** and all subdomains (*.switchison.org)
- HomeDoc development and support environments (for testing and assistance)

The application is protected with enterprise-grade security headers while remaining flexible for your implementation needs. You can embed it on any page within your switchison.org domain structure.

---

## Mobile Optimization

The iframe is fully responsive and works on all devices. For the best mobile experience, the iframe automatically adjusts its layout.

---

## Need Help?

**Contact HomeDoc Team:**
- Email: [To be provided]
- For urgent issues: [To be provided]

**Common Questions:**

**Q: The iframe isn't showing up**
A: Check that you're testing on a switchison.org domain (not localhost or another domain). Contact HomeDoc if issues persist.

**Q: Can I customize the appearance?**
A: The iframe wrapper (the code above) can be styled. The content inside the iframe is managed by HomeDoc.

**Q: How do I update the tool?**
A: You don't! HomeDoc handles all updates automatically.

---

## That's It!

You're done. HomeDoc handles everything else.
