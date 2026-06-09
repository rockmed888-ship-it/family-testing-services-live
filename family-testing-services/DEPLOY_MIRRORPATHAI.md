# Deploy Family Testing Services on mirrorpathai.com

## Recommended: Netlify (you already host mirrorpathai.com there)

### Option A — Subdomain `family.mirrorpathai.com` (keeps Mirror Path AI on root)

1. [Netlify](https://app.netlify.com) → **Add new site** → **Import from Git**
2. Repo: `dustin497/SecretLayer` · Branch: `main`
3. **Publish directory:** `family-testing-services`
4. Deploy → **Domain settings** → **Add domain** → `family.mirrorpathai.com`
5. Netlify adds the DNS record automatically (same account as mirrorpathai.com).

### Option B — Root domain `mirrorpathai.com` (replaces Mirror Path AI)

1. Open your existing **mirrorpathai.com** site in Netlify
2. **Site configuration** → Link to `dustin497/SecretLayer` repo
3. **Publish directory:** `family-testing-services`
4. Redeploy

---

## Alternative: GitHub Pages

1. GitHub → `dustin497/SecretLayer` → **Settings → Pages**
2. **Build and deployment → Source:** GitHub Actions
3. Netlify DNS → add CNAME: `family` → `dustin497.github.io`
4. Re-run **Deploy Family Testing Services** workflow

Live URL: **https://family.mirrorpathai.com**
