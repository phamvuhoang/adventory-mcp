import { describe, expect, it, vi } from "vitest";
import { createAdventoryClient } from "../src/client.js";

const config = { apiKey: "adv_live_test", apiBaseUrl: "https://api.example.com", timeoutMs: 5000 };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("AdventoryClient", () => {
  it("attaches the bearer key and builds the query string", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const client = createAdventoryClient(config, { fetchImpl });
    const result = await client.get("/api/ads/overview", { from: "2026-05-01", to: "2026-05-07" });
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.example.com/api/ads/overview?from=2026-05-01&to=2026-05-07");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer adv_live_test");
  });

  it("maps a 401 to a friendly AdventoryError", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ detail: "nope" }, 401));
    const client = createAdventoryClient(config, { fetchImpl });
    await expect(client.get("/api/me")).rejects.toMatchObject({ data: { code: "unauthorized" } });
  });

  it("omits undefined query params", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));
    const client = createAdventoryClient(config, { fetchImpl });
    await client.get("/api/ads/campaigns", { platform: "tiktok_ads", from: undefined });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.example.com/api/ads/campaigns?platform=tiktok_ads");
  });
});
