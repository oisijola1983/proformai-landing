# ProformAI Customer Onboarding Guide

**Purpose:** Self-serve onboarding for new customers (removes Wole from critical path)  
**Audience:** Real estate professionals signing up from waitlist  
**Target Time:** 10 minutes from signup → first extraction  
**Status:** Production-ready  

---

## Pre-Signup: Who Are We?

ProformAI automatically extracts structured financial data from real estate documents.

**What You Can Extract:**
- Property metrics (address, units, cap rate, rent)
- Financial data (NOI, cash flow, expenses)
- Lending info (loan amount, interest rate, LTV)
- Investment metrics (IRR, cash-on-cash returns)

**From These Documents:**
- Offering Memorandums (OM)
- 12-Month P&Ls (T-12)
- Rent Rolls
- Appraisals
- Loan Documents
- Personal Financial Statements (PFS)

**Time Saved:** 20-30 minutes per deal (vs. manual data entry)

---

## Step 1: Create Your Account (2 minutes)

### Option A: Email Signup

1. Go to **https://proformai.com/signup**
2. Enter your email
3. Set a password (min 8 characters)
4. Check your email for confirmation link
5. Click link to verify

### Option B: Google/LinkedIn (Faster)

1. Click **"Sign up with Google"** or **"Sign up with LinkedIn"**
2. Authorize ProformAI to access your basic profile
3. Confirm your organization name
4. Done — account created

### Option C: Organization Invite

If your firm invited you:
1. Check your email for invite link
2. Click link
3. Set your password
4. Join your organization's workspace

---

## Step 2: Confirm Your Organization (1 minute)

After signup, you'll see:

```
🏢 Organization: _________________
```

**Enter your firm name** (this is for billing and organization):
- Examples: "Acme Real Estate", "Capital Partners LLC"
- Can be changed later in settings

**Continue →**

---

## Step 3: Set Your Role & Use Case (2 minutes)

Tell us how you use ProformAI so we can optimize for you:

### Question 1: What's Your Role?

- [ ] **Investor / Asset Manager** — You analyze deals for your portfolio
- [ ] **Broker / Agent** — You send analysis to clients
- [ ] **Lender / Finance** — You verify financial metrics
- [ ] **Developer / Tech** — You're integrating ProformAI via API
- [ ] **Other**

### Question 2: How Many Deals Per Month?

- [ ] **1-5 deals** → Starter plan recommended
- [ ] **6-20 deals** → Professional plan recommended
- [ ] **20+ deals** → Enterprise plan
- [ ] **Just exploring**

### Question 3: Document Types You'll Upload

Check all that apply:
- [ ] Offering Memorandums
- [ ] 12-Month P&Ls
- [ ] Rent Rolls
- [ ] Appraisals
- [ ] Loan Documents
- [ ] Personal Financial Statements
- [ ] Mixed documents

**Save preferences →**

---

## Step 4: Billing & Credits (2 minutes)

### Pricing Plans

| Plan | Monthly Credits | Cost | Per-Document |
|------|-----------------|------|--------------|
| **Free Trial** | 5 | Free | (use to test) |
| **Starter** | 500 | $49/mo | $0.10 |
| **Professional** | 2,500 | $199/mo | $0.08 |
| **Enterprise** | 10,000+ | Custom | Custom |

### Need-Based Recommendation

**To start:** Begin with **Free Trial** (5 extractions, no credit card)

When you're ready to scale:
- **1 firm extracting 10 deals/month** → Starter ($49)
- **1 firm with 50+ deals/month** → Professional ($199)
- **Teams or API integration** → Enterprise (contact sales)

### Add Payment Method

1. Click **"Billing"** in sidebar
2. Enter credit card info (Stripe-secured)
3. Select plan
4. Confirm

**Or:**

1. Use free trial first (no card required)
2. Upgrade when you run out of credits

---

## Step 5: API Key & Setup (1 minute)

If you're using the **web dashboard**, skip to Step 6.

If you're a **developer** integrating via API:

1. Go to **Settings** → **API Keys**
2. Click **"Generate New Key"**
3. Copy the key (appears once)
4. Store safely in environment variables:

