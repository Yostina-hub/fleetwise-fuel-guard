/**
 * LayoutShell
 * -----------
 * Persistent app shell that mounts <Layout> (sidebar + header + chrome) once
 * and renders the active route inside it via <Outlet />.
 *
 * Why: previously every page imported and rendered its own <Layout>, which
 * meant the sidebar + all of its hooks (auth, permissions, notifications,
 * driver bell, etc.) were *unmounted and remounted* on every navigation.
 * Combined with the global <Suspense fallback={<PageLoader />}>, navigating
 * showed a full-screen loader for a few seconds.
 *
 * With the shell in place, only the inner <Outlet /> tree changes between
 * routes. The inner Suspense boundary scoped to the content area shows a
 * lightweight in-content spinner while the next route's chunk loads.
 *
 * Pages keep their per-page `<Layout>` wrappers — those become a no-op when
 * they detect they are already inside this shell (see LayoutNestedContext).
 */
import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Layout from "@/components/Layout";
import { LayoutNestedContext } from "@/contexts/LayoutNestedContext";
import { Loader2 } from "lucide-react";
import RouteActivityTracker from "@/components/activity/RouteActivityTracker";

const InnerFallback = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const LayoutShell = () => (
  <Layout>
    <RouteActivityTracker />
    <LayoutNestedContext.Provider value={true}>
      <Suspense fallback={<InnerFallback />}>
        <Outlet />
      </Suspense>
    </LayoutNestedContext.Provider>
  </Layout>
);

export default LayoutShell;
