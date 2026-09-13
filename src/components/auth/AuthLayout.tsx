import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "../ui/Logo";
import { CityVisual } from "./CityVisual";

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Split-screen auth layout used by Login / Register / Forgot password.
 * Desktop: 42% form panel, 58% animated city visual.
 * Mobile:  a compact city banner on top, form as the focus below.
 */
/** Class added to <html> for the lifetime of an auth page; see globals.css. */
const GUTTER_CLASS = "reserve-scrollbar-gutter";

export function AuthLayout({ children }: AuthLayoutProps) {
  // Reserve the scrollbar gutter while an auth page is mounted, so the viewport
  // width cannot change when a scrollbar appears or disappears. This is the
  // guarantee behind the sideways shift being gone whatever causes it — the
  // entrance animation's transient overflow, the web font swapping in and
  // changing text height, or content simply crossing 100vh on a short window.
  //
  // Scoped to a class rather than set on `html` outright: AppShell is
  // `h-dvh overflow-hidden` and scrolls inside <main>, never the document, so a
  // permanent gutter would leave a dead ~15px strip down the right edge of the
  // entire authenticated workspace.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(GUTTER_CLASS);
    return () => root.classList.remove(GUTTER_CLASS);
  }, []);

  return (
    // `overflow-clip` is what stops the whole page from jumping sideways on
    // load. The entrance animation (rise-in) starts its elements 26px lower
    // than they end up, and a transformed descendant extends the document's
    // *scrollable* overflow — so for the ~0.86s the animation runs, the
    // document grew past 100vh, a vertical scrollbar appeared, the viewport
    // narrowed by ~15px and every `mx-auto` child shifted sideways, then
    // shifted back when the animation settled.
    //
    // Clipping here contains that transient overflow at this box instead of
    // letting it reach the document. It is safe because:
    //   - `clip` (unlike `hidden`) does not create a scroll container, so
    //     nothing becomes programmatically unfocusable;
    //   - the box is `min-h-screen`, not fixed-height, so it still grows with
    //     its content and the document scrolls normally on short viewports —
    //     tall content is never cut off;
    //   - the panel carries ≥32px of bottom padding (`py-8`, `lg:py-10`) plus
    //     the form wrapper's own `py-8`, so the 26px travel stays inside the
    //     box and nothing visible is actually clipped mid-animation.
    //
    // Deliberately scoped to the auth layout rather than set globally: AppShell
    // is `h-dvh overflow-hidden` and never scrolls the document, so reserving a
    // scrollbar gutter on `html` would permanently inset the entire workspace.
    <div className="min-h-screen w-full overflow-clip bg-canvas animate-fade-in">
      <div className="mx-auto grid min-h-screen max-w-[1560px] grid-cols-1 lg:grid-cols-[42%_58%]">
        {/* mobile: compact city banner */}
        <div className="visual-sky relative col-span-1 h-36 overflow-hidden lg:hidden">
          <div className="h-full w-full animate-fade-in [&_svg]:h-[190%]">
            <CityVisual />
          </div>
        </div>

        {/* LEFT — authentication panel */}
        <div className="relative flex flex-col px-6 py-8 sm:px-10 lg:px-14 lg:py-10">
          <Link
            to="/"
            className="group absolute left-6 top-8 z-10 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary sm:left-10 lg:left-14"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            Back to Home
          </Link>

          <div className="mt-10 flex animate-rise-in justify-center lg:mt-14 lg:justify-start">
            <Logo tagline />
          </div>

          <div className="flex flex-1 items-center justify-center lg:justify-start">
            <div className="w-full max-w-md animate-rise-in anim-delay-2 py-8 lg:py-10">
              {children}
            </div>
          </div>

          <p className="mt-auto hidden border-l-2 border-primary/30 pl-3 text-[13px] italic text-muted lg:block">
            “Better cities begin with better decisions.”
          </p>
        </div>

        {/* RIGHT — animated city visual (58%) */}
        <div className="visual-sky relative hidden overflow-hidden lg:block">
          <div className="h-full w-full animate-fade-in">
            <CityVisual />
          </div>
        </div>
      </div>
    </div>
  );
}
