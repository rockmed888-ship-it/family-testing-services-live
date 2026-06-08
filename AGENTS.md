# AGENTS.md

Guidance for Cursor Cloud agents working on **SecretLayer** ([secretlayer.net](https://secretlayer.net)).

## Cursor Cloud specific instructions

### Services

| Service | Port | Command | Required |
|---------|------|---------|----------|
| API | 8787 | `pnpm dev:api` | Yes (for full stack) |
| Web | 5173 | `pnpm dev:web` | Yes (for UI) |

Run both: `pnpm dev` (parallel).

### Dependencies

VM update script: `pnpm install`

### Lint / test / build

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

### Safety & promotion

```bash
pnpm safety:run https://secretlayer.net .
pnpm promote:check https://secretlayer.net 0.2.0
```

Promotion is blocked unless safety score ≥ 80 with zero critical findings.

### Non-obvious notes

- Web proxies `/api/*` → `localhost:8787` via Vite config.
- API uses in-memory stores in dev; production uses Railway + persistent DB (not yet in repo).
- Live production frontend bundle is separate from this repo until migrated.
- Repo was misspelled `SecretLair-` on GitHub; product name is **SecretLayer**.
