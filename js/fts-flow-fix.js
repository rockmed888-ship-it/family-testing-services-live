(function () {
  "use strict";

  const STORAGE_KEY = "fts_saved_print_record_v1";
  const DRAFT_KEY = "fts_current_form_draft_v1";

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function normalize(value) {
    return clean(value)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function getLabel(control) {
    if (!control) return "";

    if (control.labels && control.labels.length) {
      return clean(Array.from(control.labels).map(x => x.textContent).join(" "));
    }

    const id = control.id;
    if (id) {
      const direct = document.querySelector('label[for="' + CSS.escape(id) + '"]');
      if (direct) return clean(direct.textContent);
    }

    const wrapper = control.closest("label, .field, .form-field, .form-group, .input-group");
    if (wrapper) {
      const label = wrapper.querySelector("label, .label, .field-label, strong");
      if (label) return clean(label.textContent);
    }

    const previous = control.previousElementSibling;
    if (previous) return clean(previous.textContent);

    return "";
  }

  function controlValue(control) {
    if (!control) return "";

    if (control.type === "checkbox") {
      return control.checked ? "Yes" : "No";
    }

    if (control.type === "radio") {
      return control.checked ? clean(control.value) : "";
    }

    if (control.isContentEditable) {
      return clean(control.textContent);
    }

    return clean(control.value);
  }

  function collectFormData() {
    const values = {};
    const controls = document.querySelectorAll(
      "input, select, textarea, [contenteditable='true'], [data-field]"
    );

    controls.forEach(control => {
      if (control.type === "password") return;

      const value = controlValue(control);
      if (!value && control.type !== "checkbox") return;

      const possibleKeys = [
        control.name,
        control.id,
        control.getAttribute("data-field"),
        getLabel(control),
        control.getAttribute("placeholder")
      ].filter(Boolean);

      possibleKeys.forEach(key => {
        values[normalize(key)] = value;
      });
    });

    const pageText = document.body ? document.body.innerText : "";

    const reportMatch = pageText.match(/FTS-RPT-\d{4}-\d+/i);
    const specimenMatch = pageText.match(/FTS-(?:UR|HA|NA|OR|BAT|DOT|RPT)[A-Z0-9-]*-\d{4}-\d+/i);
    const labMatch = pageText.match(/LAB-\d{4}-\d+/i);

    if (reportMatch) {
      values["report id"] = reportMatch[0];
      values["reportid"] = reportMatch[0];
    }

    if (specimenMatch) {
      values["specimen id"] = specimenMatch[0];
      values["specimenid"] = specimenMatch[0];
      values["specimen id cup id"] = specimenMatch[0];
    }

    if (labMatch) {
      values["lab accession"] = labMatch[0];
      values["lab accession number"] = labMatch[0];
      values["lab accession #"] = labMatch[0];
    }

    const record = {
      values,
      savedAt: new Date().toISOString(),
      sourceUrl: location.href
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(record));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));

    return record;
  }

  function readRecord() {
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem(DRAFT_KEY) ||
        "null"
      );
    } catch (_) {
      return null;
    }
  }

  const aliases = {
    "donor name": [
      "donor name",
      "full name",
      "donor full name",
      "first name"
    ],
    "date of birth": [
      "date of birth",
      "dob"
    ],
    "donor id last 4 ssn": [
      "donor id last 4 ssn",
      "donor id",
      "last 4 ssn",
      "ssn"
    ],
    "phone": [
      "phone",
      "phone number"
    ],
    "donor address": [
      "donor address",
      "street address",
      "address"
    ],
    "collection date": [
      "collection date"
    ],
    "collection time": [
      "collection time"
    ],
    "report date": [
      "report date"
    ],
    "test type": [
      "test type"
    ],
    "result": [
      "result"
    ],
    "testing laboratory": [
      "testing laboratory",
      "laboratory",
      "lab"
    ],
    "collector conducted by": [
      "collector conducted by",
      "collector",
      "conducted by"
    ],
    "reason for test": [
      "reason for test",
      "reason"
    ],
    "authorized party": [
      "authorized party"
    ],
    "report id": [
      "report id",
      "reportid"
    ],
    "specimen id cup id": [
      "specimen id cup id",
      "specimen id",
      "specimenid"
    ],
    "lab accession": [
      "lab accession",
      "lab accession number",
      "lab accession #"
    ]
  };

  function lookup(values, labelText) {
    const normalizedLabel = normalize(labelText);

    if (values[normalizedLabel]) return values[normalizedLabel];

    for (const [mainKey, choices] of Object.entries(aliases)) {
      if (
        normalizedLabel.includes(mainKey) ||
        choices.some(choice => normalizedLabel.includes(normalize(choice)))
      ) {
        for (const choice of choices) {
          const found = values[normalize(choice)];
          if (found) return found;
        }
      }
    }

    return "";
  }

  function fillControl(control, value) {
    if (!value || !control) return false;

    if (control.type === "checkbox") {
      control.checked = /^(yes|true|checked|1)$/i.test(value);
      return true;
    }

    if (control.isContentEditable) {
      if (!clean(control.textContent)) control.textContent = value;
      return true;
    }

    if ("value" in control && !clean(control.value)) {
      control.value = value;
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    return false;
  }

  function fillPrintableForm() {
    const record = readRecord();
    if (!record || !record.values) return;

    const values = record.values;

    document.querySelectorAll(
      "input, select, textarea, [contenteditable='true'], [data-field]"
    ).forEach(control => {
      const keys = [
        control.name,
        control.id,
        control.getAttribute("data-field"),
        getLabel(control),
        control.getAttribute("placeholder")
      ].filter(Boolean);

      for (const key of keys) {
        const value = lookup(values, key);
        if (value && fillControl(control, value)) break;
      }
    });

    document.querySelectorAll(
      ".field, .form-field, .info-field, td, .report-field, .data-row"
    ).forEach(container => {
      const label = container.querySelector(
        "label, .label, .field-label, th, strong"
      );

      if (!label) return;

      const value = lookup(values, label.textContent);
      if (!value) return;

      const target = container.querySelector(
        ".value, .blank, .field-value, .answer, [data-value]"
      );

      if (target && !clean(target.textContent)) {
        target.textContent = value;
      }
    });

    const pageText = normalize(document.body ? document.body.innerText : "");
    const looksPrintable =
      pageText.includes("drug screen results report") ||
      pageText.includes("print document") ||
      pageText.includes("report id") ||
      location.pathname.toLowerCase().includes("print");

    if (looksPrintable) {
      const printMap = [
        ["report id", values["report id"] || values["reportid"]],
        ["specimen id", values["specimen id"] || values["specimenid"]],
        ["lab accession", values["lab accession"] || values["lab accession number"]]
      ];

      document.querySelectorAll("body *").forEach(element => {
        if (element.children.length) return;

        const text = normalize(element.textContent);

        printMap.forEach(([label, value]) => {
          if (!value || !text.includes(label)) return;

          if (/_{3,}/.test(element.textContent)) {
            element.textContent = element.textContent.replace(/_{3,}/, value);
          }
        });
      });
    }
  }

  function removePublicPhoneNumber() {
    document.querySelectorAll('a[href^="tel:"]').forEach(link => {
      link.removeAttribute("href");
      link.setAttribute("aria-label", "Online scheduling only");
      link.textContent = "Online scheduling only";
      link.style.cursor = "default";
    });

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const parent = node.parentElement;
      if (!parent) return;

      if (
        ["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "OPTION"].includes(parent.tagName)
      ) return;

      node.nodeValue = node.nodeValue
        .replace(/\(?205\)?[\s.-]*579[\s.-]*0707/g, "Online scheduling only");
    });
  }

  function isSaveOrPrint(element) {
    const text = normalize(
      [
        element.textContent,
        element.value,
        element.getAttribute("aria-label"),
        element.getAttribute("title")
      ].filter(Boolean).join(" ")
    );

    return (
      text.includes("save generate lab numbers") ||
      text.includes("save and generate") ||
      text.includes("save print") ||
      text.includes("save and print") ||
      text === "print" ||
      text.includes("print report") ||
      text.includes("print document")
    );
  }

  function attachFlow() {
    document.addEventListener("input", collectFormData, true);
    document.addEventListener("change", collectFormData, true);

    document.addEventListener("click", event => {
      const element = event.target.closest(
        "button, a, input[type='button'], input[type='submit']"
      );

      if (!element || !isSaveOrPrint(element)) return;

      collectFormData();

      setTimeout(() => {
        collectFormData();
        fillPrintableForm();
      }, 250);

      setTimeout(() => {
        collectFormData();
        fillPrintableForm();
      }, 900);
    }, true);

    window.addEventListener("beforeprint", () => {
      collectFormData();
      fillPrintableForm();
    });

    window.addEventListener("storage", fillPrintableForm);
  }

  document.addEventListener("DOMContentLoaded", () => {
    removePublicPhoneNumber();
    attachFlow();
    fillPrintableForm();

    setTimeout(fillPrintableForm, 300);
    setTimeout(fillPrintableForm, 1000);
  });
})();
