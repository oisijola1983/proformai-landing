# ProformAI Monitoring & Health Checks

## Overview

The ProformAI waitlist pipeline includes comprehensive health monitoring to track system status, configuration, and integration health.

## Monitoring Commands

### Basic Health Check

```bash
npm run monitor
```

Runs all environment and configuration checks without hitting external services:
- ✅ Environment variable configuration
- ✅ Form structure (buyer intent fields)
- ✅ Webhook URL validation
- ❌ External API connectivity (requires credentials)

**Output:** JSONL health log file saved to `.logs/monitor-YYYY-MM-DD.jsonl`

### Integration Test

```bash
npm run monitor:test
```

Runs basic checks plus a full integration test:
- Validates Loops API connectivity
- Tests waitlist signup endpoint
- Confirms webhook alert capability
- Verifies form fields are transmitted correctly

**Note:** Requires environment variables:
- `LOOPS_API_KEY` — Loops API credentials
- `VERCEL_URL` or running dev server at `http://localhost:3000`

### Webhook Alert Test

```bash
npm run monitor:webhook-test
```

Tests webhook connectivity by sending a test alert message to the configured webhook URL.

**Requires:** `WAITLIST_ALERT_WEBHOOK_URL` environment variable

## Health Check Details

### 1. Environment Configuration
Verifies all required environment variables are set:
- `LOOPS_API_KEY` (required)
- `WAITLIST_ALERT_WEBHOOK_URL` (optional, alerts disabled if missing)
- `VERCEL_URL` (optional, uses localhost:3000 if missing)

### 2. Loops API Integration
- Validates API key is valid and not expired
- Tests connectivity to `https://app.loops.so/api/v1`
- Confirms ability to create/update contacts

### 3. Waitlist Endpoint
- Verifies `/api/waitlist` endpoint is reachable
- Checks CORS headers are properly configured
- Confirms OPTIONS method support

### 4. Webhook Alerts
- Validates webhook URL format
- Tests webhook connectivity (if URL is configured)
- Verifies alerts are being sent (manual check required)

### 5. Form Structure
- Confirms landing page exists
- Verifies buyer intent fields are present:
  - `role` (Your role)
  - `deal_volume` (Deals per month)
  - `timeline` (Buying timeline)

## Monitoring Schedule

### Daily Health Check (Recommended)

Add to your local cron or GitHub Actions:

```bash
# Daily at 8:00 AM ET
0 8 * * * cd /path/to/proformai && npm run monitor >> logs/monitor.log 2>&1
```

### Weekly Integration Test

```bash
# Every Monday at 9:00 AM ET
0 9 * * 1 cd /path/to/proformai && npm run monitor:test >> logs/integration.log 2>&1
```

## Log Files

Health check results are saved to `.logs/monitor-YYYY-MM-DD.jsonl` (one entry per run, JSONL format for streaming analysis).

### Example Log Entry

```json
{
  "summary": {
    "timestamp": "2026-03-09T19:01:32.058Z",
    "duration": "0.04s",
    "totalChecks": 5,
    "passed": 2,
    "failed": 3
  },
  "results": [
    {
      "name": "environment",
      "status": "fail",
      "error": "Missing required env vars: LOOPS_API_KEY"
    },
    {
      "name": "forms",
      "status": "pass",
      "details": {
        "formExists": true,
        "hasIntentFields": true,
        "fields": ["email", "role", "deal_volume", "timeline"],
        "message": "Form includes buyer intent fields"
      }
    }
  ]
}
```

## Interpreting Results

### ✅ All Checks Passed
System is healthy and ready for production traffic.

### ⚠️  Environment Warnings
Check `.env.local` or GitHub/Vercel environment variables:
- Missing `LOOPS_API_KEY` → Waitlist signups will fail
- Missing `WAITLIST_ALERT_WEBHOOK_URL` → Alerts disabled (feature graceful degradation)

### ❌ API Connectivity Failures
Indicates infrastructure issues:
- **Loops API error** → Check LOOPS_API_KEY validity or Loops service status
- **Waitlist endpoint 404** → Rebuild and redeploy (`npm run build && vercel deploy`)
- **Webhook failure** → Verify webhook URL is reachable and accepting POST requests

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Health Check
on:
  schedule:
    - cron: '0 8 * * *'  # Daily at 8 AM ET
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run monitor
        env:
          LOOPS_API_KEY: ${{ secrets.LOOPS_API_KEY }}
          VERCEL_URL: proformai.app
```

## Troubleshooting

### "Missing required env vars: LOOPS_API_KEY"
**Solution:** Add `LOOPS_API_KEY` to `.env.local` (dev) or GitHub/Vercel secrets (production)

### "Waitlist endpoint check failed: fetch failed"
**Solution:** 
- Dev: Run `npm run dev` in another terminal
- Production: Check Vercel deployment status

### "Loops API check failed: Loops API key invalid"
**Solution:** Regenerate API key in Loops dashboard and update environment variables

### Webhook test sends but no message appears
**Solution:** 
- Verify webhook URL is correct (check Slack/Discord/email logs)
- Test webhook directly: `curl -X POST -H "Content-Type: application/json" -d '{"text":"test"}' $WEBHOOK_URL`
- Check if webhook receiver is online and accepting requests

## Next Steps

1. **Deploy monitoring to production** — Add to your CI/CD pipeline
2. **Set up alerts** — Configure health check failures to notify Slack/email
3. **Build dashboard** — Aggregate `.logs/` data to track waitlist health metrics
4. **Monitor metrics** — Track lead volume, signup source, buyer intent distribution

---

**Last Updated:** 2026-03-09  
**Maintained By:** Shuri (ProformAI Operations)
