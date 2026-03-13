/**
 * map.js — Port Royal Sounder
 * Shared Leaflet map setup with lightweight CSV loading and geocode caching.
 */

(function () {
  'use strict';

  const CACHE_KEY = 'port-royal-sounder-map-cache-v1';
  const DEFAULT_CENTER = [32.3796, -80.6926];
  const DEFAULT_ZOOM = 10;
  const GEOCODE_CONCURRENCY = 3;
  const registry = {};

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      return [];
    }

    const headers = splitCSVLine(lines[0]);
    return lines.slice(1).map(function (line) {
      const values = splitCSVLine(line);
      const row = {};
      headers.forEach(function (header, index) {
        row[header.trim()] = (values[index] || '').trim();
      });
      return row;
    });
  }

  function splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"';
          index++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  function loadCache() {
    try {
      return JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveCache(cache) {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      // Ignore storage errors.
    }
  }

  function buildQuery(row) {
    const parts = [];

    if (row.Address) {
      parts.push(row.Address);
    }

    if (row.Location) {
      const normalizedAddress = (row.Address || '').toLowerCase();
      const normalizedLocation = row.Location.toLowerCase();
      if (!normalizedAddress.includes(normalizedLocation)) {
        parts.push(row.Location);
      }
    }

    parts.push('South Carolina');

    return row.Address ? parts.join(', ') : '';
  }

  function buildRowKey(row) {
    return [row.Name || '', row.Address || '', row.Location || ''].join('::');
  }

  function getVisibleBounds(entry) {
    const bounds = [];

    Object.keys(entry.markers).forEach(function (key) {
      const item = entry.markers[key];
      if (item.visible) {
        bounds.push([item.lat, item.lng]);
      }
    });

    return bounds;
  }

  function buildPopup(row) {
    const parts = [];
    if (row.Name) {
      parts.push('<strong>' + escapeHtml(row.Name) + '</strong>');
    }
    if (row.Type) {
      parts.push(escapeHtml(row.Type));
    }
    if (row.StartDate) {
      parts.push(escapeHtml(row.StartDate + (row.EndDate && row.EndDate !== row.StartDate ? ' to ' + row.EndDate : '')));
    }
    if (row.Location) {
      parts.push(escapeHtml(row.Location));
    }
    if (row.Notes) {
      parts.push(escapeHtml(row.Notes));
    }
    return parts.join('<br>');
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#39;'
      }[char];
    });
  }

  async function loadRows(dataSources) {
    const results = await Promise.allSettled(dataSources.map(function (source) {
      return fetch(source).then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ' loading ' + source);
        }
        return response.text();
      });
    }));

    return results.reduce(function (allRows, result, index) {
      if (result.status !== 'fulfilled') {
        console.warn('Skipping map data source:', dataSources[index], result.reason);
        return allRows;
      }

      return allRows.concat(parseCSV(result.value));
    }, []);
  }

  async function geocodeRows(rows) {
    const cache = loadCache();
    const points = [];
    const pending = [];
    let cursor = 0;

    rows.forEach(function (row) {
      if (row.Latitude && row.Longitude) {
        points.push({
          row: row,
          lat: Number(row.Latitude),
          lng: Number(row.Longitude)
        });
        return;
      }

      if (buildQuery(row)) {
        pending.push(row);
      }
    });

    async function worker() {
      while (cursor < pending.length) {
        const row = pending[cursor];
        cursor += 1;
        const query = buildQuery(row);

        if (cache[query]) {
          points.push({
            row: row,
            lat: cache[query].lat,
            lng: cache[query].lng
          });
          continue;
        }

        try {
          const response = await fetch(
            'https://photon.komoot.io/api/?limit=1&q=' + encodeURIComponent(query),
            { headers: { Accept: 'application/json' } }
          );
          const results = await response.json();
          if (results && results.features && results.features[0]) {
            cache[query] = {
              lat: Number(results.features[0].geometry.coordinates[1]),
              lng: Number(results.features[0].geometry.coordinates[0])
            };
            saveCache(cache);
            points.push({
              row: row,
              lat: cache[query].lat,
              lng: cache[query].lng
            });
          }
        } catch (error) {
          // Skip failed geocode lookups.
        }
      }
    }

    const workers = [];
    for (let index = 0; index < GEOCODE_CONCURRENCY; index++) {
      workers.push(worker());
    }

    await Promise.all(workers);
    return points;
  }

  async function initDirectoryMap(options) {
    const mapElement = document.getElementById(options.mapId);
    if (!mapElement || !window.L) {
      return;
    }

    const lock = document.createElement('button');
    lock.type = 'button';
    lock.className = 'map-lock';
    lock.textContent = 'Click to enable map';
    lock.setAttribute('aria-label', 'Click to enable map interactions');
    mapElement.appendChild(lock);

    const map = L.map(options.mapId).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    map.scrollWheelZoom.disable();
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();

    function lockMap() {
      map.scrollWheelZoom.disable();
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      lock.classList.remove('is-hidden');
    }

    function unlockMap() {
      map.scrollWheelZoom.enable();
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      lock.classList.add('is-hidden');
    }

    lock.addEventListener('click', function () {
      unlockMap();
    });

    map.on('blur', function () {
      lockMap();
    });

    mapElement.addEventListener('mouseleave', function () {
      lockMap();
    });

    registry[options.mapId] = {
      map: map,
      markers: {}
    };

    try {
      const rows = await loadRows(options.dataSources || []);
      const points = await geocodeRows(rows);

      if (!points.length) {
        mapElement.insertAdjacentHTML('beforeend', '<div class="map-status">No mappable locations available yet.</div>');
        return;
      }

      const bounds = [];
      points.forEach(function (point) {
        const marker = L.marker([point.lat, point.lng]).addTo(map).bindPopup(buildPopup(point.row));
        registry[options.mapId].markers[buildRowKey(point.row)] = {
          marker: marker,
          lat: point.lat,
          lng: point.lng,
          visible: true
        };
        bounds.push([point.lat, point.lng]);
      });

      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 13
      });
    } catch (error) {
      mapElement.insertAdjacentHTML('beforeend', '<div class="map-status">Map data could not be loaded right now.</div>');
    }
  }

  function focusDirectoryMap(mapId, row) {
    const entry = registry[mapId];
    if (!entry) {
      return false;
    }

    const match = entry.markers[buildRowKey(row)];
    if (!match) {
      return false;
    }

    entry.map.setView([match.lat, match.lng], 15, {
      animate: true
    });
    match.marker.openPopup();
    return true;
  }

  function filterDirectoryMap(mapId, rows) {
    const entry = registry[mapId];
    if (!entry) {
      return false;
    }

    const visibleKeys = new Set((rows || []).map(buildRowKey));

    Object.keys(entry.markers).forEach(function (key) {
      const item = entry.markers[key];
      const shouldShow = visibleKeys.size === 0 || visibleKeys.has(key);

      if (shouldShow && !item.visible) {
        item.marker.addTo(entry.map);
        item.visible = true;
      } else if (!shouldShow && item.visible) {
        item.marker.remove();
        item.visible = false;
      }
    });

    const bounds = getVisibleBounds(entry);
    if (bounds.length) {
      entry.map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 13
      });
    }

    return true;
  }

  window.focusDirectoryMap = focusDirectoryMap;
  window.filterDirectoryMap = filterDirectoryMap;
  window.initDirectoryMap = initDirectoryMap;
}());
