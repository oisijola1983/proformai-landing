import { createClerkClient } from "@clerk/backend";
import { requireAuth } from "./_lib/auth.js";
import { isTestMode, getTestCredits, setTestCredits } from "./_lib/testMode.js";
import XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const REQUIRED_DOC_TYPES = ["om", "t12", "rent_roll", "loan_term_sheet", "appraisal", "pfs", "construction_budget"];
const FIELD_NAMES = [
  "askingPrice", "offerPrice", "pricePerUnit", "pricePerSF", "arv",
  "name", "address", "propertyType", "market", "units", "yearBuilt", "sqft", "lotSize", "description",
  "grossIncome", "otherIncome", "occupancy", "marketRent", "monthlyRentPerUnit", "commonFees",
  "opex", "taxes", "insurance", "expenseMaintenance", "expenseManagement", "expenseReserves", "expenseUtilities", "capex",
  "ltv", "loanAmount", "interestRate", "amortizationYears", "loanType", "ioYears", "equityRaise", "totalCapitalInvested", "totalProjectCost",
  "constructionCosts", "softCosts", "constructionLoanAmount", "constructionLoanTermMonths", "constructionInterestRate",
  "refiLoanAmount", "refiLtv", "refiRate", "refiCashOut", "cashLeftInDeal",
  "targetCoC", "targetIRR", "targetMultiple", "holdPeriod", "rentGrowth", "expenseGrowth", "exitCapRate",
  "submarket", "comps", "businessPlan", "knownRisks", "additionalNotes",
];

const KEY_FIELDS = ["askingPrice", "grossIncome", "units", "ltv", "interestRate"];
const IMPORTANT_FIELDS = ["opex", "taxes", "insurance", "occupancy", "exitCapRate", "marketRent"];

function toNumber(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[,$%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toRate(v) {
  const n = toNumber(v);
  if (n == null) return null;
  return n > 1 ? n / 100 : n;
}

function safeJsonParse(text) {
  if (!text) return null;
  const clean = String(text).replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const i = clean.indexOf("{");
  const j = clean.lastIndexOf("}");
  if (i >= 0 && j > i) {
    try { return JSON.parse(clean.slice(i, j + 1)); } catch {}
  }
  return null;
}

function estimatePdfPages(file) {
  try {
    const buf = Buffer.from(file.data, "base64");
    const txt = buf.toString("latin1");
    const m = txt.match(/\/Type\s*\/Page\b/g);
    return m ? m.length : null;
  } catch {
    return null;
  }
}

function spreadsheetToStructuredText(file) {
  const buf = Buffer.from(file.data, "base64");
  const wb = XLSX.read(buf, { type: "buffer" });
  const out = [];
  for (const name of wb.SheetNames.slice(0, 8)) {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }).slice(0, 200);
    out.push(`# SHEET: ${name}`);
    rows.forEach((r, idx) => out.push(`${idx + 1}| ${(r || []).join(" | ")}`));
  }
  return out.join("\n").slice(0, 100000);
}

function csvToStructuredText(file) {
  const text = Buffer.from(file.data, "base64").toString("utf8");
  const lines = text.split(/\r?\n/).slice(0, 300);
  return lines.map((l, i) => `${i + 1}| ${l}`).join("\n").slice(0, 100000);
}

function isNumericLike(v) {
  if (v == null) return false;
  const s = String(v).trim();
  if (!s) return false;
  if (/^-?\d+(?:\.\d+)?%$/.test(s)) return true;
  if (/^\(?\$?-?\d[\d,]*(?:\.\d+)?\)?$/.test(s)) return true;
  return false;
}

function inferLikelyPurpose(name, headers = []) {
  const n = String(name || "").toLowerCase();
  const h = headers.map(x => String(x || "").toLowerCase()).join(" ");
  if (n.includes("rent") || h.includes("unit") || h.includes("tenant")) return "rent_roll";
  if (n.includes("cash flow") || h.includes("noi") || h.includes("debt service")) return "pro_forma";
  if (n.includes("draw") || n.includes("budget") || h.includes("construction")) return "expense_detail";
  return "mixed";
}

