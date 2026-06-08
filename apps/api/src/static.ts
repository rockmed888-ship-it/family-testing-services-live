import fs from "fs";
import path from "path";
import type { Express } from "express";
import express from "express";

const API_PREFIXES = [
  "/health",
  "/wwh2",
  "/safety",
  "/promotion",
  "/leads",
  "/auth",
  "/projects",
  "/billing",
  "/vault-items",
  "/webhooks",
];

function resolveWebDist(): string | null {
  const candidates = [
    path.join(process.cwd(), "apps/web/dist"),
    path.join(process.cwd(), "../web/dist"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  }
  return null;
}

function isApiPath(urlPath: string): boolean {
  const normalized = urlPath.startsWith("/api/") ? urlPath.slice(4) : urlPath;
  return API_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

export function mountWebApp(app: Express): boolean {
  if (process.env.SERVE_STATIC === "false") return false;

  const webDist = resolveWebDist();
  if (!webDist) {
    console.warn("WWH2 web dist not found — API-only mode");
    return false;
  }

  app.use(express.static(webDist, { index: false }));

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (isApiPath(req.path)) return next();
    if (path.extname(req.path)) return next();
    res.sendFile(path.join(webDist, "index.html"));
  });

  console.log(`Serving SecretLayer web app from ${webDist}`);
  return true;
}
