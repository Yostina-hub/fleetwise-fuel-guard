import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n

const MODULE_FETCH_ERROR_PATTERN = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i;
const PRELOAD_RETRY_STORAGE_KEY = "vite-preload-retry";

const getLocationKey = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

const reloadOnceForPath = () => {
  const currentPath = getLocationKey();
  const previousPath = sessionStorage.getItem(PRELOAD_RETRY_STORAGE_KEY);

  if (previousPath === currentPath) {
    sessionStorage.removeItem(PRELOAD_RETRY_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(PRELOAD_RETRY_STORAGE_KEY, currentPath);
  window.location.reload();
};

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  reloadOnceForPath();
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;

  if (reason instanceof Error && MODULE_FETCH_ERROR_PATTERN.test(reason.message)) {
    event.preventDefault();
    reloadOnceForPath();
  }
});

window.addEventListener(
  "load",
  () => {
    if (sessionStorage.getItem(PRELOAD_RETRY_STORAGE_KEY) === getLocationKey()) {
      sessionStorage.removeItem(PRELOAD_RETRY_STORAGE_KEY);
    }
  },
  { once: true },
);

createRoot(document.getElementById("root")!).render(<App />);
