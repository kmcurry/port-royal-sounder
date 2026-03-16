/**
 * table.js — Port Royal Sounder
 * Loads a CSV file and renders a searchable, sortable table into the page.
 *
 * Usage: include this script in a page, then call:
 *   initTable({ csvPath: '../data/farms.csv', tableId: 'data-table', searchId: 'search-input' })
 */

(function () {
  "use strict";

  const TYPE_ICON_MAP = {
    activity: "🚶",
    "u-pick": "🧑‍🌾",
    "allergen-friendly bakery": "🌿",
    "artisan bread": "🥖",
    bakery: "🧁",
    "bakery & coffee": "☕",
    "bakery cafe": "🥐",
    "batting cages": "🥎",
    "bowling alley": "🎳",
    brewery: "🍺",
    "butcher shop": "🥩",
    "cakes & cookies": "🍪",
    "chocolate shop": "🍫",
    civic: "🏛️",
    "coffee truck": "☕",
    "comfort truck": "🍔",
    culture: "🎭",
    "cultural center": "🪘",
    "cultural tour": "🚌",
    "children's museum": "🧸",
    csa_program: "📦",
    "brewery music venue": "🍺",
    "boat tour": "⛵",
    distillery: "🥃",
    education: "🎓",
    "dessert truck": "🍧",
    "filipino truck": "🍱",
    "exhibition baseball": "⚾",
    farm: "🚜",
    "food truck": "🚚",
    farm_u_pick: "🍓",
    farmers_market: "🧺",
    farm_market_kitchen: "🍽️",
    "fishing guide": "🎣",
    "fishing outfitter": "🪝",
    "history museum": "🏺",
    "historic site": "🏰",
    prepared_food_market: "🍲",
    "shrimp company": "🦐",
    "golf course": "⛳",
    "gullah truck": "🪘",
    "go-karts": "🏎️",
    "jamaican truck": "🌶️",
    "kayak tour": "🛶",
    "lighthouse": "🗼",
    "live music bar": "🎤",
    "live music venue": "🎶",
    market: "🧺",
    mariculture_research_hatchery: "🧪",
    meadery: "🍯",
    "minor league hockey": "🏒",
    "movie theater": "🎬",
    "mexican truck": "🌮",
    "acai bowl truck": "🫐",
    "natural pet food store": "🦴",
    "nature preserve": "🌿",
    "hunting & fishing guide": "🦆",
    "outdoor concert series": "🎸",
    oyster_farm: "🦪",
    "pizza truck": "🍕",
    paintball: "🔫",
    "playground park": "🛝",
    "pet boutique": "🛍️",
    "pet groomer": "✂️",
    "pet spa": "🫧",
    "pet store & grooming": "🐾",
    "pastries & desserts": "🍰",
    "family nature center": "🐢",
    "factory tour": "🎺",
    "performing arts center": "🎭",
    "regenerative farm": "🌱",
    "seafood market": "🐟",
    "seafood truck": "🦐",
    "seafood market / docks": "⚓",
    "skate park": "🛹",
    "shooting range": "🎯",
    "state park": "🏞️",
    "sourdough bakery": "🍞",
    "sourdough & pastries": "🍞",
    "sweet breads & pies": "🥧",
    u_pick_flowers: "🌸",
    "veterinary grooming": "🩺",
    "wetlands park": "🪷",
    "wildlife refuge": "🦅",
    "wine bar": "🍷",
    "wine shop": "🍾",
    winery: "🍇",
  };

  const PRODUCT_ICON_RULES = [
    { match: "vegetable", icon: "🥕", label: "Vegetables" },
    { match: "herb", icon: "🌿", label: "Herbs" },
    { match: "egg", icon: "🥚", label: "Eggs" },
    { match: "csa", icon: "📦", label: "CSA" },
    { match: "beef", icon: "🥩", label: "Beef" },
    { match: "cheese", icon: "🧀", label: "Cheese" },
    { match: "bread", icon: "🍞", label: "Bread" },
    { match: "bakery", icon: "🥐", label: "Bakery" },
    { match: "charcuterie", icon: "🍖", label: "Charcuterie" },
    { match: "burger", icon: "🍔", label: "Burgers" },
    { match: "cheesesteak", icon: "🥪", label: "Cheesesteaks" },
    { match: "taco", icon: "🌮", label: "Tacos" },
    { match: "birria", icon: "🍲", label: "Birria" },
    { match: "pizza", icon: "🍕", label: "Pizza" },
    { match: "coffee", icon: "☕", label: "Coffee" },
    { match: "sausage", icon: "🌭", label: "Sausage" },
    { match: "chicken", icon: "🐓", label: "Poultry" },
    { match: "pork", icon: "🐖", label: "Pork" },
    { match: "lamb", icon: "🐑", label: "Lamb" },
    { match: "ice pop", icon: "🍧", label: "Ice Pops" },
    { match: "frozen treat", icon: "🍦", label: "Frozen Treats" },
    { match: "dessert", icon: "🧁", label: "Desserts" },
    { match: "prepared food", icon: "🍱", label: "Prepared Foods" },
    { match: "cafe", icon: "☕", label: "Cafe" },
    { match: "canned", icon: "🫙", label: "Canned Goods" },
    { match: "gift", icon: "🎁", label: "Gifts" },
    { match: "specialty", icon: "✨", label: "Specialty Items" },
    { match: "entertainment", icon: "🎶", label: "Entertainment" },
    { match: "craft", icon: "🧺", label: "Crafts" },
    { match: "art", icon: "🎨", label: "Art" },
    { match: "shrimp", icon: "🦐", label: "Shrimp" },
    { match: "oyster", icon: "🦪", label: "Oysters" },
    { match: "fish", icon: "🐟", label: "Fish" },
    { match: "crab", icon: "🦀", label: "Crab" },
    { match: "local seafood", icon: "⚓", label: "Local Seafood" },
    { match: "strawberr", icon: "🍓", label: "Strawberries" },
    { match: "berry", icon: "🫐", label: "Berries" },
    { match: "melon", icon: "🍈", label: "Melons" },
    { match: "flower", icon: "🌸", label: "Flowers" },
    { match: "peach", icon: "🍑", label: "Peaches" },
    { match: "plum", icon: "🟣", label: "Plums" },
    { match: "muscadine", icon: "🍇", label: "Muscadines" },
    { match: "tomato", icon: "🍅", label: "Tomatoes" },
    { match: "okra", icon: "🫛", label: "Okra" },
    { match: "squash", icon: "🥒", label: "Squash" },
    { match: "sweet potato", icon: "🍠", label: "Sweet Potatoes" },
    { match: "pear", icon: "🍐", label: "Pears" },
    { match: "pecan", icon: "🌰", label: "Pecans" },
    { match: "persimmon", icon: "🧡", label: "Persimmons" },
    { match: "pomegranate", icon: "🔴", label: "Pomegranates" },
    { match: "citrus", icon: "🍊", label: "Citrus" },
    { match: "fruit", icon: "🍎", label: "Fruits" },
    { match: "honey", icon: "🍯", label: "Honey" },
    { match: "wheatgrass", icon: "🌾", label: "Wheatgrass" },
    { match: "produce", icon: "🧺", label: "Produce" },
    { match: "bird", icon: "🐓", label: "Poultry" },
  ];

  const SOCIAL_LINK_CONFIG = [
    { header: "Website", icon: "🌐", label: "Website", newTab: true },
    { header: "Facebook", icon: "📘", label: "Facebook", newTab: true },
    { header: "Instagram", icon: "📸", label: "Instagram", newTab: true },
    { header: "TikTok", icon: "🎵", label: "TikTok", newTab: true },
    { header: "YouTube", icon: "▶️", label: "YouTube", newTab: true },
    { header: "X", icon: "𝕏", label: "X", newTab: true },
    { header: "Threads", icon: "🧵", label: "Threads", newTab: true },
  ];

  const HIDDEN_SOCIAL_HEADERS = SOCIAL_LINK_CONFIG.map(function (item) {
    return item.header;
  }).filter(function (header) {
    return header !== "Website";
  });

  const DEFAULT_HIDDEN_HEADERS = [
    "Weekly Data Strength",
    "Weekly Data Sources",
    "Newsletter",
  ];

  function normalizeTypeKey(value) {
    const key = (value || "").trim().toLowerCase();
    if (key === "farm_u_pick") {
      return "u-pick";
    }
    return key;
  }

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
        obj[h.trim()] = (values[i] || "").trim();
      });
      return obj;
    });
  }

  function splitCSVLine(line) {
    const result = [];
    let current = "";
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
      } else if (ch === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  function loadCSVTexts(options) {
    const sources =
      options.dataSources && options.dataSources.length
        ? options.dataSources
        : [options.csvPath];

    return Promise.all(
      sources.map(function (source) {
        return fetch(source).then(function (res) {
          if (!res.ok) {
            throw new Error("HTTP " + res.status + " loading " + source);
          }
          return res.text();
        });
      }),
    );
  }

  /**
   * Render rows into the <tbody> of a table element.
   */
  function renderRows(tbody, rows, headers, options) {
    tbody.innerHTML = "";
    if (rows.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = headers.length;
      td.className = "no-results";
      td.textContent = "No results found.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    rows.forEach(function (row) {
      const tr = document.createElement("tr");
      if (options && options.mapId && row.Address) {
        tr.className = "map-linked-row";
        tr.tabIndex = 0;
        tr.setAttribute("role", "button");
        tr.setAttribute(
          "aria-label",
          "Show " + (row.Name || "location") + " on map",
        );
        tr.addEventListener("click", function () {
          window.focusDirectoryMap(options.mapId, row);
        });
        tr.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            window.focusDirectoryMap(options.mapId, row);
          }
        });
      }
      headers.forEach(function (h) {
        const td = document.createElement("td");
        td.classList.add(toColumnClass(h));
        appendCellContent(td, h, row[h] || "", row, options);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function renderCards(container, rows, headers, options) {
    if (!container) {
      return;
    }

    container.innerHTML = "";

    if (rows.length === 0) {
      const empty = document.createElement("div");
      empty.className = "mobile-card-empty";
      empty.textContent = "No results found.";
      container.appendChild(empty);
      return;
    }

    rows.forEach(function (row) {
      const card = document.createElement("article");
      card.className = "mobile-card";

      if (options && options.mapId && row.Address) {
        card.classList.add("map-linked-row");
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute(
          "aria-label",
          "Show " + (row.Name || "location") + " on map",
        );
        card.addEventListener("click", function (event) {
          if (event.target.closest("a, details, summary")) {
            return;
          }
          window.focusDirectoryMap(options.mapId, row);
        });
        card.addEventListener("keydown", function (event) {
          if (
            (event.key === "Enter" || event.key === " ") &&
            !event.target.closest("a, details, summary")
          ) {
            event.preventDefault();
            window.focusDirectoryMap(options.mapId, row);
          }
        });
      }

      const title = document.createElement("div");
      title.className = "mobile-card-title";
      title.textContent = row.Name || "Unnamed listing";
      card.appendChild(title);

      const badges = document.createElement("div");
      badges.className = "mobile-card-badges";

      if (row.Type && headers.indexOf("Type") !== -1) {
        const typeBadge = document.createElement("span");
        typeBadge.className = "mobile-card-badge";
        appendTypeIcon(typeBadge, row.Type);
        badges.appendChild(typeBadge);
      }

      if (row.Products && headers.indexOf("Products") !== -1) {
        const productBadge = document.createElement("span");
        productBadge.className = "mobile-card-badge";
        appendProductIcons(productBadge, row.Products);
        badges.appendChild(productBadge);
      }

      if (badges.childNodes.length) {
        card.appendChild(badges);
      }

      if (row.Location) {
        const location = document.createElement("div");
        location.className = "mobile-card-location";
        appendCellContent(location, "Location", row.Location, row, options);
        card.appendChild(location);
      }

      const actions = document.createElement("div");
      actions.className = "mobile-card-actions";
      ["Phone", "Website", "Email"].forEach(function (header) {
        if (row[header]) {
          const action = document.createElement("span");
          action.className = "mobile-card-action";
          appendCellContent(action, header, row[header], row, options);
          actions.appendChild(action);
        } else if (header === "Website") {
          const hasSocial = HIDDEN_SOCIAL_HEADERS.some(function (socialHeader) {
            return row[socialHeader];
          });
          if (hasSocial) {
            const action = document.createElement("span");
            action.className = "mobile-card-action mobile-card-action-online";
            appendCellContent(action, header, "", row, options);
            actions.appendChild(action);
          }
        }
      });
      if (actions.childNodes.length) {
        card.appendChild(actions);
      }

      if (row.Notes) {
        const notes = document.createElement("p");
        notes.className = "mobile-card-notes";
        notes.textContent = row.Notes;
        card.appendChild(notes);
      }

      const detailsHeaders = headers.filter(function (header) {
        return (
          [
            "Name",
            "Location",
            "Phone",
            "Website",
            "Email",
            "Notes",
            "Type",
          ].indexOf(header) === -1 &&
          HIDDEN_SOCIAL_HEADERS.indexOf(header) === -1
        );
      });

      if (detailsHeaders.length) {
        const details = document.createElement("details");
        details.className = "mobile-card-details";

        const summary = document.createElement("summary");
        summary.textContent = "More details";
        details.appendChild(summary);

        detailsHeaders.forEach(function (header) {
          const value = row[header] || "";
          if (!value) {
            return;
          }

          const field = document.createElement("div");
          field.className = "mobile-card-field";

          const label = document.createElement("span");
          label.className = "mobile-card-field-label";
          label.textContent = header;

          const content = document.createElement("span");
          content.className = "mobile-card-field-value";
          appendCellContent(content, header, value, row, options);

          field.appendChild(label);
          field.appendChild(content);
          details.appendChild(field);
        });

        if (details.childNodes.length > 1) {
          card.appendChild(details);
        }
      }

      container.appendChild(card);
    });
  }

  function appendCellContent(td, header, value, row, options) {
    const normalizedHeader = header.trim().toLowerCase();

    if (options && options.displayTransform) {
      value = options.displayTransform(header, value, row);
    }

    if (normalizedHeader === "products") {
      appendProductIcons(td, value);
      return;
    }

    if (normalizedHeader === "type") {
      appendTypeIcon(td, value);
      return;
    }

    if (
      !value &&
      !(
        normalizedHeader === "website" &&
        row &&
        SOCIAL_LINK_CONFIG.some(function (entry) {
          return row[entry.header];
        })
      )
    ) {
      if (header.trim().toLowerCase() !== "location" || !row || !row.Address) {
        td.textContent = "";
        return;
      }
    }

    if (normalizedHeader === "location") {
      td.textContent = value;
      if (row && row.Address) {
        td.appendChild(document.createTextNode(" "));
        appendLink(
          td,
          "https://www.google.com/maps/search/?api=1&query=" +
            encodeURIComponent(row.Address),
          "📍",
          "Address",
          row.Address,
          true,
        );
      }
      return;
    }

    let link = "";
    let label = value;

    if (normalizedHeader === "phone") {
      const digits = value.replace(/[^\d+]/g, "");
      if (digits) {
        link = "tel:" + digits;
        label = "📞";
      }
    } else if (normalizedHeader === "email") {
      link = "mailto:" + value;
      label = "✉️";
    } else if (normalizedHeader === "website") {
      appendOnlineLinks(td, row);
      return;
    } else if (normalizedHeader === "address") {
      link =
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(value);
      label = "📍";
    }

    if (!link) {
      td.textContent = value;
      return;
    }

    appendLink(
      td,
      link,
      label,
      header,
      value,
      normalizedHeader === "website" || normalizedHeader === "address",
    );
  }

  function appendLink(td, href, label, header, value, openInNewTab) {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.textContent = label;
    anchor.setAttribute("aria-label", header + ": " + value);
    anchor.title = value;

    if (openInNewTab) {
      anchor.target = "_blank";
      anchor.rel = "noreferrer noopener";
    }

    td.appendChild(anchor);
  }

  function normalizeUrl(value) {
    if (!value) {
      return "";
    }

    return /^(https?:)?\/\//i.test(value) ? value : "https://" + value;
  }

  function appendOnlineLinks(td, row) {
    const links = SOCIAL_LINK_CONFIG.filter(function (entry) {
      return row && row[entry.header];
    });

    if (!links.length) {
      td.textContent = "";
      return;
    }

    const wrap = document.createElement("span");
    wrap.className = "online-links";

    links.forEach(function (entry) {
      const anchor = document.createElement("a");
      anchor.href = normalizeUrl(row[entry.header]);
      anchor.textContent = entry.icon;
      anchor.className = "online-link";
      anchor.target = "_blank";
      anchor.rel = "noreferrer noopener";
      anchor.setAttribute("aria-label", entry.label + ": " + row[entry.header]);
      anchor.title = entry.label + ": " + row[entry.header];
      wrap.appendChild(anchor);
    });

    td.appendChild(wrap);
  }

  function appendTypeIcon(td, value) {
    if (!value) {
      td.textContent = "";
      return;
    }

    const normalizedType = normalizeTypeKey(value);
    const label = formatTypeLabel(normalizedType);
    const icon = TYPE_ICON_MAP[normalizedType] || "🏷️";
    const span = document.createElement("span");
    span.className = "type-icon";
    span.textContent = icon;
    span.setAttribute("role", "img");
    span.setAttribute("aria-label", label);
    span.title = label;
    td.appendChild(span);
  }

  function appendProductIcons(td, value) {
    if (!value) {
      td.textContent = "";
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
      const fallback = document.createElement("span");
      fallback.className = "type-icon";
      fallback.textContent = "📦";
      fallback.setAttribute("role", "img");
      fallback.setAttribute("aria-label", value);
      fallback.title = value;
      td.appendChild(fallback);
      return;
    }

    matches.forEach(function (match, index) {
      const span = document.createElement("span");
      span.className = "type-icon";
      span.textContent = match.icon;
      span.setAttribute("role", "img");
      span.setAttribute("aria-label", match.label);
      span.title = match.label;
      td.appendChild(span);
      if (index < matches.length - 1) {
        td.appendChild(document.createTextNode(" "));
      }
    });
  }

  function renderTypeLegend(containerId, usedTypes, options) {
    const container =
      typeof containerId === "string"
        ? document.getElementById(containerId)
        : containerId;
    if (!container) {
      return;
    }

    const counts = options && options.counts ? options.counts : {};
    const maxVisible = options && options.maxVisible ? options.maxVisible : 14;
    const expanded = !!(options && options.expanded);

    const typeKeys = (
      usedTypes && usedTypes.length ? usedTypes : Object.keys(TYPE_ICON_MAP)
    )
      .map(function (key) {
        return normalizeTypeKey(key);
      })
      .filter(function (key, index, list) {
        return TYPE_ICON_MAP[key] && list.indexOf(key) === index;
      })
      .sort(function (a, b) {
        const diff = (counts[b] || 0) - (counts[a] || 0);
        return diff || a.localeCompare(b);
      });

    const visibleKeys = expanded ? typeKeys : typeKeys.slice(0, maxVisible);
    const entries = visibleKeys.map(function (key) {
      const item = document.createElement("li");
      item.className = "type-legend-item";

      const control = document.createElement(
        options && options.onToggle ? "button" : "div",
      );
      control.className = "type-legend-control";
      if (options && options.onToggle) {
        control.type = "button";
        control.classList.toggle(
          "is-active",
          options.activeKeys && options.activeKeys.indexOf(key) !== -1,
        );
        control.setAttribute(
          "aria-pressed",
          options.activeKeys && options.activeKeys.indexOf(key) !== -1
            ? "true"
            : "false",
        );
        control.addEventListener("click", function () {
          options.onToggle(key);
        });
      }

      const icon = document.createElement("span");
      icon.className = "type-legend-icon";
      icon.textContent = TYPE_ICON_MAP[key];
      icon.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.className = "type-legend-label";
      label.textContent = formatTypeLabel(key);

      const count = document.createElement("span");
      count.className = "type-legend-count";
      count.textContent = String(counts[key] || 0);

      control.appendChild(icon);
      control.appendChild(label);
      control.appendChild(count);
      item.appendChild(control);
      return item;
    });

    const list = document.createElement("ul");
    list.className = "type-legend-list";
    entries.forEach(function (entry) {
      list.appendChild(entry);
    });

    container.innerHTML = "";
    container.appendChild(list);

    if (typeKeys.length > maxVisible) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "type-legend-toggle";
      toggle.textContent = expanded ? "Show fewer types" : "Show all types";
      toggle.addEventListener("click", function () {
        if (options && options.onExpandToggle) {
          options.onExpandToggle();
        }
      });
      container.appendChild(toggle);
    }
  }

  function renderProductLegend(containerId, usedValues, options) {
    const container =
      typeof containerId === "string"
        ? document.getElementById(containerId)
        : containerId;
    if (!container) {
      return;
    }

    const counts = options && options.counts ? options.counts : {};
    const normalizedValues = (usedValues || []).join(" ").toLowerCase();
    const entries = PRODUCT_ICON_RULES.filter(function (rule) {
      return normalizedValues.indexOf(rule.match) !== -1;
    }).filter(function (rule, index, list) {
      return (
        list.findIndex(function (item) {
          return item.icon === rule.icon && item.label === rule.label;
        }) === index
      );
    });

    const list = document.createElement("ul");
    list.className = "type-legend-list";

    entries.forEach(function (entry) {
      const item = document.createElement("li");
      item.className = "type-legend-item";

      const control = document.createElement(
        options && options.onToggle ? "button" : "div",
      );
      control.className = "type-legend-control";
      if (options && options.onToggle) {
        control.type = "button";
        control.classList.toggle(
          "is-active",
          options.activeKeys && options.activeKeys.indexOf(entry.match) !== -1,
        );
        control.setAttribute(
          "aria-pressed",
          options.activeKeys && options.activeKeys.indexOf(entry.match) !== -1
            ? "true"
            : "false",
        );
        control.addEventListener("click", function () {
          options.onToggle(entry.match);
        });
      }

      const icon = document.createElement("span");
      icon.className = "type-legend-icon";
      icon.textContent = entry.icon;
      icon.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.className = "type-legend-label";
      label.textContent = entry.label;

      const count = document.createElement("span");
      count.className = "type-legend-count";
      count.textContent = String(counts[entry.match] || 0);

      control.appendChild(icon);
      control.appendChild(label);
      control.appendChild(count);
      item.appendChild(control);
      list.appendChild(item);
    });

    container.innerHTML = "";
    container.appendChild(list);
  }

  function formatTypeLabel(value) {
    return value.replace(/_/g, " ").replace(/\b\w/g, function (char) {
      return char.toUpperCase();
    });
  }

  function toColumnClass(value) {
    return (
      "col-" +
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    );
  }

  function buildProductCounts(rows) {
    const counts = {};

    PRODUCT_ICON_RULES.forEach(function (rule) {
      counts[rule.match] = rows.reduce(function (total, row) {
        const products = (row.Products || "").toLowerCase();
        return total + (products.indexOf(rule.match) !== -1 ? 1 : 0);
      }, 0);
    });

    return counts;
  }

  function buildTypeCounts(rows) {
    return rows.reduce(function (acc, row) {
      const key = normalizeTypeKey(row.Type);
      if (!key) {
        return acc;
      }
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function applyLegendFilter(rows, state) {
    if (!state.legendFilters || state.legendFilters.length === 0) {
      return rows;
    }

    if (state.legendMode === "products") {
      return rows.filter(function (row) {
        const products = (row.Products || "").toLowerCase();
        return state.legendFilters.some(function (key) {
          return products.indexOf(key) !== -1;
        });
      });
    }

    return rows.filter(function (row) {
      return state.legendFilters.indexOf(normalizeTypeKey(row.Type)) !== -1;
    });
  }

  /**
   * Build the table header row with sort controls.
   */
  function buildHeader(thead, headers, state, refresh) {
    thead.innerHTML = "";
    const tr = document.createElement("tr");

    headers.forEach(function (h) {
      const th = document.createElement("th");
      th.setAttribute("scope", "col");
      th.setAttribute("tabindex", "0");
      th.setAttribute("role", "columnheader");
      th.dataset.col = h;
      th.classList.add(toColumnClass(h));

      const label = document.createElement("span");
      label.className = "header-label";
      label.textContent = h === "Website" ? "Online" : h;

      const icon = document.createElement("span");
      icon.className = "sort-icon";
      icon.setAttribute("aria-hidden", "true");

      th.appendChild(label);
      th.appendChild(icon);

      function applySort() {
        if (state.sortCol === h) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortCol = h;
          state.sortDir = "asc";
        }
        updateSortClasses(thead, h, state.sortDir);
        refresh();
      }

      th.addEventListener("click", applySort);
      th.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          applySort();
        }
      });

      tr.appendChild(th);
    });

    thead.appendChild(tr);
  }

  function updateSortClasses(thead, col, dir) {
    const ths = thead.querySelectorAll("th");
    ths.forEach(function (th) {
      th.classList.remove("sorted-asc", "sorted-desc");
      if (th.dataset.col === col) {
        th.classList.add(dir === "asc" ? "sorted-asc" : "sorted-desc");
      }
    });
  }

  function sortRows(rows, col, dir) {
    return rows.sort(function (a, b) {
      const av = (a[col] || "").toLowerCase();
      const bv = (b[col] || "").toLowerCase();
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }

  function applyFilter(rows, query, headers) {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter(function (row) {
      return headers.some(function (h) {
        return (row[h] || "").toLowerCase().includes(q);
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
    const countEl = options.countId
      ? document.getElementById(options.countId)
      : null;

    if (!table || !searchInput) {
      console.error("[table.js] Missing table or search input element.");
      return;
    }

    let thead = table.querySelector("thead");
    let tbody = table.querySelector("tbody");
    if (!thead) {
      thead = document.createElement("thead");
      table.appendChild(thead);
    }
    if (!tbody) {
      tbody = document.createElement("tbody");
      table.appendChild(tbody);
    }

    let cardContainer = null;
    const tableWrapper = table.closest(".table-wrapper");
    if (tableWrapper) {
      cardContainer =
        tableWrapper.parentElement.querySelector(".mobile-card-list");
      if (!cardContainer) {
        cardContainer = document.createElement("div");
        cardContainer.className = "mobile-card-list";
        cardContainer.setAttribute("aria-live", "polite");
        tableWrapper.insertAdjacentElement("afterend", cardContainer);
      }
    }

    const state = {
      sortCol: null,
      sortDir: "asc",
      query: "",
      legendFilters: [],
      legendMode: options.legendRenderer === "products" ? "products" : "type",
      legendExpanded: false,
    };
    let allRows = [];
    let headers = [];

    function deriveHeaders(rows) {
      const preferredOrder = [
        "Name",
        "Type",
        "Products",
        "Location",
        "Address",
        "Phone",
        "Website",
        "Facebook",
        "Instagram",
        "TikTok",
        "YouTube",
        "X",
        "Threads",
        "Email",
        "Best Season",
        "Secondary Season",
        "Availability",
        "Frequency",
        "Notes",
      ];
      const seen = [];

      rows.forEach(function (row) {
        Object.keys(row).forEach(function (key) {
          if (seen.indexOf(key) === -1) {
            seen.push(key);
          }
        });
      });

      return preferredOrder
        .filter(function (key) {
          return seen.indexOf(key) !== -1;
        })
        .concat(
          seen.filter(function (key) {
            return preferredOrder.indexOf(key) === -1;
          }),
        );
    }

    function refresh() {
      const sorted = state.sortCol
        ? sortRows(allRows.slice(), state.sortCol, state.sortDir)
        : allRows.slice();
      const legendFiltered = applyLegendFilter(sorted, state);
      const filtered = applyFilter(legendFiltered, state.query, headers);
      renderRows(tbody, filtered, headers, options);
      renderCards(cardContainer, filtered, headers, options);
      if (options.mapId && window.filterDirectoryMap) {
        window.filterDirectoryMap(options.mapId, filtered);
      }
      if (countEl) {
        countEl.textContent =
          filtered.length + " of " + allRows.length + " entries";
      }
    }

    searchInput.addEventListener("input", function () {
      state.query = searchInput.value.trim();
      refresh();
    });

    function scrollResultsIntoView() {
      const target = tableWrapper || table;
      if (!target) {
        return;
      }
      target.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    function rerenderLegend() {
      if (options.legendId && options.legendRenderer === "products") {
        renderProductLegend(
          options.legendId,
          allRows
            .map(function (row) {
              return row.Products || "";
            })
            .filter(Boolean),
          {
            activeKeys: state.legendFilters,
            counts: buildProductCounts(allRows),
            onToggle: handleLegendToggle,
          },
        );
      } else if (options.legendId) {
        renderTypeLegend(
          options.legendId,
          allRows
            .map(function (row) {
              return row.Type || "";
            })
            .filter(Boolean),
          {
            activeKeys: state.legendFilters,
            counts: buildTypeCounts(allRows),
            expanded: state.legendExpanded,
            onToggle: handleLegendToggle,
            onExpandToggle: handleLegendExpandToggle,
          },
        );
      }
    }

    // Fetch & parse CSV
    loadCSVTexts(options)
      .then(function (texts) {
        allRows = texts.reduce(function (rows, text) {
          return rows.concat(parseCSV(text));
        }, []);
        if (allRows.length === 0) {
          tbody.innerHTML =
            '<tr><td class="no-results">No data available.</td></tr>';
          renderCards(cardContainer, [], headers, options);
          rerenderLegend();
          return;
        }
        headers = deriveHeaders(allRows).filter(function (header) {
          if (header === "Latitude" || header === "Longitude") {
            return false;
          }
          if (HIDDEN_SOCIAL_HEADERS.indexOf(header) !== -1) {
            return false;
          }
          if (
            header === "Address" &&
            Object.prototype.hasOwnProperty.call(allRows[0], "Location")
          ) {
            return false;
          }
          if (DEFAULT_HIDDEN_HEADERS.indexOf(header) !== -1) {
            return false;
          }
          if (
            options.hiddenHeaders &&
            options.hiddenHeaders.indexOf(header) !== -1
          ) {
            return false;
          }
          return true;
        });
        rerenderLegend();
        buildHeader(thead, headers, state, refresh);
        refresh();
      })
      .catch(function (err) {
        console.error("[table.js]", err);
        tbody.innerHTML =
          '<tr><td class="no-results">Failed to load data. ' +
          err.message +
          "</td></tr>";
        if (cardContainer) {
          cardContainer.innerHTML =
            '<div class="mobile-card-empty">Failed to load data.</div>';
        }
      });

    function handleLegendToggle(key) {
      const index = state.legendFilters.indexOf(key);
      if (index === -1) {
        state.legendFilters.push(key);
      } else {
        state.legendFilters.splice(index, 1);
      }
      rerenderLegend();
      refresh();
      scrollResultsIntoView();
    }

    function handleLegendExpandToggle() {
      state.legendExpanded = !state.legendExpanded;
      rerenderLegend();
    }
  }

  // Expose globally
  window.initTable = initTable;
  window.renderProductLegend = renderProductLegend;
  window.renderTypeLegend = renderTypeLegend;
})();
