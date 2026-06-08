#!/usr/bin/env node
import { fetchHeaders, runSafetySuite } from "@secretlayer/safety-engine";
import { runPromotionGate } from "./gate.js";

const target = process.argv[2] ?? "https://secretlayer.net";
const version = process.argv[3] ?? "0.2.0";
const dryRun = !process.argv.includes("--execute");

async function main() {
  console.log("SecretLayer Promotion Gate\n");

  const headers = await fetchHeaders(target).catch(() => ({}));
  const safetyReport = await runSafetySuite({
    targetUrl: target,
    responseHeaders: headers,
    config: {
      jwtSecretSet: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET !== "change-me-in-production"),
      encryptionEnabled: true,
      rateLimitEnabled: true,
    },
  });

  const result = await runPromotionGate(
    {
      version,
      highlights: [
        "Industry-calibrated safety nets before every promotion",
        "Vault-first projects for the common builder",
        "Zero-knowledge encrypted sync",
      ],
      safetyReport,
    },
    {
      dryRun,
      webhookUrl: process.env.PROMOTION_WEBHOOK_URL,
    },
  );

  console.log(result.reason);
  if (result.plan) {
    console.log("\n--- Promotion plan ---");
    console.log(`Headline: ${result.plan.headline}`);
    console.log(`Channels: ${result.plan.channels.join(", ")}`);
    console.log("\n" + result.plan.body);
  }

  process.exit(result.approved ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
