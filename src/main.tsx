import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App";
import { storeAndForwardService } from "./services/storeAndForwardService";
import "./index.css";

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

declare global {
  interface Window {
    __fleettrackBooted?: boolean;
  }
}

const boot = async () => {
  root.render(<StartupFallback />);

  storeAndForwardService.initialize().catch((err) =>
    console.warn("[StoreForward] Init failed:", err),
  );
  window.__fleettrackBooted = true;
  root.render(<App />);
};

boot();
