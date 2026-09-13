import { useId, useMemo, type ReactNode } from "react";
import { Compass } from "lucide-react";
import {
  DEFAULT_LAYERS,
  DEFAULT_SETTINGS,
  EXISTING_STYLE,
  LAND_USE_STYLE,
  getBasemap,
} from "../../visualization/data/visualization.data";
import { MiniPlan } from "../../visualization/components/map/MiniPlan";
import type { SpatialDataset } from "../../visualization/types/visualization.types";
import { buildModelViewScene, figureFacts } from "../lib/reportGeometry";

/**
 * Report figures.
 *
 * Two views of the same live `SpatialDataset`:
 *
 *  • **Plan view** — the Step 12 map layers through `MiniPlan` (`fit="meet"` so
 *    nothing is cropped on the page), i.e. exactly what the workspace shows.
 *  • **Model view** — an axonometric massing drawing built by `reportGeometry`.
 *    Vector rather than a WebGL snapshot: it prints at full resolution, needs no
 *    three.js in the reports chunk, and cannot come out blank on paper.
 *
 * Both are `role="img"` with a text alternative and a caption carrying the real
 * site dimensions, so the figure is never the only place a number appears.
 */

const COS30 = Math.cos(Math.PI / 6);

/** Land-use swatches for the plan legend — the same palette the map layer uses. */
const LAND_USE_FILL: Record<string, string> = Object.fromEntries(
  Object.entries(LAND_USE_STYLE).map(([key, value]) => [key, value.fill])
);
const LAND_USE_STROKE: Record<string, string> = Object.fromEntries(
  Object.entries(LAND_USE_STYLE).map(([key, value]) => [key, value.stroke])
);

interface FigureProps {
  data: SpatialDataset;
  /** "Figure 1" — supplied by the section so numbering follows the document. */
  label?: string;
}

/** Small north arrow. Plan view: north is up. Model view: north is up-right. */
function NorthArrow({ angle = 0 }: { angle?: number }) {
  return (
    <span
      className="pointer-events-none absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border border-line bg-white/90 text-ink shadow-soft"
      aria-hidden="true"
      style={{ transform: angle ? `rotate(${angle}deg)` : undefined }}
    >
      <Compass size={16} className="text-primary" />
    </span>
  );
}

