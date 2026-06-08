import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runSafetySuite } from "./runner.js";

describe("runSafetySuite", () => {
  it("passes clean context with strong config", async () => {
    const report = await runSafetySuite({
      targetUrl: "https://secretlayer.net",
      responseHeaders: {
        "strict-transport-security": "max-age=31536000",
        "content-security-policy": "default-src 'self'",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "no-referrer",
      },
      sourceFiles: [{ path: "app.ts", content: "const x = 1;" }],
      config: {
        jwtSecretSet: true,
        encryptionEnabled: true,
        rateLimitEnabled: true,
        auditLogEnabled: true,
      },
    });

    assert.equal(report.passed, true);
    assert.ok(report.score >= 80);
    assert.equal(report.blockers.length, 0);
  });

  it("blocks on secret leak in source", async () => {
    const report = await runSafetySuite({
      targetUrl: "https://secretlayer.net",
      sourceFiles: [
        {
          path: "bad.ts",
          content: 'const key = "AKIAIOSFODNN7EXAMPLE"',
        },
      ],
      config: { jwtSecretSet: true, encryptionEnabled: true, rateLimitEnabled: true },
    });

    assert.equal(report.passed, false);
    assert.ok(report.blockers.some((b) => b.checkId === "secret-leak-scan"));
  });
});