function parseSpreadsheetSemanticMap(file) {
  const buf = Buffer.from(file.data, "base64");
  const wb = XLSX.read(buf, { type: "buffer" });
  const sections = [];
  const tables = [];
  const key_value_pairs = [];

  for (const tabName of wb.SheetNames.slice(0, 20)) {
    const sheet = wb.Sheets[tabName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    const snippet = rows.slice(0, 8).map(r => (r || []).join(" | ")).join(" ").slice(0, 300);
    sections.push({
      title: tabName,
      page: sections.length + 1,
      content_type: "mixed",
      raw_text_snippet: snippet,
      detected_entities: ["price", "units", "income", "expenses", "loan", "ltv"],
    });

    const nonEmptyRows = rows.filter(r => Array.isArray(r) && r.some(c => String(c ?? "").trim() !== ""));
    const headerRow = nonEmptyRows.find(r => (r || []).some(c => /year\s*\d|month|noi|debt service|cash flow|rent/i.test(String(c || ""))));
    if (headerRow) {
      tables.push({
        page: sections.length,
        headers: headerRow.filter(Boolean).slice(0, 20),
        row_count: rows.length,
        likely_purpose: inferLikelyPurpose(tabName, headerRow),
      });
    }

    // Vertical label-value extraction: col A label + nearby numeric/percent value
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || [];
      for (let j = 0; j < Math.min(r.length, 8); j++) {
        const label = String(r[j] ?? "").trim();
        if (!label || label.length < 2 || isNumericLike(label)) continue;
        if (/^(year\s*\d+|month|notes?)$/i.test(label)) continue;

        let rawValue = null;
        let valueCol = j + 1;
        for (let k = j + 1; k < Math.min(r.length, j + 11); k++) {
          const cand = String(r[k] ?? "").trim();
          if (cand && isNumericLike(cand)) {
            rawValue = cand;
            valueCol = k;
            break;
          }
        }

        if (!rawValue && /^(year\s*1|y1)$/i.test(String((rows[0] || [])[j + 1] || ""))) {
          const cand = String((rows[i] || [])[j + 1] ?? "").trim();
          if (cand && isNumericLike(cand)) {
            rawValue = cand;
            valueCol = j + 1;
          }
        }

        if (rawValue) {
          key_value_pairs.push({
            label,
            raw_value: rawValue,
            page: sections.length,
            section: tabName,
            tab_name: tabName,
            row_index: i + 1,
            col_index: j + 1,
          });
        }
      }
    }

    // Horizontal time-series extraction: Year 1 values from header row tables
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || [];
      let year1Col = -1;
      for (let j = 0; j < r.length; j++) {
        const cell = String(r[j] ?? "").trim();
        if (/^(year\s*1|y1)$/i.test(cell)) { year1Col = j; break; }
      }
      if (year1Col > 0) {
        for (let rr = i + 1; rr < Math.min(rows.length, i + 300); rr++) {
          const row = rows[rr] || [];
          const label = String(row[0] ?? "").trim();
          const v = String(row[year1Col] ?? "").trim();
          if (!label || !v || !isNumericLike(v)) continue;
          key_value_pairs.push({
            label,
            raw_value: v,
            page: sections.length,
            section: tabName,
            tab_name: tabName,
            row_index: rr + 1,
            col_index: year1Col + 1,
          });
        }
      }
    }
  }

  return {
    documents: {
      [file.name]: {
        sections,
        tables,
        key_value_pairs,
      },
    },
  };
}

function emptyField(name) {
  return {
    value: null,
    raw_value: null,
    source_snippet: null,
    location: null,
    confidence: null,
    not_found_in_source: true,
    conflict: false,
    conflict_detail: null,
    suggested_derivation: null,
    field: name,
  };
}

