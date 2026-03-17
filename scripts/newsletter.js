function sectionEmoji(title) {
  const normalized = String(title || '').toLowerCase();

  if (normalized.includes('monday') || normalized.includes('tuesday') || normalized.includes('wednesday')) return '🗓️';
  if (normalized.includes('thursday') || normalized.includes('friday')) return '📍';
  if (normalized.includes('saturday') || normalized.includes('sunday')) return '🌤️';
  if (normalized.includes('price watch')) return '📈';
  if (normalized.includes('special')) return '💸';
  if (normalized.includes('fresh find')) return '✨';
  if (normalized.includes('market')) return '🧺';
  if (normalized.includes('calendar')) return '🗓️';

  return '•';
}

function itemEmoji(item) {
  const text = `${item?.name || ''} ${item?.note || ''}`.toLowerCase();

  if (/\bboard\b|\bcommittee\b|\bcouncil\b|\breview board\b|\btransportation\b|\bpublic facilities\b|\bsolid waste\b|\bfinance\b|\badministration\b|\beconomic development\b/.test(text)) return '🏛️';
  if (/\bmusic\b|\bconcert\b|\bjazz\b|\bshow\b|\bband\b|\bsoundtrack\b/.test(text)) return '🎶';
  if (/\bmarket\b|\bfarmers\b|\bu-pick\b|\bproduce\b/.test(text)) return '🧺';
  if (/\bshrimp\b|\boyster\b|\bseafood\b|\bcrab\b/.test(text)) return '🦐';
  if (/\bbowling\b|\bhockey\b|\bghost pirates\b|\bgame\b|\bsports?\b/.test(text)) return '🏅';
  if (/\bbirding\b|\bwalk\b|\bpreserve\b|\bwetland\b|\bnature\b/.test(text)) return '🌿';
  if (/\bhistoric\b|\bsymposium\b|\bmuseum\b|\blecture\b|\blibrary\b|\barts?\b/.test(text)) return '🏛️';
  if (/\bfood\b|\bcafe\b|\bbakery\b|\bmeals?\b|\bkitchen\b/.test(text)) return '🍽️';

  return '📌';
}

function renderNewsletterSparkline(history) {
  if (!Array.isArray(history) || history.length < 2) {
    return '<span class="newsletter-sparkline newsletter-sparkline-placeholder" aria-hidden="true">▁▂▃▄▅</span>';
  }

  const values = history
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (values.length < 2) {
    return '<span class="newsletter-sparkline newsletter-sparkline-placeholder" aria-hidden="true">▁▂▃▄▅</span>';
  }

  const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const spark = values
    .map((value) => blocks[Math.max(0, Math.min(blocks.length - 1, Math.round(((value - min) / spread) * (blocks.length - 1))))])
    .join('');

  return `<span class="newsletter-sparkline" aria-label="Price trend">${spark}</span>`;
}

function slugifySectionTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function shouldShowTopNav(section) {
  const normalized = String(section?.title || '').toLowerCase();
  return (
    normalized.includes('monday') ||
    normalized.includes('thursday') ||
    normalized.includes('saturday') ||
    normalized.includes('weekly special') ||
    normalized.includes('price watch')
  );
}

function navLabel(title) {
  const normalized = String(title || '').toLowerCase();
  if (normalized.includes('monday') || normalized.includes('thursday') || normalized.includes('saturday')) {
    return 'Events';
  }
  if (normalized.includes('weekly special')) {
    return 'Weekly Specials';
  }
  if (normalized.includes('price watch')) {
    return 'Price Watch';
  }
  return title;
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
    if (/\bbirding\b|\bwalk\b|\bpreserve\b|\bwetland\b|\bnature\b/.test(text)) return ['Nature'];
    if (/\bhistoric\b|\bsymposium\b|\bmuseum\b|\blecture\b|\blibrary\b|\barts?\b/.test(text)) return ['Culture'];
    return ['Other'];
  }

  if (group === 'Weekly Specials') {
    if (/\bmarket\b|\bfarmers\b|\bproduce\b/.test(text)) return ['Markets'];
    if (/\btruck\b|\bpop-up\b|\bpop up\b/.test(text)) return ['Food Trucks'];
    if (/\bshrimp\b|\boyster\b|\bseafood\b|\bcrab\b/.test(text)) return ['Seafood'];
    if (/\bmusic\b|\bstreet music\b|\bbeer-garden\b|\bbeer garden\b/.test(text)) return ['Live Music'];
    if (/\bkitchen\b|\bcafe\b|\bbakery\b|\bmeals?\b|\bdeli\b|\bbutcher\b/.test(text)) return ['Prepared Foods'];
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
      ${entries.map((section) => `
        <button class="newsletter-issue-pill${navLabel(section.title) === activeGroup ? ' is-active' : ''}" type="button" data-newsletter-group="${navLabel(section.title)}" aria-pressed="${navLabel(section.title) === activeGroup ? 'true' : 'false'}">
          ${sectionEmoji(section.title)} ${navLabel(section.title)}
        </button>
      `).join('')}
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
        All ${activeGroup}
      </button>
      ${tags.map((tag) => `
        <button class="newsletter-issue-subpill${tag === activeTag ? ' is-active' : ''}" type="button" data-newsletter-tag="${tag}" aria-pressed="${tag === activeTag ? 'true' : 'false'}">
          ${tagEmoji(tag)} ${tag}
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

function renderIssueItem(item) {
  const emoji = itemEmoji(item);
  const title = item.link
    ? `<a href="${item.link}" target="_blank" rel="noreferrer noopener">${emoji} ${item.name}</a>`
    : `${emoji} ${item.name}`;
  const sparkline = item.name && item.name.includes('—') ? renderNewsletterSparkline(item.history) : '';

  const location = item.location ? `<span class="newsletter-issue-location">${item.location}</span>` : '';

  return `
    <article class="newsletter-issue-item">
      <h3 class="newsletter-issue-item-title">${title} ${sparkline}</h3>
      ${location}
      <p>${item.note}</p>
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

  return `
    <section class="newsletter-issue-section" id="newsletter-section-${slugifySectionTitle(section.title)}" data-newsletter-group="${filter}" data-newsletter-section="${slugifySectionTitle(section.title)}">
      <h2 class="section-title">${sectionEmoji(section.title)} ${section.title}</h2>
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
        <h2 class="section-title" id="latest-issue-title">No. ${issue.issueNumber}: ${issue.title}</h2>
        <p class="newsletter-issue-date">${formatIssueDate(issue.publishDate)}</p>
        <p class="newsletter-copy">${issue.preheader}</p>
      </div>
      <div class="newsletter-issue-meta">
        <p><strong>Subject:</strong> ${issue.subject}</p>
      </div>
      <p class="newsletter-issue-intro">${issue.intro}</p>
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
