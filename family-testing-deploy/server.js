const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

const app = express();
const port = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, "public");
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const recordsFile = path.join(dataDir, "drug-test-records.enc");
const legacyRecordsFile = path.join(dataDir, "drug-screen-records.json");
const isProduction = process.env.NODE_ENV === "production";
const adminPassword = process.env.ADMIN_PASSWORD || "local-only-change-me";
const sessionSecret = process.env.SESSION_SECRET || adminPassword;
const encryptionSecret = process.env.DATA_ENCRYPTION_KEY || adminPassword;
const sessionHours = Math.max(1, Math.min(24, Number(process.env.SESSION_HOURS) || 8));

if (isProduction) {
  const missingSecrets = ["ADMIN_PASSWORD", "SESSION_SECRET", "DATA_ENCRYPTION_KEY"]
    .filter(name => !process.env[name]);
  if (missingSecrets.length) {
    throw new Error(`Missing required production environment variables: ${missingSecrets.join(", ")}`);
  }
}

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.path.startsWith("/api/") || req.path.startsWith("/admin/")) {
    res.setHeader("Cache-Control", "no-store");
  }
  if (isProduction) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

function clean(value, maxLength = 240) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanBoolean(value) {
  return value === true || value === "true" || value === "yes" || value === "1";
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function randomCode(length = 6) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length).toUpperCase();
}

function prefixForSpecimen(specimenType) {
  return ({ urine: "UR", hair: "HR", nail: "NK", oral_fluid: "OF" })[specimenType] || "SP";
}

function reserveIdentifiers(specimenType = "urine") {
  const stamp = dateStamp();
  const specimenPrefix = prefixForSpecimen(specimenType);
  return {
    recordId: crypto.randomUUID(),
    referenceNumber: `FTS-RPT-${stamp}-${randomCode(6)}`,
    verificationKey: `FTS-VERIFY-${stamp}-${randomCode(6)}`,
    specimenId: `FTS-${specimenPrefix}-${stamp}-${randomCode(6)}`
  };
}

function parseCookies(req) {
  const header = req.get("cookie") || "";
  return Object.fromEntries(
    header.split(";").map(part => part.trim()).filter(Boolean).map(part => {
      const index = part.indexOf("=");
      const key = index >= 0 ? part.slice(0, index) : part;
      const value = index >= 0 ? part.slice(index + 1) : "";
      return [decodeURIComponent(key), decodeURIComponent(value)];
    })
  );
}

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", sessionSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function readSessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", sessionSecret).update(body).digest("base64url");
  const left = Buffer.from(signature || "");
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function sessionCookie(token, maxAgeSeconds) {
  const parts = [
    `fts_session=${encodeURIComponent(token || "")}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict"
  ];
  if (isProduction) parts.push("Secure");
  if (maxAgeSeconds !== undefined) parts.push(`Max-Age=${maxAgeSeconds}`);
  return parts.join("; ");
}

function requireAdmin(req, res, next) {
  const token = parseCookies(req).fts_session;
  const session = readSessionToken(token);
  if (!session || session.role !== "staff") {
    return res.status(401).json({ ok: false, error: "Staff sign-in required." });
  }
  req.staffSession = session;
  next();
}

function encryptionKey() {
  return crypto.createHash("sha256").update(encryptionSecret).digest();
}

function encryptRecords(records) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(records), "utf8"),
    cipher.final()
  ]);
  return JSON.stringify({
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64")
  });
}

function decryptRecords(raw) {
  const envelope = JSON.parse(raw);
  if (!envelope || envelope.version !== 1 || !envelope.iv || !envelope.tag || !envelope.data) {
    throw new Error("Unsupported encrypted data format.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(envelope.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(envelope.data, "base64")),
    decipher.final()
  ]).toString("utf8");
  const parsed = JSON.parse(decrypted);
  return Array.isArray(parsed) ? parsed : [];
}

async function readRecords() {
  try {
    return decryptRecords(await fs.readFile(recordsFile, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  try {
    const legacy = JSON.parse(await fs.readFile(legacyRecordsFile, "utf8"));
    return Array.isArray(legacy) ? legacy.map(migrateLegacyRecord) : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeRecords(records) {
  await fs.mkdir(dataDir, { recursive: true });
  const temporaryFile = `${recordsFile}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryFile, encryptRecords(records), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporaryFile, recordsFile);
}

