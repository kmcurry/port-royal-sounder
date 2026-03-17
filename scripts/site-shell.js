const PRIMARY_NAV_ITEMS = [
  { href: 'pages/activities.html', label: 'Activities' },
  { href: 'pages/beverages.html', label: 'Beverages' },
  { href: 'pages/farms.html', label: 'Farms' },
  { href: 'pages/food-trucks.html', label: 'Food Trucks' },
  { href: 'pages/markets.html', label: 'Markets' },
  { href: 'pages/pets.html', label: 'Pets' }
];

const UTILITY_NAV_ITEMS = [
  { href: 'pages/calendar.html', label: 'Calendar', className: 'nav-utility' },
  { href: 'pages/prices.html', label: 'Prices', className: 'nav-utility' },
  { href: 'pages/weekly-specials.html', label: 'Weekly Specials', className: 'nav-utility' },
  { href: 'pages/newsletter.html', label: 'Newsletter', className: 'nav-utility' }
];

const LEAFLET_SCRIPT = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const DIRECTORY_PAGE_FILES = [
  'activities.html',
  'bakeries.html',
  'beverages.html',
  'breweries.html',
  'butchers.html',
  'distilleries.html',
  'farms.html',
  'food-trucks.html',
  'markets.html',
  'pets.html',
  'seafood.html',
  'wineries.html'
];

const scriptLoadCache = {};
let navigationInFlight = false;

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
          <span class="brand-copy">
            <span class="brand-name">Port Royal Sounder</span>
            <span class="brand-tagline">A curated guide for living in Beaufort County, South Carolina.</span>
          </span>
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
        <p>&copy; ${new Date().getFullYear()} Port Royal Sounder &mdash; Beaufort &amp; Port Royal, SC · <a href="${resolveHref(rootPrefix, 'pages/calendar.html')}">Calendar</a> · <a href="${resolveHref(rootPrefix, 'pages/prices.html')}">Prices</a> · <a href="${resolveHref(rootPrefix, 'pages/weekly-specials.html')}">Weekly Specials</a> · <a href="${resolveHref(rootPrefix, 'pages/newsletter.html')}">Newsletter</a> · <a href="${resolveHref(rootPrefix, 'pages/privacy.html')}">Privacy</a></p>
      </div>
    </footer>
  `;
}

function getCurrentFileName() {
  return window.location.pathname.substring(window.location.pathname.lastIndexOf('/') + 1) || 'index.html';
}

function mountChrome(rootPrefix, currentHref) {
  const headerMount = document.getElementById('site-header') || document.querySelector('.site-header');
  if (headerMount) {
    headerMount.outerHTML = renderHeader(rootPrefix, currentHref);
  }

  const footerMount = document.getElementById('site-footer') || document.querySelector('.site-footer');
  if (footerMount) {
    footerMount.outerHTML = renderFooter(rootPrefix);
  }
}

function isSameOriginHtmlLink(link) {
  if (!link || !link.href) {
    return false;
  }

  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) {
    return false;
  }

  if (url.hash && url.pathname === window.location.pathname) {
    return false;
  }

  return url.pathname.endsWith('.html') || url.pathname.endsWith('/');
}

async function swapPageContent(url, options) {
  const settings = Object.assign({ updateHistory: true, scrollToTop: true }, options);
  const response = await fetch(url.href, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Navigation failed: ${response.status}`);
  }

  const html = await response.text();
  const parser = new DOMParser();
  const nextDocument = parser.parseFromString(html, 'text/html');
  const nextContent = nextDocument.getElementById('site-content');
  const currentContent = document.getElementById('site-content');

  if (!nextContent || !currentContent) {
    throw new Error('Missing site content mount');
  }

  currentContent.innerHTML = nextContent.innerHTML;
  document.title = nextDocument.title || document.title;

  if (settings.updateHistory) {
    window.history.pushState({}, '', url.href);
  }

  const rootPrefix = getRootPrefix();
  const currentHref = getCurrentPageHref(rootPrefix);
  mountChrome(rootPrefix, currentHref);

  await initPage(getCurrentFileName(), rootPrefix);

  if (settings.scrollToTop) {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
}

function buildScriptUrl(rootPrefix, src) {
  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  return rootPrefix + src;
}

function ensureScript(src, rootPrefix) {
  const url = buildScriptUrl(rootPrefix, src);
  const absoluteUrl = new URL(url, window.location.href).href;

  if (scriptLoadCache[absoluteUrl]) {
    return scriptLoadCache[absoluteUrl];
  }

  const existing = Array.from(document.scripts).find((script) => script.src === absoluteUrl);
  if (existing) {
    scriptLoadCache[absoluteUrl] = Promise.resolve();
    return scriptLoadCache[absoluteUrl];
  }

  scriptLoadCache[absoluteUrl] = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(script);
  });

  return scriptLoadCache[absoluteUrl];
}

