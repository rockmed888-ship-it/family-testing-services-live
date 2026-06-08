import type { PromotionChannel, PromotionPlan, SafetyReport } from "@secretlayer/shared";

export interface PromotionInput {
  version: string;
  highlights: string[];
  safetyReport: SafetyReport;
}

const DEFAULT_CHANNELS: PromotionChannel[] = [
  "changelog",
  "marketing-site",
  "social-announcement",
];

export function buildPromotionPlan(input: PromotionInput): PromotionPlan {
  const { version, highlights, safetyReport } = input;
  const headline = `SecretLayer ${version} — builder-grade vaults, verified safe`;
  const body = [
    `Safety score: ${safetyReport.score}/100 (${safetyReport.passed ? "cleared" : "blocked"})`,
    "",
    "What's new:",
    ...highlights.map((h) => `• ${h}`),
    "",
    "Built for builders who organize secrets into projects and vaults — encrypted before sync, scanned before ship.",
    "",
    "https://secretlayer.net",
  ].join("\n");

  return {
    channels: DEFAULT_CHANNELS,
    headline,
    body,
    safetyReportId: safetyReport.runAt,
  };
}
