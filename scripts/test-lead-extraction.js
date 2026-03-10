#!/usr/bin/env node

/**
 * ProformAI Lead Extraction Quality Gate Tests
 * 
 * Tests the waitlist lead extraction pipeline including:
 * - Required field validation
 * - Email format validation
 * - Lead scoring logic
 * - Priority tier assignment
 * 
 * Run: node scripts/test-lead-extraction.js
 */

import fs from 'fs';
import path from 'path';

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateRequiredFields(lead) {
  const required = ['email', 'name', 'role', 'deal_volume', 'timeline'];
  const missing = required.filter(field => !lead[field]);
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(', ')}`
    };
  }
  
  return { valid: true };
}

function validateEmailFormat(email) {
  if (!validateEmail(email)) {
    return {
      valid: false,
      error: `Invalid email format: ${email}`
    };
  }
  return { valid: true };
}

function validateRole(role) {
  const validRoles = ['broker', 'principal', 'agent', 'investor', 'other'];
  if (!validRoles.includes(role)) {
    return {
      valid: false,
      error: `Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`
    };
  }
  return { valid: true };
}

function validateDealVolume(volume) {
  const validVolumes = ['0-5', '5-20', '20-50', '50+'];
  if (!validVolumes.includes(volume)) {
    return {
      valid: false,
      error: `Invalid deal volume: ${volume}. Must be one of: ${validVolumes.join(', ')}`
    };
  }
  return { valid: true };
}

function validateTimeline(timeline) {
  const validTimelines = ['immediate', '1-3-months', '3-6-months', 'exploring'];
  if (!validTimelines.includes(timeline)) {
    return {
      valid: false,
      error: `Invalid timeline: ${timeline}. Must be one of: ${validTimelines.join(', ')}`
    };
  }
  return { valid: true };
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

function getSegmentScore(role) {
  const scores = {
    broker: 40,
    principal: 35,
    investor: 30,
    agent: 20,
    other: 5,
  };
  return scores[role] || 0;
}

function getVolumeScore(volume) {
  const scores = {
    '50+': 30,
    '20-50': 20,
    '5-20': 10,
    '0-5': 5,
  };
  return scores[volume] || 0;
}

function getTimelineScore(timeline) {
  const scores = {
    immediate: 30,
    '1-3-months': 20,
    '3-6-months': 10,
    exploring: 5,
  };
  return scores[timeline] || 0;
}

function calculateLeadScore(lead) {
  const segment = getSegmentScore(lead.role);
  const volume = getVolumeScore(lead.deal_volume);
  const timeline = getTimelineScore(lead.timeline);
  
  return {
    segment,
    volume,
    timeline,
    total: segment + volume + timeline,
  };
}

function getPriorityTier(score) {
  if (score >= 80) return 'P1';
  if (score >= 60) return 'P2';
  if (score >= 40) return 'P3';
  if (score >= 20) return 'P4';
  return 'P5';
}

// ============================================================================
// LEAD PROCESSING PIPELINE
// ============================================================================

function processLead(lead) {
  const result = {
    input: lead,
    gates: [],
    valid: true,
    score: null,
    priority: null,
  };

  // Gate 1: Required Fields
  const requiredCheck = validateRequiredFields(lead);
  result.gates.push({
    name: 'Required Fields',
    passed: requiredCheck.valid,
    error: requiredCheck.error || null,
  });
  if (!requiredCheck.valid) {
    result.valid = false;
    return result;
  }

  // Gate 2: Email Format
  const emailCheck = validateEmailFormat(lead.email);
  result.gates.push({
    name: 'Email Format',
    passed: emailCheck.valid,
    error: emailCheck.error || null,
  });
  if (!emailCheck.valid) {
    result.valid = false;
    return result;
  }

  // Gate 3: Enum Validation
  const roleCheck = validateRole(lead.role);
  const volumeCheck = validateDealVolume(lead.deal_volume);
  const timelineCheck = validateTimeline(lead.timeline);

  result.gates.push({
    name: 'Role Validation',
    passed: roleCheck.valid,
    error: roleCheck.error || null,
  });
  result.gates.push({
    name: 'Deal Volume Validation',
    passed: volumeCheck.valid,
    error: volumeCheck.error || null,
  });
  result.gates.push({
    name: 'Timeline Validation',
    passed: timelineCheck.valid,
    error: timelineCheck.error || null,
  });

  if (!roleCheck.valid || !volumeCheck.valid || !timelineCheck.valid) {
    result.valid = false;
    return result;
  }

  // All gates passed - calculate score
  const scoreBreakdown = calculateLeadScore(lead);
  result.score = scoreBreakdown;
  result.priority = getPriorityTier(scoreBreakdown.total);

  return result;
}

// ============================================================================
// TEST CASES
// ============================================================================

const testCases = [
  {
    name: 'High-Intent Broker (P1)',
    lead: {
      email: 'john@smith-commercial.com',
      name: 'John Smith',
      company: 'Smith Commercial',
      role: 'broker',
      deal_volume: '20-50',
      timeline: 'immediate',
    },
    expectedValid: true,
    expectedScore: 90,
    expectedTier: 'P1',
  },
  {
    name: 'Principal with Medium Timeline (P2)',
    lead: {
      email: 'jane@realestate.com',
      name: 'Jane Doe',
      company: 'Doe Properties',
      role: 'principal',
      deal_volume: '5-20',
      timeline: '1-3-months',
    },
    expectedValid: true,
    expectedScore: 65,
    expectedTier: 'P2',
  },
  {
    name: 'Low-Volume Agent (P4)',
    lead: {
      email: 'agent@brokerhouse.com',
      name: 'Bob Johnson',
      company: 'Broker House',
      role: 'agent',
      deal_volume: '0-5',
      timeline: 'exploring',
    },
    expectedValid: true,
    expectedScore: 30,
    expectedTier: 'P4',
  },
  {
    name: 'Missing Email (Invalid)',
    lead: {
      name: 'Alice White',
      role: 'investor',
      deal_volume: '20-50',
      timeline: 'immediate',
    },
    expectedValid: false,
    expectedScore: null,
    expectedTier: null,
  },
  {
    name: 'Invalid Email Format',
    lead: {
      email: 'not-an-email',
      name: 'Charlie Brown',
      role: 'broker',
      deal_volume: '50+',
      timeline: 'immediate',
    },
    expectedValid: false,
    expectedScore: null,
    expectedTier: null,
  },
  {
    name: 'Invalid Role',
    lead: {
      email: 'dave@company.com',
      name: 'Dave Smith',
      role: 'ceo', // Invalid
      deal_volume: '20-50',
      timeline: 'immediate',
    },
    expectedValid: false,
    expectedScore: null,
    expectedTier: null,
  },
  {
    name: 'Investor with High Deal Volume (P1)',
    lead: {
      email: 'investor@fund.com',
      name: 'Eve Capital',
      company: 'Capital Partners',
      role: 'investor',
      deal_volume: '50+',
      timeline: 'immediate',
    },
    expectedValid: true,
    expectedScore: 90,
    expectedTier: 'P1',
  },
  {
    name: 'All Fields Minimum Valid (P5)',
    lead: {
      email: 'explorer@example.com',
      name: 'Explorer',
      role: 'other',
      deal_volume: '0-5',
      timeline: 'exploring',
    },
    expectedValid: true,
    expectedScore: 15,
    expectedTier: 'P5',
  },
];

// ============================================================================
// TEST RUNNER
// ============================================================================

function runTests() {
  let passed = 0;
  let failed = 0;

  log(colors.cyan, '\n╔════════════════════════════════════════════════════════════╗');
  log(colors.cyan, '║   ProformAI Lead Extraction Quality Gate Test Suite       ║');
  log(colors.cyan, '╚════════════════════════════════════════════════════════════╝\n');

  testCases.forEach((testCase, index) => {
    log(colors.blue, `\n[Test ${index + 1}/${testCases.length}] ${testCase.name}`);

    const result = processLead(testCase.lead);

    // Check validity
    if (result.valid !== testCase.expectedValid) {
      log(colors.red, `  ❌ FAIL: Expected valid=${testCase.expectedValid}, got ${result.valid}`);
      failed++;
      return;
    }

    // If invalid, we're done
    if (!result.valid) {
      log(colors.green, `  ✅ PASS: Correctly rejected invalid lead`);
      log(colors.yellow, `     Gates: ${result.gates.map(g => g.passed ? '✓' : '✗').join(' ')}`);
      passed++;
      return;
    }

    // Check score
    if (result.score.total !== testCase.expectedScore) {
      log(colors.red, `  ❌ FAIL: Expected score=${testCase.expectedScore}, got ${result.score.total}`);
      failed++;
      return;
    }

    // Check priority tier
    if (result.priority !== testCase.expectedTier) {
      log(colors.red, `  ❌ FAIL: Expected tier=${testCase.expectedTier}, got ${result.priority}`);
      failed++;
      return;
    }

    // All checks passed
    log(colors.green, `  ✅ PASS`);
    log(colors.yellow, `     Score: ${result.score.total} (Segment: ${result.score.segment}, Volume: ${result.score.volume}, Timeline: ${result.score.timeline})`);
    log(colors.yellow, `     Priority: ${result.priority}`);
    passed++;
  });

  // Summary
  log(colors.cyan, `\n╔════════════════════════════════════════════════════════════╗`);
  log(colors.cyan, `║ RESULTS                                                    ║`);
  log(colors.cyan, `╚════════════════════════════════════════════════════════════╝`);
  log(colors.green, `✅ Passed: ${passed}/${testCases.length}`);
  if (failed > 0) {
    log(colors.red, `❌ Failed: ${failed}/${testCases.length}`);
  }

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// ============================================================================
// RUN
// ============================================================================

runTests();
