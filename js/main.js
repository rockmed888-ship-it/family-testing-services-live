// Family Testing Services — review button (display only, no submission)

document.addEventListener("DOMContentLoaded", () => {
  const reviewBtn = document.getElementById("leave-review-btn");
  const modal = document.getElementById("review-modal");
  const closeBtn = document.getElementById("modal-close");

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
});
