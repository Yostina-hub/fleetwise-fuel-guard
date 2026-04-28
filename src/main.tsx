import { createRoot } from "react-dom/client";
import "./index.css";

const STARTUP_RETRY_KEY = "fleettrack-startup-retry";
const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

const StartupFallback = () => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Loading FleetTrack FMS…</p>
    </div>
  </div>
);

const StartupError = ({ error }: { error: unknown }) => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
    <div className="max-w-lg rounded-lg border border-destructive/30 bg-card p-6 shadow-lg">
      <h1 className="text-xl font-semibold">App failed to load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A startup module could not be loaded. Please refresh the preview.
      </p>
      <pre className="mt-4 max-h-40 overflow-auto rounded bg-muted p-3 text-xs text-muted-foreground">
        {error instanceof Error ? error.message : String(error)}
      </pre>
    </div>
  </div>
);

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", () => {
    window.location.reload();
  });
}

declare global {
  interface Window {
    __fleettrackBooted?: boolean;
  }
}

const boot = async () => {
  root.render(<StartupFallback />);

  try {
    await import("./i18n");
    const [{ default: App }, { storeAndForwardService }] = await Promise.all([
      import("./App.tsx"),
      import("./services/storeAndForwardService"),
    ]);

    sessionStorage.removeItem(STARTUP_RETRY_KEY);
    storeAndForwardService.initialize().catch((err) =>
      console.warn("[StoreForward] Init failed:", err),
    );
    window.__fleettrackBooted = true;
    root.render(<App />);
  } catch (error) {
    const retries = Number(sessionStorage.getItem(STARTUP_RETRY_KEY) ?? "0");
    if (retries < 3) {
      sessionStorage.setItem(STARTUP_RETRY_KEY, String(retries + 1));
      window.location.reload();
      return;
    }

    sessionStorage.removeItem(STARTUP_RETRY_KEY);
    root.render(<StartupError error={error} />);
  }
};

boot();