function normalizeDocuments(files, docs = []) {
  const byName = new Map((docs || []).map(d => [d.filename, d]));
  return files.map((f) => {
    const got = byName.get(f.name) || {};
    const mime = f.mimeType || "application/octet-stream";
    const page_count = got.page_count ?? (mime === "application/pdf" ? estimatePdfPages(f) : 1);

    let inferredType = got.doc_type || "unknown";
    let inferredConfidence = got.doc_type_confidence || "low";
    let inferredReason = got.classification_reasoning || "No confident document-type signal found.";

    if (inferredType === "unknown" && (mime.includes("excel") || mime.includes("spreadsheetml"))) {
      try {
        const wb = XLSX.read(Buffer.from(f.data, "base64"), { type: "buffer" });
        const names = wb.SheetNames.map(s => s.toLowerCase()).join(" ");
        if (/draw schedule|construction|capital flow|refi/i.test(names)) {
          inferredType = "construction_budget";
          inferredConfidence = "high";
          inferredReason = "Sheet names indicate development/construction budget and refinance structure.";
        } else if (/rent roll/i.test(names)) {
          inferredType = "rent_roll";
          inferredConfidence = "high";
          inferredReason = "Sheet names indicate rent roll structure.";
        } else if (/t-?12|trailing/i.test(names)) {
          inferredType = "t12";
          inferredConfidence = "medium";
          inferredReason = "Sheet names suggest trailing income statement pattern.";
        }
      } catch {
        // keep unknown
      }
    }

    return {
      filename: f.name,
      doc_type: inferredType,
      doc_type_confidence: inferredConfidence,
      page_count: page_count || null,
      classification_reasoning: inferredReason,
    };
  });
}

function normalizeSemanticMap(map = {}, files = [], localMaps = {}) {
  const m = (map && typeof map === "object") ? map : {};
  const docMaps = (m.documents && typeof m.documents === "object") ? m.documents : {};
  const localDocMaps = (localMaps && typeof localMaps === "object" && localMaps.documents && typeof localMaps.documents === "object") ? localMaps.documents : {};
  const normalized = { documents: {} };

  for (const f of files) {
    const d = docMaps[f.name] || {};
    const ld = localDocMaps[f.name] || {};
    const sections = [
      ...(Array.isArray(ld.sections) ? ld.sections : []),
      ...(Array.isArray(d.sections) ? d.sections : []),
    ];
    const tables = [
      ...(Array.isArray(ld.tables) ? ld.tables : []),
      ...(Array.isArray(d.tables) ? d.tables : []),
    ];
    const kv = [
      ...(Array.isArray(ld.key_value_pairs) ? ld.key_value_pairs : []),
      ...(Array.isArray(d.key_value_pairs) ? d.key_value_pairs : []),
    ];

    const kvDedup = [];
    const seen = new Set();
    for (const item of kv) {
      const fp = `${item?.tab_name || item?.section || ""}|${item?.row_index || ""}|${item?.col_index || ""}|${item?.label || ""}|${item?.raw_value || ""}`;
      if (seen.has(fp)) continue;
      seen.add(fp);
      kvDedup.push(item);
    }

    normalized.documents[f.name] = {
      sections,
      tables,
      key_value_pairs: kvDedup,
    };
  }
  return normalized;
}

function normalizeExtracted(extracted = {}) {
  const out = {};
  for (const key of FIELD_NAMES) {
    const v = extracted?.[key];
    if (v && typeof v === "object" && ("value" in v || "not_found_in_source" in v)) {
      out[key] = {
        ...emptyField(key),
        ...v,
        field: key,
      };
    } else if (v != null && v !== "") {
      out[key] = {
        ...emptyField(key),
        value: v,
        raw_value: String(v),
        source_snippet: "Value returned without evidence envelope.",
        confidence: "low",
        not_found_in_source: false,
        field: key,
      };
    } else {
      out[key] = emptyField(key);
    }
  }
  return out;
}