let recordsQueue = Promise.resolve();
function updateRecords(updater) {
  const operation = recordsQueue.then(async () => {
    const records = await readRecords();
    const result = await updater(records);
    await writeRecords(records.slice(0, 5000));
    return result;
  });
  recordsQueue = operation.catch(() => undefined);
  return operation;
}

const allowedSpecimenTypes = new Set(["urine", "hair", "nail", "oral_fluid"]);
const allowedStatuses = new Set([
  "pending",
  "screen_negative",
  "presumptive_positive",
  "negative",
  "confirmed_positive",
  "invalid",
  "cancelled",
  "rejected",
  "refusal"
]);
const allowedSources = new Set(["not_entered", "onsite_screen", "laboratory_report", "mro_verified"]);
const allowedAnalyteResults = new Set(["not_tested", "negative", "presumptive_positive", "confirmed_positive", "invalid"]);

function cleanAnalytes(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).map(item => {
    const result = clean(item && item.result, 40).toLowerCase();
    return {
      name: clean(item && item.name, 100),
      cutoff: clean(item && item.cutoff, 60),
      result: allowedAnalyteResults.has(result) ? result : "not_tested",
      notes: clean(item && item.notes, 160)
    };
  }).filter(item => item.name);
}

function normalizeDrugTestRecord(body, existing = null) {
  const input = body && typeof body === "object" ? body : {};
  const specimenTypeRaw = clean(input.specimenType, 40).toLowerCase();
  const requestedSpecimenType = allowedSpecimenTypes.has(specimenTypeRaw) ? specimenTypeRaw : "urine";
  const specimenType = existing?.specimenType || requestedSpecimenType;
  const reserved = reserveIdentifiers(specimenType);
  const now = new Date().toISOString();
  const statusRaw = clean(input.resultStatus, 50).toLowerCase();
  const resultStatus = allowedStatuses.has(statusRaw) ? statusRaw : "pending";
  const sourceRaw = clean(input.resultSource, 50).toLowerCase();
  const resultSource = allowedSources.has(sourceRaw) ? sourceRaw : "not_entered";

  return {
    schemaVersion: 2,
    recordId: existing?.recordId || clean(input.recordId, 80) || reserved.recordId,
    referenceNumber: existing?.referenceNumber || clean(input.referenceNumber, 80) || reserved.referenceNumber,
    verificationKey: existing?.verificationKey || clean(input.verificationKey, 80) || reserved.verificationKey,
    specimenId: existing?.specimenId || clean(input.specimenId, 80) || reserved.specimenId,
    recordType: "non_dot_drug_test_record",
    programType: "non_dot",

    donorName: clean(input.donorName, 160),
    dob: clean(input.dob, 20),
    donorIdLast4: clean(input.donorIdLast4 || input.donorLast4, 12),
    donorPhone: clean(input.donorPhone, 40),
    donorEmail: clean(input.donorEmail, 160),
    donorAddress: clean(input.donorAddress, 260),

    clientName: clean(input.clientName, 180),
    clientAccount: clean(input.clientAccount, 80),
    clientContact: clean(input.clientContact, 160),
    reason: clean(input.reason, 120),
    authorityNotes: clean(input.authorityNotes, 300),

    specimenType,
    testPanel: clean(input.testPanel, 120),
    collectionDate: clean(input.collectionDate, 20),
    collectionTime: clean(input.collectionTime, 20),
    collector: clean(input.collector, 120),
    collectorId: clean(input.collectorId, 60),
    collectionSite: clean(input.collectionSite, 220) || "Family Testing Services, Bessemer, Alabama",
    observedCollection: cleanBoolean(input.observedCollection),
    specimenQuantity: clean(input.specimenQuantity, 80),
    kitLot: clean(input.kitLot, 80),
    kitExpiration: clean(input.kitExpiration, 20),
    sealIntact: cleanBoolean(input.sealIntact),
    collectionNotes: clean(input.collectionNotes, 500),

    urineTemperature: clean(input.urineTemperature, 30),
    urineSplit: cleanBoolean(input.urineSplit),
    hairSource: clean(input.hairSource, 80),
    hairLocation: clean(input.hairLocation, 100),
    hairLength: clean(input.hairLength, 60),
    hairColor: clean(input.hairColor, 60),
    hairTreatment: clean(input.hairTreatment, 160),
    nailSource: clean(input.nailSource, 80),
    nailCondition: clean(input.nailCondition, 160),
    oralDevice: clean(input.oralDevice, 120),
    oralCollectionIndicator: clean(input.oralCollectionIndicator, 80),

    donorConsent: cleanBoolean(input.donorConsent),
    consentDate: clean(input.consentDate, 20),
    consentTime: clean(input.consentTime, 20),
    donorSignatureName: clean(input.donorSignatureName, 160),
    witnessName: clean(input.witnessName, 160),

    labName: clean(input.labName, 180),
    labAddress: clean(input.labAddress, 260),
    labAccession: clean(input.labAccession, 100),
    shippedDate: clean(input.shippedDate || input.shipDate, 20),
    carrier: clean(input.carrier, 80),
    trackingNumber: clean(input.trackingNumber || input.courierTracking, 140),
    receivedDate: clean(input.receivedDate, 20),

    resultStatus,
    resultSource,
    reportDate: clean(input.reportDate, 20),
    confirmationMethod: clean(input.confirmationMethod, 120),
    reviewerName: clean(input.reviewerName, 160),
    reviewerTitle: clean(input.reviewerTitle, 100),
    mroName: clean(input.mroName, 160),
    resultNotes: clean(input.resultNotes, 600),
    analytes: cleanAnalytes(input.analytes),

    printedAt: existing?.printedAt || null,
    printCount: Number(existing?.printCount) || 0,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    revision: (Number(existing?.revision) || 0) + 1
  };
}

