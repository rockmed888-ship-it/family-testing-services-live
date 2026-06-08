import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { runPromotionGate } from "@secretlayer/promotion";
import { fetchHeaders, runSafetySuite } from "@secretlayer/safety-engine";
import {
  FREE_PLAN_LIMITS,
  type WaitlistLead,
  type Wwh2Feedback,
  type Wwh2Stats,
} from "@secretlayer/shared";
import { Wwh2FeedbackStore } from "./wwh2-store.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const appVersion = process.env.APP_VERSION ?? "0.2.0";

app.use(
  cors({
    origin: webOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "256kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const users = new Map<string, { id: string; email: string; password: string }>();
const sessions = new Map<string, string>();
const projects = new Map<string, { id: string; userId: string; name: string }>();
const waitlistLeads = new Map<string, WaitlistLead>();
const wwh2Store = new Wwh2FeedbackStore();

function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const userId = req.headers["x-user-id"] as string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const uid = sessions.get(token);
    if (!uid) return res.status(401).json({ error: "Authentication required." });
    (req as express.Request & { userId: string }).userId = uid;
    return next();
  }

  if (userId) {
    (req as express.Request & { userId: string }).userId = userId;
    return next();
  }

  return res.status(401).json({ error: "Authentication required." });
}

async function buildSafetyReport(target = "https://secretlayer.net") {
  const headers = await fetchHeaders(target).catch(() => ({}));
  return runSafetySuite({
    targetUrl: target,
    responseHeaders: headers,
    config: {
      jwtSecretSet: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET !== "change-me-in-production"),
      encryptionEnabled: true,
      rateLimitEnabled: true,
      auditLogEnabled: waitlistLeads.size > 0,
    },
  });
}

function computeWwh2Stats(): Wwh2Stats {
  const entries = wwh2Store.getAll();
  const totalSessions = entries.length;
  const averageRating =
    totalSessions === 0 ? 0 : entries.reduce((sum, e) => sum + e.rating, 0) / totalSessions;
  const helpfulCount = entries.filter((e) => e.helpful).length;
  const helpfulPercent = totalSessions === 0 ? 0 : Math.round((helpfulCount / totalSessions) * 100);
  const playbookCounts: Record<string, number> = {};
  for (const entry of entries) {
    playbookCounts[entry.playbookId] = (playbookCounts[entry.playbookId] ?? 0) + 1;
  }
  return { totalSessions, averageRating, helpfulPercent, playbookCounts };
}

const DEFAULT_HIGHLIGHTS = [
  "Industry-calibrated safety nets before every promotion",
  "Vault-first projects for the common builder",
  "Channel-ready promotion leads after safety clears",
  "WWH2 guided help — free for all users",
];

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "secretlayer-backend",
    version: appVersion,
    waitlistCount: waitlistLeads.size,
    wwh2Sessions: wwh2Store.size,
  });
});

app.get("/wwh2/stats", publicLimiter, (_req, res) => {
  res.json({ stats: computeWwh2Stats() });
});

app.post("/wwh2/feedback", publicLimiter, async (req, res) => {
  const { playbookId, playbookTitle, rating, helpful, comment, completedSteps, totalSteps } = req.body ?? {};

  if (!playbookId || typeof playbookId !== "string") {
    return res.status(400).json({ error: "playbookId required." });
  }
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be 1–5." });
  }
  if (typeof helpful !== "boolean") {
    return res.status(400).json({ error: "helpful must be true or false." });
  }

  const entry: Wwh2Feedback = {
    id: crypto.randomUUID(),
    playbookId,
    playbookTitle: typeof playbookTitle === "string" ? playbookTitle : playbookId,
    rating,
    helpful,
    comment: typeof comment === "string" && comment.trim() ? comment.trim().slice(0, 2000) : undefined,
    completedSteps: typeof completedSteps === "number" ? completedSteps : 0,
    totalSteps: typeof totalSteps === "number" ? totalSteps : 0,
    createdAt: new Date().toISOString(),
  };

  try {
    await wwh2Store.add(entry);
    res.status(201).json({
      feedback: entry,
      stats: computeWwh2Stats(),
      message: "Thanks — your WWH2 rating helps other developers find guided help faster.",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to save feedback.", detail: String(err) });
  }
});

app.get("/safety/report", publicLimiter, async (req, res) => {
  const target = (req.query.target as string) ?? "https://secretlayer.net";
  try {
    const report = await buildSafetyReport(target);
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: "Safety scan failed.", detail: String(err) });
  }
});

