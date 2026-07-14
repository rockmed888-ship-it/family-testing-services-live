# Render Deployment Note

Use Render Blueprint sync with the included `render.yaml`. This project should not be created as a free web service through a generic API script because its encrypted file datastore requires a paid persistent disk.

1. Push the release to the `render-deploy` branch.
2. Open Render → Blueprints → New Blueprint Instance.
3. Connect the repository and select `render-deploy`.
4. Sync the Blueprint.
5. Enter `ADMIN_PASSWORD` when prompted.
6. Confirm the 1 GB disk is mounted at `/var/data` and all three required secrets are present.
7. Run the complete save/reload/verify/print acceptance test before entering live records.

The API helper under `scripts/` now intentionally refuses direct creation and points back to the Blueprint so a deployment cannot silently omit persistent storage.
