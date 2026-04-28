import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n
import { storeAndForwardService } from "./services/storeAndForwardService";

// In dev, kill any previously-registered service worker that may be serving
// stale cached JS chunks (causes blank screen + 404s on hashed deps).
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  }).catch(() => {});
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  }
}

// Initialize Store & Forward for offline telemetry buffering (RFP Item 46)
storeAndForwardService.initialize().catch((err) =>
  console.warn("[StoreForward] Init failed:", err)
);

createRoot(document.getElementById("root")!).render(<App />);
