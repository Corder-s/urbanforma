# 🏙️ UrbanForma — Smart City Planning Platform

UrbanForma is the smart-city planning platform (Urban Planning · GIS · Site
Planning · 3D City Modeling · Environmental Analysis · Smart Infrastructure ·
Optimization · BIM).

The frontend is built out across a public marketing site, a full authentication
layer, and an authenticated workspace with seven domain modules — roughly
**48.2k lines of TypeScript/React across 327 files**. All data is served by mock
service layers written to be swapped for a Java Spring Boot + JWT API without
touching the UI.

> The earlier static marketing prototype is kept for reference in
> [`legacy/`](./legacy).

---

## 🧩 What's built

### Public

- **Landing page** — hero, intro, feature grid, workflow, analysis preview,
  sustainability, philosophy, CTA, footer, with scroll-reveal and an animated
  SVG city scene whose demo controls switch between three real cameras over the
  same site geometry: isometric **3D**, top-down **Map** (grid, footprints,
  labels) and aerial **Satellite** (rooftop shadows, canopy, vignette).
- **Auth** — login (premium split-screen with an animated isometric smart-city
  built in pure SVG/CSS), register, forgot-password, logout. Inline validation
  (no alerts), password visibility toggle, remember-me, loading states with
  duplicate-submission blocking, and clearly-labelled social buttons that are
  honest *coming soon* placeholders rather than fake OAuth.

### Authenticated workspace (`/app`)

App shell with a collapsible sidebar, header (search, notifications, user
menu), mobile drawer, and breadcrumbs.

| Module | Highlights |
| --- | --- |
| **Dashboard** | Portfolio overview, continue-working, recent projects, attention panel, environmental snapshot, workflow stages, activity feed, quick actions |
| **Projects** | Grid/list views, filter + sort + search, create flow with draft persistence, project detail, row/card menus with confirm dialogs |
| **Planning Studio** | Site canvas with building / road / landscape / water / site / annotation layers, inspector, object geometry + area math |
| **Analysis** | Environmental engine (solar, wind, heat, green, carbon, density, land-use, open-space, mobility) with 9 map overlays and per-category inspectors |
| **Optimization** | Scenario generation with goals/weights/constraints, scoring, trade-offs, comparison, performance charts, pluggable provider |
| **Visualization** | 2D map view + **three.js** 3D city scene, camera presets, layer visibility, saved views, presentation mode with slideshow + storyboard |
| **Reports** | Five report types, 18 configurable sections (enable + reorder) incl. a plan-view figure (Step 12 map layers), an axonometric massing model drawn from the live dataset and a BIM model & quantities section, live document preview, revision/status tracking, print → PDF with app chrome stripped |
| **BIM** | Toolbar project + model-record selectors, derived element index (site → building → level → component) with IFC-style GlobalIds and property sets, model tree with debounced search (name · id · GlobalId · category · level), properties inspector, typed filters, 8 BIM layers, metric cards, 2D/3D viewport reuse (scene-synced, no second engine), 360° element inspection (the target isolated and orbited on a turntable with play/pause, direction, three speeds, a live azimuth readout and ←/→ stepping), versions & revisions, coordination checks against planning/analysis/optimization/reports plus a BIM → Analysis quantity feed, issue tracking, recent-models dashboard, honest import pipeline states |
| **Settings** | Thirteen panels: profile, account, accessibility, appearance (light / dark / system + three accents), units (metric / imperial with a live preview table), map & GIS defaults (view, basemap, camera, zoom, overlays), visualization defaults, BIM defaults, notification categories, privacy, data & storage (inventory, per-category clear, JSON export), about, and a danger zone — all driven by one typed `AppSettings` tree with debounced persistence, a Saved/Saving indicator that only claims "Saved" once the bytes reached storage (blocked or full localStorage is reported, not hidden), corruption fallback, cross-tab sync and `?section=` deep links |

### Cross-cutting

