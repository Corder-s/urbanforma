import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";

/* Isometric smart-city scene (pure SVG/CSS, no heavy 3D library). */

const TILE_W = 46;
const TILE_H = 23;
const ORIGIN_X = 372;
const ORIGIN_Y = 300;

function iso(x: number, z: number, y = 0): [number, number] {
  return [
    ORIGIN_X + (x - z) * (TILE_W / 2),
    ORIGIN_Y + (x + z) * (TILE_H / 2) - y,
  ];
}

interface BuildingSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  tone: "blue" | "deep" | "light" | "cyan" | "white";
  delay: number;
  antenna?: boolean;
}

/** The three viewing modes offered by the landing page's demo controls. */
export type CityViewMode = "3d" | "map" | "satellite";

/**
 * Orthographic top-down projection for the map / satellite views, matched to
 * the same 720x600 viewBox as the isometric scene so the two read as the same
 * city from a different camera.
 */
const PLAN_CX = 360;
const PLAN_CY = 300;
const PLAN_S = 42;
function plan(x: number, z: number): [number, number] {
  return [PLAN_CX + x * PLAN_S, PLAN_CY + z * PLAN_S];
}

// Site geometry in grid units, shared by both cameras so the 3D / map /
// satellite views always describe the same place.
const GROUND: [number, number][] = [[-6.5, -0.2], [0.5, -6.6], [7, -0.4], [0.6, 6.2]];
const PARK: [number, number][] = [[-0.9, 0.4], [0.1, -0.5], [1.1, 0.4], [0.1, 1.4]];
const ROAD_A: [number, number][] = [[-6.2, 1.7], [0.2, -4.1], [0.7, -3.6], [-5.7, 2.2]];
const ROAD_B: [number, number][] = [[-1.4, 5.6], [5.6, -0.8], [6.1, -0.3], [-0.9, 6.1]];
const RIVER: [number, number][] = [[1.2, 4.4], [5.6, 3.4], [6.4, 0.6], [5.2, -2.4], [6.2, -4.6]];
const BRIDGE: [number, number][] = [[2.6, 2.4], [6.4, -1.2]];
const TREES: { x: number; z: number; s: number }[] = [
  { x: -0.1, z: 0.7, s: 1 }, { x: 0.6, z: 0.5, s: 0.8 }, { x: -0.6, z: 0.2, s: 0.7 },
  { x: -5.4, z: 3.2, s: 0.9 }, { x: 1.2, z: 4.2, s: 0.85 },
];

function polyOf(pts: [number, number][], proj: (x: number, z: number) => [number, number]): string {
  return pts.map(([x, z]) => proj(x, z).join(",")).join(" ");
}

/** Cartographic vs aerial palettes for the two top-down cameras. */
const PLAN_PALETTE = {
  map: {
    ground: "#f3f8fe", groundStroke: "#d3e1f5", road: "#ffffff", roadCasing: "#c9d8ee",
    building: "#e2ecfb", buildingStroke: "#b6cbe9", park: "#cdeed6", water: "#a8dcf8",
    bridge: "#ffffff", tree: "#3fa06a", label: "#64748b", grid: "#e3edfa",
  },
  satellite: {
    ground: "#c8d2bf", groundStroke: "#aeb9a4", road: "#98a196", roadCasing: "#7c857a",
    building: "#8d979f", buildingStroke: "#6f7a83", park: "#6e9160", water: "#4d7f96",
    bridge: "#c3cabf", tree: "#40663a", label: "#f4f7f2", grid: "transparent",
  },
} as const;

/**
 * Top-down rendering of the same site, used by the Map and Satellite demo
 * views. The isometric scene above only ever drew one camera, which is why the
 * landing page's 3D / Map / Satellite buttons appeared to do nothing.
 */