function runCrossChecks(extracted) {
  const pick = (k) => extracted[k]?.value;
  const askingPrice = toNumber(pick("askingPrice"));
  const loanAmount = toNumber(pick("loanAmount"));
  const equityRaise = toNumber(pick("equityRaise"));
  const totalProjectCost = toNumber(pick("totalProjectCost"));
  const ltv = toRate(pick("ltv"));
  const grossIncome = toNumber(pick("grossIncome"));
  const opex = toNumber(pick("opex"));
  const occupancy = toNumber(pick("occupancy"));
  const units = toNumber(pick("units"));
  const pricePerUnit = toNumber(pick("pricePerUnit"));
  const monthlyRentPerUnit = toNumber(pick("monthlyRentPerUnit"));
  const arv = toNumber(pick("arv"));

  const vacancyRate = occupancy == null ? 0.08 : (occupancy > 1 ? (100 - occupancy) / 100 : 1 - occupancy);
  const noi = (grossIncome ?? 0) * (1 - vacancyRate) - (opex ?? 0);

  const result = {
    cost_stack: { pass: true, detail: "Insufficient data" },
    ltv_sanity: { pass: true, detail: "Insufficient data" },
    noi_sanity: { pass: true, detail: "Insufficient data" },
    expense_ratio: { pass: true, detail: "Insufficient data" },
    debt_yield: { pass: true, detail: "Insufficient data" },
    unit_math: { pass: true, detail: "Insufficient data" },
    rent_math: { pass: true, detail: "Insufficient data" },
    occupancy_sanity: { pass: true, detail: "Insufficient data" },
    cap_rate_sanity: { pass: true, detail: "Insufficient data" },
    arv_vs_price: { pass: true, detail: "Insufficient data" },
  };

  if (loanAmount != null && equityRaise != null && totalProjectCost != null && totalProjectCost !== 0) {
    const diff = Math.abs((loanAmount + equityRaise) - totalProjectCost) / totalProjectCost;
    result.cost_stack = {
      pass: diff <= 0.05,
      detail: `Loan ${loanAmount} + Equity ${equityRaise} vs Total ${totalProjectCost} (diff ${(diff * 100).toFixed(2)}%)`,
    };
  }

  if (loanAmount != null && askingPrice != null && askingPrice > 0 && ltv != null) {
    const calc = loanAmount / askingPrice;
    const diff = Math.abs(calc - ltv);
    result.ltv_sanity = {
      pass: diff <= 0.03,
      detail: `Stated LTV ${(ltv * 100).toFixed(2)}% vs calc ${(calc * 100).toFixed(2)}% (diff ${(diff * 100).toFixed(2)}%)`,
    };
  }

  if (grossIncome != null && opex != null) {
    result.noi_sanity = {
      pass: noi > 0,
      detail: `NOI ${(noi || 0).toFixed(2)}`,
    };
    const ratio = grossIncome ? opex / grossIncome : null;
    if (ratio != null) {
      result.expense_ratio = {
        pass: ratio >= 0.25 && ratio <= 0.65,
        detail: `Expense ratio ${(ratio * 100).toFixed(2)}%`,
      };
    }
  }

  if (noi != null && loanAmount != null && loanAmount > 0) {
    const dy = noi / loanAmount;
    result.debt_yield = {
      pass: dy >= 0.07,
      detail: `Debt yield ${(dy * 100).toFixed(2)}%`,
    };
  }

  if (pricePerUnit != null && units != null && askingPrice != null && askingPrice > 0) {
    const calc = pricePerUnit * units;
    const diff = Math.abs(calc - askingPrice) / askingPrice;
    result.unit_math = {
      pass: diff <= 0.05,
      detail: `${pricePerUnit} × ${units} = ${calc} vs asking ${askingPrice} (diff ${(diff * 100).toFixed(2)}%)`,
    };
  }

  if (monthlyRentPerUnit != null && units != null && grossIncome != null && grossIncome > 0) {
    const calc = monthlyRentPerUnit * units * 12;
    const diff = Math.abs(calc - grossIncome) / grossIncome;
    result.rent_math = {
      pass: diff <= 0.10,
      detail: `${monthlyRentPerUnit} × ${units} × 12 = ${calc} vs gross ${grossIncome} (diff ${(diff * 100).toFixed(2)}%)`,
    };
  }

  if (occupancy != null) {
    const occPct = occupancy > 1 ? occupancy : occupancy * 100;
    result.occupancy_sanity = {
      pass: occPct >= 50 && occPct <= 100,
      detail: `Occupancy ${occPct.toFixed(2)}%`,
    };
  }

  if (noi != null && askingPrice != null && askingPrice > 0) {
    const cap = noi / askingPrice;
    result.cap_rate_sanity = {
      pass: cap >= 0.03 && cap <= 0.15,
      detail: `Cap rate ${(cap * 100).toFixed(2)}%`,
    };
  }

  if (arv != null && askingPrice != null) {
    result.arv_vs_price = {
      pass: arv > askingPrice,
      detail: `ARV ${arv} vs asking ${askingPrice}`,
    };
  }

  return result;
}

