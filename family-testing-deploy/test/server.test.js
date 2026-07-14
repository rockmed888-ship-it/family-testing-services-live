const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "fts-record-test-"));
process.env.NODE_ENV = "test";
process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.SESSION_SECRET = "test-session-secret-0123456789";
process.env.DATA_ENCRYPTION_KEY = "test-encryption-secret-0123456789";
process.env.DATA_DIR = dataDir;

const { app } = require("../server");

async function readJson(response) {
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

test("hair-test record saves, verifies, reloads, and records printing", async t => {
  const server = await new Promise(resolve => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await fsp.rm(dataDir, { recursive: true, force: true });
  });

  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  let result = await readJson(await fetch(`${base}/health`));
  assert.equal(result.response.status, 200);
  assert.equal(result.payload.ok, true);

  result = await readJson(await fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "wrong" })
  }));
  assert.equal(result.response.status, 401);

  const loginResponse = await fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD })
  });
  const loginPayload = await loginResponse.json();
  assert.equal(loginResponse.status, 200);
  assert.equal(loginPayload.ok, true);
  const cookie = (loginResponse.headers.get("set-cookie") || "").split(";")[0];
  assert.match(cookie, /^fts_session=/);

  async function staffRequest(route, options = {}) {
    return fetch(`${base}${route}`, {
      ...options,
      headers: {
        Cookie: cookie,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
  }

  result = await readJson(await staffRequest("/api/admin/drug-tests/reserve", {
    method: "POST",
    body: JSON.stringify({ specimenType: "hair" })
  }));
  assert.equal(result.response.status, 200);
  assert.match(result.payload.specimenId, /^FTS-HR-/);
  const identifiers = result.payload;

  const hairRecord = {
    ...identifiers,
    donorName: "Alexandra Example",
    dob: "1990-04-15",
    donorIdLast4: "4321",
    donorPhone: "205-555-0100",
    clientName: "Example Requesting Agency",
    reason: "Court / legal matter",
    specimenType: "hair",
    testPanel: "10-panel hair test",
    collectionDate: "2026-07-13",
    collectionTime: "14:30",
    collector: "Jordan Collector",
    collectorId: "COL-22",
    collectionSite: "Family Testing Services, Bessemer, Alabama",
    observedCollection: true,
    specimenQuantity: "120 mg",
    sealIntact: true,
    hairSource: "Scalp hair",
    hairLocation: "Crown",
    hairLength: "1.5 inches",
    hairColor: "Brown",
    hairTreatment: "None reported",
    donorConsent: true,
    consentDate: "2026-07-13",
    consentTime: "14:25",
    donorSignatureName: "Alexandra Example",
    resultStatus: "presumptive_positive",
    resultSource: "onsite_screen",
    analytes: [
      { name: "Cocaine metabolite", cutoff: "Device cutoff", result: "presumptive_positive", notes: "Confirmation ordered" },
      { name: "Opiates", cutoff: "Device cutoff", result: "negative", notes: "" }
    ],
    resultNotes: "Preliminary screen only; laboratory confirmation pending."
  };

  result = await readJson(await staffRequest("/api/admin/drug-tests", {
    method: "POST",
    body: JSON.stringify(hairRecord)
  }));
  assert.equal(result.response.status, 200);
  assert.equal(result.payload.record.specimenType, "hair");
  assert.equal(result.payload.record.resultStatus, "presumptive_positive");
  assert.equal(result.payload.record.revision, 1);
  const saved = result.payload.record;

  const encryptedPath = path.join(dataDir, "drug-test-records.enc");
  const encrypted = await fsp.readFile(encryptedPath, "utf8");
  assert.doesNotMatch(encrypted, /Alexandra Example/);
  assert.match(encrypted, /aes-256-gcm/);

  result = await readJson(await staffRequest(`/api/admin/drug-tests/${encodeURIComponent(saved.recordId)}`));
  assert.equal(result.response.status, 200);
  assert.equal(result.payload.record.referenceNumber, saved.referenceNumber);
  assert.equal(result.payload.record.hairLocation, "Crown");

  result = await readJson(await staffRequest("/api/admin/drug-tests", {
    method: "POST",
    body: JSON.stringify({
      ...saved,
      referenceNumber: "TAMPERED-REFERENCE",
      verificationKey: "TAMPERED-VERIFY",
      specimenId: "TAMPERED-SPECIMEN",
      specimenType: "urine"
    })
  }));
  assert.equal(result.response.status, 200);
  assert.equal(result.payload.record.referenceNumber, saved.referenceNumber);
  assert.equal(result.payload.record.verificationKey, saved.verificationKey);
  assert.equal(result.payload.record.specimenId, saved.specimenId);
  assert.equal(result.payload.record.specimenType, "hair");
  assert.equal(result.payload.record.revision, 2);

  result = await readJson(await fetch(`${base}/api/drug-tests/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: saved.verificationKey, lastName: "Wrong", dob: saved.dob })
  }));
  assert.equal(result.response.status, 404);
  assert.equal(result.payload.found, false);

  result = await readJson(await fetch(`${base}/api/drug-tests/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: saved.verificationKey, lastName: "Example", dob: saved.dob })
  }));
  assert.equal(result.response.status, 200);
  assert.equal(result.payload.found, true);
  assert.equal(result.payload.resultStatus, "presumptive_positive");
  assert.equal(result.payload.donorInitials, "AE");

  result = await readJson(await staffRequest(`/api/admin/drug-tests/${encodeURIComponent(saved.recordId)}/printed`, {
    method: "POST",
    body: "{}"
  }));
  assert.equal(result.response.status, 200);
  assert.equal(result.payload.printCount, 1);

  result = await readJson(await staffRequest(`/api/admin/drug-tests/${encodeURIComponent(saved.recordId)}`));
  assert.equal(result.payload.record.printCount, 1);
  assert.equal(result.payload.record.revision, 2);

  const secondReserve = await readJson(await staffRequest("/api/admin/drug-tests/reserve", {
    method: "POST",
    body: JSON.stringify({ specimenType: "hair" })
  }));
  result = await readJson(await staffRequest("/api/admin/drug-tests", {
    method: "POST",
    body: JSON.stringify({
      ...secondReserve.payload,
      donorName: "Casey Sample",
      dob: "1987-02-03",
      reason: "Pre-employment",
      specimenType: "hair",
      collectionDate: "2026-07-13",
      collectionTime: "15:00",
      collector: "Jordan Collector",
      donorConsent: true,
      resultStatus: "confirmed_positive",
      resultSource: "onsite_screen",
      analytes: [{ name: "THC", result: "confirmed_positive" }]
    })
  }));
  assert.equal(result.response.status, 400);
  assert.ok(result.payload.details.some(message => /laboratory report or MRO/i.test(message)));
});
