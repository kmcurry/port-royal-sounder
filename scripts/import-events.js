#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EVENTS_PATH = path.join(ROOT, 'data', 'events.csv');
const SOURCES_PATH = path.join(ROOT, 'data', 'event-sources.csv');
const LOOKBACK_DAYS = 14;
const LOOKAHEAD_DAYS = 365;
const EXCLUDED_TEXT_PATTERNS = [
  /\bcanceled\b/i,
  /\bcancelled\b/i,
  /\bpostponed\b/i,
  /\bpostponement\b/i,
  /\bautomatically refunded\b/i
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
    .filter((row) => row.Status.trim().toLowerCase() === 'active')
    .map((row) => ({
      name: row.Name.trim(),
      sourceType: row['Source Type'].trim(),
      scope: row.Scope.trim(),
      eventsUrl: row['Events URL'].trim(),
      subscriptionUrl: row['Subscription URL'].trim(),
      fetchMethod: row['Fetch Method'].trim(),
      notes: row.Notes.trim()
    }));
}

function isFetchableSource(source) {
  if (source.fetchMethod === 'ics_import') {
    return Boolean(source.subscriptionUrl);
  }

  if (source.fetchMethod === 'html_scrape') {
    return Boolean(source.eventsUrl);
  }

  return false;
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

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function stripHtmlTags(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ');
}

function cleanHtmlText(value) {
  return decodeHtmlEntities(`${value || ''}`)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
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

function monthNumberFromLabel(label) {
  const map = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    apri: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12
  };
  return map[label.toLowerCase()] || 0;
}

function inferYear(monthNumber) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  return monthNumber < currentMonth - 1 ? currentYear + 1 : currentYear;
}

