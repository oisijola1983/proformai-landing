# ProformAI Support Guide

**Purpose:** Self-serve support knowledge base (reduce Wole support time)  
**Audience:** Customers troubleshooting issues  
**Update Frequency:** Weekly (add common issues as they arise)  
**Status:** Live support resource

---

## Quick Help (Most Common Issues)

### Issue: "Extraction failed"

**99% of the time, this is one of three things:**

1. **File is corrupted**
   - Try uploading a different document first
   - If that works, the first file was bad

2. **File format not supported**
   - Supported: PDF, PNG, JPG, XLSX, CSV
   - Not supported: Word, PowerPoint, TXT
   - Solution: Convert to PDF first

3. **Document type mismatch**
   - You selected "Rent Roll" but uploaded an "Offering Memo"
   - Solution: Leave document type blank (auto-detect) or select correct type

---

### Issue: "Insufficient credits"

**Solution:** Upgrade your plan

1. Go to **Billing** → **Current Plan**
2. Click **"Upgrade"**
3. Select new plan
4. Credits added immediately (same minute)

**Note:** Credits reset on your monthly billing date. Check when yours resets:

1. Go to **Billing**
2. Look for "Reset Date: [date]"

---

### Issue: "API key not working"

**Check these in order:**

1. **Is the key in your code?**
   ```python
   # ❌ Wrong
   headers = {"Authorization": "Bearer sk_test_123"}  # Wrong key type
   
   # ✅ Right
   headers = {"Authorization": "Bearer pk_live_abc123"}  # Correct key
   ```

2. **Does your plan have credits?**
   ```bash
   curl https://proformai.com/api/credits \
     -H "Authorization: Bearer YOUR_KEY" | jq .
   ```
   If `remaining: 0`, upgrade plan.

3. **Is the URL correct?**
   ```python
   # ✅ Correct
   url = "https://proformai.com/api/extract"
   
   # ❌ Wrong
   url = "https://api.proformai.com/extract"  # This URL doesn't exist
   url = "http://proformai.com/api/extract"   # Use HTTPS, not HTTP
   ```

4. **Is the header correct?**
   ```python
   # ✅ Correct
   headers = {"Authorization": "Bearer YOUR_KEY"}
   
   # ❌ Wrong
   headers = {"Authorization": "YOUR_KEY"}           # Missing "Bearer"
   headers = {"X-API-Key": "YOUR_KEY"}               # Wrong header name
   ```

**Still not working?** Email support@proformai.com with:
- Your API key (first 10 chars only, e.g., `pk_live_...`)
- Exact curl/code that's failing
- Error message

---

### Issue: "Low confidence on extracted fields"

**Confidence < 85% means results might be wrong.**

**For fields < 85% confidence:**
1. Manually verify the value
2. If wrong, check if document type was correct
3. If document is blurry/handwritten, accuracy will be lower

**To prevent this:**
1. Ensure document is high quality (color, not B&W)
2. Select correct document type (not auto-detect)
3. Use `strictMode: true` in API to only return high-confidence fields

```python
response = requests.post(
    "https://proformai.com/api/extract",
    json={
        "file": base64_file,
        "documentType": "rent_roll",
        "strictMode": True,  # Only return high-confidence fields
    }
)
```

---

### Issue: "Field I need isn't extracted"

**ProformAI extracts 170+ fields.** If a field is missing, it could be:

1. **Field doesn't exist in document** (most common)
2. **Field name is different** (e.g., "Avg Rent" vs "Market Rent")
3. **Field is in unusual location** (e.g., table vs. body text)
4. **Field is handwritten** (accuracy lower)

**To check:**

1. Click **"Include Raw Text"** when extracting
2. Search raw text for the field you need
3. If it exists, email support@proformai.com with a screenshot

**To request custom field:**

Email support@proformai.com:
- What field do you need?
- Upload sample document (redact sensitive info)
- How often do you extract it?

If your use case is common, we'll add it to the standard fields.

---

## Detailed Troubleshooting by Feature

### Web Dashboard Issues

#### Problem: Can't log in

**Try this:**

1. **Wrong password?**
   - Click "Forgot Password"
   - Enter your email
   - Click link in email
   - Set new password

