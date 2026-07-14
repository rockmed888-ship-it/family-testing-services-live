# Family Testing Services — Non-DOT Drug Testing Records

This release replaces the old nail-only / always-negative pages with one connected workflow for urine, hair, nail, and oral-fluid records.

## What works

- Staff sign-in uses an HTTP-only server session cookie; the password is no longer exposed in browser JavaScript.
- Every new record receives a permanent reference number, verification key, specimen ID, and internal record ID.
- The entry form captures donor, request, consent, specimen-specific collection, chain-of-custody transfer, laboratory, result source, analytes, confirmation, reviewer, and MRO fields.
- Result choices include pending, preliminary screen negative, presumptive positive, final negative, confirmed positive, invalid, cancelled, rejected, and refusal.
- A final positive cannot be saved without an appropriate laboratory/MRO source and confirmation details.
- Save-and-print first saves the record, then opens a two-page packet generated from the saved server copy.
- Public verification requires the key, donor last name, and date of birth and returns only a limited summary.
- Records are stored in an AES-256-GCM encrypted file and written atomically.

## Important scope

The included forms are **non-DOT administrative templates**. They do not replace a federal Custody and Control Form, Alcohol Testing Form, laboratory report, MRO report, employer policy, court order, or jurisdiction-specific release. Hair and nail are not presented as DOT specimen types. Have the purchasing company’s laboratory, MRO, privacy/security professional, insurer, and Alabama counsel review the final wording and operating procedure before live use.

Do not enter a final positive from an onsite device. Use **Presumptive Positive — Confirmation Pending** until the source report and required review are documented.

## Local setup

1. Copy `.env.example` to `.env` and replace every placeholder.
2. Set the variables in your shell or hosting dashboard. This app does not automatically load `.env` files.
3. Install and start:

```bash
npm ci
npm test
npm start
```

Open:

- Public website: `http://localhost:3000/`
- Staff login: `http://localhost:3000/admin/`
- Health check: `http://localhost:3000/health`

For local development only, if `ADMIN_PASSWORD` is omitted, the fallback is `local-only-change-me`. Production startup fails unless `ADMIN_PASSWORD`, `SESSION_SECRET`, and `DATA_ENCRYPTION_KEY` are explicitly set.

## Required production variables

- `ADMIN_PASSWORD`: long private staff password
- `SESSION_SECRET`: independent random secret, at least 32 characters recommended
- `DATA_ENCRYPTION_KEY`: independent random secret, at least 32 characters recommended
- `DATA_DIR`: persistent storage path, `/var/data` with the included Render blueprint
- `SESSION_HOURS`: staff session length, default 8

**Do not lose or casually rotate `DATA_ENCRYPTION_KEY`.** Existing records cannot be decrypted with a different key. Back up the encrypted data file and protect the key separately.

## Render deployment

The included `render.yaml` uses a paid Starter web service and a 1 GB persistent disk mounted at `/var/data`. The record file must be under a persistent mount; deploying this file-based datastore to an ephemeral/free filesystem will lose records after a restart or redeploy.

In Render, provide `ADMIN_PASSWORD`. Render generates `SESSION_SECRET` and `DATA_ENCRYPTION_KEY` from the blueprint. Save those values securely before making infrastructure changes.

## Data file

The encrypted store is:

- local: `./data/drug-test-records.enc`
- included Render setup: `/var/data/drug-test-records.enc`

The earlier `data/drug-screen-records.json` format is read once as a migration source when no encrypted store exists. After migration, securely archive or delete the unencrypted legacy file.

## Validation and test

`npm test` runs an end-to-end API workflow that logs in, reserves hair-test identifiers, saves a presumptive-positive hair record, confirms the encrypted file does not contain the donor name in plaintext, reloads it, verifies identity matching, records a print event, and rejects an unsupported final positive.
