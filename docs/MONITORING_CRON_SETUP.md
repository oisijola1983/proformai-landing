# ProformAI Automated Monitoring Setup Guide

This guide explains how to set up autonomous monitoring for the ProformAI waitlist pipeline using cron jobs. Once configured, the system will run health checks, collect analytics, and alert you of issues automatically.

## Overview

Three cron jobs work together to keep ProformAI healthy:

```
Daily Health Check (8:00 AM) → Detects API/infrastructure failures
    ↓
Weekly Analytics Report (Monday 9:00 AM) → Tracks conversion metrics
    ↓
Daily Webhook Monitor (11:00 PM) → Ensures alert routing works
```

## Prerequisites

- Node.js 18+
- Environment variables configured in Vercel/GitHub
- LOOPS_API_KEY set in production
- WAITLIST_ALERT_WEBHOOK_URL configured (optional)

## Setup Instructions

### 1. Daily Health Check (8:00 AM ET)

**Purpose:** Detect API failures, missing configuration, connectivity issues

**Command:**
```bash
0 8 * * * cd /path/to/proformai-landing && npm run monitor >> logs/health-check.log 2>&1
```

**What it checks:**
- ✅ Environment variable configuration
- ✅ Loops API connectivity and key validity
- ✅ Waitlist endpoint reachability
- ✅ Webhook URL accessibility
- ✅ Form field structure

**Output:** Logs to `logs/monitor-{TIMESTAMP}.jsonl`

**To add to crontab:**
```bash
crontab -e
# Add this line (adjust path as needed):
0 8 * * * cd /Users/woleisijola/.openclaw/workspace/proformai-landing && npm run monitor >> logs/health-check.log 2>&1
```

### 2. Weekly Analytics Report (Monday 9:00 AM ET)

**Purpose:** Track lead volume, conversion funnel, buyer intent distribution

**Command:**
```bash
0 9 * * 1 cd /path/to/proformai-landing && npm run analytics >> logs/analytics.log 2>&1 && npm run analytics -- --export csv > logs/leads-export.csv
```

**What it reports:**
- Lead volume (total, this week, this month)
- Buyer intent breakdown (role, deal volume, timeline)
- Lead priority scoring
- Conversion funnel estimates
- Top 20 leads by priority score

**Output:**
- Console report (timestamped)
- CSV export of all leads with scores
- JSON export available via `--export json`

**To add to crontab:**
```bash
crontab -e
# Add this line:
0 9 * * 1 cd /Users/woleisijola/.openclaw/workspace/proformai-landing && npm run analytics >> logs/analytics.log 2>&1
```

### 3. Daily Webhook Monitor (11:00 PM ET)

**Purpose:** Verify webhook alerts are routing to Slack/Discord/email

**Command:**
```bash
0 23 * * * cd /path/to/proformai-landing && npm run monitor:webhook-test >> logs/webhook-monitor.log 2>&1
```

**What it does:**
- Tests webhook connectivity
- Sends test alert message
- Logs success/failure
- Alerts if webhook is down

**Output:** Logs to `logs/webhook-monitor.log`

**To add to crontab:**
```bash
crontab -e
# Add this line:
0 23 * * * cd /Users/woleisijola/.openclaw/workspace/proformai-landing && npm run monitor:webhook-test >> logs/webhook-monitor.log 2>&1
```

---

## Integration with OpenClaw Gateway

ProformAI monitoring can also be automated via OpenClaw's cron system:

### Setup via Gateway API

```bash
# Create health check cron job
curl -X POST http://localhost:3001/cron \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ProformAI Health Check",
    "schedule": {
      "kind": "cron",
      "expr": "0 8 * * *",
      "tz": "America/New_York"
    },
    "payload": {
      "kind": "systemEvent",
      "text": "ProformAI morning health check: npm run monitor"
    },
    "sessionTarget": "main"
  }'

# Create analytics cron job
curl -X POST http://localhost:3001/cron \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ProformAI Weekly Analytics",
    "schedule": {
      "kind": "cron",
      "expr": "0 9 * * 1",
      "tz": "America/New_York"
    },
    "payload": {
      "kind": "agentTurn",
      "message": "Run ProformAI analytics and generate lead report"
    },
    "sessionTarget": "isolated"
  }'
```

---

## Manual Testing

Before setting up cron jobs, test each command manually:

### Test Health Check
```bash
cd /path/to/proformai-landing
npm run monitor
```

Expected output:
```
[2026-03-10T13:01:36.654Z] Starting ProformAI Waitlist Monitor...
[2026-03-10T13:01:36.656Z] Running check: environment...
✅ environment
✅ loops-api
✅ waitlist-endpoint
✅ webhook
✅ forms

========== REPORT ==========
Timestamp: 2026-03-10T13:01:36.692Z
Checks: 5/5 passed
```

### Test Analytics
```bash
npm run analytics
```