function parseMonthDayYearLabel(value) {
  const match = cleanHtmlText(value).match(/([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?/);
  if (!match) {
    return { startDate: '', endDate: '', label: cleanHtmlText(value) };
  }

  const monthNumber = monthNumberFromLabel(match[1]);
  if (!monthNumber) {
    return { startDate: '', endDate: '', label: cleanHtmlText(value) };
  }

  const year = Number(match[3] || inferYear(monthNumber));
  const month = String(monthNumber).padStart(2, '0');
  const day = String(Number(match[2])).padStart(2, '0');

  return {
    startDate: `${year}-${month}-${day}`,
    endDate: `${year}-${month}-${day}`,
    label: cleanHtmlText(value)
  };
}

function parseMonthDayCommaYearLabel(value) {
  const match = cleanHtmlText(value).match(/(\d{1,2})\s+([A-Za-z]+),\s*(\d{4})/);
  if (!match) {
    return { startDate: '', endDate: '', label: cleanHtmlText(value) };
  }

  const monthNumber = monthNumberFromLabel(match[2]);
  if (!monthNumber) {
    return { startDate: '', endDate: '', label: cleanHtmlText(value) };
  }

  const year = Number(match[3]);
  const month = String(monthNumber).padStart(2, '0');
  const day = String(Number(match[1])).padStart(2, '0');

  return {
    startDate: `${year}-${month}-${day}`,
    endDate: `${year}-${month}-${day}`,
    label: cleanHtmlText(value)
  };
}

function parseClockTimeLabel(value) {
  const match = cleanHtmlText(value).match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) {
    return '';
  }

  let hour = Number(match[1]);
  const minute = match[2];
  const meridiem = match[3].toLowerCase();
  if (meridiem === 'pm' && hour !== 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function parseLooseDateLabel(value) {
  const match = cleanHtmlText(value).match(/([A-Za-z]+)\s+(\d{1,2})(?:\s*-\s*(\d{1,2}))?/);
  if (!match) {
    return { startDate: '', endDate: '', label: cleanHtmlText(value) };
  }

  const monthNumber = monthNumberFromLabel(match[1]);
  if (!monthNumber) {
    return { startDate: '', endDate: '', label: cleanHtmlText(value) };
  }

  const year = inferYear(monthNumber);
  const startDay = String(Number(match[2])).padStart(2, '0');
  const endDay = String(Number(match[3] || match[2])).padStart(2, '0');
  const month = String(monthNumber).padStart(2, '0');

  return {
    startDate: `${year}-${month}-${startDay}`,
    endDate: `${year}-${month}-${endDay}`,
    label: cleanHtmlText(value)
  };
}

function htmlToLines(text) {
  const stripped = text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6)>/gi, '\n')
    .replace(/<[^>]+>/g, '\n');

  return stripped
    .split(/\r?\n/)
    .map(cleanHtmlText)
    .filter(Boolean);
}

function inferHtmlEventTag(source, title, subtitle) {
  const text = `${title} ${subtitle}`.toLowerCase();

  if (source.sourceType === 'music_events') {
    return 'Live Music';
  }

  if (/\bconcert\b|\bmusic\b|\bsoundtrack\b|\bjazz\b|\borchestra\b|\bsymphony\b|\bensemble\b|\bband\b/.test(text)) {
    return 'Live Music';
  }

  return 'Culture';
}

function parseUscbCenterForTheArtsEvents(text, source) {
  const lines = htmlToLines(text);
  const startIndex = lines.findIndex((line) => line.toLowerCase() === 'upcoming events');
  if (startIndex === -1) {
    return [];
  }

  const events = [];
  const section = lines.slice(startIndex + 1);
  const datePattern = /^[A-Za-z]+\s+\d{1,2}(?:\s*-\s*\d{1,2})?$/;

  for (let index = 0; index < section.length; index += 1) {
    const line = section[index];
    if (/^all shows$/i.test(line) || /^thank you/i.test(line)) {
      break;
    }
    if (!datePattern.test(line)) {
      continue;
    }

    const title = section[index + 1] || '';
    const subtitle = section[index + 2] || '';
    const parsedDate = parseLooseDateLabel(line);
    if (!parsedDate.startDate || !title) {
      continue;
    }

    events.push({
      Name: title,
      Tags: inferHtmlEventTag(source, title, subtitle),
      StartDate: parsedDate.startDate,
      EndDate: parsedDate.endDate,
      StartTime: '',
      EndTime: '',
      AllDay: parsedDate.startDate !== parsedDate.endDate ? 'yes' : '',
      Location: source.scope,
      Address: 'USCB Center for the Arts, 805 Carteret Street, Beaufort, SC 29902',
      Website: source.eventsUrl,
      Source: source.name,
      Notes: subtitle || source.notes || ''
    });
  }

  return events;
}

function parseMusicFarmEvents(text, source) {
  const events = [];
  const articlePattern = /<article class="event-card(?! event-ad)[^"]*[\s\S]*?<\/article>/gi;
  const blocks = text.match(articlePattern) || [];

  blocks.forEach((block) => {
    const titleMatch = block.match(/<div class="event-title">[\s\S]*?<a href="([^"]+)">([\s\S]*?)<\/a>/i);
    const dateMatch = block.match(/<div class="event-date">([\s\S]*?)<\/div>/i);
    const timesMatch = block.match(/<div class="event-times">([\s\S]*?)<\/div>/i);
    const presentedByMatch = block.match(/<div class="event-presented-by">([\s\S]*?)<\/div>/i);
    const supportingActsMatch = block.match(/<div class="event-supporting-acts">([\s\S]*?)<\/div>/i);

    const detailUrl = titleMatch ? cleanHtmlText(titleMatch[1]) : '';
    const title = titleMatch ? cleanHtmlText(stripHtmlTags(titleMatch[2])) : '';
    const parsedDate = parseMonthDayYearLabel(dateMatch ? stripHtmlTags(dateMatch[1]) : '');
    const timesLabel = cleanHtmlText(stripHtmlTags(timesMatch ? timesMatch[1] : ''));
    const showTimeMatch = timesLabel.match(/Show:\s*(\d{1,2}:\d{2}\s*(?:am|pm))/i);
    const doorsTimeMatch = timesLabel.match(/Doors:\s*(\d{1,2}:\d{2}\s*(?:am|pm))/i);
    const notes = [
      presentedByMatch ? cleanHtmlText(stripHtmlTags(presentedByMatch[1])) : '',
      supportingActsMatch ? cleanHtmlText(stripHtmlTags(supportingActsMatch[1])) : '',
      timesLabel
    ].filter(Boolean).join(' | ');

    if (!title || !parsedDate.startDate) {
      return;
    }

    events.push({
      Name: title,
      Tags: 'Live Music',
      StartDate: parsedDate.startDate,
      EndDate: parsedDate.endDate,
      StartTime: parseClockTimeLabel(showTimeMatch ? showTimeMatch[1] : (doorsTimeMatch ? doorsTimeMatch[1] : '')),
      EndTime: '',
      AllDay: '',
      Location: source.scope,
      Address: '32 Ann Street, Charleston, SC 29403',
      Website: detailUrl || source.eventsUrl,
      Source: source.name,
      Notes: notes || source.notes || ''
    });
  });

  return dedupeRows(events);
}

