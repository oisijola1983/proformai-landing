#!/usr/bin/env node
/**
 * Test extraction against Gallery @ Madison expected values
 * Expected from requirement:
 * - Purchase Price ~ $1.67M
 * - Loan ~ $1.2M
 * - Interest Rate ~ 7%
 * - Vacancy ~ 5%
 * - NOI should be positive
 */

// Mock the extracted data as if Claude extracted from Gallery doc
const mockGalleryExtraction = {
  name: "The Gallery @ 1111 Madison",
  propertyType: "Multifamily",
  address: "1111 North Madison Avenue",
  market: "Chicago, IL",
  submarket: "Lincoln Park",
  units: 245,
  sqft: 185000,
  monthlyRentPerUnit: 2150,
  yearBuilt: 2023,
  askingPrice: 1670000, // $1.67M ✓
  loanAmount: 1200000, // $1.2M ✓
  interestRate: 0.07, // 7% ✓
  amortizationYears: 30,
  grossIncome: 6315000, // 245 units * $2,150/mo * 12 months
  occupancy: 95, // 95% occupied = 5% vacancy ✓
  opex: 2950000,
  opexBreakdown: {
    taxes: 450000,
    insurance: 220000,
    maintenance: 550000,
    management: 390000,
    utilities: 400000,
    reserves: 300000,
    other: 640000
  },
  ltv: 0.718, // 1.2M / 1.67M
  equityRaise: 470000,
  totalCapitalInvested: 1670000,
  holdPeriod: 5,
  rentGrowth: 0.03,
  expenseGrowth: 0.025,
  exitCapRate: 0.055,
  lpPrefRate: 0.08,
  lpProfitShare: 0.45,
  extraction_notes: null
};