function PlanScene({ mode }: { mode: "map" | "satellite" }) {
  const c = PLAN_PALETTE[mode];
  const aerial = mode === "satellite";
  const river = RIVER.map(([x, z]) => plan(x, z));
  const riverPath =
    `M ${river[0][0]} ${river[0][1]}` +
    ` C ${river[1][0]} ${river[1][1] - 26}, ${river[2][0] + 10} ${river[2][1]}, ${river[3][0]} ${river[3][1]}` +
    ` C ${river[4][0] + 4} ${river[4][1] + 10}, ${river[4][0]} ${river[4][1]}, ${river[4][0]} ${river[4][1]}`;

  return (
    <svg viewBox="0 0 720 600" className="h-full w-full" role="img"
      aria-label={aerial
        ? "Aerial-style top-down view of the site: building rooftops, streets, park, river and tree canopy."
        : "Top-down map view of the site: building footprints, street network, park, river and labels."}>
      <defs>
        <radialGradient id={`lp-vignette-${mode}`} cx="50%" cy="46%" r="72%">
          <stop offset="62%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor={aerial ? "rgba(24,32,26,0.42)" : "rgba(37,99,235,0.10)"} />
        </radialGradient>
      </defs>

      <polygon points={polyOf(GROUND, plan)} fill={c.ground} stroke={c.groundStroke} strokeWidth={2} />

      {/* survey grid — maps only; aerial imagery has no grid */}
      {!aerial && (
        <g stroke={c.grid} strokeWidth={1}>
          {[-6, -4, -2, 0, 2, 4, 6].map((v) => (
            <line key={`v${v}`} x1={plan(v, -6.6)[0]} y1={plan(v, -6.6)[1]} x2={plan(v, 6.2)[0]} y2={plan(v, 6.2)[1]} />
          ))}
          {[-6, -4, -2, 0, 2, 4, 6].map((v) => (
            <line key={`h${v}`} x1={plan(-6.5, v)[0]} y1={plan(-6.5, v)[1]} x2={plan(7, v)[0]} y2={plan(7, v)[1]} />
          ))}
        </g>
      )}

      <polygon points={polyOf(PARK, plan)} fill={c.park} />
      <polygon points={polyOf(ROAD_A, plan)} fill={c.road} stroke={c.roadCasing} strokeWidth={aerial ? 1 : 2} />
      <polygon points={polyOf(ROAD_B, plan)} fill={c.road} stroke={c.roadCasing} strokeWidth={aerial ? 1 : 2} />

      <path d={riverPath} stroke={c.water} strokeWidth={24} strokeLinecap="round" fill="none" />
      <line x1={plan(BRIDGE[0][0], BRIDGE[0][1])[0]} y1={plan(BRIDGE[0][0], BRIDGE[0][1])[1]}
        x2={plan(BRIDGE[1][0], BRIDGE[1][1])[0]} y2={plan(BRIDGE[1][0], BRIDGE[1][1])[1]}
        stroke={c.bridge} strokeWidth={6} strokeLinecap="round" />

      {/* rooftops; aerial gets a cast shadow so heights still read from above */}
      {BUILDINGS.map((b, i) => {
        const [x0, y0] = plan(b.x - b.w / 2, b.z - b.d / 2);
        const [x1, y1] = plan(b.x + b.w / 2, b.z + b.d / 2);
        const w = x1 - x0, h = y1 - y0;
        return (
          <g key={i}>
            {aerial && <rect x={x0 + 3} y={y0 + 4} width={w} height={h} rx={2} fill="rgba(30,38,32,0.28)" />}
            <rect x={x0} y={y0} width={w} height={h} rx={2}
              fill={c.building} stroke={c.buildingStroke} strokeWidth={aerial ? 0.8 : 1.4} />
            {!aerial && <rect x={x0 + w * 0.28} y={y0 + h * 0.28} width={w * 0.44} height={h * 0.44} rx={1} fill={c.buildingStroke} opacity={0.35} />}
          </g>
        );
      })}

      {TREES.map((t, i) => {
        const [tx, ty] = plan(t.x, t.z);
        return <circle key={i} cx={tx} cy={ty} r={9 * t.s} fill={c.tree} opacity={aerial ? 0.9 : 0.8} />;
      })}

      {!aerial && (
        <g fill={c.label} fontSize={13} fontWeight={700} fontFamily="Inter, sans-serif" letterSpacing={1.4}>
          <text x={plan(0.1, 0.9)[0]} y={plan(0.1, 0.9)[1]} textAnchor="middle">PARK</text>
          <text x={plan(4.4, 2.6)[0]} y={plan(4.4, 2.6)[1]} textAnchor="middle">RIVER</text>
        </g>
      )}

      <rect x={0} y={0} width={720} height={600} fill={`url(#lp-vignette-${mode})`} />
    </svg>
  );
}

const TONES: Record<BuildingSpec["tone"], { top: string; left: string; right: string }> = {
  blue: { top: "#bfd9ff", left: "#7fb0f5", right: "#4c82dd" },
  deep: { top: "#a9c7f7", left: "#5b8ee7", right: "#2f64c4" },
  light: { top: "#e4efff", left: "#c4dbfb", right: "#9cc0f2" },
  cyan: { top: "#b9ecf6", left: "#6fd0e8", right: "#2ea7cc" },
  white: { top: "#ffffff", left: "#e8f1fe", right: "#c7daf4" },
};

