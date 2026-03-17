#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ISSUES_PATH = path.join(ROOT, 'data', 'newsletter-issues.json');
const API_BASE = 'https://api.buttondown.email/v1';
const TIME_ZONE = 'America/New_York';

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function getTodayParts() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day'))
  };
}

function dateUtcFromIso(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function isoFromDateUtc(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function getWeekRange() {
  const { year, month, day } = getTodayParts();
  const today = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = today.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + mondayOffset);

  return {
    start: isoFromDateUtc(monday)
  };
}

function formatIssueMarkdown(issue) {
  const lines = [
    `# No. ${issue.issueNumber}: ${issue.title}`,
    '',
    issue.preheader,
    '',
    issue.intro,
    ''
  ];

  for (const section of issue.sections || []) {
    lines.push(`## ${section.title}`);
    lines.push('');

    for (const item of section.items || []) {
      const location = item.location ? ` (${item.location})` : '';
      const link = item.link ? ` [Link](${item.link})` : '';
      lines.push(`- **${item.name}**${location}: ${item.note}${link}`);
    }

    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('You are receiving Port Royal Sounder because you subscribed for local updates from Beaufort County.');

  return lines.join('\n').trim();
}

function buildSlug(issue) {
  return `port-royal-sounder-${issue.id}`;
}

function normalizeEmailStatus(email) {
  return String(
    email?.status ||
    email?.state ||
    email?.send_state ||
    ''
  ).trim().toLowerCase();
}

function findMatchingEmail(payload, issue) {
  const emails = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.emails)
        ? payload.emails
        : [];

  const slug = buildSlug(issue);
  return emails.find((email) => {
    const emailSlug = String(email.slug || '').trim();
    const emailSubject = String(email.subject || '').trim();
    return emailSlug === slug || emailSubject === issue.subject;
  }) || null;
}

async function buttondownRequest(method, pathname, apiKey, body, query = null) {
  const url = new URL(`${API_BASE}${pathname}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value);
      }
    });
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'PortRoyalSounderNewsletterSender/1.0 (+https://portroyalsounder.com)'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Buttondown ${method} ${url.pathname} failed: ${response.status} ${text}`.trim());
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function findExistingEmail(issue, apiKey) {
  const payload = await buttondownRequest('GET', '/emails', apiKey, null, {
    subject: issue.subject
  });

  return findMatchingEmail(payload, issue);
}

function updateIssueRecord(issues, issueId, patch) {
  return issues.map((issue) => (
    issue.id === issueId
      ? { ...issue, ...patch }
      : issue
  ));
}

async function main() {
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    throw new Error('Missing BUTTONDOWN_API_KEY.');
  }

  const issues = readJson(ISSUES_PATH, []);
  const { start } = getWeekRange();
  const issue = issues.find((entry) => entry.id === start) || issues[0];

  if (!issue) {
    throw new Error('No newsletter issue found to send.');
  }

  if (issue.buttondownStatus && ['about_to_send', 'sent', 'scheduled', 'in_flight'].includes(String(issue.buttondownStatus).toLowerCase())) {
    console.log(`Issue ${issue.id} already queued or sent (${issue.buttondownStatus}).`);
    return;
  }

  const slug = buildSlug(issue);
  const body = formatIssueMarkdown(issue);
  const payload = {
    subject: issue.subject,
    body,
    description: issue.preheader,
    slug,
    status: 'about_to_send'
  };

  let email = null;
  const existingEmail = await findExistingEmail(issue, apiKey);

  if (existingEmail) {
    const existingStatus = normalizeEmailStatus(existingEmail);
    if (['about_to_send', 'sent', 'scheduled', 'in_flight'].includes(existingStatus)) {
      const nextIssues = updateIssueRecord(issues, issue.id, {
        buttondownEmailId: existingEmail.id,
        buttondownSlug: existingEmail.slug || slug,
        buttondownStatus: existingStatus,
        buttondownQueuedAt: issue.buttondownQueuedAt || new Date().toISOString()
      });
      writeJson(ISSUES_PATH, nextIssues);
      console.log(`Issue ${issue.id} already exists in Buttondown with status ${existingStatus}.`);
      return;
    }

    email = await buttondownRequest('PATCH', `/emails/${existingEmail.id}`, apiKey, payload);
  } else {
    email = await buttondownRequest('POST', '/emails', apiKey, payload);
  }

  const nextIssues = updateIssueRecord(issues, issue.id, {
    buttondownEmailId: email.id,
    buttondownSlug: email.slug || slug,
    buttondownStatus: normalizeEmailStatus(email) || 'about_to_send',
    buttondownQueuedAt: new Date().toISOString()
  });
  writeJson(ISSUES_PATH, nextIssues);
  console.log(`Queued newsletter issue ${issue.id} in Buttondown.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
