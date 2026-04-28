import { createRoot } from "react-dom/client";
import "./index.css";

const isLovablePreview = window.location.hostname.includes("lovableproject.com")
  || window.location.hostname.includes("lovable.app");
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const preparePreviewRuntime = async () => {
  // Kill stale PWA workers/caches before importing the app in preview contexts.
  // Static imports run before top-level code, so App/i18n are loaded dynamically
  // after cleanup to prevent old service workers from serving missing modules.
  if (!(import.meta.env.DEV || isLovablePreview || isInIframe)) return;

  await Promise.allSettled([
    "serviceWorker" in navigator
      ? navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((r) => r.unregister())))
      : Promise.resolve(),
    window.caches
      ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      : Promise.resolve(),
  ]);
};

const BOOT_RELOAD_KEY = "fleettrack:boot-reload-attempt";

const isModuleFetchError = (error: unknown) =>
  error instanceof Error && /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(error.message);

const importAppWithRetry = async () => {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await import(/* @vite-ignore */ `/src/App.tsx?t=${Date.now()}-${attempt}`) as typeof import("./App");
    } catch (error) {
      lastError = error;
      if (!isModuleFetchError(error)) break;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
      await preparePreviewRuntime();
    }
  }

  if (typeof window !== "undefined" && isModuleFetchError(lastError)) {
    const currentPath = window.location.pathname + window.location.search;
    const previousRetry = sessionStorage.getItem(BOOT_RELOAD_KEY);

    if (previousRetry !== currentPath) {
      sessionStorage.setItem(BOOT_RELOAD_KEY, currentPath);
      window.location.reload();
      return new Promise<never>(() => {});
    }
  }

  throw lastError;
};

const boot = async () => {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Root element not found");

  await preparePreviewRuntime();

  const [{ default: App }, { storeAndForwardService }] = await Promise.all([
    importAppWithRetry(),
    import("./services/storeAndForwardService"),
    import("./i18n"),
  ]);

  sessionStorage.removeItem(BOOT_RELOAD_KEY);

  storeAndForwardService.initialize().catch((err) =>
    console.warn("[StoreForward] Init failed:", err)
  );

  createRoot(rootEl).render(<App />);
};

boot().catch((error) => {
  console.error("[Boot] Failed to start app:", error);
  document.getElementById("root")!.innerHTML =
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:hsl(var(--background));color:hsl(var(--foreground));font-family:system-ui,sans-serif">App failed to load. Please refresh the preview.</div>';
});
