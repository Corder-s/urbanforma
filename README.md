# 🏙️ UrbanForma — Smart City Planning Platform

UrbanForma is the smart-city planning platform (Urban Planning · GIS · Site
Planning · 3D City Modeling · Environmental Analysis · Smart Infrastructure ·
Optimization · BIM).

The frontend is built out across a public marketing site, a full authentication
layer, and an authenticated workspace with six domain modules — roughly **35.4k
lines of TypeScript/React across 280 files**. All data is served by mock
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
| **Reports** | Five report types, 15 configurable sections (enable + reorder), live document preview, revision/status tracking, print → PDF with app chrome stripped |
| BIM · Settings | Route-level "coming soon" placeholders |

### Cross-cutting

- **Session handling** — restore-on-startup (no login flash), shape-guarded
  storage reads that can't crash on corruption, cross-tab sign-out sync via the
  `storage` event, and expiration/refresh hooks ready for JWT `exp`.
- **Accessibility** — focus trapping in dialogs, `aria-*` throughout, visible
  focus rings, and `prefers-reduced-motion` respected everywhere animations
  exist.
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
- **3D renders on demand.** `CityScene` only calls `renderer.render()` when the
  camera moved or something was invalidated, and hover raycasting resolves at
  most once per frame from a pending pointer position.

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
| `/app/bim` · `/app/settings` | Coming-soon placeholders |

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
    reports/      catalog (types + 15 sections) · report.service (CRUD, local)
                  reportModel (reads the other 5 services) · reportData (pure
                  derivations) · hooks (useReports, useReportModel) · components
                  (Workspace, List, ConfigPanel, Preview, Sections, Charts,
                  Tables, States, ConfirmDialog)
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
- **Reports print pagination.** Browsers cannot number physical pages (`@page`
  margin boxes are unsupported), so the document uses numbered sections, a
  repeated table header and a document-control footer; true page numbers arrive
  with the backend PDF renderer.
- **No test suite yet.** `npm run typecheck` and `npm run build` are the only
  automated gates.
