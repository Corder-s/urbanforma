import { FileClock } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import type { CreateProjectDraft } from "../../project.service";

interface DraftBannerProps {
  draft: CreateProjectDraft;
  onRestore: () => void;
  onDiscard: () => void;
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** Offer to restore a previously saved draft (shown above the form). */
export function DraftBanner({ draft, onRestore, onDiscard }: DraftBannerProps) {
  const name = draft.values.name.trim();
  return (
    <div
      role="region"
      aria-label="Saved draft available"
      className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-primary ring-1 ring-primary/20">
          <FileClock size={18} />
        </span>
        <div>
          <p className="text-sm font-extrabold text-ink">
            You have a saved draft{name ? <> — <span className="text-primary">{name}</span></> : null}
          </p>
          <p className="text-[13px] text-muted">
            Saved {relative(draft.savedAtIso)}. Restore it to continue where you left off.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onDiscard}>
          Discard
        </Button>
        <Button type="button" size="sm" onClick={onRestore}>
          Restore draft
        </Button>
      </div>
    </div>
  );
}
