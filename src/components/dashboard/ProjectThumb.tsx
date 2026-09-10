import { useId } from "react";

interface ProjectThumbProps {
  /** 0–4 selects the miniature site layout/color mix. */
  variant?: number;
  className?: string;
  label?: string;
}

type Pt = [number, number];

// Isometric projection (compact thumbnail scale).
const TW = 34;
const TH = 17;
const OX = 120;
const OY = 64;
const N = 6; // grid spans 0..N
const iso = (x: number, y: number, z = 0): Pt => [
  OX + (x - y) * (TW / 2),
  OY + (x + y) * (TH / 2) - z,
];
const pts = (arr: Pt[]) => arr.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

interface Bld {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  c: number;
}

const COLORS = [
  { roof: "#EAF1FE", east: "#93B4EE", south: "#5E86D6" }, // blue
  { roof: "#E6FAFE", east: "#8FD9E6", south: "#43AEC4" }, // teal
  { roof: "#EDF1F8", east: "#B3C0DD", south: "#8294BF" }, // slate
  { roof: "#E1ECFF", east: "#82ABEE", south: "#4F79C9" }, // deep blue
  { roof: "#F1EAFF", east: "#C9B6EC", south: "#9E80D6" }, // violet
];

// Distinct, deterministic site layouts per project.
const LAYOUTS: Bld[][] = [
  [
    { x: 1.0, y: 0.8, w: 1.4, d: 1.4, h: 46, c: 0 },
    { x: 2.7, y: 1.0, w: 1.2, d: 1.6, h: 38, c: 3 },
    { x: 1.2, y: 2.6, w: 1.6, d: 1.2, h: 54, c: 0 },
    { x: 3.2, y: 2.8, w: 1.3, d: 1.3, h: 30, c: 1 },
    { x: 2.9, y: 4.3, w: 1.4, d: 1.2, h: 24, c: 2 },
    { x: 1.0, y: 4.2, w: 1.0, d: 1.0, h: 20, c: 1 },
  ],
  [
    { x: 1.6, y: 0.7, w: 1.5, d: 1.5, h: 40, c: 1 },
    { x: 3.4, y: 1.2, w: 1.2, d: 1.2, h: 52, c: 0 },
    { x: 3.3, y: 2.8, w: 1.4, d: 1.5, h: 34, c: 3 },
    { x: 1.4, y: 3.0, w: 1.3, d: 1.3, h: 26, c: 4 },
    { x: 3.6, y: 4.4, w: 1.0, d: 1.0, h: 18, c: 1 },
  ],
  [
    { x: 0.9, y: 1.0, w: 1.2, d: 1.2, h: 30, c: 2 },
    { x: 2.5, y: 0.8, w: 1.5, d: 1.5, h: 44, c: 0 },
    { x: 4.1, y: 1.6, w: 1.2, d: 1.2, h: 26, c: 1 },
    { x: 2.7, y: 2.8, w: 1.3, d: 1.3, h: 50, c: 3 },
    { x: 1.0, y: 3.0, w: 1.4, d: 1.2, h: 22, c: 1 },
    { x: 2.6, y: 4.4, w: 1.5, d: 1.1, h: 18, c: 2 },
  ],
  [
    { x: 1.8, y: 1.2, w: 1.8, d: 1.4, h: 34, c: 0 },
    { x: 3.8, y: 1.6, w: 1.3, d: 1.3, h: 28, c: 2 },
    { x: 2.0, y: 3.2, w: 1.4, d: 1.4, h: 42, c: 3 },
    { x: 3.8, y: 3.4, w: 1.2, d: 1.2, h: 22, c: 1 },
  ],
  [
    { x: 2.2, y: 1.0, w: 1.4, d: 1.4, h: 48, c: 3 },
    { x: 3.9, y: 2.0, w: 1.2, d: 1.2, h: 36, c: 0 },
    { x: 1.4, y: 2.4, w: 1.2, d: 1.2, h: 28, c: 1 },
    { x: 3.0, y: 3.6, w: 1.3, d: 1.3, h: 20, c: 2 },
    { x: 1.3, y: 4.2, w: 1.0, d: 1.0, h: 16, c: 4 },
  ],
];

