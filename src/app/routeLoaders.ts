/**
 * Route chunk loaders, shared by `router.tsx` (for `React.lazy`) and by the
 * intent-based prefetcher below.
 *
 * Keeping one loader per route means prefetching and lazy-rendering resolve to
 * the *same* dynamic import, so Vite emits a single chunk per route and the
 * browser's module cache dedupes the second call for free.
 */

export const loadAppShell = () => import("../layouts/AppShell");
export const loadLandingPage = () => import("../pages/LandingPage");
export const loadLoginPage = () => import("../pages/LoginPage");
export const loadRegisterPage = () => import("../pages/RegisterPage");
export const loadForgotPasswordPage = () => import("../pages/ForgotPasswordPage");
export const loadLogoutPage = () => import("../pages/LogoutPage");
export const loadDashboardPage = () => import("../pages/app/DashboardPage");
export const loadProjectsPage = () => import("../pages/app/ProjectsPage");
export const loadCreateProjectPage = () => import("../pages/app/CreateProjectPage");
export const loadProjectDetailPage = () => import("../pages/app/ProjectDetailPage");
export const loadPlanningStudioPage = () => import("../pages/app/PlanningStudioPage");
export const loadVisualizationPage = () => import("../pages/app/VisualizationPage");
export const loadAnalysisPage = () => import("../pages/app/AnalysisPage");
export const loadOptimizationPage = () => import("../pages/app/OptimizationPage");
export const loadReportsPage = () => import("../pages/app/ReportsPage");
export const loadComingSoonPage = () => import("../pages/app/ComingSoonPage");

/**
 * Path → loader.
 *
 * Keys are exact route paths; `/app/projects/:id` is keyed by its pattern and
 * matched separately (see `loaderFor`) because the concrete id is unknown at
 * prefetch time.
 */
const LOADERS: Record<string, () => Promise<unknown>> = {
  "/": loadLandingPage,
  "/login": loadLoginPage,
  "/register": loadRegisterPage,
  "/forgot-password": loadForgotPasswordPage,
  "/logout": loadLogoutPage,
  // The dashboard renders inside AppShell, which is itself lazy — warm both so
  // hovering "Home" does not leave the workspace chrome for the click to fetch.
  "/app": () => Promise.all([loadAppShell(), loadDashboardPage()]),
  "/app/projects": loadProjectsPage,
  "/app/projects/new": loadCreateProjectPage,
  "/app/planning": loadPlanningStudioPage,
  "/app/analysis": loadAnalysisPage,
  "/app/optimization": loadOptimizationPage,
  "/app/visualization": loadVisualizationPage,
  "/app/reports": loadReportsPage,
  "/app/bim": loadComingSoonPage,
  "/app/settings": loadComingSoonPage,
  "/app/projects/:id": loadProjectDetailPage,
};

/** Matches a concrete project path (`/app/projects/p-1`) to its detail loader. */
const PROJECT_DETAIL = /^\/app\/projects\/[^/]+$/;

function loaderFor(path: string): (() => Promise<unknown>) | undefined {
  const direct = LOADERS[path];
  if (direct) return direct;
  if (PROJECT_DETAIL.test(path)) return LOADERS["/app/projects/:id"];
  return undefined;
}

/** Already-fetched (or in-flight) loaders, so hovering repeatedly costs nothing.
 *  Keyed by loader identity, not by path: every `/app/projects/<id>` link shares
 *  one detail chunk, so deduping on the loader avoids redundant bookkeeping. */
const fetched = new Set<() => Promise<unknown>>();

type Connection = { saveData?: boolean; effectiveType?: string };

/**
 * On a metered or slow connection, speculative downloads are a net loss — the
 * chunk we prefetch competes with the one the user actually asked for.
 */
export function isPrefetchEnabled(): boolean {
  if (typeof navigator === "undefined") return true;
  const conn = (navigator as Navigator & { connection?: Connection }).connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  const type = conn.effectiveType;
  return type !== "slow-2g" && type !== "2g";
}

/**
 * Start downloading a route's chunk before the user navigates to it.
 *
 * Safe to call on every hover/focus: it is idempotent, never throws, and bails
 * out on save-data connections. A failed prefetch is deliberately silent — the
 * real navigation surfaces the error through Suspense.
 */
export function prefetchRoute(path: string): void {
  if (!isPrefetchEnabled()) return;

  const clean = path.split("?")[0].split("#")[0];
  const load = loaderFor(clean);
  if (!load || fetched.has(load)) return;

  fetched.add(load);
  void Promise.resolve()
    .then(load)
    .catch(() => {
      // Allow a retry on the next intent if the network blipped.
      fetched.delete(load);
    });
}

/**
 * Prefetch a batch of routes once the main thread is idle. Used to warm the
 * most likely next destination without blocking interaction or first paint.
 */
export function prefetchRoutesWhenIdle(paths: string[]): void {
  if (!isPrefetchEnabled()) return;

  const run = () => paths.forEach(prefetchRoute);
  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }
  ).requestIdleCallback;

  if (typeof ric === "function") ric(run, { timeout: 3000 });
  else window.setTimeout(run, 1500);
}
