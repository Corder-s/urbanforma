# 🏙️ UrbanForma — Smart City Planning Platform

UrbanForma is the smart-city planning platform (Urban Planning · GIS · Site
Planning · 3D City Modeling · Environmental Analysis · Smart Infrastructure ·
Optimization · BIM).

This repository currently contains **Step 1 (frontend foundation)**,
**Step 2 (premium animated login page)** and **Step 3 (real frontend
authentication layer)**. The full landing page and the application workspace
(dashboard, projects, 3D studio, analysis, reports, BIM, settings) are
intentionally **not** built yet.

> The earlier static marketing prototype is kept for reference in
> [`legacy/`](./legacy).

---

## ✨ Step 2 — Login page

- **Premium split-screen** — desktop **42% auth panel / 58% city visual**
- **Animated isometric smart-city** (pure SVG/CSS, no heavy 3D library):
  buildings rise in sequence, park with swaying trees, roads/pedestrian paths,
  a river + bridge, rooftop solar panels, drifting clouds, glowing data paths
  with moving points and floating particles
- **Floating storytelling labels**: 3D City Modeling · Environmental Analysis
  · Smart Planning · Data Driven Decisions · Sustainable Future
- **Functional form**: required/format email validation, required +
  min-length password, **inline** errors (no alerts), loading state
  (*Signing in…* with spinner, duplicate submissions blocked)
- **Password visibility toggle** (Lucide `Eye` / `EyeOff`) with accessible
  `aria-label`
- **Remember me** (persists email + uses the appropriate storage),
  **Forgot password?** → `/forgot-password`, **Create account** → `/register`,
  **Back to Home** → `/`
- **Social buttons** (Google / Microsoft / GitHub) clearly marked as
  development placeholders — they show a *coming soon* note, no fake OAuth
- **Auth abstraction** (`AuthProvider` / `useAuth`) with a mock service built
  to be replaced by the future Java Spring Boot + JWT API without touching UI
- Successful dev login → protected `/app`; failures show a clean inline message
- Subtle **mouse parallax** on the city (desktop only — disabled on touch
  devices and under `prefers-reduced-motion`)
- Responsive (compact city banner on mobile, form as the focus), keyboard
  navigable, visible focus states, labelled inputs/errors

### Demo sign-in
Any syntactically valid email + a password of **6+ characters** (shown on the
page). Signing in with `user@urbanforma.app` resolves to the documented
development user **“UrbanForma User / Urban Planner.”** No production
credentials are hardcoded.

---

## 🔐 Step 3 — Authentication layer

Clean, layered flow — **the UI contains no auth business logic**:

```
UI (pages/components)
   └─ useAuth()
        └─ AuthProvider (auth store / React context)
             └─ auth.service.ts   ← replace here for the real backend
                    └─ (future) POST /api/auth/login → Java Spring Boot → JWT/session
```

- **`useAuth()`** exposes exactly: `user`, `isAuthenticated`, `isLoading`,
  `login()`, `logout()`.
- **`isLoading`** is `true` during initial session restore and while a
  `login()` call runs; `ProtectedRoute` shows a spinner instead of bouncing.
- **User model** — easy to extend later:
  ```ts
  { id: string; name: string; email: string; avatar: string|null; role: string }
  ```
- **`auth.service.ts`** (the swappable seam) exposes the documented methods:
  `login()`, `logout()`, `getCurrentUser()`, `isAuthenticated()`
  (plus `register()` / `requestPasswordReset()` and session helpers). Each
  function is commented with the REST call it will become (`POST /api/auth/login`,
  `GET /api/auth/me`, `POST /api/auth/logout`) — only the bodies change when
  Spring Boot/JWT arrives; no component code changes.
- Frontend-only for now (mock with simulated latency). Persists a session
  token + user in `localStorage` (or `sessionStorage` when *Remember me* is
  off), restores it on reload.
- Signed-in user (name, role, avatar/initials) is shown on the protected
  `/app` placeholder via a reusable `Avatar`.

---

## 👤 Step 4 — Logout & session management

- **Reusable `logout()`** clears the user, the development session, and auth
  state, then the UI redirects to `/login`. `/logout` performs it instantly
  (no logout screen). **Passwords are never stored** — only a session token +
  minimal user info.
- **`UserMenu`** (`components/auth/UserMenu.tsx`) — clean white rounded
  dropdown with subtle shadow: avatar, name, email and role in the header;
  **Profile** / **Account settings** are placeholders (marked “later”), and
  **Sign out** is a real `<button>`. Fully accessible: Enter/Space opens,
  **Escape** closes, outside-click closes, visible focus rings, keyboard
  navigable. Shown in the `/app` top bar; usable on mobile (name/role collapse
  to just the avatar on small screens).
- **Route guards** —
  - `/app` is behind `ProtectedRoute`: shows a lightweight loader while the
    session is restored, redirects to `/login` when signed out, accessible
    when signed in.
  - `/login` is wrapped in `GuestRoute`: already-authenticated users are
    redirected to `/app` (and don't flash the login page).
- **Session restoration** — on startup `AuthProvider` re-reads the stored
  session (loader shown until done; no login flash). Invalid/expired/corrupted
  sessions are cleared safely via a shape guard + `try/catch`, so corrupt
  storage never crashes the app.
- **Expiration foundation** — `isSessionValid()` (dev TTL placeholder; later
  driven by the JWT `exp` / `GET /api/auth/me`) and `refreshSession()`
  (placeholder — no fake token refresh; later `POST /api/auth/refresh`).
- **Cross-tab sync** — `AuthProvider` listens to the browser `storage` event:
  signing out (or in) in one tab updates every other tab automatically. No
  extra library.

---

## 🧱 Tech stack

React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · React Router v6 ·
lucide-react · Inter.

## 🚀 Run

```bash
npm install
npm run dev        # http://localhost:5173/login
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

## 🔐 Routes

| Route              | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `/`                | Minimal home placeholder                             |
| `/login`          | **Step 2: animated login page**                     |
| `/register`        | Create-account UI (functional validation)           |
| `/forgot-password` | Mocked reset-link flow                               |
| `/app`             | Protected placeholder (→ `/login` when signed out) |
| `/logout`          | Clears session, redirects to `/login`                |

## 📁 Structure

```
src/
  app/            App.tsx · router.tsx
  components/
    ui/           Button · Input · PasswordInput · Checkbox · Card · Logo · Divider · Avatar · Loader
    auth/         AuthLayout · LoginForm · CityVisual · FloatingInsight · UserMenu
                  ProtectedRoute · GuestRoute
  features/auth/  AuthProvider · auth.service (mock → Spring Boot/JWT later) · auth.types
  pages/          Home · Login · Register · ForgotPassword · AppPlaceholder · Logout
  styles/         tokens.css · globals.css
legacy/           previous static prototype (reference only)
```

## 🎨 Design tokens

Background `#F5F9FF` · Surface `#FFFFFF` · Primary `#2563EB`
(primary-dark `#1D4ED8`) · Accent cyan `#06B6D4` · Text `#0F172A` ·
secondary text `#64748B` · Success `#16A34A` · Border `#DCE6F2`. Blue/cyan
gradients are used sparingly.
