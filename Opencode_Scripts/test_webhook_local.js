/**
 * test_webhook_local.js
 *
 * Helper script to test all GitHub Bot webhook events locally without needing
 * an active GitHub Organization or public ngrok forwarding.
 *
 * Usage:
 *   node Opencode_Scripts/test_webhook_local.js [scenario]
 *
 * Scenarios:
 *   - issue_opened
 *   - issue_labeled
 *   - issue_unlabeled
 *   - issue_assigned
 *   - issue_unassigned
 *   - issue_closed
 *   - issue_reopened
 *   - info_command
 *   - shazam_command
 *   - pr_opened
 *   - pr_merged
 *   - pr_closed
 *   - all (default)
 */

import crypto from 'node:crypto';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const SECRET = process.env.WEBHOOK_SECRET || 'local_webhook_secret_key_12345';
const PORT = process.env.PORT || 4000;
const BACKEND_URL = `http://localhost:${PORT}/api/v1/github-bot`;

async function sendWebhook(event, payload, description) {
  const body = JSON.stringify(payload);
  const signature = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');

  console.log(`\n--------------------------------------------------`);
  console.log(`📡 [TEST] ${description}`);
  console.log(`🔹 Event: ${event} | Action: ${payload.action || 'N/A'}`);

  try {
    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': event,
        'x-hub-signature-256': signature,
      },
      body: body,
    });

    console.log(` Response Status: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.error(`❌ Failed to send webhook:`, err.message);
  }
}

async function run() {
  const scenario = process.argv[2] || 'all';

  const testRepo = 'opencode-repo-1';
  const testUser = 'testuser1';
  const testIssueNum = 101;
  const testPRNum = 201;

  if (scenario === 'all' || scenario === 'issue_opened') {
    await sendWebhook('issues', {
      action: 'opened',
      repository: { name: testRepo },
      issue: {
        number: testIssueNum,
        title: 'Implement local mock tests',
        labels: [{ name: 'Points: 25' }, { name: 'open-for-all' }]
      }
    }, 'Issue Opened with 25 points & open-for-all');
  }

  if (scenario === 'all' || scenario === 'issue_labeled') {
    await sendWebhook('issues', {
      action: 'labeled',
      repository: { name: testRepo },
      issue: { number: testIssueNum },
      label: { name: 'Points: 30' }
    }, 'Issue Labeled (Points changed to 30)');
  }

  if (scenario === 'all' || scenario === 'issue_assigned') {
    await sendWebhook('issues', {
      action: 'assigned',
      repository: { name: testRepo },
      issue: { number: testIssueNum },
      assignee: { login: testUser }
    }, 'Issue Assigned to testuser1');
  }

  if (scenario === 'all' || scenario === 'info_command') {
    await sendWebhook('issue_comment', {
      action: 'created',
      repository: { name: testRepo },
      issue: { number: testIssueNum },
      comment: { body: '/info' }
    }, 'Issue Comment /info Command');
  }

  if (scenario === 'all' || scenario === 'shazam_command') {
    await sendWebhook('issue_comment', {
      action: 'created',
      repository: { name: testRepo },
      issue: { number: testIssueNum },
      comment: { body: '/shazam' }
    }, 'Issue Comment /shazam Command');
  }

  if (scenario === 'all' || scenario === 'pr_opened') {
    await sendWebhook('pull_request', {
      action: 'opened',
      repository: { name: testRepo },
      pull_request: {
        id: 999901,
        number: testPRNum,
        title: 'Fix issue #101',
        body: 'Closes Issue : #101',
        user: { login: testUser }
      }
    }, 'PR Opened following correct Issue: #101 template');
  }

  if (scenario === 'all' || scenario === 'pr_merged') {
    await sendWebhook('pull_request', {
      action: 'closed',
      repository: { name: testRepo },
      pull_request: {
        id: 999901,
        number: testPRNum,
        title: 'Fix issue #101',
        body: 'Closes Issue : #101',
        user: { login: testUser },
        merged: true
      }
    }, 'PR Merged (Leaderboard Points & PRMerged update)');
  }

  if (scenario === 'all' || scenario === 'issue_closed') {
    await sendWebhook('issues', {
      action: 'closed',
      repository: { name: testRepo },
      issue: { number: testIssueNum }
    }, 'Issue Closed');
  }

  console.log(`\n Webhook tests completed!`);
}

run();

