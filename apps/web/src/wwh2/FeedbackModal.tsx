import { useState } from "react";
import type { GuideFeedbackPayload } from "./types";

interface FeedbackModalProps {
  playbookId: string;
  playbookTitle: string;
  completedSteps: number;
  totalSteps: number;
  onSubmit: (payload: GuideFeedbackPayload) => Promise<void>;
  onClose: () => void;
}

export function FeedbackModal({
  playbookId,
  playbookTitle,
  completedSteps,
  totalSteps,
  onSubmit,
  onClose,
}: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (rating < 1 || helpful === null) {
      setError("Please select a star rating and whether this was helpful.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        playbookId,
        playbookTitle,
        rating,
        helpful,
        comment: comment.trim() || undefined,
        completedSteps,
        totalSteps,
      });
      setDone(true);
    } catch {
      setError("Could not save feedback — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="wwh2-modal-backdrop">
        <div className="wwh2-modal wwh2-feedback-modal">
          <h2>Thanks for boosting WWH2!</h2>
          <p>Your rating helps other developers find fast guided help on SecretLayer.</p>
          <button type="button" className="wwh2-btn primary full" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wwh2-modal-backdrop">
      <div className="wwh2-modal wwh2-feedback-modal">
        <h2>How was this guide?</h2>
        <p className="wwh2-muted">
          You completed <strong>{playbookTitle}</strong>. Was WWH2 helpful for getting the job done faster?
        </p>

        <div className="wwh2-stars" role="group" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`wwh2-star ${(hover || rating) >= star ? "active" : ""}`}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
        </div>

        <p className="wwh2-label">Was this helpful?</p>
        <div className="wwh2-helpful-row">
          <button
            type="button"
            className={`wwh2-btn ${helpful === true ? "primary" : "ghost"}`}
            onClick={() => setHelpful(true)}
          >
            Yes, saved me time
          </button>
          <button
            type="button"
            className={`wwh2-btn ${helpful === false ? "primary" : "ghost"}`}
            onClick={() => setHelpful(false)}
          >
            Not really
          </button>
        </div>

        <label className="wwh2-label" htmlFor="wwh2-comment">
          Anything we should improve? (optional)
        </label>
        <textarea
          id="wwh2-comment"
          className="wwh2-textarea"
          rows={3}
          placeholder="e.g. clearer highlight on mobile, more steps for Pro plan..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {error && <p className="wwh2-error">{error}</p>}

        <div className="wwh2-modal-actions">
          <button type="button" className="wwh2-btn ghost" onClick={onClose}>
            Skip
          </button>
          <button type="button" className="wwh2-btn primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Sending…" : "Submit rating"}
          </button>
        </div>
      </div>
    </div>
  );
}