- **Session handling** — restore-on-startup (no login flash), shape-guarded
  storage reads that can't crash on corruption, cross-tab sign-out sync via the
  `storage` event, and expiration/refresh hooks ready for JWT `exp`.
- **Accessibility** — focus trapping in dialogs, `aria-*` throughout, visible
  focus rings, and `prefers-reduced-motion` respected everywhere animations
  exist.
- **Preferences** — one typed settings tree in `localStorage`
  (`urbanforma.settings`, schema-versioned, sanitized on read, migrated or
  discarded when corrupt), applied as `data-*` attributes on `<html>` *before*
  the first paint so a dark theme never flashes light. Units are centralized in
  `features/settings/lib/units.ts` and delegated to by planning geometry, the
  project service, BIM volumes and the report builders — so the header's
  metric/imperial switch and Settings → Units are the same setting, and there is
  one copy of the conversion math.
- **360° inspection** — `CameraRig` grew a turntable (`autoRotate`, driven in
  degrees per second so a 120 Hz panel does not spin twice as fast), a
  tight-framing `inspectBounds` that lifts the orbit centre to mid-height and
  relaxes the site-wide 20 m minimum distance, exact-angle `nudgeAzimuth`
  stepping and an azimuth read. `CityScene.inspect360` frames a spatial object
  and publishes the azimuth ~8× a second straight into a DOM node — never into
  React state, which would re-render the model tree for one number. BIM isolates
  the target by narrowing the list handed to the renderer
  (`isolateSceneObjects`, applied *after* the scene-mode filter so it works in
  City / Model / Combined alike); the dataset is never edited, and an element
  with no geometry of its own keeps the scene instead of emptying it. Entering an
  inspection from a 2-D plan switches the shared view mode rather than opening a
  second viewport, and leaving it flies back to the pose the user was at.
- **Print / PDF** — `@page` A4 geometry plus break control (`report-block` stays
  together, `report-table` breaks with a repeated `<thead>`, headings never end a
  page alone) and `print:hidden` on the shell chrome, so a report prints as a
  document rather than a screenshot of the app.

---

## ⚡ Performance

The app is code-split per route and tuned so the public pages never pay for the
authenticated workspace.

**Initial paint** (before any route chunk):

| | before | after | change |
| --- | --- | --- | --- |
| JS + CSS (raw) | 361 KB | **280 KB** | −22.4% |
| JS + CSS (gzip) | 99 KB | **83 KB** | −16.0% |
| Web fonts | ~125 KB, 5 static weights, third-party, **render-blocking** | **47 KB**, 1 self-hosted variable font, preloaded | −62% |

What drives it:

- **Route-level lazy loading** — every page is a `React.lazy` chunk.
- **`AppShell` is lazy too.** It was statically imported by the router, so the
  sidebar, header, mobile drawer and their icons were on the critical path of
  *every* visitor — including the landing page, which uses none of it.
- **Vendor chunks that actually split.** The old `manualChunks` checked
  `id.includes("react")` *before* `id.includes("lucide-react")`; since
  "lucide-react" contains "react", the icon branch never fired and ~159 icons
  were folded into `react-vendor` — a 273 KB blob on every page's critical
  path. Now `react-vendor` (139 KB), `router-vendor` (63 KB), `icons-vendor`
  (64 KB) and `three-vendor` (520 KB, loaded only by the 3D routes) are
  separate and cache independently.
- **Self-hosted Inter variable font.** Replaces the render-blocking
  `fonts.googleapis.com` stylesheet and its two third-party preconnects with
  one preloaded same-origin woff2 covering weights 100–900. `unicode-range`
  keeps the latin-ext file from downloading unless a glyph needs it.
- **Intent-based route prefetching** (`src/app/useLinkPrefetch.ts`) — one
  delegated `document` listener warms a route chunk after 80 ms of hover or on
  keyboard focus, and immediately on click (which is what makes it work on
  touch). Covers every `<Link>` in the app with zero per-component wiring.
  Idempotent, and skipped on `saveData` / 2G connections.
