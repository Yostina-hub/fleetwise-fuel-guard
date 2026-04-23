/**
 * PoolSupervisors → redirect shim
 * --------------------------------
 * The pool-supervisor workspace (Consolidation + Pool Review panels) has been
 * folded into the main Vehicle Requests page under an "Assignments" view-mode
 * (toggled from the page header or the per-row Assign action). This page now
 * just redirects any legacy bookmarks or sidebar links to the new home so we
 * keep a single source of truth for vehicle-request workflow.
 */
import { Navigate } from "react-router-dom";

export default function PoolSupervisors() {
  return <Navigate to="/vehicle-requests?view=assignments" replace />;
}
