function sectionEmoji(title) {
  const normalized = String(title || '').toLowerCase();

  if (normalized.includes('monday') || normalized.includes('tuesday') || normalized.includes('wednesday')) return '🗓️';
  if (normalized.includes('thursday') || normalized.includes('friday')) return '📍';
  if (normalized.includes('saturday') || normalized.includes('sunday')) return '🌤️';
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

  const location = item.location ? `<span class="newsletter-issue-location">${item.location}</span>` : '';

  return `
    <article class="newsletter-issue-item">
      <h3 class="newsletter-issue-item-title">${title}</h3>
      ${location}
      <p>${item.note}</p>
    </article>
  `;
}

function renderIssueSection(section) {
  return `
    <section class="newsletter-issue-section">
      <h2 class="section-title">${sectionEmoji(section.title)} ${section.title}</h2>
      <div class="newsletter-issue-items">
        ${section.items.map(renderIssueItem).join('')}
      </div>
    </section>
  `;
}

function renderIssue(issue) {
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
      <div class="newsletter-issue-sections">
        ${issue.sections.map(renderIssueSection).join('')}
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
  } catch (error) {
    console.error(error);
    mount.innerHTML = '<p class="calendar-empty">Newsletter draft content could not be loaded right now.</p>';
  }
}

window.initNewsletterPage = initNewsletterPage;
