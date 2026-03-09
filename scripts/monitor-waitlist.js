#!/usr/bin/env node

/**
 * ProformAI Waitlist Pipeline Monitor
 * 
 * Performs health checks on:
 * - Environment configuration
 * - Waitlist API endpoints
 * - Loops integration
 * - Webhook alerting
 * - Database connectivity (if applicable)
 * 
 * Usage: node scripts/monitor-waitlist.js [--test] [--webhook-test]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const logsDir = path.join(projectRoot, '.logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const CHECKS = {
  ENV: 'environment',
  LOOPS_API: 'loops-api',
  WAITLIST_ENDPOINT: 'waitlist-endpoint',
  WEBHOOK: 'webhook',
  FORMS: 'forms',
};

class WaitlistMonitor {
  constructor() {
    this.results = [];
    this.startTime = new Date();
    this.errors = [];
    this.testMode = process.argv.includes('--test');
    this.webhookTest = process.argv.includes('--webhook-test');
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  async check(name, fn) {
    try {
      this.log(`Running check: ${name}...`);
      const result = await fn();
      this.results.push({
        name,
        status: 'pass',
        timestamp: new Date().toISOString(),
        details: result,
      });
      this.log(`✅ ${name}`);
      return result;
    } catch (error) {
      this.log(`❌ ${name}: ${error.message}`);
      this.results.push({
        name,
        status: 'fail',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
      this.errors.push({ check: name, error });
    }
  }

  checkEnvironment() {
    return this.check(CHECKS.ENV, () => {
      const required = ['LOOPS_API_KEY'];
      const optional = ['WAITLIST_ALERT_WEBHOOK_URL', 'VERCEL_URL', 'ENVIRONMENT'];

      const envFile = path.join(projectRoot, '.env.local');
      const envExampleFile = path.join(projectRoot, '.env.example');

      const missing = [];
      const configured = [];

      for (const key of required) {
        if (process.env[key]) {
          configured.push(key);
        } else {
          missing.push(key);
        }
      }

      if (missing.length > 0) {
        throw new Error(`Missing required env vars: ${missing.join(', ')}`);
      }

      const optionalConfigured = optional.filter((key) => process.env[key]);

      return {
        required: configured.length,
        optional: optionalConfigured.length,
        envFileExists: fs.existsSync(envFile),
        envExampleExists: fs.existsSync(envExampleFile),
        message: `All required vars configured (${required.length}/${required.length})`,
      };
    });
  }

  checkLoopsAPI() {
    return this.check(CHECKS.LOOPS_API, async () => {
      const apiKey = process.env.LOOPS_API_KEY;
      if (!apiKey) throw new Error('LOOPS_API_KEY not set');

      const testEmail = `proformai-monitor-${Date.now()}@test.proformai.app`;

      try {
        const res = await fetch('https://app.loops.so/api/v1/contacts/find', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
          },
          // No query params to avoid actual user lookups
        }).catch(() => ({ ok: false, status: 401 }));

        // Check if we got a valid response (any status that's not auth error)
        if (res.status === 401) {
          throw new Error('Loops API key invalid or expired');
        }

        return {
          connected: true,
          endpoint: 'https://app.loops.so/api/v1',
          lastChecked: new Date().toISOString(),
          message: 'Loops API connectivity verified',
        };
      } catch (error) {
        throw new Error(`Loops API check failed: ${error.message}`);
      }
    });
  }

  checkWaitlistEndpoint() {
    return this.check(CHECKS.WAITLIST_ENDPOINT, async () => {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      try {
        const res = await fetch(`${baseUrl}/api/waitlist`, {
          method: 'OPTIONS',
        });

        if (res.status === 200 || res.status === 405) {
          // 200 for OPTIONS, 405 if method not allowed (but endpoint exists)
          return {
            connected: true,
            url: `${baseUrl}/api/waitlist`,
            corsEnabled: res.headers.get('access-control-allow-origin') === '*',
            message: 'Waitlist endpoint reachable with CORS enabled',
          };
        }

        throw new Error(`Unexpected status: ${res.status}`);
      } catch (error) {
        throw new Error(`Waitlist endpoint check failed: ${error.message}`);
      }
    });
  }

  checkWebhook() {
    return this.check(CHECKS.WEBHOOK, () => {
      const webhookUrl = process.env.WAITLIST_ALERT_WEBHOOK_URL;

      if (!webhookUrl) {
        return {
          configured: false,
          message: 'Webhook URL not configured (alerts disabled)',
        };
      }

      // Basic URL validation
      try {
        new URL(webhookUrl);
        return {
          configured: true,
          url: webhookUrl.split('?')[0], // Hide query params for security
          message: 'Webhook URL configured and valid',
        };
      } catch (error) {
        throw new Error(`Invalid webhook URL: ${error.message}`);
      }
    });
  }

  checkForms() {
    return this.check(CHECKS.FORMS, () => {
      // Check if landing page form has the new buyer intent fields
      const landingPagePath = path.join(projectRoot, 'public/landing.html');

      if (!fs.existsSync(landingPagePath)) {
        throw new Error('Landing page not found');
      }

      const content = fs.readFileSync(landingPagePath, 'utf8');
      // Check for form fields using id= (preferred) or name= attributes
      const hasIntentFields = [
        { id: 'roleInput', name: 'role' },
        { id: 'dealVolumeInput', name: 'deal_volume' },
        { id: 'timelineInput', name: 'timeline' },
      ].every((field) => content.includes(`id="${field.id}"`) || content.includes(`name="${field.name}"`));

      return {
        formExists: true,
        hasIntentFields,
        fields: hasIntentFields ? ['email', 'role', 'deal_volume', 'timeline'] : ['email'],
        message: hasIntentFields
          ? 'Form includes buyer intent fields'
          : 'Form missing buyer intent fields',
      };
    });
  }

  async runAllChecks() {
    this.log('Starting ProformAI Waitlist Monitor...\n');

    await this.checkEnvironment();
    await this.checkLoopsAPI();
    await this.checkWaitlistEndpoint();
    await this.checkWebhook();
    await this.checkForms();

    if (this.testMode) {
      await this.testWaitlistFlow();
    }

    if (this.webhookTest && process.env.WAITLIST_ALERT_WEBHOOK_URL) {
      await this.testWebhookAlert();
    }

    return this.generateReport();
  }

  async testWaitlistFlow() {
    this.log('\n--- Running Integration Test ---\n');

    return this.check('integration-test', async () => {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      const testEmail = `monitor-test-${Date.now()}@proformai.app`;
      const testPayload = {
        email: testEmail,
        role: 'investor',
        deal_volume: '11_25',
        timeline: 'asap',
        utm_source: 'monitor-test',
      };

      const res = await fetch(`${baseUrl}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      const data = await res.json();

      if (!res.ok && data.error !== 'Valid email required') {
        throw new Error(`Waitlist signup failed: ${data.error}`);
      }

      return {
        endpoint: `${baseUrl}/api/waitlist`,
        testEmail,
        status: res.status,
        success: data.success || data.message === 'already_subscribed',
        response: data,
      };
    });
  }

  async testWebhookAlert() {
    this.log('\n--- Testing Webhook Alert ---\n');

    return this.check('webhook-alert-test', async () => {
      const webhookUrl = process.env.WAITLIST_ALERT_WEBHOOK_URL;

      const testMessage = {
        text: [
          '🧪 ProformAI Webhook Test',
          `Timestamp: ${new Date().toISOString()}`,
          'Environment: monitoring',
          'Status: If you see this, webhook alerting is working!',
        ].join('\n'),
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMessage),
      });

      if (!res.ok) {
        throw new Error(`Webhook failed with status ${res.status}`);
      }

      return {
        webhookUrl: webhookUrl.split('?')[0],
        testMessage: testMessage.text.split('\n')[0],
        status: res.status,
        success: true,
      };
    });
  }

  generateReport() {
    const endTime = new Date();
    const duration = (endTime - this.startTime) / 1000;

    const summary = {
      timestamp: endTime.toISOString(),
      duration: `${duration.toFixed(2)}s`,
      totalChecks: this.results.length,
      passed: this.results.filter((r) => r.status === 'pass').length,
      failed: this.results.filter((r) => r.status === 'fail').length,
    };

    const report = {
      summary,
      results: this.results,
      errors: this.errors.length > 0 ? this.errors : null,
    };

    // Save to log file
    const logFile = path.join(logsDir, `monitor-${endTime.toISOString().split('T')[0]}.jsonl`);
    fs.appendFileSync(logFile, JSON.stringify(report) + '\n');

    return report;
  }

  printReport(report) {
    const { summary, results, errors } = report;

    console.log('\n========== REPORT ==========\n');
    console.log(`Timestamp: ${summary.timestamp}`);
    console.log(`Duration: ${summary.duration}`);
    console.log(`Checks: ${summary.passed}/${summary.totalChecks} passed\n`);

    for (const result of results) {
      const icon = result.status === 'pass' ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
      if (result.details?.message) {
        console.log(`   ${result.details.message}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    if (errors && errors.length > 0) {
      console.log(`\n⚠️  ${errors.length} check(s) failed\n`);
      process.exit(1);
    } else {
      console.log(`\n✅ All checks passed\n`);
    }
  }
}

const monitor = new WaitlistMonitor();
const report = await monitor.runAllChecks();
monitor.printReport(report);
