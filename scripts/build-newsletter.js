#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EVENTS_PATH = path.join(ROOT, 'data', 'events.csv');
const ISSUES_PATH = path.join(ROOT, 'data', 'newsletter-issues.json');
const SPECIALS_PATH = path.join(ROOT, 'data', 'weekly-specials.json');
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
  const dayOfWeek = today.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    start: isoFromDateUtc(monday),
    end: isoFromDateUtc(sunday)
  };
}

function compareEvents(a, b) {
  const aKey = `${a.StartDate}|${a.StartTime || '99:99'}|${a.Name}`;
  const bKey = `${b.StartDate}|${b.StartTime || '99:99'}|${b.Name}`;
  return aKey.localeCompare(bKey);
}

function splitEventsByRange(events, weekStart) {
  return {
    early: events.filter((event) => event.StartDate <= addDays(weekStart, 2)),
    mid: events.filter((event) => event.StartDate >= addDays(weekStart, 3) && event.StartDate <= addDays(weekStart, 4)),
    late: events.filter((event) => event.StartDate >= addDays(weekStart, 5))
  };
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

function buildEventNote(event) {
  const dateText = humanDate(event.StartDate);
  const timeText = humanTime(event.StartTime);
  const sourceText = event.Source ? `${event.Source} is listing ` : '';
  const base = event.Notes ? event.Notes.replace(/\s+/g, ' ').trim() : 'Listed in the event calendar.';

  if (timeText) {
    return `${dateText} at ${timeText}. ${sourceText}${base.charAt(0).toUpperCase()}${base.slice(1)}`;
  }

  return `${dateText}. ${sourceText}${base.charAt(0).toUpperCase()}${base.slice(1)}`;
}

function toIssueItem(event) {
  return {
    name: event.Name,
    location: event.Location,
    link: event.Website,
    note: buildEventNote(event)
  };
}

function flattenSpecials(specialsBoard) {
  if (!specialsBoard || !Array.isArray(specialsBoard.sections)) {
    return [];
  }

  return specialsBoard.sections.flatMap((section) => section.items || []);
}

function buildIssue(events, previousIssues, specialsBoard, weekStart, weekEnd) {
  const existingIssue = previousIssues.find((issue) => issue.id === weekStart);
  const maxIssueNumber = previousIssues.reduce((max, issue) => Math.max(max, Number(issue.issueNumber) || 0), 0);
  const issueNumber = existingIssue ? existingIssue.issueNumber : maxIssueNumber + 1;
  const specialsItems = flattenSpecials(specialsBoard);
  const { early, mid, late } = splitEventsByRange(events, weekStart);

  return {
    id: weekStart,
    issueNumber,
    title: 'This Week in Beaufort County',
    publishDate: weekStart,
    subject: `Port Royal Sounder No. ${issueNumber}: this week's events and weekly specials`,
    preheader: `A full ${weekStart} to ${weekEnd} roundup, plus the weekly specials signals worth checking first.`,
    intro: `This issue is built from the live calendar plus the current Weekly Specials board. It includes everything currently on the calendar for the week, along with the strongest recurring specials and market signals we have compiled so far.`,
    sections: [
      {
        title: 'Monday Through Wednesday',
        items: early.map(toIssueItem)
      },
      {
        title: 'Thursday And Friday',
        items: mid.map(toIssueItem)
      },
      {
        title: 'Saturday And Sunday',
        items: late.map(toIssueItem)
      },
      {
        title: 'Weekly Specials Watch',
        items: specialsItems
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
  const specialsBoards = readJson(SPECIALS_PATH, []);
  const issue = buildIssue(events, issues, specialsBoards[0], start, end);
  const remainingIssues = issues.filter((entry) => entry.id !== issue.id);
  const nextIssues = [issue, ...remainingIssues];

  fs.writeFileSync(ISSUES_PATH, `${JSON.stringify(nextIssues, null, 2)}\n`);
  console.log(`Built newsletter issue ${issue.id} with ${events.length} events and ${issue.sections[3].items.length} specials.`);
}

main();