function mapCharlestonMusicHallTag(block) {
  const className = (block.match(/<article class="([^"]+)"/i) || [])[1] || '';
  const normalized = className.toLowerCase();

  if (/\btm_classifications-(rock|metal|nu-metal|folk|classical|symphonic|alternative-rock)\b/.test(normalized)) {
    return 'Live Music';
  }

  if (/\btm_classifications-charleston-jazz\b/.test(normalized)) {
    return 'Live Music';
  }

  if (/\btm_classifications-comedy\b/.test(normalized)) {
    return 'Comedy';
  }

  if (/\btm_classifications-lecture-seminar\b/.test(normalized)) {
    return 'Education';
  }

  if (/\btm_classifications-(arts-theatre|miscellaneous|spoleto-festival-usa)\b/.test(normalized)) {
    return 'Culture';
  }

  return 'Live Music';
}

function parseCharlestonMusicHallEvents(text, source) {
  const events = [];
  const articlePattern = /<article class="event-card(?! event-ad)[^"]*[\s\S]*?<\/article>/gi;
  const blocks = text.match(articlePattern) || [];

  blocks.forEach((block) => {
    const titleMatch = block.match(/<div class="event-title">[\s\S]*?<a href="([^"]+)">([\s\S]*?)<\/a>/i);
    const dateMatch = block.match(/<div class="event-date">([\s\S]*?)<\/div>/i);
    const timesMatch = block.match(/<div class="event-times">([\s\S]*?)<\/div>/i);
    const ticketMatch = block.match(/<div class="event-link">[\s\S]*?<a[^>]*href="([^"]+)"/i);

    const detailUrl = titleMatch ? cleanHtmlText(titleMatch[1]) : '';
    const title = titleMatch ? cleanHtmlText(stripHtmlTags(titleMatch[2])) : '';
    const parsedDate = parseMonthDayYearLabel(dateMatch ? stripHtmlTags(dateMatch[1]) : '');
    const timesLabel = cleanHtmlText(stripHtmlTags(timesMatch ? timesMatch[1] : ''));
    const showTimeMatch = timesLabel.match(/Show:\s*(\d{1,2}:\d{2}\s*(?:am|pm))/i);
    const doorsTimeMatch = timesLabel.match(/Doors:\s*(\d{1,2}:\d{2}\s*(?:am|pm))/i);
    const ticketUrl = ticketMatch ? cleanHtmlText(ticketMatch[1]) : '';
    const notes = [
      timesLabel,
      ticketUrl ? `Tickets: ${ticketUrl}` : ''
    ].filter(Boolean).join(' | ');

    if (!title || !parsedDate.startDate) {
      return;
    }

    events.push({
      Name: title,
      Tags: mapCharlestonMusicHallTag(block),
      StartDate: parsedDate.startDate,
      EndDate: parsedDate.endDate,
      StartTime: parseClockTimeLabel(showTimeMatch ? showTimeMatch[1] : (doorsTimeMatch ? doorsTimeMatch[1] : '')),
      EndTime: '',
      AllDay: '',
      Location: source.scope,
      Address: '37 John Street, Charleston, SC 29403',
      Website: detailUrl || source.eventsUrl,
      Source: source.name,
      Notes: notes || source.notes || ''
    });
  });

  return dedupeRows(events);
}

