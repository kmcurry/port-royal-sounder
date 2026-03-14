(function () {
  'use strict';

  const TYPE_ICON_MAP = {
    activity: '🚶',
    civic: '🏛️',
    culture: '🎭',
    education: '🎓',
    events: '🎉',
    market: '🧺'
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

  function eventMatchesFilters(event, state) {
    const query = state.query.toLowerCase();
    const haystack = [
      event.Name,
      event.Type,
      event.Location,
      event.Notes,
      event.Source
    ].join(' ').toLowerCase();

    if (query && haystack.indexOf(query) === -1) {
      return false;
    }

    if (state.activeTypes.size && !state.activeTypes.has(event.Type)) {
      return false;
    }

    if (state.selectedDate && !eventOccursOnDate(event, state.selectedDate)) {
      return false;
    }

    return true;
  }

  function getSortedTypes(events) {
    return Array.from(new Set(events.map(function (event) {
      return event.Type;
    }).filter(Boolean))).sort();
  }

  function renderTypeLegend(container, events, state) {
    if (!container) {
      return;
    }

    const types = getSortedTypes(events);
    container.innerHTML = '';

    types.forEach(function (type) {
      const key = type.trim().toLowerCase();
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'type-legend-control';
      if (state.activeTypes.has(type)) {
        button.classList.add('is-active');
      }
      button.title = type;
      button.setAttribute('aria-label', 'Toggle ' + type);
      button.innerHTML = '<span aria-hidden="true">' + (TYPE_ICON_MAP[key] || '📍') + '</span><span>' + type + '</span>';
      button.addEventListener('click', function () {
        if (state.activeTypes.has(type)) {
          state.activeTypes.delete(type);
        } else {
          state.activeTypes.add(type);
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
      if (dayEvents.length) {
        button.classList.add('has-events');
      }

      const number = document.createElement('span');
      number.className = 'calendar-day-number';
      number.textContent = String(day.getDate());
      button.appendChild(number);

      if (dayEvents.length) {
        const icons = Array.from(new Set(dayEvents.map(function (event) {
          const key = (event.Type || '').trim().toLowerCase();
          return TYPE_ICON_MAP[key] || '📍';
        }))).slice(0, 4);

        const iconRow = document.createElement('span');
        iconRow.className = 'calendar-day-icons';
        iconRow.setAttribute('aria-label', dayEvents.length + ' events');
        iconRow.title = dayEvents.map(function (event) {
          return event.Type || event.Name;
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
        state.selectedDate = state.selectedDate === isoDate ? '' : isoDate;
        state.onChange();
        if (listSection && window.innerWidth < 960) {
          listSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        event.Type
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

        const firstDate = events[0] ? new Date(events[0].StartDate + 'T00:00:00') : new Date();
        const state = {
          month: startOfMonth(firstDate),
          query: '',
          activeTypes: new Set(),
          selectedDate: '',
          onChange: refresh
        };
        const allTypes = getSortedTypes(events);
        allTypes.forEach(function (type) {
          if (type !== 'Civic') {
            state.activeTypes.add(type);
          }
        });

        function refresh() {
          const filtered = events.filter(function (event) {
            return eventMatchesFilters(event, state);
          });

          renderTypeLegend(legend, events, state);
          renderMonthGrid(monthPanel, events, state);
          renderEventList(list, filtered);
          count.textContent = filtered.length + ' events';

          if (options.mapId && window.filterDirectoryMap) {
            window.filterDirectoryMap(options.mapId, filtered);
          }
        }

        searchInput.addEventListener('input', function () {
          state.query = searchInput.value.trim();
          refresh();
        });

        clearButton.addEventListener('click', function () {
          state.query = '';
          state.activeTypes = new Set(allTypes.filter(function (type) {
            return type !== 'Civic';
          }));
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
