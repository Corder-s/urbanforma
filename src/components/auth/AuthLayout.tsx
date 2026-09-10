import type { ReactNode } from "react";
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
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-canvas animate-fade-in">
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

          <div className="mt-10 animate-rise-in lg:mt-14">
            <Logo tagline />
          </div>

          <div className="flex flex-1 items-center">
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