function parseWindjammerEvents(text, source) {
  const events = [];
  const blockPattern = /<div class="event-content[^"]*">[\s\S]*?<div class="defbtn">[\s\S]*?<\/div>[\s\S]*?<\/div>\s*<\/div>/gi;
  const blocks = text.match(blockPattern) || [];

  blocks.forEach((block) => {
    const dateMatch = block.match(/<div class="event-content-date">[\s\S]*?<p><b>\s*(\d{1,2})\s*<\/b>\s*([A-Za-z]+),\s*(\d{4})<\/p>/i);
    const titleMatch = block.match(/<h2><a href="([^"]+)">([\s\S]*?)<\/a><\/h2>/i);
    const timeMatch = block.match(/<ul>[\s\S]*?<li>[^<]*<\/li>\s*<li>([^<]+)<\/li>/i);
    const excerptMatch = block.match(/<p class="event-excerpt">([\s\S]*?)<\/p>/i);
    const ticketMatch = block.match(/<div class="defbtn">[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>Buy Tickets<\/a>/i);

    const title = titleMatch ? cleanHtmlText(stripHtmlTags(titleMatch[2])) : '';
    const detailUrl = titleMatch ? cleanHtmlText(titleMatch[1]) : '';
    const parsedDate = dateMatch
      ? parseMonthDayCommaYearLabel(`${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]}`)
      : { startDate: '', endDate: '' };
    const timeLabel = cleanHtmlText(timeMatch ? timeMatch[1] : '');
    const excerpt = cleanHtmlText(stripHtmlTags(excerptMatch ? excerptMatch[1] : ''));
    const ticketUrl = ticketMatch ? cleanHtmlText(ticketMatch[1]) : '';
    const notes = [
      timeLabel,
      excerpt,
      ticketUrl ? `Tickets: ${ticketUrl}` : ''
    ].filter(Boolean).join(' | ');

    if (!title || !parsedDate.startDate) {
      return;
    }

    events.push({
      Name: title,
      Tags: 'Live Music',
      StartDate: parsedDate.startDate,
      EndDate: parsedDate.endDate,
      StartTime: parseClockTimeLabel(timeLabel),
      EndTime: '',
      AllDay: '',
      Location: source.scope,
      Address: '1008 Ocean Boulevard, Isle of Palms, SC 29451',
      Website: detailUrl || source.eventsUrl,
      Source: source.name,
      Notes: notes || source.notes || ''
    });
  });

  return dedupeRows(events);
}

function parseHtmlEvents(source, text) {
  if (source.name === 'USCB Center for the Arts') {
    return parseUscbCenterForTheArtsEvents(text, source);
  }

  if (source.name === 'Music Farm') {
    return parseMusicFarmEvents(text, source);
  }

  if (source.name === 'Charleston Music Hall') {
    return parseCharlestonMusicHallEvents(text, source);
  }

  if (source.name === 'The Windjammer') {
    return parseWindjammerEvents(text, source);
  }

  return [];
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
  const haystack = `${row.Name || ''} ${row.Notes || ''}`;
  return !EXCLUDED_TEXT_PATTERNS.some((pattern) => pattern.test(haystack));
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
    music_events: 'Live Music',
    regional_events: 'Culture',
    official_calendar: 'Civic',
    organization_events: 'Culture'
  };

  return mapping[sourceType] || 'Culture';
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

function sanitizeImportedNotes(source, row) {
  const notes = normalizeSentence(row.Notes);
  if (!notes) {
    return '';
  }

  const isOfficialCalendar = source.sourceType === 'official_calendar';
  const isCivicEvent = row.Tags === 'Civic' || isCivicMeetingName(row.Name);

  if (isOfficialCalendar && isCivicEvent) {
    if (isNatureWalkDescription(notes)) {
      return '';
    }

    if (!isCivicDescription(notes) && notes.length > 140) {
      return '';
    }
  }

  return notes;
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
    Notes: sanitizeImportedNotes(source, {
      Name: name,
      Tags: mapEventType(source.sourceType, event),
      Notes: description
    })
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
  const fetchableSources = sources.filter(isFetchableSource);
  const existingRows = readCsv(EVENTS_PATH);
  const managedSources = new Set(fetchableSources.map((source) => source.name));

  const importedRows = [];
  const failures = [];
  const successfulSources = new Set();
  for (const source of fetchableSources) {
    try {
      const targetUrl = source.fetchMethod === 'html_scrape' ? source.eventsUrl : source.subscriptionUrl;
      const text = await fetchText(targetUrl);
      const parsedEvents = (
        source.fetchMethod === 'html_scrape'
          ? parseHtmlEvents(source, text)
          : parseIcal(text)
              .map((event) => buildEventRow(source, event))
              .filter(Boolean)
      )
        .filter(isWithinImportWindow)
        .filter((row) => shouldIncludeEvent(source, row));
      importedRows.push(...parsedEvents);
      successfulSources.add(source.name);
    } catch (error) {
      failures.push(`${source.name}: ${error.message}`);
    }
  }

  const preservedRows = existingRows.filter((row) => {
    const source = row.Source.trim();
    return !managedSources.has(source) || !successfulSources.has(source);
  });
  const mergedRows = sortRows(dedupeRows([...preservedRows, ...importedRows]));
  fs.writeFileSync(EVENTS_PATH, stringifyCsv(mergedRows, EVENT_HEADERS), 'utf8');
  console.log(`Imported ${importedRows.length} subscribed events from ${fetchableSources.length} source(s).`);
  if (failures.length > 0) {
    console.warn(`Skipped ${failures.length} source(s):`);
    failures.forEach((failure) => console.warn(`- ${failure}`));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
