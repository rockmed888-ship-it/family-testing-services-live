# Go-Live Checklist

Use the included `render.yaml` Blueprint or another Node.js host with persistent storage. Do **not** deploy this record system to a free/ephemeral filesystem and enter real records.

## Render

1. Push this folder to the configured `render-deploy` branch.
2. In Render, create/sync a Blueprint from `render.yaml`.
3. Enter a long private `ADMIN_PASSWORD` when prompted.
4. Confirm the service has the `family-testing-records` disk mounted at `/var/data`.
5. Deploy, then test `/health`, `/admin/`, saving, reloading, public verification, and printing.
6. Download/retain secure backups and protect the generated encryption key.

The included Blueprint uses a paid Starter service because Render persistent disks are not available on free web services.

## Before real client data

Have the company’s laboratory, MRO, privacy/security professional, insurer, and Alabama attorney approve the forms and procedure. Confirm the company’s legal name, credentials, licenses, retention schedule, release authorization, and breach-response plan. These are non-DOT templates and must not replace federal DOT forms.