function validateRecord(record) {
  const errors = [];
  const analyteResults = new Set(record.analytes.map(item => item.result));
  const consentOptionalStatuses = new Set(["cancelled", "rejected", "refusal"]);

  if (!record.donorName) errors.push("Donor full legal name is required.");
  if (!record.dob) errors.push("Date of birth is required.");
  if (!record.collectionDate) errors.push("Collection/attempt date is required.");
  if (!record.collectionTime) errors.push("Collection/attempt time is required.");
  if (!record.collector) errors.push("Collector name is required.");
  if (!record.reason) errors.push("Reason for test is required.");
  if (!record.donorConsent && !consentOptionalStatuses.has(record.resultStatus)) {
    errors.push("Donor consent/authorization must be recorded unless the record is cancelled, rejected, or a refusal.");
  }

  const collectionNotCompleted = consentOptionalStatuses.has(record.resultStatus);
  if (!collectionNotCompleted) {
    if (!record.specimenQuantity) errors.push("Specimen quantity/amount is required for a completed collection.");
    if (!record.sealIntact) errors.push("Confirm that the completed specimen was sealed and the seal was intact.");
    if (record.specimenType === "hair") {
      if (!record.hairSource) errors.push("Hair source is required for a hair collection.");
      if (!record.hairLocation) errors.push("Hair collection location on the body is required.");
    }
    if (record.specimenType === "nail" && !record.nailSource) {
      errors.push("Nail source is required for a nail collection.");
    }
    if (record.specimenType === "oral_fluid" && !record.oralDevice) {
      errors.push("Oral-fluid collection device/manufacturer is required.");
    }
  }

  if (record.resultStatus === "screen_negative" && record.resultSource !== "onsite_screen") {
    errors.push("A preliminary screen-negative status must use Onsite Screen as its source.");
  }

  if (record.resultStatus === "presumptive_positive" && !new Set(["onsite_screen", "laboratory_report"]).has(record.resultSource)) {
    errors.push("A presumptive positive must identify an onsite screen or laboratory screen as its source.");
  }

  if (record.resultStatus === "negative" && !new Set(["laboratory_report", "mro_verified"]).has(record.resultSource)) {
    errors.push("A final negative status must come from a laboratory report or MRO-verified report. Use Screen negative — preliminary for an onsite screen.");
  }

  if (record.resultStatus === "confirmed_positive" && !new Set(["laboratory_report", "mro_verified"]).has(record.resultSource)) {
    errors.push("A confirmed positive result must come from a laboratory report or MRO-verified report.");
  }

  const finalResult = new Set(["negative", "confirmed_positive"]).has(record.resultStatus);
  if (finalResult) {
    if (!record.reportDate) errors.push("Report date is required for a final result.");
    if (!record.reviewerName) errors.push("Reviewer name is required for a final result.");
    if (record.resultSource === "laboratory_report") {
      if (!record.labName) errors.push("Laboratory name is required for a laboratory result.");
      if (!record.labAccession) errors.push("Laboratory accession/report number is required for a laboratory result.");
    }
    if (record.resultSource === "mro_verified" && !record.mroName) {
      errors.push("MRO name is required when the source is an MRO-verified report.");
    }
  }

  if (record.resultStatus === "confirmed_positive" && !record.confirmationMethod) {
    errors.push("Confirmation method is required for a confirmed positive result.");
  }

  if (record.resultStatus === "screen_negative" || record.resultStatus === "negative") {
    if (analyteResults.has("presumptive_positive") || analyteResults.has("confirmed_positive")) {
      errors.push("The overall negative status conflicts with a positive analyte result.");
    }
  }
  if (record.resultStatus === "presumptive_positive" && record.analytes.length && !analyteResults.has("presumptive_positive")) {
    errors.push("At least one analyte must be marked presumptive positive when analyte rows are entered.");
  }
  if (record.resultStatus === "confirmed_positive" && record.analytes.length && !analyteResults.has("confirmed_positive")) {
    errors.push("At least one analyte must be marked confirmed positive when analyte rows are entered.");
  }

  return errors;
}