function suggestionForMissingField(field, primaryDocType) {
  if (primaryDocType === "construction_budget" && ["grossIncome", "opex", "occupancy", "exitCapRate"].includes(field)) {
    return "Check Portfolio Cash Flow tab — Year 1 income assumptions should contain this value";
  }
  if (primaryDocType === "om") return "Request T-12 or rent roll from broker";
  if (primaryDocType === "t12") return "Cross-reference with OM or rent roll";
  return "Upload supporting document containing this field";
}

function computeQuality(extracted, crossChecks, documents) {
  const missingEvidence = [];
  const crossFailures = Object.entries(crossChecks)
    .filter(([, v]) => v && v.pass === false)
    .map(([k]) => k);

  let needsReview = false;
  const primaryDocType = (documents.find(d => d.doc_type && d.doc_type !== "unknown") || {}).doc_type || "unknown";

  for (const f of KEY_FIELDS) {
    const item = extracted[f];
    if (!item || item.value == null || item.confidence === "low") {
      needsReview = true;
      missingEvidence.push({
        field: f,
        severity: "critical",
        reason: item?.value == null ? "Not found in any uploaded document" : "Low confidence extraction",
        suggestion: suggestionForMissingField(f, primaryDocType),
      });
    }
  }

  for (const f of IMPORTANT_FIELDS) {
    const item = extracted[f];
    if (!item || item.value == null) {
      missingEvidence.push({
        field: f,
        severity: "important",
        reason: "Missing from current extraction evidence",
        suggestion: suggestionForMissingField(f, primaryDocType),
      });
    }
  }

  if (crossFailures.length >= 3) needsReview = true;

  const coverage = Object.fromEntries(REQUIRED_DOC_TYPES.map(t => [t, false]));
  for (const d of documents) {
    if (coverage[d.doc_type] !== undefined && d.doc_type_confidence !== "low") coverage[d.doc_type] = true;
  }
  const missingDocs = Object.entries(coverage).filter(([, v]) => !v).map(([k]) => k);

  let score = 100;
  score -= missingEvidence.filter(m => m.severity === "critical").length * 12;
  score -= missingEvidence.filter(m => m.severity === "important").length * 5;
  score -= crossFailures.length * 4;
  score = Math.max(0, Math.min(100, score));

  const summary = (() => {
    const found = FIELD_NAMES.filter(k => extracted[k]?.value != null).length;
    return `${found}/${FIELD_NAMES.length} fields resolved with evidence. ${missingEvidence.length} gaps identified. ${crossFailures.length} cross-checks failed.`;
  })();

  return {
    needs_review: needsReview,
    quality_score: score,
    missing_evidence: missingEvidence,
    cross_check_failures: crossFailures,
    doc_coverage: coverage,
    missing_docs: missingDocs,
    summary,
  };
}

function logQualityScore(payload) {
  try {
    const root = process.cwd();
    const p = path.join(root, "shared", "logs", "extraction-quality.jsonl");
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.appendFileSync(p, JSON.stringify(payload) + "\n", "utf8");
  } catch {
    // best-effort only
  }
}

