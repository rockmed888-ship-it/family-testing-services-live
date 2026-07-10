// Family Testing Services — public interactions

document.addEventListener("DOMContentLoaded", () => {
  const reviewBtn = document.getElementById("leave-review-btn");
  const modal = document.getElementById("review-modal");
  const closeBtn = document.getElementById("modal-close");
  const verifyForm = document.getElementById("verify-form");
  const verifyInput = document.getElementById("verify-key");
  const verifyResult = document.getElementById("verify-result");

  if (reviewBtn && modal) {
    reviewBtn.addEventListener("click", (e) => {
      e.preventDefault();
      modal.classList.add("open");
      document.body.style.overflow = "hidden";
    });
  }

  function closeModal() {
    if (modal) {
      modal.classList.remove("open");
      document.body.style.overflow = "";
    }
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  document.querySelectorAll("[data-static-phone]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      alert("Phone calls are disabled on this website. No call was placed.");
    });
  });

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  async function verifyKey(key) {
    if (!verifyResult) return;
    verifyResult.className = "verify-result";
    verifyResult.innerHTML = "Checking record...";

    try {
      const response = await fetch(`/api/drug-screens/verify/${encodeURIComponent(key)}`);
      const payload = await response.json().catch(() => ({}));

      if (response.status === 404 || payload.found === false) {
        verifyResult.className = "verify-result not-found";
        verifyResult.innerHTML = "No saved collection record was found for that key.";
        return;
      }

      if (!response.ok || !payload.ok) throw new Error(payload.error || "Verification failed");

      verifyResult.className = "verify-result found";
      verifyResult.innerHTML = `
        <strong>Saved collection record found.</strong><br>
        Verification Key: <code>${escapeHtml(payload.verificationKey)}</code><br>
        Specimen ID: <code>${escapeHtml(payload.specimenId)}</code><br>
        Donor Initials: ${escapeHtml(payload.donorInitials || "Not listed")}<br>
        Collection Date: ${escapeHtml(payload.collectionDate || "Not listed")}<br>
        <small>${escapeHtml(payload.notice || "Verification confirms saved collection record only.")}</small>`;
    } catch (err) {
      verifyResult.className = "verify-result not-found";
      verifyResult.innerHTML = escapeHtml(err.message || "Could not verify key right now.");
    }
  }

  if (verifyForm && verifyInput) {
    verifyForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const key = verifyInput.value.trim();
      if (!key) {
        verifyResult.className = "verify-result not-found";
        verifyResult.innerHTML = "Enter a verification key or specimen ID first.";
        return;
      }
      verifyKey(key);
    });
  }
});
