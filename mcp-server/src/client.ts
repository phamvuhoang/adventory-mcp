import type { Config } from "./config.js";
import { mapHttpError } from "./errors.js";
import type { Query } from "./types.js";

export interface AdventoryClient {
  get<T = unknown>(path: string, query?: Query): Promise<T>;
}

interface Options {
  fetchImpl?: typeof fetch;
}

export function createAdventoryClient(config: Config, options: Options = {}): AdventoryClient {
  const fetchImpl = options.fetchImpl ?? fetch;

  function buildUrl(path: string, query?: Query): string {
    const url = new URL(`${config.apiBaseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined) continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  return {
    async get<T>(path: string, query?: Query): Promise<T> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      let response: Response;
      try {
        response = await fetchImpl(buildUrl(path, query), {
          method: "GET",
          headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json" },
          signal: controller.signal
        });
      } catch (error) {
        throw mapHttpError(503, { detail: error instanceof Error ? error.message : String(error) });
      } finally {
        clearTimeout(timer);
      }
      const body = await response.json().catch(() => null);
      if (!response.ok) throw mapHttpError(response.status, body);
      return body as T;
    }
  };
}
