# Render Setup

The reliable path is Blueprint deployment from the included `render.yaml`.

## Blueprint configuration included

- Branch: `render-deploy`
- Build: `npm ci && npm run build`
- Start: `npm start`
- Health check: `/health`
- Plan: Starter
- Persistent disk: 1 GB mounted at `/var/data`
- `DATA_DIR=/var/data`
- Generated `SESSION_SECRET`
- Generated `DATA_ENCRYPTION_KEY`
- Private `ADMIN_PASSWORD` entered by the owner

After deployment, verify that the disk exists before entering real records. A Render service without the disk will lose this file-based datastore on restart/redeploy.

Never change `DATA_ENCRYPTION_KEY` without a planned data migration. A different key cannot decrypt previously saved records.
