# SecretLayer

**[secretlayer.net](https://secretlayer.net)** — vault-first secrets for builders. Organize projects into encrypted vaults, run industry-calibrated safety nets, and promote only after checks pass.

> The GitHub repo was previously misspelled as `SecretLair-`. This monorepo is the canonical SecretLayer codebase.

## Stack

| Package | Purpose |
|---------|---------|
| `apps/web` | React + Vite frontend |
| `apps/api` | Express API (auth, projects, vault-items) |
| `packages/safety-engine` | Pre-ship safety scans |
| `packages/promotion` | Promotion gate (runs after safety passes) |
| `packages/shared` | Shared types |

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm dev          # web :5173 + api :8787
```

## Commands

```bash
pnpm build        # build all packages
pnpm test         # run tests
pnpm safety:run   # scan secretlayer.net (+ optional source dir)
pnpm promote:check # safety → promotion plan
```

## Live product

Production today runs on **Netlify** (web) and **Railway** (`api.secretlayer.net`). This repo rebuilds and extends that MVP with:

- Safety engine + promotion gate in CI
- Clear vault → project data model
- Path to CLI, GitHub Actions, and automated marketing

See [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md) and [docs/SAFETY_NETS.md](docs/SAFETY_NETS.md).

## WWH2 guided help

Free on-page guided tours for secretlayer.net — spotlight highlights, 7 playbooks, post-guide star ratings.

- Web: floating launcher + **Powered by WWH2** footer badge
- API: `POST /wwh2/feedback`, `GET /wwh2/stats`
- Production store: **Postgres** via `DATABASE_URL` (Railway); local dev falls back to `data/wwh2-feedback.json`

## Deploy

| Surface | Host | Config |
|---------|------|--------|
| Web | [secretlayer.net](https://secretlayer.net) (Netlify) | `netlify.toml` |
| API | api.secretlayer.net (Railway) | `railway.toml` |

Push to `main` runs tests in CI. If `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` are set as GitHub secrets, the deploy workflow publishes the web app. Railway redeploys the API when connected to this repo.

**Railway production env (API):**

- `DATABASE_URL` — Postgres plugin connection string
- `WEB_ORIGIN=https://secretlayer.net`
- `JWT_SECRET` — strong random secret
- `NODE_ENV=production`

## Environment

Copy `.env.example` to `.env`. Key variables:

- `JWT_SECRET` — API auth (required in production)
- `DATABASE_URL` — Postgres for WWH2 feedback + future persistence (production)
- `PROMOTION_WEBHOOK_URL` — optional webhook when promotion gate passes
