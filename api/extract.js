import { createClerkClient } from "@clerk/backend";
import { requireAuth } from "./_lib/auth.js";
import { isTestMode, getTestCredits, setTestCredits } from "./_lib/testMode.js";
import XLSX from "xlsx";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

function safeJsonParse(text) {
  if (!text) return {};
  const clean = String(text).replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const i = clean.indexOf("{");
  const j = clean.lastIndexOf("}");
  if (i >= 0 && j > i) {
    try { return JSON.parse(clean.slice(i, j + 1)); } catch {}
  }
  return {};
}

function spreadsheetToText(file) {
  const buf = Buffer.from(file.data, "base64");
  const wb = XLSX.read(buf, { type: "buffer" });
  const chunks = [];
  for (const name of wb.SheetNames.slice(0, 5)) {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }).slice(0, 120);
    chunks.push(`Sheet: ${name}`);
    chunks.push(rows.map(r => (r || []).join(" | ")).join("\n"));
  }
  return chunks.join("\n\n").slice(0, 50000);
}

function normalizeExtraction(raw) {
  const src = (raw && typeof raw === 'object') ? (raw.extracted && typeof raw.extracted === 'object' ? raw.extracted : raw) : {};
  const out = { ...src };

  // Expanded alias map for robust fallback matching
  const aliases = {
    name: ['dealName', 'propertyName', 'assetName', 'dealTitle', 'projectName'],
    address: ['propertyAddress', 'assetAddress', 'siteAddress', 'location', 'streetAddress'],
    units: ['unitCount', 'numberOfUnits', 'totalUnits', 'unitCount'],
    sqft: ['squareFeet', 'buildingSqft', 'buildingSize', 'totalSqft', 'rentableSqft', 'netsf'],
    askingPrice: ['purchasePrice', 'listPrice', 'askPrice', 'purchasePrice', 'price', 'askingPrice'],
    offerPrice: ['proposedOffer', 'bidPrice', 'offerAmount'],
    grossIncome: ['grossRentalIncome', 'annualGrossIncome', 'gpr', 'potentialGrossIncome', 'pgi', 'annualIncome'],
    otherIncome: ['miscIncome', 'ancillaryIncome', 'parkingIncome', 'miscellaneousIncome'],
    occupancy: ['occupancyRate', 'occupancyPercent', 'occupiedUnits'],
    opex: ['operatingExpenses', 'totalOperatingExpenses', 'annualOpex', 'totalOpex'],
    taxes: ['propertyTaxes', 'annualTaxes', 'taxesAnnual', 'realEstateTaxes'],
    insurance: ['annualInsurance', 'insuranceCost', 'annualInsuranceCost', 'propertyInsurance'],
    ltv: ['loanToValue', 'ltvRatio', 'loanToValueRatio'],
    interestRate: ['rate', 'debtRate', 'interestRatePercent', 'mortgageRate'],
    amortizationYears: ['amortYears', 'amortization', 'amortizationPeriod', 'loanTerm'],
    exitCapRate: ['exitCap', 'terminalCapRate', 'capitalizedRate', 'exitCapitalizationRate'],
    rentGrowth: ['annualRentGrowth', 'rentGrowthRate', 'rentInflation'],
    expenseGrowth: ['annualExpenseGrowth', 'expenseGrowthRate'],
    loanAmount: ['principalAmount', 'debtAmount', 'mortgageAmount', 'loanBalance'],
    equityRaise: ['equityRequired', 'capitalRequired', 'investorContributions', 'lpCapital', 'equityCapital'],
    totalCapitalInvested: ['totalCapitalInvestment', 'allCapitalRequired'],
    totalProjectCost: ['totalDevelopmentCost', 'totalProjectCost', 'allInCost', 'allInTotalProjectCost'],
  };

  for (const [canonical, keys] of Object.entries(aliases)) {
    if (out[canonical] == null || out[canonical] === '') {
      for (const k of keys) {
        if (src[k] != null && src[k] !== '') { out[canonical] = src[k]; break; }
      }
    }
  }

  // Ensure critical fields for DCF are present and valid
  const dcfRequired = [
    'name', 'address', 'units', 'sqft', 'monthlyRentPerUnit', 'yearBuilt',
    'askingPrice', 'loanAmount', 'interestRate', 'amortizationYears',
    'grossIncome', 'occupancy', 'opex', 'ltv'
  ];

  // Include extraction notes if present
  const review_flags = [];
  if (out.extraction_notes) {
    review_flags.push(out.extraction_notes);
  }
  
  // Add flags for fields that were derived or ambiguous
  for (const field of dcfRequired) {
    if (!out[field] && out[field] !== 0 && out[field] !== false) {
      review_flags.push(`${field} was not found in source document`);
    }
  }

  if (review_flags.length > 0) {
    out.extraction_review_flags = review_flags;
  }

  return out;
}