- **Login prefetches its destination** while the auth call is in flight,
  overlapping the chunk download with the network round trip.
- **No `transition-property: all`.** All 26 `transition-all` utilities were
  narrowed to the properties that actually animate (three of them needed an
  explicit arbitrary-value list, e.g. `transition-[width,…]` for the header
  search field). `all` makes the browser diff every animatable property on
  every style recalc — expensive when it's on cards rendered in long lists.
- **`text-rendering: optimizeSpeed`** instead of `optimizeLegibility`, which
  forces per-glyph kerning/ligature passes and is a documented bottleneck on
  long strings (tables, inspectors, project lists).
- **Settings stays light.** `/app/settings` is its own chunk (53 KB raw,
  15.5 KB gzip) that pulls in no 3D engine, GIS renderer, PDF writer or BIM
  model — only the settings feature, the auth session and shared UI primitives,
  which the built chunk's import list confirms. The dependency arrow
  points *at* settings: modules read their defaults through tiny synchronous
  accessors in `settings.service` (`getMapDefaults`, `getVisualizationDefaults`,
  `getBimDefaults`, `getRenderQualityCap`), never through the settings UI.
- **3D renders on demand.** `CityScene` only calls `renderer.render()` when the
  camera moved or something was invalidated, and hover raycasting resolves at
  most once per frame from a pending pointer position. The one deliberate
  exception is a playing 360° inspection, where the camera moves every frame by
  definition — and it starts paused when motion is reduced, so on-demand
  rendering is the default state. Its azimuth readout is written straight to a
  DOM node (~8× a second), and the pose callback still only fires once the camera
  *settles*, so an orbiting camera never re-renders React.
- **Heavy modules load on demand, not on the static graph.** Three services were
  reachable from routes that never call them, so they were bundled into those
  routes' blocking first paint. Each is now imported inside the async function
  that actually uses it (all of them already had loading states, so nothing the
  user sees changed): the demo **analysis engine** (48.8 KB of source, an 11.4 KB
  gzip chunk) behind `runAnalysis` / `getAnalysis`, which BIM coordination,
  Reports and Optimization only *read*; the **optimization service** (12.4 KB
  gzip) and the **planning service + dataset** (6.8 KB gzip) behind BIM's
  coordination loader; and the scenario machinery behind `useScenarioOptions`,
  which `useVisualizationState` reaches on every map route — including BIM, which
  never shows a scenario picker. `rampColor` and `ENGINE_VERSION` moved into
  two tiny modules of their own so a colour ramp or a version string no longer
  implies the engine.
- **The settings service is split by criticality.** The provider wraps the whole
  app, so everything in `settings.service.ts` was in the entry chunk of every
  page. The data-management surface (the 10-category storage table, inventory,
  per-category clear, JSON export) is used by exactly two Settings panels and now
  lives in `settingsData.service.ts`, inside the lazy Settings chunk. One storage
  key, one cache and one copy of the sanitising logic; the dependency is one-way.
