#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EVENTS_PATH = path.join(ROOT, 'data', 'events.csv');
const ISSUES_PATH = path.join(ROOT, 'data', 'newsletter-issues.json');
const PRICES_PATH = path.join(ROOT, 'data', 'prices.json');
const TIME_ZONE = 'America/New_York';

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
  const priorityDiff = eventPriority(a) - eventPriority(b);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return compareEvents(a, b);
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

function buildEventNote(event) {
  const dateText = humanDate(event.StartDate);
  const timeText = humanTime(event.StartTime);
  const summary = trustedEventSummary(event);

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
  return {
    name: event.Name,
    location: event.Location,
    link: event.Website,
    note: buildEventNote(event),
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
    preheader: `A rolling ${weekStart} to ${weekEnd} roundup, plus the supplier prices we can verify publicly.`,
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