function quickExtractFromCsv(files) {
  const out = {};
  for (const f of files) {
    if (f.mimeType !== "text/csv") continue;
    const text = Buffer.from(f.data, "base64").toString("utf8");
    for (const line of text.split(/\r?\n/)) {
      const [k, ...rest] = line.split(",");
      const key = (k || "").trim().toLowerCase();
      const val = rest.join(",").trim();
      if (!key || !val) continue;
      if (key.includes("deal name")) out.name = val;
      if (key.includes("address")) out.address = val;
      if (key.includes("units")) out.units = Number(val);
      if (key.includes("year built")) out.yearBuilt = Number(val);
      if (key.includes("square feet")) out.sqft = Number(val);
      if (key.includes("asking price") || key.includes("purchase price") || key.includes("list price")) out.askingPrice = Number(val);
      if (key.includes("gross income") || key.includes("gross rental income") || key === 'gpr') out.grossIncome = Number(val);
      if (key.includes("other income")) out.otherIncome = Number(val);
      if (key.includes("occupancy")) out.occupancy = Number(val);
      if (key.includes("operating expenses")) out.opex = Number(val);
      if (key === "taxes" || key.includes("property tax")) out.taxes = Number(val);
      if (key.includes("insurance")) out.insurance = Number(val);
      if (key.includes("maintenance")) out.expenseMaintenance = Number(val);
      if (key.includes("management")) out.expenseManagement = Number(val);
      if (key.includes("reserves")) out.expenseReserves = Number(val);
      if (key.includes("utilities")) out.expenseUtilities = Number(val);
      if (key.includes("capex") || key.includes("construction cost")) out.capex = Number(val);
      if (key.includes("arv") || key.includes("after repair value")) out.arv = Number(val);
      if (key.includes("loan amount")) out.loanAmount = Number(val);
      if (key.includes("equity raise") || key.includes("equity required") || key.includes("lp capital") || key.includes("investor contributions") || key.includes("cash required to close") || key.includes("total capital invested")) out.equityRaise = Number(val);
      if (key.includes("total capital invested")) out.totalCapitalInvested = Number(val);
      if (key.includes("total project cost") || key.includes("all-in total project cost")) out.totalProjectCost = Number(val);
      if (key.includes("cash left in deal") || key.includes("cash remaining after refinance")) out.cashLeftInDeal = Number(val);
      if (key.includes("refi") && key.includes("cash")) out.refiCashOut = Number(val);
      if (key.includes("preferred return") || key.includes("pref")) out.lpPrefRate = Number(val);
      if (key.includes("lp share") || key.includes("investor share") || key.includes("profit share")) out.lpProfitShare = Number(val);
      if (key.includes("common fees")) out.commonFees = Number(val);
      if (key.includes("management") && key.includes("%")) out.managementPct = Number(val);
      if (key === "ltv" || key.includes('loan to value')) out.ltv = Number(val);
      if (key.includes("interest rate") || key === 'rate' || key.includes('debt rate')) out.interestRate = Number(val);
      if (key.includes("amortization")) out.amortizationYears = Number(val);
      if (key.includes("exit cap")) out.exitCapRate = Number(val);
      if (key.includes("rent growth")) out.rentGrowth = Number(val);
      if (key.includes("expense growth")) out.expenseGrowth = Number(val);
    }
  }
  out.market = out.address?.includes("Houston") ? "Houston, TX" : null;
  out.summary = "Test-mode extraction generated from uploaded CSV.";
  return out;
}