function ensureScripts(sources, rootPrefix) {
  return sources.reduce((promise, src) => {
    return promise.then(() => ensureScript(src, rootPrefix));
  }, Promise.resolve());
}

function getPageScripts(fileName) {
  if (fileName === 'index.html' || DIRECTORY_PAGE_FILES.indexOf(fileName) !== -1) {
    return ['scripts/table.js', LEAFLET_SCRIPT, 'scripts/map.js'];
  }

  if (fileName === 'calendar.html') {
    return [LEAFLET_SCRIPT, 'scripts/map.js', 'scripts/calendar.js'];
  }

  if (fileName === 'newsletter.html') {
    return ['scripts/newsletter.js'];
  }

  if (fileName === 'weekly-specials.html') {
    return ['scripts/weekly-specials.js'];
  }

  if (fileName === 'prices.html') {
    return ['scripts/prices.js'];
  }

  return [];
}

function initDirectoryPage(config) {
  if (!window.initTable) {
    return;
  }

  const hiddenHeaders = config.table.hiddenHeaders ? config.table.hiddenHeaders.slice() : [];
  if (hiddenHeaders.indexOf('Availability') === -1) {
    hiddenHeaders.push('Availability');
  }
  config.table.hiddenHeaders = hiddenHeaders;

  window.initTable(config.table);

  if (config.map && window.initDirectoryMap) {
    window.initDirectoryMap(config.map);
  }
}

