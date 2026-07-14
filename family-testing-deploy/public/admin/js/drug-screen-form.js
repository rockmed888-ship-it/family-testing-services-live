(function () {
  const form = document.getElementById("drug-test-form");
  const statusOutput = document.getElementById("record-save-status");
  const validationOutput = document.getElementById("validation-summary");
  const analyteRows = document.getElementById("analyte-rows");
  let currentRecord = null;
  let dirty = false;

  const commonAnalytes = [
    "Amphetamines",
    "Methamphetamine",
    "Barbiturates",
    "Benzodiazepines",
    "Buprenorphine",
    "Cocaine metabolite",
    "Marijuana metabolite (THC)",
    "Methadone",
    "Opiates",
    "Oxycodone",
    "Phencyclidine (PCP)",
    "Fentanyl"
  ];

  function field(name) {
    return form.querySelector(`[data-field="${name}"]`);
  }

  function value(name) {
    const element = field(name);
    if (!element) return "";
    if (element.type === "checkbox") return element.checked;
    return element.value.trim();
  }

  function setValue(name, nextValue) {
    const element = field(name);
    if (!element || nextValue === undefined || nextValue === null) return;
    if (element.type === "checkbox") element.checked = Boolean(nextValue);
    else element.value = String(nextValue);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function localTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function setStatus(message, kind = "") {
    statusOutput.textContent = message;
    statusOutput.className = `record-save-status ${kind}`.trim();
  }

  function showValidation(errors) {
    if (!errors.length) {
      validationOutput.hidden = true;
      validationOutput.innerHTML = "";
      return;
    }
    validationOutput.hidden = false;
    validationOutput.innerHTML = `<strong>Please correct the following:</strong><ul>${errors.map(error => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`;
    validationOutput.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function escapeHtml(input) {
    return String(input || "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function updateSpecimenFields() {
    const selected = value("specimenType") || "urine";
    document.querySelectorAll(".specimen-detail").forEach(section => {
      section.hidden = section.dataset.specimen !== selected;
    });
  }

  function analyteRow(item = {}) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input class="analyte-name" type="text" value="${escapeHtml(item.name || "")}" placeholder="Drug or analyte"></td>
      <td><input class="analyte-cutoff" type="text" value="${escapeHtml(item.cutoff || "")}" placeholder="Lab/device cutoff"></td>
      <td>
        <select class="analyte-result">
          <option value="not_tested">Not tested / not entered</option>
          <option value="negative">Negative</option>
          <option value="presumptive_positive">Presumptive positive</option>
          <option value="confirmed_positive">Confirmed positive</option>
          <option value="invalid">Invalid</option>
        </select>
      </td>
      <td><input class="analyte-notes" type="text" value="${escapeHtml(item.notes || "")}" placeholder="Optional"></td>
      <td><button class="remove-row" type="button" aria-label="Remove analyte">×</button></td>`;
    row.querySelector(".analyte-result").value = item.result || "not_tested";
    row.querySelector(".remove-row").addEventListener("click", () => {
      row.remove();
      dirty = true;
    });
    row.querySelectorAll("input, select").forEach(control => control.addEventListener("input", () => { dirty = true; }));
    analyteRows.appendChild(row);
  }

  function collectAnalytes() {
    return [...analyteRows.querySelectorAll("tr")].map(row => ({
      name: row.querySelector(".analyte-name").value.trim(),
      cutoff: row.querySelector(".analyte-cutoff").value.trim(),
      result: row.querySelector(".analyte-result").value,
      notes: row.querySelector(".analyte-notes").value.trim()
    })).filter(item => item.name);
  }

  function loadAnalytes(items) {
    analyteRows.innerHTML = "";
    (items && items.length ? items : [{ name: "", result: "not_tested" }]).forEach(analyteRow);
  }

  function collectRecord() {
    const names = [
      "recordId", "referenceNumber", "verificationKey", "specimenId",
      "donorName", "dob", "donorIdLast4", "donorPhone", "donorEmail", "donorAddress",
      "clientName", "clientAccount", "clientContact", "reason", "authorityNotes",
      "specimenType", "testPanel", "collectionDate", "collectionTime", "collector", "collectorId",
      "collectionSite", "observedCollection", "specimenQuantity", "kitLot", "kitExpiration",
      "sealIntact", "collectionNotes", "urineTemperature", "urineSplit", "hairSource",
      "hairLocation", "hairLength", "hairColor", "hairTreatment", "nailSource", "nailCondition",
      "oralDevice", "oralCollectionIndicator", "donorConsent", "consentDate", "consentTime",
      "donorSignatureName", "witnessName", "labName", "labAddress", "labAccession", "shippedDate",
      "carrier", "trackingNumber", "receivedDate", "resultStatus", "resultSource", "reportDate",
      "confirmationMethod", "reviewerName", "reviewerTitle", "mroName", "resultNotes"
    ];
    const record = Object.fromEntries(names.map(name => [name, value(name)]));
    record.analytes = collectAnalytes();
    return record;
  }

  function validate(record) {
    const errors = [];
    const analyteResults = new Set(record.analytes.map(item => item.result));
    const consentOptionalStatuses = new Set(["cancelled", "rejected", "refusal"]);

    if (!record.donorName) errors.push("Donor full legal name is required.");
    if (!record.dob) errors.push("Date of birth is required.");
    if (!record.reason) errors.push("Reason for test is required.");
    if (!record.collectionDate) errors.push("Collection/attempt date is required.");
    if (!record.collectionTime) errors.push("Collection/attempt time is required.");
    if (!record.collector) errors.push("Collector name is required.");
    if (!record.donorConsent && !consentOptionalStatuses.has(record.resultStatus)) {
      errors.push("Consent / authorization is required unless the record is cancelled, rejected, or a refusal.");
    }

    const collectionNotCompleted = consentOptionalStatuses.has(record.resultStatus);
    if (!collectionNotCompleted) {
      if (!record.specimenQuantity) errors.push("Specimen quantity / amount is required for a completed collection.");
      if (!record.sealIntact) errors.push("Confirm that the completed specimen was sealed and the seal was intact.");
      if (record.specimenType === "hair") {
        if (!record.hairSource) errors.push("Hair source is required.");
        if (!record.hairLocation) errors.push("Hair collection location on the body is required.");
      }
      if (record.specimenType === "nail" && !record.nailSource) errors.push("Nail source is required.");
      if (record.specimenType === "oral_fluid" && !record.oralDevice) errors.push("Oral-fluid collection device / manufacturer is required.");
    }

    if (record.resultStatus === "screen_negative" && record.resultSource !== "onsite_screen") {
      errors.push("Screen negative — preliminary must use Onsite Screen as its source.");
    }
    if (record.resultStatus === "presumptive_positive" && !["onsite_screen", "laboratory_report"].includes(record.resultSource)) {
      errors.push("Presumptive positive requires an onsite or laboratory screen source.");
    }
    if (record.resultStatus === "negative" && !["laboratory_report", "mro_verified"].includes(record.resultSource)) {
      errors.push("A final negative requires a Laboratory Report or MRO-Verified Report. Use Screen negative — preliminary for an onsite test.");
    }
    if (record.resultStatus === "confirmed_positive" && !["laboratory_report", "mro_verified"].includes(record.resultSource)) {
      errors.push("Confirmed positive requires a Laboratory Report or MRO-Verified Report.");
    }

    if (["negative", "confirmed_positive"].includes(record.resultStatus)) {
      if (!record.reportDate) errors.push("Report date is required for a final result.");
      if (!record.reviewerName) errors.push("Reviewer name is required for a final result.");
      if (record.resultSource === "laboratory_report") {
        if (!record.labName) errors.push("Laboratory name is required for a laboratory result.");
        if (!record.labAccession) errors.push("Laboratory accession/report number is required for a laboratory result.");
      }
      if (record.resultSource === "mro_verified" && !record.mroName) {
        errors.push("MRO name is required for an MRO-verified result.");
      }
    }
    if (record.resultStatus === "confirmed_positive" && !record.confirmationMethod) {
      errors.push("Confirmation method is required for a confirmed positive result.");
    }

    if (["screen_negative", "negative"].includes(record.resultStatus) &&
        (analyteResults.has("presumptive_positive") || analyteResults.has("confirmed_positive"))) {
      errors.push("The overall negative status conflicts with a positive analyte result.");
    }
    if (record.resultStatus === "presumptive_positive" && record.analytes.length && !analyteResults.has("presumptive_positive")) {
      errors.push("Mark at least one entered analyte presumptive positive.");
    }
    if (record.resultStatus === "confirmed_positive" && record.analytes.length && !analyteResults.has("confirmed_positive")) {
      errors.push("Mark at least one entered analyte confirmed positive.");
    }
    return errors;
  }

  function applyRecord(record) {
    currentRecord = record;
    Object.entries(record).forEach(([name, nextValue]) => {
      if (name !== "analytes") setValue(name, nextValue);
    });
    loadAnalytes(record.analytes || []);
    updateSpecimenFields();
    field("specimenType").disabled = Boolean(record.createdAt);
    dirty = false;
  }

  async function reserveNewRecord(specimenType) {
    const payload = await FTSAdmin.request("/api/admin/drug-tests/reserve", {
      method: "POST",
      body: JSON.stringify({ specimenType })
    });
    applyRecord({
      recordId: payload.recordId,
      referenceNumber: payload.referenceNumber,
      verificationKey: payload.verificationKey,
      specimenId: payload.specimenId,
      specimenType,
      collectionDate: today(),
      collectionTime: localTime(),
      consentDate: today(),
      consentTime: localTime(),
      collectionSite: "Family Testing Services, 1801 2nd Avenue North, Suite 204, Bessemer, AL 35020",
      resultStatus: "pending",
      resultSource: "not_entered",
      observedCollection: false,
      sealIntact: false,
      urineSplit: false,
      donorConsent: false,
      analytes: []
    });
  }

  async function loadExisting(id) {
    setStatus("Loading saved record…");
    const payload = await FTSAdmin.request(`/api/admin/drug-tests/${encodeURIComponent(id)}`);
    applyRecord(payload.record);
    setStatus(`Loaded ${payload.record.referenceNumber}`, "saved");
  }

  async function saveRecord(openPrintPage) {
    const record = collectRecord();
    const errors = validate(record);
    showValidation(errors);
    if (errors.length) {
      setStatus("Record not saved. Correct the highlighted requirements.", "error");
      return;
    }

    document.querySelectorAll(".btn-save, .btn-print").forEach(button => { button.disabled = true; });
    setStatus("Saving the record to the system…");
    try {
      const payload = await FTSAdmin.request("/api/admin/drug-tests", {
        method: "POST",
        body: JSON.stringify(record)
      });
      applyRecord(payload.record);
      setStatus(`Saved ${payload.record.referenceNumber}`, "saved");
      showValidation([]);
      if (openPrintPage) {
        window.location.href = `print-test.html?id=${encodeURIComponent(payload.record.recordId)}&autoprint=1`;
      }
    } catch (error) {
      const messages = error.details && error.details.length ? error.details : [error.message || "The record could not be saved."];
      showValidation(messages);
      setStatus("The record was not saved.", "error");
      if (error.status === 401) window.location.replace("../index.html");
    } finally {
      document.querySelectorAll(".btn-save, .btn-print").forEach(button => { button.disabled = false; });
    }
  }

  async function initialize() {
    const authenticated = await FTSAdmin.requireAuth("../index.html");
    if (!authenticated) return;

    const params = new URLSearchParams(window.location.search);
    const recordId = params.get("id");
    const requestedSpecimen = params.get("specimen");
    const specimenType = ["urine", "hair", "nail", "oral_fluid"].includes(requestedSpecimen) ? requestedSpecimen : "urine";

    try {
      if (recordId) await loadExisting(recordId);
      else await reserveNewRecord(specimenType);
    } catch (error) {
      setStatus(error.message || "The form could not be initialized.", "error");
      return;
    }

    form.querySelectorAll("input, select, textarea").forEach(control => {
      control.addEventListener("input", () => { dirty = true; });
      control.addEventListener("change", () => { dirty = true; });
    });
    field("specimenType").addEventListener("change", async () => {
      updateSpecimenFields();
      dirty = true;
      if (currentRecord?.createdAt) return;
      try {
        const payload = await FTSAdmin.request("/api/admin/drug-tests/reserve", {
          method: "POST",
          body: JSON.stringify({ specimenType: value("specimenType") })
        });
        setValue("specimenId", payload.specimenId);
        currentRecord.specimenId = payload.specimenId;
      } catch (error) {
        setStatus(error.message || "The specimen ID could not be updated.", "error");
      }
    });

    document.getElementById("add-analyte-btn").addEventListener("click", () => analyteRow());
    document.getElementById("load-common-panel-btn").addEventListener("click", () => {
      if (collectAnalytes().length && !window.confirm("Replace the current analyte rows with common names? No result will be assumed.")) return;
      analyteRows.innerHTML = "";
      commonAnalytes.forEach(name => analyteRow({ name, result: "not_tested" }));
      dirty = true;
    });
    document.getElementById("save-record-btn").addEventListener("click", () => saveRecord(false));
    document.getElementById("save-print-btn").addEventListener("click", () => saveRecord(true));
    document.getElementById("bottom-save-btn").addEventListener("click", () => saveRecord(false));
    document.getElementById("bottom-print-btn").addEventListener("click", () => saveRecord(true));

    window.addEventListener("beforeunload", event => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });

  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