- **Memoised map layers are not defeated by the zoom scale.** Every SVG layer is
  `memo`'d and takes the view scale to keep hairlines screen-space sized (`1 /
  scale`) and to decide when labels are worth drawing — both *threshold*
  decisions, but the raw scale changes every frame of a gesture, so all six to
  eight layers re-rendered 60× a second. They now receive
  `quantizeLayerScale(view.scale)`, a 4% multiplicative bucket: measured across
  realistic gesture profiles that is **53% fewer layer re-renders** for a wheel
  burst and a trackpad pinch, neutral for wide-range animations, and still zero
  for a pan. The `<g transform>` keeps the exact scale, so no geometry moves and
  hit-testing is unaffected; the only visible effect is a hairline within 1.98%
  of 1 px and a label threshold that trips up to 4% early.

**Route payload** (measured on the built chunk graph — every number is the
initial payload plus that route's chunk plus its exclusive dependencies, gzip):

| first paint | before | after | change |
| --- | --- | --- | --- |
| initial JS, before any route (3 requests) | 76.22 KB | **75.21 KB** | −1.3% |
| initial CSS | 14.47 KB | 14.47 KB | — |
| `/` landing | 102.59 KB | **101.57 KB** | −1.0% |
| `/login` | 100.44 KB | **99.42 KB** | −1.0% |
| `/app` shell | 97.06 KB | **96.04 KB** | −1.1% |
| `/app` dashboard | 110.41 KB | **109.39 KB** | −0.9% |
| `/app/visualization` | 200.15 KB | **173.29 KB** | **−13.4%** |
| `/app/bim` | 222.69 KB | **201.59 KB** | **−9.5%** |
| `/app/optimization` | 184.10 KB | **175.06 KB** | −4.9% |
| `/app/reports` | 201.96 KB | **192.84 KB** | −4.5% |
| `/app/planning` | 133.22 KB | **132.49 KB** | −0.5% |
| `/app/settings` | 110.77 KB | **110.74 KB** | −0.0% |
| `/app/analysis` | 163.83 KB | 164.76 KB | +0.6% |
| 3-D city (`CityView`, lazy) | 200.54 KB | **185.38 KB** | −7.6% |
| scenario 3-D preview (lazy) | 216.74 KB | **190.67 KB** | −12.0% |

Analysis is the one route that grew (+0.9 KB): it genuinely runs the engine, so
it now carries it explicitly instead of inheriting it from a shared chunk. The
whole dist grew 0.7% (3 extra chunk boundaries) to move 20–27 KB off four
routes' blocking paths.

Rejected after measuring: letting Rollup place each **icon** with its routes
instead of one `icons-vendor` chunk. It made the landing page 2.0 KB lighter but
the BIM route 9.7 KB *heavier* — 53 separate icon chunks totalling 17.6 KB gzip
versus 14.3 KB for all 186 icons together, because gzip cannot exploit the
near-identical icon bodies across files — plus 75 more requests and 34 KB more
dist. One cached icons chunk wins.

**Remaining bottlenecks** (measured, deliberately not touched):

- `three-vendor` is 519.6 KB raw / **131.2 KB gzip** and is the largest single
  download on any 3-D route. It is tree-shaken (922 KB of the 1.2 MB module
  survive), route-deferred behind `CityView` / the two city previews, and cached
  across every route — but three.js ships as one module, so shrinking it further
  means unsupported deep imports or dropping 3-D features.
- The `BimPage` chunk is 136.0 KB raw / **31.4 KB gzip**, the largest route
  chunk. ~50 KB of it renders only in a non-default mode or behind a dialog
  (Issues panel + inspector + dialog, Import dialog, Versions panel). Deferring
  those would cut roughly 8–10 KB gzip from BIM's first paint, at the cost of a
  Suspense fallback the first time a panel or dialog opens — a behaviour change,
  so it is left as a decision rather than taken silently.
- `WaterLayer`-style chunk *names* are Rollup's, not meaningful: that chunk is
  the shared visualization core (map layers + spatial data), and the chunk named
  `IconButton` is the planning dataset. Read the module list, not the name.

---

## 🧱 Tech stack

React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · React Router v6 ·
three.js · lucide-react · Inter (self-hosted variable).

## 🚀 Run

```bash
npm install
npm run dev        # http://localhost:5173/
npm run build      # production build → dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
```

Dev sign-in uses the mock auth service: **any valid email + a password of 6 or
more characters** works. There is no hardcoded credential.

## 🔐 Routes

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing page |
| `/login` | Animated split-screen sign-in |
| `/register` | Create account |
| `/forgot-password` | Mocked reset-link flow |
| `/logout` | Clears session, redirects to `/login` |
| `/app` | Dashboard (protected) |
| `/app/projects` · `/new` · `/:projectId` | Projects list · create · detail |
| `/app/planning` | Planning Studio |
| `/app/analysis` | Environmental analysis |
| `/app/optimization` | Scenario optimization |
| `/app/visualization` | 2D map + 3D city studio |
| `/app/reports` | Report workspace (`?projectId=<id>&reportId=<id>`) |
| `/app/bim` | BIM integration & model coordination (`?projectId=<id>&elementId=<id>`) |
| `/app/settings` | Settings workspace (`?section=<id>` deep links) |

Signed-out visitors hitting `/app/*` are redirected to `/login`; signed-in
visitors hitting `/login` are sent to `/app`.

## 📁 Structure

```
src/
  app/            App · router · routeLoaders · useLinkPrefetch
  components/
    ui/           Button (primary · secondary · secondaryDanger · ghost ·
                  onBrand · onBrandGhost) · Input · PasswordInput · Checkbox
                  Select · FormSelect · Textarea · IconButton (xs · sm · md)
                  Badge · Divider
                  Avatar · Logo · Loader · PanelDrawer · useDialogBehavior
    auth/         AuthLayout · LoginForm · CityVisual · ProtectedRoute · GuestRoute
    landing/      Hero · Features · Workflow · Analysis · Sustainability · CTA …
    dashboard/    PortfolioOverview · RecentProjects · QuickActions · ActivityFeed …
    layout/       AppHeader · Sidebar · SidebarNav · MobileSidebar · PageHeader
    navigation/   NavItem · navConfig
    projects/     ProjectCard · ProjectRow · Toolbar · States
  features/
    auth/         AuthProvider · auth.service · auth.types
    projects/     project.service · data · types · components
    planning/     canvas layers · geometry lib · planning.service · state hook
    analysis/     analysis.engine · overlays · charts · map · inspector
    optimization/ providers · scoring · scenarios · workspace · comparison
    visualization/ 3d/ (three.js CityScene, meshes, CameraRig) · map/ (2D layers)
                  hooks (camera, layers, saved views, presentation, slideshow)
    reports/      catalog (types + 18 sections) · report.service (CRUD, local)
                  reportModel (reads the other 6 services) · reportData (pure
                  derivations) · hooks (useReports, useReportModel) · components
                  (Workspace, List, ConfigPanel, Preview, Sections, Figures,
                  Charts, Tables, States, ConfirmDialog)
    settings/     types (AppSettings tree + section metadata) · lib (units
                  conversion & formatting, applyPreferences, sections, labels,
                  useMediaQuery, download) · settings.service (storage, sanitize
                  + migrate, merge/patch, export, data inventory & clears, and
                  the defaults other modules read) · hooks (useSettings provider
                  with debounced writes + cross-tab sync, useUnitPreferences) ·
                  components (SettingsPage, SettingsNav, controls, ConfirmAction
                  and the 13 section panels)
    bim/          types · data (demo model records, layers, facets, issue seeds,
                  formats) · lib/bimModel (derives the element index + quantities
                  + planning links + analysis inputs + coordination checks from
                  the live spatial dataset — the only place geometry is walked) ·
                  bim.service (getModels/getModel/getElements/getElement/
                  searchElements/getProperties/getIssues/createIssue/updateIssue/
                  uploadModel/getBimAnalysisInputs — local today, each documented
                  with the REST endpoint it becomes) · hooks
                  (prefs, models, filters, issues, coordination, workspace) ·
                  components (Workspace, Dashboard, Toolbar, ModelTree,
                  PropertiesInspector, FiltersPanel, LayersPanel, MetricsCards,
                  Viewport, CoordinationPanel, VersionsPanel, IssuesPanel,
                  IssueInspector, IssueDialog, ImportDialog, StatusBar, States)
  layouts/        AppShell (lazy) · shellContext
  pages/          public pages + app/ workspace pages
  styles/         fonts.css · tokens.css · globals.css (incl. print stylesheet)
public/fonts/     self-hosted Inter woff2 + SIL OFL license
legacy/           previous static prototype (reference only)
```

## 🎨 Design tokens

Background `#F5F9FF` · Surface `#FFFFFF` · Primary `#2563EB`
(primary-dark `#1D4ED8`) · Accent cyan `#06B6D4` · Text `#0F172A` ·
secondary text `#64748B` · Success `#16A34A` · Border `#DCE6F2`. Blue/cyan
gradients are used sparingly.

Those are the **light** values, and they are the values the app has always
shipped. `tokens.css` declares every colour as an RGB triplet (`--color-*-rgb`)
with hex aliases, and a theme is nothing but a re-declaration of the same
triplets under an attribute selector — `html[data-theme="dark"]` (plus
`@media (prefers-color-scheme: dark)` when the user chose *System*),
`[data-accent="cyan"|"slate"]`, `[data-contrast="high"]` — which keeps Tailwind's
opacity modifiers (`bg-primary/10`) working in every theme. Two tokens are
deliberately never themed: `on-brand` (foreground on brand fills must stay white)
and `scrim` (a modal backdrop must stay a scrim). Interface preferences ride the
same mechanism as `data-motion`, `data-focus` and `data-scale`.

The Tailwind key is spelled `"on-brand"` on purpose: a camelCase `onBrand` key
generates nothing, because Tailwind does not kebab-case theme keys, which left
~40 existing `text-on-brand` / `bg-on-brand` utilities dead (primary buttons were
inheriting their label colour).

Map, 3D, BIM and chart canvases keep their light drawing surface by design —
their palettes are calibrated for legibility on white, so inverting them would
misrepresent the data. They sit inside themed chrome instead, and Settings says
so out loud.

## 🗺️ Known follow-ups

- **Cross-feature imports.** `analysis` and `optimization` each import ~30
  symbols from `visualization` (shared GIS types + spatial data), and
  `visualization` imports back from `optimization` (e.g. `ConfirmDialog`). It
  works, but the shared kernel should be promoted to a neutral module so
  features stop depending on each other bidirectionally.
- **Backend.** Every `*.service.ts` is a mock with the real REST contract
  documented inline — swap them for Spring Boot + JWT calls. Reports are the
  clearest case: `report.service.ts` stores configuration in `localStorage` and
  `reportModel.ts` assembles the document from five service calls, which is
  exactly the shape of a future `GET /api/projects/:id/report-model` plus a
  server-side PDF renderer.
- **BIM processing.** `bim.service.ts` registers model records and derives the
  element index from the project's own spatial dataset in the browser; file
  upload reports `Failed — no BIM processing service connected` rather than
  pretending to parse. The intended backend is Java/Spring → BIM processing
  service → IFC engine (e.g. IfcOpenShell/web-ifc) → object storage, after which
  `deriveElements` is replaced by the server's element index and the UI does not
  change. `getBimAnalysisInputs` is the matching seam toward Step 13: it hands
  the Analysis service per-building height, footprint, floor area, volume and
  facade/roof surfaces, while the analysis engine itself stays untouched.
- **Reports print pagination.** Browsers cannot number physical pages (`@page`
  margin boxes are unsupported), so the document uses numbered sections, a
  repeated table header and a document-control footer; true page numbers arrive
  with the backend PDF renderer.
- **Settings is frontend-only.** Profile fields are written into the session
  blob (`auth.service.updateProfile`), notification categories gate the header's
  preview items, and the two privacy switches for analytics and usage data are
  disabled reservations — nothing is transmitted anywhere, because there is no
  server to transmit to. The panels say so rather than implying a consent flow
  that does not exist. With Spring Boot these become `GET/PATCH /api/me/settings`
  (the provider's `loading → ready` state machine and its debounced `patch` are
  already shaped for it), real notification delivery, password change and avatar
  upload.
- **No test suite yet.** `npm run typecheck` and `npm run build` are the only
  automated gates.