function initPage(fileName, rootPrefix) {
  if (window.destroyAllDirectoryMaps) {
    window.destroyAllDirectoryMaps();
  }

  const homeDataSources = [
    'data/activities.csv',
    'data/bakeries.csv',
    'data/breweries.csv',
    'data/butchers.csv',
    'data/distilleries.csv',
    'data/farms.csv',
    'data/food-trucks.csv',
    'data/markets.csv',
    'data/pets.csv',
    'data/seafood.csv',
    'data/wineries.csv'
  ];

  const initializers = {
    'index.html': function () {
      initDirectoryPage({
        table: {
          dataSources: homeDataSources,
          tableId: 'data-table',
          searchId: 'search-input',
          countId: 'row-count',
          legendId: 'tag-legend',
          mapId: 'map',
          hiddenHeaders: ['Products', 'Best Season', 'Secondary Season', 'Availability']
        },
        map: {
          mapId: 'map',
          dataSources: homeDataSources
        }
      });
    },
    'activities.html': function () {
      initDirectoryPage({
        table: {
          csvPath: '../data/activities.csv',
          tableId: 'data-table',
          searchId: 'search-input',
          countId: 'row-count',
          legendId: 'tag-legend',
          mapId: 'map'
        },
        map: { mapId: 'map', dataSources: ['../data/activities.csv'] }
      });
    },
    'bakeries.html': function () {
      initDirectoryPage({
        table: {
          csvPath: '../data/bakeries.csv',
          tableId: 'data-table',
          searchId: 'search-input',
          countId: 'row-count',
          legendId: 'tag-legend',
          mapId: 'map'
        },
        map: { mapId: 'map', dataSources: ['../data/bakeries.csv'] }
      });
    },
    'beverages.html': function () {
      initDirectoryPage({
        table: {
          dataSources: ['../data/breweries.csv', '../data/distilleries.csv', '../data/wineries.csv'],
          tableId: 'data-table',
          searchId: 'search-input',
          countId: 'row-count',
          legendId: 'tag-legend',
          mapId: 'map'
        },
        map: {
          mapId: 'map',
          dataSources: ['../data/breweries.csv', '../data/distilleries.csv', '../data/wineries.csv']
        }
      });
    },
    'breweries.html': function () {
      initDirectoryPage({
        table: {
          csvPath: '../data/breweries.csv',
          tableId: 'data-table',
          searchId: 'search-input',
          countId: 'row-count',
          legendId: 'tag-legend',
          mapId: 'map'
        },
        map: { mapId: 'map', dataSources: ['../data/breweries.csv'] }
      });
    },
    'butchers.html': function () {
      initDirectoryPage({
        table: {
          csvPath: '../data/butchers.csv',
          tableId: 'data-table',
          searchId: 'search-input',
          countId: 'row-count',
          legendId: 'tag-legend',
          mapId: 'map'
        },
        map: { mapId: 'map', dataSources: ['../data/butchers.csv'] }
      });
    },
    'distilleries.html': function () {
      initDirectoryPage({
        table: {
          csvPath: '../data/distilleries.csv',
          tableId: 'data-table',
          searchId: 'search-input',
          countId: 'row-count',
          legendId: 'tag-legend',
          mapId: 'map'
        },
        map: { mapId: 'map', dataSources: ['../data/distilleries.csv'] }
      });
    },
    'farms.html': function () {
      initDirectoryPage({
        table: {
          csvPath: '../data/farms.csv',
          tableId: 'data-table',
          searchId: 'search-input',
          countId: 'row-count',
          legendId: 'tag-legend',
          legendRenderer: 'products',
          mapId: 'map',
          hiddenHeaders: [],
          iconizeHeaders: ['Products']
        },
        map: { mapId: 'map', dataSources: ['../data/farms.csv'] }
      });
    },
    'food-trucks.html': function () {
      initDirectoryPage({
        table: {
          csvPath: '../data/food-trucks.csv',
          tableId: 'data-table',
          searchId: 'search-input',
          countId: 'row-count',
          legendId: 'tag-legend',
          mapId: 'map'
        },
        map: { mapId: 'map', dataSources: ['../data/food-trucks.csv'] }
      });
    },
    'markets.html': function () {
      initDirectoryPage({
        table: {
          dataSources: [
            '../data/markets.csv',
            '../data/bakeries.csv',
            '../data/butchers.csv',
            '../data/seafood.csv'
          ],
          tableId: 'data-table',
          searchId: 'search-input',
          countId: 'row-count',
          legendId: 'tag-legend',
          mapId: 'map',
          iconizeHeaders: ['Products'],
          hiddenHeaders: ['Weekly Data Strength', 'Weekly Data Sources', 'Newsletter']
        },
        map: {
          mapId: 'map',
          dataSources: [
            '../data/markets.csv',
            '../data/bakeries.csv',
            '../data/butchers.csv',
            '../data/seafood.csv'
          ]
        }
      });
    },
    'pets.html': function () {
      initDirectoryPage({
        table: {
          csvPath: '../data/pets.csv',
          tableId: 'data-table',
          searchId: 'search-input',
          countId: 'row-count',
          legendId: 'tag-legend',
          mapId: 'map'
        },
        map: { mapId: 'map', dataSources: ['../data/pets.csv'] }
      });
    },
    'seafood.html': function () {
      initDirectoryPage({
        table: {
          csvPath: '../data/seafood.csv',
          tableId: 'data-table',
          searchId: 'search-input',
          countId: 'row-count',
          legendId: 'tag-legend',
          mapId: 'map',
          iconizeHeaders: ['Products'],
          hiddenHeaders: ['Weekly Data Strength', 'Weekly Data Sources', 'Newsletter']
        },
        map: { mapId: 'map', dataSources: ['../data/seafood.csv'] }
      });
    },
    'wineries.html': function () {
      initDirectoryPage({
        table: {
          csvPath: '../data/wineries.csv',
          tableId: 'data-table',
          searchId: 'search-input',
          countId: 'row-count',
          legendId: 'tag-legend',
          mapId: 'map'
        },
        map: { mapId: 'map', dataSources: ['../data/wineries.csv'] }
      });
    },
    'calendar.html': function () {
      if (window.initDirectoryMap) {
        window.initDirectoryMap({
          mapId: 'calendar-map',
          dataSources: ['../data/events.csv']
        });
      }
      if (window.initCalendarPage) {
        window.initCalendarPage({
          rootId: 'calendar-page',
          csvPath: '../data/events.csv',
          mapId: 'calendar-map'
        });
      }
    },
    'newsletter.html': function () {
      if (window.initNewsletterPage) {
        window.initNewsletterPage({
          mountId: 'newsletter-latest-issue',
          dataPath: '../data/newsletter-issues.json'
        });
      }
    },
    'weekly-specials.html': function () {
      if (window.initWeeklySpecialsPage) {
        window.initWeeklySpecialsPage({
          mountId: 'weekly-specials-latest',
          dataPath: '../data/weekly-specials.json'
        });
      }
    },
    'prices.html': function () {
      if (window.initPricesPage) {
        window.initPricesPage({
          mountId: 'prices-latest',
          dataPath: '../data/prices.json'
        });
      }
    }
  };

  return ensureScripts(getPageScripts(fileName), rootPrefix).then(() => {
    const initializer = initializers[fileName];
    if (initializer) {
      initializer();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const rootPrefix = getRootPrefix();
  const currentHref = getCurrentPageHref(rootPrefix);

  mountChrome(rootPrefix, currentHref);
});

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || navigationInFlight) {
    return;
  }

  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    return;
  }

  const link = event.target.closest('a');
  if (!isSameOriginHtmlLink(link)) {
    return;
  }

  const url = new URL(link.href, window.location.href);
  if (url.href === window.location.href) {
    return;
  }

  event.preventDefault();
  navigationInFlight = true;

  swapPageContent(url, { updateHistory: true, scrollToTop: true })
    .catch((error) => {
      console.error(error);
      window.location.href = url.href;
    })
    .finally(() => {
      navigationInFlight = false;
    });
});

window.addEventListener('popstate', () => {
  if (navigationInFlight) {
    return;
  }

  navigationInFlight = true;
  const url = new URL(window.location.href);

  swapPageContent(url, { updateHistory: false, scrollToTop: false })
    .catch((error) => {
      console.error(error);
      window.location.reload();
    })
    .finally(() => {
      navigationInFlight = false;
    });
});
