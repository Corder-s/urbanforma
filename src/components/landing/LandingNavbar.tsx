import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Logo } from "../ui/Logo";
import { Button } from "../ui/Button";

const LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "Solutions", href: "#sustainability" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Resources", href: "#analysis" },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-line bg-white/85 backdrop-blur-md shadow-soft"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="UrbanForma home" className="shrink-0">
          <Logo size={30} />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[15px] font-semibold text-muted transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link to="/login">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-ink md:hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* mobile drawer */}
      <div
        className={[
          "md:hidden overflow-hidden border-t border-line bg-white transition-[max-height] duration-300 ease-out",
          open ? "max-h-[420px]" : "max-h-0 border-t-transparent",
        ].join(" ")}
      >
        <nav className="flex flex-col gap-1 px-5 py-4" aria-label="Mobile">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-base font-semibold text-ink transition-colors hover:bg-surface-2 hover:text-primary"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2">
            <Link to="/login" onClick={() => setOpen(false)}>
              <Button variant="secondary" fullWidth>Sign In</Button>
            </Link>
            <Link to="/login" onClick={() => setOpen(false)}>
              <Button fullWidth>Get Started</Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