function validateExtractionForDcf(extracted) {
  const issues = [];
  
  // Helper to convert various formats to numbers
  const num = (v, def = 0) => {
    if (v === null || v === undefined || v === '') return def;
    if (typeof v === 'number') return Number.isFinite(v) ? v : def;
    const str = String(v).trim().replace(/[,$%x]/g, '').replace(/,/g, '');
    const n = Number(str);
    return Number.isFinite(n) ? n : def;
  };
  
  const rate = (v, def = 0) => {
    const n = num(v, def);
    if (n > 1) return n / 100; // Convert percent to decimal
    return n;
  };

  const askingPrice = num(extracted.askingPrice);
  const loanAmount = num(extracted.loanAmount);
  const interestRate = rate(extracted.interestRate);
  const grossIncome = num(extracted.grossIncome);
  const opex = num(extracted.opex);
  const occupancy = num(extracted.occupancy, NaN);
  const equity = num(extracted.equityRaise) || num(extracted.totalCapitalInvested);

  // Critical validation: DCF requires these minimum values
  if (!askingPrice || askingPrice <= 0) {
    issues.push("Purchase price is missing or invalid. DCF cannot run without it.");
  }
  
  if (!grossIncome || grossIncome <= 0) {
    issues.push("Gross income is missing or invalid. Income is required for NOI calculation.");
  }
  
  if (!loanAmount || loanAmount <= 0) {
    issues.push("Loan amount is missing or invalid. Debt structure required.");
  }

  // NOI viability check
  if (grossIncome > 0 && opex > 0) {
    const noi = grossIncome - opex;
    if (noi <= 0) {
      issues.push(`WARNING: NOI is ${noi.toFixed(0)} (gross ${grossIncome} - opex ${opex}). This deal has negative cash flow.`);
    }
    if (noi < grossIncome * 0.15) {
      issues.push(`WARNING: NOI margin is thin (${((noi / grossIncome) * 100).toFixed(1)}%). Verify opex is not overstated.`);
    }
  }

  // Loan structure sanity checks
  if (askingPrice > 0 && loanAmount > askingPrice * 1.1) {
    issues.push(`WARNING: Loan (${(loanAmount / 1e6).toFixed(2)}M) exceeds purchase price (${(askingPrice / 1e6).toFixed(2)}M). Check for missing equity or construction loan.`);
  }

  // Interest rate reasonableness
  if (interestRate > 0 && (interestRate < 0.02 || interestRate > 0.15)) {
    issues.push(`WARNING: Interest rate ${(interestRate * 100).toFixed(2)}% seems unusual. Verify it's in decimal format (0.07 = 7%).`);
  }

  // Occupancy sanity
  if (Number.isFinite(occupancy)) {
    if (occupancy < 50 || occupancy > 105) {
      issues.push(`WARNING: Occupancy ${occupancy}% seems unusual. Should typically be 70-100%.`);
    }
  }

  // Loan-to-value sanity
  if (askingPrice > 0 && loanAmount > 0) {
    const ltv = loanAmount / askingPrice;
    if (ltv > 1.0) {
      issues.push(`WARNING: LTV ${(ltv * 100).toFixed(1)}% exceeds 100%. Verify this is intended.`);
    }
  }

  return issues;
}

