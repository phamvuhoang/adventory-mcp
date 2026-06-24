import { spawn } from "child_process";
import type { AdventoryClient } from "./client.js";
import type { ToolDefinition } from "./types.js";

// ── Public types ──────────────────────────────────────────────────────────────

export interface KvInventoryRow {
  productId: number;
  productName: string;
  branchId: number;
  branchName: string;
  onHand: number;
  reserved: number;
}

export interface AdvAlertRow {
  platform_product_id: number;
  product_name: string;
  branch_name: string;
  status: "overstock" | "shortage" | "normal";
  effective_stock: number;
  on_hand: number;
  in_transit: number;
  weeks_of_cover: number;
  weekly_velocity: number;
}

export type Severity = "critical" | "warning" | "normal";

export interface DualAlertRow {
  product_id: number;
  product_name: string;
  branch_id: number;
  branch_name: string;
  kv_alert: {
    on_hand: number;
    reserved: number;
    available: number;
    severity: Severity;
  };
  adv_alert: {
    effective_stock: number;
    in_transit: number;
    weeks_of_cover: number;
    weekly_velocity: number;
    status: string;
    severity: Severity;
  } | null;
  combined_severity: Severity;
  recommendations: string[];
}

// ── Severity helpers ──────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<Severity, number> = { critical: 2, warning: 1, normal: 0 };
const MIN_QUANTITY_DEFAULT = 50;

export function kiotvietSeverity(onHand: number, reserved: number, minQuantity = MIN_QUANTITY_DEFAULT): Severity {
  const available = onHand - reserved;
  if (available < minQuantity) return "critical";
  if (available < minQuantity * 1.5) return "warning";
  return "normal";
}

export function adventorySeverity(weeksOfCover: number, status: string): Severity {
  if (weeksOfCover < 2) return "critical";
  if (weeksOfCover < 2.5) return "warning";
  if (status === "shortage" && weeksOfCover < 3) return "warning";
  if (status === "overstock" && weeksOfCover > 8) return "warning";
  return "normal";
}

export function combinedSeverity(kvSev: Severity, advSev: Severity | undefined): Severity {
  const kvRank = SEVERITY_RANK[kvSev];
  const advRank = advSev !== undefined ? SEVERITY_RANK[advSev] : 0;
  const maxRank = Math.max(kvRank, advRank);
  return (Object.entries(SEVERITY_RANK).find(([, r]) => r === maxRank)?.[0] ?? "normal") as Severity;
}

export function buildRecommendations(
  kvSev: Severity,
  advSev: Severity | undefined,
  advStatus: string | undefined,
  weeksOfCover?: number
): string[] {
  const recs: string[] = [];

  if (kvSev === "critical" && advSev === "critical") {
    recs.push("urgent_reorder");
  } else if (kvSev === "critical" && advStatus === "overstock") {
    recs.push("check_sync_discrepancy");
  } else if (kvSev === "critical") {
    recs.push("immediate_transfer_or_reorder");
  }

  if (advStatus === "shortage" && weeksOfCover !== undefined && weeksOfCover < 3) {
    recs.push("pre_order_now");
  }

  if (advStatus === "overstock") {
    recs.push("reduce_ordering");
  }

  return [...new Set(recs)];
}

// ── Merge logic ───────────────────────────────────────────────────────────────

interface MergeFilters {
  product_name?: string;
  branch?: string;
}

export function mergeDualAlerts(
  kvRows: KvInventoryRow[],
  advRows: AdvAlertRow[],
  filters: MergeFilters = {}
): DualAlertRow[] {
  let rows = kvRows;

  if (filters.product_name) {
    const needle = filters.product_name.toLowerCase();
    rows = rows.filter((r) => r.productName.toLowerCase().includes(needle));
  }
  if (filters.branch) {
    const needle = filters.branch.toLowerCase();
    rows = rows.filter((r) => r.branchName.toLowerCase().includes(needle));
  }

  return rows.map((kv) => {
    const adv = advRows.find(
      (a) =>
        a.platform_product_id === kv.productId &&
        a.branch_name.toLowerCase() === kv.branchName.toLowerCase()
    ) ?? null;

    const kvSev = kiotvietSeverity(kv.onHand, kv.reserved);
    const advSev = adv ? adventorySeverity(adv.weeks_of_cover, adv.status) : undefined;
    const combined = combinedSeverity(kvSev, advSev);
    const recs = buildRecommendations(kvSev, advSev, adv?.status, adv?.weeks_of_cover);

    return {
      product_id: kv.productId,
      product_name: kv.productName,
      branch_id: kv.branchId,
      branch_name: kv.branchName,
      kv_alert: {
        on_hand: kv.onHand,
        reserved: kv.reserved,
        available: kv.onHand - kv.reserved,
        severity: kvSev,
      },
      adv_alert: adv
        ? {
            effective_stock: adv.effective_stock,
            in_transit: adv.in_transit,
            weeks_of_cover: adv.weeks_of_cover,
            weekly_velocity: adv.weekly_velocity,
            status: adv.status,
            severity: advSev!,
          }
        : null,
      combined_severity: combined,
      recommendations: recs,
    };
  });
}

