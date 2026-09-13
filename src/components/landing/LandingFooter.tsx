import { Link } from "react-router-dom";
import { Logo } from "../ui/Logo";

const COLS: { title: string; links: string[] }[] = [
  { title: "Product", links: ["Platform", "Site Planning", "Analysis", "Visualization", "BIM"] },
  { title: "Company", links: ["About", "Contact"] },
  { title: "Resources", links: ["Documentation", "Help", "Privacy", "Terms"] },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Logo size={34} tagline />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              The connected urban planning workspace for smarter, greener and
              more resilient cities.
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-extrabold uppercase tracking-wider text-ink">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#platform"
                      className="text-sm text-muted transition-colors hover:text-primary"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 sm:flex-row">
          <p className="text-sm text-faint">© {new Date().getFullYear()} UrbanForma. All rights reserved.</p>
          <Link to="/login" className="text-sm font-semibold text-primary hover:text-primary-dark">
            Sign in to the platform →
          </Link>
        </div>
      </div>
    </footer>
  );
}
