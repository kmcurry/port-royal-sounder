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
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'upgrade-insecure-requests': '1'
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

function escapeRegExp(value) {
  return `${value || ''}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseHarrisTeeterSpecial(html, item) {
  const decoded = decodeHtml(html);
  const matcher = `${item.specialMatcher || ''}`.trim();

  if (matcher) {
    const pattern = new RegExp(`${escapeRegExp(matcher)}[\\s\\S]{0,500}?\\$([0-9]+(?:\\.[0-9]+)?)`, 'i');
    const blockMatch = decoded.match(pattern);
    if (blockMatch) {
      const snippet = blockMatch[0];
      const prices = [...snippet.matchAll(/\$([0-9]+(?:\.[0-9]+)?)/g)].map((match) => Number(match[1]));
      if (prices.length) {
        const lowest = Math.min(...prices);
        return `$${lowest.toFixed(2)}/lb`;
      }
    }
  }

  const genericMatches = [...decoded.matchAll(/\$([0-9]+(?:\.[0-9]+)?)/g)].map((match) => Number(match[1]));
  if (genericMatches.length) {
    const lowest = Math.min(...genericMatches);
    return `$${lowest.toFixed(2)}`;
  }

  return '';
}

function parseFoodLionSpecial(html, item) {
  const decoded = decodeHtml(html);
  const matcher = `${item.specialMatcher || ''}`.trim().toLowerCase();
  const hasSaleLanguage = /\b(mvp|sale|save|bonus buy|weekly special|hot sale)\b/i.test(decoded);

  if (!hasSaleLanguage) {
    return '';
  }

  if (matcher && !decoded.toLowerCase().includes(matcher)) {
    return '';
  }

  return item.unitPrice || item.price || '';
}

function parseWalmartSpecial(html, item) {
  const decoded = decodeHtml(html);
  const hasDealLanguage = /\b(rollback|reduced price|clearance|special buy|save)\b/i.test(decoded);

  if (!hasDealLanguage) {
    return '';
  }

  return item.unitPrice || item.price || '';
}

function parsePublixSpecial(html, item) {
  const decoded = decodeHtml(html);
  const matcher = `${item.specialMatcher || ''}`.trim().toLowerCase();
  const hasDealLanguage = /\b(bogo|weekly ad|save|special)\b/i.test(decoded);

  if (!hasDealLanguage) {
    return '';
  }

  if (matcher && !decoded.toLowerCase().includes(matcher)) {
    return '';
  }

  return item.unitPrice || item.price || '';
}

function parseSpecialForUrl(item, html, config) {
  if (config.sourceType === 'harris_teeter_query' || config.url.includes('harristeeter.com/q/')) {
    return parseHarrisTeeterSpecial(html, item);
  }

  if (config.sourceType === 'food_lion_product' || config.url.includes('foodlion.com')) {
    return parseFoodLionSpecial(html, item);
  }

  if (config.sourceType === 'walmart_product' || config.url.includes('walmart.com')) {
    return parseWalmartSpecial(html, item);
  }

  if (config.sourceType === 'publix_weekly_ad' || config.url.includes('publix.com')) {
    return parsePublixSpecial(html, item);
  }

  return '';
}

function stripLabelPrefixes(label) {
  return `${label || ''}`
    .replace(/^(Store Brand|Premium|Value|Branded)\s*\|\s*/i, '')
    .trim();
}

function buildHarrisTeeterQuery(item) {
  const base = stripLabelPrefixes(item.label)
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    url: `https://www.harristeeter.com/q/${encodeURIComponent(base)}`,
    sourceType: 'harris_teeter_query',
    matcher: item.specialMatcher || base,
    label: item.specialLabel || 'Weekly ad'
  };
}

function deriveSpecialConfig(item) {
  if (item.specialLink) {
    return {
      url: item.specialLink,
      sourceType: item.specialSourceType || '',
      matcher: item.specialMatcher || stripLabelPrefixes(item.label),
      label: item.specialLabel || 'Special'
    };
  }

  if (item.store === 'Harris Teeter') {
    return buildHarrisTeeterQuery(item);
  }

  if (item.store === 'Walmart' && item.link && item.link.includes('walmart.com')) {
    return {
      url: item.link,
      sourceType: 'walmart_product',
      matcher: stripLabelPrefixes(item.label),
      label: 'Special'
    };
  }

  if (item.store === 'Food Lion' && item.link && item.link.includes('foodlion.com')) {
    return {
      url: item.link,
      sourceType: 'food_lion_product',
      matcher: stripLabelPrefixes(item.label),
      label: 'Special'
    };
  }

  if (item.store === 'Publix') {
    return {
      url: 'https://www.publix.com/savings/weekly-ad',
      sourceType: 'publix_weekly_ad',
      matcher: stripLabelPrefixes(item.label),
      label: 'Weekly ad'
    };
  }

  return null;
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
    return updateSpecial({ ...item, priceStatus: item.priceStatus || 'manual' });
  }

  try {
    const html = await fetchText(item.link);
    const next = parsePricesForUrl(item.link, html);
    return updateSpecial({
      ...item,
      price: next.price || item.price,
      unitPrice: next.unitPrice || item.unitPrice,
      priceStatus: 'fresh'
    });
  } catch (error) {
    console.warn(`Price fetch failed for ${item.link}: ${error.message}`);
    return updateSpecial({
      ...item,
      priceStatus: /403/.test(error.message) ? 'blocked' : 'stale'
    });
  }
}

async function updateSpecial(item) {
  const config = deriveSpecialConfig(item);
  if (!config || !config.url) {
    return item;
  }

  try {
    const html = await fetchText(config.url);
    const specialPrice = parseSpecialForUrl(item, html, config);
    if (!specialPrice) {
      return {
        ...item,
        specialStatus: item.specialLink ? (item.specialStatus || 'configured') : 'none'
      };
    }

    return {
      ...item,
      specialLabel: config.label,
      specialLink: config.url,
      specialSourceType: config.sourceType,
      specialMatcher: config.matcher,
      specialPrice,
      specialStatus: 'fresh'
    };
  } catch (error) {
    console.warn(`Special fetch failed for ${config.url}: ${error.message}`);
    return {
      ...item,
      specialStatus: /403/.test(error.message) ? 'blocked' : 'stale'
    };
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
