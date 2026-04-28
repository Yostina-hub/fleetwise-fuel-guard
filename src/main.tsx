import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n
import { storeAndForwardService } from "./services/storeAndForwardService";

// Initialize Store & Forward for offline telemetry buffering (RFP Item 46)
storeAndForwardService.initialize().catch((err) =>
  console.warn("[StoreForward] Init failed:", err)
);

createRoot(document.getElementById("root")!).render(<App />);
