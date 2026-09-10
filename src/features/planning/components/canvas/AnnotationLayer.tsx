import { memo } from "react";
import type { LabelObject, MeasureObject, Point } from "../../types/planning.types";
import { distance, formatMetres, pathFrom } from "../../lib/geometry";

interface AnnotationLayerProps {
  labels: LabelObject[];
  measures: MeasureObject[];
  /** In-progress line (world coordinates) for road / path / measure tools. */
  draft: Point[];
  draftKind: "road" | "path" | "measure" | null;
  hover: Point | null;
  selectedId: string | null;
  scale: number;
  showLabels: boolean;
  onSelect: (id: string) => void;
  interactive: boolean;
}

/** Text labels, measurements and the live drawing preview. Rendered last. */
export const AnnotationLayer = memo(function AnnotationLayer({
  labels,
  measures,
  draft,
  draftKind,
  hover,
  selectedId,
  scale,
  showLabels,
  onSelect,
  interactive,
}: AnnotationLayerProps) {
  const hair = 1 / scale;
  const fontFamily = "Inter, sans-serif";

  const draftPoints = hover && draft.length > 0 ? [...draft, hover] : draft;
  const draftLength = draftPoints.length >= 2 ? draftPoints.reduce((s, p, i) => (i === 0 ? 0 : s + distance(draftPoints[i - 1], p)), 0) : 0;

  return (
    <g data-layer="annotations">
      {measures.map((m) => {
        const [a, b] = m.points;
        const selected = m.id === selectedId;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const label = formatMetres(distance(a, b));
        return (
          <g
            key={m.id}
            data-object-id={m.id}
            role="button"
            tabIndex={interactive ? 0 : -1}
            aria-label={`${m.name}, ${label}${selected ? ", selected" : ""}`}
            aria-pressed={selected}
            className={interactive ? "cursor-pointer" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(m.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(m.id);
              }
            }}
          >
            <path d={pathFrom(m.points)} stroke="transparent" strokeWidth={hair * 14} fill="none" />
            <path d={pathFrom(m.points)} stroke={selected ? "#1D4ED8" : "#0F172A"} strokeWidth={hair * 1.4} fill="none" />
            {[a, b].map((p, i) => (
              <line key={i} x1={p.x} y1={p.y - hair * 5} x2={p.x} y2={p.y + hair * 5} stroke={selected ? "#1D4ED8" : "#0F172A"} strokeWidth={hair * 1.4} />
            ))}
            <rect x={mid.x - hair * 26} y={mid.y - hair * 18} width={hair * 52} height={hair * 14} rx={hair * 4} fill="#FFFFFF" stroke="#DCE6F2" strokeWidth={hair} />
            <text x={mid.x} y={mid.y - hair * 8} textAnchor="middle" fontSize={hair * 9.5} fontWeight={700} fill="#0F172A" style={{ fontFamily }}>
              {label}
            </text>
          </g>
        );
      })}

      {showLabels &&
        labels.map((l) => {
          const selected = l.id === selectedId;
          const w = Math.max(l.properties.text.length * hair * 6.4 + hair * 16, hair * 40);
          return (
            <g
              key={l.id}
              data-object-id={l.id}
              role="button"
              tabIndex={interactive ? 0 : -1}
              aria-label={`Label: ${l.properties.text}${selected ? ", selected" : ""}`}
              aria-pressed={selected}
              className={interactive ? "cursor-pointer" : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(l.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(l.id);
                }
              }}
            >
              <rect
                x={l.x - w / 2}
                y={l.y - hair * 9}
                width={w}
                height={hair * 18}
                rx={hair * 9}
                fill="#FFFFFF"
                fillOpacity={0.92}
                stroke={selected ? "#1D4ED8" : "#DCE6F2"}
                strokeWidth={selected ? hair * 2 : hair}
              />
              <text x={l.x} y={l.y + hair * 3.6} textAnchor="middle" fontSize={hair * 10.5} fontWeight={700} fill="#0F172A" style={{ fontFamily, letterSpacing: "0.02em" }}>
                {l.properties.text}
              </text>
            </g>
          );
        })}

      {/* live draft preview */}
      {draftKind && draftPoints.length > 0 && (
        <g pointerEvents="none" aria-hidden="true">
          {draftPoints.length >= 2 && (
            <>
              <path
                d={pathFrom(draftPoints)}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={draftKind === "road" ? 12 : draftKind === "path" ? 4 : hair * 3}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
              />
              <path
                d={pathFrom(draftPoints)}
                fill="none"
                stroke="#2563EB"
                strokeWidth={draftKind === "road" ? 12 : draftKind === "path" ? 4 : hair * 1.6}
                strokeDasharray={`${hair * 8} ${hair * 6}`}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.55}
              />
            </>
          )}
          {draft.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={hair * 4} fill="#FFFFFF" stroke="#2563EB" strokeWidth={hair * 2} />
          ))}
          {hover && draftLength > 0 && (
            <text x={hover.x + hair * 10} y={hover.y - hair * 8} fontSize={hair * 10} fontWeight={700} fill="#1D4ED8" style={{ fontFamily }}>
              {formatMetres(draftLength)}
            </text>
          )}
        </g>
      )}
    </g>
  );
});
