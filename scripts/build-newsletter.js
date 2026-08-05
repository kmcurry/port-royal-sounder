#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EVENTS_PATH = path.join(ROOT, 'data', 'events.csv');
const ISSUES_PATH = path.join(ROOT, 'data', 'newsletter-issues.json');
const PRICES_PATH = path.join(ROOT, 'data', 'prices.json');
const TIME_ZONE = 'America/New_York';
const MAX_EVENT_SUMMARY_SENTENCES = 3;
const MAX_EVENT_SUMMARY_CHARS = 520;
const DISTANCE_RULES = [
  { pattern: /\bport royal\b|live oaks park|paris avenue/i, miles: 0 },
  { pattern: /\blady'?s island\b|crystal lake|carteret street|ribaut road|john galt road|clear water way|\bbeaufort\b/i, miles: 5 },
  { pattern: /\bparris island\b/i, miles: 8 },
  { pattern: /\bst\.?\s*helena\b|\bsaint helena\b/i, miles: 16 },
  { pattern: /\bokatie\b|sun city|snake road|williams drive/i, miles: 22 },
  { pattern: /\bbluffton\b|fording island|buckwalter|palmetto breeze/i, miles: 28 },
  { pattern: /\bhilton head\b|pinckney island/i, miles: 36 },
  { pattern: /\bsavannah\b|enmarket arena/i, miles: 45 },
  { pattern: /\bpooler\b/i, miles: 52 },
  { pattern: /\bisle of palms\b|windjammer|ocean boulevard/i, miles: 82 },
  { pattern: /\bcharleston\b|maybank hwy|music farm|music hall|john street|ann street|29412/i, miles: 72 }
];
const CITY_RULES = [
  { pattern: /\bport royal\b|live oaks park|paris avenue/i, city: 'Port Royal' },
  { pattern: /\blady'?s island\b|crystal lake/i, city: "Lady's Island" },
  { pattern: /\bbeaufort\b|carteret street|ribaut road|john galt road|clear water way/i, city: 'Beaufort' },
  { pattern: /\bparris island\b/i, city: 'Parris Island' },
  { pattern: /\bst\.?\s*helena\b|\bsaint helena\b/i, city: 'St. Helena Island' },
  { pattern: /\bokatie\b|sun city|snake road|williams drive/i, city: 'Okatie' },
  { pattern: /\bbluffton\b|fording island|buckwalter|palmetto breeze/i, city: 'Bluffton' },
  { pattern: /\bhilton head\b|pinckney island/i, city: 'Hilton Head Island' },
  { pattern: /\bsavannah\b|enmarket arena/i, city: 'Savannah' },
  { pattern: /\bpooler\b/i, city: 'Pooler' },
  { pattern: /\bisle of palms\b|windjammer|ocean boulevard/i, city: 'Isle of Palms' },
  { pattern: /\bcharleston\b|maybank hwy|music farm|music hall|john street|ann street|29412/i, city: 'Charleston' }
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(field);
      field = '';
      if (row.some((value) => value !== '')) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...records] = rows;
  return records.map((record) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = record[index] ?? '';
    });
    return entry;
  });
}

function readCsv(filePath) {
  return parseCsv(fs.readFileSync(filePath, 'utf8'));
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function addDays(isoDate, days) {
  const date = dateUtcFromIso(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return isoFromDateUtc(date);
}

function getWeekRange() {
  const { year, month, day } = getTodayParts();
  const today = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const start = isoFromDateUtc(today);
  return {
    start,
    end: addDays(start, 6)
  };
}

function compareEvents(a, b) {
  const aKey = `${a.StartDate}|${a.StartTime || '99:99'}|${a.Name}`;
  const bKey = `${b.StartDate}|${b.StartTime || '99:99'}|${b.Name}`;
  return aKey.localeCompare(bKey);
}

function eventPriority(event) {
  const tags = splitTags(event.Tags);
  const priorityMap = {
    Culture: 0,
    Education: 1,
    'Live Music': 2,
    Sports: 3,
    Civic: 99
  };

  const priorities = tags
    .map((tag) => priorityMap[tag])
    .filter((value) => Number.isFinite(value));

  if (priorities.length > 0) {
    return Math.min(...priorities);
  }

  return 50;
}

function compareNewsletterEvents(a, b) {
  const distanceDiff = eventDistanceMiles(a) - eventDistanceMiles(b);
  if (distanceDiff !== 0) {
    return distanceDiff;
  }

  const timeDiff = compareEvents(a, b);
  if (timeDiff !== 0) {
    return timeDiff;
  }

  return eventPriority(a) - eventPriority(b);
}

function splitEventsByRange(events, weekStart) {
  return {
    early: events.filter((event) => event.StartDate <= addDays(weekStart, 2)),
    mid: events.filter((event) => event.StartDate >= addDays(weekStart, 3) && event.StartDate <= addDays(weekStart, 4)),
    late: events.filter((event) => event.StartDate >= addDays(weekStart, 5))
  };
}

function weekdayName(isoDate) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'long'
  }).format(dateUtcFromIso(isoDate));
}

