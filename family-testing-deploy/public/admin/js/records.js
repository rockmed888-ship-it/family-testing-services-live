(function () {
  const DRAFT_KEY = "fts_drug_screen_current_draft";

  function fmtDate(value) {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
  }

  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function prepareDraft(record) {
    const draft = { ...record };
    const specimenType = String(record.specimenType || "").toLowerCase();

    draft.specimenFingernails = specimenType.includes("fingernail");
    draft.specimenToenails = specimenType.includes("toenail");
    draft.all10Fingernails = specimenType.includes("all 10");
    draft.partialClip = specimenType.includes("partial clip");

    if (draft.partialClip && !draft.partialClipNotes) {
      const marker = "partial clip:";
      const position = specimenType.indexOf(marker);

      if (position >= 0) {
        draft.partialClipNotes = String(record.specimenType)
          .substring(position + marker.length)
          .trim();
      }
    }

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    window.location.href = "documents/proof-of-testing.html";
  }

  function row(record, index) {
    return `
      <tr>
        <td>
          <strong>${esc(record.verificationKey)}</strong><br>
          <small>${esc(record.specimenId)}</small>
        </td>

        <td>
          ${esc(record.donorName)}
          ${record.donorLast4
            ? `<br><small>Last 4: ${esc(record.donorLast4)}</small>`
            : ""}
        </td>

        <td>
          ${esc(record.collectionDate)}
          ${esc(record.collectionTime)}
        </td>

        <td>${esc(record.reason)}</td>
        <td>${esc(record.collector)}</td>
        <td>${esc(fmtDate(record.savedAt))}</td>

        <td>
          <button
            type="button"
            class="print-record-btn"
            data-record-index="${index}">
            Print Filled Form
          </button>
        </td>
      </tr>`;
  }

  async function loadRecords() {
    const output = document.getElementById("records-output");
    if (!output) return;

    output.innerHTML = "<p>Loading saved records...</p>";

    try {
      const response = await fetch("/api/admin/drug-screens", {
        headers: FTSAdmin.authHeaders()
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Could not load records");
      }

      const records = payload.records || [];

      if (!records.length) {
        output.innerHTML =
          "<p>No saved drug screen collection records yet.</p>";
        return;
      }

      output.innerHTML = `
        <div class="records-toolbar-note">
          ${records.length} saved collection record${records.length === 1 ? "" : "s"}.
          Select <strong>Print Filled Form</strong> to reopen a saved record
          with its information already entered.
        </div>

        <div class="records-table-wrap">
          <table class="records-table">
            <thead>
              <tr>
                <th>Verification / Specimen</th>
                <th>Donor</th>
                <th>Collection</th>
                <th>Reason</th>
                <th>Collector</th>
                <th>Saved</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              ${records.map(row).join("")}
            </tbody>
          </table>
        </div>`;

      output.querySelectorAll(".print-record-btn").forEach(button => {
        button.addEventListener("click", () => {
          const index = Number(button.dataset.recordIndex);
          const record = records[index];

          if (!record) {
            alert("That saved record could not be opened.");
            return;
          }

          prepareDraft(record);
        });
      });
    } catch (err) {
      output.innerHTML = `
        <p class="error-text">
          ${esc(err.message || "Could not load records.")}
        </p>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (FTSAdmin.requireAuth("index.html")) {
      loadRecords();
    }
  });
})();