function migrateLegacyRecord(record) {
  const specimenType = /nail/i.test(record.specimenType || "") ? "nail" : "urine";
  return normalizeDrugTestRecord({
    ...record,
    recordId: record.recordId || crypto.randomUUID(),
    referenceNumber: record.referenceNumber || record.verificationKey || reserveIdentifiers(specimenType).referenceNumber,
    donorIdLast4: record.donorLast4,
    specimenType,
    donorConsent: true,
    resultStatus: "pending",
    resultSource: "not_entered",
    collectionNotes: record.notes || "Migrated from the earlier specimen collection record format."
  });
}

function sameIdentifier(record, id) {
  const candidate = String(id || "").toUpperCase();
  return [record.recordId, record.referenceNumber, record.verificationKey, record.specimenId]
    .some(value => String(value || "").toUpperCase() === candidate);
}

function donorLastName(name) {
  const parts = clean(name, 160).toLowerCase().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1].replace(/[^a-z0-9'-]/g, "") : "";
}

function donorInitials(name) {
  return clean(name, 160).split(/\s+/).filter(Boolean).map(part => part[0].toUpperCase()).join("").slice(0, 4);
}

function statusLabel(record) {
  const labels = {
    pending: "Pending / No result entered",
    screen_negative: "Screen negative — preliminary",
    presumptive_positive: "Presumptive positive — confirmation pending",
    negative: record.resultSource === "mro_verified" ? "Verified negative" : "Negative",
    confirmed_positive: record.resultSource === "mro_verified" ? "MRO-verified positive" : "Laboratory-confirmed positive",
    invalid: "Invalid",
    cancelled: "Cancelled",
    rejected: "Rejected for testing",
    refusal: "Refusal / collection not completed"
  };
  return labels[record.resultStatus] || "Pending";
}

const verifyAttempts = new Map();
function verifyRateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (verifyAttempts.get(key) || []).filter(time => now - time < 10 * 60 * 1000);
  if (recent.length >= 30) {
    return res.status(429).json({ ok: false, error: "Too many verification attempts. Try again later." });
  }
  recent.push(now);
  verifyAttempts.set(key, recent);
  next();
}