function Building({ spec }: { spec: BuildingSpec }) {
  const { x, z, w, d, h, tone, delay } = spec;
  const c = TONES[tone];

  const g00 = iso(x - w / 2, z - d / 2, 0);
  const g10 = iso(x + w / 2, z - d / 2, 0);
  const g11 = iso(x + w / 2, z + d / 2, 0);
  const g01 = iso(x - w / 2, z + d / 2, 0);
  const t00 = iso(x - w / 2, z - d / 2, h);
  const t10 = iso(x + w / 2, z - d / 2, h);
  const t11 = iso(x + w / 2, z + d / 2, h);
  const t01 = iso(x - w / 2, z + d / 2, h);

  const poly = (pts: [number, number][]) => pts.map((p) => p.join(",")).join(" ");

  const floors = Math.max(3, Math.round(h / 16));
  const dots: JSX.Element[] = [];
  const winFill = tone === "white" ? "#9cc0f2" : "rgba(255,255,255,0.85)";
  for (let f = 1; f < floors; f++) {
    const fy = h - (f / floors) * h + 5;
    for (let k = 0; k < Math.max(1, Math.round(w)); k++) {
      const u = 0.3 + (0.4 * k) / Math.max(1, Math.round(w) - 1);
      dots.push(
        <rect key={`l${f}${k}`} x={g01[0] + (g00[0] - g01[0]) * u - 2.4}
          y={g01[1] + (g00[1] - g01[1]) * u - fy - 2}
          width={4.8} height={3.4} rx={1} fill={winFill} opacity={0.7} />
      );
    }
    for (let k = 0; k < Math.max(1, Math.round(d)); k++) {
      const u = 0.3 + (0.4 * k) / Math.max(1, Math.round(d) - 1);
      dots.push(
        <rect key={`r${f}${k}`} x={g11[0] + (g10[0] - g11[0]) * u - 2.4}
          y={g11[1] + (g10[1] - g11[1]) * u - fy - 2}
          width={4.8} height={3.4} rx={1} fill={winFill} opacity={0.55} />
      );
    }
  }

  return (
    <g className="city-building" style={{ "--d": `${delay}ms` } as CSSProperties}>
      <polygon points={poly([g01, g00, t00, t01])} fill={c.left} />
      <polygon points={poly([g11, g10, t10, t11])} fill={c.right} />
      {dots}
      <polygon points={poly([t00, t10, t11, t01])} fill={c.top} />
      {spec.antenna && (
        <line x1={iso(x, z, h)[0]} y1={iso(x, z, h)[1]}
          x2={iso(x, z, h + 26)[0]} y2={iso(x, z, h + 26)[1]}
          stroke="#2f64c4" strokeWidth={2} strokeLinecap="round" />
      )}
    </g>
  );
}

function Tree({ x, z, s = 1, delay = 0 }: { x: number; z: number; s?: number; delay?: number }) {
  const [bx, by] = iso(x, z, 0);
  return (
    <g className="city-tree" style={{ "--d": `${delay}ms` } as CSSProperties}
      transform={`translate(${bx},${by}) scale(${s})`}>
      <ellipse cx={0} cy={-2} rx={11} ry={5} fill="rgba(21,101,52,0.18)" />
      <rect x={-1.6} y={-12} width={3.2} height={10} rx={1.5} fill="#b98a5e" />
      <circle cx={0} cy={-17} r={8.5} fill="#34a767" className="tree-sway" />
      <circle cx={-5} cy={-14} r={6} fill="#48bd7c" className="tree-sway" />
      <circle cx={5} cy={-14} r={6} fill="#2f965c" className="tree-sway" />
    </g>
  );
}

