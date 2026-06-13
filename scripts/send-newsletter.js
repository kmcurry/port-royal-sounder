#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ISSUES_PATH = path.join(ROOT, 'data', 'newsletter-issues.json');
const API_BASE = 'https://api.buttondown.email/v1';
const TIME_ZONE = 'America/New_York';
const ENV_PATHS = [
  path.join(ROOT, '.env.local'),
  path.join(ROOT, '.env')
];
const FORCE_RESEND = process.argv.includes('--force');

function loadEnvFile() {
  for (const envPath of ENV_PATHS) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const text = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
      if (!key || process.env[key] !== undefined) {
        continue;
      }

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }

    return envPath;
  }

  return '';
}

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

  return {
    start: isoFromDateUtc(today)
  };
}

function slugifySectionTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function shouldShowTopNav(section) {
  return Boolean(section?.title);
}

function navLabel(title) {
  const normalized = String(title || '').toLowerCase();
  if (normalized.includes('weekly special')) {
    return 'Weekly Specials';
  }
  if (normalized.includes('price watch')) {
    return 'Price Watch';
  }
  return 'Events';
}

function inferNewsletterTags(item, group) {
  const text = `${item?.name || ''} ${item?.note || ''}`.toLowerCase();

  if (group === 'Price Watch') {
    const [title] = String(item?.name || '').split('—').map((part) => part.trim());
    return title ? [title] : ['Other'];
  }

  if (group === 'Events') {
    if (/\bboard\b|\bcommittee\b|\bcouncil\b|\breview board\b|\btransportation\b|\bpublic facilities\b|\bsolid waste\b|\bfinance\b|\badministration\b|\beconomic development\b/.test(text)) return ['Civic'];
    if (/\bmusic\b|\bconcert\b|\bjazz\b|\bshow\b|\bband\b|\bsoundtrack\b/.test(text)) return ['Live Music'];
    if (/\bbowling\b|\bhockey\b|\bghost pirates\b|\bgame\b|\bsports?\b/.test(text)) return ['Sports'];
    if (/\barchitects?\b|\bhistoric\b|\bsymposium\b|\bmuseum\b|\blecture\b|\blibrary\b|\barts?\b|\bcultural\b|\btour\b/.test(text)) return ['Culture'];
    if (/\bbirding\b|\bwalk\b|\bpreserve\b|\bwetland\b|\bnature\b/.test(text)) return ['Nature'];
    return ['Other'];
  }

  if (group === 'Weekly Specials') {
    if (/\btruck\b|\bpop-up\b|\bpop up\b/.test(text)) return ['Food Trucks'];
    if (/\bkitchen\b|\bcafe\b|\bbakery\b|\bmeals?\b|\bdeli\b|\bbutcher\b/.test(text)) return ['Prepared Foods'];
    if (/\bmusic\b|\bstreet music\b|\bbeer-garden\b|\bbeer garden\b/.test(text)) return ['Live Music'];
    if (/\bmarket\b|\bfarmers\b|\bproduce\b/.test(text)) return ['Markets'];
    if (/\bshrimp\b|\boyster\b|\bseafood\b|\bcrab\b/.test(text)) return ['Seafood'];
    return ['Other'];
  }

  return ['Other'];
}

function tagEmoji(tag) {
  const map = {
    Civic: '🏛️',
    'Live Music': '🎶',
    Sports: '🏅',
    Nature: '🌿',
    Culture: '🏛️',
    Markets: '🧺',
    'Food Trucks': '🚚',
    Seafood: '🦐',
    Produce: '🥬',
    Honey: '🐝',
    Oysters: '🦪',
    'Grains & Mill Goods': '🍚',
    Mushrooms: '🍄',
    Microgreens: '🌱',
    'Farm Boxes': '📦',
    'Prepared Foods': '🍽️',
    Eggs: '🥚',
    Milk: '🥛',
    Bread: '🍞',
    Bananas: '🍌',
    Apples: '🍎',
    Potatoes: '🥔',
    Onions: '🧅',
    Tomatoes: '🍅',
    Lettuce: '🥬',
    Oranges: '🍊',
    Butter: '🧈',
    Chicken: '🐔',
    Beef: '🥩',
    Pork: '🐖',
    Other: '📌'
  };

  return map[tag] || '🏷️';
}

function collectNewsletterTags(sections) {
  const seen = new Set();
  const tags = [];

  for (const section of sections || []) {
    const group = navLabel(section.title);
    for (const item of section.items || []) {
      for (const tag of inferNewsletterTags(item, group)) {
        if (seen.has(tag)) {
          continue;
        }
        seen.add(tag);
        tags.push(tag);
      }
    }
  }

  return tags;
}

function normalizeNumericHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function renderEmailSparkline(history) {
  const values = normalizeNumericHistory(history);
  if (values.length < 2) {
    return '';
  }

  const width = 84;
  const height = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / spread) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Price trend" style="display:inline-block; margin-left:8px; vertical-align:middle;"><polyline points="${points}" fill="none" stroke="#2e86ab" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>`;
}

function describePriceDelta(history) {
  const values = normalizeNumericHistory(history);
  if (values.length < 2) {
    return '';
  }

  const current = values[values.length - 1];
  const comparisonIndex = values.length >= 8 ? values.length - 8 : values.length - 2;
  const prior = values[comparisonIndex];
  const delta = Number((current - prior).toFixed(2));
  const label = values.length >= 8 ? 'from prior week' : 'since last check';

  if (delta === 0) {
    return `No change ${label}.`;
  }

  const direction = delta > 0 ? 'up' : 'down';
  return `$${Math.abs(delta).toFixed(2)} ${direction} ${label}.`;
}

function extractPriceHighlight(note) {
  const text = String(note || '');
  const match = text.match(/at (\$[0-9]+(?:\.[0-9]+)?(?:\/lb)?|\$[0-9]+(?:\.[0-9]+)? avg pack)/i);
  return match ? match[1] : '';
}

function formatEmailIssueItem(item, sectionTitle) {
  const location = item.location ? `${item.location}` : '';
  const link = item.link ? ` [Link](${item.link})` : '';
  const sparkline = item.name && item.name.includes('—') ? ` ${renderEmailSparkline(item.history)}` : '';
  const priceHighlight = item.name && item.name.includes('—') ? extractPriceHighlight(item.note) : '';
  const priceDelta = item.name && item.name.includes('—') ? describePriceDelta(item.history) : '';

  if (String(sectionTitle || '').toLowerCase() === 'price watch') {
    const lines = [
      `- ${itemEmoji(item)} **${item.name}**${sparkline}`,
      location ? `  ${location}` : '',
      priceHighlight ? `  **${priceHighlight}**` : '',
      priceDelta ? `  ${priceDelta}` : '',
      `  ${item.note}${link}`
    ].filter(Boolean);

    return lines.join('  \n');
  }

  return `- ${itemEmoji(item)} **${item.name}**${sparkline}${location ? ` (${location})` : ''}: ${item.note}${link}`;
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
    lines.push(`## ${sectionEmoji(section.title)} ${section.title}`);
    lines.push('');

    for (const item of section.items || []) {
      lines.push(formatEmailIssueItem(item, section.title));
    }

    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('You are receiving Port Royal Sounder because you subscribed for local updates from Beaufort County.');

  return lines.join('\n').trim();
}

function sectionEmoji(title) {
  const normalized = String(title || '').toLowerCase();

  if (normalized.includes('price watch')) return '📈';
  if (normalized.includes('special')) return '💸';
  return '🗓️';
}