```bash
export PROFORMAI_API_KEY="pk_live_abc123xyz..."
```

5. Test with a sample request:

```bash
curl -X POST https://proformai.com/api/extract \
  -H "Authorization: Bearer $PROFORMAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"file": "base64-encoded-file"}'
```

6. See [API Integration Guide](./API_INTEGRATION_GUIDE.md) for full details

---

## Step 6: Upload Your First Document (2 minutes)

### Via Web Dashboard

1. **Click "Extract"** in the main nav
2. **Upload a document:**
   - Drag & drop a PDF/image
   - Or click "Select File"
3. **(Optional) Select document type:**
   - "Rent Roll", "Offering Memo", etc.
   - Or leave blank to auto-detect
4. **Click "Extract"**
5. **Wait 2-5 seconds** for results

### Results Page

You'll see:

```
✅ Extraction Complete

Document: rent_roll.pdf
Processing Time: 3.2 seconds
Credits Used: 1 of 5

📊 Extracted Data
├─ address: 123 Main St, San Francisco, CA
├─ units: 24
├─ marketRent: $3,500/month
├─ occupancy: 95%
└─ ...

🎯 Confidence Scores
├─ address: 99%
├─ units: 98%
├─ marketRent: 87%
└─ occupancy: 92%

⚡ Next Steps
- Export as CSV/Excel
- Copy to spreadsheet
- Use via API
```

### Export Options

- **Copy to clipboard** — Paste into email/spreadsheet
- **Download as CSV** — Import to Excel/Sheets
- **Download as JSON** — Use in API workflow
- **Share link** — Send extraction to colleague

---

## Step 7: Organize Your Extractions (Optional)

### Create Folders

1. Click **"Documents"** in sidebar
2. Click **"+ New Folder"**
3. Name: "Q3 2026 Deals", "Client - Acme Corp", etc.
4. Drag extractions into folder

### Tag Documents

Click on any extraction and add tags:
- #commercial, #multifamily, #acquisition
- #investor-review, #due-diligence
- #high-priority

### Search

Search by:
- Document filename
- Property address
- Tags
- Date range

---

## Step 8: Next-Level Features

### Export to Spreadsheet (Google Sheets)

1. Select multiple extractions
2. Click **"Export"** → **"Google Sheets"**
3. Choose existing sheet or create new
4. Extractions auto-populate as rows

### Batch Upload

Upload multiple documents at once:

1. Click **"Extract"**
2. Click **"Batch Upload"**
3. Select 5-100 files
4. Choose document type (optional)
5. Click "Extract All"
6. Track progress in "Jobs" tab

**Estimated time:** 10-50 files in ~5 minutes

### Zapier / Make Integration

Auto-send extractions to:
- **CRM:** Salesforce, HubSpot
- **Spreadsheets:** Google Sheets, Airtable
- **Email:** Send results to team
- **Slack:** Notify channel when extraction completes

[View Zapier integration guide →](./ZAPIER_INTEGRATION.md)

### API Access

Once comfortable with web dashboard, integrate ProformAI into your workflow:

- Automated batch processing
- Real-time extraction in your app
- Custom field mapping
- Advanced error handling

[See API Integration Guide →](./API_INTEGRATION_GUIDE.md)

---

## Onboarding Checklist

Use this to track your progress:

- [ ] **Account created** (Step 1)
- [ ] **Organization confirmed** (Step 2)
- [ ] **Role & use case set** (Step 3)
- [ ] **Billing plan selected** (Step 4)
- [ ] **API key generated** (Step 5) — *if using API*
- [ ] **First document extracted** (Step 6)
- [ ] **Extractions organized** (Step 7) — *optional*
- [ ] **Team invited** (Section below) — *optional*

---

## Invite Your Team

### Add Teammates

1. Click **Settings** → **Team Members**
2. Click **"Invite Member"**
3. Enter email address
4. Select role:
   - **Viewer** — Can only see extractions (no uploads)
   - **Editor** — Can upload and manage documents
   - **Admin** — Full access including billing
5. Send invite
6. Teammate clicks link and joins

### Team Roles