function FigureFrame({
  label,
  caption,
  meta,
  children,
  legend,
}: {
  label?: string;
  caption: string;
  meta: string;
  children: ReactNode;
  legend?: { label: string; fill: string; stroke: string }[];
}) {
  return (
    <figure className="report-block report-figure">
      <div className="relative overflow-hidden rounded-xl border border-line bg-white">
        {children}
        {label && (
          <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-md border border-line bg-white/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-muted shadow-soft">
            {label}
          </span>
        )}
      </div>
      <figcaption className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[11.5px] leading-relaxed text-muted">
        <span>
          <strong className="font-bold text-ink">{caption}</strong>
        </span>
        <span className="tabular-nums">{meta}</span>
      </figcaption>
      {legend && legend.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm border" style={{ background: l.fill, borderColor: l.stroke }} aria-hidden="true" />
              {l.label}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

/** Top-down plan of the site, drawn by the shared Step 12 map layers. */
export function PlanFigure({ data, label }: FigureProps) {
  const settings = useMemo(
    () => ({
      ...DEFAULT_SETTINGS,
      labels: false,
      buildingShadows: true,
      buildingStyle: "land-use" as const,
      // Neutral light: no time-of-day tint over a printed figure.
      timeOfDay: "14:00" as const,
    }),
    []
  );
  const facts = useMemo(() => figureFacts(data), [data]);
  const legend = useMemo(() => {
    const uses = new Set(
      data.objects.filter((o) => o.type === "building" && o.properties.status !== "Existing").map((o) => (o.type === "building" ? o.properties.landUse : ""))
    );
    const rows = [...uses].filter(Boolean).map((key) => ({
      label: key,
      // Imported palette — the same fills the map uses, so the two agree.
      fill: LAND_USE_FILL[key],
      stroke: LAND_USE_STROKE[key],
    }));
    const hasExisting = data.objects.some((o) => o.type === "building" && o.properties.status === "Existing");
    if (hasExisting) rows.push({ label: "Existing", fill: EXISTING_STYLE.fill, stroke: EXISTING_STYLE.stroke });
    return rows;
  }, [data]);

  return (
    <FigureFrame
      label={label}
      caption="Plan view — site boundary, streets, landscape and proposed massing"
      meta={`Site ${facts.siteWidthM} × ${facts.siteDepthM} m · ${facts.siteAreaHa.toFixed(1)} ha · ${facts.buildings} buildings · tallest ${facts.tallestM} m`}
      legend={legend}
    >
      <div className="h-[240px] sm:h-[320px]">
        <MiniPlan
          data={data}
          layers={DEFAULT_LAYERS}
          settings={settings}
          basemap="light"
          fit="meet"
          padding={30}
          title={`Plan view of ${data.projectName}: ${facts.buildings} buildings on a ${facts.siteAreaHa.toFixed(1)} hectare site`}
        />
      </div>
      <NorthArrow />
    </FigureFrame>
  );
}

/** Axonometric massing model of the same dataset (pure SVG, print-safe). */
export function ModelViewFigure({ data, label }: FigureProps) {
  const id = useId();
  const scene = useMemo(() => buildModelViewScene(data), [data]);
  const facts = useMemo(() => figureFacts(data), [data]);
  const basemap = getBasemap("light");
  // 50 m scale bar drawn along the projected east axis.
  const scaleBar = 50 * COS30;

  const massing = useMemo(
    () => [...scene.context, ...scene.buildings].sort((a, b) => a.depth - b.depth),
    [scene]
  );
  const legend = useMemo(() => {
    const rows = scene.legend.map((l) => ({ label: l.label, fill: l.fill, stroke: l.stroke }));
    if (scene.buildings.some((b) => b.existing)) rows.push({ label: "Existing", fill: EXISTING_STYLE.fill, stroke: EXISTING_STYLE.stroke });
    return rows;
  }, [scene]);

  return (
    <FigureFrame
      label={label}
      caption="Model view — axonometric massing at true height (no vertical exaggeration)"
      meta={`Site ${facts.siteWidthM} × ${facts.siteDepthM} m · ${scene.buildings.length} volumes · tallest ${facts.tallestM} m`}
      legend={legend}
    >
      <div className="h-[260px] sm:h-[340px] bg-white">
        <svg
          viewBox={scene.viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="block h-full w-full"
          role="img"
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-desc`}
        >
          <title id={`${id}-title`}>{`Axonometric model of ${data.projectName}`}</title>
          <desc id={`${id}-desc`}>
            {`${scene.buildings.length} building volumes, ${scene.roads.length} streets and ${scene.areas.length} landscape or water areas on a ${facts.siteAreaHa.toFixed(1)} hectare site. The tallest volume is ${facts.tallestM} metres.`}
          </desc>

          <rect x={scene.origin.x} y={scene.origin.y} width={scene.width} height={scene.height} fill={basemap.contextGround} />
          {scene.sitePlate && <path d={scene.sitePlate} fill={basemap.site} stroke={basemap.grid} strokeWidth={1} />}
          {scene.blocks.map((b) => (
            <path key={b.id} d={b.d} fill={b.fill} stroke={b.stroke} strokeWidth={0.75} />
          ))}
          {scene.areas.map((a) => (
            <path key={a.id} d={a.d} fill={a.fill} stroke={a.stroke} strokeWidth={0.75} strokeLinejoin="round" />
          ))}
          {scene.roads.map((r) => (
            <g key={r.id}>
              <path d={r.d} fill="none" stroke={r.casing} strokeWidth={r.width + 1.5} strokeLinecap="round" strokeLinejoin="round" />
              <path d={r.d} fill="none" stroke={r.surface} strokeWidth={r.width} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ))}

          {/* Canopies sit under the massing so volumes always read cleanly. */}
          {scene.trees.map((t) => (
            <circle key={t.id} cx={t.cx} cy={t.cy} r={t.r} fill="#8FC487" stroke="#6FAA67" strokeWidth={0.4} />
          ))}

          {/* Context and site massing share one painter's order (far → near). */}
          {massing.map((b) => (
            <g key={b.id}>
              {b.walls.map((w, i) => (
                <path key={i} d={w.d} fill={w.fill} stroke={b.roofStroke} strokeWidth={0.4} strokeLinejoin="round" />
              ))}
              <path d={b.roofD} fill={b.roof} stroke={b.roofStroke} strokeWidth={0.6} strokeLinejoin="round" />
            </g>
          ))}

          {/* scale bar: 50 m along the projected east axis */}
          <g transform={`translate(${scene.origin.x + 14} ${scene.origin.y + scene.height - 16})`} aria-hidden="true">
            <line x1={0} y1={0} x2={scaleBar} y2={scaleBar * 0.577} stroke="#0F172A" strokeWidth={1.4} />
            <line x1={0} y1={-3} x2={0} y2={3} stroke="#0F172A" strokeWidth={1.2} />
            <line x1={scaleBar} y1={scaleBar * 0.577 - 3} x2={scaleBar} y2={scaleBar * 0.577 + 3} stroke="#0F172A" strokeWidth={1.2} />
            <text x={scaleBar / 2} y={-5} fontSize={7} textAnchor="middle" fill="#0F172A" fontFamily="Inter, sans-serif" fontWeight={700}>
              50 m
            </text>
          </g>
        </svg>
      </div>
      {/* North sits up-right in this projection; the arrow is rotated to match. */}
      <NorthArrow angle={-30} />
    </FigureFrame>
  );
}

