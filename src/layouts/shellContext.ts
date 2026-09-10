import { createContext } from "react";

/** Minimal shell UI state shared between header (open control) and mobile drawer. */
export interface ShellContextValue {
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
}

export const ShellContext = createContext<ShellContextValue>({
  mobileOpen: false,
  openMobile: () => {},
  closeMobile: () => {},
});
