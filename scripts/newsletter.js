function sectionEmoji(title) {
  const normalized = String(title || '').toLowerCase();

  if (normalized.includes('price watch')) return '📈';
  if (normalized.includes('special')) return '💸';
  if (normalized.includes('market')) return '🧺';

  return '🗓️';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function normalizeHttpUrl(value) {
  if (!value) {
    return '';
  }

  try {
    const url = new URL(String(value), window.location.href);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch (error) {
    return '';
  }
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
    'Grains & Mill Goods': '🌾',
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
      'Grains & Mill Goods': '🌾',
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
  if (/\brice\b/.test(text)) return '🌾';
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

function normalizeNumericHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function renderNewsletterSparkline(history) {
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

  return `
    <svg class="newsletter-sparkline" viewBox="0 0 ${width} ${height}" aria-label="Price trend" focusable="false">
      <polyline points="${points}" />
    </svg>
  `;
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
    'Grains & Mill Goods': '🌾',
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

function getGroupSections(sections, activeGroup) {
  return (sections || []).filter((section) => (
    activeGroup === 'all' || navLabel(section.title) === activeGroup
  ));
}

function getGroupTags(sections, activeGroup) {
  if (activeGroup === 'all') {
    return [];
  }

  const seen = new Set();
  const tags = [];

  for (const section of getGroupSections(sections, activeGroup)) {
    for (const item of section.items || []) {
      for (const tag of inferNewsletterTags(item, activeGroup)) {
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

function getTopNavEntries(sections) {
  const entries = [];
  const seen = new Set();

  for (const section of sections || []) {
    if (!shouldShowTopNav(section)) {
      continue;
    }

    const label = navLabel(section.title);
    if (seen.has(label)) {
      continue;
    }

    seen.add(label);
    entries.push(section);
  }

  return entries;
}

function renderIssueTopNav(sections, activeGroup) {
  const entries = getTopNavEntries(sections);

  if (!entries.length) {
    return '';
  }

  return `
    <nav class="newsletter-issue-nav" aria-label="Issue sections">
      <button class="newsletter-issue-pill${activeGroup === 'all' ? ' is-active' : ''}" type="button" data-newsletter-group="all" aria-pressed="${activeGroup === 'all' ? 'true' : 'false'}">
        ✨ All
      </button>
      ${entries.map((section) => {
        const label = navLabel(section.title);
        const isActive = label === activeGroup;
        return `
          <button class="newsletter-issue-pill${isActive ? ' is-active' : ''}" type="button" data-newsletter-group="${escapeHtml(label)}" aria-pressed="${isActive ? 'true' : 'false'}">
            ${sectionEmoji(section.title)} ${escapeHtml(label)}
          </button>
        `;
      }).join('')}
    </nav>
  `;
}

function renderIssueSubNav(sections, activeGroup, activeTag) {
  const tags = getGroupTags(sections, activeGroup);

  if (!tags.length) {
    return '';
  }

  return `
    <nav class="newsletter-issue-subnav" aria-label="Issue subsections">
      <button class="newsletter-issue-subpill${activeTag === 'all' ? ' is-active' : ''}" type="button" data-newsletter-tag="all" aria-pressed="${activeTag === 'all' ? 'true' : 'false'}">
        All ${escapeHtml(activeGroup)}
      </button>
      ${tags.map((tag) => `
        <button class="newsletter-issue-subpill${tag === activeTag ? ' is-active' : ''}" type="button" data-newsletter-tag="${escapeHtml(tag)}" aria-pressed="${tag === activeTag ? 'true' : 'false'}">
          ${tagEmoji(tag)} ${escapeHtml(tag)}
        </button>
      `).join('')}
    </nav>
  `;
}

function formatIssueDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function addDaysToIso(value, days) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatIssueDateRange(startValue) {
  const endValue = addDaysToIso(startValue, 6);
  return `Week of ${formatIssueDate(startValue)} to ${formatIssueDate(endValue)}`;
}

function renderIssueItem(item) {
  const emoji = itemEmoji(item);
  const link = normalizeHttpUrl(item?.link);
  const name = escapeHtml(item?.name);
  const title = link
    ? `<a href="${escapeHtml(link)}" target="_blank" rel="noreferrer noopener">${emoji} ${name}</a>`
    : `${emoji} ${name}`;
  const sparkline = item?.name && item.name.includes('—') ? renderNewsletterSparkline(item.history) : '';
  const priceHighlight = item?.name && item.name.includes('—') ? extractPriceHighlight(item.note) : '';
  const priceDelta = item?.name && item.name.includes('—') ? describePriceDelta(item.history) : '';

  const location = item?.location ? `<span class="newsletter-issue-location">${escapeHtml(item.location)}</span>` : '';

  return `
    <article class="newsletter-issue-item">
      <h3 class="newsletter-issue-item-title">${title} ${sparkline}</h3>
      ${location}
      ${priceHighlight ? `<div class="newsletter-price-highlight">${escapeHtml(priceHighlight)}</div>` : ''}
      ${priceDelta ? `<div class="newsletter-price-delta">${escapeHtml(priceDelta)}</div>` : ''}
      <p>${escapeHtml(item?.note)}</p>
    </article>
  `;
}

function renderIssueSection(section, activeGroup = 'all', activeTag = 'all') {
  const filter = navLabel(section.title);
  const items = (section.items || []).filter((item) => {
    if (activeGroup !== 'all' && filter !== activeGroup) {
      return false;
    }

    if (activeTag === 'all') {
      return true;
    }

    return inferNewsletterTags(item, filter).includes(activeTag);
  });

  if (!items.length) {
    return '';
  }

  const slug = slugifySectionTitle(section.title);

  return `
    <section class="newsletter-issue-section" id="newsletter-section-${slug}" data-newsletter-group="${escapeHtml(filter)}" data-newsletter-section="${slug}">
      <h2 class="section-title">${sectionEmoji(section.title)} ${escapeHtml(section.title)}</h2>
      <div class="newsletter-issue-items">
        ${items.map(renderIssueItem).join('')}
      </div>
    </section>
  `;
}

function wireIssueFilters(mount, issue) {
  const render = (group = 'all', tag = 'all') => {
    mount.innerHTML = renderIssue(issue, group, tag);
    wireIssueFilters(mount, issue);
  };

  mount.querySelectorAll('[data-newsletter-group]').forEach((pill) => {
    pill.addEventListener('click', () => {
      render(pill.dataset.newsletterGroup || 'all', 'all');
    });
  });

  mount.querySelectorAll('[data-newsletter-tag]').forEach((pill) => {
    pill.addEventListener('click', () => {
      const nextTag = pill.dataset.newsletterTag || 'all';
      const activeGroup = mount.querySelector('[data-newsletter-group].is-active')?.dataset.newsletterGroup || 'all';
      render(activeGroup, nextTag);
    });
  });
}

function renderIssue(issue, activeGroup = 'all', activeTag = 'all') {
  const filteredSections = (issue.sections || [])
    .map((section) => renderIssueSection(section, activeGroup, activeTag))
    .filter(Boolean);

  return `
    <section class="newsletter-card newsletter-issue-card" aria-labelledby="latest-issue-title">
      <div class="newsletter-issue-header">
        <p class="newsletter-issue-kicker">Latest Draft Issue</p>
        <h2 class="section-title" id="latest-issue-title">No. ${escapeHtml(issue.issueNumber)}: ${escapeHtml(issue.title)}</h2>
        <p class="newsletter-issue-date">${escapeHtml(formatIssueDateRange(issue.publishDate))}</p>
        <p class="newsletter-copy">${escapeHtml(issue.preheader)}</p>
      </div>
      <div class="newsletter-issue-meta">
        <p><strong>Subject:</strong> ${escapeHtml(issue.subject)}</p>
      </div>
      <p class="newsletter-issue-intro">${escapeHtml(issue.intro)}</p>
      ${renderIssueTopNav(issue.sections, activeGroup)}
      ${renderIssueSubNav(issue.sections, activeGroup, activeTag)}
      <div class="newsletter-issue-sections">
        ${filteredSections.join('')}
      </div>
    </section>
  `;
}

async function initNewsletterPage({ mountId, dataPath }) {
  const mount = document.getElementById(mountId);
  if (!mount) {
    return;
  }

  try {
    const response = await fetch(dataPath, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Newsletter load failed: ${response.status}`);
    }

    const issues = await response.json();
    if (!Array.isArray(issues) || issues.length === 0) {
      mount.innerHTML = '<p class="calendar-empty">No newsletter draft has been compiled yet.</p>';
      return;
    }

    mount.innerHTML = renderIssue(issues[0]);
    wireIssueFilters(mount, issues[0]);
  } catch (error) {
    console.error(error);
    mount.innerHTML = '<p class="calendar-empty">Newsletter draft content could not be loaded right now.</p>';
  }
}

window.initNewsletterPage = initNewsletterPage;
