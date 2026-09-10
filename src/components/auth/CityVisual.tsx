import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import {
  Boxes,
  Leaf,
  Lightbulb,
  LineChart,
  Sprout,
  Sun,
} from "lucide-react";
import { FloatingInsight } from "./FloatingInsight";

/* ============================================================
   Isometric projection helpers
   ============================================================ */
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

const TONES: Record<
  BuildingSpec["tone"],
  { top: string; left: string; right: string }
> = {
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
    const colsL = Math.max(1, Math.round(w));
    for (let k = 0; k < colsL; k++) {
      const u = 0.3 + (0.4 * k) / Math.max(1, colsL - 1);
      const bx = g01[0] + (g00[0] - g01[0]) * u;
      const by = g01[1] + (g00[1] - g01[1]) * u - fy;
      dots.push(
        <rect key={`l${f}-${k}`} x={bx - 2.4} y={by - 2} width={4.8} height={3.4} rx={1} fill={winFill} opacity={0.7} />
      );
    }
    const colsR = Math.max(1, Math.round(d));
    for (let k = 0; k < colsR; k++) {
      const u = 0.3 + (0.4 * k) / Math.max(1, colsR - 1);
      const bx = g11[0] + (g10[0] - g11[0]) * u;
      const by = g11[1] + (g10[1] - g11[1]) * u - fy;
      dots.push(
        <rect key={`r${f}-${k}`} x={bx - 2.4} y={by - 2} width={4.8} height={3.4} rx={1} fill={winFill} opacity={0.55} />
      );
    }
  }

  return (
    <g className="city-building" style={{ "--d": `${delay}ms` } as CSSProperties}>
      <polygon points={poly([g01, g00, t00, t01])} fill={c.left} />
      <polygon points={poly([g11, g10, t10, t11])} fill={c.right} />
      {dots}
      <polygon points={poly([t00, t10, t11, t01])} fill={c.top} />
      <polygon
        points={poly([
          iso(x - w * 0.22, z - d * 0.22, h + 1),
          iso(x + w * 0.22, z - d * 0.22, h + 1),
          iso(x + w * 0.22, z + d * 0.22, h + 1),
          iso(x - w * 0.22, z + d * 0.22, h + 1),
        ])}
        fill="#ffffff"
        opacity={0.7}
      />
      {spec.antenna && (
        <line
          x1={iso(x, z, h)[0]}
          y1={iso(x, z, h)[1]}
          x2={iso(x, z, h + 26)[0]}
          y2={iso(x, z, h + 26)[1]}
          stroke="#2f64c4"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

function Tree({ x, z, s = 1, delay = 0 }: { x: number; z: number; s?: number; delay?: number }) {
  const [bx, by] = iso(x, z, 0);
  return (
    <g
      className="city-tree"
      style={{ "--d": `${delay}ms` } as CSSProperties}
      transform={`translate(${bx},${by}) scale(${s})`}
    >
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

export function CityVisual() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const parallaxRef = useRef(true);

  // Disable parallax on touch devices or when reduced motion is preferred.
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    parallaxRef.current = !coarse && !reduced;
  }, []);

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!parallaxRef.current) return;
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    // intentionally subtle
    setTilt({ x: py * -4, y: px * 6 });
  }

  function reset() {
    if (!parallaxRef.current) return;
    setTilt({ x: 0, y: 0 });
  }

  const river = [
    iso(1.2, 4.4), iso(5.6, 3.4), iso(6.4, 0.6), iso(5.2, -2.4), iso(6.2, -4.6),
  ];
  const riverPath =
    `M ${river[0][0]} ${river[0][1]}` +
    ` C ${river[1][0]} ${river[1][1] - 30}, ${river[2][0] + 10} ${river[2][1]}, ${river[3][0]} ${river[3][1]}` +
    ` C ${river[4][0] + 4} ${river[4][1] + 10}, ${river[4][0]} ${river[4][1]}, ${river[4][0]} ${river[4][1]}`;

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMouseMove}
      onMouseLeave={reset}
      className="relative h-full w-full select-none"
    >
      {/* minimal top nav on the visual side */}
      <nav className="absolute right-6 top-6 z-20 hidden gap-6 text-sm font-semibold text-muted md:flex">
        {["Plan", "Design", "Analyze", "Optimize"].map((item, i) => (
          <a
            key={item}
            href="#"
            onClick={(e) => e.preventDefault()}
            className={[
              "relative pb-1.5 transition-colors hover:text-primary",
              i === 0
                ? "text-primary after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary"
                : "",
            ].join(" ")}
          >
            {item}
          </a>
        ))}
      </nav>

      {/* heading */}
      <div className="absolute left-8 top-16 z-20 max-w-[240px] animate-rise-in anim-delay-1">
        <h2 className="text-[30px] font-extrabold leading-tight tracking-tight text-ink">
          Shape <span className="text-primary">Smarter</span> Cities
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Plan, design and simulate sustainable urban environments with
          data-driven insight.
        </p>
      </div>

      {/* drifting clouds */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-[8%] top-[10%] h-10 w-32 rounded-full bg-white/70 blur-md animate-drift-slow" />
        <div className="absolute right-[14%] top-[20%] h-8 w-24 rounded-full bg-white/60 blur-md animate-drift" />
        <div className="absolute left-[24%] top-[38%] h-6 w-20 rounded-full bg-white/50 blur-md animate-drift" />
      </div>

      <div
        className="relative z-10 h-full w-full transition-transform duration-500 ease-out will-change-transform"
        style={{
          transform: `perspective(1200px) rotateX(${tilt.x * 0.25}deg) rotateY(${tilt.y * 0.25}deg)`,
        }}
      >
        <svg
          viewBox="0 0 720 600"
          className="h-full w-full"
          role="img"
          aria-label="Illustrated isometric smart city with buildings, roads, a park, a river, a bridge and solar panels."
        >
          <defs>
            <linearGradient id="groundGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e3eefd" />
            </linearGradient>
            <linearGradient id="riverGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="roadGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#d7e4f6" />
              <stop offset="100%" stopColor="#c3d6f0" />
            </linearGradient>
          </defs>

          <polygon
            points={[iso(-6.5, -0.2), iso(0.5, -6.6), iso(7, -0.4), iso(0.6, 6.2)].map((p) => p.join(",")).join(" ")}
            fill="url(#groundGrad)"
            stroke="#d3e1f5"
            strokeWidth={2}
            className="city-base"
          />
          <polygon
            points={[iso(-0.9, 0.4), iso(0.1, -0.5), iso(1.1, 0.4), iso(0.1, 1.4)].map((p) => p.join(",")).join(" ")}
            fill="#bfe8c9"
            className="city-base"
            style={{ animationDelay: "80ms" }}
          />
          <polygon
            points={[iso(-6.2, 1.7), iso(0.2, -4.1), iso(0.7, -3.6), iso(-5.7, 2.2)].map((p) => p.join(",")).join(" ")}
            fill="url(#roadGrad)"
            className="city-base"
            style={{ animationDelay: "40ms" }}
          />
          <polygon
            points={[iso(-1.4, 5.6), iso(5.6, -0.8), iso(6.1, -0.3), iso(-0.9, 6.1)].map((p) => p.join(",")).join(" ")}
            fill="url(#roadGrad)"
            className="city-base"
            style={{ animationDelay: "60ms" }}
          />

          <path d={riverPath} stroke="url(#riverGrad)" strokeWidth={26} strokeLinecap="round" fill="none" className="city-river" />
          <path d={riverPath} stroke="#e0f2fe" strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" fill="none" className="city-river" style={{ animationDelay: "120ms" }} />

          <g className="city-base" style={{ animationDelay: "140ms" }}>
            <line x1={iso(2.6, 2.4)[0]} y1={iso(2.6, 2.4)[1]} x2={iso(6.4, -1.2)[0]} y2={iso(6.4, -1.2)[1]} stroke="#ffffff" strokeWidth={7} strokeLinecap="round" />
            <line x1={iso(2.6, 2.4)[0]} y1={iso(2.6, 2.4)[1]} x2={iso(6.4, -1.2)[0]} y2={iso(6.4, -1.2)[1]} stroke="#c3d6f0" strokeWidth={2} strokeDasharray="4 6" />
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

          {/* moving data paths */}
          <path
            d={`M ${iso(-5, 2)[0]} ${iso(-5, 2)[1]} Q ${iso(-1, -3)[0] - 40} ${iso(-1, -3)[1] - 30} ${iso(3, -2)[0]} ${iso(3, -2)[1]}`}
            fill="none" stroke="#2563eb" strokeWidth={2.4} strokeLinecap="round" className="city-datapath" opacity={0.6}
          />
          <circle r={4.5} fill="#2563eb" className="city-dot">
            <animateMotion dur="5s" repeatCount="indefinite"
              path={`M ${iso(-5, 2)[0]} ${iso(-5, 2)[1]} Q ${iso(-1, -3)[0] - 40} ${iso(-1, -3)[1] - 30} ${iso(3, -2)[0]} ${iso(3, -2)[1]}`} />
          </circle>
          <circle r={3.5} fill="#06b6d4" className="city-dot">
            <animateMotion dur="7s" begin="1.5s" repeatCount="indefinite"
              path={`M ${iso(2, 4)[0]} ${iso(2, 4)[1]} Q ${iso(6, 0)[0] + 30} ${iso(6, 0)[1] - 20} ${iso(5, -4)[0]} ${iso(5, -4)[1]}`} />
          </circle>

          {/* floating particles */}
          {[
            { x: 150, y: 150, d: 0 },
            { x: 560, y: 130, d: 1.2 },
            { x: 600, y: 320, d: 0.6 },
            { x: 120, y: 340, d: 1.8 },
            { x: 470, y: 470, d: 0.9 },
          ].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="#60a5fa" className="city-particle"
              style={{ animationDelay: `${p.d}s` } as CSSProperties} />
          ))}
        </svg>
      </div>

      {/* floating storytelling cards */}
      <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block">
        <FloatingInsight icon={Boxes} title="3D City Modeling" value="Live model" tone="blue" className="absolute left-[3%] top-[40%]" delay={750} />
        <FloatingInsight icon={Leaf} title="Environmental Analysis" value="Real-time" tone="green" className="absolute right-[3%] top-[34%]" delay={900} />
        <FloatingInsight icon={Lightbulb} title="Smart Planning" value="AI-assisted" tone="cyan" className="absolute left-[2%] bottom-[30%]" delay={1050} />
        <FloatingInsight icon={LineChart} title="Data Driven Decisions" value="Insights" tone="blue" className="absolute right-[2%] bottom-[26%]" delay={1200} />
        <FloatingInsight icon={Sprout} title="Sustainable Future" value="Low carbon" tone="green" className="absolute right-[16%] top-[54%]" delay={1350} />
      </div>

      {/* footer tags */}
      <div className="absolute bottom-5 left-6 z-20 hidden items-center gap-2 text-[13px] font-semibold text-muted md:flex">
        <Sun size={15} className="text-accent" />
        A Green Tomorrow
      </div>
      <div className="absolute bottom-5 right-6 z-20 hidden gap-3 text-[12.5px] font-medium text-faint sm:flex">
        <span>Urban Planning</span><span className="text-line">|</span>
        <span>GIS</span><span className="text-line">|</span>
        <span>3D</span><span className="text-line">|</span>
        <span>BIM</span>
      </div>
    </div>
  );
}
