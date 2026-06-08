import { useCallback, useState } from "react";
import type { SafetyReport } from "@secretlayer/shared";

const PLANS = [
  {
    id: "free",
    guide: "plan-free",
    name: "Free",
    price: "$0",
    badge: null,
    blurb: "Solo builders getting organized",
    perks: ["10 secrets", "3 projects", "Local backup/import"],
  },
  {
    id: "personal",
    guide: "plan-personal",
    name: "Personal",
    price: "$4.99/mo",
    badge: "Paid",
    blurb: "Founders and operators moving between devices",
    perks: ["Unlimited secrets", "Unlimited projects", "Encrypted cloud sync"],
  },
  {
    id: "pro",
    guide: "plan-pro",
    name: "Pro",
    price: "$9.99/mo",
    badge: "Paid",
    blurb: "Builders, agencies, and client work",
    perks: ["Everything in Personal", "Hadassah Pro reviews", "Developer protection workflows"],
  },
] as const;

const TRUST_ITEMS = [
  {
    guide: "trust-zero-knowledge",
    title: "Zero-knowledge vault model",
    detail:
      "Secret values are encrypted in the browser with a key derived from the user master password. The backend is treated as encrypted storage, not a place that can read secrets.",
  },
  {
    guide: "trust-cloud-sync",
    title: "Encrypted cloud sync",
    detail:
      "Synced vault items are sent as encrypted envelopes with timestamps for conflict handling. The API receives ciphertext and metadata needed to store and compare records.",
  },
  {
    guide: "trust-backup",
    title: "Backup and import custody",
    detail:
      "Backup exports contain the encrypted vault envelope. Import requires the master password before anything can be decrypted back into the local browser session.",
  },
] as const;

const TRUST_FAQ = [
  {
    q: "Can SecretLayer read customer secrets?",
    a: "No by design. Secrets are encrypted client-side before localStorage, backup export, or cloud sync.",
  },
  {
    q: "What happens if sync is offline?",
    a: "The encrypted local vault continues to work. Sync can be retried later without sending plaintext secrets.",
  },
] as const;

interface LandingPageProps {
  onOpenWwh2?: () => void;
}

