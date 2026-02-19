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
      if (key.includes("asking price")) out.askingPrice = Number(val);
      if (key.includes("gross income")) out.grossIncome = Number(val);
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
      if (key.includes("common fees")) out.commonFees = Number(val);
      if (key.includes("management") && key.includes("%")) out.managementPct = Number(val);
      if (key === "ltv") out.ltv = Number(val);
      if (key.includes("interest rate")) out.interestRate = Number(val);
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

async function callAnthropic(parts) {
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

    parts.push({
      type: "text",
      text: `Extract underwriting data from these broker package files. Return ONLY JSON. Prioritize explicit values from documents over calculated defaults.
Required keys: {"name","propertyType","market","submarket","address","units","sqft","monthlyRentPerUnit","yearBuilt","askingPrice","offerPrice","arv","loanAmount","equityRaise","totalCapitalInvested","totalProjectCost","constructionCosts","softCosts","constructionLoanAmount","constructionLoanTermMonths","constructionInterestRate","refiLoanAmount","refiLtv","refiRate","loanType","ioYears","grossIncome","otherIncome","occupancy","opex","taxes","insurance","expenseMaintenance","expenseManagement","expenseReserves","expenseUtilities","capex","commonFees","managementPct","cashLeftInDeal","cashRemainingAfterRefinance","ltv","interestRate","amortizationYears","holdPeriod","rentGrowth","expenseGrowth","exitCapRate","targetIRR","targetCoC","summary"}.
Rules: If source has explicit loan/equity/ARV/line-items, use them. Only estimate when missing.
Equity extraction: explicitly search for these labels and map to equityRaise when present: "Total Equity Raise", "Equity Required", "LP Capital", "Investor Contributions", "Cash Required to Close", "Total Capital Invested".
Also extract "Cash Left in Deal" / "Cash Remaining After Refinance" when present for CoC denominator.
Equity priority: explicit equityRaise > totalCapitalInvested > (totalProjectCost - loanAmount) as last resort.
Loan amount priority: explicit loan amount > ARV*LTV > purchase price*LTV. Use null when unknown.`
    });

    const extracted = testMode
      ? quickExtractFromCsv(files)
      : safeJsonParse((await callAnthropic(parts)).content?.map(c => c.text || "").join("\n"));

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
