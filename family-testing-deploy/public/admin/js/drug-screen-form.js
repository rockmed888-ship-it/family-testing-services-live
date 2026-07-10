(function () {
  const LOCAL_RECORDS_KEY = "fts_drug_screen_records";
  const DRAFT_KEY = "fts_drug_screen_current_draft";

  function randomChunk(length) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => chars[b % chars.length]).join("");
  }

  function dateStamp() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
  }

  function todayForDisplay() {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
  }

  function currentTimeForDisplay() {
    return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function setTextEverywhere(idList, value) {
    idList.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  }

  function getText(field) {
    const el = document.querySelector(`[data-field="${field}"]`);
    if (!el) return "";
    if (el.type === "checkbox") return el.checked ? "yes" : "";
    return (el.textContent || el.value || "").trim();
  }

  function setText(field, value) {
    const el = document.querySelector(`[data-field="${field}"]`);
    if (!el || value === undefined || value === null) return;
    if (el.type === "checkbox") {
      el.checked = value === true || value === "yes" || value === "true";
    } else {
      el.textContent = value;
    }
  }

  function computeSpecimenType() {
    const types = [];
    if (getText("specimenFingernails")) types.push("Fingernails");
    if (getText("specimenToenails")) types.push("Toenails");
    if (getText("all10Fingernails")) types.push("All 10 fingernails clipped");
    if (getText("partialClip")) types.push(`Partial clip${getText("partialClipNotes") ? `: ${getText("partialClipNotes")}` : ""}`);
    return types.join("; ");
  }

  function readLocalRecords() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_RECORDS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveLocalRecord(record) {
    const records = readLocalRecords();
    const idx = records.findIndex(item => item.verificationKey === record.verificationKey || item.specimenId === record.specimenId);
    if (idx >= 0) records[idx] = { ...records[idx], ...record };
    else records.unshift(record);
    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(records.slice(0, 250)));
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(collectRecord(false)));
    } catch {
      // Ignore draft save failures.
    }
  }

  function loadDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (!draft) return null;
      return draft;
    } catch {
      return null;
    }
  }

  function collectRecord(includeTimestamp = true) {
    const record = {
      verificationKey: window.FTS_CURRENT_VERIFY_KEY,
      specimenId: window.FTS_CURRENT_SPECIMEN_ID,
      donorName: getText("donorName"),
      dob: getText("dob"),
      donorLast4: getText("donorLast4"),
      donorPhone: getText("donorPhone"),
      reason: getText("reason"),
      collectionDate: getText("collectionDate"),
      collectionTime: getText("collectionTime"),
      collector: getText("collector"),
      specimenType: computeSpecimenType(),
      specimenWeight: getText("specimenWeight"),
      pouchId: getText("pouchId"),
      wash1Date: getText("wash1Date"),
      wash1Time: getText("wash1Time"),
      wash2Date: getText("wash2Date"),
      wash2Time: getText("wash2Time"),
      wash3Date: getText("wash3Date"),
      wash3Time: getText("wash3Time"),
      washWitness: getText("washWitness"),
      nailClipDate: getText("nailClipDate"),
      shipDate: getText("shipDate"),
      courierTracking: getText("courierTracking"),
      shippedBy: getText("shippedBy"),
      notes: "Saved from proof-of-testing printable form. Verification confirms record creation only, not lab results."
    };

    if (includeTimestamp) record.savedAt = new Date().toISOString();
    return record;
  }

  async function saveRecord(options = {}) {
    const status = document.getElementById("record-save-status");
    const record = collectRecord(true);
    saveLocalRecord(record);

    if (status) {
      status.textContent = "Saving record...";
      status.className = "record-save-status";
    }

    let serverSaved = false;
    try {
      const response = await fetch("/api/drug-screens", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(window.FTSAdmin ? FTSAdmin.authHeaders() : {}) },
        body: JSON.stringify(record)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Save failed");
      serverSaved = true;
      if (status) {
        status.textContent = `Saved: ${payload.verificationKey}`;
        status.className = "record-save-status saved";
      }
    } catch (err) {
      if (status) {
        status.textContent = "Saved on this browser only — server log unavailable.";
        status.className = "record-save-status warning";
      }
    }

    localStorage.removeItem(DRAFT_KEY);

    if (options.printAfter) {
      window.setTimeout(() => window.print(), serverSaved ? 150 : 350);
    }
  }

  function init() {
    const draft = loadDraft();
    const newSpecimenId = draft && draft.specimenId ? draft.specimenId : `FTS-NK-${dateStamp()}-${randomChunk(5)}`;
    const newVerifyKey = draft && draft.verificationKey ? draft.verificationKey : `VERIFY-${dateStamp()}-${randomChunk(6)}`;

    window.FTS_CURRENT_SPECIMEN_ID = newSpecimenId;
    window.FTS_CURRENT_VERIFY_KEY = newVerifyKey;

    setTextEverywhere(["specimen-id-display", "specimen-id-display-inline", "specimen-id-display-footer"], newSpecimenId);
    setTextEverywhere(["verification-key-display", "verification-key-display-footer"], newVerifyKey);

    if (draft) {
      Object.entries(draft).forEach(([key, value]) => setText(key, value));
    } else {
      setText("collectionDate", todayForDisplay());
      setText("collectionTime", currentTimeForDisplay());
      setText("wash1Date", todayForDisplay());
      setText("wash2Date", todayForDisplay());
      setText("wash3Date", todayForDisplay());
      setText("nailClipDate", todayForDisplay());
    }

    document.querySelectorAll("[data-field]").forEach(el => {
      el.addEventListener("input", saveDraft);
      el.addEventListener("change", saveDraft);
    });

    const savePrintBtn = document.getElementById("save-print-btn");
    const saveRecordBtn = document.getElementById("save-record-btn");
    if (savePrintBtn) savePrintBtn.addEventListener("click", () => saveRecord({ printAfter: true }));
    if (saveRecordBtn) saveRecordBtn.addEventListener("click", () => saveRecord({ printAfter: false }));
  }

  document.addEventListener("DOMContentLoaded", init);
})();
