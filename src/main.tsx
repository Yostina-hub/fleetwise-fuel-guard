import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { storeAndForwardService } from "./services/storeAndForwardService";

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", () => {
    window.location.reload();
  });
}

storeAndForwardService.initialize().catch((err) =>
  console.warn("[StoreForward] Init failed:", err)
);

createRoot(document.getElementById("root")!).render(<App />);
