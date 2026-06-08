export type SafetySeverity = "info" | "warn" | "critical";

export type SafetyCheckId =
  | "secret-leak-scan"
  | "encryption-at-rest"
  | "transport-security"
  | "auth-hardening"
  | "csp-headers"
  | "dependency-audit"
  | "vault-structure"
  | "rate-limiting"
  | "audit-logging";

export interface SafetyFinding {
  checkId: SafetyCheckId;
  severity: SafetySeverity;
  passed: boolean;
  title: string;
  detail: string;
  remediation?: string;
}

export interface SafetyReport {
  runAt: string;
  target: string;
  passed: boolean;
  score: number;
  findings: SafetyFinding[];
  blockers: SafetyFinding[];
}

export type PromotionChannel =
  | "deploy-production"
  | "marketing-site"
  | "social-announcement"
  | "changelog"
  | "email-waitlist";

export interface PromotionPlan {
  channels: PromotionChannel[];
  headline: string;
  body: string;
  safetyReportId: string;
}

export interface PromotionResult {
  approved: boolean;
  reason: string;
  plan?: PromotionPlan;
  executedAt?: string;
}

export interface VaultProject {
  id: string;
  name: string;
  description?: string;
  vaultIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Vault {
  id: string;
  projectId: string;
  label: string;
  itemCount: number;
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanLimits {
  secrets: number;
  projects: number;
}

export const FREE_PLAN_LIMITS: PlanLimits = { secrets: 10, projects: 3 };

export interface WaitlistLead {
  id: string;
  email: string;
  source: string;
  createdAt: string;
}

export interface Wwh2Feedback {
  id: string;
  playbookId: string;
  playbookTitle: string;
  rating: number;
  helpful: boolean;
  comment?: string;
  completedSteps: number;
  totalSteps: number;
  createdAt: string;
}

export interface Wwh2Stats {
  totalSessions: number;
  averageRating: number;
  helpfulPercent: number;
  playbookCounts: Record<string, number>;
}
