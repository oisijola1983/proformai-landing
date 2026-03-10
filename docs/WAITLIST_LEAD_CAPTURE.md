# ProformAI Waitlist Lead Capture System

## Overview

The ProformAI waitlist pipeline captures buyer intent from commercial real estate professionals and uses AI-driven analysis to prioritize leads by deal-readiness. This system turns raw leads into revenue-ready opportunities through intelligent extraction and scoring.

**Live Since:** March 9, 2026  
**Status:** Production (active waitlist users)

## Architecture

```
Waitlist Form (Landing Page)
    ↓
    ├─ Basic Fields: Email, Name, Company
    └─ Intent Fields: Role, Deal Volume, Timeline
    ↓
Loops API (Contact Storage & Emails)
    ↓
Instant Webhook Alert (Slack/Email/Custom)
    ↓
AI Analysis Pipeline
    ├─ Lead Extraction & Validation
    ├─ Quality Gates (Missing Fields, Invalid Format)
    └─ Priority Scoring (Deal Readiness)
    ↓
Lead Database (Ready for Sales)
```

## Buyer Intent Fields

The form captures structured intent to enable intelligent prioritization:

### Email (Required)
- **Field:** `email`
- **Type:** string (email format)
- **Purpose:** Contact + signup notification
- **Validation:** RFC 5322 email format

### Name (Required)
- **Field:** `name`
- **Type:** string
- **Purpose:** Personalization + CRM sync
- **Min Length:** 2 characters

### Company (Optional)
- **Field:** `company`
- **Type:** string
- **Purpose:** Firm/entity identification
- **Usage:** Duplicate detection, enrichment

### Role (Required)
- **Field:** `role`
- **Type:** enum — one of:
  - `broker` — Commercial real estate broker
  - `principal` — Broker principal / partner
  - `agent` — Broker agent
  - `investor` — Investor / fund manager
  - `other` — Other professional
- **Purpose:** Buyer segment classification
- **Business Logic:** Brokers/principals typically have higher deal volume → better conversion

### Deal Volume (Required)
- **Field:** `deal_volume`
- **Type:** enum — one of:
  - `0-5` — 0-5 deals per month
  - `5-20` — 5-20 deals per month
  - `20-50` — 20-50 deals per month
  - `50+` — 50+ deals per month
- **Purpose:** Estimate lead maturity & urgency
- **Business Logic:** Higher volume = faster decision-making = higher revenue impact

### Timeline (Required)
- **Field:** `timeline`
- **Type:** enum — one of:
  - `immediate` — Need solution now
  - `1-3-months` — Looking in 1-3 months
  - `3-6-months` — Looking in 3-6 months
  - `exploring` — Just exploring
- **Purpose:** Buying urgency signal
- **Business Logic:** Immediate need = faster sales cycle

## Lead Scoring & Prioritization

Each lead receives a composite priority score across three dimensions:

### 1. Segment Score (0-40 points)
Based on professional role and typical deal capacity:

```
broker:      40 points  (highest volume + authority)
principal:   35 points  (decision-maker)
agent:       20 points  (depends on broker volume)
investor:    30 points  (consistent buyers)
other:        5 points  (unknown profile)
```

**Rationale:** Brokers and principals have institutional deal flow; investors have predictable needs.

### 2. Volume Score (0-30 points)
Based on stated monthly deal volume:

```
50+:         30 points  (high urgency + institutional)
20-50:       20 points  (active firm)
5-20:        10 points  (semi-active)
0-5:          5 points  (occasional)
```

**Rationale:** Volume correlates with decision-speed and deployment budget.

### 3. Timeline Score (0-30 points)
Based on buying readiness:

```
immediate:   30 points  (ready to buy now)
1-3-months:  20 points  (near-term need)
3-6-months:  10 points  (medium-term)
exploring:    5 points  (exploratory)
```

**Rationale:** Shorter timelines = higher close probability.

### Total Lead Score

```
Total = Segment + Volume + Timeline
Range: 5 (minimum) to 100 (maximum)
```

