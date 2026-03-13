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
  const title = item.link
    ? `<a href="${item.link}" target="_blank" rel="noreferrer noopener">${item.name}</a>`
    : item.name;

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
      <h2 class="section-title">${section.title}</h2>
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