Expected output:
```
╔════════════════════════════════════════════════════════════════╗
║              ProformAI Waitlist Analytics Report              ║
╚════════════════════════════════════════════════════════════════╝

📊 LEAD VOLUME
Total Signups: 247
This Week: 23
This Month: 89
...
```

### Test Webhook Alert
```bash
npm run monitor:webhook-test
```

Expected output (if webhook configured):
```
[INFO] Testing webhook connectivity...
✅ Webhook alert test delivered
```

---

## Log File Analysis

### Health Check Logs

Location: `logs/monitor-*.jsonl`

Each line is a JSON object with structure:
```json
{
  "summary": {
    "timestamp": "2026-03-10T13:01:36.654Z",
    "duration": "0.04s",
    "totalChecks": 5,
    "passed": 5,
    "failed": 0
  },
  "results": [
    {
      "name": "environment",
      "status": "pass"
    },
    {
      "name": "loops-api",
      "status": "pass"
    }
  ]
}
```

### Reading Health Logs

```bash
# Show latest health check
tail -1 logs/monitor-*.jsonl | jq '.'

# Show failures only
cat logs/monitor-*.jsonl | jq 'select(.summary.failed > 0)'

# Show timestamp + status
cat logs/monitor-*.jsonl | jq '{timestamp: .summary.timestamp, failed: .summary.failed, passed: .summary.passed}'
```

### Analytics Logs

Location: `logs/analytics.log` (human-readable) or `logs/proformai-analytics-*.json` (machine-readable)

Each analytics run captures:
- Lead count by source
- Buyer intent distribution
- Lead priority scores
- Estimated conversion rates

---

## Troubleshooting

### "Missing required env vars: LOOPS_API_KEY"

This is expected if running locally. In production (Vercel), the key should be set.

**Solution:**
1. Verify LOOPS_API_KEY is set in Vercel environment variables
2. Redeploy: `vercel deploy --prod`
3. Rerun health check

### "Waitlist endpoint check failed"

The server might not be running or reachable.

**Solutions:**
- Dev: Ensure `npm run dev` is running
- Production: Check Vercel deployment status at https://vercel.com/dashboard
- Test endpoint directly: `curl https://proformai.app/api/waitlist`

### "Loops API key invalid"

The LOOPS_API_KEY may have expired or been revoked.

**Solutions:**
1. Generate new API key in Loops dashboard (Settings → API)
2. Update Vercel environment variables
3. Redeploy
4. Rerun health check

### "Webhook test sends but no message appears"

The webhook URL might be wrong or the receiver might be offline.

**Solutions:**
1. Verify webhook URL: `echo $WAITLIST_ALERT_WEBHOOK_URL`
2. Test manually: `curl -X POST -H "Content-Type: application/json" -d '{"text":"test"}' $WEBHOOK_URL`
3. Check Slack/Discord for message (might be in different channel)
4. Verify webhook receiver is online

---

## Alert Configuration

### Slack Webhook Example

Get webhook URL from Slack:
1. Go to https://api.slack.com/apps
2. Select your app
3. Activate Incoming Webhooks
4. Click "Add New Webhook to Workspace"
5. Select channel: `#proformai-leads`
6. Copy webhook URL

Set in Vercel:
```bash
vercel env add WAITLIST_ALERT_WEBHOOK_URL
# Paste: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Discord Webhook Example

Get webhook URL from Discord:
1. Server Settings → Integrations → Webhooks
2. Click "New Webhook"
3. Name: "ProformAI Alerts"
4. Channel: #alerts
5. Copy webhook URL

Set in Vercel (same as Slack):
```bash
vercel env add WAITLIST_ALERT_WEBHOOK_URL
# Paste: https://discordapp.com/api/webhooks/YOUR/WEBHOOK/URL
```

---

## Performance Targets

After setup, monitoring should achieve:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Health check duration | <1s | >5s |
| API response time | <200ms | >1000ms |
| Webhook delivery | >99% | <95% success |
| Lead capture uptime | 99.9% | Any failure |
| Analytics refresh | Daily | >24h stale |

---

## Monitoring the Monitors

Once set up, verify crons are running:

```bash
# Check crontab
crontab -l

# Monitor cron execution (macOS)
log stream --predicate 'eventMessage contains "proformai"' --level debug

# Monitor cron logs (Linux)
tail -f /var/log/syslog | grep proformai
```

---

## Next Steps

1. **Set LOOPS_API_KEY in production** — Required for full monitoring
2. **Configure webhook** — Get alerts in Slack/Discord
3. **Run manual tests** — Verify all commands work
4. **Add to crontab** — Activate automated monitoring
5. **Set baseline metrics** — Know what "normal" looks like
6. **Review logs weekly** — Catch issues early

---

**Last Updated:** 2026-03-10  
**Maintainer:** Shuri (ProformAI Operations)
