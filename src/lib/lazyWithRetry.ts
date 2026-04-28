import { lazy, type ComponentType, type LazyExoticComponent } from "react";

type ComponentModule<T extends ComponentType<any>> = {
  default: T;
};

const MAX_RETRIES = 4;
const MODULE_FETCH_ERROR_PATTERN = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i;

const retryDelayMs = (attempt: number) => Math.min(250 * 2 ** attempt, 3000);

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const failedModuleUrl = (error: Error) => {
  const match = error.message.match(/https?:\/\/\S+|\/[\w@./-]+\.(?:t|j)sx?(?:\?\S*)?/);
  return match?.[0];
};

const withRetryParam = (url: string, attempt: number) => {
  const parsed = new URL(url, window.location.origin);
  parsed.searchParams.set("retry", `${Date.now()}-${attempt}`);
  return parsed.pathname + parsed.search + parsed.hash;
};

const isRecoverableImportError = (error: unknown): error is Error => {
  return error instanceof Error && MODULE_FETCH_ERROR_PATTERN.test(error.message);
};

export const lazyWithRetry = <T extends ComponentType<any>>(
  importer: () => Promise<ComponentModule<T>>,
  key: string,
): LazyExoticComponent<T> => {
  return lazy(async () => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        return await importer();
      } catch (error) {
        if (!isRecoverableImportError(error) || attempt === MAX_RETRIES) {
          throw error;
        }

        console.warn(`[lazyWithRetry] Retrying ${key} route chunk (${attempt + 1}/${MAX_RETRIES})`, error);
        await wait(retryDelayMs(attempt));

        const retryUrl = failedModuleUrl(error);
        if (retryUrl) {
          try {
            return await import(/* @vite-ignore */ withRetryParam(retryUrl, attempt));
          } catch (retryError) {
            console.warn(`[lazyWithRetry] Cache-busted retry failed for ${key}`, retryError);
          }
        }
      }
    }

    return importer();
  });
};