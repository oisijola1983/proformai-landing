# ProformAI API Integration Guide

**Purpose:** Enable customers to integrate ProformAI document extraction into their workflows  
**Status:** Live API, ready for production integration  
**Version:** 1.0  
**Last Updated:** August 18, 2026

---

## Quick Start (5 minutes)

### 1. Get API Credentials

After signing up for ProformAI, you'll receive:
- **API Key** — Authentication token (keep secret)
- **Organization ID** — Identifies your workspace
- **API Base URL** — `https://proformai.com/api`

### 2. Make Your First Request

Extract structured data from a real estate document:

```bash
curl -X POST https://proformai.com/api/extract \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "file": "base64-encoded-pdf-or-image",
    "documentType": "rent_roll",
    "expectedFields": ["address", "units", "marketRent", "occupancy"]
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "extracted": {
    "address": "123 Main St, San Francisco, CA 94110",
    "units": 24,
    "marketRent": 3500,
    "occupancy": 0.95,
    "confidence": {
      "address": 0.99,
      "units": 0.98,
      "marketRent": 0.87,
      "occupancy": 0.92
    }
  },
  "creditsUsed": 1,
  "processingTimeMs": 2340
}
```

### 3. Integrate Into Your App

See language-specific examples below.

---

## API Endpoints

### POST /api/extract

**Extract structured data from documents**

**Request:**
```typescript
{
  // Required: Document content
  file: string;              // Base64-encoded file (PDF, PNG, JPG, XLSX, CSV)
  
  // Optional: Guide extraction
  documentType?: 'om' | 't12' | 'rent_roll' | 'loan_term_sheet' | 'appraisal' | 'pfs' | 'construction_budget';
  expectedFields?: string[]; // Fields to prioritize extraction for
  
  // Optional: Configuration
  strictMode?: boolean;      // Only return high-confidence fields (>90%)
  includeRaw?: boolean;      // Return raw document text for reference
  language?: 'en' | 'es' | 'fr'; // Document language (default: en)
}
```

**Response:**
```typescript
{
  success: boolean;
  extracted: Record<string, any>;    // Structured data (keys vary by documentType)
  confidence: Record<string, number>; // 0-1 confidence scores per field
  warnings: string[];                 // Warnings (missing fields, low confidence, etc.)
  creditsUsed: number;                // Credits charged (1 credit = 1 document)
  processingTimeMs: number;           // How long extraction took
  
  // Optional: When includeRaw=true
  rawText?: string;                   // Full extracted text from document
  detectedDocumentType?: string;      // If auto-detected
  metadata?: {
    fileName?: string;
    fileSize?: number;
    pageCount?: number;
  };
}
```

### POST /api/batch

**Extract from multiple documents in one request**

**Request:**
```typescript
{
  files: Array<{
    file: string;                    // Base64 content
    documentType?: string;           // Optional type hint
    expectedFields?: string[];
  }>;
  
  // Optional
  strictMode?: boolean;
  includeRaw?: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  results: Array<{
    fileIndex: number;
    extracted: Record<string, any>;
    confidence: Record<string, number>;
    warnings: string[];
    creditsUsed: number;
    processingTimeMs: number;
  }>;
  totalCreditsUsed: number;
  totalProcessingTimeMs: number;
}
```

### GET /api/credits

**Check remaining API credits**

**Request:**
```bash
curl https://proformai.com/api/credits \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "remaining": 4325,
  "usedThisMonth": 675,
  "monthlyLimit": 5000,
  "resetDate": "2026-09-18T00:00:00Z"
}
```

---

## Supported Document Types

ProformAI specializes in **real estate financial documents**. The more specific you are, the better the results.

| Type | Use Case | Example Fields |
|------|----------|-----------------|
| **om** | Offering Memorandum | askingPrice, assetType, location, highlights, risks |
| **t12** | 12-Month P&L | grossIncome, opex, noi, occupancy, rentGrowth |
| **rent_roll** | Unit-Level Rent Roll | address, units, marketRent, occupancy, commonFees |
| **loan_term_sheet** | Loan Documents | loanAmount, interestRate, amortizationYears, ltv |
| **appraisal** | Property Appraisal | marketValue, appraiserComments, comparables |
| **pfs** | Personal Financial Statement | assets, liabilities, netWorth, liquidAssets |
| **construction_budget** | Construction Cost Estimate | totalBudget, laborCosts, materialCosts, contingency |

