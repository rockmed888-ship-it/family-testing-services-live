import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runPromotionGate } from "./gate.js";
import type { SafetyReport } from "@secretlayer/shared";

const passedReport: SafetyReport = {
  runAt: "2026-06-07T00:00:00.000Z",
  target: "https://secretlayer.net",
  passed: true,
  score: 92,
  findings: [],
  blockers: [],
};

const failedReport: SafetyReport = {
  ...passedReport,
  passed: false,
  score: 40,
  blockers: [
    {
      checkId: "secret-leak-scan",
      severity: "critical",
      passed: false,
      title: "Secret leak",
      detail: "Stripe key found",
    },
  ],
};

describe("runPromotionGate", () => {
  it("blocks promotion when safety fails", async () => {
    const result = await runPromotionGate(
      { version: "0.2.0", highlights: ["test"], safetyReport: failedReport },
      { dryRun: true },
    );
    assert.equal(result.approved, false);
    assert.ok(result.reason.includes("blocked"));
  });

  it("approves promotion when safety passes", async () => {
    const result = await runPromotionGate(
      { version: "0.2.0", highlights: ["Safety engine"], safetyReport: passedReport },
      { dryRun: true },
    );
    assert.equal(result.approved, true);
    assert.ok(result.plan?.headline.includes("SecretLayer"));
  });
});
