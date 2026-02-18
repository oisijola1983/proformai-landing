import { createClerkClient } from "@clerk/backend";
import { requireAuth } from "./_lib/auth.js";
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
    const user = await clerkClient.users.getUser(clerkUserId);
    const credits = Number(user.privateMetadata?.credits ?? process.env.STARTER_CREDITS ?? 0);
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
      text: `Extract underwriting data from these broker package files. Return ONLY JSON with keys: {"name","propertyType","market","address","units","yearBuilt","lotSize","sqft","description","askingPrice","pricePerUnit","pricePerSF","grossIncome","otherIncome","occupancy","marketRent","opex","taxes","insurance","capex","submarket","comps","knownRisks","ltv","interestRate","holdPeriod","targetIRR","targetCoC","summary"}. Include debt terms, vacancy, cap rate notes in summary if found. Use null when unknown.`
    });

    const data = await callAnthropic(parts);
    const raw = (data.content || []).map(c => c.text || "").join("\n");
    const extracted = safeJsonParse(raw);

    const nextCredits = Math.max(0, credits - 1);
    await clerkClient.users.updateUserMetadata(clerkUserId, {
      privateMetadata: {
        ...(user.privateMetadata || {}),
        credits: nextCredits,
        lastExtractionAt: new Date().toISOString(),
      },
    });

    return res.status(200).json({ extracted, creditsRemaining: nextCredits });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return res.status(status).json({ error: error.message || "Extraction failed" });
  }
}