const loginAttempts = new Map();
function loginRateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (loginAttempts.get(key) || []).filter(time => now - time < 15 * 60 * 1000);
  if (recent.length >= 10) {
    return res.status(429).json({ ok: false, error: "Too many sign-in attempts. Try again later." });
  }
  req.loginAttemptKey = key;
  req.recentLoginAttempts = recent;
  next();
}

app.post("/api/admin/login", loginRateLimit, (req, res) => {
  const supplied = clean(req.body && req.body.password, 200);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(adminPassword);
  const valid = suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
  if (!valid) {
    req.recentLoginAttempts.push(Date.now());
    loginAttempts.set(req.loginAttemptKey, req.recentLoginAttempts);
    return res.status(401).json({ ok: false, error: "Incorrect password." });
  }
  loginAttempts.delete(req.loginAttemptKey);

  const expiresAt = Date.now() + sessionHours * 60 * 60 * 1000;
  const token = signSession({ role: "staff", exp: expiresAt });
  res.setHeader("Set-Cookie", sessionCookie(token, sessionHours * 60 * 60));
  res.json({ ok: true, expiresAt });
});

app.get("/api/admin/session", requireAdmin, (req, res) => {
  res.json({ ok: true, authenticated: true, expiresAt: req.staffSession.exp });
});

app.post("/api/admin/logout", (_req, res) => {
  res.setHeader("Set-Cookie", sessionCookie("", 0));
  res.json({ ok: true });
});

app.post("/api/admin/drug-tests/reserve", requireAdmin, (req, res) => {
  const specimenType = clean(req.body && req.body.specimenType, 40).toLowerCase();
  res.json({ ok: true, ...reserveIdentifiers(allowedSpecimenTypes.has(specimenType) ? specimenType : "urine") });
});

app.post("/api/admin/drug-tests", requireAdmin, async (req, res) => {
  try {
    const result = await updateRecords(async records => {
      const requestedId = clean(req.body && req.body.recordId, 80);
      const existingIndex = requestedId ? records.findIndex(record => sameIdentifier(record, requestedId)) : -1;
      const existing = existingIndex >= 0 ? records[existingIndex] : null;
      const record = normalizeDrugTestRecord(req.body || {}, existing);
      const errors = validateRecord(record);
      if (errors.length) return { validationError: errors };

      const duplicateIndex = records.findIndex((item, index) => index !== existingIndex && (
        item.recordId === record.recordId ||
        item.referenceNumber === record.referenceNumber ||
        item.verificationKey === record.verificationKey ||
        item.specimenId === record.specimenId
      ));
      if (duplicateIndex >= 0) return { conflict: true };

      if (existingIndex >= 0) records[existingIndex] = record;
      else records.unshift(record);
      return { record };
    });

    if (result.validationError) return res.status(400).json({ ok: false, error: "Please correct the form.", details: result.validationError });
    if (result.conflict) return res.status(409).json({ ok: false, error: "A generated identifier already exists. Refresh the form and try again." });
    res.json({ ok: true, record: result.record });
  } catch (error) {
    console.error("Failed to save drug test record", error.message);
    res.status(500).json({ ok: false, error: "The record could not be saved." });
  }
});