app.post("/promotion/check", publicLimiter, async (req, res) => {
  const target = req.body?.target ?? "https://secretlayer.net";
  const version = req.body?.version ?? appVersion;
  const highlights = req.body?.highlights ?? DEFAULT_HIGHLIGHTS;

  try {
    const safetyReport = await buildSafetyReport(target);
    const result = await runPromotionGate(
      { version, highlights, safetyReport },
      { dryRun: true, webhookUrl: process.env.PROMOTION_WEBHOOK_URL },
    );
    res.json({ result, safetyReport });
  } catch (err) {
    res.status(500).json({ error: "Promotion check failed.", detail: String(err) });
  }
});

app.post("/leads/waitlist", publicLimiter, (req, res) => {
  const { email, source } = req.body ?? {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email required." });
  }

  const normalized = email.trim().toLowerCase();
  const existing = [...waitlistLeads.values()].find((l) => l.email === normalized);
  if (existing) {
    return res.json({ lead: existing, message: "Already on the waitlist." });
  }

  const lead: WaitlistLead = {
    id: crypto.randomUUID(),
    email: normalized,
    source: typeof source === "string" ? source : "web",
    createdAt: new Date().toISOString(),
  };
  waitlistLeads.set(lead.id, lead);

  res.status(201).json({
    lead,
    message: "You're on the waitlist — we'll notify you when the upgraded vault ships.",
    waitlistCount: waitlistLeads.size,
  });
});

app.get("/leads/waitlist/count", publicLimiter, (_req, res) => {
  res.json({ count: waitlistLeads.size });
});

app.post("/auth/signup", authLimiter, (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required." });

  const existing = [...users.values()].find((u) => u.email === email);
  if (existing) return res.status(409).json({ error: "Account already exists." });

  const id = crypto.randomUUID();
  users.set(id, { id, email, password });
  const token = crypto.randomUUID();
  sessions.set(token, id);

  res.json({ user: { id, email }, token });
});

app.post("/auth/login", authLimiter, (req, res) => {
  const { email, password } = req.body ?? {};
  const user = [...users.values()].find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials." });

  const token = crypto.randomUUID();
  sessions.set(token, user.id);
  res.json({ user: { id: user.id, email: user.email }, token });
});

app.post("/auth/logout", auth, (req, res) => {
  const token = req.headers.authorization?.slice(7);
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

app.get("/projects", auth, (req, res) => {
  const userId = (req as express.Request & { userId: string }).userId;
  const list = [...projects.values()].filter((p) => p.userId === userId);
  res.json({ projects: list });
});

app.post("/projects", auth, (req, res) => {
  const userId = (req as express.Request & { userId: string }).userId;
  const userProjects = [...projects.values()].filter((p) => p.userId === userId);
  if (userProjects.length >= FREE_PLAN_LIMITS.projects) {
    return res.status(403).json({ error: "Project limit reached for free plan." });
  }

  const { name } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "Project name required." });

  const project = { id: crypto.randomUUID(), userId, name };
  projects.set(project.id, project);
  res.status(201).json({ project });
});

app.get("/billing/plan", auth, (req, res) => {
  const userId = (req as express.Request & { userId: string }).userId;
  const projectCount = [...projects.values()].filter((p) => p.userId === userId).length;
  res.json({
    plan: "free",
    limits: FREE_PLAN_LIMITS,
    usage: { secrets: 0, projects: projectCount },
  });
});

app.get("/vault-items", auth, (_req, res) => {
  res.json({ vaultItems: [] });
});

await wwh2Store.load();

app.listen(port, () => {
  console.log(`SecretLayer API listening on http://localhost:${port}`);
});
