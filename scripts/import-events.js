#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EVENTS_PATH = path.join(ROOT, 'data', 'events.csv');
const SOURCES_PATH = path.join(ROOT, 'data', 'event-sources.csv');
const LOOKBACK_DAYS = 14;
const LOOKAHEAD_DAYS = 365;
const EXCLUDED_NAME_PATTERNS = [
  /\bcanceled\b/i
];

const EVENT_HEADERS = [
  'Name',
  'Tags',
  'StartDate',
  'EndDate',
  'StartTime',
  'EndTime',
  'AllDay',
  'Location',
  'Address',
  'Website',
  'Source',
  'Notes'
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

function stringifyCsv(rows, headers) {
  const escape = (value) => {
    const stringValue = `${value ?? ''}`;
    if (/[",\n\r]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))
  ];

  return `${lines.join('\n')}\n`;
}

function readCsv(filePath) {
  return parseCsv(fs.readFileSync(filePath, 'utf8'));
}

function readSources() {
  return readCsv(SOURCES_PATH)
    .filter((row) => row.Status.trim().toLowerCase() === 'active' && row['Fetch Method'].trim() === 'ics_import')
    .map((row) => ({
      name: row.Name.trim(),
      sourceType: row['Source Type'].trim(),
      scope: row.Scope.trim(),
      eventsUrl: row['Events URL'].trim(),
      subscriptionUrl: row['Subscription URL'].trim()
    }));
}

async function fetchText(url) {
  const normalizedUrl = url.replace(/^webcal:\/\//, 'https://');
  const response = await fetch(normalizedUrl, {
    headers: {
      'user-agent': 'PortRoyalSounderEventsImporter/1.0 (+https://portroyalsounder.com)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${normalizedUrl}: ${response.status}`);
  }

  return response.text();
}

function unfoldIcalLines(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const unfolded = [];

  for (const line of lines) {
    if (!unfolded.length) {
      unfolded.push(line);
      continue;
    }

    if (line.startsWith(' ') || line.startsWith('\t')) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  return unfolded.filter(Boolean);
}

function parseIcal(text) {
  const events = [];
  const lines = unfoldIcalLines(text);
  let current = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      if (current) {
        events.push(current);
      }
      current = null;
      continue;
    }

    if (!current || !line.includes(':')) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    const key = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1);
    current[key] = current[key] || [];
    current[key].push(value);
  }

  return events;
}

function getFirstValue(event, prefix) {
  const key = Object.keys(event).find((candidate) => candidate === prefix || candidate.startsWith(`${prefix};`));
  return key ? event[key][0] : '';
}

function getFirstKey(event, prefix) {
  return Object.keys(event).find((candidate) => candidate === prefix || candidate.startsWith(`${prefix};`)) || '';
}

function cleanIcalText(value) {
  return `${value || ''}`
    .replace(/\\[nN]/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDateTime(key, value) {
  if (!key || !value) {
    return { date: '', time: '', allDay: false };
  }

  if (key.includes('VALUE=DATE')) {
    const isoDate = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
    return { date: isoDate, time: '', allDay: true };
  }

  const normalized = value.endsWith('Z') ? value.slice(0, -1) : value;
  const isoDate = `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
  const time = `${normalized.slice(9, 11)}:${normalized.slice(11, 13)}`;
  return { date: isoDate, time, allDay: false };
}

function subtractOneDay(isoDate) {
  const value = new Date(`${isoDate}T12:00:00`);
  value.setDate(value.getDate() - 1);
  return value.toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const value = new Date(`${isoDate}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isWithinImportWindow(row) {
  if (!row.StartDate) {
    return false;
  }

  const minDate = addDays(todayIso(), -LOOKBACK_DAYS);
  const maxDate = addDays(todayIso(), LOOKAHEAD_DAYS);
  const effectiveEnd = row.EndDate || row.StartDate;

  return effectiveEnd >= minDate && row.StartDate <= maxDate;
}

function shouldIncludeEvent(source, row) {
  return !EXCLUDED_NAME_PATTERNS.some((pattern) => pattern.test(row.Name));
}

function mapEventType(sourceType, event) {
  const categoryValue = cleanIcalText(getFirstValue(event, 'CATEGORIES'));
  const category = categoryValue.split(',').map((part) => part.trim()).find(Boolean);
  if (category) {
    return category.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  const mapping = {
    market_events: 'Market',
    education_events: 'Education',
    library_events: 'Education',
    regional_events: 'Events',
    official_calendar: 'Civic',
    organization_events: 'Events'
  };

  return mapping[sourceType] || 'Events';
}

function deriveLocation(scope, rawLocation) {
  const cleaned = cleanIcalText(rawLocation);
  if (!cleaned) {
    return scope;
  }

  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return parts.slice(-2).join(', ');
    }
  }

  return scope || cleaned;
}

function buildEventRow(source, event) {
  const name = cleanIcalText(getFirstValue(event, 'SUMMARY'));
  if (!name) {
    return null;
  }

  const dtStart = parseDateTime(getFirstKey(event, 'DTSTART'), getFirstValue(event, 'DTSTART'));
  const dtEnd = parseDateTime(getFirstKey(event, 'DTEND'), getFirstValue(event, 'DTEND'));
  const location = getFirstValue(event, 'LOCATION');
  const description = cleanIcalText(getFirstValue(event, 'DESCRIPTION'));
  const url = cleanIcalText(getFirstValue(event, 'URL')) || source.eventsUrl;

  return {
    Name: name,
    Tags: mapEventType(source.sourceType, event),
    StartDate: dtStart.date,
    EndDate: dtStart.allDay && dtEnd.date ? subtractOneDay(dtEnd.date) : (dtEnd.date || dtStart.date),
    StartTime: dtStart.time,
    EndTime: dtEnd.allDay ? '' : dtEnd.time,
    AllDay: dtStart.allDay ? 'yes' : '',
    Location: deriveLocation(source.scope, location),
    Address: cleanIcalText(location),
    Website: url,
    Source: source.name,
    Notes: description || source.notes || ''
  };
}

function dedupeRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = [row.Source, row.Name, row.StartDate, row.StartTime].join('||');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function sortRows(rows) {
  return [...rows].sort((left, right) => {
    const leftKey = [left.StartDate || '9999-12-31', left.StartTime || '23:59', left.Name.toLowerCase(), left.Source.toLowerCase()];
    const rightKey = [right.StartDate || '9999-12-31', right.StartTime || '23:59', right.Name.toLowerCase(), right.Source.toLowerCase()];
    return leftKey.join('||').localeCompare(rightKey.join('||'));
  });
}

async function main() {
  const sources = readSources();
  const existingRows = readCsv(EVENTS_PATH);
  const managedSources = new Set(sources.map((source) => source.name));
  const preservedRows = existingRows.filter((row) => !managedSources.has(row.Source.trim()));

  const importedRows = [];
  const failures = [];
  for (const source of sources) {
    try {
      const text = await fetchText(source.subscriptionUrl);
      const parsedEvents = parseIcal(text)
        .map((event) => buildEventRow(source, event))
        .filter(Boolean)
        .filter(isWithinImportWindow)
        .filter((row) => shouldIncludeEvent(source, row));
      importedRows.push(...parsedEvents);
    } catch (error) {
      failures.push(`${source.name}: ${error.message}`);
    }
  }

  const mergedRows = sortRows(dedupeRows([...preservedRows, ...importedRows]));
  fs.writeFileSync(EVENTS_PATH, stringifyCsv(mergedRows, EVENT_HEADERS), 'utf8');
  console.log(`Imported ${importedRows.length} subscribed events from ${sources.length} source(s).`);
  if (failures.length > 0) {
    console.warn(`Skipped ${failures.length} source(s):`);
    failures.forEach((failure) => console.warn(`- ${failure}`));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