**For mixed documents:** Omit `documentType` and ProformAI will auto-detect.

---

## Supported Fields

ProformAI extracts **170+ fields** from real estate documents. Common fields include:

### Property Information
- `address`, `propertyType`, `units`, `yearBuilt`, `sqft`, `lotSize`
- `market`, `submarket`, `description`

### Financial Metrics
- `grossIncome`, `otherIncome`, `occupancy`
- `opex`, `taxes`, `insurance`, `maintenance`, `capex`
- `noi`, `capRate`

### Pricing
- `askingPrice`, `offerPrice`, `pricePerUnit`, `pricePerSF`
- `arv` (After-Repair Value)

### Lending
- `loanAmount`, `ltv`, `interestRate`, `amortizationYears`
- `debtService`, `debtServiceCoverage`

### Investment Returns
- `targetCoC` (Cash-on-Cash), `targetIRR`, `targetMultiple`
- `holdPeriod`, `exitCapRate`

**Full field list:** [Download as JSON](./FIELD_REFERENCE.json)

---

## Language-Specific Examples

### Python

```python
import requests
import base64

# 1. Prepare your document
with open("rent_roll.pdf", "rb") as f:
    file_data = base64.b64encode(f.read()).decode()

# 2. Make request
response = requests.post(
    "https://proformai.com/api/extract",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "file": file_data,
        "documentType": "rent_roll",
        "expectedFields": ["address", "units", "marketRent", "occupancy"]
    }
)

# 3. Parse response
data = response.json()
if data["success"]:
    print(f"Address: {data['extracted']['address']}")
    print(f"Units: {data['extracted']['units']}")
    print(f"Confidence: {data['confidence']['units']}")
else:
    print(f"Error: {data.get('error')}")
```

### JavaScript / Node.js

```javascript
import fs from "fs";

const API_KEY = "your-api-key-here";
const API_URL = "https://proformai.com/api/extract";

async function extractDocument(filePath, documentType) {
  // Read and encode file
  const fileData = fs.readFileSync(filePath);
  const base64 = fileData.toString("base64");

  // Make request
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file: base64,
      documentType: documentType,
      expectedFields: ["address", "units", "grossIncome"],
    }),
  });

  // Handle response
  const data = await response.json();
  if (data.success) {
    console.log("Extracted:", data.extracted);
    console.log("Confidence:", data.confidence);
  }
  return data;
}

// Usage
extractDocument("property_analysis.pdf", "om");
```

### cURL

```bash
#!/bin/bash

API_KEY="your-api-key-here"
FILE_PATH="./document.pdf"

# Encode file as base64
FILE_BASE64=$(base64 < "$FILE_PATH")

# Make request
curl -X POST https://proformai.com/api/extract \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"file\": \"$FILE_BASE64\",
    \"documentType\": \"rent_roll\",
    \"expectedFields\": [\"address\", \"units\", \"marketRent\"]
  }" | jq .
```

### Zapier / Make (Integromat)

1. **Create a new scenario** in Zapier/Make
2. **Add HTTP module:** POST request
3. **URL:** `https://proformai.com/api/extract`
4. **Headers:** `Authorization: Bearer YOUR_API_KEY`
5. **Body (JSON):**
   ```json
   {
     "file": "{{PDF_FILE_IN_BASE64}}",
     "documentType": "t12",
     "expectedFields": ["grossIncome", "opex", "noi"]
   }
   ```
6. **Parse response** → Map to your downstream app

---

## Use Cases & Recipes

### Use Case #1: Automated Deal Analysis

**Problem:** Manual data entry from property docs takes 30 min per deal

**Solution:** Extract key metrics automatically

```python
# Extract from multiple documents
documents = {
    "offer_memorandum": om_pdf,
    "t12": t12_pdf,
    "rent_roll": rent_roll_csv,
    "appraisal": appraisal_pdf,
}

extracted = {}
for doc_type, file_data in documents.items():
    response = requests.post(
        "https://proformai.com/api/extract",
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={
            "file": base64.b64encode(file_data).decode(),
            "documentType": doc_type,
        }
    )
    extracted[doc_type] = response.json()["extracted"]

# Calculate investment metrics
cap_rate = extracted["t12"]["noi"] / extracted["appraisal"]["value"]
cash_on_cash = (extracted["t12"]["noi"] - extracted["loan"]["debtService"]) / extracted["offer"]["equityRequired"]

print(f"Cap Rate: {cap_rate:.2%}")
print(f"Cash-on-Cash: {cash_on_cash:.2%}")
```

