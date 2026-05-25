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

  it("warehouse_daily_sales_by_channel defaults date and forwards options", async () => {
    const today = tool("warehouse_daily_sales_by_channel");
    await today.t.handler({});
    expect(today.calls[0][0]).toBe("/api/warehouse/daily-sales-by-channel");
    expect((today.calls[0][1] as { date: string }).date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const filtered = tool("warehouse_daily_sales_by_channel");
    await filtered.t.handler({
      date: "2026-05-24", branch: "907852",
      include_returns: false, include_zero_sales_branches: true,
    });
    expect(filtered.calls[0]).toEqual([
      "/api/warehouse/daily-sales-by-channel",
      {
        date: "2026-05-24", branch: "907852",
        include_returns: false, include_zero_sales_branches: true,
      },
    ]);
  });

  it("warehouse_sales_anomalies defaults date/lookback/metric/group_by", async () => {
    const { t, calls } = tool("warehouse_sales_anomalies");
    await t.handler({});
    expect(calls[0][0]).toBe("/api/warehouse/sales-anomalies");
    const q = calls[0][1] as Record<string, unknown>;
    expect(q.date as string).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(q.lookback_days).toBe(14);
    expect(q.metric).toBe("orders");
    expect(q.group_by).toBe("branch");
  });

  it("warehouse_sales_anomalies forwards optional params", async () => {
    const { t, calls } = tool("warehouse_sales_anomalies");
    await t.handler({
      date: "2026-05-24",
      lookback_days: 7,
      metric: "gross_revenue",
      group_by: "branch_channel",
      branch: "907852",
      min_baseline_orders: 5,
      change_threshold_pct: 40,
      include_zero_today: false,
    });
    expect(calls[0][1]).toEqual({
      date: "2026-05-24",
      lookback_days: 7,
      metric: "gross_revenue",
      group_by: "branch_channel",
      branch: "907852",
      min_baseline_orders: 5,
      change_threshold_pct: 40,
      include_zero_today: false,
    });
  });

  it("warehouse_sales_anomalies rejects out-of-range lookback_days", async () => {
    const { t } = tool("warehouse_sales_anomalies");
    await expect(t.handler({ lookback_days: 2 })).rejects.toThrow(/lookback/i);
    await expect(t.handler({ lookback_days: 91 })).rejects.toThrow(/lookback/i);
  });

  it("warehouse_sales_anomalies rejects invalid metric and group_by", async () => {
    const { t } = tool("warehouse_sales_anomalies");
    await expect(t.handler({ metric: "profit" })).rejects.toThrow(/metric/i);
    await expect(t.handler({ group_by: "region" })).rejects.toThrow(/group_by/i);
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
