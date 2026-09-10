import { Link } from "react-router-dom";
import { ArrowLeft, Hammer } from "lucide-react";
import { PageContainer } from "../../components/layout/PageContainer";
import { PageHeader } from "../../components/layout/PageHeader";
import { ROUTE_TITLES } from "../../components/navigation/navConfig";
import { useLocation } from "react-router-dom";

/**
 * Shared placeholder for every not-yet-built /app/* route. Proves routing and
 * the active sidebar state without implementing real features.
 */
export function ComingSoonPage() {
  const { pathname } = useLocation();
  const title = ROUTE_TITLES[pathname] ?? "Module";

  return (
    <PageContainer className="flex h-full flex-col">
      <PageHeader title={title} description={`The ${title} module is part of the UrbanForma roadmap.`} />

      <div className="grid flex-1 place-items-center rounded-3xl border border-dashed border-line-strong bg-white/60 px-6 py-20 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-primary/15">
            <Hammer size={26} />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-ink">{title} is coming next.</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            This route is wired up and the shell works — the {title.toLowerCase()}{" "}
            functionality will be built in a later step.
          </p>
          <Link
            to="/app"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary-dark"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
