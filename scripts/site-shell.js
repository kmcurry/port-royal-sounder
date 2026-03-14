const PRIMARY_NAV_ITEMS = [
  { href: 'pages/activities.html', label: 'Activities' },
  { href: 'pages/bakeries.html', label: 'Bakeries' },
  { href: 'pages/breweries.html', label: 'Breweries' },
  { href: 'pages/distilleries.html', label: 'Distilleries' },
  { href: 'pages/farms.html', label: 'Farms' },
  { href: 'pages/markets.html', label: 'Markets' },
  { href: 'pages/music.html', label: 'Music' },
  { href: 'pages/pets.html', label: 'Pets' },
  { href: 'pages/seafood.html', label: 'Seafood' },
  { href: 'pages/wineries.html', label: 'Wineries' }
];

const UTILITY_NAV_ITEMS = [
  { href: 'pages/calendar.html', label: 'Calendar', className: 'nav-utility' },
  { href: 'pages/newsletter.html', label: 'Newsletter', className: 'nav-utility' }
];

function getRootPrefix() {
  return window.location.pathname.includes('/pages/') ? '../' : '';
}

function getCurrentPageHref(rootPrefix) {
  const pathname = window.location.pathname;
  const fileName = pathname.substring(pathname.lastIndexOf('/') + 1) || 'index.html';
  return rootPrefix ? fileName : `${rootPrefix}${fileName}`;
}

function resolveHref(rootPrefix, href) {
  if (!rootPrefix) {
    return href;
  }

  if (href.startsWith('pages/')) {
    return href.replace('pages/', '');
  }

  return `${rootPrefix}${href}`;
}

function renderNavLinks(items, rootPrefix, currentHref) {
  return items.map((item) => {
    const href = resolveHref(rootPrefix, item.href);
    const className = [item.className, href === currentHref ? 'is-active' : ''].filter(Boolean).join(' ');

    return `<a href="${href}"${className ? ` class="${className}"` : ''}>${item.label}</a>`;
  }).join('');
}

function renderHeader(rootPrefix, currentHref) {
  return `
    <header class="site-header">
      <div class="container">
        <a class="brand" href="${rootPrefix}index.html">
          <img src="${rootPrefix}assets/logo-mark.png" alt="" class="brand-logo">
          <span>Port Royal Sounder</span>
        </a>
        <nav class="site-nav" aria-label="Main navigation">
          <div class="site-nav-primary">
            ${renderNavLinks(PRIMARY_NAV_ITEMS, rootPrefix, currentHref)}
          </div>
          <div class="site-nav-utility">
            ${renderNavLinks(UTILITY_NAV_ITEMS, rootPrefix, currentHref)}
          </div>
        </nav>
      </div>
    </header>
  `;
}

function renderFooter(rootPrefix) {
  return `
    <footer class="site-footer">
      <div class="container">
        <p>&copy; ${new Date().getFullYear()} Port Royal Sounder &mdash; Beaufort &amp; Port Royal, SC · <a href="${resolveHref(rootPrefix, 'pages/calendar.html')}">Calendar</a> · <a href="${resolveHref(rootPrefix, 'pages/newsletter.html')}">Newsletter</a> · <a href="${resolveHref(rootPrefix, 'pages/privacy.html')}">Privacy</a></p>
      </div>
    </footer>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  const rootPrefix = getRootPrefix();
  const currentHref = getCurrentPageHref(rootPrefix);

  const headerMount = document.getElementById('site-header');
  if (headerMount) {
    headerMount.outerHTML = renderHeader(rootPrefix, currentHref);
  }

  const footerMount = document.getElementById('site-footer');
  if (footerMount) {
    footerMount.outerHTML = renderFooter(rootPrefix);
  }
});
