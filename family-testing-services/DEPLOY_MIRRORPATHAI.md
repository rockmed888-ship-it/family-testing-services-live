# Deploy Family Testing Services on mirrorpathai.com

## Live URL (after DNS is set)

**https://family.mirrorpathai.com**

The root domain `mirrorpathai.com` keeps your Mirror Path AI app. The clinic site lives on the `family` subdomain.

## One-time DNS step (Netlify DNS for mirrorpathai.com)

1. Open [Netlify](https://app.netlify.com) → your **mirrorpathai.com** site → **Domain management** → **DNS**
2. Add record:

| Type  | Name   | Value                 |
|-------|--------|-----------------------|
| CNAME | family | dustin497.github.io   |

3. Wait 5–15 minutes for DNS to propagate.

## GitHub Pages

This repo deploys `family-testing-services/` automatically on push to `main` via the **Deploy Family Testing Services** workflow.

Enable once in GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Use the root domain instead (optional)

If you want the clinic on `mirrorpathai.com` instead of Mirror Path AI:

1. Change `family-testing-services/CNAME` to `mirrorpathai.com`
2. In Netlify DNS, point the apex domain to GitHub Pages (or deploy this folder as the main Netlify publish directory).
