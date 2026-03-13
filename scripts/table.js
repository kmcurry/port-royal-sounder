/**
 * table.js — Port Royal Sounder
 * Loads a CSV file and renders a searchable, sortable table into the page.
 *
 * Usage: include this script in a page, then call:
 *   initTable({ csvPath: '../data/farms.csv', tableId: 'data-table', searchId: 'search-input' })
 */

(function () {
  'use strict';

  const TYPE_ICON_MAP = {
    activity: '🚶',
    'allergen-friendly bakery': '🌿',
    'artisan bread': '🥖',
    bakery: '🧁',
    'bakery & coffee': '☕',
    'bakery cafe': '🥐',
    'batting cages': '🥎',
    brewery: '🍺',
    'cakes & cookies': '🍪',
    'chocolate shop': '🍫',
    civic: '🏛️',
    culture: '🎭',
    csa_program: '📦',
    'brewery music venue': '🍺',
    distillery: '🥃',
    education: '🎓',
    'exhibition baseball': '⚾',
    events: '🎉',
    farm: '🚜',
    farm_u_pick: '🍓',
    farmers_market: '🧺',
    farm_market_kitchen: '🍽️',
    'golf course': '⛳',
    'go-karts': '🏎️',
    'live music bar': '🎤',
    'live music venue': '🎶',
    market: '🧺',
    mariculture_research_hatchery: '🧪',
    meadery: '🍯',
    'minor league hockey': '🏒',
    'natural pet food store': '🦴',
    'outdoor concert series': '🎸',
    outdoors: '🌳',
    oyster_farm: '🦪',
    paintball: '🎯',
    'pet boutique': '🛍️',
    'pet groomer': '✂️',
    'pet spa': '🫧',
    'pet store & grooming': '🐾',
    'pastries & desserts': '🍰',
    'performing arts center': '🎭',
    'regenerative farm': '🌱',
    'seafood market': '🐟',
    'seafood market / docks': '⚓',
    'sourdough bakery': '🍞',
    'sourdough & pastries': '🍞',
    'sweet breads & pies': '🥧',
    u_pick_flowers: '🌸',
    'veterinary grooming': '🩺',
    'waterfront music venue': '🌊',
    'wine bar': '🍷',
    'wine shop': '🍾',
    winery: '🍇'
  };

  const PRODUCT_ICON_RULES = [
    { match: 'vegetable', icon: '🥕', label: 'Vegetables' },
    { match: 'herb', icon: '🌿', label: 'Herbs' },
    { match: 'egg', icon: '🥚', label: 'Eggs' },
    { match: 'csa', icon: '📦', label: 'CSA' },
    { match: 'beef', icon: '🥩', label: 'Beef' },
    { match: 'shrimp', icon: '🦐', label: 'Shrimp' },
    { match: 'oyster', icon: '🦪', label: 'Oysters' },
    { match: 'fish', icon: '🐟', label: 'Fish' },
    { match: 'crab', icon: '🦀', label: 'Crab' },
    { match: 'local seafood', icon: '⚓', label: 'Local Seafood' },
    { match: 'pasture', icon: '🐄', label: 'Pastured Products' },
    { match: 'strawberr', icon: '🍓', label: 'Strawberries' },
    { match: 'berry', icon: '🫐', label: 'Berries' },
    { match: 'melon', icon: '🍈', label: 'Melons' },
    { match: 'flower', icon: '🌸', label: 'Flowers' },
    { match: 'peach', icon: '🍑', label: 'Peaches' },
    { match: 'plum', icon: '🟣', label: 'Plums' },
    { match: 'muscadine', icon: '🍇', label: 'Muscadines' },
    { match: 'tomato', icon: '🍅', label: 'Tomatoes' },
    { match: 'okra', icon: '🫛', label: 'Okra' },
    { match: 'squash', icon: '🥒', label: 'Squash' },
    { match: 'sweet potato', icon: '🍠', label: 'Sweet Potatoes' },
    { match: 'pear', icon: '🍐', label: 'Pears' },
    { match: 'pecan', icon: '🌰', label: 'Pecans' },
    { match: 'persimmon', icon: '🧡', label: 'Persimmons' },
    { match: 'pomegranate', icon: '🔴', label: 'Pomegranates' },
    { match: 'citrus', icon: '🍊', label: 'Citrus' },
    { match: 'fruit', icon: '🍎', label: 'Fruits' },
    { match: 'honey', icon: '🍯', label: 'Honey' },
    { match: 'wheatgrass', icon: '🌾', label: 'Wheatgrass' },
    { match: 'produce', icon: '🧺', label: 'Produce' },
    { match: 'tour', icon: '🚜', label: 'Farm Tours' },
    { match: 'bird', icon: '🐓', label: 'Live Birds' },
    { match: 'meat', icon: '🍖', label: 'Meat' }
  ];

  /**
   * Parse a CSV string into an array of objects.
   * Handles quoted fields containing commas.
   */
  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = splitCSVLine(lines[0]);

    return lines.slice(1).map(function (line) {
      const values = splitCSVLine(line);
      const obj = {};
      headers.forEach(function (h, i) {
        obj[h.trim()] = (values[i] || '').trim();
      });
      return obj;
    });
  }

  function splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        // Handle escaped quote: two consecutive double-quotes inside a quoted field
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip the second quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  /**
   * Render rows into the <tbody> of a table element.
   */
  function renderRows(tbody, rows, headers, options) {
    tbody.innerHTML = '';
    if (rows.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = headers.length;
      td.className = 'no-results';
      td.textContent = 'No results found.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    rows.forEach(function (row) {
      const tr = document.createElement('tr');
      if (options && options.mapId && row.Address) {
        tr.className = 'map-linked-row';
        tr.tabIndex = 0;
        tr.setAttribute('role', 'button');
        tr.setAttribute('aria-label', 'Show ' + (row.Name || 'location') + ' on map');
        tr.addEventListener('click', function () {
          window.focusDirectoryMap(options.mapId, row);
        });
        tr.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            window.focusDirectoryMap(options.mapId, row);
          }
        });
      }
      headers.forEach(function (h) {
        const td = document.createElement('td');
        td.classList.add(toColumnClass(h));
        appendCellContent(td, h, row[h] || '', row, options);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function appendCellContent(td, header, value, row, options) {
    const normalizedHeader = header.trim().toLowerCase();

    if (options && options.displayTransform) {
      value = options.displayTransform(header, value, row);
    }

    if (options && options.iconizeHeaders && options.iconizeHeaders.indexOf(header) !== -1) {
      appendProductIcons(td, value);
      return;
    }

    if (normalizedHeader === 'type') {
      appendTypeIcon(td, value);
      return;
    }

    if (!value) {
      if (header.trim().toLowerCase() !== 'location' || !row || !row.Address) {
        td.textContent = '';
        return;
      }
    }

    if (normalizedHeader === 'location') {
      td.textContent = value;
      if (row && row.Address) {
        td.appendChild(document.createTextNode(' '));
        appendLink(td, 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(row.Address), '📍', 'Address', row.Address, true);
      }
      return;
    }

    let link = '';
    let label = value;

    if (normalizedHeader === 'phone') {
      const digits = value.replace(/[^\d+]/g, '');
      if (digits) {
        link = 'tel:' + digits;
        label = '📞';
      }
    } else if (normalizedHeader === 'email') {
      link = 'mailto:' + value;
      label = '✉️';
    } else if (normalizedHeader === 'website') {
      link = /^(https?:)?\/\//i.test(value) ? value : 'https://' + value;
      label = '🔗';
    } else if (normalizedHeader === 'address') {
      link = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(value);
      label = '📍';
    }

    if (!link) {
      td.textContent = value;
      return;
    }

    appendLink(td, link, label, header, value, normalizedHeader === 'website' || normalizedHeader === 'address');
  }

  function appendLink(td, href, label, header, value, openInNewTab) {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.textContent = label;
    anchor.setAttribute('aria-label', header + ': ' + value);
    anchor.title = value;

    if (openInNewTab) {
      anchor.target = '_blank';
      anchor.rel = 'noreferrer noopener';
    }

    td.appendChild(anchor);
  }

  function appendTypeIcon(td, value) {
    if (!value) {
      td.textContent = '';
      return;
    }

    const label = formatTypeLabel(value);
    const icon = TYPE_ICON_MAP[value.trim().toLowerCase()] || '🏷️';
    const span = document.createElement('span');
    span.className = 'type-icon';
    span.textContent = icon;
    span.setAttribute('role', 'img');
    span.setAttribute('aria-label', label);
    span.title = label;
    td.appendChild(span);
  }

  function appendProductIcons(td, value) {
    if (!value) {
      td.textContent = '';
      return;
    }

    const normalized = value.toLowerCase();
    const matches = [];

    PRODUCT_ICON_RULES.forEach(function (rule) {
      if (normalized.indexOf(rule.match) !== -1) {
        matches.push(rule);
      }
    });

    if (matches.length === 0) {
      const fallback = document.createElement('span');
      fallback.className = 'type-icon';
      fallback.textContent = '📦';
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', value);
      fallback.title = value;
      td.appendChild(fallback);
      return;
    }

    matches.forEach(function (match, index) {
      const span = document.createElement('span');
      span.className = 'type-icon';
      span.textContent = match.icon;
      span.setAttribute('role', 'img');
      span.setAttribute('aria-label', match.label);
      span.title = match.label;
      td.appendChild(span);
      if (index < matches.length - 1) {
        td.appendChild(document.createTextNode(' '));
      }
    });
  }

  function renderTypeLegend(containerId, usedTypes) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) {
      return;
    }

    const typeKeys = (usedTypes && usedTypes.length ? usedTypes : Object.keys(TYPE_ICON_MAP))
      .map(function (key) { return key.trim().toLowerCase(); })
      .filter(function (key, index, list) {
        return TYPE_ICON_MAP[key] && list.indexOf(key) === index;
      })
      .sort();

    const entries = typeKeys.map(function (key) {
      const item = document.createElement('li');
      item.className = 'type-legend-item';

      const icon = document.createElement('span');
      icon.className = 'type-legend-icon';
      icon.textContent = TYPE_ICON_MAP[key];
      icon.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.className = 'type-legend-label';
      label.textContent = formatTypeLabel(key);

      item.appendChild(icon);
      item.appendChild(label);
      return item;
    });

    const heading = document.createElement('h2');
    heading.className = 'section-title type-legend-title';
    heading.textContent = 'Type Legend';

    const list = document.createElement('ul');
    list.className = 'type-legend-list';
    entries.forEach(function (entry) {
      list.appendChild(entry);
    });

    container.innerHTML = '';
    container.appendChild(heading);
    container.appendChild(list);
  }

  function renderProductLegend(containerId, usedValues) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) {
      return;
    }

    const normalizedValues = (usedValues || []).join(' ').toLowerCase();
    const entries = PRODUCT_ICON_RULES.filter(function (rule) {
      return normalizedValues.indexOf(rule.match) !== -1;
    }).filter(function (rule, index, list) {
      return list.findIndex(function (item) { return item.icon === rule.icon && item.label === rule.label; }) === index;
    });

    const heading = document.createElement('h2');
    heading.className = 'section-title type-legend-title';
    heading.textContent = 'Product Legend';

    const list = document.createElement('ul');
    list.className = 'type-legend-list';

    entries.forEach(function (entry) {
      const item = document.createElement('li');
      item.className = 'type-legend-item';

      const icon = document.createElement('span');
      icon.className = 'type-legend-icon';
      icon.textContent = entry.icon;
      icon.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.className = 'type-legend-label';
      label.textContent = entry.label;

      item.appendChild(icon);
      item.appendChild(label);
      list.appendChild(item);
    });

    container.innerHTML = '';
    container.appendChild(heading);
    container.appendChild(list);
  }

  function formatTypeLabel(value) {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, function (char) {
        return char.toUpperCase();
      });
  }

  function toColumnClass(value) {
    return 'col-' + value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  /**
   * Build the table header row with sort controls.
   */
  function buildHeader(thead, headers, state, rows, tbody, options) {
    thead.innerHTML = '';
    const tr = document.createElement('tr');

    headers.forEach(function (h) {
      const th = document.createElement('th');
      th.setAttribute('scope', 'col');
      th.setAttribute('tabindex', '0');
      th.setAttribute('role', 'columnheader');
      th.dataset.col = h;
      th.classList.add(toColumnClass(h));

      const label = document.createElement('span');
      label.className = 'header-label';
      label.textContent = h;

      const icon = document.createElement('span');
      icon.className = 'sort-icon';
      icon.setAttribute('aria-hidden', 'true');

      th.appendChild(label);
      th.appendChild(icon);

      function applySort() {
        if (state.sortCol === h) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortCol = h;
          state.sortDir = 'asc';
        }
        updateSortClasses(thead, h, state.sortDir);
        const sorted = sortRows(rows.slice(), h, state.sortDir);
        renderRows(tbody, applyFilter(sorted, state.query, headers), headers, options);
      }

      th.addEventListener('click', applySort);
      th.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          applySort();
        }
      });

      tr.appendChild(th);
    });

    thead.appendChild(tr);
  }

  function updateSortClasses(thead, col, dir) {
    const ths = thead.querySelectorAll('th');
    ths.forEach(function (th) {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.col === col) {
        th.classList.add(dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      }
    });
  }

  function sortRows(rows, col, dir) {
    return rows.sort(function (a, b) {
      const av = (a[col] || '').toLowerCase();
      const bv = (b[col] || '').toLowerCase();
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  function applyFilter(rows, query, headers) {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter(function (row) {
      return headers.some(function (h) {
        return (row[h] || '').toLowerCase().includes(q);
      });
    });
  }

  /**
   * Main init function.
   * @param {object} options
   * @param {string} options.csvPath   - Path to the CSV file (relative to the HTML page).
   * @param {string} options.tableId   - ID of the <table> element.
   * @param {string} options.searchId  - ID of the <input> search element.
   * @param {string} [options.countId] - Optional ID of an element to show row counts.
   */
  function initTable(options) {
    const table = document.getElementById(options.tableId);
    const searchInput = document.getElementById(options.searchId);
    const countEl = options.countId ? document.getElementById(options.countId) : null;

    if (!table || !searchInput) {
      console.error('[table.js] Missing table or search input element.');
      return;
    }

    let thead = table.querySelector('thead');
    let tbody = table.querySelector('tbody');
    if (!thead) { thead = document.createElement('thead'); table.appendChild(thead); }
    if (!tbody) { tbody = document.createElement('tbody'); table.appendChild(tbody); }

    const state = { sortCol: null, sortDir: 'asc', query: '' };
    let allRows = [];
    let headers = [];

    function refresh() {
      const filtered = applyFilter(
        state.sortCol ? sortRows(allRows.slice(), state.sortCol, state.sortDir) : allRows,
        state.query,
        headers
      );
      renderRows(tbody, filtered, headers, options);
      if (countEl) {
        countEl.textContent = filtered.length + ' of ' + allRows.length + ' entries';
      }
    }

    searchInput.addEventListener('input', function () {
      state.query = searchInput.value.trim();
      refresh();
    });

    // Fetch & parse CSV
    fetch(options.csvPath)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' loading ' + options.csvPath);
        return res.text();
      })
      .then(function (text) {
        allRows = parseCSV(text);
        if (allRows.length === 0) {
          tbody.innerHTML = '<tr><td class="no-results">No data available.</td></tr>';
          if (options.legendId && options.legendRenderer === 'products') {
            renderProductLegend(options.legendId, []);
          } else if (options.legendId) {
            renderTypeLegend(options.legendId, []);
          }
          return;
        }
        headers = Object.keys(allRows[0]).filter(function (header) {
          if (header === 'Latitude' || header === 'Longitude') {
            return false;
          }
          if (header === 'Address' && Object.prototype.hasOwnProperty.call(allRows[0], 'Location')) {
            return false;
          }
          if (options.hiddenHeaders && options.hiddenHeaders.indexOf(header) !== -1) {
            return false;
          }
          return true;
        });
        if (options.legendId && options.legendRenderer === 'products') {
          renderProductLegend(options.legendId, allRows.map(function (row) {
            return row.Products || '';
          }).filter(Boolean));
        } else if (options.legendId) {
          renderTypeLegend(options.legendId, allRows.map(function (row) {
            return row.Type || '';
          }).filter(Boolean));
        }
        buildHeader(thead, headers, state, allRows, tbody, options);
        refresh();
      })
      .catch(function (err) {
        console.error('[table.js]', err);
        tbody.innerHTML = '<tr><td class="no-results">Failed to load data. ' + err.message + '</td></tr>';
      });
  }

  // Expose globally
  window.initTable = initTable;
  window.renderProductLegend = renderProductLegend;
  window.renderTypeLegend = renderTypeLegend;
}());
