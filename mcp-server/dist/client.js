import { mapHttpError } from "./errors.js";
export function createAdventoryClient(config, options = {}) {
    const fetchImpl = options.fetchImpl ?? fetch;
    function buildUrl(path, query) {
        const url = new URL(`${config.apiBaseUrl}${path}`);
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value === undefined)
                    continue;
                url.searchParams.set(key, String(value));
            }
        }
        return url.toString();
    }
    return {
        async get(path, query) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), config.timeoutMs);
            let response;
            try {
                response = await fetchImpl(buildUrl(path, query), {
                    method: "GET",
                    headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json" },
                    signal: controller.signal
                });
            }
            catch (error) {
                throw mapHttpError(503, { detail: error instanceof Error ? error.message : String(error) });
            }
            finally {
                clearTimeout(timer);
            }
            const body = await response.json().catch(() => null);
            if (!response.ok)
                throw mapHttpError(response.status, body);
            return body;
        }
    };
}
//# sourceMappingURL=client.js.map