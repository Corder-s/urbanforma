/**
 * Local "Capture View": a snapshot of what is on screen, built entirely in the
 * browser. The 3-D view exports its WebGL canvas as PNG; the 2-D map
 * serialises its SVG. Nothing is uploaded — the future rendering endpoint
 * (`POST /api/projects/:id/visualizations/render`) is not part of this step.
 */
export interface CaptureResult {
  kind: "png" | "svg";
  /** Object URL or data URL of the capture (revoked by the caller). */
  url: string;
  fileName: string;
  width: number;
  height: number;
}

export function captureSvg(container: HTMLElement | null, fileName: string): CaptureResult | null {
  const svg = container?.querySelector<SVGSVGElement>("svg[data-map-canvas]") ?? container?.querySelector("svg");
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  const width = Math.round(r.width) || Number(svg.getAttribute("width")) || 1280;
  const height = Math.round(r.height) || Number(svg.getAttribute("height")) || 800;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  // inline the container background so the export is not transparent
  const bg = container ? getComputedStyle(container).backgroundColor : "";
  if (bg && bg !== "rgba(0, 0, 0, 0)") {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", bg);
    clone.insertBefore(rect, clone.firstChild);
  }
  const markup = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const url = typeof URL.createObjectURL === "function" ? URL.createObjectURL(blob) : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  return { kind: "svg", url, fileName: `${fileName}.svg`, width, height };
}

export function capturePng(dataUrl: string | null, fileName: string, size: { width: number; height: number }): CaptureResult | null {
  if (!dataUrl || !dataUrl.startsWith("data:image/png")) return null;
  return { kind: "png", url: dataUrl, fileName: `${fileName}.png`, width: size.width, height: size.height };
}

export function safeFileName(...parts: (string | null | undefined)[]): string {
  return parts
    .filter((p): p is string => !!p)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function releaseCapture(c: CaptureResult | null) {
  if (c && c.url.startsWith("blob:") && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(c.url);
}
