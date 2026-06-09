# Upload to GoDaddy — Use the Standalone Deploy Folder

**Do not upload the whole SecretLayer repo.**

Use the extracted standalone package:

## Option A — Download from GitHub

1. Open: **https://github.com/dustin497/SecretLayer/tree/main/family-testing-deploy**
2. **Code** → **Download ZIP**
3. Upload **`family-testing-deploy`** folder to GoDaddy Node.js Hosting

## Option B — Regenerate zip locally

```bash
./scripts/create-family-testing-deploy-zip.sh
```

Upload **`family-testing-deploy.zip`** (876 KB, no node_modules).

## GoDaddy steps

1. Node.js Hosting → **Upload**
2. Wait for `npm install` → `npm run build` → `npm start`
3. **Publish** → connect **family-testing.com**

## Must be in the upload

```
family-testing-deploy/
├── package.json
├── package-lock.json
├── server.js
└── public/
```

No `node_modules`. No parent monorepo files.
