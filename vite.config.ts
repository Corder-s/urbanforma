import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import pkg from "./package.json";

export default defineConfig({
  plugins: [react()],
  // The Settings → About panel reports the real application version. Only the
  // version string is inlined — never dependencies, scripts or environment.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 650,
    // Gzip-sizing every chunk on each build is pure dev-time overhead — the
    // numbers are for reporting only and nothing depends on them.
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("three")) return "three-vendor";

          // Order matters: "lucide-react" contains "react", so this must run
          // before the generic react match. Previously it sat last and never
          // fired — every icon was folded into react-vendor, which is on the
          // critical path of *every* page. The landing page was downloading
          // ~159 icons used only by the authenticated workspace.
          //
          // One chunk for all 186 icons is deliberate, and was re-measured
          // against letting Rollup place each icon with its routes: the
          // fine-grained split made the *landing* page 2.0 kB gzip lighter but
          // the BIM route 9.7 kB heavier (53 icon chunks totalling 17.6 kB gzip
          // versus 14.3 kB for all of them together — gzip cannot exploit the
          // near-identical icon bodies across separate files), added 75 requests
          // and grew the whole dist by 34 kB gzip. A single icons chunk is also
          // fetched once per session and then cached across every route.
          if (id.includes("lucide-react")) return "icons-vendor";

          // Split the router from React itself so a router bump does not
          // invalidate the (much larger, much more stable) react cache entry.
          if (id.includes("react-router") || id.includes("@remix-run")) return "router-vendor";
          if (id.includes("react") || id.includes("scheduler")) return "react-vendor";

          // Everything else is left to Rollup. Grouping the small
          // `src/components/ui` primitives into one chunk was measured and
          // rejected: it produced the same number of requests (Rollup only
          // splits modules that are genuinely shared by 2+ routes) while
          // forcing every route to download all 12 primitives instead of the
          // 2–3 it uses — ~7 KB heavier on the landing page alone.
          return undefined;
        },
      },
    },
  },
});
