import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n
import { storeAndForwardService } from "./services/storeAndForwardService";

const isLovablePreview = window.location.hostname.includes("lovableproject.com")
  || window.location.hostname.includes("lovable.app");
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

// Kill stale PWA workers/caches before the app boots in preview contexts (v3).
if ((import.meta.env.DEV || isLovablePreview || isInIframe) && "serviceWorker" in navigator) {
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