const BUILDINGS: BuildingSpec[] = [
  { x: -3.2, z: -2.4, w: 1.7, d: 1.7, h: 118, tone: "deep", delay: 150, antenna: true },
  { x: -1.2, z: -3.2, w: 1.5, d: 1.5, h: 96, tone: "blue", delay: 220 },
  { x: -4.6, z: -0.6, w: 1.5, d: 1.5, h: 84, tone: "cyan", delay: 260 },
  { x: -1.6, z: -0.6, w: 1.4, d: 1.4, h: 70, tone: "white", delay: 300 },
  { x: -3.4, z: 1.2, w: 1.3, d: 1.3, h: 58, tone: "light", delay: 340 },
  { x: 2.6, z: -2.8, w: 1.7, d: 1.7, h: 104, tone: "blue", delay: 380, antenna: true },
  { x: 4.4, z: -1.4, w: 1.5, d: 1.5, h: 88, tone: "deep", delay: 420 },
  { x: 2.2, z: -0.6, w: 1.4, d: 1.4, h: 66, tone: "white", delay: 460 },
  { x: 4.2, z: 1.0, w: 1.3, d: 1.3, h: 54, tone: "cyan", delay: 500 },
  { x: -2.2, z: 3.0, w: 1.6, d: 1.2, h: 40, tone: "light", delay: 540 },
  { x: 0.4, z: 3.2, w: 1.5, d: 1.2, h: 46, tone: "white", delay: 580 },
  { x: 3.0, z: 2.8, w: 1.6, d: 1.2, h: 44, tone: "light", delay: 620 },
  { x: -4.6, z: 2.6, w: 1.2, d: 1.2, h: 38, tone: "white", delay: 660 },
  { x: 4.8, z: 2.6, w: 1.2, d: 1.2, h: 42, tone: "cyan", delay: 700 },
];

