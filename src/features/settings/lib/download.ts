/**
 * Browser download for a text payload — used by Data & Storage to hand back the
 * settings JSON and the full local-data export. No dependencies, no round trip:
 * the file is built in memory and revoked shortly after the download starts.
 */
export function downloadTextFile(fileName: string, payload: string, mime = "application/json"): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([payload], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Human-readable byte count for the storage inventory. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
