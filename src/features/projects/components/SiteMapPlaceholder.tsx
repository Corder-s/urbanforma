import { useId } from "react";
import type { SiteContext } from "../project.types";
import { formatCoordinates } from "../project.service";

interface SiteMapPlaceholderProps {
  site: SiteContext;
  /** Chooses one of the deterministic site layouts (reuses the project thumb variant). */
  variant?: number;
  className?: string;
}

/**
 * Map-style site visualization used until a real GIS/map provider is wired in.
 *
 * It is a pure SVG "plan view" that suggests: surrounding context, a site
 * boundary, roads, building footprints, green areas and water. It reads ONLY
 * from `SiteContext`, so replacing it with e.g. a MapLibre component later is
 * a drop-in swap with the same props.
 */
export function SiteMapPlaceholder({ site, variant = 0, className = "" }: SiteMapPlaceholderProps) {
  const id = useId();
  const v = variant % 5;

  // Footprint layouts per variant (plan view, 400×260 canvas, inside the boundary).
  const footprints: { x: number; y: number; w: number; h: number; tall?: boolean }[] = [
    [
      { x: 150, y: 78, w: 42, h: 30, tall: true },
      { x: 200, y: 74, w: 34, h: 26 },
      { x: 148, y: 116, w: 30, h: 40 },
      { x: 186, y: 112, w: 48, h: 22, tall: true },
      { x: 244, y: 92, w: 30, h: 46 },
      { x: 190, y: 142, w: 36, h: 30 },
      { x: 236, y: 148, w: 40, h: 24 },
    ],
    [
      { x: 156, y: 84, w: 46, h: 28, tall: true },
      { x: 212, y: 82, w: 30, h: 36 },
      { x: 154, y: 122, w: 30, h: 30 },
      { x: 194, y: 124, w: 44, h: 26, tall: true },
      { x: 248, y: 126, w: 28, h: 28 },
      { x: 200, y: 156, w: 34, h: 18 },
    ],
    [
      { x: 150, y: 80, w: 30, h: 30 },
      { x: 190, y: 76, w: 44, h: 34, tall: true },
      { x: 244, y: 84, w: 30, h: 26 },
      { x: 152, y: 120, w: 40, h: 22 },
      { x: 202, y: 118, w: 34, h: 40, tall: true },
      { x: 246, y: 122, w: 30, h: 30 },
      { x: 160, y: 152, w: 36, h: 20 },
    ],
    [
      { x: 160, y: 84, w: 56, h: 30, tall: true },
      { x: 226, y: 90, w: 40, h: 26 },
      { x: 158, y: 124, w: 40, h: 34 },
      { x: 208, y: 128, w: 30, h: 30, tall: true },
      { x: 246, y: 128, w: 26, h: 40 },
    ],
    [
      { x: 168, y: 78, w: 40, h: 40, tall: true },
      { x: 218, y: 84, w: 34, h: 30 },
      { x: 156, y: 128, w: 30, h: 30 },
      { x: 196, y: 128, w: 46, h: 22, tall: true },
      { x: 250, y: 124, w: 26, h: 44 },
      { x: 200, y: 158, w: 30, h: 16 },
    ],
  ][v];

  const hasWater = v === 1 || v === 4;

  return (
    <figure
      className={["relative overflow-hidden rounded-2xl border border-line bg-[#EEF4FB]", className].join(" ")}
      style={{
        backgroundImage:
          "linear-gradient(to right, #D6E2F2 1px, transparent 1px), linear-gradient(to bottom, #D6E2F2 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <svg
        viewBox="0 0 400 260"
        role="img"
        aria-label={`Site plan placeholder for ${site.location}: boundary, roads, buildings, green areas and surrounding context`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id={`${id}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#2563EB" strokeWidth="1" opacity="0.25" />
          </pattern>
        </defs>


        {/* surrounding context blocks (muted) */}
        {[
          [20, 24, 60, 40], [96, 20, 40, 34], [24, 84, 44, 46], [22, 150, 62, 34], [30, 204, 44, 34],
          [318, 22, 52, 36], [330, 76, 46, 30], [322, 186, 58, 36], [110, 212, 70, 30], [220, 216, 60, 26],
          [100, 60, 28, 22], [292, 220, 22, 20],
        ].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill="#DCE6F2" stroke="#CBD8EA" strokeWidth="1" />
        ))}

        {/* water (waterfront variants) */}
        {hasWater && (
          <path
            d="M300 0 C 320 60, 380 90, 400 120 L 400 0 Z"
            fill="#CFE6F7"
            stroke="#B8D9F0"
            strokeWidth="1"
          />
        )}

        {/* green areas */}
        <ellipse cx="110" cy="118" rx="26" ry="20" fill="#D8EFD5" stroke="#BFE0BC" strokeWidth="1" />
        <rect x="140" y="176" width="66" height="26" rx="6" fill="#D8EFD5" stroke="#BFE0BC" strokeWidth="1" />
        {hasWater ? null : (
          <ellipse cx="300" cy="60" rx="24" ry="16" fill="#D8EFD5" stroke="#BFE0BC" strokeWidth="1" />
        )}
        {/* trees */}
        {[[98, 112], [116, 124], [108, 128], [150, 190], [170, 186], [190, 192], [300, 56], [312, 66]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="3.2" fill="#5BBF77" opacity={hasWater && cx > 280 ? 0 : 1} />
        ))}

        {/* roads: primary (wider) + secondary */}
        <g stroke="#FFFFFF" strokeLinecap="round" fill="none">
          <path d="M0 62 H400" strokeWidth="10" />
          <path d="M0 62 H400" strokeWidth="8" stroke="#F4F8FD" />
          <path d="M136 0 V260" strokeWidth="10" />
          <path d="M136 0 V260" strokeWidth="8" stroke="#F4F8FD" />
          <path d="M288 62 V260" strokeWidth="7" />
          <path d="M288 62 V260" strokeWidth="5" stroke="#F4F8FD" />
          <path d="M136 170 H288" strokeWidth="6" />
          <path d="M136 170 H288" strokeWidth="4" stroke="#F4F8FD" />
        </g>
        {/* road centre lines */}
        <g stroke="#C9D7EA" strokeWidth="1" strokeDasharray="6 6" fill="none">
          <path d="M0 62 H400" />
          <path d="M136 0 V260" />
        </g>

        {/* site boundary */}
        <path
          d="M142 70 L 282 70 L 282 164 L 214 164 L 214 176 L 142 176 Z"
          fill={`url(#${id}-hatch)`}
          stroke="#2563EB"
          strokeWidth="2"
          strokeDasharray="7 4"
          strokeLinejoin="round"
        />
        <path
          d="M142 70 L 282 70 L 282 164 L 214 164 L 214 176 L 142 176 Z"
          fill="#FFFFFF"
          opacity="0.35"
        />

        {/* building footprints inside the site */}
        {footprints.map((b, i) => (
          <g key={i}>
            <rect x={b.x + 2} y={b.y + 2} width={b.w} height={b.h} rx="2" fill="#1D4ED8" opacity="0.12" />
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx="2"
              fill={b.tall ? "#2563EB" : "#93B4EE"}
              stroke="#FFFFFF"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* site centre marker */}
        <g transform="translate(212 118)">
          <circle r="9" fill="#2563EB" opacity="0.15" />
          <circle r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
        </g>

        {/* north arrow */}
        <g transform="translate(372 226)" fill="#64748B">
          <path d="M0 -12 L 6 8 L 0 4 L -6 8 Z" />
          <text y="22" textAnchor="middle" fontSize="9" fontWeight="700" fill="#64748B" fontFamily="Inter, sans-serif">
            N
          </text>
        </g>

        {/* scale bar */}
        <g transform="translate(16 236)">
          <rect width="60" height="4" fill="#0F172A" opacity="0.6" />
          <rect width="30" height="4" fill="#FFFFFF" />
          <rect width="60" height="4" fill="none" stroke="#0F172A" strokeWidth="0.8" opacity="0.6" />
          <text y="16" fontSize="9" fontWeight="600" fill="#64748B" fontFamily="Inter, sans-serif">
            0
          </text>
          <text x="60" y="16" textAnchor="end" fontSize="9" fontWeight="600" fill="#64748B" fontFamily="Inter, sans-serif">
            200 m
          </text>
        </g>
      </svg>

      {/* overlays: coordinates chip + legend (HTML so text stays crisp) */}
      <figcaption className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
        <span className="rounded-lg border border-line bg-white/95 px-2.5 py-1 text-[11px] font-bold text-ink">
          {formatCoordinates(site.center)}
        </span>
        <span className="rounded-lg border border-line bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-muted">
          Map preview — GIS provider connects later
        </span>
      </figcaption>
      <ul
        aria-label="Map legend"
        className="pointer-events-none absolute bottom-3 right-3 hidden gap-3 rounded-lg border border-line bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-muted sm:flex"
      >
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border-2 border-dashed border-primary" aria-hidden="true" /> Site boundary
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden="true" /> Buildings
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#BFE0BC]" aria-hidden="true" /> Green
        </li>
        {hasWater && (
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#B8D9F0]" aria-hidden="true" /> Water
          </li>
        )}
      </ul>
    </figure>
  );
}
