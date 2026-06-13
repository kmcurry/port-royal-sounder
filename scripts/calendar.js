(function () {
  'use strict';

  const TAG_ICON_MAP = {
    activity: '🚶',
    civic: '🏛️',
    culture: '🎭',
    education: '🎓',
    'live music': '🎶',
    market: '🧺',
    sports: '🏅'
  };

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

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
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

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function todayISODate() {
    return toISODate(new Date());
  }

  function isISODate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
  }

  function addDaysISODate(value, days) {
    const date = new Date(value + 'T00:00:00');
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    date.setDate(date.getDate() + days);
    return toISODate(date);
  }

  function getPresetRange(mode, today) {
    const days = mode === '30' ? 30 : 7;
    return {
      start: today,
      end: addDaysISODate(today, days - 1)
    };
  }

  function getInitialParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      query: (params.get('q') || '').trim(),
      event: (params.get('event') || '').trim(),
      selectedDate: (params.get('date') || '').trim(),
      range: (params.get('range') || '').trim(),
      start: (params.get('start') || '').trim(),
      end: (params.get('end') || '').trim(),
      month: (params.get('month') || '').trim()
    };
  }

  function parseMonthParam(value) {
    if (!/^\d{4}-\d{2}$/.test(value)) {
      return null;
    }

    const [year, month] = value.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      return null;
    }

    return new Date(year, month - 1, 1);
  }

  function formatLongDate(value) {
    if (!value) {
      return '';
    }

    const date = new Date(value + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatTimeRange(event) {
    if (!event.StartTime && !event.EndTime) {
      return event.AllDay ? 'All day' : '';
    }

    return [event.StartTime, event.EndTime].filter(Boolean).join(' - ');
  }

  function eventOccursOnDate(event, isoDate) {
    const start = event.StartDate;
    const end = event.EndDate || event.StartDate;
    return start <= isoDate && end >= isoDate;
  }

  function eventOverlapsRange(event, startDate, endDate) {
    const eventStart = event.StartDate;
    const eventEnd = event.EndDate || event.StartDate;
    return eventStart <= endDate && eventEnd >= startDate;
  }

  function eventMatchesFilters(event, state) {
    if (!eventMatchesBrowseFilters(event, state)) {
      return false;
    }

    if (!eventOverlapsRange(event, state.rangeStart, state.rangeEnd)) {
      return false;
    }

    return true;
  }

  function eventMatchesBrowseFilters(event, state) {
    if (state.exactEvent && event.Name !== state.exactEvent) {
      return false;
    }

    const query = state.query.toLowerCase();
    const haystack = [
      event.Name,
      event.Tags || event.Type,
      event.Location,
      event.Notes,
      event.Source
    ].join(' ').toLowerCase();

    if (query && haystack.indexOf(query) === -1) {
      return false;
    }

    if (state.activeTags.size && !state.activeTags.has(event.Tags || event.Type)) {
      return false;
    }

    return true;
  }

  function getSortedTags(events) {
    return Array.from(new Set(events.map(function (event) {
      return event.Tags || event.Type;
    }).filter(Boolean))).sort();
  }

  function buildTagCounts(events) {
    return events.reduce(function (counts, event) {
      const tag = event.Tags || event.Type;
      if (tag) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
      return counts;
    }, {});
  }

  function renderTagLegend(container, events, state) {
    if (!container) {
      return;
    }

    const tags = getSortedTags(events);
    const counts = buildTagCounts(events);
    container.innerHTML = '';

    tags.forEach(function (tag) {
      const key = tag.trim().toLowerCase();
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tag-legend-control';
      if (state.activeTags.has(tag)) {
        button.classList.add('is-active');
      }
      button.title = tag;
      button.setAttribute('aria-label', 'Toggle ' + tag);
      button.innerHTML =
        '<span aria-hidden="true">' + (TAG_ICON_MAP[key] || '📍') + '</span>' +
        '<span>' + tag + '</span>' +
        '<span class="tag-legend-count">' + String(counts[tag] || 0) + '</span>';
      button.addEventListener('click', function () {
        if (state.activeTags.has(tag)) {
          state.activeTags.delete(tag);
        } else {
          state.activeTags.add(tag);
        }
        state.onChange();
      });
      container.appendChild(button);
    });
  }

  function renderMonthGrid(container, events, state) {
    const monthStart = startOfMonth(state.month);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const gridStart = new Date(monthStart);
    gridStart.setDate(gridStart.getDate() - monthStart.getDay());

    const title = container.querySelector('.calendar-month-label');
    title.textContent = monthStart.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });

    const grid = container.querySelector('.calendar-grid');
    grid.innerHTML = '';

    for (let index = 0; index < 42; index++) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      const isoDate = toISODate(day);
      const dayEvents = events.filter(function (event) {
        return eventOccursOnDate(event, isoDate);
      });

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'calendar-day';
      if (day.getMonth() !== monthStart.getMonth()) {
        button.classList.add('is-outside-month');
      }
      if (state.selectedDate === isoDate) {
        button.classList.add('is-selected');
      }
      if (!state.selectedDate && isoDate >= state.rangeStart && isoDate <= state.rangeEnd) {
        button.classList.add('is-in-range');
      }
      if (dayEvents.length) {
        button.classList.add('has-events');
      }

      const number = document.createElement('span');
      number.className = 'calendar-day-number';
      number.textContent = String(day.getDate());
      button.appendChild(number);

      if (dayEvents.length) {
        const icons = Array.from(new Set(dayEvents.map(function (event) {
          const key = (event.Tags || event.Type || '').trim().toLowerCase();
          return TAG_ICON_MAP[key] || '📍';
        }))).slice(0, 4);

        const iconRow = document.createElement('span');
        iconRow.className = 'calendar-day-icons';
        iconRow.setAttribute('aria-label', dayEvents.length + ' events');
        iconRow.title = dayEvents.map(function (event) {
          return event.Tags || event.Type || event.Name;
        }).join(', ');

        icons.forEach(function (icon) {
          const mark = document.createElement('span');
          mark.className = 'calendar-day-icon';
          mark.textContent = icon;
          mark.setAttribute('aria-hidden', 'true');
          iconRow.appendChild(mark);
        });

        if (dayEvents.length > icons.length) {
          const more = document.createElement('span');
          more.className = 'calendar-day-more';
          more.textContent = '+' + (dayEvents.length - icons.length);
          iconRow.appendChild(more);
        }

        button.appendChild(iconRow);
      }

      button.addEventListener('click', function () {
        if (state.selectedDate === isoDate) {
          const presetRange = getPresetRange('7', state.today);
          state.rangeMode = '7';
          state.rangeStart = presetRange.start;
          state.rangeEnd = presetRange.end;
          state.selectedDate = '';
        } else {
          state.rangeMode = 'custom';
          state.rangeStart = isoDate;
          state.rangeEnd = isoDate;
          state.selectedDate = isoDate;
        }
        state.onChange();
        if (state.listSection && window.innerWidth < 960) {
          state.listSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      grid.appendChild(button);
    }
  }

  function renderEventList(container, events) {
    container.innerHTML = '';

    if (!events.length) {
      container.innerHTML = '<div class="calendar-empty">No events match the current filters.</div>';
      return;
    }

    events.forEach(function (event) {
      const item = document.createElement('article');
      item.className = 'calendar-event-card';

      const title = document.createElement('h3');
      title.className = 'calendar-event-title';
      title.textContent = event.Name;
      item.appendChild(title);

      const meta = document.createElement('p');
      meta.className = 'calendar-event-meta';
      meta.textContent = [
        formatLongDate(event.StartDate),
        event.EndDate && event.EndDate !== event.StartDate ? 'to ' + formatLongDate(event.EndDate) : '',
        formatTimeRange(event),
        event.Tags || event.Type
      ].filter(Boolean).join(' · ');
      item.appendChild(meta);

      if (event.Location) {
        const location = document.createElement('p');
        location.className = 'calendar-event-location';
        location.textContent = event.Location;
        item.appendChild(location);
      }

      if (event.Notes) {
        const notes = document.createElement('p');
        notes.className = 'calendar-event-notes';
        notes.textContent = event.Notes;
        item.appendChild(notes);
      }

      const links = document.createElement('p');
      links.className = 'calendar-event-links';
      if (event.Website) {
        const site = document.createElement('a');
        site.href = event.Website;
        site.target = '_blank';
        site.rel = 'noreferrer noopener';
        site.textContent = 'Event link';
        links.appendChild(site);
      }
      if (event.Address) {
        if (links.childNodes.length) {
          links.appendChild(document.createTextNode(' · '));
        }
        const map = document.createElement('a');
        map.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(event.Address);
        map.target = '_blank';
        map.rel = 'noreferrer noopener';
        map.textContent = 'Map';
        links.appendChild(map);
      }
      if (event.Source) {
        if (links.childNodes.length) {
          links.appendChild(document.createTextNode(' · '));
        }
        const source = document.createElement('span');
        source.textContent = 'Source: ' + event.Source;
        links.appendChild(source);
      }
      if (links.childNodes.length) {
        item.appendChild(links);
      }

      container.appendChild(item);
    });
  }

  function createInitialDateRange(params, today) {
    if (isISODate(params.selectedDate)) {
      return {
        mode: 'custom',
        start: params.selectedDate,
        end: params.selectedDate,
        selectedDate: params.selectedDate
      };
    }

    if (isISODate(params.start) && isISODate(params.end)) {
      const start = params.start <= params.end ? params.start : params.end;
      const end = params.start <= params.end ? params.end : params.start;
      return {
        mode: 'custom',
        start: start,
        end: end,
        selectedDate: start === end ? start : ''
      };
    }

    const mode = params.range === '30' ? '30' : '7';
    const range = getPresetRange(mode, today);
    return {
      mode: mode,
      start: range.start,
      end: range.end,
      selectedDate: ''
    };
  }

  function syncRangeControls(state) {
    if (!state.rangeButtons.length) {
      return;
    }

    state.rangeButtons.forEach(function (button) {
      const isActive = button.getAttribute('data-calendar-range-preset') === state.rangeMode;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (state.customRange) {
      state.customRange.hidden = state.rangeMode !== 'custom';
    }

    if (state.startInput) {
      state.startInput.value = state.rangeStart;
    }

    if (state.endInput) {
      state.endInput.value = state.rangeEnd;
    }
  }

  function initCalendarPage(options) {
    const root = document.getElementById(options.rootId);
    if (!root) {
      return;
    }

    const searchInput = root.querySelector('[data-calendar-search]');
    const legend = root.querySelector('[data-calendar-legend]');
    const clearButton = root.querySelector('[data-calendar-clear]');
    const monthPanel = root.querySelector('[data-calendar-month]');
    const list = root.querySelector('[data-calendar-list]');
    const listSection = root.querySelector('[data-calendar-list-section]');
    const count = root.querySelector('[data-calendar-count]');
    const prev = root.querySelector('[data-calendar-prev]');
    const next = root.querySelector('[data-calendar-next]');
    const rangeButtons = Array.from(root.querySelectorAll('[data-calendar-range-preset]'));
    const customRange = root.querySelector('[data-calendar-custom-range]');
    const startInput = root.querySelector('[data-calendar-range-start]');
    const endInput = root.querySelector('[data-calendar-range-end]');

    fetch(options.csvPath)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ' loading ' + options.csvPath);
        }
        return response.text();
      })
      .then(function (text) {
        const events = parseCSV(text).sort(function (a, b) {
          return (a.StartDate + (a.StartTime || '')).localeCompare(b.StartDate + (b.StartTime || ''));
        });

        const today = todayISODate();
        const initialParams = getInitialParams();
        const initialMonth = parseMonthParam(initialParams.month);
        const initialRange = createInitialDateRange(initialParams, today);
        const state = {
          month: initialMonth || startOfMonth(new Date()),
          today: today,
          query: initialParams.query,
          exactEvent: initialParams.event,
          activeTags: new Set(),
          rangeMode: initialRange.mode,
          rangeStart: initialRange.start,
          rangeEnd: initialRange.end,
          selectedDate: initialRange.selectedDate,
          rangeButtons: rangeButtons,
          customRange: customRange,
          startInput: startInput,
          endInput: endInput,
          listSection: listSection,
          onChange: refresh
        };
        const allTags = getSortedTags(events);
        if (state.query || state.selectedDate) {
          allTags.forEach(function (tag) {
            state.activeTags.add(tag);
          });
        } else {
          allTags.forEach(function (tag) {
            if (tag !== 'Civic') {
              state.activeTags.add(tag);
            }
          });
        }

        function refresh() {
          const browseFiltered = events.filter(function (event) {
            return eventMatchesBrowseFilters(event, state);
          });
          const filtered = browseFiltered.filter(function (event) {
            return eventMatchesFilters(event, state);
          });

          renderTagLegend(legend, events, state);
          renderMonthGrid(monthPanel, browseFiltered, state);
          renderEventList(list, filtered);
          count.textContent = filtered.length + ' events';
          syncRangeControls(state);

          if (options.mapId && window.filterDirectoryMap) {
            window.filterDirectoryMap(options.mapId, filtered);
          }
        }

        searchInput.value = state.query;

        searchInput.addEventListener('input', function () {
          state.query = searchInput.value.trim();
          state.exactEvent = '';
          refresh();
        });

        rangeButtons.forEach(function (button) {
          button.addEventListener('click', function () {
            const mode = button.getAttribute('data-calendar-range-preset') || '7';
            state.rangeMode = mode === 'custom' ? 'custom' : mode === '30' ? '30' : '7';
            state.selectedDate = '';

            if (state.rangeMode === 'custom') {
              if (!isISODate(state.rangeStart) || !isISODate(state.rangeEnd)) {
                const presetRange = getPresetRange('7', state.today);
                state.rangeStart = presetRange.start;
                state.rangeEnd = presetRange.end;
              }
            } else {
              const presetRange = getPresetRange(state.rangeMode, state.today);
              state.rangeStart = presetRange.start;
              state.rangeEnd = presetRange.end;
            }

            refresh();
          });
        });

        [startInput, endInput].forEach(function (input) {
          if (!input) {
            return;
          }

          input.addEventListener('change', function () {
            const start = startInput && isISODate(startInput.value) ? startInput.value : state.rangeStart;
            const end = endInput && isISODate(endInput.value) ? endInput.value : state.rangeEnd;
            state.rangeMode = 'custom';
            state.rangeStart = start <= end ? start : end;
            state.rangeEnd = start <= end ? end : start;
            state.selectedDate = state.rangeStart === state.rangeEnd ? state.rangeStart : '';
            refresh();
          });
        });

        clearButton.addEventListener('click', function () {
          const presetRange = getPresetRange('7', state.today);
          state.query = '';
          state.exactEvent = '';
          state.activeTags = new Set(allTags.filter(function (tag) {
            return tag !== 'Civic';
          }));
          state.rangeMode = '7';
          state.rangeStart = presetRange.start;
          state.rangeEnd = presetRange.end;
          state.selectedDate = '';
          searchInput.value = '';
          refresh();
        });

        prev.addEventListener('click', function () {
          state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
          refresh();
        });

        next.addEventListener('click', function () {
          state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
          refresh();
        });

        refresh();
      })
      .catch(function (error) {
        list.innerHTML = '<div class="calendar-empty">Failed to load events. ' + error.message + '</div>';
      });
  }

  window.initCalendarPage = initCalendarPage;
}());
