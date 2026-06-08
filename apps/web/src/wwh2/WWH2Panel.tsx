import { useCallback, useEffect, useState } from "react";
import type { Wwh2Stats } from "@secretlayer/shared";
import { WWH2_PLAYBOOKS } from "./playbooks";
import { FeedbackModal } from "./FeedbackModal";
import { GuideOverlay } from "./GuideOverlay";
import type { ActiveGuide, GuideFeedbackPayload } from "./types";

type PanelView = "closed" | "launcher" | "menu" | "guide" | "feedback";

interface WWH2PanelProps {
  /** Increment to open the help menu from elsewhere (e.g. footer badge). */
  openMenuTrigger?: number;
}

export function WWH2Panel({ openMenuTrigger = 0 }: WWH2PanelProps) {
  const [view, setView] = useState<PanelView>("launcher");
  const [activeGuide, setActiveGuide] = useState<ActiveGuide | null>(null);
  const [stats, setStats] = useState<Wwh2Stats | null>(null);
  const [minimized, setMinimized] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/wwh2/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats ?? null);
      }
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (openMenuTrigger > 0) {
      setView("menu");
      setMinimized(false);
    }
  }, [openMenuTrigger]);

  function startPlaybook(playbookId: string) {
    const playbook = WWH2_PLAYBOOKS.find((p) => p.id === playbookId);
    if (!playbook) return;
    setActiveGuide({ playbook, stepIndex: 0 });
    setView("guide");
    setMinimized(false);
  }

  function handleNext() {
    if (!activeGuide) return;
    const lastIndex = activeGuide.playbook.steps.length - 1;
    if (activeGuide.stepIndex >= lastIndex) {
      setView("feedback");
      return;
    }
    setActiveGuide({ ...activeGuide, stepIndex: activeGuide.stepIndex + 1 });
  }

  function handleBack() {
    if (!activeGuide || activeGuide.stepIndex === 0) return;
    setActiveGuide({ ...activeGuide, stepIndex: activeGuide.stepIndex - 1 });
  }

  function exitGuide() {
    setActiveGuide(null);
    setView("menu");
  }

  async function submitFeedback(payload: GuideFeedbackPayload) {
    const res = await fetch("/api/wwh2/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("feedback failed");
    await loadStats();
  }

  function closeAll() {
    setActiveGuide(null);
    setView("launcher");
  }

  if (minimized && view !== "guide") {
    return (
      <button
        type="button"
        className="wwh2-minimized-tab"
        onClick={() => setMinimized(false)}
        aria-label="Open WWH2 help"
      >
        WWH2
      </button>
    );
  }

  return (
    <>
      {view === "launcher" && (
        <aside className="wwh2-launcher" aria-label="WWH2 guided help">
          <button type="button" className="wwh2-minimize" onClick={() => setMinimized(true)} aria-label="Minimize">
            −
          </button>
          <p className="wwh2-launcher-kicker">Need help or in a hurry?</p>
          <p className="wwh2-launcher-headline">Don&apos;t worry — try <strong>WWH2</strong></p>
          <p className="wwh2-launcher-copy">
            Free guided access by SecretLayer. Fast paths, highlighted buttons, and quicker job completion for new
            developers.
          </p>
          {stats && stats.totalSessions > 0 && (
            <p className="wwh2-social-proof">
              ★ {stats.averageRating.toFixed(1)} avg · {stats.helpfulPercent}% found it helpful
            </p>
          )}
          <button type="button" className="wwh2-btn primary full" onClick={() => setView("menu")}>
            Open guided help
          </button>
        </aside>
      )}

      {view === "menu" && (
        <div className="wwh2-modal-backdrop" onClick={closeAll}>
          <div className="wwh2-modal wwh2-menu-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wwh2-menu-header">
              <div>
                <span className="wwh2-badge">WWH2 · free</span>
                <h2>What do you need to do?</h2>
                <p className="wwh2-muted">Pick a guided path — we highlight each click so you finish faster.</p>
              </div>
              <button type="button" className="wwh2-close" onClick={closeAll} aria-label="Close">
                ×
              </button>
            </div>
            <ul className="wwh2-playbook-list">
              {WWH2_PLAYBOOKS.map((playbook) => (
                <li key={playbook.id}>
                  <button type="button" className="wwh2-playbook-card" onClick={() => startPlaybook(playbook.id)}>
                    <div className="wwh2-playbook-meta">
                      <span>{playbook.audience}</span>
                      <span>~{playbook.estimatedMinutes} min</span>
                    </div>
                    <strong>{playbook.title}</strong>
                    <p>{playbook.description}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {view === "guide" && activeGuide && (
        <GuideOverlay guide={activeGuide} onNext={handleNext} onBack={handleBack} onExit={exitGuide} />
      )}

      {view === "feedback" && activeGuide && (
        <FeedbackModal
          playbookId={activeGuide.playbook.id}
          playbookTitle={activeGuide.playbook.title}
          completedSteps={activeGuide.playbook.steps.length}
          totalSteps={activeGuide.playbook.steps.length}
          onSubmit={submitFeedback}
          onClose={closeAll}
        />
      )}
    </>
  );
}
