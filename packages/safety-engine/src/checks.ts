import type { SafetyFinding } from "@secretlayer/shared";
import { REQUIRED_SECURITY_HEADERS, SECRET_PATTERNS } from "./patterns.js";

export interface CheckContext {
  targetUrl: string;
  sourceFiles?: { path: string; content: string }[];
  responseHeaders?: Record<string, string>;
  config?: {
    jwtSecretSet?: boolean;
    encryptionEnabled?: boolean;
    rateLimitEnabled?: boolean;
    auditLogEnabled?: boolean;
  };
}

type CheckFn = (ctx: CheckContext) => SafetyFinding[];

function finding(
  checkId: SafetyFinding["checkId"],
  severity: SafetyFinding["severity"],
  passed: boolean,
  title: string,
  detail: string,
  remediation?: string,
): SafetyFinding {
  return { checkId, severity, passed, title, detail, remediation };
}

export function checkSecretLeaks(ctx: CheckContext): SafetyFinding[] {
  const files = ctx.sourceFiles ?? [];
  const hits: string[] = [];

  for (const file of files) {
    for (const { label, pattern } of SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        hits.push(`${label} in ${file.path}`);
      }
    }
  }

  return [
    finding(
      "secret-leak-scan",
      hits.length ? "critical" : "info",
      hits.length === 0,
      "Secret leak scan",
      hits.length ? `Potential secrets: ${hits.slice(0, 5).join("; ")}` : "No known secret patterns in scanned sources.",
      hits.length ? "Rotate exposed credentials and move secrets into encrypted vault items." : undefined,
    ),
  ];
}

export function checkTransportSecurity(ctx: CheckContext): SafetyFinding[] {
  const headers = ctx.responseHeaders ?? {};
  const hsts = headers["strict-transport-security"] ?? headers["Strict-Transport-Security"];
  const https = ctx.targetUrl.startsWith("https://");

  return [
    finding(
      "transport-security",
      !https ? "critical" : "info",
      https,
      "HTTPS enforced",
      https ? "Target uses HTTPS." : "Target must use HTTPS in production.",
      !https ? "Enable TLS and redirect HTTP to HTTPS." : undefined,
    ),
    finding(
      "transport-security",
      !hsts ? "warn" : "info",
      Boolean(hsts),
      "HSTS header",
      hsts ? `HSTS present: ${hsts}` : "Missing Strict-Transport-Security header.",
      !hsts ? "Add HSTS with includeSubDomains and preload for production." : undefined,
    ),
  ];
}

export function checkCspHeaders(ctx: CheckContext): SafetyFinding[] {
  const headers = ctx.responseHeaders ?? {};
  const missing = REQUIRED_SECURITY_HEADERS.filter((h) => !headers[h] && !headers[h.toUpperCase()]);
  const csp = headers["content-security-policy"] ?? headers["Content-Security-Policy"];
  const unsafeInline = csp?.includes("'unsafe-inline'");

  const findings: SafetyFinding[] = [
    finding(
      "csp-headers",
      missing.length ? "warn" : "info",
      missing.length === 0,
      "Security headers",
      missing.length ? `Missing: ${missing.join(", ")}` : "All baseline security headers present.",
      missing.length ? "Align with secretlayer.net baseline CSP and frame protections." : undefined,
    ),
  ];

  if (csp) {
    findings.push(
      finding(
        "csp-headers",
        unsafeInline ? "warn" : "info",
        !unsafeInline,
        "CSP inline scripts",
        unsafeInline ? "CSP allows unsafe-inline styles/scripts — review for XSS surface." : "No unsafe-inline in CSP.",
      ),
    );
  }

  return findings;
}

export function checkAuthHardening(ctx: CheckContext): SafetyFinding[] {
  const cfg = ctx.config ?? {};
  const jwtOk = cfg.jwtSecretSet !== false;

  return [
    finding(
      "auth-hardening",
      jwtOk ? "info" : "critical",
      jwtOk,
      "JWT secret configuration",
      jwtOk ? "JWT secret is configured (not default)." : "JWT_SECRET is missing or still default.",
      !jwtOk ? "Set a strong JWT_SECRET in production environment." : undefined,
    ),
    finding(
      "rate-limiting",
      cfg.rateLimitEnabled ? "info" : "warn",
      Boolean(cfg.rateLimitEnabled),
      "API rate limiting",
      cfg.rateLimitEnabled ? "Rate limiting enabled on auth endpoints." : "Rate limiting not confirmed on auth endpoints.",
      !cfg.rateLimitEnabled ? "Enable rate limits on /auth/login and /auth/signup." : undefined,
    ),
  ];
}

export function checkVaultStructure(ctx: CheckContext): SafetyFinding[] {
  const encrypted = ctx.config?.encryptionEnabled !== false;

  return [
    finding(
      "encryption-at-rest",
      encrypted ? "info" : "critical",
      encrypted,
      "Client-side encryption",
      encrypted
        ? "Vault items encrypted before storage/sync (zero-knowledge posture)."
        : "Encryption at rest not confirmed for vault items.",
      !encrypted ? "Encrypt vault payloads with user-derived keys before localStorage or cloud sync." : undefined,
    ),
    finding(
      "vault-structure",
      encrypted ? "info" : "warn",
      encrypted,
      "Vault / project model",
      "Projects organize vaults; secrets never stored in plaintext server-side.",
    ),
    finding(
      "audit-logging",
      ctx.config?.auditLogEnabled ? "info" : "warn",
      Boolean(ctx.config?.auditLogEnabled),
      "Audit logging",
      ctx.config?.auditLogEnabled
        ? "Security-relevant events are logged."
        : "Audit logging not enabled for auth and vault mutations.",
      !ctx.config?.auditLogEnabled ? "Log auth, sync, and promotion events with tamper-evident storage." : undefined,
    ),
  ];
}

export const ALL_CHECKS: CheckFn[] = [
  checkSecretLeaks,
  checkTransportSecurity,
  checkCspHeaders,
  checkAuthHardening,
  checkVaultStructure,
];
