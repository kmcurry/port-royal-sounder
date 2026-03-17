# Port Royal Sounder

**The Local's Guide to Beaufort County**

A lightweight, static directory website listing local activities, food resources, and drink spots — including farms, seafood suppliers, markets, bakeries, and breweries — around **Beaufort and Port Royal, South Carolina**.

---

## Repository Structure

```
/
├── index.html          # Landing page with navigation cards
├── style.css           # Site-wide styles (responsive, no framework)
├── scripts/
│   └── table.js        # Vanilla JS: CSV loader + searchable/sortable table
├── data/
│   ├── activities.csv  # Sample activity listings
│   ├── bakeries.csv   # Sample bakery listings
│   ├── breweries.csv  # Sample brewery listings
│   ├── farms.csv       # Sample farm listings
│   ├── markets.csv     # Sample market listings
│   └── seafood.csv     # Sample seafood listings
└── pages/
    ├── activities.html # Activities category page
    ├── bakeries.html   # Bakeries category page
    ├── breweries.html  # Breweries category page
    ├── farms.html      # Farms category page
    ├── markets.html    # Markets category page
    └── seafood.html    # Seafood category page
```

---

## Features

- **Landing page** with a responsive card grid linking to each category.
- **Data-driven tables** — each category page loads a CSV file and renders a live-searchable, sortable table using plain JavaScript (no libraries).
- **Map placeholder** on every page, ready for a future [Leaflet.js](https://leafletjs.com/) integration.
- **Pure static** — no build step, no server, no frameworks; works directly from the file system or GitHub Pages.

---

## Running Locally

Because the JavaScript uses `fetch()` to load CSV files, you need a local HTTP server (browsers block `fetch` on `file://` URLs).

### Option 1 — Python (built-in)

```bash
cd port-royal-sounder
python3 -m http.server 8080
```

Open <http://localhost:8080> in your browser.

### Option 2 — Node.js `npx serve`

```bash
npx serve .
```

### Option 3 — VS Code Live Server extension

Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, right-click `index.html`, and choose **Open with Live Server**.

---

## GitHub Pages Deployment

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Source**, select **Deploy from a branch** and choose `main` (or `master`) with the root (`/`) folder.
4. Click **Save**. GitHub Pages will publish the site at:

   ```
   https://<your-username>.github.io/<repo-name>/
   ```

No build step is required — GitHub Pages serves the static files directly.

> **Note:** All links in the site are relative, so the site works correctly regardless of the sub-path it is served from.

---

## Adding More Categories

1. Add a new CSV file to `/data/` (columns: `Name`, `Type`, `Location`, `Season`).
2. Copy `pages/farms.html` to a new file (e.g., `pages/markets.html`) and update the `csvPath` in the `initTable()` call.
3. Add a card for the new page in `index.html`.

---

## License

[MIT](LICENSE)
## Event feed importer

The calendar can refresh subscribed iCal sources into `data/events.csv` with:

```bash
node scripts/import-events.js
```

This is also run automatically by GitHub Actions in `.github/workflows/update-events.yml`.

## Buttondown newsletter sending

The weekly newsletter issue can be queued in Buttondown with:

```bash
BUTTONDOWN_API_KEY=your-token node scripts/send-newsletter.js
```

This is also run automatically by GitHub Actions in `.github/workflows/send-newsletter.yml`.
