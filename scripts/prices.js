function formatPricesDate(value) {
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

const PRICE_FILTER_ICON_MAP = {
  eggs: '🥚',
  milk: '🥛',
  bread: '🍞',
  butter: '🧈',
  chicken: '🐔',
  beef: '🥩',
  pork: '🐖'
};

function renderSparkline(history) {
  if (!Array.isArray(history) || history.length < 2) {
    return '';
  }

  const numericHistory = history
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (numericHistory.length < 2) {
    return '';
  }

  const width = 84;
  const height = 24;
  const min = Math.min(...numericHistory);
  const max = Math.max(...numericHistory);
  const spread = max - min || 1;
  const points = numericHistory.map((value, index) => {
    const x = (index / (numericHistory.length - 1)) * width;
    const y = height - ((value - min) / spread) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return `
    <svg class="price-sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">
      <polyline points="${points}" />
    </svg>
  `;
}

function renderPriceItem(item, index) {
  const title = item.link
    ? `<a href="${item.link}" target="_blank" rel="noreferrer noopener">${item.store}</a>`
    : item.store;
  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
  const location = item.location ? `<span class="price-item-location">${item.location}</span>` : '';
  const unitPrice = item.unitPrice ? `<span class="price-item-unit">${item.unitPrice}</span>` : '';
  const sparkline = renderSparkline(item.history);

  return `
    <article class="price-item">
      <div class="price-item-header">
        <div class="price-item-title-group">
          <h3 class="price-item-title">${medal} ${title}</h3>
          ${location}
        </div>
        <div class="price-item-price-group">
          <span class="price-item-price">${item.price}</span>
          ${unitPrice}
          ${sparkline}
        </div>
      </div>
      <p class="price-item-label">${item.label}</p>
      ${item.note ? `<p class="price-item-note">${item.note}</p>` : ''}
    </article>
  `;
}

function parsePriceValue(item) {
  const source = item.unitPrice || item.price || '';
  const value = `${source}`.trim().toLowerCase();
  const centsPerOunceMatch = value.match(/([0-9]+(?:\.[0-9]+)?)\s*¢\/oz/);
  if (centsPerOunceMatch) {
    return (Number(centsPerOunceMatch[1]) * 16) / 100;
  }

  const dollarsPerPoundMatch = value.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)\s*\/lb/);
  if (dollarsPerPoundMatch) {
    return Number(dollarsPerPoundMatch[1]);
  }

  const unitMatch = value.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)/);
  return unitMatch ? Number(unitMatch[1]) : Number.POSITIVE_INFINITY;
}

function renderPriceSection(section) {
  const sortedItems = [...section.items].sort((a, b) => parsePriceValue(a) - parsePriceValue(b));

  return `
    <section class="price-section">
      <div class="price-section-header">
        <h2 class="section-title">${section.title}</h2>
        <p class="price-spec">${section.spec}</p>
      </div>
      <div class="price-items">
        ${sortedItems.map(renderPriceItem).join('')}
      </div>
    </section>
  `;
}

function getPriceFilterPills(sections) {
  const seen = new Set();
  const pills = [{ key: 'all', label: 'All', icon: '🧺' }];

  sections.forEach((section) => {
    const key = section.title.trim().toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    pills.push({
      key,
      label: section.title.trim(),
      icon: PRICE_FILTER_ICON_MAP[key] || '🏷️'
    });
  });

  return pills;
}

function renderPriceFilterPills(sections) {
  const pills = getPriceFilterPills(sections);

  return `
    <section class="price-filter-bar" aria-label="Price category filters">
      ${pills.map((pill, index) => `
        <button
          type="button"
          class="price-filter-pill${index === 0 ? ' is-active' : ''}"
          data-price-filter="${pill.key}"
          aria-pressed="${index === 0 ? 'true' : 'false'}"
        >
          <span class="price-filter-pill-icon" aria-hidden="true">${pill.icon}</span>
          <span>${pill.label}</span>
        </button>
      `).join('')}
    </section>
  `;
}

function renderPricesBoard(issue, activeFilter = 'all') {
  const filteredSections = activeFilter === 'all'
    ? issue.sections
    : issue.sections.filter((section) => section.title.trim().toLowerCase() === activeFilter);
  const methodology = Array.isArray(issue.methodology)
    ? `
      <section class="newsletter-card price-methodology">
        <h2 class="section-title">How This Comparison Works</h2>
        <ul class="price-methodology-list">
          ${issue.methodology.map((item) => `<li>${item}</li>`).join('')}
        </ul>
      </section>
    `
    : '';

  return `
    <section class="newsletter-card price-board" aria-labelledby="price-board-title">
      <div class="newsletter-issue-header">
        <p class="newsletter-issue-kicker">Price Watch</p>
        <h2 class="section-title" id="price-board-title">No. ${issue.issueNumber}: ${issue.title}</h2>
        <p class="newsletter-issue-date">${formatPricesDate(issue.publishDate)}</p>
        <p class="newsletter-copy">${issue.preheader}</p>
      </div>
      <p class="newsletter-issue-intro">${issue.intro}</p>
      ${renderPriceFilterPills(issue.sections)}
      <div class="price-sections">
        ${filteredSections.map(renderPriceSection).join('')}
      </div>
      ${methodology}
    </section>
  `;
}

function bindPriceFilters(mount, issue) {
  const pills = mount.querySelectorAll('[data-price-filter]');
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const activeFilter = pill.getAttribute('data-price-filter') || 'all';
      mount.innerHTML = renderPricesBoard(issue, activeFilter);
      bindPriceFilters(mount, issue);
    });
  });
}

async function initPricesPage({ mountId, dataPath }) {
  const mount = document.getElementById(mountId);
  if (!mount) {
    return;
  }

  try {
    const response = await fetch(dataPath, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Prices load failed: ${response.status}`);
    }

    const issues = await response.json();
    if (!Array.isArray(issues) || issues.length === 0) {
      mount.innerHTML = '<p class="calendar-empty">No price board has been compiled yet.</p>';
      return;
    }

    mount.innerHTML = renderPricesBoard(issues[0]);
    bindPriceFilters(mount, issues[0]);
  } catch (error) {
    console.error(error);
    mount.innerHTML = '<p class="calendar-empty">Price watch data could not be loaded right now.</p>';
  }
}

window.initPricesPage = initPricesPage;
