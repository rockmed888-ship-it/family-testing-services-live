# Safety Nets

SecretLayer promotion and deploys require passing the safety engine.

## Checks

| ID | Severity if failed | What it validates |
|----|-------------------|-------------------|
| `secret-leak-scan` | critical | Known patterns (AWS, GitHub, Stripe, DB URLs, JWTs) |
| `transport-security` | critical/warn | HTTPS + HSTS |
| `csp-headers` | warn | CSP, X-Frame-Options, nosniff, referrer-policy |
| `auth-hardening` | critical | JWT secret not default |
| `rate-limiting` | warn | Auth endpoint rate limits |
| `encryption-at-rest` | critical | Client-side vault encryption |
| `audit-logging` | warn | Security event audit trail |

## Scoring

- Start at 100
- Critical failure: −25 each
- Warning: −8 each
- Info: −2 each
- **Pass threshold:** score ≥ 80 and zero critical blockers

## Usage

```bash
# Scan production site headers + optional local sources
pnpm safety:run https://secretlayer.net .

# Full promotion gate (dry run)
pnpm promote:check https://secretlayer.net 0.2.0

# Execute webhook on pass (set PROMOTION_WEBHOOK_URL)
PROMOTION_WEBHOOK_URL=https://hooks.example.com/promote pnpm promote:check --execute
```