export function LandingCityScene({ className = "", mode = "3d" }: { className?: string; mode?: CityViewMode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const parallaxRef = useRef(true);

  useEffect(() => {
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    parallaxRef.current = !coarse && !reduced;
  }, []);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    if (!parallaxRef.current) return;
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: py * -4, y: px * 6 });
  }

  // Map / Satellite are a second camera over the same site: top-down, no
  // clouds (there is no sky in a plan view) and no entrance choreography.
  if (mode !== "3d") {
    return (
      <div
        ref={wrapRef}
        onMouseMove={onMove}
        onMouseLeave={() => parallaxRef.current && setTilt({ x: 0, y: 0 })}
        className={`relative h-full w-full select-none ${className}`}
      >
        <div
          className="relative z-10 h-full w-full transition-transform duration-500 ease-out will-change-transform"
          style={{ transform: `perspective(1200px) rotateX(${tilt.x * 0.25}deg) rotateY(${tilt.y * 0.25}deg)` }}
        >
          <PlanScene mode={mode} />
        </div>
      </div>
    );
  }

  const river = [iso(1.2, 4.4), iso(5.6, 3.4), iso(6.4, 0.6), iso(5.2, -2.4), iso(6.2, -4.6)];
  const riverPath =
    `M ${river[0][0]} ${river[0][1]}` +
    ` C ${river[1][0]} ${river[1][1] - 30}, ${river[2][0] + 10} ${river[2][1]}, ${river[3][0]} ${river[3][1]}` +
    ` C ${river[4][0] + 4} ${river[4][1] + 10}, ${river[4][0]} ${river[4][1]}, ${river[4][0]} ${river[4][1]}`;

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={() => parallaxRef.current && setTilt({ x: 0, y: 0 })}
      className={`relative h-full w-full select-none ${className}`}
    >
      {/* drifting clouds */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-[8%] top-[10%] h-10 w-32 rounded-full bg-surface/70 blur-md animate-drift-slow" />
        <div className="absolute right-[14%] top-[20%] h-8 w-24 rounded-full bg-on-brand/60 blur-md animate-drift" />
        <div className="absolute left-[24%] top-[38%] h-6 w-20 rounded-full bg-on-brand/50 blur-md animate-drift" />
      </div>

      <div
        className="relative z-10 h-full w-full transition-transform duration-500 ease-out will-change-transform"
        style={{ transform: `perspective(1200px) rotateX(${tilt.x * 0.25}deg) rotateY(${tilt.y * 0.25}deg)` }}
      >
        <svg viewBox="0 0 720 600" className="h-full w-full" role="img"
          aria-label="Isometric smart-city visualization with buildings, roads, a park, a river, bridge and solar panels.">
          <defs>
            <linearGradient id="lc-ground" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e3eefd" />
            </linearGradient>
            <linearGradient id="lc-river" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="lc-road" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#d7e4f6" />
              <stop offset="100%" stopColor="#c3d6f0" />
            </linearGradient>
          </defs>

          <polygon
            points={[iso(-6.5, -0.2), iso(0.5, -6.6), iso(7, -0.4), iso(0.6, 6.2)].map((p) => p.join(",")).join(" ")}
            fill="url(#lc-ground)" stroke="#d3e1f5" strokeWidth={2} className="city-base" />
          <polygon
            points={[iso(-0.9, 0.4), iso(0.1, -0.5), iso(1.1, 0.4), iso(0.1, 1.4)].map((p) => p.join(",")).join(" ")}
            fill="#bfe8c9" className="city-base" style={{ animationDelay: "80ms" }} />
          <polygon
            points={[iso(-6.2, 1.7), iso(0.2, -4.1), iso(0.7, -3.6), iso(-5.7, 2.2)].map((p) => p.join(",")).join(" ")}
            fill="url(#lc-road)" className="city-base" style={{ animationDelay: "40ms" }} />
          <polygon
            points={[iso(-1.4, 5.6), iso(5.6, -0.8), iso(6.1, -0.3), iso(-0.9, 6.1)].map((p) => p.join(",")).join(" ")}
            fill="url(#lc-road)" className="city-base" style={{ animationDelay: "60ms" }} />

          <path d={riverPath} stroke="url(#lc-river)" strokeWidth={26} strokeLinecap="round" fill="none" className="city-river" />
          <g className="city-base" style={{ animationDelay: "140ms" }}>
            <line x1={iso(2.6, 2.4)[0]} y1={iso(2.6, 2.4)[1]} x2={iso(6.4, -1.2)[0]} y2={iso(6.4, -1.2)[1]}
              stroke="#ffffff" strokeWidth={7} strokeLinecap="round" />
            <line x1={iso(2.6, 2.4)[0]} y1={iso(2.6, 2.4)[1]} x2={iso(6.4, -1.2)[0]} y2={iso(6.4, -1.2)[1]}
              stroke="#c3d6f0" strokeWidth={2} strokeDasharray="4 6" />
          </g>

          {BUILDINGS.slice().sort((a, b) => a.x + a.z - (b.x + b.z)).map((b, i) => (
            <Building key={i} spec={b} />
          ))}

          <Tree x={-0.1} z={0.7} s={1} delay={700} />
          <Tree x={0.6} z={0.5} s={0.8} delay={760} />
          <Tree x={-0.6} z={0.2} s={0.7} delay={820} />
          <Tree x={-5.4} z={3.2} s={0.9} delay={720} />
          <Tree x={1.2} z={4.2} s={0.85} delay={780} />

          {/* solar panels */}
          <g className="city-building" style={{ "--d": "640ms" } as CSSProperties}>
            {(() => {
              const [px, py] = iso(-1.6, -0.6, 70);
              return (
                <g transform={`translate(${px - 12},${py - 4})`}>
                  <rect x={0} y={0} width={24} height={13} rx={2} fill="#1d4ed8" opacity={0.85} transform="skewX(-26)" />
                  <rect x={2} y={-6} width={24} height={13} rx={2} fill="#3b82f6" opacity={0.85} transform="skewX(26)" />
                </g>
              );
            })()}
          </g>

          {/* data paths + points */}
          <path d={`M ${iso(-5, 2)[0]} ${iso(-5, 2)[1]} Q ${iso(-1, -3)[0] - 40} ${iso(-1, -3)[1] - 30} ${iso(3, -2)[0]} ${iso(3, -2)[1]}`}
            fill="none" stroke="#2563eb" strokeWidth={2.4} strokeLinecap="round" className="city-datapath" opacity={0.6} />
          <circle r={4.5} fill="#2563eb" className="city-dot">
            <animateMotion dur="5s" repeatCount="indefinite"
              path={`M ${iso(-5, 2)[0]} ${iso(-5, 2)[1]} Q ${iso(-1, -3)[0] - 40} ${iso(-1, -3)[1] - 30} ${iso(3, -2)[0]} ${iso(3, -2)[1]}`} />
          </circle>
          <circle r={3.5} fill="#06b6d4" className="city-dot">
            <animateMotion dur="7s" begin="1.5s" repeatCount="indefinite"
              path={`M ${iso(2, 4)[0]} ${iso(2, 4)[1]} Q ${iso(6, 0)[0] + 30} ${iso(6, 0)[1] - 20} ${iso(5, -4)[0]} ${iso(5, -4)[1]}`} />
          </circle>

          {[
            { x: 150, y: 150, d: 0 }, { x: 560, y: 130, d: 1.2 },
            { x: 600, y: 320, d: 0.6 }, { x: 120, y: 340, d: 1.8 }, { x: 470, y: 470, d: 0.9 },
          ].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="#60a5fa" className="city-particle"
              style={{ animationDelay: `${p.d}s` } as CSSProperties} />
          ))}
        </svg>
      </div>
    </div>
  );
}
