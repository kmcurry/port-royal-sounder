/**
 * table.js — Port Royal Sounder
 * Loads a CSV file and renders a searchable, sortable table into the page.
 *
 * Usage: include this script in a page, then call:
 *   initTable({ csvPath: '../data/farms.csv', tableId: 'data-table', searchId: 'search-input' })
 */

(function () {
  "use strict";

  const TAG_ICON_MAP = {
    activity: "🚶",
    aquaculture: "🦪",
    "u-pick": "🧑‍🌾",
    "allergen-friendly bakery": "🌿",
    "aquaculture farm": "🦪",
    apiary: "🐝",
    "artisan bread": "🥖",
    bakery: "🧁",
    baseball: "⚾",
    "bakery & coffee": "☕",
    "bakery cafe": "🥐",
    "batting cages": "🥎",
    "baseball & soccer complex": "⚽",
    basketball: "🏀",
    "bowling alley": "🎳",
    bowling: "🎳",
    brewery: "🍺",
    "butcher shop": "🥩",
    butcher: "🥩",
    "cakes & cookies": "🍪",
    "chocolate shop": "🍫",
    civic: "🏛️",
    "coffee truck": "☕",
    coffee: "☕",
    "comfort truck": "🍔",
    "comfort food": "🍔",
    culture: "🎭",
    courts: "🏟️",
    "cultural center": "🪘",
    "cultural tour": "🚌",
    "children's museum": "🧸",
    csa: "📦",
    csa_program: "📦",
    "csa program": "📦",
    "brewery music venue": "🍺",
    "boat tour": "⛵",
    "basketball courts": "🏀",
    "dairy farm": "🥛",
    distillery: "🥃",
    education: "🎓",
    "dessert truck": "🍧",
    dessert: "🍧",
    "filipino truck": "🇵🇭",
    "filipino food": "🇵🇭",
    "exhibition baseball": "⚾",
    farm: "🚜",
    "farm tour": "🚜",
    "food truck": "🚚",
    farm_u_pick: "🍓",
    farmers_market: "🧺",
    "farmers market": "🧺",
    farm_market_kitchen: "🍽️",
    "farm market kitchen": "🍽️",
    "fishing guide": "🎣",
    "fishing outfitter": "🪝",
    fishing: "🎣",
    "history museum": "🏺",
    "historic site": "🏰",
    hiking: "🥾",
    football: "🏈",
    guide: "🧭",
    prepared_food_market: "🍲",
    "prepared food market": "🍲",
    "prepared meals": "🍲",
    "shrimp company": "🦐",
    "golf course": "⛳",
    golf: "⛳",
    "gullah truck": "🏴",
    "gullah food": "🏴",
    "go-karts": "🏎️",
    "jamaican truck": "🇯🇲",
    "jamaican food": "🇯🇲",
    "kayak tour": "🛶",
    lighthouse: "🗼",
    "live music": "🎶",
    market: "🧺",
    mariculture_research_hatchery: "🧪",
    meadery: "🍯",
    "minor league hockey": "🏒",
    "mushroom farm": "🍄",
    hockey: "🏒",
    "movie theater": "🎬",
    "microgreens farm": "🌱",
    "mexican truck": "🇲🇽",
    "mexican food": "🇲🇽",
    "acai bowl truck": "🫐",
    "acai bowls": "🫐",
    "natural pet food store": "🦴",
    "natural pet food": "🦴",
    "nature preserve": "🌿",
    "hunting & fishing guide": "🦆",
    hunting: "🦆",
    "indoor sports": "🏟️",
    "live sports": "🏟️",
    oyster_farm: "🦪",
    "pizza truck": "🍕",
    pizza: "🍕",
    paintball: "🔫",
    playground: "🛝",
    "playground park": "🛝",
    "pet boutique": "🛍️",
    "pet groomer": "✂️",
    "pet spa": "🫧",
    "pet store & grooming": "🐾",
    "pickleball courts": "🏓",
    pickleball: "🏓",
    "pastries & desserts": "🍰",
    "family nature center": "🐢",
    "factory tour": "🎺",
    "performing arts center": "🎭",
    "rec program": "🏃",
    "rec center": "🏃",
    "regenerative farm": "🌱",
    "seafood market": "🐟",
    seafood: "🐟",
    "seafood truck": "🦐",
    "seafood market / docks": "⚓",
    supplier: "📦",
    "working waterfront": "⚓",
    "marine infrastructure": "⚓",
    "cold storage": "❄️",
    marina: "⛽",
    "boat yard": "🛠️",
    "rice producer": "🌾",
    "grain mill": "🌾",
    "flour mill": "🌾",
    beef: "🥩",
    berries: "🫐",
    chicken: "🐓",
    citrus: "🍊",
    clams: "🦪",
    cornmeal: "🌽",
    crab: "🦀",
    dairy: "🥛",
    dockage: "⚓",
    duck: "🦆",
    "duck eggs": "🥚",
    eggs: "🥚",
    fish: "🐟",
    flour: "🌾",
    flowers: "🌸",
    fruits: "🍎",
    fuel: "⛽",
    pork: "🍖",
    grains: "🌾",
    grits: "🌽",
    herbs: "🌿",
    honey: "🍯",
    ice: "🧊",
    melons: "🍈",
    microgreens: "🌱",
    muscadines: "🍇",
    mushrooms: "🍄",
    mussels: "🦪",
    oysters: "🦪",
    peaches: "🍑",
    pecans: "🌰",
    persimmons: "🧡",
    pheasant: "🐓",
    plums: "🟣",
    pomegranates: "🔴",
    poultry: "🐓",
    "poultry and game": "🐓",
    game: "🐓",
    quail: "🐓",
    "quail eggs": "🥚",
    rice: "🌾",
    scallops: "🐚",
    shrimp: "🦐",
    skate: "🐟",
    squab: "🐓",
    strawberries: "🍓",
    vegetables: "🥕",
    "game birds": "🐓",
    "forageable plant": "🌿",
    "marine plant": "🌊",
    seaweed: "🌊",
    "wild greens": "🌿",
    fungi: "🍄",
    fruit: "🍎",
    "skate park": "🛹",
    "shooting range": "🎯",
    "shooting club": "🎯",
    shooting: "🎯",
    soccer: "⚽",
    softball: "🥎",
    "sports complex": "🏟️",
    "state park": "🏞️",
    "sourdough bakery": "🍞",
    "sourdough & pastries": "🍞",
    "sweet breads & pies": "🥧",
    "tennis courts": "🎾",
    tennis: "🎾",
    u_pick_flowers: "🌸",
    "veterinary grooming": "🩺",
    "wetlands park": "🪷",
    "wildlife refuge": "🦅",
    "wine bar": "🍷",
    "wine shop": "🍾",
    volleyball: "🏐",
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
    { match: "poultry", icon: "🐓", label: "Poultry" },
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
    { match: "specialty", icon: "🌱", label: "Microgreens" },
    { match: "entertainment", icon: "🎶", label: "Entertainment" },
    { match: "craft", icon: "🧺", label: "Crafts" },
    { match: "art", icon: "🎨", label: "Art" },
    { match: "shrimp", icon: "🦐", label: "Shrimp" },
    { match: "clam", icon: "🦪", label: "Clams" },
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
    { match: "rice", icon: "🌾", label: "Rice" },
    { match: "flour", icon: "🌾", label: "Flour" },
    { match: "grain", icon: "🌾", label: "Grains" },
    { match: "quail", icon: "🐓", label: "Quail" },
    { match: "pheasant", icon: "🐓", label: "Pheasant" },
    { match: "squab", icon: "🐓", label: "Squab" },
    { match: "duck", icon: "🦆", label: "Duck" },
    { match: "seaweed", icon: "🌊", label: "Seaweed" },
    { match: "sea lettuce", icon: "🌊", label: "Sea Lettuce" },
    { match: "salicornia", icon: "🌿", label: "Sea Beans" },
    { match: "glasswort", icon: "🌿", label: "Glasswort" },
    { match: "mushroom", icon: "🍄", label: "Mushrooms" },
    { match: "produce", icon: "🧺", label: "Produce" },
    { match: "bird", icon: "🐓", label: "Poultry" },
  ];

  const SOCIAL_LINK_CONFIG = [
    { header: "Website", icon: "🌐", label: "Website", newTab: true },
    { header: "Facebook", icon: "f", label: "Facebook", newTab: true },
    { header: "Instagram", icon: "◎", label: "Instagram", newTab: true },
    { header: "TikTok", icon: "♪", label: "TikTok", newTab: true },
    { header: "YouTube", icon: "▶", label: "YouTube", newTab: true },
    { header: "X", icon: "𝕏", label: "X", newTab: true },
    { header: "Threads", icon: "@", label: "Threads", newTab: true },
  ];

  const HIDDEN_SOCIAL_HEADERS = SOCIAL_LINK_CONFIG.map(function (item) {
    return item.header;
  }).filter(function (header) {
    return header !== "Website";
  });

  const CONTACT_HEADERS = [
    "Phone",
    "Website",
    "Email",
    "Facebook",
    "Instagram",
    "TikTok",
    "YouTube",
    "X",
    "Threads",
  ];

  const DEFAULT_HIDDEN_HEADERS = [
    "Weekly Data Strength",
    "Weekly Data Sources",
    "Newsletter",
    "Event Source",
    "Event Source Match",
    "Distance Miles",
    "Availability Type",
    "Source Confidence",
    "Distance Basis",
  ];

  function normalizeTagKey(value) {
    const key = (value || "").trim().toLowerCase().replace(/_/g, " ");
    if (key === "farm u pick" || key === "u pick" || key === "u pick flowers") {
      return "u-pick";
    }
    return key;
  }

  function parseTagList(row) {
    const source =
      row && row.Tags ? row.Tags : row && row.Type ? String(row.Type) : "";
    return source
      .split(",")
      .map(function (tag) {
        return normalizeTagKey(tag);
      })
      .filter(function (tag, index, list) {
        return tag && list.indexOf(tag) === index;
      });
  }

  function expandFacetKey(key) {
    const normalized = normalizeTagKey(key);
    if (!normalized) {
      return [];
    }

    const preparedFoodsFacetMap = {
      "prepared food": ["prepared foods"],
      "prepared food market": ["prepared foods"],
      "prepared foods": ["prepared foods"],
      "prepared meals": ["prepared foods"],
    };

    if (preparedFoodsFacetMap[normalized]) {
      return preparedFoodsFacetMap[normalized];
    }

    const birdFacetMap = {
      bird: ["poultry"],
      birds: ["poultry"],
      chicken: ["poultry", "chicken"],
      duck: ["poultry", "duck"],
      "duck eggs": ["poultry", "duck", "duck eggs"],
      "game birds": ["poultry", "game"],
      pheasant: ["poultry", "pheasant"],
      poultry: ["poultry"],
      "poultry and game": ["poultry", "game"],
      quail: ["poultry", "quail"],
      "quail eggs": ["poultry", "quail", "quail eggs"],
      squab: ["poultry", "squab"],
    };

    return birdFacetMap[normalized] || [normalized];
  }

  function getProductFacetKeys(row) {
    const products = String((row && row.Products) || "").toLowerCase();
    if (!products) {
      return [];
    }

    return PRODUCT_ICON_RULES.filter(function (rule) {
      return products.indexOf(rule.match) !== -1;
    }).map(function (rule) {
      return normalizeTagKey(rule.label);
    });
  }

  function parseFacetList(row) {
    return parseTagList(row)
      .concat(getProductFacetKeys(row))
      .flatMap(expandFacetKey)
      .filter(function (key, index, list) {
        return key && list.indexOf(key) === index;
      });
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

  function todayISODate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function normalizeMatchKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function isGenericCalendarRow(row) {
    return /\bcalendar\b/i.test(String(row && row.Name));
  }

  function parseCalendarSourceList(value) {
    return String(value || "")
      .split(/[|;]/)
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
  }

  function getRowCalendarSourceKeys(row) {
    const keys = new Set();

    [row && row.Name, row && row["Event Source"], row && row["Event Source Match"]]
      .flatMap(parseCalendarSourceList)
      .forEach(function (value) {
        const normalized = normalizeMatchKey(value);
        if (normalized) {
          keys.add(normalized);
        }
      });

    return keys;
  }

  function findConfiguredCalendarSourcesForRow(row, options) {
    const sources = options && options.calendarSources ? options.calendarSources : [];
    const rowKeys = getRowCalendarSourceKeys(row);
    if (!sources.length || !rowKeys.size || isGenericCalendarRow(row)) {
      return [];
    }

    return sources.filter(function (source) {
      return rowKeys.has(normalizeMatchKey(source.Name));
    });
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

  function dedupeRowsByName(rows) {
    const seen = new Set();
    return rows.filter(function (row) {
      const key = (row.Name || "").trim().toLowerCase();
      if (!key) {
        return true;
      }
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
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

      if (row.Tags && headers.indexOf("Tags") !== -1) {
        const tagBadge = document.createElement("span");
        tagBadge.className = "mobile-card-badge";
        appendTagIcons(tagBadge, row.Tags);
        badges.appendChild(tagBadge);
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
      if (rowHasContact(row)) {
        const action = document.createElement("span");
        action.className = "mobile-card-action mobile-card-action-contact";
        appendCellContent(action, "Contact", "", row, options);
        actions.appendChild(action);
      }
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
            "Contact",
            "Phone",
            "Website",
            "Email",
            "Notes",
            "Type",
            "Tags",
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
          label.textContent = getHeaderLabel(header, options);

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

    if (normalizedHeader === "contact") {
      appendContactLinks(td, row);
      return;
    }

    if (
      normalizedHeader === "frequency" &&
      options &&
      options.calendarCsvPath
    ) {
      appendCalendarColumnContent(td, row, value, options);
      return;
    }

    if (normalizedHeader === "tags") {
      appendTagIcons(td, value || (row && row.Type) || "");
      return;
    }

    if (normalizedHeader === "type") {
      appendTagIcons(td, row && row.Tags ? row.Tags : value);
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

  function findUpcomingEventsForRow(row, options) {
    const events = options && options.calendarEvents ? options.calendarEvents : [];
    if (!events.length) {
      return [];
    }

    if (isGenericCalendarRow(row)) {
      return [];
    }

    const today = todayISODate();
    const rowKeys = getRowCalendarSourceKeys(row);
    const configuredSourceKeys = new Set(
      findConfiguredCalendarSourcesForRow(row, options).map(function (source) {
        return normalizeMatchKey(source.Name);
      }),
    );
    const rowName = normalizeMatchKey(row && row.Name);

    return events
      .filter(function (event) {
        const endDate = event.EndDate || event.StartDate;
        if (!event.StartDate || endDate < today) {
          return false;
        }

        const eventSource = normalizeMatchKey(event.Source);
        const eventName = normalizeMatchKey(event.Name);

        return (
          (eventSource && configuredSourceKeys.has(eventSource)) ||
          (eventSource && rowKeys.has(eventSource)) ||
          (eventName && rowKeys.has(eventName)) ||
          (rowName && (eventSource === rowName || eventName === rowName))
        );
      })
      .sort(function (a, b) {
        const aKey = (a.StartDate || "") + "|" + (a.StartTime || "99:99") + "|" + (a.Name || "");
        const bKey = (b.StartDate || "") + "|" + (b.StartTime || "99:99") + "|" + (b.Name || "");
        return aKey.localeCompare(bKey);
      });
  }

  function appendCalendarSourceFallback(td, row, fallbackValue, options) {
    const sources = findConfiguredCalendarSourcesForRow(row, options).filter(function (source) {
      return source["Events URL"];
    });

    if (!sources.length) {
      td.textContent = fallbackValue || "";
      return;
    }

    const wrap = document.createElement("span");
    wrap.className = "calendar-links";

    sources.slice(0, 2).forEach(function (source) {
      const anchor = document.createElement("a");
      anchor.href = normalizeUrl(source["Events URL"]);
      anchor.target = "_blank";
      anchor.rel = "noreferrer noopener";
      anchor.className = "calendar-link";
      anchor.textContent = "🌐 " + (source.Name || "Venue calendar");
      anchor.setAttribute("aria-label", "Open source calendar for " + (source.Name || row.Name || "venue"));
      anchor.title = (source.Name || row.Name || "Venue") + " calendar";
      wrap.appendChild(anchor);
    });

    if (sources.length > 2) {
      const more = document.createElement("span");
      more.className = "calendar-more";
      more.textContent = "+" + String(sources.length - 2) + " more";
      wrap.appendChild(more);
    }

    td.appendChild(wrap);
  }

  function appendCalendarColumnContent(td, row, fallbackValue, options) {
    const matches = findUpcomingEventsForRow(row, options);
    if (!matches.length) {
      appendCalendarSourceFallback(td, row, fallbackValue, options);
      return;
    }

    const wrap = document.createElement("span");
    wrap.className = "calendar-links";

    matches.slice(0, 2).forEach(function (event) {
      const params = new URLSearchParams();
      params.set("event", event.Name || "");
      params.set("month", (event.StartDate || todayISODate()).slice(0, 7));

      const href =
        (options.calendarPagePath || "../pages/calendar.html") +
        "?" +
        params.toString();

      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.textContent = "📅 " + (event.Name || "Upcoming event");
      anchor.className = "calendar-link";
      anchor.setAttribute("aria-label", "Open calendar details for " + (event.Name || "upcoming event"));
      anchor.title = (event.Name || "Upcoming event") + " — " + (event.StartDate || "");
      wrap.appendChild(anchor);
    });

    if (matches.length > 2) {
      const more = document.createElement("span");
      more.className = "calendar-more";
      more.textContent = "+" + String(matches.length - 2) + " more";
      wrap.appendChild(more);
    }

    td.appendChild(wrap);
  }

  function rowHasContact(row) {
    return CONTACT_HEADERS.some(function (header) {
      return row && row[header];
    });
  }

  function appendContactLinks(td, row) {
    if (!rowHasContact(row)) {
      td.textContent = "";
      return;
    }

    const wrap = document.createElement("span");
    wrap.className = "contact-links";

    if (row.Phone) {
      const digits = row.Phone.replace(/[^\d+]/g, "");
      if (digits) {
        const phoneLink = document.createElement("a");
        phoneLink.href = "tel:" + digits;
        phoneLink.textContent = "📞";
        phoneLink.className = "contact-link";
        phoneLink.setAttribute("aria-label", "Phone: " + row.Phone);
        phoneLink.title = "Phone: " + row.Phone;
        wrap.appendChild(phoneLink);
      }
    }

    if (row.Email) {
      const emailLink = document.createElement("a");
      emailLink.href = "mailto:" + row.Email;
      emailLink.textContent = "✉️";
      emailLink.className = "contact-link";
      emailLink.setAttribute("aria-label", "Email: " + row.Email);
      emailLink.title = "Email: " + row.Email;
      wrap.appendChild(emailLink);
    }

    SOCIAL_LINK_CONFIG.filter(function (entry) {
      return row && row[entry.header];
    }).forEach(function (entry) {
      const anchor = document.createElement("a");
      anchor.href = normalizeUrl(row[entry.header]);
      anchor.textContent = entry.icon;
      anchor.className = "contact-link";
      anchor.target = "_blank";
      anchor.rel = "noreferrer noopener";
      anchor.setAttribute("aria-label", entry.label + ": " + row[entry.header]);
      anchor.title = entry.label + ": " + row[entry.header];
      wrap.appendChild(anchor);
    });

    td.appendChild(wrap);
  }

  function appendTagIcon(td, value) {
    if (!value) {
      td.textContent = "";
      return;
    }

    const normalizedTag = normalizeTagKey(value);
    const label = formatTagLabel(normalizedTag);
    const icon = getFacetIcon(normalizedTag);
    const span = document.createElement("span");
    span.className = "tag-icon";
    span.textContent = icon;
    span.setAttribute("role", "img");
    span.setAttribute("aria-label", label);
    span.title = label;
    td.appendChild(span);
  }

  function appendTagIcons(td, value) {
    if (!value) {
      td.textContent = "";
      return;
    }

    const tags = String(value)
      .split(",")
      .map(function (tag) {
        return tag.trim();
      })
      .filter(Boolean);

    if (!tags.length) {
      td.textContent = "";
      return;
    }

    appendIconCluster(td, tags.map(function (tag) {
      const normalizedTag = normalizeTagKey(tag);
      return {
        icon: TAG_ICON_MAP[normalizedTag] || "🏷️",
        label: formatTagLabel(normalizedTag),
      };
    }));
  }

  function appendIconCluster(td, items) {
    const seen = new Set();
    const uniqueItems = items.filter(function (item) {
      const key = item.icon + "::" + item.label;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    const maxVisible = 6;
    const visibleItems = uniqueItems.slice(0, maxVisible);

    visibleItems.forEach(function (item, index) {
      const span = document.createElement("span");
      span.className = "tag-icon";
      span.textContent = item.icon;
      span.setAttribute("role", "img");
      span.setAttribute("aria-label", item.label);
      span.title = item.label;
      td.appendChild(span);
      if (index < visibleItems.length - 1) {
        td.appendChild(document.createTextNode(" "));
      }
    });

    if (uniqueItems.length > maxVisible) {
      if (visibleItems.length) {
        td.appendChild(document.createTextNode(" "));
      }
      const more = document.createElement("span");
      more.className = "tag-icon-more";
      more.textContent = "+" + (uniqueItems.length - maxVisible);
      more.title = uniqueItems.slice(maxVisible).map(function (item) {
        return item.label;
      }).join(", ");
      td.appendChild(more);
    }
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
      appendIconCluster(td, [{
        icon: "📦",
        label: value,
      }]);
      return;
    }

    appendIconCluster(td, matches.map(function (match) {
      return {
        icon: match.icon,
        label: match.label,
      };
    }));
  }

  function renderTagLegend(containerId, usedTags, options) {
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

    const tagKeys = (
      usedTags && usedTags.length ? usedTags : Object.keys(TAG_ICON_MAP)
    )
      .map(function (key) {
        return normalizeTagKey(key);
      })
      .filter(function (key, index, list) {
        return key && list.indexOf(key) === index;
      })
      .sort(function (a, b) {
        const diff = (counts[b] || 0) - (counts[a] || 0);
        return diff || a.localeCompare(b);
      });

    const visibleKeys = expanded ? tagKeys : tagKeys.slice(0, maxVisible);
    const entries = visibleKeys.map(function (key) {
      const item = document.createElement("li");
      item.className = "tag-legend-item";

      const control = document.createElement(
        options && options.onToggle ? "button" : "div",
      );
      control.className = "tag-legend-control";
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
      icon.className = "tag-legend-icon";
      icon.textContent = getFacetIcon(key);
      icon.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.className = "tag-legend-label";
      label.textContent = getFacetLabel(key);

      const count = document.createElement("span");
      count.className = "tag-legend-count";
      count.textContent = String(counts[key] || 0);

      control.appendChild(icon);
      control.appendChild(label);
      control.appendChild(count);
      item.appendChild(control);
      return item;
    });

    const list = document.createElement("ul");
    list.className = "tag-legend-list";
    entries.forEach(function (entry) {
      list.appendChild(entry);
    });

    container.innerHTML = "";
    container.appendChild(list);

    if (tagKeys.length > maxVisible) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "tag-legend-toggle";
      toggle.textContent = expanded ? "Show fewer tags" : "Show all tags";
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
    list.className = "tag-legend-list";

    entries.forEach(function (entry) {
      const item = document.createElement("li");
      item.className = "tag-legend-item";

      const control = document.createElement(
        options && options.onToggle ? "button" : "div",
      );
      control.className = "tag-legend-control";
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
      icon.className = "tag-legend-icon";
      icon.textContent = entry.icon;
      icon.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.className = "tag-legend-label";
      label.textContent = entry.label;

      const count = document.createElement("span");
      count.className = "tag-legend-count";
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

  function formatTagLabel(value) {
    return value.replace(/_/g, " ").replace(/\b\w/g, function (char) {
      return char.toUpperCase();
    });
  }

  function getProductRuleForKey(key) {
    return PRODUCT_ICON_RULES.find(function (rule) {
      return normalizeTagKey(rule.label) === key;
    });
  }

  function getFacetIcon(key) {
    const productRule = getProductRuleForKey(key);
    return TAG_ICON_MAP[key] || (productRule && productRule.icon) || "🏷️";
  }

  function getFacetLabel(key) {
    const productRule = getProductRuleForKey(key);
    return (productRule && productRule.label) || formatTagLabel(key);
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

  function getHeaderLabel(header, options) {
    if (
      options &&
      options.headerLabels &&
      Object.prototype.hasOwnProperty.call(options.headerLabels, header)
    ) {
      return options.headerLabels[header];
    }

    return header === "Website" ? "Online" : header;
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

  function buildTagCounts(rows) {
    return rows.reduce(function (acc, row) {
      parseFacetList(row).forEach(function (key) {
        acc[key] = (acc[key] || 0) + 1;
      });
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
      const rowTags = parseFacetList(row);
      return state.legendFilters.some(function (tag) {
        return rowTags.indexOf(tag) !== -1;
      });
    });
  }

  /**
   * Build the table header row with sort controls.
   */
  function buildHeader(thead, headers, state, refresh, options) {
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
      label.textContent = getHeaderLabel(h, options);

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

  function applyFilter(rows, query) {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter(function (row) {
      return Object.keys(row).some(function (h) {
        return String(row[h] || "").toLowerCase().includes(q);
      });
    });
  }

  function updateCount(countEl, text, mapId) {
    if (!countEl) {
      return;
    }

    countEl.textContent = "";
    countEl.classList.add("entry-count");
    countEl.appendChild(document.createTextNode(text));

    if (!mapId || !document.getElementById(mapId)) {
      return;
    }

    const mapLink = document.createElement("a");
    mapLink.className = "count-map-link";
    mapLink.href = "#" + encodeURIComponent(mapId);
    mapLink.setAttribute("aria-label", "Jump to map");
    mapLink.title = "Map";
    mapLink.innerHTML = '<span aria-hidden="true">🗺️</span><span>Map</span>';
    mapLink.addEventListener("click", function (event) {
      const target = document.getElementById(mapId);
      if (!target) {
        return;
      }

      event.preventDefault();
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.focus({ preventScroll: true });
      window.history.replaceState(null, "", "#" + mapId);
    });
    countEl.appendChild(mapLink);
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
      legendMode: options.legendRenderer === "products" ? "products" : "tags",
      legendExpanded: false,
    };
    let allRows = [];
    let headers = [];

    function deriveHeaders(rows) {
      const preferredOrder = [
        "Name",
        "Tags",
        "Type",
        "Products",
        "Location",
        "Contact",
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

      if (
        rows.some(function (row) {
          return rowHasContact(row);
        }) &&
        seen.indexOf("Contact") === -1
      ) {
        seen.push("Contact");
      }

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

    options.calendarEvents = [];

    function refresh() {
      const sorted = state.sortCol
        ? sortRows(allRows.slice(), state.sortCol, state.sortDir)
        : allRows.slice();
      const legendFiltered = applyLegendFilter(sorted, state);
      const filtered = applyFilter(legendFiltered, state.query);
      renderRows(tbody, filtered, headers, options);
      renderCards(cardContainer, filtered, headers, options);
      if (options.mapId && window.filterDirectoryMap) {
        window.filterDirectoryMap(options.mapId, filtered);
      }
      if (countEl) {
        updateCount(
          countEl,
          filtered.length + " of " + allRows.length + " entries",
          options.mapId,
        );
      }
    }

    searchInput.addEventListener("input", function () {
      state.query = searchInput.value.trim();
      refresh();
    });

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
        renderTagLegend(
          options.legendId,
          allRows.reduce(function (tags, row) {
            return tags.concat(parseFacetList(row));
          }, []),
          {
            activeKeys: state.legendFilters,
            counts: buildTagCounts(allRows),
            expanded: state.legendExpanded,
            onToggle: handleLegendToggle,
            onExpandToggle: handleLegendExpandToggle,
          },
        );
      }
    }

    // Fetch & parse CSV
    Promise.all([
      loadCSVTexts(options),
      options.calendarCsvPath
        ? fetch(options.calendarCsvPath)
            .then(function (response) {
              if (!response.ok) {
                throw new Error(
                  "HTTP " + response.status + " loading " + options.calendarCsvPath,
                );
              }
              return response.text();
            })
            .then(parseCSV)
        : Promise.resolve([]),
      options.calendarSourcesPath
        ? fetch(options.calendarSourcesPath)
            .then(function (response) {
              if (!response.ok) {
                throw new Error(
                  "HTTP " + response.status + " loading " + options.calendarSourcesPath,
                );
              }
              return response.text();
            })
            .then(parseCSV)
        : Promise.resolve([]),
    ])
      .then(function (results) {
        const texts = results[0];
        options.calendarEvents = results[1];
        options.calendarSources = results[2];
        allRows = texts.reduce(function (rows, text) {
          return rows.concat(parseCSV(text));
        }, []);
        if (options.dedupeByName) {
          allRows = dedupeRowsByName(allRows);
        }
        if (allRows.length === 0) {
          tbody.innerHTML =
            '<tr><td class="no-results">No data available.</td></tr>';
          renderCards(cardContainer, [], headers, options);
          rerenderLegend();
          return;
        }
        headers = deriveHeaders(allRows).filter(function (header) {
          if (
            CONTACT_HEADERS.indexOf(header) !== -1 &&
            header !== "Contact"
          ) {
            return false;
          }
          if (header === "Latitude" || header === "Longitude") {
            return false;
          }
          if (HIDDEN_SOCIAL_HEADERS.indexOf(header) !== -1) {
            return false;
          }
          if (
            header === "Address" &&
            !(options && options.showAddress) &&
            Object.prototype.hasOwnProperty.call(allRows[0], "Location")
          ) {
            return false;
          }
          if (
            header === "Type" &&
            Object.prototype.hasOwnProperty.call(allRows[0], "Tags")
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
        buildHeader(thead, headers, state, refresh, options);
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
    }

    function handleLegendExpandToggle() {
      state.legendExpanded = !state.legendExpanded;
      rerenderLegend();
    }
  }

  // Expose globally
  window.initTable = initTable;
  window.renderProductLegend = renderProductLegend;
  window.renderTagLegend = renderTagLegend;
})();
