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
    expect(names).toContain("warehouse_top_skus");
    expect(names).toContain("warehouse_transfers");
    expect(names).toContain("warehouse_sku_trends");
    expect(names).toContain("adventory_capabilities");
    expect(names).toContain("warehouse_dual_alerts");
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

  it("warehouse_top_skus defaults date to yesterday and core params", async () => {
    const { t, calls } = tool("warehouse_top_skus");
    await t.handler({});
    expect(calls[0][0]).toBe("/api/warehouse/top-skus");
    const q = calls[0][1] as Record<string, unknown>;
    expect(q.date as string).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(q.limit).toBe(10);
    expect(q.order_basis).toBe("all_non_cancelled");
    expect(q.line_filter).toBe("paid_only");
    expect(q.sort_by).toBe("units");
  });

  it("warehouse_top_skus rejects date together with from/to", async () => {
    const { t } = tool("warehouse_top_skus");
    await expect(t.handler({
      date: "2026-05-24", from: "2026-05-01", to: "2026-05-02",
    })).rejects.toThrow(/date/i);
  });

  it("warehouse_top_skus forwards a range and filters", async () => {
    const { t, calls } = tool("warehouse_top_skus");
    await t.handler({
      from: "2026-05-01", to: "2026-05-07", limit: 5,
      branch: "907851", sale_channel: "942558",
      order_basis: "completed", line_filter: "all_positive_quantity",
      sort_by: "line_revenue",
    });
    expect(calls[0][1]).toEqual({
      from: "2026-05-01", to: "2026-05-07", limit: 5,
      branch: "907851", sale_channel: "942558",
      order_basis: "completed", line_filter: "all_positive_quantity",
      sort_by: "line_revenue",
    });
  });

  it("warehouse_top_skus rejects invalid enums and limit", async () => {
    const { t } = tool("warehouse_top_skus");
    await expect(t.handler({ order_basis: "weird" })).rejects.toThrow(/order_basis/i);
    await expect(t.handler({ line_filter: "weird" })).rejects.toThrow(/line_filter/i);
    await expect(t.handler({ sort_by: "weird" })).rejects.toThrow(/sort_by/i);
    await expect(t.handler({ limit: 0 })).rejects.toThrow(/limit/i);
  });

  it("warehouse_transfers defaults status and forwards filters", async () => {
    const { t, calls } = tool("warehouse_transfers");
    await t.handler({});
    expect(calls[0][0]).toBe("/api/warehouse/transfers");
    expect((calls[0][1] as Record<string, unknown>).status).toBe("in_transit_or_stale");

    const filtered = tool("warehouse_transfers");
    await filtered.t.handler({
      status: "all", from_branch: "src", to_branch: "hn",
      sla_override_days: 2, include_lines: true, as_of: "2026-05-24",
    });
    expect(filtered.calls[0][1]).toEqual({
      status: "all", from_branch: "src", to_branch: "hn",
      sla_override_days: 2, include_lines: true, as_of: "2026-05-24",
    });
  });

  it("warehouse_transfers rejects invalid status", async () => {
    const { t } = tool("warehouse_transfers");
    await expect(t.handler({ status: "weird" })).rejects.toThrow(/status/i);
  });

  it("warehouse_sku_trends defaults and forwards params", async () => {
    const { t, calls } = tool("warehouse_sku_trends");
    await t.handler({});
    expect(calls[0][0]).toBe("/api/warehouse/sku-trends");
    const q = calls[0][1] as Record<string, unknown>;
    expect(q.date as string).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(q.window_days).toBe(14);
    expect(q.metric).toBe("units");
    expect(q.direction).toBe("both");
  });

  it("warehouse_sku_trends rejects out-of-range window_days and bad enums", async () => {
    const { t } = tool("warehouse_sku_trends");
    await expect(t.handler({ window_days: 2 })).rejects.toThrow(/window_days/i);
    await expect(t.handler({ window_days: 91 })).rejects.toThrow(/window_days/i);
    await expect(t.handler({ metric: "profit" })).rejects.toThrow(/metric/i);
    await expect(t.handler({ direction: "sideways" })).rejects.toThrow(/direction/i);
    await expect(t.handler({ limit: 0 })).rejects.toThrow(/limit/i);
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
