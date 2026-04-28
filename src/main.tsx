import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n";
import { storeAndForwardService } from "./services/storeAndForwardService";

storeAndForwardService.initialize().catch((err) =>
  console.warn("[StoreForward] Init failed:", err)
);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

const StartupFallback = () => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const StartupError = ({ error }: { error: unknown }) => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
    <div className="max-w-xl rounded-lg border border-destructive/30 bg-card p-6 shadow-lg">
      <h1 className="text-xl font-semibold text-destructive">App failed to load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The startup module failed to load. Refresh the preview once; if it persists, the message below identifies the failing module.
      </p>
      <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
        {error instanceof Error ? error.message : String(error)}
      </pre>
    </div>
  </div>
);

root.render(<StartupFallback />);

import("./App.tsx")
  .then(({ default: App }) => {
    root.render(<App />);
  })
  .catch((error) => {
    console.error("[startup] App import failed", error);
    root.render(<StartupError error={error} />);
  });
