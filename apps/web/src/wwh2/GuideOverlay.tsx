import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import type { ActiveGuide } from "./types";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface GuideOverlayProps {
  guide: ActiveGuide;
  onNext: () => void;
  onBack: () => void;
  onExit: () => void;
}

function findTarget(targetId: string): HTMLElement | null {
  return document.querySelector(`[data-guide="${targetId}"]`);
}

export function GuideOverlay({ guide, onNext, onBack, onExit }: GuideOverlayProps) {
  const step = guide.playbook.steps[guide.stepIndex];
  const [rect, setRect] = useState<Rect | null>(null);
  const isFirst = guide.stepIndex === 0;
  const isLast = guide.stepIndex === guide.playbook.steps.length - 1;

  const updateRect = useCallback(() => {
    const el = findTarget(step.target);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    const box = el.getBoundingClientRect();
    const pad = 8;
    setRect({
      top: box.top - pad,
      left: box.left - pad,
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    });
  }, [step.target]);

  useLayoutEffect(() => {
    updateRect();
  }, [updateRect, guide.stepIndex]);

  useEffect(() => {
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [updateRect]);

  const tooltipTop = rect ? Math.min(rect.top + rect.height + 16, window.innerHeight - 220) : 80;
  const tooltipLeft = rect ? Math.min(Math.max(rect.left, 16), window.innerWidth - 340) : 16;

  return (
    <div className="wwh2-overlay-root" role="dialog" aria-modal="true" aria-label="WWH2 guided help">
      <svg className="wwh2-spotlight-svg" aria-hidden="true">
        <defs>
          <mask id="wwh2-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(3,7,18,0.78)" mask="url(#wwh2-spotlight-mask)" />
      </svg>

      {rect && (
        <div
          className="wwh2-highlight-ring"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      )}

      <div
        className="wwh2-tooltip"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div className="wwh2-tooltip-header">
          <span className="wwh2-badge">WWH2</span>
          <span className="wwh2-step-count">
            Step {guide.stepIndex + 1} of {guide.playbook.steps.length}
          </span>
        </div>
        <h3 className="wwh2-tooltip-title">{step.title}</h3>
        <p className="wwh2-tooltip-message">{step.message}</p>
        {!rect && (
          <p className="wwh2-missing-target">
            Target not visible on this page — use Back or Exit, or scroll until the highlighted area appears.
          </p>
        )}
        <div className="wwh2-tooltip-actions">
          <button type="button" className="wwh2-btn ghost" onClick={onExit}>
            Exit
          </button>
          {!isFirst && (
            <button type="button" className="wwh2-btn ghost" onClick={onBack}>
              Back
            </button>
          )}
          <button type="button" className="wwh2-btn primary" onClick={onNext}>
            {isLast ? "Finish guide" : "I did it — next"}
          </button>
        </div>
      </div>
    </div>
  );
}