**Interpretation:**
- **80-100** — Priority 1: High-intent buyer, immediate action
- **60-79** — Priority 2: Strong fit, active sales process
- **40-59** — Priority 3: Qualified lead, nurture track
- **20-39** — Priority 4: Long-term opportunity
- **5-19** — Priority 5: Low-intent, add to mailing list

## Webhook Alerts

Real-time notifications are sent to a configured webhook when new leads signup (if enabled).

### Setup

Add webhook URL to environment:

```bash
# .env.local or GitHub/Vercel secrets
WAITLIST_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Test Webhook

```bash
npm run monitor:webhook-test
```

### Alert Payload

```json
{
  "timestamp": "2026-03-09T22:15:32Z",
  "source": "waitlist",
  "event": "new_lead",
  "lead": {
    "email": "broker@firm.com",
    "name": "John Smith",
    "company": "Smith Commercial",
    "role": "broker",
    "deal_volume": "20-50",
    "timeline": "immediate",
    "priority_score": 95,
    "priority_tier": "P1"
  },
  "action": "Review in dashboard / Transfer to CRM"
}
```

### Slack Integration Example

Add a custom Slack workflow that transforms the webhook payload:

```
When a POST request is received at [webhook URL]
  ├─ Extract priority_score and priority_tier from JSON
  ├─ Post to #sales-alerts with block format:
  │   ├─ Header: "🔥 New Priority [tier] Lead"
  │   ├─ Lead info (name, company, role)
  │   ├─ Intent (volume, timeline)
  │   └─ Action: [View in Dashboard] [Transfer to CRM]
  └─ Assign to sales manager based on lead source
```

## Extraction Quality Gates

The pipeline includes automated quality gates to prevent bad leads from entering the sales process.

### Gate 1: Required Fields Validation
**Validates:** email, name, role, deal_volume, timeline

```
If any required field is missing:
  ❌ BLOCK lead
  📧 Email user with form error
  🔄 Allow re-submission
```

### Gate 2: Email Format Validation
**Validates:** RFC 5322 compliant email format

```
If email format invalid:
  ❌ BLOCK lead
  📧 Send "Invalid email" error
```

### Gate 3: Company Deduplication (Optional)
**Validates:** Compare company + role against existing leads

```
If duplicate detected:
  ⚠️  LOG duplicate
  📧 Notify user (optional: prevent re-signup)
  🔄 Update existing lead record
```

### Gate 4: Spam/Bot Detection
**Validates:** Disposable email domains, suspicious patterns

```
If suspicious pattern detected:
  ⚠️  FLAG for manual review
  📁 Add to low-priority queue
  🚫 Do not add to active sales list
```

### Example Quality Gate Flow

```
User submits form
    ↓
[Gate 1] Required fields present? ❌ BLOCK → Error message → User corrects
    ↓
[Gate 2] Valid email format? ❌ BLOCK → Error message → User corrects
    ↓
[Gate 3] Duplicate detection? ⚠️  LOG → Update existing record
    ↓
[Gate 4] Spam detection? 🚫 FLAG → Manual review queue
    ↓
✅ Lead passes all gates → Webhook alert → Priority score → Ready for sales
```

## Integration Flow

### Step 1: Landing Page Form Submission

User fills out form with intent fields:

```html
<form id="waitlist-form">
  <input name="email" type="email" required />
  <input name="name" type="text" required />
  <input name="company" type="text" />
  
  <!-- Intent Fields -->
  <select name="role" required>
    <option value="broker">Broker</option>
    <option value="principal">Principal</option>
    <option value="agent">Agent</option>
    <option value="investor">Investor</option>
    <option value="other">Other</option>
  </select>
  
  <select name="deal_volume" required>
    <option value="0-5">0-5 deals/month</option>
    <option value="5-20">5-20 deals/month</option>
    <option value="20-50">20-50 deals/month</option>
    <option value="50+">50+ deals/month</option>
  </select>
  
  <select name="timeline" required>
    <option value="immediate">Need now</option>
    <option value="1-3-months">1-3 months</option>
    <option value="3-6-months">3-6 months</option>
    <option value="exploring">Just exploring</option>
  </select>
</form>
```

### Step 2: API Processing (`/api/waitlist`)

```javascript
POST /api/waitlist
Content-Type: application/json

