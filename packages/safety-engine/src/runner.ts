import type { SafetyFinding, SafetyReport } from "@secretlayer/shared";
import { ALL_CHECKS, type CheckContext } from "./checks.js";

function scoreFindings(findings: SafetyFinding[]): number {
  let score = 100;
  for (const f of findings) {
    if (f.passed) continue;
    if (f.severity === "critical") score -= 25;
    else if (f.severity === "warn") score -= 8;
    else score -= 2;
  }
  return Math.max(0, Math.min(100, score));
}

export async function fetchHeaders(targetUrl: string): Promise<Record<string, string>> {
  const res = await fetch(targetUrl, { method: "HEAD", redirect: "follow" });
  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return headers;
}

export async function runSafetySuite(
  ctx: CheckContext,
  options?: { minScore?: number },
): Promise<SafetyReport> {
  const minScore = options?.minScore ?? 80;
  const findings = ALL_CHECKS.flatMap((check) => check(ctx));
  const blockers = findings.filter((f) => !f.passed && f.severity === "critical");
  const score = scoreFindings(findings);
  const passed = blockers.length === 0 && score >= minScore;

  return {
    runAt: new Date().toISOString(),
    target: ctx.targetUrl,
    passed,
    score,
    findings,
    blockers,
  };
}
