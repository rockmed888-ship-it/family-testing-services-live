(function () {
  const output = document.getElementById("print-output");
  const status = document.getElementById("print-status");
  const printButton = document.getElementById("print-button");
  const editLink = document.getElementById("edit-link");
  let record = null;
  let printEventRecorded = false;

  const labels = {
    pending: "PENDING / NO RESULT ENTERED",
    screen_negative: "SCREEN NEGATIVE — PRELIMINARY",
    presumptive_positive: "PRESUMPTIVE POSITIVE — CONFIRMATION PENDING",
    negative: "NEGATIVE",
    confirmed_positive: "CONFIRMED POSITIVE",
    invalid: "INVALID",
    cancelled: "CANCELLED",
    rejected: "REJECTED FOR TESTING",
    refusal: "REFUSAL / COLLECTION NOT COMPLETED"
  };

  const specimenLabels = {
    urine: "Urine",
    hair: "Hair",
    nail: "Nail",
    oral_fluid: "Oral Fluid"
  };

  const sourceLabels = {
    not_entered: "Not entered",
    onsite_screen: "Onsite screening device",
    laboratory_report: "Laboratory report",
    mro_verified: "MRO-verified report"
  };

  const analyteLabels = {
    not_tested: "Not tested / not entered",
    negative: "Negative",
    presumptive_positive: "Presumptive positive",
    confirmed_positive: "Confirmed positive",
    invalid: "Invalid"
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function shown(value, fallback = "—") {
    const text = String(value ?? "").trim();
    return esc(text || fallback);
  }

  function yesNo(value) {
    return value ? "Yes" : "No";
  }

  function formatDate(value) {
    if (!value) return "—";
    const parts = String(value).split("-");
    if (parts.length === 3) return `${parts[1]}/${parts[2]}/${parts[0]}`;
    return shown(value);
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? shown(value) : esc(parsed.toLocaleString());
  }

  function field(label, value, className = "") {
    return `<div class="print-field ${className}"><span>${esc(label)}</span><strong>${shown(value)}</strong></div>`;
  }

  function specimenDetails(item) {
    if (item.specimenType === "urine") {
      return [
        field("Temperature", item.urineTemperature),
        field("Split Specimen", yesNo(item.urineSplit))
      ].join("");
    }
    if (item.specimenType === "hair") {
      return [
        field("Hair Source", item.hairSource),
        field("Body Location", item.hairLocation),
        field("Approx. Length", item.hairLength),
        field("Hair Color", item.hairColor),
        field("Treatment / Condition", item.hairTreatment, "wide")
      ].join("");
    }
    if (item.specimenType === "nail") {
      return [
        field("Nail Source", item.nailSource),
        field("Condition / Notes", item.nailCondition, "wide")
      ].join("");
    }
    return [
      field("Collection Device", item.oralDevice),
      field("Volume / Adequacy", item.oralCollectionIndicator)
    ].join("");
  }

  function analyteTable(item) {
    const analytes = (item.analytes || []).filter(analyte => analyte.name);
    if (!analytes.length) {
      return `<p class="print-empty">No analyte-level results were entered. Refer to the identified screening device or laboratory report.</p>`;
    }
    return `
      <table class="print-results-table">
        <thead><tr><th>Drug / Analyte</th><th>Cutoff</th><th>Result</th><th>Notes</th></tr></thead>
        <tbody>${analytes.map(analyte => `
          <tr>
            <td>${shown(analyte.name)}</td>
            <td>${shown(analyte.cutoff)}</td>
            <td class="result-${esc(analyte.result)}">${shown(analyteLabels[analyte.result] || analyte.result)}</td>
            <td>${shown(analyte.notes)}</td>
          </tr>`).join("")}</tbody>
      </table>`;
  }

  function pageHeader(item, documentTitle) {
    return `
      <header class="print-form-header">
        <div class="print-brand">
          <img src="../../images/logo.png" alt="Family Testing Services">
          <div>
            <h1>Family Testing Services</h1>
            <p>1801 2nd Avenue North, Suite 204 · Bessemer, AL 35020<br>Online scheduling only</p>
          </div>
        </div>
        <div class="print-document-meta">
          <strong>${esc(documentTitle)}</strong>
          <span>Reference: ${shown(item.referenceNumber)}</span>
          <span>Specimen: ${shown(item.specimenId)}</span>
          <span>Revision: ${shown(item.revision)}</span>
        </div>
      </header>`;
  }

  function collectionPage(item) {
    return `
      <article class="print-sheet">
        ${pageHeader(item, "NON-DOT COLLECTION & CHAIN OF CUSTODY")}
        <div class="print-title-block">
          <h2>${shown(specimenLabels[item.specimenType])} Drug Test Collection Record</h2>
          <p>This form documents a non-DOT collection. It is not a federal Custody and Control Form.</p>
        </div>

        <section class="print-section">
          <h3>A. Donor and Request Information</h3>
          <div class="print-grid three">
            ${field("Donor Full Legal Name", item.donorName, "wide-2")}
            ${field("Date of Birth", formatDate(item.dob))}
            ${field("Donor ID / Last 4", item.donorIdLast4)}
            ${field("Phone", item.donorPhone)}
            ${field("Email", item.donorEmail)}
            ${field("Address", item.donorAddress, "wide")}
            ${field("Requesting Client / Agency", item.clientName, "wide-2")}
            ${field("Account / Case Number", item.clientAccount)}
            ${field("Authorized Contact / DER", item.clientContact)}
            ${field("Reason for Test", item.reason)}
            ${field("Authorization / Policy Notes", item.authorityNotes, "wide")}
          </div>
        </section>

        <section class="print-section">
          <h3>B. Specimen Collection</h3>
          <div class="print-grid four">
            ${field("Specimen Type", specimenLabels[item.specimenType])}
            ${field("Test Panel / Service", item.testPanel)}
            ${field("Collection Date", formatDate(item.collectionDate))}
            ${field("Collection Time", item.collectionTime)}
            ${field("Collector", item.collector)}
            ${field("Collector ID / Credential", item.collectorId)}
            ${field("Collection Site", item.collectionSite, "wide-2")}
            ${field("Quantity / Amount", item.specimenQuantity)}
            ${field("Kit Lot", item.kitLot)}
            ${field("Kit Expiration", formatDate(item.kitExpiration))}
            ${field("Observed", yesNo(item.observedCollection))}
            ${field("Sealed / Seal Intact", yesNo(item.sealIntact))}
            ${specimenDetails(item)}
            ${field("Collection Comments / Unusual Circumstances", item.collectionNotes, "wide")}
          </div>
        </section>

        <section class="print-section">
          <h3>C. Laboratory Referral / Transfer</h3>
          <div class="print-grid three">
            ${field("Laboratory", item.labName, "wide-2")}
            ${field("Accession / Report Number", item.labAccession)}
            ${field("Laboratory Address", item.labAddress, "wide")}
            ${field("Shipped Date", formatDate(item.shippedDate))}
            ${field("Carrier", item.carrier)}
            ${field("Tracking Number", item.trackingNumber)}
            ${field("Received Date", formatDate(item.receivedDate))}
          </div>
        </section>

        <section class="print-section certification-section">
          <h3>D. Consent and Collection Certification</h3>
          <p>The donor authorizes collection and testing of the identified specimen and release of the result to the requesting party identified above, subject to applicable law, policy, and any separate written release. The donor certifies that the specimen is their own. The collector certifies that the specimen was identified, collected, sealed, and documented according to the collection kit instructions and applicable non-DOT procedure.</p>
          <div class="print-grid four">
            ${field("Consent Recorded", yesNo(item.donorConsent))}
            ${field("Consent Date", formatDate(item.consentDate))}
            ${field("Consent Time", item.consentTime)}
            ${field("Typed Donor Name", item.donorSignatureName)}
          </div>
          <div class="signature-grid">
            <div><span class="signature-line"></span><small>Donor Signature / Date</small></div>
            <div><span class="signature-line"></span><small>Collector / Witness Signature / Date</small></div>
          </div>
        </section>

        <footer class="print-footer">
          <span>Verification Key: ${shown(item.verificationKey)}</span>
          <span>Saved: ${formatDateTime(item.updatedAt)}</span>
          <span>Page 1 of 2</span>
        </footer>
      </article>`;
  }

  function resultPage(item) {
    const resultClass = `status-${item.resultStatus || "pending"}`;
    return `
      <article class="print-sheet page-break">
        ${pageHeader(item, "NON-DOT DRUG TEST RESULT RECORD")}
        <div class="result-banner ${resultClass}">
          <h2>${shown(labels[item.resultStatus] || "PENDING")}</h2>
          <p>Source: ${shown(sourceLabels[item.resultSource] || item.resultSource)}</p>
        </div>

        <section class="print-section">
          <h3>A. Record Identification</h3>
          <div class="print-grid four">
            ${field("Donor", item.donorName, "wide-2")}
            ${field("Date of Birth", formatDate(item.dob))}
            ${field("Collection Date", formatDate(item.collectionDate))}
            ${field("Specimen Type", specimenLabels[item.specimenType])}
            ${field("Specimen ID", item.specimenId)}
            ${field("Reference Number", item.referenceNumber)}
            ${field("Lab Accession / Report", item.labAccession)}
          </div>
        </section>

        <section class="print-section">
          <h3>B. Panel / Analyte Results</h3>
          ${analyteTable(item)}
        </section>

        <section class="print-section">
          <h3>C. Result Source and Review</h3>
          <div class="print-grid three">
            ${field("Overall Status", labels[item.resultStatus] || item.resultStatus, "wide")}
            ${field("Result Source", sourceLabels[item.resultSource] || item.resultSource)}
            ${field("Report Date", formatDate(item.reportDate))}
            ${field("Confirmation Method", item.confirmationMethod)}
            ${field("Laboratory", item.labName, "wide-2")}
            ${field("Reviewer", item.reviewerName)}
            ${field("Reviewer Title / Credential", item.reviewerTitle)}
            ${field("MRO, if applicable", item.mroName)}
            ${field("Result Comments", item.resultNotes, "wide")}
          </div>
        </section>

        <section class="print-section legal-result-note">
          <h3>D. Interpretation and Control of Record</h3>
          <p><strong>Screen negative</strong> and <strong>presumptive positive</strong> are preliminary screening descriptions. A presumptive positive is not a final positive result until the required confirmation process is completed. The signed laboratory report or MRO report controls if it differs from this website-generated summary. This form does not independently establish legal admissibility, fitness for duty, impairment, diagnosis, or treatment.</p>
          <div class="signature-grid">
            <div><span class="signature-line"></span><small>Authorized Reviewer Signature / Date</small></div>
            <div><span class="signature-line"></span><small>Receiving Party Acknowledgment / Date</small></div>
          </div>
        </section>

        <footer class="print-footer">
          <span>Verification Key: ${shown(item.verificationKey)}</span>
          <span>Record Revision: ${shown(item.revision)}</span>
          <span>Page 2 of 2</span>
        </footer>
      </article>`;
  }

  async function recordPrintEvent() {
    if (!record || printEventRecorded) return;
    try {
      await FTSAdmin.request(`/api/admin/drug-tests/${encodeURIComponent(record.recordId)}/printed`, {
        method: "POST",
        body: "{}"
      });
      printEventRecorded = true;
    } catch (error) {
      status.textContent = "The record loaded, but the print audit could not be updated.";
      status.className = "record-save-status warning";
    }
  }

  async function printSavedRecord() {
    await recordPrintEvent();
    window.print();
  }

  async function initialize() {
    const authenticated = await FTSAdmin.requireAuth("../index.html");
    if (!authenticated) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) {
      output.innerHTML = '<section class="print-error">No saved record ID was provided.</section>';
      printButton.disabled = true;
      return;
    }

    try {
      const payload = await FTSAdmin.request(`/api/admin/drug-tests/${encodeURIComponent(id)}`);
      record = payload.record;
      editLink.href = `proof-of-testing.html?id=${encodeURIComponent(record.recordId)}`;
      document.title = `${record.referenceNumber} | Family Testing Services`;
      output.innerHTML = collectionPage(record) + resultPage(record);
      status.textContent = `Loaded saved record ${record.referenceNumber}`;
      status.className = "record-save-status saved";
      if (params.get("autoprint") === "1") {
        await recordPrintEvent();
        window.setTimeout(() => window.print(), 300);
      }
    } catch (error) {
      output.innerHTML = `<section class="print-error">${esc(error.message || "The saved record could not be loaded.")}</section>`;
      printButton.disabled = true;
      if (error.status === 401) window.location.replace("../index.html");
    }
  }

  printButton.addEventListener("click", printSavedRecord);
  document.addEventListener("DOMContentLoaded", initialize);
})();
