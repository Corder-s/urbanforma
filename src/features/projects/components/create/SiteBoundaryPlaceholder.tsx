import { useId, useState } from "react";
import { PenTool, Upload, Check, RotateCcw } from "lucide-react";
import { Button } from "../../../../components/ui/Button";

type BoundaryMode = "none" | "drawn" | "uploaded";

/**
 * "Define Site Boundary" — a GIS-style placeholder for the future boundary
 * editor. Draw / Upload are demo interactions: they toggle a sample boundary
 * so the flow can be exercised, and say so. No geometry is stored yet.
 */
export function SiteBoundaryPlaceholder() {
  const id = useId();
  const [mode, setMode] = useState<BoundaryMode>("none");
  const defined = mode !== "none";

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink">Site Boundary</p>
      <div className="overflow-hidden rounded-2xl border border-line bg-[#EEF4FB]">
        <div
          className="relative aspect-[16/8] min-h-[180px] w-full sm:aspect-[16/6]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #D6E2F2 1px, transparent 1px), linear-gradient(to bottom, #D6E2F2 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          <svg
            viewBox="0 0 400 150"
            role="img"
            aria-label={defined ? "Sample site boundary defined (demo)" : "No site boundary defined yet"}
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <pattern id={`${id}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#2563EB" strokeWidth="1" opacity="0.25" />
              </pattern>
            </defs>
            {/* context blocks */}
            {[
              [18, 16, 46, 30], [76, 12, 34, 26], [20, 62, 40, 36], [24, 110, 52, 26],
              [326, 14, 50, 32], [338, 60, 42, 28], [322, 108, 56, 28], [150, 118, 60, 20], [230, 120, 50, 18],
            ].map(([x, y, w, h], i) => (
              <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill="#DCE6F2" stroke="#CBD8EA" strokeWidth="1" />
            ))}
            {/* roads */}
            <g stroke="#FFFFFF" strokeLinecap="round" fill="none">
              <path d="M0 50 H400" strokeWidth="9" />
              <path d="M0 50 H400" strokeWidth="7" stroke="#F4F8FD" />
              <path d="M130 0 V150" strokeWidth="9" />
              <path d="M130 0 V150" strokeWidth="7" stroke="#F4F8FD" />
              <path d="M300 50 V150" strokeWidth="6" />
              <path d="M300 50 V150" strokeWidth="4" stroke="#F4F8FD" />
            </g>
            {/* green */}
            <ellipse cx="96" cy="92" rx="20" ry="14" fill="#D8EFD5" stroke="#BFE0BC" strokeWidth="1" />
            {/* boundary (sample) */}
            {defined ? (
              <g className="animate-fade-in motion-reduce:animate-none">
                <path
                  d="M140 58 L 290 58 L 290 108 L 226 108 L 226 118 L 140 118 Z"
                  fill={`url(#${id}-hatch)`}
                  stroke="#2563EB"
                  strokeWidth="2"
                  strokeDasharray="7 4"
                  strokeLinejoin="round"
                />
                {[[140, 58], [290, 58], [290, 108], [226, 108], [226, 118], [140, 118]].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="3.5" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />
                ))}
              </g>
            ) : (
              <path
                d="M140 58 L 290 58 L 290 118 L 140 118 Z"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="1.5"
                strokeDasharray="4 5"
                strokeLinejoin="round"
              />
            )}
          </svg>

          {/* centred prompt */}
          {!defined && (
            <div className="absolute inset-0 grid place-items-center p-4">
              <div className="rounded-2xl border border-line bg-white/95 px-5 py-4 text-center shadow-soft">
                <p className="text-sm font-extrabold text-ink">Define Site Boundary</p>
                <p className="mt-0.5 text-[12.5px] text-muted">Draw on the map or upload a boundary file.</p>
              </div>
            </div>
          )}
          {defined && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-white/95 px-2.5 py-1 text-[11.5px] font-bold text-success">
              <Check size={13} aria-hidden="true" /> Sample boundary {mode === "drawn" ? "drawn" : "uploaded"}
            </span>
          )}
          <span className="absolute bottom-3 right-3 rounded-lg border border-line bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-muted">
            Demo — GIS editor connects later
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-white p-3">
          <Button type="button" size="sm" variant="secondary" onClick={() => setMode("drawn")} aria-pressed={mode === "drawn"}>
            <PenTool size={15} /> Draw Boundary
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setMode("uploaded")} aria-pressed={mode === "uploaded"}>
            <Upload size={15} /> Upload Boundary
          </Button>
          {defined && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode("none")} className="ml-auto">
              <RotateCcw size={15} /> Clear
            </Button>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        Optional. Boundary drawing and file import are demo interactions until the GIS module is built.
      </p>
    </div>
  );
}
