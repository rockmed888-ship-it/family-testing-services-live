# SecretLayer Product Vision

**Domain:** [secretlayer.net](https://secretlayer.net)  
**Audience:** The common builder — indie devs, freelancers, and small teams who juggle secrets across many projects.

## Problem

Builders store API keys in notes apps, `.env` files, and chat threads. Enterprise vaults (HashiCorp Vault, 1Password Teams) are heavy. Lightweight tools rarely combine **project organization**, **encryption**, and **pre-ship safety**.

## SecretLayer model

```
Account
 └── Projects (e.g. "SaaS app", "Client ACME")
      └── Vaults (e.g. "Production", "Staging")
           └── Encrypted items (keys, tokens, connection strings)
```

- **Client-side encryption** before localStorage or cloud sync (zero-knowledge posture).
- **Safety scanner** runs leak patterns and security header checks.
- **Promotion gate** — marketing, deploy, and announcements only after safety nets pass.

## Industry calibration (next level)

| Capability | SecretLayer target | Industry reference |
|------------|-------------------|-------------------|
| Secret leak detection | Pre-commit + pre-promotion scans | GitGuardian, TruffleHog |
| Encryption | User-derived keys, no server plaintext | 1Password, Bitwarden |
| Project scoping | Vaults per project/env | Doppler, Infisical |
| Safety before ship | Score ≥ 80, zero critical blockers | SOC2 change gates |
| Promotion automation | Changelog + site + social after pass | LaunchDarkly + CI gates |

## Roadmap phases

### Phase 1 — Foundation (this repo)
- Monorepo: web, API, safety-engine, promotion
- Safety CLI against production + local sources
- Promotion gate wired to safety reports

### Phase 2 — Vault UX
- Import existing MVP data from production API
- Unlock flow, vault items CRUD, backup/export
- Stripe billing parity with live site

### Phase 3 — Builder growth
- CLI (`secretlayer init`) for local `.env` injection
- GitHub Action: block PRs with leaked secrets
- Public trust page: live safety score badge

### Phase 4 — Promotion system
- Netlify deploy hook after safety pass
- Automated changelog + social drafts
- Email waitlist integration

## Repository note

The GitHub repo was originally named `SecretLair-` (misspelled). This codebase is the canonical **SecretLayer** monorepo. Consider renaming the GitHub repository to `SecretLayer` or `secretlayer`.
