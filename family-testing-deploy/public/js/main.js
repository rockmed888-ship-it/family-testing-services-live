// Family Testing Services — public interactions

document.addEventListener("DOMContentLoaded", () => {
  const reviewBtn = document.getElementById("leave-review-btn");
  const modal = document.getElementById("review-modal");
  const closeBtn = document.getElementById("modal-close");
  const verifyForm = document.getElementById("verify-form");
  const verifyInput = document.getElementById("verify-key");
  const verifyLastName = document.getElementById("verify-last-name");
  const verifyDob = document.getElementById("verify-dob");
  const verifyResult = document.getElementById("verify-result");

  if (reviewBtn && modal) {
    reviewBtn.addEventListener("click", event => {
      event.preventDefault();
      modal.classList.add("open");
      document.body.style.overflow = "hidden";
    });
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (modal) modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });

  document.querySelectorAll("[data-static-phone]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      alert("Phone calls are disabled on this website. No call was placed.");
    });
  });

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function formatDate(value) {
    if (!value) return "Not listed";
    const parts = String(value).split("-");
    return parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : escapeHtml(value);
  }

  function specimenLabel(value) {
    return ({ urine: "Urine", hair: "Hair", nail: "Nail", oral_fluid: "Oral fluid" })[value] || value || "Not listed";
  }

  function setVerifyMessage(message, className = "") {
    if (!verifyResult) return;
    verifyResult.className = `verify-result ${className}`.trim();
    verifyResult.innerHTML = message;
  }

  async function verifyRecord(key, lastName, dob) {
    setVerifyMessage("Checking the saved record…");
    try {
      const response = await fetch("/api/drug-tests/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, lastName, dob })
      });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 404 || payload.found === false) {
        setVerifyMessage("No record matched all three entries. Check the key, donor last name, and date of birth.", "not-found");
        return;
      }
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Verification failed.");

      setVerifyMessage(`
        <strong>Matching saved record found.</strong><br>
        Reference: <code>${escapeHtml(payload.referenceNumber)}</code><br>
        Verification Key: <code>${escapeHtml(payload.verificationKey)}</code><br>
        Specimen ID: <code>${escapeHtml(payload.specimenId)}</code><br>
        Donor Initials: ${escapeHtml(payload.donorInitials || "Not listed")}<br>
        Specimen: ${escapeHtml(specimenLabel(payload.specimenType))}<br>
        Collection Date: ${formatDate(payload.collectionDate)}<br>
        Saved Result Status: <strong>${escapeHtml(payload.resultStatusLabel || "Pending")}</strong><br>
        Report Date: ${formatDate(payload.reportDate)}<br>
        <small>${escapeHtml(payload.notice || "The signed source report controls if it differs from this summary.")}</small>`, "found");
    } catch (error) {
      setVerifyMessage(escapeHtml(error.message || "The record could not be verified right now."), "not-found");
    }
  }

  if (verifyForm && verifyInput && verifyLastName && verifyDob) {
    verifyForm.addEventListener("submit", event => {
      event.preventDefault();
      const key = verifyInput.value.trim();
      const lastName = verifyLastName.value.trim();
      const dob = verifyDob.value;
      if (!key || !lastName || !dob) {
        setVerifyMessage("Enter the record key, donor last name, and donor date of birth.", "not-found");
        return;
      }
      verifyRecord(key, lastName, dob);
    });
  }
});