// ── KiotViet subprocess fetcher ───────────────────────────────────────────────

const KIOTVIET_BINARY = process.env.KIOTVIET_MCP_BIN ??
  "/Users/hoangpham/source/prv/clipoox/Adventory/kiotviet-retail-analytics/mcp-server/dist/index.js";

export async function fetchKvInventory(productName: string): Promise<KvInventoryRow[]> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [KIOTVIET_BINARY], {
      env: {
        ...process.env,
        KIOTVIET_CLIENT_ID: process.env.KIOTVIET_CLIENT_ID ?? "",
        KIOTVIET_CLIENT_SECRET: process.env.KIOTVIET_CLIENT_SECRET ?? "",
        KIOTVIET_RETAILER: process.env.KIOTVIET_RETAILER ?? "",
      },
    });

    let buffer = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("KiotViet MCP subprocess timed out"));
    }, 15_000);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
    });

    child.stderr.on("data", () => { /* suppress startup banner */ });

    // Skips the MCP initialize/initialized handshake — the KiotViet server is
    // tolerant of out-of-sequence calls. If this breaks, add a full handshake here.
    // Send search request 500ms after start (server initialisation)
    const sendTimer = setTimeout(() => {
      const req = JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "kiotviet_search", arguments: { query: productName, resources: ["products"], limit: 50 } },
      });
      child.stdin.write(req + "\n");
    }, 500);

    // Collect for 5s then parse
    setTimeout(() => {
      clearTimeout(sendTimer);
      clearTimeout(timer);
      child.kill();
      try {
        const lines = buffer.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          const msg = JSON.parse(line);
          const text = msg?.result?.content?.[0]?.text;
          if (!text) continue;
          const data = JSON.parse(text);
          const products: unknown[] = data?.results?.[0]?.matches?.data ?? [];
          const rows: KvInventoryRow[] = [];
          for (const p of products as any[]) {
            for (const inv of p.inventories ?? []) {
              rows.push({
                productId: p.id,
                productName: p.fullName ?? p.name,
                branchId: inv.branchId,
                branchName: inv.branchName,
                onHand: inv.onHand ?? 0,
                reserved: inv.reserved ?? 0,
              });
            }
          }
          resolve(rows);
          return;
        }
        resolve([]);
      } catch {
        resolve([]);
      }
    }, 5_000);
  });
}

// ── MCP tool factory ──────────────────────────────────────────────────────────

export function createDualAlertsTool(client: AdventoryClient): ToolDefinition {
  return {
    name: "warehouse_dual_alerts",
    description:
      "Cảnh báo tồn kho kép: kết hợp dữ liệu thực tế từ KiotViet (on-hand, reserved) với dự báo chiến lược từ Adventory (effective stock, weeks_of_cover, velocity). Trả về combined_severity và recommendations cho từng sản phẩm × chi nhánh.",
    inputSchema: {
      type: "object",
      required: ["product_name"],
      properties: {
        product_name: { type: "string", description: "Tên sản phẩm cần tìm kiếm trong KiotViet (bắt buộc)." },
        branch: { type: "string", description: "Lọc theo tên chi nhánh (substring, tùy chọn)." },
        min_quantity: { type: "number", description: "Ngưỡng tối thiểu on-hand để đánh giá KiotViet severity. Mặc định 50." },
      },
      additionalProperties: false,
    },
    async handler(args: { product_name?: string; branch?: string; min_quantity?: number }) {
      const productName = args.product_name ?? "";
      if (!productName) {
        throw new Error("product_name là bắt buộc để tìm kiếm trong KiotViet.");
      }

      const [advRaw, kvRows] = await Promise.all([
        client.get<{ rows: AdvAlertRow[] }>("/api/warehouse/alerts"),
        fetchKvInventory(productName),
      ]);

      const advRows = advRaw.rows ?? [];

      const results = mergeDualAlerts(kvRows, advRows, {
        product_name: args.product_name,
        branch: args.branch,
      });

      const summary = {
        total: results.length,
        critical: results.filter((r) => r.combined_severity === "critical").length,
        warning: results.filter((r) => r.combined_severity === "warning").length,
        normal: results.filter((r) => r.combined_severity === "normal").length,
      };

      return { summary, alerts: results };
    },
  };
}
