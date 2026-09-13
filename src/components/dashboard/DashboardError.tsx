import { CloudOff, RotateCw } from "lucide-react";
import { Button } from "../ui/Button";

/** Error state — inline retry, never a browser alert. */
export function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid place-items-center px-6 py-16 sm:py-24">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-10 text-center shadow-card">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">
          <CloudOff size={26} />
        </span>
        <h2 className="mt-5 text-xl font-extrabold tracking-tight text-ink">
          We couldn&apos;t load your workspace.
        </h2>
        <p className="mt-2 text-[15px] text-muted">
          Something went wrong while fetching your projects. Please try again.
        </p>
        <Button size="md" className="mt-6" onClick={onRetry}>
          <RotateCw size={16} /> Try Again
        </Button>
      </div>
    </div>
  );
}