function buildSectionTitle(startDate, endDate) {
  if (startDate === endDate) {
    return weekdayName(startDate);
  }

  const startWeekday = weekdayName(startDate);
  const endWeekday = weekdayName(endDate);
  const diffDays = Math.round((dateUtcFromIso(endDate) - dateUtcFromIso(startDate)) / 86400000);

  if (diffDays === 1) {
    return `${startWeekday} And ${endWeekday}`;
  }

  return `${startWeekday} Through ${endWeekday}`;
}

function humanDate(isoDate) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(dateUtcFromIso(isoDate));
}

function issueDate(isoDate) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(dateUtcFromIso(isoDate));
}

function issueDateRange(startDate, endDate) {
  return `Week of ${issueDate(startDate)} to ${issueDate(endDate)}`;
}

function humanTime(timeValue) {
  if (!timeValue) {
    return '';
  }

  const [hoursText, minutesText = '00'] = timeValue.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;
  if (minutes === 0) {
    return `${normalizedHours}:00 ${suffix}`;
  }
  return `${normalizedHours}:${pad(minutes)} ${suffix}`;
}

function normalizeSentence(value) {
  return String(value || '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+([.,;:!?])/g, '$1');
}

function isCivicMeetingName(value) {
  return /\b(board|committee|council|workshop|caucus|commission|district|authority|task force|advisory|session|meeting|budget|election|review|hearing|trustees?)\b/i.test(String(value || ''));
}

function isCivicDescription(value) {
  return /\b(meeting|agenda|budget|workshop|public hearing|board|committee|council|commission|trustee|session|election|caucus|district|authority|ordinance|resolution|minutes)\b/i.test(String(value || ''));
}

function isNatureWalkDescription(value) {
  return /\b(guided walk|bird|birding|alligator|wetland|species of birds|life of the american alligator|wildlife)\b/i.test(String(value || ''));
}

function isCivicEvent(event) {
  return splitTags(event.Tags).includes('Civic') || isCivicMeetingName(event.Name);
}

function trustedEventSummary(event) {
  const notes = normalizeSentence(event.Notes);
  if (!notes) {
    return '';
  }

  if (isCivicEvent(event)) {
    if (isNatureWalkDescription(notes)) {
      return '';
    }

    if (!isCivicDescription(notes) && notes.length > 140) {
      return '';
    }
  }

  return notes.charAt(0).toUpperCase() + notes.slice(1);
}

function splitSentences(value) {
  return normalizeSentence(value).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
}

function truncateSummary(value, maxSentences = MAX_EVENT_SUMMARY_SENTENCES, maxChars = MAX_EVENT_SUMMARY_CHARS) {
  const normalized = normalizeSentence(value);
  if (!normalized) {
    return { text: '', truncated: false };
  }

  const sentences = splitSentences(normalized);
  let text = sentences.slice(0, maxSentences).join(' ').trim() || normalized;
  let truncated = text.length < normalized.length;

  if (text.length > maxChars) {
    const clipped = text.slice(0, maxChars + 1).replace(/\s+\S*$/, '').trim();
    text = (clipped || text.slice(0, maxChars).trim()).replace(/[.,;:!?]+$/, '');
    truncated = true;
  }

  return { text, truncated };
}

function summarizeEventNotes(event) {
  return truncateSummary(trustedEventSummary(event));
}

function eventDistanceMiles(event) {
  const primaryText = [
    event.Address,
    event.Location,
    event.Name
  ].filter(Boolean).join(' ');

  const primaryRule = DISTANCE_RULES.find((entry) => entry.pattern.test(primaryText));
  if (primaryRule) {
    return primaryRule.miles;
  }

  const sourceRule = DISTANCE_RULES.find((entry) => entry.pattern.test(event.Source || ''));
  return sourceRule ? sourceRule.miles : Number.POSITIVE_INFINITY;
}

function formatDistanceLabel(miles) {
  if (!Number.isFinite(miles)) {
    return '';
  }

  return miles === 0 ? 'in Port Royal' : `about ${miles} mi from Port Royal`;
}

function inferEventCity(event, summaryText) {
  const text = [
    event.Address,
    event.Location,
    event.Name,
    summaryText,
    event.Notes
  ].filter(Boolean).join(' ');
  const rule = CITY_RULES.find((entry) => entry.pattern.test(text));
  return rule ? rule.city : normalizeSentence(event.Location).replace(/,\s*(SC|GA|United States).*$/i, '');
}

function inferEventCost(event, summaryText) {
  const text = normalizeSentence(`${event.Name || ''} ${summaryText || ''} ${event.Notes || ''}`);
  const lower = text.toLowerCase();

  if (/\b(free admission|free event|free show|free entry|free to attend|admission is free|no admission|\$0)\b/.test(lower)) {
    return { costType: 'free', costLabel: 'Free' };
  }

  if (/\$[0-9]|\btickets?\b|\badmission\b|\bcover\b|\badvance\b|\bday of show\b|\bdoor\b/.test(lower)) {
    return { costType: 'paid', costLabel: 'Paid' };
  }

  if (isCivicEvent(event) || /\bpublic meeting\b/.test(lower)) {
    return { costType: 'free', costLabel: 'Free' };
  }

  return { costType: 'unknown', costLabel: 'Ask venue' };
}

function buildEventNote(event, summary) {
  const dateText = humanDate(event.StartDate);
  const timeText = humanTime(event.StartTime);

  if (timeText) {
    if (summary) {
      return `${dateText} at ${timeText}. ${summary}`;
    }

    if (isCivicEvent(event) && event.Source) {
      return `${dateText} at ${timeText}. Public meeting listed on ${event.Source}.`;
    }

    return `${dateText} at ${timeText}.`;
  }

  if (summary) {
    return `${dateText}. ${summary}`;
  }

  if (isCivicEvent(event) && event.Source) {
    return `${dateText}. Public meeting listed on ${event.Source}.`;
  }

  return `${dateText}.`;
}

function splitTags(value) {
  return String(value || '')
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function inferEventTags(event) {
  const explicit = splitTags(event.Tags);
  if (explicit.length) {
    return explicit;
  }

  const text = `${event.Name || ''} ${event.Notes || ''}`.toLowerCase();
  if (/\bboard\b|\bcommittee\b|\bcouncil\b|\breview board\b|\btransportation\b|\bpublic facilities\b|\bsolid waste\b|\bfinance\b|\badministration\b|\beconomic development\b/.test(text)) return ['Civic'];
  if (/\bmusic\b|\bconcert\b|\bjazz\b|\bshow\b|\bband\b|\bsoundtrack\b/.test(text)) return ['Live Music'];
  if (/\bbowling\b|\bhockey\b|\bghost pirates\b|\bgame\b|\bsports?\b/.test(text)) return ['Sports'];
  if (/\barchitects?\b|\bhistoric\b|\bsymposium\b|\bmuseum\b|\blecture\b|\blibrary\b|\barts?\b|\bcultural\b|\btour\b/.test(text)) return ['Culture'];
  if (/\bbirding\b|\bwalk\b|\bpreserve\b|\bwetland\b|\bnature\b/.test(text)) return ['Nature'];
  return ['Other'];
}

function toIssueItem(event) {
  const summary = summarizeEventNotes(event);
  const distanceMiles = eventDistanceMiles(event);
  const city = inferEventCity(event, summary.text);
  const cost = inferEventCost(event, summary.text);

  return {
    name: event.Name,
    location: event.Location,
    city,
    distanceMiles: Number.isFinite(distanceMiles) ? distanceMiles : null,
    distanceLabel: formatDistanceLabel(distanceMiles),
    costType: cost.costType,
    costLabel: cost.costLabel,
    link: event.Website,
    sourceName: event.Source,
    note: buildEventNote(event, summary.text),
    hasMore: summary.truncated,
    tags: inferEventTags(event)
  };
}

function parsePriceValue(value) {
  const match = String(value || '').match(/\$?(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function pickPriceWatchItems(pricesBoards) {
  const board = Array.isArray(pricesBoards) ? pricesBoards[0] : null;
  if (!board || !Array.isArray(board.sections)) {
    return [];
  }

  const preferredTitles = new Set([
    'Seafood',
    'Produce',
    'Honey',
    'Oysters',
    'Grains & Mill Goods',
    'Mushrooms',
    'Microgreens',
    'Farm Boxes'
  ]);

  return board.sections
    .filter((section) => preferredTitles.has(section.title))
    .map((section) => {
      const cheapest = [...(section.items || [])]
        .sort((left, right) => parsePriceValue(left.price || left.unitPrice) - parsePriceValue(right.price || right.unitPrice))[0];

      if (!cheapest) {
        return null;
      }

      const comparisonValue = cheapest.unitPrice || cheapest.price;
      const specialText = cheapest.specialPrice ? ` Special: ${cheapest.specialPrice}.` : '';

      return {
        name: `${section.title} — ${section.spec}`,
        location: `${cheapest.store}${cheapest.location ? ` (${cheapest.location})` : ''}`,
        link: cheapest.link,
        note: `${cheapest.label} at ${cheapest.price}${comparisonValue && comparisonValue !== cheapest.price ? ` (${comparisonValue})` : ''}.${specialText}`,
        history: Array.isArray(cheapest.history) ? cheapest.history : [],
        tags: [section.title]
      };
    })
    .filter(Boolean);
}

function buildIssue(events, previousIssues, pricesBoards, weekStart, weekEnd) {
  const existingIssue = previousIssues.find((issue) => issue.id === weekStart);
  const maxIssueNumber = previousIssues.reduce((max, issue) => Math.max(max, Number(issue.issueNumber) || 0), 0);
  const issueNumber = existingIssue ? existingIssue.issueNumber : maxIssueNumber + 1;
  const priceWatchItems = pickPriceWatchItems(pricesBoards);
  const { early, mid, late } = splitEventsByRange(events, weekStart);
  const sortSectionEvents = (items) => [...items].sort(compareNewsletterEvents);
  const earlyEnd = addDays(weekStart, 2);
  const midStart = addDays(weekStart, 3);
  const midEnd = addDays(weekStart, 4);
  const lateStart = addDays(weekStart, 5);

  return {
    ...(existingIssue || {}),
    id: weekStart,
    issueNumber,
    title: 'Next 7 Days in Beaufort County',
    publishDate: weekStart,
    subject: `Port Royal Sounder No. ${issueNumber}: the next 7 days of events and supplier prices`,
    preheader: issueDateRange(weekStart, weekEnd),
    intro: `This issue is built from the live calendar plus the current supplier price watch. It covers the next 7 days from today, along with public supplier prices we can verify without relying on blocked grocery-chain pages.`,
    sections: [
      {
        title: buildSectionTitle(weekStart, earlyEnd),
        items: sortSectionEvents(early).map(toIssueItem)
      },
      {
        title: buildSectionTitle(midStart, midEnd),
        items: sortSectionEvents(mid).map(toIssueItem)
      },
      {
        title: buildSectionTitle(lateStart, weekEnd),
        items: sortSectionEvents(late).map(toIssueItem)
      },
      {
        title: 'Supplier Price Watch',
        items: priceWatchItems
      }
    ]
  };
}

function main() {
  const { start, end } = getWeekRange();
  const events = readCsv(EVENTS_PATH)
    .filter((event) => event.StartDate >= start && event.StartDate <= end)
    .sort(compareEvents);
  const issues = readJson(ISSUES_PATH, []);
  const pricesBoards = readJson(PRICES_PATH, []);
  const issue = buildIssue(events, issues, pricesBoards, start, end);
  const remainingIssues = issues.filter((entry) => entry.id !== issue.id);
  const nextIssues = [issue, ...remainingIssues];

  fs.writeFileSync(ISSUES_PATH, `${JSON.stringify(nextIssues, null, 2)}\n`);
  console.log(`Built newsletter issue ${issue.id} with ${events.length} events and ${issue.sections[3].items.length} supplier price watch items.`);
}

main();