async function callAnthropic(parts, systemPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: systemPrompt || undefined,
      messages: [{ role: "user", content: parts }],
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Extraction request failed");
  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { clerkUserId } = await requireAuth(req);
    const testMode = isTestMode();
    const user = testMode ? null : await clerkClient.users.getUser(clerkUserId);
    const credits = testMode ? getTestCredits() : Number(user.privateMetadata?.credits ?? process.env.STARTER_CREDITS ?? 0);
    if (credits <= 0) return res.status(402).json({ error: "No credits remaining", credits: 0 });

    const files = Array.isArray(req.body?.files) ? req.body.files : [];
    if (!files.length) return res.status(400).json({ error: "No files uploaded" });

    const parts = [];
    for (const f of files.slice(0, 8)) {
      const mime = f.mimeType || "application/octet-stream";
      if (mime === "application/pdf") {
        parts.push({ type: "document", source: { type: "base64", media_type: mime, data: f.data } });
      } else if (mime.startsWith("image/")) {
        parts.push({ type: "image", source: { type: "base64", media_type: mime, data: f.data } });
      } else if (mime === "text/csv") {
        const text = Buffer.from(f.data, "base64").toString("utf8").slice(0, 50000);
        parts.push({ type: "text", text: `CSV file (${f.name}):\n${text}` });
      } else if (mime.includes("excel") || mime.includes("spreadsheetml")) {
        const text = spreadsheetToText(f);
        parts.push({ type: "text", text: `Spreadsheet (${f.name}):\n${text}` });
      }
    }

    // Phase 1: Semantic extraction with document understanding
    const extractionSystem = `You are an expert real estate underwriter analyzing broker packages and investment documents.
Your job is to extract underwriting field values by understanding document CONTEXT and STRUCTURE, not by brittle cell-address assumptions.

Guidelines:
1. READ THE FULL DOCUMENT - Understand tables, sections, headers, and labels to infer meaning
2. SEMANTIC MATCHING - Map values by meaning (e.g., "Total Equity Raise" or "Investor Contributions" → equityRaise)
3. AMBIGUITY - If a value could mean multiple things, choose the most reasonable interpretation. FLAG it in "extraction_notes" if unclear.
4. VALIDATION - Cross-check related values (e.g., loan + equity should ≈ purchase price or project cost)
5. NO ESTIMATES - Only return values explicitly in the document. For missing fields, use null or 0.

Output ONLY valid JSON with these fields (use null for unknowns):
{
  "name": "property/deal name",
  "propertyType": "multifamily|industrial|office|mixed-use|...",
  "address": "full street address",
  "market": "City, State",
  "submarket": "neighborhood or submarket name",
  "units": "unit count (integer)",
  "sqft": "rentable square feet (number)",
  "monthlyRentPerUnit": "average monthly rent per unit",
  "yearBuilt": "year built (integer)",
  "askingPrice": "purchase price / asking price",
  "offerPrice": "offer price if different from asking",
  "arv": "after-repair or future value",
  "loanAmount": "primary loan amount (explicit)",
  "equityRaise": "equity raise or capital required (explicit)",
  "totalCapitalInvested": "total capital invested (different from equity if includes debt)",
  "totalProjectCost": "all-in development cost including land",
  "constructionCosts": "hard costs",
  "softCosts": "soft costs (fees, permits, etc)",
  "constructionLoanAmount": "construction debt",
  "refiLoanAmount": "refinance loan amount",
  "refiRate": "refinance interest rate",
  "loanType": "amortizing|io|construction|...",
  "ioYears": "interest-only period (years)",
  "grossIncome": "annual gross rental income",
  "otherIncome": "other annual income (parking, laundry, etc)",
  "occupancy": "occupancy rate (0-100)",
  "opex": "annual operating expenses",
  "taxes": "annual property taxes",
  "insurance": "annual insurance",
  "expenseMaintenance": "annual maintenance",
  "expenseManagement": "annual management fee",
  "expenseReserves": "annual reserves",
  "expenseUtilities": "annual utilities",
  "commonFees": "HOA or common area fees",
  "managementPct": "management fee as % of income",
  "cashLeftInDeal": "cash remaining in deal post-close",
  "cashRemainingAfterRefinance": "cash remaining after refi event",
  "refiCashOut": "cash pulled out at refi",
  "lpPrefRate": "LP preferred return rate (annual %)",
  "lpProfitShare": "LP share of profits after pref (%)",
  "ltv": "loan-to-value ratio (decimal: 0.70 = 70%)",
  "interestRate": "primary loan interest rate (decimal)",
  "amortizationYears": "amortization period (years)",
  "holdPeriod": "holding period (years)",
  "rentGrowth": "annual rent growth assumption (decimal)",
  "expenseGrowth": "annual expense growth assumption (decimal)",
  "exitCapRate": "exit/terminal cap rate (decimal)",
  "targetIRR": "target IRR (%)",
  "targetCoC": "target cash-on-cash return (%)",
  "capex": "capital expenditure",
  "extraction_notes": "brief note if any values were ambiguous or if review is recommended"
}`;

    parts.push({
      type: "text",
      text: `Extract underwriting data from these documents using semantic understanding.
You are analyzing real estate deal documents. Read each section carefully, understand the document structure and labels, and extract values accordingly.
Map loan/equity/cost items by their labels and meaning, not by position.
Return ONLY the JSON object (no markdown, no explanations).
If a value is ambiguous or missing, use null. Include extraction_notes if you had to interpret something.`
    });

    const extractedRaw = testMode
      ? quickExtractFromCsv(files)
      : safeJsonParse((await callAnthropic(parts, extractionSystem)).content?.map(c => c.text || "").join("\n"));

    const extracted = normalizeExtraction(extractedRaw);

    // Validate extraction integrity for DCF handoff
    const validationIssues = validateExtractionForDcf(extracted);
    if (validationIssues.length > 0) {
      if (!extracted.extraction_review_flags) {
        extracted.extraction_review_flags = [];
      }
      extracted.extraction_review_flags.push(...validationIssues);
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

    return res.status(200).json({ extracted, creditsRemaining: nextCredits });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return res.status(status).json({ error: error.message || "Extraction failed" });
  }
}
