# BidSmart Embedding Guide for SwitchIsOn.org

## The Code

Copy and paste this into any page on your website:

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

**Replace `YOUR-BIDSMART-URL.com` with the production URL we provide.**

---

## That's It

The tool is fully responsive and works on desktop and mobile. Your domain (switchison.org and all subdomains) is already authorized.

---

## Optional: Adjust Height

If you need more or less height, change the `height="800"` value:
- Smaller screens: `height="600"`
- Larger displays: `height="900"` or `height="1000"`

---

## Questions

**The iframe is blank or blocked**
Make sure you're viewing the page on switchison.org (not a preview mode or different domain).

**Can I style the wrapper?**
Yes. The outer `<div>` is yours to customize. The content inside the iframe is managed separately.

**Updates?**
Automatic. You don't need to change anything.