2. **Email not verified?**
   - Check spam folder for verification email
   - Click the verification link
   - Retry login

3. **Account disabled?**
   - Go to https://proformai.com/login
   - Click "Contact Support"
   - We'll re-enable you

#### Problem: Can't see my extractions

**Possible causes:**

1. **Wrong organization**
   - Top-left dropdown shows organization
   - If you're in "Personal" but created in "My Firm", switch orgs

2. **Filters are too narrow**
   - Click "Filters"
   - Clear all filters
   - Click "Show All"

3. **Need to refresh**
   - Press Ctrl+Shift+R (hard refresh)
   - Or sign out and back in

4. **Organization is deleted**
   - Extractions are scoped to organizations
   - If org was deleted, extractions are hidden
   - Email support@proformai.com to restore

#### Problem: File upload fails

**Checklist:**

- [ ] File is under 25 MB
- [ ] File is one of: PDF, PNG, JPG, XLSX, CSV
- [ ] Internet connection is stable
- [ ] Browser cache is cleared (Ctrl+Shift+R)
- [ ] Browser is supported (Chrome, Safari, Firefox, Edge)

If file is huge (10+ MB):
- For images: compress to smaller resolution
- For PDFs: split into multiple files
- Use API for batch processing (more reliable)

---

### API Issues

#### Problem: Batch upload partially fails

**Cause:** One of your files in a batch is bad

**Solution:**

```python
# Don't batch all at once — test individually first
files_to_extract = ["doc1.pdf", "doc2.pdf", "doc3.pdf"]

# Test each one
for file in files_to_extract:
    response = requests.post(
        "https://proformai.com/api/extract",
        json={"file": base64_encode(file)}
    )
    if not response.json()["success"]:
        print(f"Failed: {file}")
        print(response.json())
```

Once you find the bad file, remove it and retry the batch.

#### Problem: Rate limiting (429 error)

**You're making too many requests too fast.**

**What triggers it:**
- Sending 100+ requests in 1 second
- Bulk importing without delays

**Solution:**

```python
import time

for file in files:
    response = requests.post(url, json=payload)
    time.sleep(1)  # Wait 1 second between requests
```

Or use batch endpoint:
```python
# Better — single request for multiple files
response = requests.post(
    "https://proformai.com/api/batch",
    json={"files": [file1, file2, file3, ...]}
)
```

#### Problem: 500 error (server error)

**ProformAI had an outage.** Check status:

1. Go to https://status.proformai.com
2. If red, service is down
3. Retry in 5-10 minutes
4. If persists 1+ hour, email support@proformai.com

#### Problem: API quota exceeded

**You've used all your credits for the month.**

