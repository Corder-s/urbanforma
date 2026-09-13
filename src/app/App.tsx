import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "../features/auth/AuthProvider";
import { useLinkPrefetch } from "./useLinkPrefetch";
import { router } from "./router";

export default function App() {
  // App-wide intent prefetching: warms route chunks on link hover/focus so the
  // lazy-loaded pages (and three.js behind Visualization) are ready on arrival.
  useLinkPrefetch();

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
