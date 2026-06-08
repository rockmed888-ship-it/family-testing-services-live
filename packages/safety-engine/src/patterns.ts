export interface SecretPattern {
  label: string;
  pattern: RegExp;
  severity: "warn" | "critical";
}

/** Industry-calibrated secret leak patterns (GitHub, AWS, Stripe, DB URLs, etc.) */
export const SECRET_PATTERNS: SecretPattern[] = [
  { label: "AWS access key", pattern: /AKIA[0-9A-Z]{16}/g, severity: "critical" },
  { label: "GitHub token", pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/g, severity: "critical" },
  { label: "Stripe live key", pattern: /sk_live_[A-Za-z0-9]{20,}/g, severity: "critical" },
  { label: "Slack token", pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/g, severity: "critical" },
  {
    label: "Generic API assignment",
    pattern: /(api[_-]?key|secret|token|password|private[_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9_./+-]{8,}/gi,
    severity: "warn",
  },
  {
    label: "Database URL",
    pattern: /postgres(?:ql)?:\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/gi,
    severity: "critical",
  },
  { label: "Bearer token", pattern: /bearer\s+[a-z0-9._-]{12,}/gi, severity: "warn" },
  { label: "JWT", pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, severity: "warn" },
];

export const REQUIRED_SECURITY_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
] as const;
