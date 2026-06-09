const express = require("express");
const path = require("path");

const app = express();
const port = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, "public");

// Admin password from environment (default preserves existing behavior)
app.get("/admin/js/auth-config.js", (_req, res) => {
  res.type("application/javascript");
  const adminPassword = process.env.ADMIN_PASSWORD || "fts2026";
  res.send(`window.__FTS_ADMIN_PASSWORD__=${JSON.stringify(adminPassword)};`);
});

app.use(express.static(publicDir));

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Family Testing Services running on port ${port}`);
});
