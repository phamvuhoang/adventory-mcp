import { describe, it, expect } from "vitest";
import {
  kiotvietSeverity,
  adventorySeverity,
  combinedSeverity,
  buildRecommendations,
  mergeDualAlerts,
  type KvInventoryRow,
  type AdvAlertRow,
} from "../src/dual-alerts.js";

// ── kiotvietSeverity ──────────────────────────────────────────────────────────

describe("kiotvietSeverity", () => {
  it("critical when available < min_quantity", () => {
    expect(kiotvietSeverity(47, 0, 50)).toBe("critical");  // 47 < 50
  });
  it("critical when available is zero", () => {
    expect(kiotvietSeverity(0, 0, 50)).toBe("critical");
  });
  it("warning when available < 1.5x min_quantity", () => {
    expect(kiotvietSeverity(60, 0, 50)).toBe("warning");  // 60 < 75
  });
  it("normal when available >= 1.5x min_quantity", () => {
    expect(kiotvietSeverity(733, 31, 50)).toBe("normal"); // 702 >= 75
  });
  it("uses on_hand minus reserved for available", () => {
    expect(kiotvietSeverity(100, 80, 50)).toBe("critical"); // 20 < 50
  });
});

// ── adventorySeverity ─────────────────────────────────────────────────────────

describe("adventorySeverity", () => {
  it("critical when weeks_of_cover < 2", () => {
    expect(adventorySeverity(1.5, "shortage")).toBe("critical");
  });
  it("warning when weeks_of_cover < 2.5", () => {
    expect(adventorySeverity(2.37, "overstock")).toBe("warning");
  });
  it("warning when overstock and weeks_of_cover > 8", () => {
    expect(adventorySeverity(12.77, "overstock")).toBe("warning");
  });
  it("normal when weeks_of_cover >= 2.5 and not extreme overstock", () => {
    expect(adventorySeverity(5.16, "overstock")).toBe("normal");
  });
  it("normal for healthy shortage-status below 8 weeks but >= 2.5", () => {
    expect(adventorySeverity(3.0, "shortage")).toBe("normal");
  });
});

// ── combinedSeverity ──────────────────────────────────────────────────────────

describe("combinedSeverity", () => {
  it("critical beats warning", () => {
    expect(combinedSeverity("critical", "warning")).toBe("critical");
  });
  it("critical beats normal", () => {
    expect(combinedSeverity("normal", "critical")).toBe("critical");
  });
  it("warning beats normal", () => {
    expect(combinedSeverity("warning", "normal")).toBe("warning");
  });
  it("both normal → normal", () => {
    expect(combinedSeverity("normal", "normal")).toBe("normal");
  });
  it("handles undefined adventory (no match)", () => {
    expect(combinedSeverity("warning", undefined)).toBe("warning");
  });
});

// ── buildRecommendations ──────────────────────────────────────────────────────

describe("buildRecommendations", () => {
  it("both critical → urgent_reorder", () => {
    const recs = buildRecommendations("critical", "critical", "shortage");
    expect(recs).toContain("urgent_reorder");
  });
  it("kv critical + adv overstock → check_sync_discrepancy", () => {
    const recs = buildRecommendations("critical", "warning", "overstock");
    expect(recs).toContain("check_sync_discrepancy");
  });
  it("kv critical + no adventory match → immediate_transfer_or_reorder", () => {
    const recs = buildRecommendations("critical", undefined, undefined);
    expect(recs).toContain("immediate_transfer_or_reorder");
  });
  it("adventory shortage weeks < 3 → pre_order_now", () => {
    const recs = buildRecommendations("normal", "warning", "shortage", 2.85);
    expect(recs).toContain("pre_order_now");
  });
  it("adventory overstock → reduce_ordering", () => {
    const recs = buildRecommendations("normal", "warning", "overstock", 12.77);
    expect(recs).toContain("reduce_ordering");
  });
  it("returns deduplicated array", () => {
    const recs = buildRecommendations("critical", "critical", "shortage", 1.5);
    expect(recs.length).toBe(new Set(recs).size);
  });
});

// ── mergeDualAlerts ───────────────────────────────────────────────────────────

describe("mergeDualAlerts", () => {
  const kvRows: KvInventoryRow[] = [
    { productId: 42893453, productName: "Mắm tôm LCX chai 260gr (Chai)", branchId: 856078, branchName: "KHO HN", onHand: 47, reserved: 0 },
    { productId: 42893453, productName: "Mắm tôm LCX chai 260gr (Chai)", branchId: 856104, branchName: "KHO NHC", onHand: 733, reserved: 31 },
  ];

  const advRows: AdvAlertRow[] = [
    { platform_product_id: 42893453, product_name: "Mắm tôm LCX chai 260gr (Chai)", branch_name: "KHO HN", status: "shortage", effective_stock: 114, on_hand: 0, in_transit: 114, weeks_of_cover: 2.85, weekly_velocity: 40 },
    { platform_product_id: 42893453, product_name: "Mắm tôm LCX chai 260gr (Chai)", branch_name: "KHO NHC", status: "overstock", effective_stock: 489, on_hand: 0, in_transit: 489, weeks_of_cover: 2.37, weekly_velocity: 206 },
  ];

  it("merges by branch name and computes combined severity", () => {
    const results = mergeDualAlerts(kvRows, advRows);
    expect(results).toHaveLength(2);

    const khoHn = results.find((r) => r.branch_name === "KHO HN");
    expect(khoHn).toBeDefined();
    expect(khoHn!.kv_alert.severity).toBe("critical");     // 47 < 50
    expect(khoHn!.adv_alert!.severity).toBe("warning");    // 2.85 < 2.5? No → but shortage < 3 → warning
    expect(khoHn!.combined_severity).toBe("critical");
    expect(khoHn!.recommendations).toContain("immediate_transfer_or_reorder");
  });

  it("KHO NHC: kv normal + adv warning → combined warning", () => {
    const results = mergeDualAlerts(kvRows, advRows);
    const khoNhc = results.find((r) => r.branch_name === "KHO NHC");
    expect(khoNhc!.kv_alert.severity).toBe("normal");      // 702 >= 75
    expect(khoNhc!.adv_alert!.severity).toBe("warning");   // 2.37 < 2.5
    expect(khoNhc!.combined_severity).toBe("warning");
  });

  it("handles kv rows with no matching adventory row", () => {
    const results = mergeDualAlerts(kvRows, []);
    expect(results).toHaveLength(2);
    expect(results[0].adv_alert).toBeNull();
    expect(results[0].combined_severity).toBeDefined();
  });

  it("applies product_name filter when provided", () => {
    const results = mergeDualAlerts(kvRows, advRows, { product_name: "Mắm tôm" });
    expect(results.every((r) => r.product_name.includes("Mắm tôm"))).toBe(true);
  });

  it("applies branch filter when provided", () => {
    const results = mergeDualAlerts(kvRows, advRows, { branch: "KHO HN" });
    expect(results).toHaveLength(1);
    expect(results[0].branch_name).toBe("KHO HN");
  });
});
