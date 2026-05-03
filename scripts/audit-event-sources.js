#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ACTIVITIES_PATH = path.join(ROOT, "data", "activities.csv");
const EVENTS_PATH = path.join(ROOT, "data", "events.csv");
const SOURCES_PATH = path.join(ROOT, "data", "event-sources.csv");
const TARGET_TAGS = new Set(["live music", "performing arts center"]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...records] = rows;
  return records.map((record) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = record[index] ?? "";
    });
    return entry;
  });
}

function readCsv(filePath) {
  return parseCsv(fs.readFileSync(filePath, "utf8"));
}

function normalizeMatchKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseSourceList(value) {
  return String(value || "")
    .split(/[|;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isTrackedActivity(row) {
  const values = [row.Type, row.Tags]
    .join(",")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return values.some((value) => TARGET_TAGS.has(value));
}

function getActivityKeys(activity) {
  const keys = new Set();
  [activity.Name, activity["Event Source"], activity["Event Source Match"]]
    .flatMap(parseSourceList)
    .forEach((value) => {
      const normalized = normalizeMatchKey(value);
      if (normalized) {
        keys.add(normalized);
      }
    });
  return keys;
}

function findSourcesForActivity(activity, sources) {
  const keys = getActivityKeys(activity);
  return sources.filter((source) => keys.has(normalizeMatchKey(source.Name)));
}

function findUpcomingEventsForActivity(activity, sources, events) {
  const today = todayIso();
  const keys = getActivityKeys(activity);
  const sourceKeys = new Set(sources.map((source) => normalizeMatchKey(source.Name)));
  const activityName = normalizeMatchKey(activity.Name);

  return events
    .filter((event) => {
      const endDate = event.EndDate || event.StartDate;
      if (!event.StartDate || endDate < today) {
        return false;
      }

      const eventSource = normalizeMatchKey(event.Source);
      const eventName = normalizeMatchKey(event.Name);

      return (
        sourceKeys.has(eventSource) ||
        keys.has(eventSource) ||
        keys.has(eventName) ||
        eventSource === activityName ||
        eventName === activityName
      );
    })
    .sort((left, right) => {
      const leftKey = [left.StartDate || "9999-12-31", left.StartTime || "99:99", left.Name || ""].join("|");
      const rightKey = [right.StartDate || "9999-12-31", right.StartTime || "99:99", right.Name || ""].join("|");
      return leftKey.localeCompare(rightKey);
    });
}

function summarizeStatus(sources, events) {
  if (events.length > 0) {
    return "linked";
  }

  const activeSources = sources.filter((source) => source.Status.trim().toLowerCase() === "active");
  if (activeSources.length > 0) {
    return "configured-no-events";
  }

  if (sources.length > 0) {
    return "source-needs-import";
  }

  return "missing-source";
}

function main() {
  const activities = readCsv(ACTIVITIES_PATH).filter(isTrackedActivity);
  const sources = readCsv(SOURCES_PATH).filter((source) => source["Source Type"].trim() === "music_events");
  const events = readCsv(EVENTS_PATH).filter((event) => event.Tags.trim() === "Live Music");

  const report = activities.map((activity) => {
    const matchedSources = findSourcesForActivity(activity, sources);
    const upcomingEvents = findUpcomingEventsForActivity(activity, matchedSources, events);
    return {
      activity,
      matchedSources,
      upcomingEvents,
      status: summarizeStatus(matchedSources, upcomingEvents),
    };
  });

  const counts = report.reduce((summary, item) => {
    summary[item.status] = (summary[item.status] || 0) + 1;
    return summary;
  }, {});

  console.log("Live music source audit\n");
  ["linked", "configured-no-events", "source-needs-import", "missing-source"].forEach((status) => {
    console.log(`${status}: ${counts[status] || 0}`);
  });

  console.log("\nDetails\n");
  report.forEach((item) => {
    const sourceSummary = item.matchedSources.length
      ? item.matchedSources.map((source) => `${source.Name} [${source.Status}]`).join("; ")
      : "none";
    const nextEvent = item.upcomingEvents[0]
      ? `${item.upcomingEvents[0].StartDate}${item.upcomingEvents[0].StartTime ? ` ${item.upcomingEvents[0].StartTime}` : ""} - ${item.upcomingEvents[0].Name}`
      : "none";

    console.log(`- ${item.activity.Name}`);
    console.log(`  status: ${item.status}`);
    console.log(`  sources: ${sourceSummary}`);
    console.log(`  next event: ${nextEvent}`);
    if (item.status === "missing-source" && item.activity.Website) {
      console.log(`  website: ${item.activity.Website}`);
    }
  });
}

main();