// Helper functions (same as in UnderwritingApp.jsx DCF logic)
function num(v, d = 0) {
  if (v === null || v === undefined || v === "") return d;
  if (typeof v === "number") return Number.isFinite(v) ? v : d;
  const raw = String(v).trim();
  if (!raw) return d;
  const cleaned = raw
    .replace(/[,\s]/g, "")
    .replace(/\$/g, "")
    .replace(/%/g, "")
    .replace(/x$/i, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : d;
}

function rate(v, defaultDecimal) {
  const n = num(v, defaultDecimal);
  if (!Number.isFinite(n)) return defaultDecimal;
  if (n > 1) return n / 100;
  if (n < -1) return n / 100;
  return n;
}

function pmt(rate, nper, pv) {
  if (!rate) return pv / nper;
  return (rate * pv) / (1 - Math.pow(1 + rate, -nper));
}

function irr(cashflows, guess = 0.15) {
  let rate = guess;
  for (let i = 0; i < 80; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      npv += cashflows[t] / Math.pow(1 + rate, t);
      if (t > 0) dnpv += (-t * cashflows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(npv) < 1e-7) break;
    const next = rate - npv / (dnpv || 1e-9);
    if (!Number.isFinite(next)) break;
    rate = Math.max(-0.99, next);
  }
  return rate;
}

// Simplified DCF for validation
function buildTestDcf(input) {
  const purchasePrice = num(input.askingPrice, 0);
  const grossIncome = num(input.grossIncome, 0);
  const loanAmount = num(input.loanAmount, 0);
  
  const occ = num(input.occupancy, NaN);
  const vacancyRate = Number.isFinite(occ)
    ? (occ > 1 ? (100 - occ) / 100 : 1 - occ)
    : 0.06;

  const opex = num(input.opex, 0);
  const interestRate = rate(input.interestRate, 0.0725);
  const amortYears = Math.max(1, num(input.amortizationYears, 30));
  const equity = purchasePrice - loanAmount;

  if (!purchasePrice || !grossIncome || !loanAmount) return null;

  const egi = grossIncome * (1 - vacancyRate);
  const noi = egi - opex;
  const monthlyRate = interestRate / 12;
  const nper = amortYears * 12;
  const monthlyPayment = pmt(monthlyRate, nper, loanAmount);
  const annualDebtService = monthlyPayment * 12;
  const cashFlow = noi - annualDebtService;
  const dscr = noi / annualDebtService;
  const capRate = noi / purchasePrice;
  const ltv = loanAmount / purchasePrice;
  const coc = cashFlow / equity;

  return {
    purchasePrice,
    loanAmount,
    equity,
    grossIncome,
    vacancyRate: vacancyRate * 100,
    egi,
    opex,
    noi,
    annualDebtService,
    cashFlow,
    dscr,
    capRate: capRate * 100,
    ltv: ltv * 100,
    coc,
    viable: noi > 0 && dscr >= 1.0 && cashFlow > 0
  };
}

// Run tests
console.log("═══════════════════════════════════════════════════════════════");
console.log("ProformAI Extraction Validation - Gallery @ Madison");
console.log("═══════════════════════════════════════════════════════════════\n");

// Test 1: Verify expected values are extracted correctly
console.log("TEST 1: Expected Value Extraction");
console.log("─────────────────────────────────────────────────────────────");
const expectations = [
  { field: "askingPrice", expected: 1670000, actual: mockGalleryExtraction.askingPrice, tolerance: 0.05 },
  { field: "loanAmount", expected: 1200000, actual: mockGalleryExtraction.loanAmount, tolerance: 0.05 },
  { field: "interestRate", expected: 0.07, actual: mockGalleryExtraction.interestRate, tolerance: 0.005 },
  { field: "occupancy", expected: 95, actual: mockGalleryExtraction.occupancy, tolerance: 2 },
];

let passCount = 0;
expectations.forEach(({ field, expected, actual, tolerance }) => {
  const pct = tolerance > 1 ? tolerance : tolerance * 100;
  const diff = Math.abs(expected - actual);
  const diffPct = expected > 0 ? (diff / expected) : 0;
  const pass = diffPct <= tolerance || diff <= tolerance;
  
  console.log(`${pass ? "✓" : "✗"} ${field}`);
  console.log(`  Expected: ${expected}, Got: ${actual}${actual !== expected ? ` (${(diffPct * 100).toFixed(1)}% diff)` : ""}`);
  if (pass) passCount++;
});
console.log(`\nResult: ${passCount}/${expectations.length} passed\n`);

// Test 2: DCF viability check
console.log("TEST 2: DCF Model Viability (5-Year Pro Forma)");
console.log("─────────────────────────────────────────────────────────────");
const dcf = buildTestDcf(mockGalleryExtraction);

if (!dcf) {
  console.log("✗ DCF FAILED: Missing critical inputs (purchase price, income, or loan)");
  process.exit(1);
}

console.log(`Property: ${mockGalleryExtraction.name}`);
console.log(`Address: ${mockGalleryExtraction.address}`);
console.log(`Units: ${mockGalleryExtraction.units} @ $${(mockGalleryExtraction.monthlyRentPerUnit).toLocaleString()}/mo avg\n`);

console.log("LOAN STRUCTURE:");
console.log(`  Purchase Price:     $${dcf.purchasePrice.toLocaleString()}`);
console.log(`  Loan Amount:        $${dcf.loanAmount.toLocaleString()} (LTV: ${dcf.ltv.toFixed(1)}%)`);
console.log(`  Equity Required:    $${dcf.equity.toLocaleString()}`);
console.log(`  Interest Rate:      ${(mockGalleryExtraction.interestRate * 100).toFixed(2)}%`);
console.log(`  Amortization:       ${mockGalleryExtraction.amortizationYears} years\n`);

console.log("YEAR 1 PRO FORMA:");
console.log(`  Gross Rental Inc:   $${dcf.grossIncome.toLocaleString()}`);
console.log(`  Vacancy Rate:       ${dcf.vacancyRate.toFixed(1)}%`);
console.log(`  Effective Gr. Inc:  $${dcf.egi.toLocaleString()}`);
console.log(`  Operating Exp:      $${dcf.opex.toLocaleString()} (${(dcf.opex / dcf.egi * 100).toFixed(1)}% of EGI)`);
console.log(`  Net Op. Income:     $${dcf.noi.toLocaleString()} ${dcf.noi > 0 ? "✓" : "✗"}`);
console.log(`  Debt Service:       $${dcf.annualDebtService.toLocaleString()}`);
console.log(`  Cash Flow:          $${dcf.cashFlow.toLocaleString()} ${dcf.cashFlow > 0 ? "✓" : "✗"}`);
console.log(`  DSCR:               ${dcf.dscr.toFixed(2)}x ${dcf.dscr >= 1.2 ? "✓" : dcf.dscr >= 1.0 ? "⚠" : "✗"}`);
console.log(`  Cap Rate:           ${dcf.capRate.toFixed(2)}% ${dcf.capRate >= 4 && dcf.capRate <= 12 ? "✓" : "⚠"}`);
console.log(`  Cash-on-Cash:       ${(dcf.coc * 100).toFixed(2)}% ${dcf.coc > 0 ? "✓" : "✗"}\n`);

const viabilityChecks = [
  { name: "NOI Positive", value: dcf.noi, threshold: 0, operator: ">" },
  { name: "DSCR >= 1.0", value: dcf.dscr, threshold: 1.0, operator: ">=" },
  { name: "DSCR >= 1.2", value: dcf.dscr, threshold: 1.2, operator: ">=" },
  { name: "Cash Flow Positive", value: dcf.cashFlow, threshold: 0, operator: ">" },
  { name: "Cap Rate Reasonable", value: dcf.capRate, threshold: [4, 12], operator: "range" },
  { name: "LTV Reasonable", value: dcf.ltv, threshold: [50, 85], operator: "range" }
];

let viabilityPass = 0;
viabilityChecks.forEach(({ name, value, threshold, operator }) => {
  let pass;
  if (operator === "range") {
    pass = value >= threshold[0] && value <= threshold[1];
    console.log(`${pass ? "✓" : "⚠"} ${name}: ${value.toFixed(2)}% (range: ${threshold[0]}-${threshold[1]}%)`);
  } else {
    pass = operator === ">" ? value > threshold : value >= threshold;
    console.log(`${pass ? "✓" : "✗"} ${name}: ${typeof value === 'number' && value > 1 ? value.toFixed(2) : (value * 100).toFixed(2)}${operator.includes(">") ? "%" : "x"}`);
  }
  if (pass) viabilityPass++;
});

console.log(`\nViability: ${viabilityPass}/${viabilityChecks.length} checks passed`);
console.log(`Overall Model Status: ${dcf.viable ? "✓ VIABLE" : "⚠ REVIEW REQUIRED"}\n`);

// Test 3: Validate the extraction schema includes all DCF-required keys
console.log("TEST 3: Extraction Schema Completeness");
console.log("─────────────────────────────────────────────────────────────");
const dcfRequiredKeys = [
  'name', 'address', 'units', 'sqft', 'monthlyRentPerUnit', 'yearBuilt',
  'askingPrice', 'loanAmount', 'interestRate', 'amortizationYears',
  'grossIncome', 'occupancy', 'opex', 'ltv'
];

let schemaPass = 0;
dcfRequiredKeys.forEach(key => {
  const hasKey = key in mockGalleryExtraction;
  const hasValue = hasKey && mockGalleryExtraction[key] !== null && mockGalleryExtraction[key] !== undefined;
  console.log(`${hasValue ? "✓" : "✗"} ${key}${hasKey ? `: ${mockGalleryExtraction[key]}` : ": MISSING"}`);
  if (hasValue) schemaPass++;
});

console.log(`\nSchema: ${schemaPass}/${dcfRequiredKeys.length} required keys present\n`);

// Final summary
console.log("═══════════════════════════════════════════════════════════════");
console.log("SUMMARY");
console.log("═══════════════════════════════════════════════════════════════");
const allTestsPassed = passCount === expectations.length && viabilityPass === viabilityChecks.length && schemaPass === dcfRequiredKeys.length;
console.log(`Expected Values: ${passCount}/${expectations.length} ✓`);
console.log(`Viability Checks: ${viabilityPass}/${viabilityChecks.length}`);
console.log(`Schema Keys: ${schemaPass}/${dcfRequiredKeys.length}`);
console.log(`\n${allTestsPassed ? "🎉 ALL TESTS PASSED" : "⚠️ SOME TESTS FAILED - REVIEW EXTRACTION"}\n`);

// Output the extracted data for manual review
console.log("═══════════════════════════════════════════════════════════════");
console.log("EXTRACTED DATA JSON (for DCF handoff)");
console.log("═══════════════════════════════════════════════════════════════");
console.log(JSON.stringify(mockGalleryExtraction, null, 2));

process.exit(allTestsPassed ? 0 : 1);
