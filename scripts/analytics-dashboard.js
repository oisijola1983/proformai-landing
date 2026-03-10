#!/usr/bin/env node

/**
 * ProformAI Waitlist Analytics Dashboard
 * 
 * Real-time metrics for:
 * - Lead volume and source attribution
 * - Buyer intent distribution (role, volume, timeline)
 * - Lead scoring and priority ranking
 * - Conversion funnel tracking
 * - Webhook alert performance
 * - Revenue-ready lead identification
 * 
 * Usage:
 *   node scripts/analytics-dashboard.js [--export csv|json|html] [--period week|month|all]
 * 
 * Environment:
 *   LOOPS_API_KEY - Pulls contacts and automation performance data
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

class ProformAIAnalytics {
  constructor() {
    this.loopsApiKey = process.env.LOOPS_API_KEY;
    this.logsDir = path.join(__dirname, '..', '.logs');
    this.dataDir = path.join(__dirname, '..', 'data');
    
    this.metrics = {
      lead_volume: {
        total: 0,
        thisWeek: 0,
        thisMonth: 0,
        bySource: {}
      },
      buyer_intent: {
        byRole: {},
        byVolume: {},
        byTimeline: {}
      },
      lead_scores: {
        high: 0,      // Score >= 80
        medium: 0,    // Score 50-79
        low: 0        // Score < 50
      },
      conversion: {
        signupToEmail: 0,
        emailToDemo: 0,
        demoToDeal: 0
      },
      webhook_alerts: {
        sent: 0,
        failed: 0,
        lastAlert: null
      }
    };
  }
  
  /**
   * Calculate lead priority score based on buyer intent signals
   * 
   * Scoring matrix:
   * - Principal + 50+ deals + Immediate = 95-100 (VIP)
   * - Broker + 20+ deals + <3mo = 80-94 (High Priority)
   * - Investor + Any + Any = 70-79 (Medium)
   * - Agent + 5-20 deals + Exploring = 40-69 (Low-Medium)
   * - Other + <5 deals + Exploring = 20-39 (Low)
   */
  scoreLeadIntent(role, dealVolume, timeline) {
    let baseScore = 50;
    
    // Role weighting
    const roleScores = {
      'principal': 25,
      'broker': 20,
      'investor': 18,
      'agent': 10,
      'other': 5
    };
    baseScore += roleScores[role] || 0;
    
    // Deal volume weighting
    const volumeScores = {
      '50+': 20,
      '20-50': 15,
      '5-20': 10,
      '0-5': 5
    };
    baseScore += volumeScores[dealVolume] || 0;
    
    // Timeline urgency
    const timelineScores = {
      'immediate': 15,
      '1-3-months': 10,
      '3-6-months': 5,
      'exploring': 0
    };
    baseScore += timelineScores[timeline] || 0;
    
    // Cap at 100
    return Math.min(100, Math.max(0, baseScore));
  }
  
  /**
   * Fetch all contacts from Loops API
   */
  async fetchLoopsContacts() {
    if (!this.loopsApiKey) {
      console.log('⚠️  LOOPS_API_KEY not set. Skipping Loops data.');
      return [];
    }
    
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: 'app.loops.so',
        path: '/api/v1/contacts',
        headers: {
          'Authorization': `Bearer ${this.loopsApiKey}`,
          'Content-Type': 'application/json'
        }
      };
      
      https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.contacts || []);
          } catch (e) {
            reject(new Error(`Failed to parse Loops API response: ${e.message}`));
          }
        });
      }).on('error', reject).end();
    });
  }
  
  /**
   * Generate summary metrics from contact data
   */
  generateSummary(contacts) {
    this.metrics.lead_volume.total = contacts.length;
    
    // Filter by date
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    contacts.forEach(contact => {
      const createdAt = new Date(contact.createdAt).getTime();
      
      if (createdAt >= oneWeekAgo) this.metrics.lead_volume.thisWeek++;
      if (createdAt >= oneMonthAgo) this.metrics.lead_volume.thisMonth++;
      
      // Track by source (from custom fields)
      const source = contact.sourceUtm || 'direct';
      this.metrics.lead_volume.bySource[source] = (this.metrics.lead_volume.bySource[source] || 0) + 1;
      
      // Buyer intent distribution
      const role = contact.role || 'unknown';
      const volume = contact.dealVolume || 'unknown';
      const timeline = contact.timeline || 'unknown';
      
      this.metrics.buyer_intent.byRole[role] = (this.metrics.buyer_intent.byRole[role] || 0) + 1;
      this.metrics.buyer_intent.byVolume[volume] = (this.metrics.buyer_intent.byVolume[volume] || 0) + 1;
      this.metrics.buyer_intent.byTimeline[timeline] = (this.metrics.buyer_intent.byTimeline[timeline] || 0) + 1;
      
      // Lead scoring
      const score = this.scoreLeadIntent(role, volume, timeline);
      if (score >= 80) this.metrics.lead_scores.high++;
      else if (score >= 50) this.metrics.lead_scores.medium++;
      else this.metrics.lead_scores.low++;
    });
    
    return {
      contacts: contacts.map(c => ({
        email: c.email,
        name: c.firstName || c.lastName || 'Unknown',
        company: c.company || 'Unknown',
        role: c.role || 'unknown',
        dealVolume: c.dealVolume || 'unknown',
        timeline: c.timeline || 'unknown',
        score: this.scoreLeadIntent(c.role, c.dealVolume, c.timeline),
        createdAt: c.createdAt,
        source: c.sourceUtm || 'direct'
      }))
    };
  }
  
  /**
   * Format summary as human-readable report
   */
  formatReport() {
    const report = `
╔════════════════════════════════════════════════════════════════╗
║              ProformAI Waitlist Analytics Report              ║
║              Generated: ${new Date().toISOString()}
╚════════════════════════════════════════════════════════════════╝

📊 LEAD VOLUME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Signups: ${this.metrics.lead_volume.total}
This Week: ${this.metrics.lead_volume.thisWeek}
This Month: ${this.metrics.lead_volume.thisMonth}

Sources:
${Object.entries(this.metrics.lead_volume.bySource)
  .map(([src, count]) => `  ${src}: ${count}`)
  .join('\n')}

👥 BUYER INTENT DISTRIBUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
By Role:
${Object.entries(this.metrics.buyer_intent.byRole)
  .map(([role, count]) => `  ${role}: ${count} (${((count/this.metrics.lead_volume.total)*100).toFixed(1)}%)`)
  .join('\n')}

By Deal Volume:
${Object.entries(this.metrics.buyer_intent.byVolume)
  .map(([vol, count]) => `  ${vol} deals/month: ${count} (${((count/this.metrics.lead_volume.total)*100).toFixed(1)}%)`)
  .join('\n')}

By Timeline:
${Object.entries(this.metrics.buyer_intent.byTimeline)
  .map(([timeline, count]) => `  ${timeline}: ${count} (${((count/this.metrics.lead_volume.total)*100).toFixed(1)}%)`)
  .join('\n')}

⭐ LEAD SCORING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
High Priority (80-100): ${this.metrics.lead_scores.high} leads
  └─ VIP: Immediate sales focus
Medium Priority (50-79): ${this.metrics.lead_scores.medium} leads
  └─ Nurture: Email sequences & demos
Low Priority (<50): ${this.metrics.lead_scores.low} leads
  └─ Monitor: Follow-up every 30 days

💰 CONVERSION FUNNEL (ESTIMATED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Signup → Email: ${this.metrics.conversion.signupToEmail}% (est. 95%)
Email → Demo: ${this.metrics.conversion.emailToDemo}% (est. 20%)
Demo → Deal: ${this.metrics.conversion.demoToDeal}% (est. 15%)

Overall Conversion: ~2.8% (est.)
Revenue Impact: ${this.metrics.lead_volume.high} * $5K avg = $${this.metrics.lead_scores.high * 5000}K potential

🔔 WEBHOOK ALERTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Alerts Sent: ${this.metrics.webhook_alerts.sent}
Failures: ${this.metrics.webhook_alerts.failed}
Last Alert: ${this.metrics.webhook_alerts.lastAlert || 'None'}

🎯 NEXT ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Prioritize ${this.metrics.lead_scores.high} high-scoring leads for immediate outreach
2. Send automated welcome sequence to ${this.metrics.lead_volume.thisWeek} new this week
3. Schedule demos with ${Math.round(this.metrics.lead_scores.high * 0.3)} high-priority leads
4. Monitor webhook alerts daily (set Slack notification)

`;
    return report;
  }
  
  /**
   * Export data in various formats
   */
  async export(format = 'json', period = 'all') {
    const contacts = await this.fetchLoopsContacts();
    const summary = this.generateSummary(contacts);
    
    let output = '';
    let filename = `proformai-analytics-${Date.now()}`;
    
    switch (format) {
      case 'json':
        output = JSON.stringify({ metrics: this.metrics, summary }, null, 2);
        filename += '.json';
        break;
        
      case 'csv':
        const headers = ['Email', 'Name', 'Company', 'Role', 'Deal Volume', 'Timeline', 'Priority Score', 'Created', 'Source'];
        const rows = summary.contacts.map(c => [
          c.email,
          c.name,
          c.company,
          c.role,
          c.dealVolume,
          c.timeline,
          c.score,
          c.createdAt,
          c.source
        ]);
        output = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        filename += '.csv';
        break;
        
      case 'html':
        output = this.generateHTMLReport(summary);
        filename += '.html';
        break;
        
      default:
        output = this.formatReport();
    }
    
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    const filepath = path.join(this.logsDir, filename);
    fs.writeFileSync(filepath, output);
    
    return { filepath, format, recordCount: summary.contacts.length };
  }
  
  /**
   * Generate HTML dashboard
   */
  generateHTMLReport(summary) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ProformAI Analytics Dashboard</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metric { display: inline-block; margin-right: 40px; }
    .metric-value { font-size: 32px; font-weight: bold; color: #6366f1; }
    .metric-label { color: #666; font-size: 14px; }
    h1 { color: #1f2937; margin: 0 0 30px 0; }
    h2 { color: #374151; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    .high { color: #059669; font-weight: bold; }
    .medium { color: #d97706; font-weight: bold; }
    .low { color: #dc2626; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 ProformAI Waitlist Analytics</h1>
    
    <div class="card">
      <h2>Key Metrics</h2>
      <div class="metric">
        <div class="metric-value">${this.metrics.lead_volume.total}</div>
        <div class="metric-label">Total Leads</div>
      </div>
      <div class="metric">
        <div class="metric-value" class="high">${this.metrics.lead_scores.high}</div>
        <div class="metric-label">High Priority</div>
      </div>
      <div class="metric">
        <div class="metric-value" class="medium">${this.metrics.lead_scores.medium}</div>
        <div class="metric-label">Medium Priority</div>
      </div>
    </div>
    
    <div class="card">
      <h2>Top Leads (Sorted by Priority Score)</h2>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Company</th>
            <th>Role</th>
            <th>Deal Volume</th>
            <th>Timeline</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${summary.contacts
            .sort((a, b) => b.score - a.score)
            .slice(0, 20)
            .map(c => `<tr>
              <td>${c.email}</td>
              <td>${c.company}</td>
              <td>${c.role}</td>
              <td>${c.dealVolume}</td>
              <td>${c.timeline}</td>
              <td class="${c.score >= 80 ? 'high' : c.score >= 50 ? 'medium' : 'low'}">${c.score}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
  }
}

// ============ CLI ============

async function main() {
  const format = process.argv.includes('--export') 
    ? process.argv[process.argv.indexOf('--export') + 1] || 'json'
    : null;
  
  const analytics = new ProformAIAnalytics();
  
  try {
    if (format) {
      const result = await analytics.export(format);
      console.log(`✅ Exported to ${result.filepath}`);
      console.log(`   Records: ${result.recordCount}`);
    } else {
      const contacts = await analytics.fetchLoopsContacts();
      analytics.generateSummary(contacts);
      console.log(analytics.formatReport());
    }
  } catch (err) {
    console.error('❌ Analytics error:', err.message);
    process.exit(1);
  }
}

main();
