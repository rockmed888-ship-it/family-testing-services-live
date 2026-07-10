(function () {
  function fmtDate(value) {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
  }

  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function row(record) {
    return `
      <tr>
        <td><strong>${esc(record.verificationKey)}</strong><br><small>${esc(record.specimenId)}</small></td>
        <td>${esc(record.donorName)}${record.donorLast4 ? `<br><small>Last 4: ${esc(record.donorLast4)}</small>` : ""}</td>
        <td>${esc(record.collectionDate)} ${esc(record.collectionTime)}</td>
        <td>${esc(record.reason)}</td>
        <td>${esc(record.collector)}</td>
        <td>${esc(fmtDate(record.savedAt))}</td>
      </tr>`;
  }

  async function loadRecords() {
    const output = document.getElementById("records-output");
    if (!output) return;
    output.innerHTML = "<p>Loading saved records...</p>";

    try {
      const response = await fetch("/api/admin/drug-screens", { headers: FTSAdmin.authHeaders() });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not load records");
      const records = payload.records || [];
      if (!records.length) {
        output.innerHTML = "<p>No saved drug screen collection records yet.</p>";
        return;
      }
      output.innerHTML = `
        <div class="records-toolbar-note">${records.length} saved collection record${records.length === 1 ? "" : "s"}. Public verification confirms saved collection records only, not lab results.</div>
        <div class="records-table-wrap">
          <table class="records-table">
            <thead><tr><th>Verification / Specimen</th><th>Donor</th><th>Collection</th><th>Reason</th><th>Collector</th><th>Saved</th></tr></thead>
            <tbody>${records.map(row).join("")}</tbody>
          </table>
        </div>`;
    } catch (err) {
      output.innerHTML = `<p class="error-text">${esc(err.message || "Could not load records.")}</p>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (FTSAdmin.requireAuth("index.html")) loadRecords();
  });
})();
