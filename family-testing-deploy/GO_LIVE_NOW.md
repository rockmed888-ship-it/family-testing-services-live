# Go Live in 5 Minutes — Pick One

## Option 1 — LIVE RIGHT NOW (preview link)

Your site is running at a temporary public URL. Ask your agent for the latest link, or run locally:

```bash
cd family-testing-deploy && npm install && npm start
```

---

## Option 2 — Render.com (FREE permanent URL, no GoDaddy upload)

1. Go to **https://render.com** → sign up free (GitHub login)
2. **New +** → **Web Service**
3. Connect repo **`dustin497/SecretLayer`**
4. Settings:
   - **Root Directory:** `family-testing-deploy`
   - **Build:** `npm install && npm run build`
   - **Start:** `npm start`
5. **Create Web Service** → wait ~3 min
6. You get: `https://family-testing-services.onrender.com`

### Connect family-testing.com (in GoDaddy DNS only)

1. Render → your service → **Settings** → **Custom Domains** → add `family-testing.com`
2. Render shows a **CNAME** target (e.g. `family-testing-services.onrender.com`)
3. GoDaddy → **family-testing.com** → **DNS** → add CNAME:
   - Name: `www` → Value: Render CNAME
   - For root `@`, use GoDaddy forwarding to `www` OR Render's A records they provide

---

## Option 3 — GoDaddy Node.js Hosting (upload zip)

1. Download **family-testing-deploy** from GitHub
2. Zip folder alone (no node_modules)
3. GoDaddy → Node.js Hosting → Upload → Publish → connect domain

---

## Staff admin (all options)

- `/admin/` · password: **fts2026**