{
  "email": "broker@firm.com",
  "name": "John Smith",
  "company": "Smith Commercial",
  "role": "broker",
  "deal_volume": "20-50",
  "timeline": "immediate"
}
```

**Server-side:**
1. Validate required fields
2. Check email format
3. Run spam detection
4. Calculate priority score
5. Store in Loops API
6. Send webhook alert
7. Return success/error to client

### Step 3: Loops Contact Management

Lead is stored as a contact in Loops with tags:

```
Tags:
  - segment: broker
  - volume: 20-50
  - timeline: immediate
  - priority_score: 95
  - priority_tier: P1
  - source: proformai_waitlist
  - date_added: 2026-03-09
```

**Sequences (auto-triggered):**
- P1 leads → Sales team immediate follow-up sequence
- P2-3 leads → Nurture sequence
- P4-5 leads → General education sequence

### Step 4: Webhook Alert (Optional)

If configured, alert is sent in real-time:

```json
POST $WAITLIST_ALERT_WEBHOOK_URL
Content-Type: application/json

{
  "timestamp": "2026-03-09T22:15:32Z",
  "source": "waitlist",
  "event": "new_lead",
  "lead": {
    "email": "broker@firm.com",
    "name": "John Smith",
    "company": "Smith Commercial",
    "role": "broker",
    "deal_volume": "20-50",
    "timeline": "immediate",
    "priority_score": 95,
    "priority_tier": "P1"
  }
}
```

## Monitoring & Health

### Health Check Command

```bash
npm run monitor
```

**Checks:**
- ✅ Environment variables configured
- ✅ Form fields present on landing page
- ✅ Loops API connectivity (with credentials)
- ✅ Webhook URL reachable

### Integration Test

```bash
npm run monitor:test
```

**Runs a full end-to-end test:**
1. Creates test contact in Loops
2. Submits form via API
3. Verifies contact appears in Loops
4. Tests webhook delivery
5. Validates priority scoring

### Webhook Test

```bash
npm run monitor:webhook-test
```

Tests webhook connectivity independently.

## Environment Variables

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `LOOPS_API_KEY` | ✅ Yes | Loops.so API credentials | `abc123...` |
| `WAITLIST_ALERT_WEBHOOK_URL` | ❌ No | Webhook for real-time alerts | `https://hooks.slack.com/...` |
| `VERCEL_URL` | ❌ No | Production domain (auto-set) | `proformai.app` |

## Troubleshooting

### Form Submission Fails

**Error:** "API Error: Failed to create contact"

**Causes:**
1. `LOOPS_API_KEY` missing or invalid
2. Loops API rate limit exceeded
3. Network connectivity issue

**Solution:**
```bash
npm run monitor:test  # Full diagnostic
# Check Loops dashboard for rate limits
# Verify API key hasn't been rotated
```

### Webhook Not Firing

**Error:** New leads don't trigger notifications

**Causes:**
1. `WAITLIST_ALERT_WEBHOOK_URL` not configured
2. Webhook URL is unreachable
3. Webhook receiver rejected the request

**Solution:**
```bash
# Test webhook connectivity
npm run monitor:webhook-test

# Or test manually
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"test": true}' \
  $WAITLIST_ALERT_WEBHOOK_URL
```

### Low Lead Quality

**Problem:** Leads have incomplete intent data or suspicious patterns

**Solutions:**
1. Increase form validation on frontend (prevent empty selects)
2. Review quality gate logs for patterns
3. Add email verification (Loops → email verification sequence)
4. Implement CAPTCHA if bot traffic detected

## Next Steps

1. **Link CRM Integration** — Transfer P1/P2 leads automatically to sales CRM (Pipedrive/HubSpot)
2. **Build Dashboard** — Real-time lead volume, scoring distribution, conversion tracking
3. **A/B Test Intent Fields** — Test different field sets to optimize for conversion
4. **ML Scoring** — Move from rule-based to ML-based priority scoring as data accumulates
5. **Lead Enrichment** — Enrich with company data (funding, address, team size) via Clearbit

## Support

Questions or issues? Check MONITORING.md for operational details.

---

**Maintained By:** Shuri (Night Agent)  
**Last Updated:** 2026-03-09  
**Status:** Production ✅
