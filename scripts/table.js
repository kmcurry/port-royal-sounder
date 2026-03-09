/**
 * table.js — Port Royal Sounder
 * Loads a CSV file and renders a searchable, sortable table into the page.
 *
 * Usage: include this script in a page, then call:
 *   initTable({ csvPath: '../data/farms.csv', tableId: 'data-table', searchId: 'search-input' })
 */

(function () {
  'use strict';

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
  function renderRows(tbody, rows, headers) {
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
      headers.forEach(function (h) {
        const td = document.createElement('td');
        td.textContent = row[h] || '';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  /**
   * Build the table header row with sort controls.
   */
  function buildHeader(thead, headers, state, rows, tbody) {
    thead.innerHTML = '';
    const tr = document.createElement('tr');

    headers.forEach(function (h) {
      const th = document.createElement('th');
      th.setAttribute('scope', 'col');
      th.setAttribute('tabindex', '0');
      th.setAttribute('role', 'columnheader');
      th.dataset.col = h;

      const label = document.createTextNode(h);
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
        renderRows(tbody, applyFilter(sorted, state.query, headers), headers);
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
      renderRows(tbody, filtered, headers);
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
          return;
        }
        headers = Object.keys(allRows[0]);
        buildHeader(thead, headers, state, allRows, tbody);
        refresh();
      })
      .catch(function (err) {
        console.error('[table.js]', err);
        tbody.innerHTML = '<tr><td class="no-results">Failed to load data. ' + err.message + '</td></tr>';
      });
  }

  // Expose globally
  window.initTable = initTable;
}());
