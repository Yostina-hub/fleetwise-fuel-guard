import { lazy, type ComponentType, type LazyExoticComponent } from "react";

type ComponentModule<T extends ComponentType<any>> = {
  default: T;
};

const RETRY_STORAGE_KEY = "lazy-route-retry";
const MAX_RETRIES = 4;
const MODULE_FETCH_ERROR_PATTERN = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i;

const bustUrl = (url: string) => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
};

const importWithCacheBust = async <T extends ComponentType<any>>(
  importer: () => Promise<ComponentModule<T>>,
) => {
  try {
    return await importer();
  } catch (error) {
    if (!isRecoverableImportError(error)) {
      throw error;
    }

    const match = error.message.match(/https?:\/\/\S+|\/[\w@./-]+\.tsx?(?:\?\S*)?/);
    if (!match || typeof window === "undefined") {
      throw error;
    }

    return import(/* @vite-ignore */ bustUrl(match[0])) as Promise<ComponentModule<T>>;
  }
};

const getLocationKey = () => {
  if (typeof window === "undefined") {
    return "server";
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

const isRecoverableImportError = (error: unknown): error is Error => {
  return error instanceof Error && MODULE_FETCH_ERROR_PATTERN.test(error.message);
};

export const lazyWithRetry = <T extends ComponentType<any>>(
  importer: () => Promise<ComponentModule<T>>,
  key: string,
): LazyExoticComponent<T> => {
  return lazy(async () => {
    try {
      const importedModule = await importWithCacheBust(importer);

      if (typeof window !== "undefined") {
        const existingRetry = sessionStorage.getItem(RETRY_STORAGE_KEY);
        if (existingRetry?.startsWith(`${key}:`)) {
          sessionStorage.removeItem(RETRY_STORAGE_KEY);
        }
      }

      return importedModule;
    } catch (error) {
      if (typeof window !== "undefined" && isRecoverableImportError(error)) {
        const retryToken = `${key}:${getLocationKey()}`;
        const existingRetry = sessionStorage.getItem(RETRY_STORAGE_KEY);
        const retryCount = existingRetry?.startsWith(`${retryToken}:`)
          ? Number(existingRetry.split(":").pop() ?? "0")
          : 0;

        if (retryCount < MAX_RETRIES) {
          sessionStorage.setItem(RETRY_STORAGE_KEY, `${retryToken}:${retryCount + 1}`);
          window.location.reload();

          return new Promise<ComponentModule<T>>(() => {
            // Intentionally unresolved while the page reloads.
          });
        }

        sessionStorage.removeItem(RETRY_STORAGE_KEY);
      }

      throw error;
    }
  });
};