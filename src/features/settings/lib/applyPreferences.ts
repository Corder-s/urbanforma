import type { AppSettings } from "../types/settings.types";

/**
 * Applies the persisted preferences to the document.
 *
 * Everything visual is a token or a CSS rule keyed off a `data-*` attribute on
 * `<html>`, so a preference change is one attribute write — no component has to
 * know about themes, and the OS-level `prefers-reduced-motion` /
 * `prefers-color-scheme` queries in `tokens.css` and `globals.css` keep working
 * alongside the in-app choices.
 */
export function applyPreferences(settings: AppSettings): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // "system" is resolved by CSS (@media prefers-color-scheme), so the attribute
  // is written through rather than computed here — the browser stays the source
  // of truth for the OS preference and reacts to it live.
  root.dataset.theme = settings.appearance.theme;
  if (settings.appearance.accent === "blue") delete root.dataset.accent;
  else root.dataset.accent = settings.appearance.accent;

  if (settings.accessibility.contrast === "high") root.dataset.contrast = "high";
  else delete root.dataset.contrast;

  // "auto" leaves the OS media query in charge.
  if (settings.accessibility.motion === "reduced") root.dataset.motion = "reduced";
  else delete root.dataset.motion;

  if (settings.accessibility.focus === "always") root.dataset.focus = "always";
  else delete root.dataset.focus;

  if (settings.accessibility.scale === "large") root.dataset.scale = "large";
  else delete root.dataset.scale;
}
