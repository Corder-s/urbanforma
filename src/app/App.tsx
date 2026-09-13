import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "../features/auth/AuthProvider";
import { SettingsProvider } from "../features/settings/hooks/useSettings";
import { useLinkPrefetch } from "./useLinkPrefetch";
import { router } from "./router";

export default function App() {
  // App-wide intent prefetching: warms route chunks on link hover/focus so the
  // lazy-loaded pages (and three.js behind Visualization) are ready on arrival.
  useLinkPrefetch();

  return (
    <AuthProvider>
      {/* Settings sit inside auth (the profile section reads the session) and
          outside the router, so a preference applies to every route at once. */}
      <SettingsProvider>
        <RouterProvider router={router} />
      </SettingsProvider>
    </AuthProvider>
  );
}