app.get("/api/admin/drug-tests", requireAdmin, async (req, res) => {
  try {
    const records = await readRecords();
    const query = clean(req.query.q, 160).toLowerCase();
    const filtered = query ? records.filter(record => [
      record.referenceNumber,
      record.verificationKey,
      record.specimenId,
      record.donorName,
      record.clientName,
      record.labAccession
    ].some(value => String(value || "").toLowerCase().includes(query))) : records;
    res.json({ ok: true, records: filtered.slice(0, 1000) });
  } catch (error) {
    console.error("Failed to list drug test records", error.message);
    res.status(500).json({ ok: false, error: "Saved records could not be loaded." });
  }
});

app.get("/api/admin/drug-tests/:id", requireAdmin, async (req, res) => {
  try {
    const records = await readRecords();
    const record = records.find(item => sameIdentifier(item, req.params.id));
    if (!record) return res.status(404).json({ ok: false, error: "Record not found." });
    res.json({ ok: true, record });
  } catch (error) {
    console.error("Failed to load drug test record", error.message);
    res.status(500).json({ ok: false, error: "The record could not be loaded." });
  }
});

app.post("/api/admin/drug-tests/:id/printed", requireAdmin, async (req, res) => {
  try {
    const result = await updateRecords(async records => {
      const index = records.findIndex(item => sameIdentifier(item, req.params.id));
      if (index < 0) return null;
      records[index] = {
        ...records[index],
        printedAt: new Date().toISOString(),
        printCount: (Number(records[index].printCount) || 0) + 1
      };
      return records[index];
    });
    if (!result) return res.status(404).json({ ok: false, error: "Record not found." });
    res.json({ ok: true, printedAt: result.printedAt, printCount: result.printCount });
  } catch (error) {
    console.error("Failed to record print event", error.message);
    res.status(500).json({ ok: false, error: "Print event could not be recorded." });
  }
});

app.post("/api/drug-tests/verify", verifyRateLimit, async (req, res) => {
  try {
    const key = clean(req.body && req.body.key, 100).toUpperCase();
    const lastName = clean(req.body && req.body.lastName, 100).toLowerCase().replace(/[^a-z0-9'-]/g, "");
    const dob = clean(req.body && req.body.dob, 20);
    if (!key || !lastName || !dob) {
      return res.status(400).json({ ok: false, error: "Verification key, donor last name, and date of birth are required." });
    }

    const records = await readRecords();
    const record = records.find(item => sameIdentifier(item, key));
    const identityMatches = record && donorLastName(record.donorName) === lastName && record.dob === dob;
    if (!identityMatches) {
      return res.status(404).json({ ok: true, found: false, message: "No matching record was found." });
    }

    res.json({
      ok: true,
      found: true,
      referenceNumber: record.referenceNumber,
      verificationKey: record.verificationKey,
      specimenId: record.specimenId,
      donorInitials: donorInitials(record.donorName),
      specimenType: record.specimenType,
      collectionDate: record.collectionDate,
      resultStatus: record.resultStatus,
      resultStatusLabel: statusLabel(record),
      reportDate: record.reportDate,
      notice: "Verification confirms that this record exists in the Family Testing Services system. The signed laboratory or MRO report controls if it differs from this website summary."
    });
  } catch (error) {
    console.error("Failed to verify drug test record", error.message);
    res.status(500).json({ ok: false, error: "The record could not be verified." });
  }
});

// Compatibility route for the earlier collection-only endpoint.
app.get("/api/drug-screens/verify/:key", (_req, res) => {
  res.status(410).json({
    ok: false,
    error: "Verification now requires the key, donor last name, and date of birth through the website verification form."
  });
});

app.use(express.static(publicDir, {
  etag: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-store");
  }
}));

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));
app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

if (require.main === module) {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Family Testing Services running on port ${port}`);
  });
}

module.exports = { app, reserveIdentifiers, normalizeDrugTestRecord, validateRecord, statusLabel };
