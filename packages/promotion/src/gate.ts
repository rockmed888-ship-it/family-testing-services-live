import type { PromotionResult, SafetyReport } from "@secretlayer/shared";
import { buildPromotionPlan, type PromotionInput } from "./planner.js";

export interface PromotionGateOptions {
  dryRun?: boolean;
  webhookUrl?: string;
}

export async function runPromotionGate(
  input: PromotionInput,
  options: PromotionGateOptions = {},
): Promise<PromotionResult> {
  const { safetyReport } = input;

  if (!safetyReport.passed) {
    return {
      approved: false,
      reason: `Promotion blocked: safety score ${safetyReport.score}/100 with ${safetyReport.blockers.length} critical blocker(s).`,
    };
  }

  const plan = buildPromotionPlan(input);

  if (options.dryRun) {
    return {
      approved: true,
      reason: "Dry run — promotion plan generated; no channels executed.",
      plan,
    };
  }

  if (options.webhookUrl) {
    await fetch(options.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "secretlayer.promotion.approved", plan, safetyReport }),
    });
  }

  return {
    approved: true,
    reason: "Safety nets passed. Promotion plan approved.",
    plan,
    executedAt: new Date().toISOString(),
  };
}

export function assertSafeForPromotion(report: SafetyReport): void {
  if (!report.passed) {
    const titles = report.blockers.map((b) => b.title).join(", ");
    throw new Error(`Cannot promote: safety gate failed (${titles})`);
  }
}