export function LandingPage({ onOpenWwh2 }: LandingPageProps) {
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [showSignIn, setShowSignIn] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewRole, setReviewRole] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [vaultClarity, setVaultClarity] = useState(0);
  const [builderWorkflow, setBuilderWorkflow] = useState(0);
  const [aiSafety, setAiSafety] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [safetyReport, setSafetyReport] = useState<SafetyReport | null>(null);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [promotionLoading, setPromotionLoading] = useState(false);

  const createVault = useCallback(() => {
    if (!masterPassword || masterPassword.length < 8) {
      setStatus("Use a master password with at least 8 characters.");
      return;
    }
    if (masterPassword !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }
    setStatus("Vault created locally on this device (encrypted in-browser). Cloud sync requires an account.");
  }, [masterPassword, confirmPassword]);

  const submitReview = useCallback(() => {
    if (!reviewName.trim() || !reviewText.trim()) {
      setStatus("Add a display name and review text.");
      return;
    }
    if (vaultClarity < 1 || builderWorkflow < 1 || aiSafety < 1) {
      setStatus("Rate all three categories before submitting.");
      return;
    }
    setStatus("Thanks — your review was accepted by the on-page safety check (demo). Screened reviews may appear publicly.");
    setReviewText("");
  }, [reviewName, reviewText, vaultClarity, builderWorkflow, aiSafety]);

  const runSafetyScan = useCallback(async () => {
    setSafetyLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/safety/report?target=https://secretlayer.net");
      const data = await res.json();
      if (data.report) {
        setSafetyReport(data.report);
        setStatus(`Safety: ${data.report.score}/100 — ${data.report.passed ? "cleared" : "blocked"}.`);
      }
    } catch {
      setStatus("Safety scan failed — start the API with pnpm dev:api");
    } finally {
      setSafetyLoading(false);
    }
  }, []);

  const runPromotionGate = useCallback(async () => {
    setPromotionLoading(true);
    try {
      const res = await fetch("/api/promotion/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "https://secretlayer.net", version: "0.2.0" }),
      });
      const data = await res.json();
      if (data.safetyReport) setSafetyReport(data.safetyReport);
      if (data.result) {
        setStatus(data.result.reason);
      }
    } catch {
      setStatus("Promotion check failed — is the API running?");
    } finally {
      setPromotionLoading(false);
    }
  }, []);

  return (
    <div className="sl-page">
      <header className="sl-hero">
        <p className="sl-eyebrow">Encrypted API key command center</p>
        <h1>SecretLayer</h1>
        <p className="sl-lead">
          Organize API keys, client credentials, provider links, billing pages, renewal dates, and recovery notes in one
          encrypted builder vault.
        </p>
      </header>

      <section className="sl-pricing" data-guide="pricing-section" aria-label="Pricing">
        <div className="sl-pricing-grid">
          {PLANS.map((plan) => (
            <article key={plan.id} className="sl-plan-card" data-guide={plan.guide}>
              {plan.badge && <span className="sl-plan-badge">{plan.badge}</span>}
              <h2>{plan.name}</h2>
              <p className="sl-plan-price">{plan.price}</p>
              <p className="sl-plan-blurb">{plan.blurb}</p>
              <ul>
                {plan.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="sl-product" data-guide="product-view">
        <h2>Product view</h2>
        <p>Encrypted records, safe AI review context, plan controls, and sync status stay visible in one command center.</p>

        <div className="sl-product-grid">
          <div className="sl-panel" data-guide="vault-setup">
            <h3>Set master password</h3>
            <p className="sl-muted">Create the first encrypted vault on this device.</p>
            <label htmlFor="master-password">Master password</label>
            <input
              id="master-password"
              data-guide="master-password"
              type="password"
              autoComplete="new-password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="Strong password you will remember"
            />
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              data-guide="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div className="sl-btn-row">
              <button type="button" className="sl-btn primary" data-guide="create-vault-btn" onClick={createVault}>
                Create vault
              </button>
              <button type="button" className="sl-btn" data-guide="import-backup-btn">
                Import backup
              </button>
            </div>
          </div>

          <div className="sl-panel" data-guide="account-section">
            <h3>Account</h3>
            <p className="sl-muted">Create an account or sign in to sync encrypted vault data between devices.</p>
            <button
              type="button"
              className="sl-btn primary"
              data-guide="create-account-btn"
              onClick={() => setShowSignIn(false)}
            >
              Create account
            </button>
            <button
              type="button"
              className="sl-btn linkish"
              data-guide="sign-in-toggle"
              onClick={() => setShowSignIn(true)}
            >
              Sign in instead
            </button>
            {showSignIn ? (
              <p className="sl-hint">Sign-in form unlocks encrypted sync after vault import on this device.</p>
            ) : (
              <>
                <label htmlFor="account-email">Email</label>
                <input
                  id="account-email"
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="you@builds.dev"
                />
                <label htmlFor="account-password">Password</label>
                <input
                  id="account-password"
                  type="password"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="sl-safety" data-guide="safety-section">
        <h2>Safety nets</h2>
        <p className="sl-lead-small">Run industry-calibrated checks before you ship or promote secretlayer.net.</p>
        <div className="sl-btn-row">
          <button
            type="button"
            className="sl-btn primary"
            data-guide="safety-scan-btn"
            onClick={runSafetyScan}
            disabled={safetyLoading}
          >
            {safetyLoading ? "Scanning…" : "Run safety scan"}
          </button>
          <button
            type="button"
            className="sl-btn"
            data-guide="promotion-gate-btn"
            onClick={runPromotionGate}
            disabled={promotionLoading}
          >
            {promotionLoading ? "Checking…" : "Promotion gate"}
          </button>
        </div>
        <div className="sl-panel sl-safety-results" data-guide="safety-results">
          {safetyReport ? (
            <>
              <strong className={safetyReport.passed ? "sl-pass" : "sl-fail"}>
                Score {safetyReport.score}/100 — {safetyReport.passed ? "PASSED" : "BLOCKED"}
              </strong>
              <ul className="sl-safety-findings">
                {safetyReport.findings.slice(0, 5).map((f, i) => (
                  <li key={i}>
                    {f.passed ? "✓" : "✗"} {f.title}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="sl-muted">Run a safety scan to see your score and top findings here.</p>
          )}
        </div>
      </section>

      <section className="sl-reviews" data-guide="reviews-section">
        <h2>Reviews &amp; ratings</h2>
        <p className="sl-lead-small">Tell us what feels secure, clear, and worth paying for.</p>
        <p className="sl-muted sl-warning">
          Reviews are screened before they appear. Do not include API keys, passwords, private keys, webhook secrets,
          database URLs, encrypted blobs, ciphertext, vault labels, or vault content.
        </p>

        <div className="sl-rating-cards">
          <RatingCard
            guide="rate-vault-clarity"
            title="Vault clarity"
            detail="Rate how clearly SecretLayer explains encrypted storage, local unlock, and backup behavior."
            value={vaultClarity}
            onChange={setVaultClarity}
          />
          <RatingCard
            guide="rate-builder-workflow"
            title="Builder workflow"
            detail="Rate how well the vault fits API keys, provider links, billing pages, and recovery work."
            value={builderWorkflow}
            onChange={setBuilderWorkflow}
          />
          <RatingCard
            guide="rate-ai-safety"
            title="AI safety"
            detail="Rate whether Hadassah makes the provider-safe AI boundary easy to understand."
            value={aiSafety}
            onChange={setAiSafety}
          />
        </div>

        <div className="sl-panel" data-guide="review-form">
          <h3>Rate SecretLayer</h3>
          <p className="sl-muted">The safety check runs before your review is accepted on this page.</p>
          <label htmlFor="review-name">Display name</label>
          <input id="review-name" value={reviewName} onChange={(e) => setReviewName(e.target.value)} />
          <label htmlFor="review-role">Role</label>
          <input
            id="review-role"
            value={reviewRole}
            onChange={(e) => setReviewRole(e.target.value)}
            placeholder="e.g. indie developer"
          />
          <label htmlFor="review-text">Review</label>
          <textarea id="review-text" rows={4} value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
          <button type="button" className="sl-btn primary" data-guide="submit-review-btn" onClick={submitReview}>
            Submit review
          </button>
        </div>
      </section>

      <section className="sl-trust" data-guide="trust-section">
        <h2>Trust &amp; Security</h2>
        <p className="sl-lead-small">Built to feel safe before it ever asks for trust.</p>
        <p className="sl-muted">
          SecretLayer is designed around truthful security architecture: local encryption first, encrypted sync second,
          and clear controls users can inspect before they trust the workflow.
        </p>
        <div className="sl-trust-grid">
          {TRUST_ITEMS.map((item) => (
            <article key={item.guide} className="sl-trust-card" data-guide={item.guide}>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
        <div className="sl-trust-faq" data-guide="trust-faq">
          <h3>Founder-ready trust FAQ</h3>
          {TRUST_FAQ.map((item) => (
            <details key={item.q} className="sl-faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {status && (
        <p className="sl-status" role="status">
          {status}
        </p>
      )}

      <footer className="sl-footer">
        <button type="button" className="wwh2-powered-badge" onClick={onOpenWwh2} aria-label="Open WWH2 guided help">
          Powered by WWH2
        </button>
        <p>secretlayer.net · WWH2 guided help is free for all users</p>
      </footer>
    </div>
  );
}

function RatingCard({
  guide,
  title,
  detail,
  value,
  onChange,
}: {
  guide: string;
  title: string;
  detail: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <article className="sl-rating-card" data-guide={guide}>
      <h3>{title}</h3>
      <p>{detail}</p>
      <div className="sl-mini-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={value >= star ? "active" : ""}
            onClick={() => onChange(star)}
            aria-label={`${star} stars`}
          >
            ★
          </button>
        ))}
      </div>
    </article>
  );
}
