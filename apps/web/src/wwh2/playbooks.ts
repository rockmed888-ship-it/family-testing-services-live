import type { Playbook } from "./types";

export const WWH2_PLAYBOOKS: Playbook[] = [
  {
    id: "create-first-vault",
    title: "Create your first encrypted vault",
    description: "Set a master password and unlock your local vault in minutes.",
    audience: "New builders",
    estimatedMinutes: 3,
    steps: [
      {
        target: "vault-setup",
        title: "Start here",
        message: "This is the vault setup panel. SecretLayer encrypts everything in your browser before it is stored.",
      },
      {
        target: "master-password",
        title: "Choose a master password",
        message:
          "Enter a strong master password you will remember. SecretLayer cannot recover it — this is what keeps your vault zero-knowledge.",
      },
      {
        target: "confirm-password",
        title: "Confirm your password",
        message: "Type the same password again so you know the vault will unlock correctly later.",
      },
      {
        target: "create-vault-btn",
        title: "Create the vault",
        message: "Click Create vault. Your encrypted vault is created on this device — no plaintext secrets leave the browser.",
      },
    ],
  },
  {
    id: "cloud-sync-account",
    title: "Set up cloud sync account",
    description: "Create an account so your encrypted vault can sync between devices.",
    audience: "Builders using multiple devices",
    estimatedMinutes: 4,
    steps: [
      {
        target: "account-section",
        title: "Open account setup",
        message: "The Account section lets you create a login for encrypted cloud sync. Secrets stay encrypted — the server only stores ciphertext.",
      },
      {
        target: "create-account-btn",
        title: "Create your account",
        message: "Click Create account to register. Use an email you check — it is only for sign-in, not for reading your secrets.",
      },
      {
        target: "sign-in-toggle",
        title: "Already have an account?",
        message: "If you registered before, use Sign in instead to unlock sync on this device.",
      },
      {
        target: "vault-setup",
        title: "Unlock with master password",
        message: "After signing in, unlock the vault with your master password on each device. Sync moves encrypted envelopes only.",
      },
    ],
  },
  {
    id: "import-backup",
    title: "Import a vault backup",
    description: "Restore an encrypted backup file from another device or export.",
    audience: "Builders migrating devices",
    estimatedMinutes: 2,
    steps: [
      {
        target: "import-backup-btn",
        title: "Find Import backup",
        message: "Click Import backup to select your encrypted vault export file (.json).",
      },
      {
        target: "master-password",
        title: "Enter master password",
        message: "Use the same master password from when the backup was created. SecretLayer decrypts locally in your browser.",
      },
      {
        target: "vault-setup",
        title: "Verify vault loaded",
        message: "After import, your projects and secrets appear in the product view once decryption succeeds.",
      },
    ],
  },
  {
    id: "choose-your-plan",
    title: "Choose the right plan",
    description: "Compare Free, Personal, and Pro limits before you upgrade.",
    audience: "Founders comparing plans",
    estimatedMinutes: 3,
    steps: [
      {
        target: "pricing-section",
        title: "Pricing overview",
        message: "All plans start with local encryption. Paid plans add unlimited secrets, projects, and encrypted cloud sync.",
      },
      {
        target: "plan-free",
        title: "Free — get organized",
        message: "Free includes 10 secrets and 3 projects with local backup/import. Great for solo builders getting started.",
      },
      {
        target: "plan-personal",
        title: "Personal — move between devices",
        message: "Personal ($4.99/mo) removes limits and adds encrypted cloud sync for founders working across machines.",
      },
      {
        target: "plan-pro",
        title: "Pro — agencies & client work",
        message: "Pro ($9.99/mo) adds Hadassah Pro reviews and developer protection workflows for heavier builder workloads.",
      },
    ],
  },
  {
    id: "trust-security-tour",
    title: "Trust & Security tour",
    description: "Understand zero-knowledge encryption, sync, and backup before you store keys.",
    audience: "Security-conscious builders",
    estimatedMinutes: 4,
    steps: [
      {
        target: "trust-section",
        title: "Trust & Security",
        message:
          "This section explains how SecretLayer protects secrets. Read it before storing API keys so you know what is encrypted and what never leaves your browser.",
      },
      {
        target: "trust-zero-knowledge",
        title: "Zero-knowledge vault",
        message:
          "Secrets are encrypted with a key derived from your master password. The backend only stores ciphertext — it cannot read your values.",
      },
      {
        target: "trust-cloud-sync",
        title: "Encrypted cloud sync",
        message:
          "Sync sends encrypted envelopes with timestamps. Conflict handling compares metadata — still no plaintext on the server.",
      },
      {
        target: "trust-backup",
        title: "Backup custody",
        message:
          "Exports are encrypted vault envelopes. Import always requires your master password to decrypt locally.",
      },
      {
        target: "trust-faq",
        title: "Founder FAQ",
        message:
          "These answers cover what happens offline, what SecretLayer can and cannot read, and what to tell customers about your security posture.",
      },
    ],
  },
  {
    id: "run-safety-scan",
    title: "Run a safety scan",
    description: "Use SecretLayer safety nets to check secretlayer.net before you ship or promote.",
    audience: "Developers shipping to production",
    estimatedMinutes: 3,
    steps: [
      {
        target: "safety-section",
        title: "Safety nets panel",
        message:
          "SecretLayer runs industry-calibrated checks for leaked keys, transport security, and auth gaps. Use this before every promotion.",
      },
      {
        target: "safety-scan-btn",
        title: "Run safety scan",
        message: "Click Run safety scan. The engine fetches headers and runs the same suite used in CI for secretlayer.net.",
      },
      {
        target: "safety-results",
        title: "Read your score",
        message:
          "Look for PASSED or BLOCKED, your score out of 100, and the top findings. Fix critical issues before promoting.",
      },
      {
        target: "promotion-gate-btn",
        title: "Promotion gate (optional)",
        message:
          "When safety clears, run Promotion gate to preview channel-ready changelog and social leads — never blind launches.",
      },
    ],
  },
  {
    id: "leave-a-review",
    title: "Leave a review & rating",
    description: "Share what feels secure, clear, and worth paying for.",
    audience: "Early adopters & developers",
    estimatedMinutes: 4,
    steps: [
      {
        target: "reviews-section",
        title: "Reviews section",
        message: "Scroll to Reviews & ratings. Your feedback helps other builders trust the vault before they store keys.",
      },
      {
        target: "rate-vault-clarity",
        title: "Rate vault clarity",
        message: "Score how clearly SecretLayer explains encryption, local unlock, and backup behavior.",
      },
      {
        target: "rate-builder-workflow",
        title: "Rate builder workflow",
        message: "Score how well the vault fits API keys, provider links, billing pages, and recovery notes.",
      },
      {
        target: "review-form",
        title: "Submit your review",
        message:
          "Add your display name, role, and review text. Never include API keys or secrets — the safety check screens submissions first.",
      },
      {
        target: "submit-review-btn",
        title: "Submit",
        message: "Click Submit review. Screened reviews may appear publicly to help other developers decide.",
      },
    ],
  },
];

export function getPlaybookById(id: string): Playbook | undefined {
  return WWH2_PLAYBOOKS.find((p) => p.id === id);
}
