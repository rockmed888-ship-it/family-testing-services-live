(function () {
  const output = document.getElementById("records-output");
  const searchForm = document.getElementById("record-search-form");
  const searchInput = document.getElementById("record-search");
  const clearSearch = document.getElementById("clear-search");

  const statusLabels = {
    pending: "Pending",
    screen_negative: "Screen negative — preliminary",
    presumptive_positive: "Presumptive positive",
    negative: "Negative",
    confirmed_positive: "Confirmed positive",
    invalid: "Invalid",
    cancelled: "Cancelled",
    rejected: "Rejected",
    refusal: "Refusal"
  };

  const specimenLabels = {
    urine: "Urine",
    hair: "Hair",
    nail: "Nail",
    oral_fluid: "Oral fluid"
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function fmtDate(value) {
    if (!value) return "—";
    const parts = String(value).split("-");
    return parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : esc(value);
  }

  function fmtDateTime(value) {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? esc(value) : esc(parsed.toLocaleString());
  }

  function row(record) {
    const status = statusLabels[record.resultStatus] || record.resultStatus || "Pending";
    return `
      <tr>
        <td>
          <strong>${esc(record.referenceNumber)}</strong><br>
          <small>${esc(record.verificationKey)}</small><br>
          <small>${esc(record.specimenId)}</small>
        </td>
        <td>
          <strong>${esc(record.donorName || "—")}</strong><br>
          <small>DOB: ${fmtDate(record.dob)}</small>
        </td>
        <td>
          ${esc(specimenLabels[record.specimenType] || record.specimenType || "—")}<br>
          <small>${fmtDate(record.collectionDate)} ${esc(record.collectionTime || "")}</small>
        </td>
        <td>
          <span class="record-status status-${esc(record.resultStatus || "pending")}">${esc(status)}</span><br>
          <small>${esc(record.labAccession || "No lab accession entered")}</small>
        </td>
        <td>${esc(record.clientName || record.reason || "—")}</td>
        <td>${fmtDateTime(record.updatedAt)}</td>
        <td class="record-row-actions">
          <a href="documents/proof-of-testing.html?id=${encodeURIComponent(record.recordId)}">Edit</a>
          <a href="documents/print-test.html?id=${encodeURIComponent(record.recordId)}">Print</a>
        </td>
      </tr>`;
  }

  async function loadRecords(query = "") {
    output.innerHTML = "<p>Loading saved records…</p>";
    try {
      const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
      const payload = await FTSAdmin.request(`/api/admin/drug-tests${suffix}`);
      const records = payload.records || [];
      if (!records.length) {
        output.innerHTML = `<div class="records-toolbar-note">No saved records matched${query ? ` “${esc(query)}”` : ""}.</div>`;
        return;
      }
      output.innerHTML = `
        <div class="records-toolbar-note">${records.length} saved record${records.length === 1 ? "" : "s"}. Printing opens the version currently stored on the server.</div>
        <div class="records-table-wrap">
          <table class="records-table">
            <thead>
              <tr><th>Reference / IDs</th><th>Donor</th><th>Collection</th><th>Result</th><th>Client / Reason</th><th>Updated</th><th>Actions</th></tr>
            </thead>
            <tbody>${records.map(row).join("")}</tbody>
          </table>
        </div>`;
    } catch (error) {
      output.innerHTML = `<p class="error-text">${esc(error.message || "Saved records could not be loaded.")}</p>`;
      if (error.status === 401) window.location.replace("index.html");
    }
  }

  async function initialize() {
    const authenticated = await FTSAdmin.requireAuth("index.html");
    if (!authenticated) return;
    await loadRecords();
  }

  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    loadRecords(searchInput.value.trim());
  });

  clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    loadRecords();
  });

  document.addEventListener("DOMContentLoaded", initialize);
})();
