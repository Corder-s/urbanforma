import { useEffect } from "react";
import { prefetchRoute } from "./routeLoaders";

/**
 * How long a pointer must rest on a link before we spend bandwidth on it.
 * Long enough to ignore casual mouse sweeps across a list of project cards,
 * short enough that the chunk is usually in flight before the click lands.
 */
const INTENT_DELAY_MS = 80;

/**
 * Resolve an event target to an in-app route path, or `null` when the link is
 * not something we should prefetch.
 *
 * Deliberately conservative: only same-origin, path-based, current-tab links
 * qualify. Everything else (external, mailto/tel, downloads, new tabs, hash
 * anchors, or anything opted out with `data-prefetch="off"`) is ignored.
 */
function internalRouteFor(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;

  const anchor = target.closest("a");
  if (!anchor) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  if (anchor.dataset.prefetch === "off") return null;

  const href = anchor.getAttribute("href");
  if (!href || !href.startsWith("/")) return null;
  if (/^\/\//.test(href)) return null; // protocol-relative → external

  return href;
}

/**
 * App-wide, intent-based route prefetching.
 *
 * One delegated listener pair on `document` covers every `<Link>` in the app —
 * sidebar, landing nav, dashboard quick actions, project cards, breadcrumbs —
 * including links added later, without touching a single component. It replaces
 * what would otherwise be ~30 copies of the same hover handler.
 *
 * Mount once near the root:
 *
 * ```tsx
 * export default function App() {
 *   useLinkPrefetch();
 *   return <RouterProvider router={router} />;
 * }
 * ```
 *
 * Cost when idle is zero: the listeners only do a `closest("a")` lookup, and
 * the actual work is deduped and network-aware inside `prefetchRoute`.
 */
export function useLinkPrefetch(): void {
  useEffect(() => {
    let timer: number | null = null;
    let pending: string | null = null;

    const cancel = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      pending = null;
    };

    const begin = (path: string) => {
      if (path === pending && timer !== null) return; // already warming this one
      cancel();
      pending = path;
      timer = window.setTimeout(() => {
        timer = null;
        prefetchRoute(path);
      }, INTENT_DELAY_MS);
    };

    const onEnter = (event: Event) => {
      const path = internalRouteFor(event.target);
      if (path) begin(path);
    };

    const onLeave = (event: Event) => {
      const path = internalRouteFor(event.target);
      if (path && path === pending) cancel();
    };

    // Click prefetches immediately: this is what makes touch devices (no hover)
    // still get a head start, and it cancels any pending timer for the target.
    const onClick = (event: Event) => {
      const path = internalRouteFor(event.target);
      if (!path) return;
      cancel();
      prefetchRoute(path);
    };

    const options: AddEventListenerOptions = { capture: true, passive: true };
    document.addEventListener("pointerover", onEnter, options);
    document.addEventListener("focusin", onEnter, options);
    document.addEventListener("pointerout", onLeave, options);
    document.addEventListener("focusout", onLeave, options);
    document.addEventListener("click", onClick, options);

    return () => {
      cancel();
      document.removeEventListener("pointerover", onEnter, options);
      document.removeEventListener("focusin", onEnter, options);
      document.removeEventListener("pointerout", onLeave, options);
      document.removeEventListener("focusout", onLeave, options);
      document.removeEventListener("click", onClick, options);
    };
  }, []);
}