const TREES: Pt[] = [
  [0.6, 2.0],
  [4.8, 0.8],
  [5.0, 3.4],
  [0.7, 5.0],
  [2.2, 5.4],
  [4.6, 5.1],
];

function Building({ b }: { b: Bld }) {
  const { x, y, w, d, h } = b;
  const c = COLORS[b.c % COLORS.length];
  const A = iso(x, y, h);
  const B = iso(x + w, y, h);
  const C = iso(x + w, y + d, h);
  const D = iso(x, y + d, h);
  const B0 = iso(x + w, y, 0);
  const C0 = iso(x + w, y + d, 0);
  const D0 = iso(x, y + d, 0);
  return (
    <g>
      <polygon points={pts([D, C, C0, D0])} fill={c.south} />
      <polygon points={pts([B, C, C0, B0])} fill={c.east} />
      <polygon points={pts([A, B, C, D])} fill={c.roof} stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
    </g>
  );
}

function Tree({ p }: { p: Pt }) {
  const [cx, cy] = iso(p[0], p[1], 13);
  return (
    <g>
      <circle cx={cx} cy={cy} r={4.4} fill="#5BBF77" />
      <circle cx={cx - 1.2} cy={cy - 1.2} r={2} fill="#8FE0A4" opacity={0.8} />
    </g>
  );
}

/**
 * Miniature isometric site preview used on project cards. Pure SVG (buildings,
 * roads, park and water) — no 3D engine and no runtime animation cost.
 */
export function ProjectThumb({ variant = 0, className = "", label = "Project site preview" }: ProjectThumbProps) {
  const gid = useId();
  const buildings = LAYOUTS[variant % LAYOUTS.length];
  const hasWater = variant === 1 || variant === 4;

  const ground: Pt[] = [iso(0, 0), iso(N, 0), iso(N, N), iso(0, N)];
  const park: Pt[] = [iso(0.3, 3.3), iso(2.4, 3.3), iso(2.4, 5.7), iso(0.3, 5.7)];
  const water: Pt[] = [iso(3.6, 0.3), iso(5.8, 0.3), iso(5.8, 2.3), iso(3.6, 2.3)];

  return (
    <svg
      viewBox="0 0 240 172"
      role="img"
      aria-label={label}
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${gid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F7FBFF" />
          <stop offset="100%" stopColor="#EAF2FE" />
        </linearGradient>
      </defs>
      <rect width="240" height="172" fill={`url(#${gid}-sky)`} />

      {/* site parcel */}
      <polygon points={pts(ground)} fill="#E4EEFD" stroke="#C7D8F2" strokeWidth="1" />

      {/* park */}
      <polygon points={pts(park)} fill="#D5EDD2" stroke="#BFE0BC" strokeWidth="1" />

      {/* water (waterfront variants) */}
      {hasWater && (
        <polygon points={pts(water)} fill="#BFE3F5" stroke="#A6D4EE" strokeWidth="1" />
      )}

      {/* roads */}
      <polyline
        points={pts([iso(0.2, 2.7, 0.4), iso(N - 0.2, 2.7, 0.4)])}
        fill="none"
        stroke="rgba(15,23,42,0.14)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <polyline
        points={pts([iso(2.7, 0.2, 0.4), iso(2.7, N - 0.2, 0.4)])}
        fill="none"
        stroke="rgba(15,23,42,0.14)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* buildings, far to near */}
      {[...buildings]
        .sort((a, b) => a.x + a.y - (b.x + b.y))
        .map((b, i) => (
          <Building key={i} b={b} />
        ))}

      {/* trees */}
      {TREES.map((t, i) => (
        <Tree key={i} p={t} />
      ))}
    </svg>
  );
}
