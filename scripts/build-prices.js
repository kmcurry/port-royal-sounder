#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PRICES_PATH = path.join(ROOT, 'data', 'prices.json');
const TIME_ZONE = 'America/New_York';
const MAX_HISTORY_POINTS = 30;

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function getTodayIso() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'PortRoyalSounderPriceBuilder/1.0 (+https://portroyalsounder.com)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

function decodeHtml(text) {
  return `${text || ''}`
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseWalmartPrices(html) {
  const currentPriceMatch = html.match(/itemprop="price"[^>]*>\$?([0-9]+(?:\.[0-9]+)?)/i);
  const heroUnitPriceMatch = html.match(/data-seo-id="hero-unit-price"[^>]*>\$?([0-9]+(?:\.[0-9]+)?)\/lb/i);
  const finalCostByWeightMatch = html.match(/data-testid="unit-price-string"[^>]*>.*?<span>\$?([0-9]+(?:\.[0-9]+)?)\/lb<\/span>.*?<span>Final cost by weight<\/span>/i);
  const centsPerOunceMatch = html.match(/([0-9]+(?:\.[0-9]+)?)¢\/oz/i);

  const currentPrice = currentPriceMatch ? `$${currentPriceMatch[1]}` : '';

  if (finalCostByWeightMatch) {
    return {
      price: `$${finalCostByWeightMatch[1]}/lb`,
      unitPrice: `$${finalCostByWeightMatch[1]}/lb`
    };
  }

  if (heroUnitPriceMatch) {
    return {
      price: `$${heroUnitPriceMatch[1]}/lb`,
      unitPrice: `$${heroUnitPriceMatch[1]}/lb`
    };
  }

  if (centsPerOunceMatch) {
    return {
      price: currentPrice,
      unitPrice: `${centsPerOunceMatch[1]}¢/oz`
    };
  }

  return {
    price: currentPrice,
    unitPrice: ''
  };
}

function parseFoodLionPrices(html) {
  const decoded = decodeHtml(html);
  const unitPriceMatch = decoded.match(/\$([0-9]+(?:\.[0-9]+)?)\/lb/i);
  const centsPerUnitMatch = decoded.match(/([0-9]+(?:\.[0-9]+)?)¢\/(?:oz|fl oz|each)/i);
  const priceCandidates = [...decoded.matchAll(/\$([0-9]+(?:\.[0-9]+)?)/g)].map((match) => match[1]);
  const price = priceCandidates.length ? `$${priceCandidates[0]}` : '';

  if (unitPriceMatch) {
    return {
      price: `$${unitPriceMatch[1]}/lb`,
      unitPrice: `$${unitPriceMatch[1]}/lb`
    };
  }

  if (centsPerUnitMatch) {
    return {
      price,
      unitPrice: `${centsPerUnitMatch[1]}¢/${decoded.includes('fl oz') ? 'fl oz' : decoded.includes('each') ? 'each' : 'oz'}`
    };
  }

  return { price, unitPrice: '' };
}

function parseHarrisTeeterPrices(html) {
  const decoded = decodeHtml(html);
  const unitPriceMatch = decoded.match(/\$([0-9]+(?:\.[0-9]+)?)\/lb/i);
  const centsPerUnitMatch = decoded.match(/([0-9]+(?:\.[0-9]+)?)¢\/(?:oz|fl oz|each)/i);
  const priceCandidates = [...decoded.matchAll(/\$([0-9]+(?:\.[0-9]+)?)/g)].map((match) => match[1]);
  const price = priceCandidates.length ? `$${priceCandidates[0]}` : '';

  if (unitPriceMatch) {
    return {
      price: `$${unitPriceMatch[1]}/lb`,
      unitPrice: `$${unitPriceMatch[1]}/lb`
    };
  }

  if (centsPerUnitMatch) {
    return {
      price,
      unitPrice: `${centsPerUnitMatch[1]}¢/${decoded.includes('fl oz') ? 'fl oz' : decoded.includes('each') ? 'each' : 'oz'}`
    };
  }

  return { price, unitPrice: '' };
}

function parsePricesForUrl(url, html) {
  if (url.includes('walmart.com')) {
    return parseWalmartPrices(html);
  }

  if (url.includes('foodlion.com')) {
    return parseFoodLionPrices(html);
  }

  if (url.includes('harristeeter.com')) {
    return parseHarrisTeeterPrices(html);
  }

  return { price: '', unitPrice: '' };
}

function parseComparisonValue(item) {
  const source = `${item.unitPrice || item.price || ''}`.trim().toLowerCase();
  const centsPerOunceMatch = source.match(/([0-9]+(?:\.[0-9]+)?)\s*¢\/oz/);
  if (centsPerOunceMatch) {
    return Number(((Number(centsPerOunceMatch[1]) * 16) / 100).toFixed(2));
  }

  const dollarsPerPoundMatch = source.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)\s*\/lb/);
  if (dollarsPerPoundMatch) {
    return Number(dollarsPerPoundMatch[1]);
  }

  const centsPerEachMatch = source.match(/([0-9]+(?:\.[0-9]+)?)\s*¢\/each/);
  if (centsPerEachMatch) {
    return Number((Number(centsPerEachMatch[1]) / 100).toFixed(2));
  }

  const centsPerFluidOunceMatch = source.match(/([0-9]+(?:\.[0-9]+)?)\s*¢\/fl oz/);
  if (centsPerFluidOunceMatch) {
    return Number(((Number(centsPerFluidOunceMatch[1]) * 128) / 100).toFixed(2));
  }

  const unitMatch = source.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)/);
  return unitMatch ? Number(unitMatch[1]) : null;
}

function withUpdatedHistory(item, todayIso) {
  const comparisonValue = parseComparisonValue(item);
  if (!Number.isFinite(comparisonValue)) {
    return item;
  }

  const history = Array.isArray(item.history) ? item.history.filter((value) => Number.isFinite(Number(value))).map(Number) : [];

  if (item.historyDate === todayIso && history.length > 0) {
    history[history.length - 1] = comparisonValue;
  } else {
    history.push(comparisonValue);
  }

  return {
    ...item,
    history: history.slice(-MAX_HISTORY_POINTS),
    historyDate: todayIso
  };
}

async function updateItem(item) {
  if (!item.link) {
    return item;
  }

  try {
    const html = await fetchText(item.link);
    const next = parsePricesForUrl(item.link, html);
    return {
      ...item,
      price: next.price || item.price,
      unitPrice: next.unitPrice || item.unitPrice
    };
  } catch (error) {
    console.warn(`Price fetch failed for ${item.link}: ${error.message}`);
    return item;
  }
}

async function main() {
  const boards = readJson(PRICES_PATH, []);
  if (!Array.isArray(boards) || boards.length === 0) {
    throw new Error('No prices board found.');
  }

  const todayIso = getTodayIso();
  const [currentBoard, ...rest] = boards;
  const updatedSections = [];

  for (const section of currentBoard.sections || []) {
    const items = [];
    for (const item of section.items || []) {
      const updatedItem = await updateItem(item);
      items.push(withUpdatedHistory(updatedItem, todayIso));
    }

    updatedSections.push({
      ...section,
      items
    });
  }

  const nextBoard = {
    ...currentBoard,
    id: todayIso,
    publishDate: todayIso,
    sections: updatedSections
  };

  writeJson(PRICES_PATH, [nextBoard, ...rest]);
  console.log(`Built prices board for ${todayIso}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
