#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fetchHeaders, runSafetySuite } from "./runner.js";

const target = process.argv[2] ?? "https://secretlayer.net";
const scanDir = process.argv[3];

function collectSourceFiles(dir: string, base = dir): { path: string; content: string }[] {
  const out: { path: string; content: string }[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".git") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collectSourceFiles(full, base));
    } else if (/\.(ts|tsx|js|jsx|json|env|md)$/i.test(name) && !/\.test\.(ts|tsx|js)$/i.test(name)) {
      out.push({ path: relative(base, full), content: readFileSync(full, "utf8") });
    }
  }
  return out;
}

async function main() {
  console.log(`SecretLayer Safety Engine — scanning ${target}\n`);

  const headers = await fetchHeaders(target).catch(() => ({}));
  const sourceFiles = scanDir ? collectSourceFiles(scanDir) : undefined;

  const report = await runSafetySuite({
    targetUrl: target,
    responseHeaders: headers,
    sourceFiles,
    config: {
      jwtSecretSet: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET !== "change-me-in-production"),
      encryptionEnabled: true,
      rateLimitEnabled: true,
      auditLogEnabled: false,
    },
  });

  for (const f of report.findings) {
    const icon = f.passed ? "✓" : f.severity === "critical" ? "✗" : "!";
    console.log(`${icon} [${f.severity}] ${f.title}: ${f.detail}`);
    if (f.remediation) console.log(`  → ${f.remediation}`);
  }

  console.log(`\nScore: ${report.score}/100 | ${report.passed ? "PASSED" : "BLOCKED"}`);
  if (report.blockers.length) {
    console.log(`Blockers: ${report.blockers.map((b) => b.title).join(", ")}`);
  }

  process.exit(report.passed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
