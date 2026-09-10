# 🏙️ URBANFORMA

**Design the cities of tomorrow.**

URBANFORMA is the marketing site for an urban-intelligence platform — built as a
fast, dependency-light, fully responsive static website in a bright **light
pastel theme** (indigo/blue, analytics-dashboard style). The hero features a
**real-time, interactive 3D city** rendered with WebGL (Three.js): a daylight
skyline with roads, parks, a **fluid animated river**, **road bridges**,
spinning **wind turbines**, an **elevated monorail with a moving train**, and
data-flow overlays — no video or pre-rendered footage needed.

> Plan smarter cities with GIS, 3D visualization, environmental intelligence
> and optimization — from site to skyline.

---

## ✨ Features

- **Interactive 3D hero visual** — a daylight city built entirely in code, with:
  - drag to **orbit** and scroll to **zoom** (custom lightweight orbit controls),
  - gentle **auto-rotate** when idle,
  - ~260 light-glass **buildings** on a procedural street grid with parks,
  - a meandering **river** with animated flowing water + embankments,
  - two **road bridges** that cross the water,
  - spinning **wind turbines** (green energy),
  - an elevated **monorail loop with a moving train** on pillars,
  - animated **data layers** (parcel / mobility / energy flow lines with pulses),
  - a soft glowing **analysis scan bar** sweeping the grid,
  - a graceful 2D fallback when WebGL is unavailable.
- **Complete landing-page structure**:
  1. Fixed, blur-on-scroll **navigation** with mobile menu
  2. **Hero** with CTAs + 3D city visual
  3. **Trusted-by** marquee + animated stat counters
  4. **Capabilities** — Site Planning, 3D Cities, Analysis, BIM
  5. **Workflow** — Choose → Design → Analyze → Optimize
  6. **"See your city differently"** — a pure HTML/CSS/SVG analytics
     dashboard mock-up (stat tiles, animated bars, line & donut charts),
     **no images**
  7. **"Built for better cities"** call to action
  8. Multi-column **footer**
- **Scroll-reveal** animations (with `prefers-reduced-motion` respected)
- **Animated count-up** statistics
- **Fully responsive** (desktop → tablet → mobile)
- **Zero build step** — plain HTML, CSS and vanilla JS

---

## 🧱 Tech Stack

| Purpose       | Choice                                            |
| ------------- | ------------------------------------------------- |
| 3D rendering  | [Three.js](https://threejs.org/) r128 (vendored)  |
| Styling       | Plain CSS with custom properties (design tokens)  |
| Interactivity | Vanilla JavaScript (ES5-safe IIFE, no framework)  |
| Assets        | None — all visuals are code (WebGL + CSS/SVG)      |

Three.js is **vendored** in `vendor/three.min.js`, so the site works fully
offline with no CDN or `npm install` required.

---

## 📁 Project Structure

```
urbanforma/
├── index.html             # Page markup (all sections)
├── css/
│   └── styles.css         # Design system + all styles
├── js/
│   ├── city3d.js          # Three.js procedural 3D city + controls
│   └── main.js            # Nav, scroll reveal, stat counters
├── vendor/
│   └── three.min.js       # Three.js r128 (vendored, offline-ready)
├── package.json           # Optional convenience scripts
└── README.md

(No `assets/` folder — every visual, including the analytics dashboard and the
floating data-globe in the 3D scene, is generated in code.)
```

---

## 🚀 Getting Started

Because the site loads local scripts, serve it over HTTP (rather than opening
the file directly). Any static server works.

**Option A — Python (built in on most machines):**

```bash
# from the project root
python3 -m http.server 8080
# then open http://localhost:8080
```

**Option B — Node:**

```bash
npm start                 # uses npx serve on port 8080
# or
npx serve .
```

That's it — there is nothing to compile or install.

---

## 🎨 Design System

All visual tokens live in `:root` in `css/styles.css`:

- **Theme:** bright light — soft lavender-white background (`#f5f5fc`, white cards)
- **Primary accent:** indigo (`#7b6ff0`)
- **Secondary accent:** sky blue (`#4f8ef7`)
- **Highlights:** orange (`#ff9f43`), coral, mint (the pastel dashboard set)
- **Ink text:** deep indigo-navy (`#1e2244`)
- **Signature gradient:** indigo → blue (`linear-gradient(100deg, …)`)
- **Type:** Inter / system UI stack, heavy 800-weight display headings

Change the brand colors, radii, or spacing once in `:root` and the whole site
updates. (The 3D scene's daylight palette is set inside `js/city3d.js` —
lights, fog, water, glass and ground tones.)

---

## 🔧 Customization

- **City look & feel** — tweak `js/city3d.js`:
  - grid density (`n`), building height curve, park ratio and glass palette in
    `buildCity()`,
  - the river path and width via `riverCurve` / `RIVER_HALF`; bridges in
    `buildBridges()`, turbines in `buildTurbines()`, the monorail loop & train
    in `buildMonorail()`, and flow-line colors/paths in `buildDataLayers()`,
  - water flow and scan-bar speed in `animate()`,
  - auto-rotate speed and zoom limits in the `orbit` object.
- **Section content** — edit directly in `index.html`.
- **Partner names / stats** — the trust marquee and `.stat__num` elements
  (`data-count`, `data-suffix`, `data-decimals`) are in `index.html`.

---

## 🌐 Browser Support

Works in all modern evergreen browsers (Chrome, Edge, Firefox, Safari) with
WebGL. When WebGL is unavailable the hero automatically shows a styled 2D
fallback panel, so content is never lost.

---

## 📄 License

Released for demonstration purposes. Free to adapt for your own projects.
The vendored Three.js library is copyright © its authors and distributed under
the MIT license.
