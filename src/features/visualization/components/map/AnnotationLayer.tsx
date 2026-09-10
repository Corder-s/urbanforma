import { memo } from "react";
import type { Annotation } from "../../types/visualization.types";

interface AnnotationLayerProps {
  annotations: Annotation[];
  scale: number;
  /** Id of the annotation being edited (drawn with a dashed halo). */
  activeId?: string | null;
  /** When set, annotations can be picked and dragged (Explore mode editor). */
  onPick?: (id: string) => void;
}

const TITLE_PX = 18;
const LABEL_PX = 11.5;

function widthOf(text: string, px: number): number {
  return text.length * px * 0.58 + 22;
}

/**
 * Presentation annotations in plan: title, label, callout (with a short
 * leader), metric tag. Screen-space sized (1/scale) so they stay legible at
 * any zoom. Text is drawn on a white plate so it is readable over any basemap.
 */
export const AnnotationLayer = memo(function AnnotationLayer({ annotations, scale, activeId = null, onPick }: AnnotationLayerProps) {
  const k = 1 / scale;
  return (
    <g data-layer="annotations" aria-hidden={onPick ? undefined : "true"}>
      {annotations.map((a) => {
        const { x, y } = a.position;
        const isTitle = a.kind === "title";
        const px = (isTitle ? TITLE_PX : LABEL_PX) * k;
        const label = a.kind === "metric" && a.detail ? `${a.text}  ${a.detail}` : a.text;
        const w = widthOf(label, isTitle ? TITLE_PX : LABEL_PX) * k;
        const h = (isTitle ? 32 : 24) * k;
        const lead = a.kind === "callout" ? 26 * k : 0;
        const active = a.id === activeId;
        const plateY = y - lead - h - (a.kind === "callout" ? 0 : 6 * k);
        const detailLines = a.kind === "callout" && a.detail ? [a.detail] : [];
        const plateH = h + detailLines.length * 14 * k;
        const interactive = !!onPick;
        return (
          <g
            key={a.id}
            data-annotation-id={a.id}
            className={interactive ? "cursor-move" : undefined}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? `Annotation ${label}` : undefined}
            onKeyDown={interactive ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick?.(a.id)) : undefined}
          >
            {a.kind === "callout" && (
              <>
                <line x1={x} y1={y} x2={x} y2={y - lead} stroke="#D97706" strokeWidth={1.5 * k} />
                <circle cx={x} cy={y} r={3 * k} fill="#D97706" stroke="#FFFFFF" strokeWidth={1.2 * k} />
              </>
            )}
            {a.kind === "metric" && <circle cx={x} cy={y} r={2.5 * k} fill="#1D4ED8" stroke="#FFFFFF" strokeWidth={1.2 * k} />}
            {a.kind === "label" && <circle cx={x} cy={y} r={2.5 * k} fill="#0F172A" fillOpacity={0.55} />}
            <rect
              x={x - w / 2}
              y={plateY}
              width={w}
              height={plateH}
              rx={(isTitle ? 8 : 12) * k}
              fill={a.kind === "callout" ? "#FFF7E6" : "#FFFFFF"}
              fillOpacity={0.95}
              stroke={active ? "#2563EB" : a.kind === "callout" ? "#F1D3A3" : a.kind === "metric" ? "#BFD3FF" : "#DCE6F2"}
              strokeWidth={(active ? 2 : 1) * k}
              strokeDasharray={active ? `${4 * k} ${3 * k}` : undefined}
            />
            <text x={x} y={plateY + h / 2 + px * 0.36} textAnchor="middle" fontSize={px} fontWeight={isTitle ? 800 : 700} fill={a.kind === "metric" ? "#1D4ED8" : "#0F172A"} style={{ fontFamily: "Inter, sans-serif", letterSpacing: isTitle ? "0.01em" : undefined }}>
              {label}
            </text>
            {detailLines.map((d, i) => (
              <text key={i} x={x} y={plateY + h + i * 14 * k + 4 * k} textAnchor="middle" fontSize={10 * k} fontWeight={500} fill="#475569" style={{ fontFamily: "Inter, sans-serif" }}>
                {d}
              </text>
            ))}
          </g>
        );
      })}
    </g>
  );
});