**Solution:**
1. Upgrade plan (go to https://proformai.com/billing)
2. Or wait until next month

**To check remaining credits:**
```bash
curl https://proformai.com/api/credits \
  -H "Authorization: Bearer YOUR_KEY"
```

---

### Document Extraction Issues

#### Problem: Address is extracted wrong

**Example:** "123 Main St, Boston, **MA**" but actually "**CT**"

**Why this happens:**
- Document is low quality (scanned blurry)
- Address is handwritten
- Two addresses on the page (we picked wrong one)

**To fix:**

1. **Manually verify** — Check confidence score
2. **Re-upload higher quality** — Scan at 300 DPI instead of 150
3. **Select correct document type** — Improves accuracy 5-15%
4. **Email support** — Send sample, we'll investigate

#### Problem: Numbers are wrong

**Example:** Asks is "$2,500,000" but we extracted "$2,500"

**Why this happens:**
- Formatting is unusual (commas, currency symbols)
- Number is in image/chart (hard to read)
- Multiple numbers on same line

**To fix:**

1. **Check confidence score** — If < 80%, result is unreliable
2. **Use strictMode** — Only return high-confidence numbers
3. **Manually verify** before using in calculations
4. **Email support** with sample document

#### Problem: Some fields are blank

**Example:** "marketRent" field is empty, but value is in document

**Why this happens:**
- Field is labeled differently ("Avg Monthly Rent" vs "Market Rent")
- Field is in unusual location (sidebar, footer, chart)
- Field is handwritten or low quality

**To check:**

1. Use `includeRaw: true` in API to get full text
2. Search raw text for the value you need
3. If value exists, note it and email support@proformai.com
4. We may need to improve extraction for that field type

#### Problem: Extracted data looks corrupted

**Example:** Address contains HTML tags, numbers have strange symbols, etc.

**Why this happens:**
- Document was digital-native PDF with odd encoding
- File was partially corrupted
- Unusual character encoding (not UTF-8)

**To fix:**

1. **Try re-uploading** the document
2. **Export as PDF** if you have the original source (Word, Excel, etc.)
3. **Email support** with the original file
4. We may need to handle your document format specially

---

### Integration Issues

#### Problem: Zapier integration not working

**Zapier can't connect to ProformAI**

**Try this:**

1. **Test API key separately**
   ```bash
   curl https://proformai.com/api/credits \
     -H "Authorization: Bearer YOUR_KEY"
   ```
   Should return JSON, not error.

2. **In Zapier, re-authenticate:**
   - Go to your Zap
   - Click "ProformAI" action
   - Click "Reauthorize"
   - Paste API key again
   - Test

3. **Check Zapier app version:**
   - Go to https://zapier.com/apps/proformai/integrations
   - Make sure you're using latest version

4. **Test basic request first:**
   - Don't try to extract complex documents yet
   - Upload a simple test file (single-page rent roll)
   - Once that works, scale up

#### Problem: Google Sheets export isn't updating

**Extractions don't auto-populate to Sheets**

**Cause:** Zapier task is paused or authentication expired

**Fix:**

1. Go to https://zapier.com/app/dashboard
2. Check if Zap is paused (toggle to "On")
3. If red "X", click it and re-authenticate
4. Test by extracting a document — should auto-send to Sheets in 30 seconds

---

## Performance & Best Practices

### API Response Times

| Scenario | Typical Time | Max Time |
|----------|--------------|----------|
| Single extraction | 2-5 sec | 15 sec |
| Batch (5 docs) | 3-8 sec | 30 sec |
| Batch (100 docs) | 30-60 sec | 2 min |

**Slow extraction? Try:**
1. Check internet connection speed
2. Document might be low quality (takes longer)
3. Use smaller files (< 5 MB)
4. Try batch instead of individual (more efficient)

### Cost Optimization

| Scenario | Credits | Cost |
|----------|---------|------|
| 1 document per day (30/mo) | 30 | $3 (Starter) |
| 10 documents per week (40/mo) | 40 | $4 (Starter) |
| 50 documents per week (200/mo) | 200 | $16 (Professional) |

**Estimate your usage:** Extract a test batch, count docs, multiply by frequency.

### Reliability

**ProformAI uptime:** 99.95% (target)

**Failures:**
- ~0.5% API errors (usually temp network blip, retry works)
- ~0.1% extraction failures (bad document, rare)

**No charges for:**
- Failed extractions (you get 0 credits deducted)
- Timeouts (resubmit, no charge)

---

## Common Workflows & How-To

### How to: Extract from Dropbox / Google Drive

**Workflow:**

1. **Set up Zapier trigger**
   - Trigger: "File added to folder" (Dropbox/Drive)
   - Action: ProformAI extraction
   - Then: Save result to Sheets

2. **Or use API + cron job**
   ```bash
   #!/bin/bash
   # Every 6 hours, check Dropbox for new files
   
   for file in $(dbx ls /real-estate-docs | grep .pdf); do
     dbx get "/real-estate-docs/$file" ./temp.pdf
     base64 ./temp.pdf | curl -X POST https://proformai.com/api/extract \
       -H "Authorization: Bearer $API_KEY" \
       -d @- \
       > "./results/$file.json"
   done
   ```

### How to: Auto-send extractions to CRM

**For Salesforce:**

1. Go to Zapier
2. Create new Zap
3. Trigger: "New extraction in ProformAI"
4. Action: "Create record in Salesforce"
5. Map fields:
   - ProformAI `address` → Salesforce `Property_Address`
   - ProformAI `units` → Salesforce `Unit_Count`
   - Etc.

**For HubSpot:**

Same process, use HubSpot action instead.

### How to: Daily briefing email

**Workflow:**

1. Zapier trigger: "Extractions added today"
2. Filter: "Count > 0"
3. Action: Send email with summary
4. Schedule: 5 PM daily

```
Example email:

Today's Extractions: 5 documents
━━━━━━━━━━━━━━━━━━━━━━

1️⃣ 123 Main St, Boston | Units: 24 | Cap Rate: 5.2%
2️⃣ 456 Oak Ave, NYC | Units: 18 | Cap Rate: 4.8%
3️⃣ 789 Elm Rd, LA | Units: 12 | Cap Rate: 6.1%
4️⃣ 321 Pine St, Austin | Units: 8 | Cap Rate: 5.9%
5️⃣ 654 Cedar Ln, Denver | Units: 6 | Cap Rate: 6.5%

View all: https://proformai.com/dashboard
```

---

## FAQ

### Q: How do I change my password?

**A:** 
1. Click **Settings** → **Account**
2. Click **"Change Password"**
3. Enter old password
4. Enter new password (2x)
5. Click "Update"

### Q: Can I delete an extraction?

**A:** Yes.
1. Click extraction
2. Click **"Delete"**
3. Confirm

Note: Deleted extractions can't be recovered. Archive instead if you need history.

### Q: How do I archive an extraction?

**A:**
1. Click extraction
2. Click **"Archive"**
3. It moves to Archive folder (don't count toward storage)

To view archived: Click **"Show Archived"** in filters.

### Q: Can I export all my data?

**A:**
1. Go to **Settings** → **Data Export**
2. Click **"Download All"**
3. Get ZIP with all extractions as CSV/JSON

### Q: What happens if I don't use my credits?

**A:** 
- Monthly plans: Credits reset each month (unused ones disappear)
- Annual plans: Credits roll over month-to-month

Recommendation: Use them or downgrade to save money.

### Q: How do I contact support?

**A:**
- **Email:** support@proformai.com
- **Response time:** 24 hours business days
- **In-app:** Click **"Help"** button (bottom-right)

---

## Still Need Help?

### Support Channels

| Channel | Best For | Response Time |
|---------|----------|----------------|
| **In-app chat** | Quick questions | 24 hours |
| **Email** | Complex issues | 24 hours |
| **Documentation** | Learning features | Instant |
| **Community Slack** | Tips from other users | 2-4 hours |
| **Status page** | Service outages | Real-time |

### Contact Info

- **Support Email:** support@proformai.com
- **Sales Email:** sales@proformai.com
- **General Email:** hello@proformai.com
- **Status Page:** https://status.proformai.com
- **Community:** https://slack.proformai.com

### When You Email Support

Include:

1. **What you were trying to do**
   - "I was uploading a rent roll"

2. **What went wrong**
   - "Got an error after 2 seconds"

3. **Error message (if any)**
   - Copy exact error text

4. **Screenshot**
   - Helps us understand faster

5. **Document sample (optional)**
   - Redact sensitive info first
   - Only if it's a parsing issue

**Example good support email:**

```
Subject: API extraction failing for XLSX files

Hi,

I'm trying to batch-extract data from Excel spreadsheets via API. 
After the first 2 files extract successfully, all subsequent XLSX 
files in the batch return "invalid_file_format" error, even though 
they're the same format.

Error message:
{
  "error": "invalid_file_format",
  "message": "File 3 of 5: Excel files not supported in batch mode"
}

I've attached a sample file (redacted financial data). 
The file opens fine in Excel on my end.

API call:
POST /api/batch
Headers: Authorization: Bearer pk_live_...
Body: 5 XLSX files, documentType: "t12"

Can you help?

Thanks,
John
```

This is way better than:
```
Subject: Help, my API is broken!!!
```

---

## Feedback & Feature Requests

Have an idea for ProformAI?

1. **Quick feedback:** Click 💭 icon in bottom-right
2. **Feature request:** https://proformai.featurebase.app
3. **Bug report:** support@proformai.com
4. **Twitter:** [@proformai](https://twitter.com/proformai)

---

**Last Updated:** August 18, 2026  
**Next Review:** August 25, 2026 (weekly updates)