async function callAnthropic(parts) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");

  const systemPrompt = `You are ProformAI's extraction engine.
Return ONE JSON object only.
Execute in 5 passes in a SINGLE response:
1) document classification per file
2) semantic_map per document (sections/tables/key_value_pairs)
3) evidence-based extracted fields with provenance, confidence, conflict handling
4) cross_checks using the specified rules
5) quality gate fields (needs_review, quality_score, missing_evidence, cross_check_failures, doc_coverage, missing_docs, summary)

Rules:
- Never guess values.
- If missing, return value:null and not_found_in_source:true.
- Confidence: high|medium|low.
- Include location {filename,page,section} whenever possible.
- Detect conflicting values across documents.
- Output keys must include all requested extraction fields.`;

  const userInstruction = {
    type: "text",
    text: `Perform complete document-first extraction for all uploaded documents.
Return this exact top-level shape:
{
  "documents": [...],
  "semantic_map": {"documents": {"<filename>": {"sections":[],"tables":[],"key_value_pairs":[]}}},
  "extracted": {"<field>": {...}},
  "cross_checks": {...},
  "needs_review": true|false,
  "quality_score": 0-100,
  "missing_evidence": [...],
  "cross_check_failures": [...],
  "doc_coverage": {...},
  "missing_docs": [...],
  "summary": "..."
}`,
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-20250514",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: [...parts, userInstruction] }],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Extraction request failed");
  const text = data?.content?.map(c => c.text || "").join("\n") || "";
  const parsed = safeJsonParse(text);
  if (!parsed) throw new Error("Model response was not valid JSON");
  return parsed;
}

function buildParts(files) {
  const parts = [];
  for (const f of files.slice(0, 10)) {
    const mime = f.mimeType || "application/octet-stream";
    if (mime === "application/pdf") {
      parts.push({ type: "document", source: { type: "base64", media_type: mime, data: f.data } });
    } else if (mime.startsWith("image/")) {
      parts.push({ type: "image", source: { type: "base64", media_type: mime, data: f.data } });
    } else if (mime === "text/csv") {
      parts.push({ type: "text", text: `FILE: ${f.name}\nTYPE: csv\n${csvToStructuredText(f)}` });
    } else if (mime.includes("excel") || mime.includes("spreadsheetml")) {
      const deep = parseSpreadsheetSemanticMap(f);
      const kv = deep?.documents?.[f.name]?.key_value_pairs || [];
      parts.push({
        type: "text",
        text: `FILE: ${f.name}\nTYPE: spreadsheet\nLAYOUT: full-grid-parse\n${spreadsheetToStructuredText(f)}\n\nPASS2_KEY_VALUE_PAIRS_JSON:\n${JSON.stringify(kv.slice(0, 1200))}`,
      });
    } else {
      parts.push({ type: "text", text: `FILE: ${f.name}\nUnsupported mime ${mime} for direct parse.` });
    }
  }
  return parts;
}

