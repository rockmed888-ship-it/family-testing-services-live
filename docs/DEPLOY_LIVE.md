# Go live — secretlayer.net + WWH2 (no Netlify payment required)

The app ships as **one Railway service**: React web + Express API together. Skip Netlify if it asks you to pay.

## 1. Railway deploy (web + API)

1. [Railway](https://railway.app) → your SecretLayer service → **Settings → Source**
2. Repo: `dustin497/SecretLayer`, branch **`main`**
3. Railway reads `railway.toml` — builds web + API in one deploy
4. **Add Postgres** plugin → sets `DATABASE_URL`
5. **Variables:**

   ```
   WEB_ORIGIN=https://secretlayer.net
   JWT_SECRET=<strong-random-secret>
   NODE_ENV=production
   ```

6. **Custom domains** (same service):
   - `api.secretlayer.net` (if not already)
   - `secretlayer.net`
   - `www.secretlayer.net` (optional)

7. **Deploy** → open https://secretlayer.net

The API serves `/api/*` and the static WWH2 site from the same host — no Netlify proxy needed.

## 2. Point DNS away from Netlify (free)

At your domain registrar / Cloudflare DNS:

| Record | Point to |
|--------|----------|
| `secretlayer.net` | Railway custom domain target (shown in Railway dashboard) |
| `www` | Railway or CNAME to `secretlayer.net` |

Remove old Netlify DNS records. You can cancel or pause the Netlify site — no payment required.

## 3. Verify WWH2 is live

1. https://secretlayer.net → title **SecretLayer — WWH2 Guided Help**
2. Reviews section → **Try WWH2** button + **Rate WWH2**
3. `curl https://api.secretlayer.net/health` → `"wwh2Store":"postgres"` (after Postgres added)
4. `curl https://secretlayer.net/api/wwh2/stats` → stats JSON

## Optional: Netlify (if you stay on free tier)

Only if Netlify builds succeed without upgrading:

- `netlify.toml` in repo root
- Publish: `apps/web/dist`
- Still need Railway for API + Postgres

## Optional: GitHub Actions Netlify CLI

Add secrets `NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID` for the **Deploy** workflow.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Old “SecretLayer MVP” page | DNS still on Netlify — switch to Railway domain |
| `/api/*` 404 | Use Railway unified deploy (latest `main`), not static-only host |
| Ratings don’t persist | Add Postgres + `DATABASE_URL` on Railway |
| Build fails on Railway | Check deploy logs; `pnpm.onlyBuiltDependencies` includes esbuild |