| Role | Upload | Extract | Delete | Billing | Invite |
|------|--------|---------|--------|---------|--------|
| **Viewer** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Editor** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Common Questions

### Q: What formats are supported?

**A:** PDF, PNG, JPG, TIFF, XLSX, CSV (max 25 MB)

### Q: How long does extraction take?

**A:** Typically 2-5 seconds per document. Depends on file complexity and document type.

### Q: What if extraction fails?

**A:** You're not charged a credit. You'll see an error message with troubleshooting steps. Most failures are due to:
- Unreadable image (try scanning at higher resolution)
- Unusual document format (try uploading a sample)
- Missing data (field doesn't exist in document)

### Q: Can I extract handwritten documents?

**A:** Yes, but accuracy is 10-20% lower than printed documents.

### Q: Do you store my documents?

**A:** No. Documents are deleted immediately after extraction. We only store:
- Extraction results (the structured data)
- Aggregated usage metrics (no customer data)
- Nothing personally identifiable

### Q: Can I download all my extractions?

**A:** Yes. Go to **Settings** → **Data Export** → **Download All** to get a CSV/JSON of all your extractions.

### Q: What if I need more credits?

**A:** Upgrade your plan anytime:
1. Go to **Billing**
2. Click **"Upgrade"**
3. Select new plan
4. Credits are added immediately (prorated)

### Q: Can I get a refund?

**A:** Yes. 30-day money-back guarantee on annual plans. Monthly plans can cancel anytime.

---

## Troubleshooting

### "Extraction failed" error

**Try this:**
1. Check file is not corrupted (try uploading a test file)
2. Make sure it's one of these formats: PDF, PNG, JPG, XLSX, CSV
3. Try selecting the correct document type (instead of auto-detect)
4. If still failing, email support with the document

### "Insufficient credits" error

**Solution:**
1. Go to **Billing**
2. Upgrade your plan (credits added immediately)
3. Or wait until next month for credits to reset

### "API key not working"

**Check:**
1. API key is in your environment variables correctly: `PROFORMAI_API_KEY=pk_...`
2. You're using the right URL: `https://proformai.com/api/extract`
3. Authorization header is correct: `Authorization: Bearer YOUR_KEY`
4. Your plan has active credits

**Test with:**
```bash
curl https://proformai.com/api/credits \
  -H "Authorization: Bearer YOUR_KEY"
```

### "My organization data is missing"

**Try:**
1. Refresh the page (Ctrl+R or Cmd+R)
2. Sign out and back in
3. Check that you're in the right organization (dropdown in top-left)

---

## Getting Help

### Help Resources

| Resource | Best For |
|----------|----------|
| **In-app Help** | Quick questions (click `?` in top-right) |
| **Documentation** | Learning features, API reference |
| **Email Support** | support@proformai.com |
| **Slack Community** | Talking to other users |
| **Status Page** | Checking if service is down |

### Contact Support

**Email:** support@proformai.com  
**Response time:** 24 hours (24h business hours)

When you email, include:
- What you were trying to do
- What went wrong
- Error message (if any)
- Screenshot (if helpful)

---

## What's Next?

After your first extraction:

1. **Upload more documents** to get familiar with the platform
2. **Invite your team** to collaborate (optional)
3. **Explore API** if you want to automate (see [API guide](./API_INTEGRATION_GUIDE.md))
4. **Set up Zapier** to send extractions to your CRM or Sheets (see [Zapier guide](./ZAPIER_INTEGRATION.md))
5. **Upgrade plan** when you run out of credits
6. **Request custom fields** if you need to extract domain-specific data (email support)

---

## Video Tutorials

*These are placeholders — replace with actual video links when available*

- **Getting Started (3 min):** https://youtu.be/...
- **API Setup (5 min):** https://youtu.be/...
- **Zapier Integration (4 min):** https://youtu.be/...
- **Batch Upload (2 min):** https://youtu.be/...

---

## Feedback

Love ProformAI? Have suggestions? We'd love to hear from you:

- **Email:** feedback@proformai.com
- **Feature requests:** https://proformai.featurebase.app
- **Twitter:** [@proformai](https://twitter.com/proformai)

---

**Welcome to ProformAI!** 🎉  
Happy extracting!