function itemEmoji(item) {
  const explicitTag = Array.isArray(item?.tags) ? item.tags[0] : '';
  const explicitMap = {
    Civic: '🏛️',
    'Live Music': '🎶',
    Sports: '🏅',
    Nature: '🌿',
    Culture: '🏛️',
    Markets: '🧺',
    'Food Trucks': '🚚',
    Seafood: '🦐',
    Produce: '🥬',
    Honey: '🐝',
    Oysters: '🦪',
    'Grains & Mill Goods': '🍚',
    Mushrooms: '🍄',
    Microgreens: '🌱',
    'Farm Boxes': '📦',
    'Prepared Foods': '🍽️',
    Eggs: '🥚',
    Milk: '🥛',
    Bread: '🍞',
    Bananas: '🍌',
    Apples: '🍎',
    Potatoes: '🥔',
    Onions: '🧅',
    Tomatoes: '🍅',
    Lettuce: '🥬',
    Oranges: '🍊',
    Butter: '🧈',
    Chicken: '🐔',
    Beef: '🥩',
    Pork: '🐖',
    Other: '📌'
  };
  if (explicitTag && explicitMap[explicitTag]) {
    return explicitMap[explicitTag];
  }

  const priceWatchTitle = String(item?.name || '').split('—')[0].trim();
  if (priceWatchTitle) {
    const priceMap = {
      Eggs: '🥚',
      Milk: '🥛',
      Bread: '🍞',
      Bananas: '🍌',
      Apples: '🍎',
      Potatoes: '🥔',
      Onions: '🧅',
      Tomatoes: '🍅',
      Lettuce: '🥬',
      Oranges: '🍊',
      Butter: '🧈',
      Chicken: '🐔',
      Beef: '🥩',
      Pork: '🐖',
      Seafood: '🦐',
      Produce: '🥬',
      Honey: '🐝',
      Oysters: '🦪',
      'Grains & Mill Goods': '🍚',
      Mushrooms: '🍄',
      Microgreens: '🌱',
      'Farm Boxes': '📦'
    };

    if (priceMap[priceWatchTitle]) {
      return priceMap[priceWatchTitle];
    }
  }

  const text = `${item?.name || ''} ${item?.note || ''}`.toLowerCase();

  if (/\bboard\b|\bcommittee\b|\bcouncil\b|\breview board\b|\btransportation\b|\bpublic facilities\b|\bsolid waste\b|\bfinance\b|\badministration\b|\beconomic development\b/.test(text)) return '🏛️';
  if (/\bmusic\b|\bconcert\b|\bjazz\b|\bshow\b|\bband\b|\bsoundtrack\b/.test(text)) return '🎶';
  if (/\barchitects?\b|\bhistoric\b|\bsymposium\b|\bmuseum\b|\blecture\b|\blibrary\b|\barts?\b|\bcultural\b|\btour\b/.test(text)) return '🏛️';
  if (/\bbowling\b|\bhockey\b|\bghost pirates\b|\bgame\b|\bsports?\b/.test(text)) return '🏅';
  if (/\btruck\b|\bpop-up\b|\bpop up\b|\bgrub\b|\bpalmetto pops\b|\btime to eat\b/.test(text)) return '🚚';
  if (/\bkitchen\b|\bcafe\b|\bbakery\b|\bmeals?\b|\bdeli\b|\bbutcher\b/.test(text)) return '🍽️';
  if (/\bstring beans?\b|\bgreen beans?\b/.test(text)) return '🫛';
  if (/\bhoney\b/.test(text)) return '🍯';
  if (/\boyster\b/.test(text)) return '🦪';
  if (/\brice\b/.test(text)) return '🍚';
  if (/\bgrits?\b|\bcornmeal\b|\bpolenta\b/.test(text)) return '🌽';
  if (/\bflour\b|\bgrains?\b/.test(text)) return '🌾';
  if (/\bmushroom\b|\bfungi\b|\blion's mane\b/.test(text)) return '🍄';
  if (/\bmicrogreens?\b|\bbroccoli\b|\bradish\b|\bcilantro\b|\bscallion\b|\bbasil\b/.test(text)) return '🌱';
  if (/\bfarm box\b|\bbundle\b/.test(text)) return '📦';
  if (/\bmarket\b|\bfarmers\b|\bu-pick\b|\bproduce\b/.test(text)) return '🧺';
  if (/\bshrimp\b|\boyster\b|\bseafood\b|\bcrab\b/.test(text)) return '🦐';
  if (/\bbirding\b|\bwalk\b|\bpreserve\b|\bwetland\b|\bnature\b/.test(text)) return '🌿';
  if (/\bfood\b/.test(text)) return '🍽️';

  return '📌';
}

function buildSlug(issue) {
  return `port-royal-sounder-${issue.id}`;
}

function buildResendSubject(subject) {
  const trimmed = String(subject || '').trim();
  if (!trimmed) {
    return 'Port Royal Sounder (Updated)';
  }

  if (/\(updated\)$/i.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed} (Updated)`;
}

function buildResendSlug(slug) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'z').toLowerCase();
  return `${slug}-updated-${stamp}`;
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
      'X-Buttondown-Live-Dangerously': 'true',
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
  const loadedEnvPath = loadEnvFile();
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    throw new Error('Missing BUTTONDOWN_API_KEY. Set it in your shell, .env.local, or .env.');
  }

  const issues = readJson(ISSUES_PATH, []);
  const { start } = getWeekRange();
  const issue = issues.find((entry) => entry.id === start) || issues[0];

  if (!issue) {
    throw new Error('No newsletter issue found to send.');
  }

  if (!FORCE_RESEND && issue.buttondownStatus && ['about_to_send', 'sent', 'scheduled', 'in_flight'].includes(String(issue.buttondownStatus).toLowerCase())) {
    console.log(`Issue ${issue.id} already queued or sent (${issue.buttondownStatus}).`);
    return;
  }

  const slug = buildSlug(issue);
  const subject = FORCE_RESEND ? buildResendSubject(issue.subject) : issue.subject;
  const body = formatIssueMarkdown(issue);
  const payload = {
    subject,
    body,
    description: issue.preheader,
    slug: FORCE_RESEND ? buildResendSlug(slug) : slug,
    status: 'about_to_send'
  };

  let email = null;
  const existingEmail = FORCE_RESEND ? null : await findExistingEmail(issue, apiKey);

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
    buttondownSlug: email.slug || payload.slug,
    buttondownStatus: normalizeEmailStatus(email) || 'about_to_send',
    buttondownQueuedAt: new Date().toISOString(),
    buttondownEnvSource: loadedEnvPath ? path.basename(loadedEnvPath) : 'process.env',
    buttondownLastSubject: subject
  });
  writeJson(ISSUES_PATH, nextIssues);
  console.log(`Queued newsletter issue ${issue.id} in Buttondown.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