**Expected outcome:** 2 minutes vs. 30 minutes per deal (-93% time)

---

### Use Case #2: Integration with Google Sheets

**Problem:** Team manually copies extracted data into Sheets

**Solution:** Automate with Apps Script

```javascript
// Google Apps Script (in your Sheet)
function extractFromDriveFolder(folderId) {
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFileList();
  const sheet = SpreadsheetApp.getActiveSheet();
  const rows = [];

  while (files.hasNext()) {
    const file = files.next();
    const blob = file.getBlob();
    const base64 = Utilities.base64Encode(blob.getBytes());

    // Call ProformAI API
    const response = UrlFetchApp.fetch(
      "https://proformai.com/api/extract",
      {
        method: "post",
        headers: { Authorization: "Bearer " + API_KEY },
        payload: JSON.stringify({
          file: base64,
          documentType: "om",
        }),
      }
    );

    const data = JSON.parse(response.getContentText());
    rows.push([
      file.getName(),
      data.extracted.address,
      data.extracted.askingPrice,
      data.confidence.askingPrice,
    ]);
  }

  // Write to Sheet
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}
```

**Expected outcome:** Batch extract from folder → auto-populate Sheets

---

### Use Case #3: CRM Lead Enrichment

**Problem:** Sales team enters property data manually from PDFs

**Solution:** Extract on document upload

```javascript
// Integration with Salesforce / HubSpot
async function enrichPropertyRecord(fileId, recordId) {
  // 1. Download file from CRM attachment
  const file = await crm.getAttachment(fileId);
  const base64 = Buffer.from(file.data).toString("base64");

  // 2. Extract with ProformAI
  const extracted = await proformaiExtract(base64, "om");

  // 3. Update CRM record
  await crm.updateRecord(recordId, {
    property_address: extracted.address,
    asking_price: extracted.askingPrice,
    property_type: extracted.propertyType,
    units: extracted.units,
    confidence_price: (extracted.confidence.askingPrice * 100).toFixed(0) + "%",
  });
}
```

**Expected outcome:** Document upload → auto-fill CRM fields

---

## Error Handling

ProformAI uses standard HTTP status codes:

| Status | Meaning | Example |
|--------|---------|---------|
| **200** | Success | Extraction completed |
| **400** | Bad Request | Missing required fields, invalid document |
| **401** | Unauthorized | Invalid API key |
| **402** | Payment Required | Out of credits |
| **429** | Rate Limited | Too many requests (wait 60s) |
| **500** | Server Error | ProformAI issue (retry with backoff) |

### Example Error Response

```json
{
  "success": false,
  "error": "insufficient_credits",
  "message": "You have 0 remaining credits. Upgrade your plan.",
  "errorCode": "ERR_NO_CREDITS",
  "suggestedAction": "upgrade_plan"
}
```

### Retry Strategy

```python
import time
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Auto-retry on 429 and 5xx
session = requests.Session()
retry = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504]
)
adapter = HTTPAdapter(max_retries=retry)
session.mount("https://", adapter)

response = session.post("https://proformai.com/api/extract", json=payload)
```

---

## Best Practices

### 1. **Batch When Possible**

Instead of:
```python
# ❌ Slow (3 requests)
for file in files:
    extract(file)
```

Use:
```python
# ✅ Fast (1 request)
extract_batch(files)
```

**Result:** 3x faster, better error handling, lower credit usage if failures occur.

---

### 2. **Use Document Type Hints**

```python
# ❌ Generic (lower accuracy)
response = requests.post(..., json={"file": data})

# ✅ Specific (higher accuracy)
response = requests.post(..., json={
    "file": data,
    "documentType": "rent_roll"
})
```

**Result:** 5-15% higher field accuracy and confidence scores.

---

### 3. **Validate With Confidence Scores**

```python
extracted = response.json()["extracted"]
confidence = response.json()["confidence"]

# Flag low-confidence fields for review
for field, value in extracted.items():
    if confidence[field] < 0.85:
        print(f"⚠️ {field}: {value} (confidence: {confidence[field]:.0%})")
```