function buildTestModeResult(files) {
  const documents = normalizeDocuments(files, files.map(f => ({
    filename: f.name,
    doc_type: (f.mimeType || "").includes("csv") ? "rent_roll" : "unknown",
    doc_type_confidence: (f.mimeType || "").includes("csv") ? "medium" : "low",
    page_count: 1,
    classification_reasoning: "TEST_MODE heuristic classification",
  })));

  const semantic_map = normalizeSemanticMap({}, files);
  const extracted = normalizeExtracted({});
  const cross_checks = runCrossChecks(extracted);
  const q = computeQuality(extracted, cross_checks, documents);
  return { documents, semantic_map, extracted, cross_checks, ...q };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let clerkUserId = null;
  let user = null;
  let credits = 0;
  const pass_errors = [];

  try {
    ({ clerkUserId } = await requireAuth(req));
    const testMode = isTestMode();
    user = testMode ? null : await clerkClient.users.getUser(clerkUserId);
    credits = testMode ? getTestCredits() : Number(user.privateMetadata?.credits ?? process.env.STARTER_CREDITS ?? 0);

    if (credits <= 0) {
      return res.status(402).json({ error: "No credits remaining", credits: 0 });
    }

    const files = Array.isArray(req.body?.files) ? req.body.files : [];
    if (!files.length) {
      return res.status(400).json({ error: "No files uploaded", pass_errors: ["files_missing"] });
    }

    let payload;
    try {
      const localSemantic = { documents: {} };
      for (const f of files) {
        const mime = f.mimeType || "";
        if (mime.includes("excel") || mime.includes("spreadsheetml")) {
          const parsed = parseSpreadsheetSemanticMap(f);
          localSemantic.documents[f.name] = parsed.documents[f.name];
        }
      }

      if (testMode) {
        payload = buildTestModeResult(files);
        payload.semantic_map = normalizeSemanticMap(payload.semantic_map, files, localSemantic);
      } else {
        const parts = buildParts(files);
        const modelOut = await callAnthropic(parts);

        const documents = normalizeDocuments(files, modelOut.documents || []);
        const semantic_map = normalizeSemanticMap(modelOut.semantic_map, files, localSemantic);
        const extracted = normalizeExtracted(modelOut.extracted || {});
        const cross_checks = runCrossChecks(extracted);
        const quality = computeQuality(extracted, cross_checks, documents);

        payload = {
          documents,
          semantic_map,
          extracted,
          cross_checks,
          needs_review: modelOut.needs_review ?? quality.needs_review,
          quality_score: Number.isFinite(Number(modelOut.quality_score)) ? Number(modelOut.quality_score) : quality.quality_score,
          missing_evidence: Array.isArray(modelOut.missing_evidence) ? modelOut.missing_evidence : quality.missing_evidence,
          cross_check_failures: Array.isArray(modelOut.cross_check_failures) ? modelOut.cross_check_failures : quality.cross_check_failures,
          doc_coverage: modelOut.doc_coverage && typeof modelOut.doc_coverage === "object" ? modelOut.doc_coverage : quality.doc_coverage,
          missing_docs: Array.isArray(modelOut.missing_docs) ? modelOut.missing_docs : quality.missing_docs,
          summary: modelOut.summary || quality.summary,
        };
      }
    } catch (e) {
      pass_errors.push(`pipeline_error: ${e.message}`);
      const fallback = buildTestModeResult(files);
      payload = {
        ...fallback,
        needs_review: true,
        summary: "Partial extraction returned due to pipeline error. Review recommended.",
      };
    }

    const nextCredits = Math.max(0, credits - 1);
    if (testMode) {
      setTestCredits(nextCredits);
    } else {
      await clerkClient.users.updateUserMetadata(clerkUserId, {
        privateMetadata: {
          ...(user.privateMetadata || {}),
          credits: nextCredits,
          lastExtractionAt: new Date().toISOString(),
        },
      });
    }

    logQualityScore({
      at: new Date().toISOString(),
      quality_score: payload.quality_score,
      needs_review: payload.needs_review,
      cross_check_failures: payload.cross_check_failures?.length || 0,
      missing_evidence: payload.missing_evidence?.length || 0,
      docs: payload.documents?.map(d => ({ filename: d.filename, type: d.doc_type, conf: d.doc_type_confidence })) || [],
    });

    return res.status(200).json({ ...payload, pass_errors, creditsRemaining: nextCredits });
  } catch (error) {
    // return partial envelope instead of hard-empty 500
    const extracted = normalizeExtracted({});
    const cross_checks = runCrossChecks(extracted);
    const quality = computeQuality(extracted, cross_checks, []);
    return res.status(200).json({
      documents: [],
      semantic_map: { documents: {} },
      extracted,
      cross_checks,
      ...quality,
      pass_errors: [...pass_errors, `fatal_error: ${error.message || "Extraction failed"}`],
      error: error.message || "Extraction failed",
      creditsRemaining: credits,
    });
  }
}
