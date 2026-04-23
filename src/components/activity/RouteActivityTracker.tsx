import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { recordPageView } from "@/lib/sessionTracker";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Records a page view in `user_activity_events` whenever the route changes.
 * Mounted once inside the persistent app shell so it doesn't double-fire.
 */
export default function RouteActivityTracker() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    recordPageView(location.pathname + location.search);
  }, [location.pathname, location.search, user]);

  return null;
}
