import { describe, expect, it } from "vitest";
import { createTools } from "../src/tools.js";
import type { AdventoryClient } from "../src/client.js";

function fakeClient(): { client: AdventoryClient; calls: Array<[string, unknown]> } {
  const calls: Array<[string, unknown]> = [];
  const client: AdventoryClient = {
    async get(path, query) {
      calls.push([path, query]);
      return { path, query };
    }
  };
  return { client, calls };
}

function tool(name: string) {
  const { client, calls } = fakeClient();
  const t = createTools(client).find((x) => x.name === name);
  if (!t) throw new Error(`missing tool ${name}`);
  return { t, calls };
}

describe("tools", () => {
  it("registers the full read-only surface and no mutators", () => {
    const { client } = fakeClient();
    const names = createTools(client).map((t) => t.name).sort();
    expect(names).toContain("ads_overview");
    expect(names).toContain("warehouse_alerts");
    expect(names).toContain("adventory_capabilities");
    expect(names.some((n) => /dispatch|approve|truck|create|update|delete/.test(n))).toBe(false);
  });

  it("ads_overview defaults the date range when omitted", async () => {
    const { t, calls } = tool("ads_overview");
    await t.handler({});
    expect(calls[0][0]).toBe("/api/ads/overview");
    const q = calls[0][1] as { from: string; to: string };
    expect(q.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(q.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("ads_campaigns requires platform", async () => {
    const { t } = tool("ads_campaigns");
    await expect(t.handler({})).rejects.toThrow(/platform/i);
  });

  it("reorder_suggestions requires branch", async () => {
    const { t } = tool("reorder_suggestions");
    await expect(t.handler({})).rejects.toThrow(/branch/i);
  });

  it("warehouse_daily_sales sends a date param", async () => {
    const { t, calls } = tool("warehouse_daily_sales");
    await t.handler({ date: "2026-05-20" });
    expect(calls[0]).toEqual(["/api/warehouse/daily-sales", { date: "2026-05-20" }]);
  });

  it("inventory tools hit the correct /api/warehouse paths", async () => {
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ["reorder_suggestions", { branch: "b1" }, "/api/warehouse/reorder"],
      ["production_plan", { branch: "b1" }, "/api/warehouse/production/plan"],
      ["production_materials", { plan: "p1" }, "/api/warehouse/production/materials"],
    ];
    for (const [name, args, path] of cases) {
      const { t, calls } = tool(name);
      await t.handler(args);
      expect(calls[0][0]).toBe(path);
    }
  });
});