**Result:** Catch extraction errors before they corrupt downstream systems.

---

### 4. **Handle Non-Standard Documents**

Some documents have unusual layouts. If extraction fails:

1. **Check document type** — Maybe it's a different format than expected
2. **Try without type hint** — Let ProformAI auto-detect
3. **Use `includeRaw: true`** — Get raw text for manual inspection
4. **Contact support** — We optimize for common formats

```python
# Fallback strategy
try:
    response = requests.post(..., json={"file": data, "documentType": "rent_roll"})
except:
    # Try without type hint
    response = requests.post(..., json={
        "file": data,
        "includeRaw": True  # Get full text for inspection
    })
```

---

### 5. **Monitor Credit Usage**

```python
# Check credits before batch operations
credits_response = requests.get(
    "https://proformai.com/api/credits",
    headers={"Authorization": f"Bearer {API_KEY}"}
)
remaining = credits_response.json()["remaining"]

if remaining < 100:
    print("⚠️ Low on credits! Upgrade your plan.")
    # Pause batch operations
else:
    # Proceed
    pass
```

---

## Pricing & Credits

**1 credit = 1 document extraction** (regardless of file size or complexity)

| Plan | Monthly Credits | Cost | Per-Document Cost |
|------|-----------------|------|-------------------|
| **Starter** | 500 | $49 | $0.098 |
| **Professional** | 2,500 | $199 | $0.080 |
| **Enterprise** | 10,000+ | Custom | Custom |

**Credits reset monthly** on your billing date.

### Estimation

- **Real estate firm (10 deals/month):** ~40 documents/month → Starter plan
- **Bulk investor (50 deals/month):** ~200 documents/month → Professional plan
- **Asset manager (500+ deals/year):** Enterprise plan

---

## Support & Troubleshooting

### FAQ

**Q: How long does extraction take?**  
A: Typically 2-5 seconds per document. Most delays are network latency, not processing.

**Q: What file formats are supported?**  
A: PDF, PNG, JPG, JPEG, TIFF, XLSX, CSV. Max file size: 25 MB.

**Q: Can I extract handwritten documents?**  
A: Yes, but accuracy is 10-20% lower than printed/typed documents.

**Q: What happens if extraction fails?**  
A: You're not charged a credit. Failures return a `success: false` response with error details.

**Q: Can I see why a field extraction failed?**  
A: Yes, use `includeRaw: true` in the request to get full document text for debugging.

**Q: Do you store my documents?**  
A: No. Documents are deleted immediately after extraction. We only store aggregated metrics (not data).

### Contact

- **Email:** support@proformai.com
- **Docs:** https://proformai.com/docs
- **Status Page:** https://status.proformai.com
- **Slack Community:** [Join our workspace]

---

## SDK & Libraries

Official SDKs and community libraries for common languages:

| Language | Package | Status |
|----------|---------|--------|
| Python | `pip install proformai` | ✅ Official |
| Node.js | `npm install proformai` | ✅ Official |
| Go | `go get github.com/proformai/go-sdk` | ✅ Official |
| Ruby | `gem install proformai` | ⚠️ Community |

```python
# Using official SDK
from proformai import ProformAI

client = ProformAI(api_key="your-key-here")
result = client.extract(
    file_path="document.pdf",
    document_type="om",
)
print(result.extracted)
```

---

## Next Steps

1. **Get API Key** — [Create account](https://proformai.com/signup)
2. **Read API Reference** — [Full docs](https://proformai.com/docs/api)
3. **Try Examples** — Clone [demo repo](https://github.com/proformai/examples)
4. **Join Community** — Slack, Discord, GitHub Discussions
5. **Deploy to Production** — Follow security checklist below

---

## Security Checklist

Before deploying to production:

- [ ] Store API key in environment variables, never hardcoded
- [ ] Use HTTPS for all requests (never HTTP)
- [ ] Implement rate limiting on your side (don't hammer API)
- [ ] Validate extracted data before using in critical systems
- [ ] Log errors and monitor for failures
- [ ] Implement retry logic with exponential backoff
- [ ] Keep SDK/libraries updated
- [ ] Rotate API keys regularly (quarterly recommended)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Aug 18, 2026 | Initial release |

