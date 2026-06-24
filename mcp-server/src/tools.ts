import type { AdventoryClient } from "./client.js";
import { defaultRange, today, yesterday } from "./dates.js";
import { AdventoryError } from "./errors.js";
import type { Query, ToolDefinition } from "./types.js";
import { createDualAlertsTool } from "./dual-alerts.js";

const AD_PLATFORMS = ["tiktok_ads", "facebook", "shopee"] as const;

interface RangeArgs { from?: string; to?: string; }

function range(args: RangeArgs): { from: string; to: string } {
  if (args.from && args.to) return { from: args.from, to: args.to };
  return defaultRange();
}

function requireStr(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new AdventoryError(`Tham số "${key}" là bắt buộc.`, { code: "invalid_param", param: key });
  }
  return value;
}

const rangeProps = {
  from: { type: "string", description: "Ngày bắt đầu YYYY-MM-DD. Mặc định 7 ngày gần nhất." },
  to: { type: "string", description: "Ngày kết thúc YYYY-MM-DD." }
};

export function createTools(client: AdventoryClient): ToolDefinition[] {
  return [
    {
      name: "adventory_capabilities",
      description: "Liệt kê gian hàng, các nền tảng đã kết nối và quyền đọc dữ liệu hiện có. Gọi đầu tiên để định hướng.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      async handler() {
        const me = await client.get("/api/me");
        const connections = await client.get("/api/connections").catch(() => null);
        return { me, connections };
      }
    },
    {
      name: "ads_overview",
      description: "Tổng quan quảng cáo: tổng chi tiêu, doanh thu, ROAS và số kênh đang chạy theo khoảng ngày.",
      inputSchema: { type: "object", properties: { ...rangeProps }, additionalProperties: false },
      async handler(args: RangeArgs) {
        const r = range(args);
        return client.get("/api/ads/overview", { from: r.from, to: r.to });
      }
    },
    {
      name: "ads_campaigns",
      description: "Danh sách chiến dịch quảng cáo của một nền tảng (tiktok_ads | facebook | shopee).",
      inputSchema: {
        type: "object",
        properties: { platform: { type: "string", enum: AD_PLATFORMS, description: "Nền tảng quảng cáo." }, ...rangeProps },
        required: ["platform"], additionalProperties: false
      },
      async handler(args: RangeArgs & { platform?: string }) {
        const platform = requireStr(args as Record<string, unknown>, "platform");
        const r = range(args);
        return client.get("/api/ads/campaigns", { platform, from: r.from, to: r.to });
      }
    },
    {
      name: "ads_creatives",
      description: "Danh sách creative/quảng cáo của một nền tảng (tiktok_ads | facebook | shopee).",
      inputSchema: {
        type: "object",
        properties: { platform: { type: "string", enum: AD_PLATFORMS }, ...rangeProps },
        required: ["platform"], additionalProperties: false
      },
      async handler(args: RangeArgs & { platform?: string }) {
        const platform = requireStr(args as Record<string, unknown>, "platform");
        const r = range(args);
        return client.get("/api/ads/creatives", { platform, from: r.from, to: r.to });
      }
    },
    {
      name: "ads_insights",
      description: "Phát hiện theo luật: chiến dịch lỗ, không chuyển đổi, đang scale tốt, creative bị bão hòa.",
      inputSchema: { type: "object", properties: { ...rangeProps }, additionalProperties: false },
      async handler(args: RangeArgs) {
        const r = range(args);
        return client.get("/api/ads/insights", { from: r.from, to: r.to });
      }
    },
    {
      name: "warehouse_branches",
      description: "Danh sách chi nhánh/kho và cấu hình. Gọi trước khi dùng reorder_suggestions hoặc production_plan để lấy mã chi nhánh.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      async handler() {
        return client.get("/api/warehouse/branches");
      }
    },
    {
      name: "warehouse_alerts",
      description: "Cảnh báo tồn kho (hết hàng, tồn thấp, tồn cao...). Lọc theo chi nhánh hoặc trạng thái nếu cần.",
      inputSchema: {
        type: "object",
        properties: {
          branch: { type: "string", description: "Mã chi nhánh (tùy chọn)." },
          status: { type: "string", description: "Lọc theo trạng thái cảnh báo (tùy chọn)." }
        },
        additionalProperties: false
      },
      async handler(args: { branch?: string; status?: string }) {
        const query: Query = {};
        if (args.branch) query.branch = args.branch;
        if (args.status) query.status = args.status;
        return client.get("/api/warehouse/alerts", query);
      }
    },
    {
      name: "warehouse_daily_sales",
      description: "Doanh số theo kênh trong một ngày. Mặc định hôm nay.",
      inputSchema: {
        type: "object",
        properties: { date: { type: "string", description: "Ngày YYYY-MM-DD. Mặc định hôm nay." } },
        additionalProperties: false
      },
      async handler(args: { date?: string }) {
        return client.get("/api/warehouse/daily-sales", { date: args.date ?? today() });
      }
    },
    {
      name: "warehouse_daily_sales_by_channel",
      description:
        "Báo cáo doanh số trong ngày theo từng kho × kênh bán: số đơn, số sản phẩm, doanh thu gross/net, returns, insight, freshness, kèm tổng theo kho và toàn công ty. Mặc định hôm nay (giờ Việt Nam).",
      inputSchema: {
        type: "object",
        properties: {
          date: { type: "string", description: "Ngày YYYY-MM-DD. Mặc định hôm nay." },
          branch: { type: "string", description: "Lọc một kho theo mã chi nhánh (tùy chọn)." },
          include_returns: {
            type: "boolean",
            description: "Kèm thông tin trả hàng nếu có. Mặc định true."
          },
          include_zero_sales_branches: {
            type: "boolean",
            description: "Hiển thị cả kho không bán hàng trong ngày. Mặc định false."
          }
        },
        additionalProperties: false
      },
      async handler(args: {
        date?: string; branch?: string;
        include_returns?: boolean; include_zero_sales_branches?: boolean;
      }) {
        const query: Query = { date: args.date ?? today() };
        if (args.branch) query.branch = args.branch;
        if (args.include_returns !== undefined) query.include_returns = args.include_returns;
        if (args.include_zero_sales_branches !== undefined) {
          query.include_zero_sales_branches = args.include_zero_sales_branches;
        }
        return client.get("/api/warehouse/daily-sales-by-channel", query);
      }
    },
    {
      name: "warehouse_sales_anomalies",
      description:
        "Phát hiện kho (hoặc kho × kênh) tăng/giảm bất thường so với trung bình N ngày gần nhất (mặc định 14 ngày, không gồm ngày báo cáo). Trả về today, baseline trung bình/ngày, % thay đổi, hướng và mức độ nghiêm trọng.",
      inputSchema: {
        type: "object",
        properties: {
          date: { type: "string", description: "Ngày báo cáo YYYY-MM-DD. Mặc định hôm nay." },
          lookback_days: { type: "integer", minimum: 3, maximum: 90, description: "Số ngày lịch sử để tính trung bình. Mặc định 14." },
          metric: { type: "string", enum: ["orders", "units", "gross_revenue", "net_revenue"], description: "Metric chính để xếp hạng bất thường. Mặc định orders." },
          group_by: { type: "string", enum: ["branch", "branch_channel"], description: "Gom theo kho hoặc kho × kênh. Mặc định branch." },
          branch: { type: "string", description: "Lọc một kho theo mã chi nhánh (tùy chọn)." },
          min_baseline_orders: { type: "number", description: "Bỏ qua nhóm có trung bình đơn quá nhỏ. Mặc định 3 đơn/ngày." },
          change_threshold_pct: { type: "number", description: "Ngưỡng phần trăm để gắn cờ bất thường. Mặc định 30." },
          include_zero_today: { type: "boolean", description: "Hiển thị kho hôm nay 0 đơn nhưng baseline cao. Mặc định true." }
        },
        additionalProperties: false
      },
      async handler(args: {
        date?: string; lookback_days?: number;
        metric?: string; group_by?: string; branch?: string;
        min_baseline_orders?: number; change_threshold_pct?: number;
        include_zero_today?: boolean;
      }) {
        const query: Query = { date: args.date ?? today() };

        const lookback = args.lookback_days ?? 14;
        if (!Number.isInteger(lookback) || lookback < 3 || lookback > 90) {
          throw new AdventoryError("lookback_days phải là số nguyên từ 3 đến 90.", {
            code: "invalid_param",
            param: "lookback_days"
          });
        }
        query.lookback_days = lookback;

        const metric = args.metric ?? "orders";
        if (!["orders", "units", "gross_revenue", "net_revenue"].includes(metric)) {
          throw new AdventoryError("metric không hợp lệ (orders | units | gross_revenue | net_revenue).", {
            code: "invalid_param",
            param: "metric"
          });
        }
        query.metric = metric;

        const groupBy = args.group_by ?? "branch";
        if (!["branch", "branch_channel"].includes(groupBy)) {
          throw new AdventoryError("group_by không hợp lệ (branch | branch_channel).", {
            code: "invalid_param",
            param: "group_by"
          });
        }
        query.group_by = groupBy;

        if (args.branch) query.branch = args.branch;
        if (args.min_baseline_orders !== undefined) query.min_baseline_orders = args.min_baseline_orders;
        if (args.change_threshold_pct !== undefined) query.change_threshold_pct = args.change_threshold_pct;
        if (args.include_zero_today !== undefined) query.include_zero_today = args.include_zero_today;

        return client.get("/api/warehouse/sales-anomalies", query);
      }
    },
    {
      name: "warehouse_top_skus",
      description:
        "Top SKU bán chạy theo số lượng trong một ngày/khoảng ngày, kèm kho bán chính, kênh bán chính và cặp kho × kênh chính. Mặc định hôm qua (giờ Việt Nam) để tránh số liệu partial trong ngày.",
      inputSchema: {
        type: "object",
        properties: {
          date: { type: "string", description: "Ngày YYYY-MM-DD. Mặc định hôm qua. Không dùng cùng from/to." },
          from: { type: "string", description: "Ngày bắt đầu YYYY-MM-DD (đi kèm to)." },
          to: { type: "string", description: "Ngày kết thúc YYYY-MM-DD, inclusive (đi kèm from)." },
          limit: { type: "integer", minimum: 1, maximum: 100, description: "Số SKU trả về. Mặc định 10." },
          branch: { type: "string", description: "Lọc một kho theo mã chi nhánh (tùy chọn)." },
          sale_channel: { type: "string", description: "Lọc một kênh bán theo mã kênh (tùy chọn)." },
          order_basis: { type: "string", enum: ["all_non_cancelled", "completed"], description: "Tập đơn. Mặc định all_non_cancelled." },
          line_filter: { type: "string", enum: ["paid_only", "all_positive_quantity"], description: "paid_only loại dòng 0đ. Mặc định paid_only." },
          sort_by: { type: "string", enum: ["units", "line_revenue", "orders"], description: "Metric xếp hạng. Mặc định units." }
        },
        additionalProperties: false
      },
      async handler(args: {
        date?: string; from?: string; to?: string; limit?: number;
        branch?: string; sale_channel?: string;
        order_basis?: string; line_filter?: string; sort_by?: string;
      }) {
        const hasRange = args.from !== undefined || args.to !== undefined;
        if (args.date !== undefined && hasRange) {
          throw new AdventoryError("Chỉ truyền `date` hoặc cặp `from`+`to`, không truyền đồng thời.", {
            code: "invalid_param",
            param: "date"
          });
        }
        if ((args.from === undefined) !== (args.to === undefined)) {
          throw new AdventoryError("`from` và `to` phải đi cùng nhau.", {
            code: "invalid_param",
            param: "from"
          });
        }

        const query: Query = {};
        if (hasRange) {
          query.from = args.from;
          query.to = args.to;
        } else {
          query.date = args.date ?? yesterday();
        }

        const limit = args.limit ?? 10;
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
          throw new AdventoryError("limit phải là số nguyên từ 1 đến 100.", {
            code: "invalid_param",
            param: "limit"
          });
        }
        query.limit = limit;

        const orderBasis = args.order_basis ?? "all_non_cancelled";
        if (!["all_non_cancelled", "completed"].includes(orderBasis)) {
          throw new AdventoryError("order_basis không hợp lệ (all_non_cancelled | completed).", {
            code: "invalid_param",
            param: "order_basis"
          });
        }
        query.order_basis = orderBasis;

        const lineFilter = args.line_filter ?? "paid_only";
        if (!["paid_only", "all_positive_quantity"].includes(lineFilter)) {
          throw new AdventoryError("line_filter không hợp lệ (paid_only | all_positive_quantity).", {
            code: "invalid_param",
            param: "line_filter"
          });
        }
        query.line_filter = lineFilter;

        const sortBy = args.sort_by ?? "units";
        if (!["units", "line_revenue", "orders"].includes(sortBy)) {
          throw new AdventoryError("sort_by không hợp lệ (units | line_revenue | orders).", {
            code: "invalid_param",
            param: "sort_by"
          });
        }
        query.sort_by = sortBy;

        if (args.branch) query.branch = args.branch;
        if (args.sale_channel) query.sale_channel = args.sale_channel;
        return client.get("/api/warehouse/top-skus", query);
      }
    },
    {
      name: "warehouse_transfers",
      description:
        "Danh sách phiếu chuyển kho kèm trạng thái SLA: in_transit (đang đi, trong lead time), stale_in_transit (quá SLA nhưng vẫn được cộng vào effective stock), received, no_dispatch_date. Mặc định chỉ trả phiếu đang đi.",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["in_transit_or_stale", "in_transit", "stale_in_transit", "received", "no_dispatch_date", "all"], description: "Lọc theo trạng thái SLA. Mặc định in_transit_or_stale." },
          from_branch: { type: "string", description: "Lọc kho nguồn theo mã chi nhánh (tùy chọn)." },
          to_branch: { type: "string", description: "Lọc kho nhận theo mã chi nhánh (tùy chọn)." },
          sla_override_days: { type: "number", description: "Ghi đè ngưỡng SLA thay cho lead_time_days của kho nhận." },
          include_lines: { type: "boolean", description: "Kèm chi tiết dòng SKU của phiếu. Mặc định false." },
          as_of: { type: "string", description: "Ngày tham chiếu YYYY-MM-DD để tính tuổi phiếu. Mặc định hôm nay." }
        },
        additionalProperties: false
      },
      async handler(args: {
        status?: string; from_branch?: string; to_branch?: string;
        sla_override_days?: number; include_lines?: boolean; as_of?: string;
      }) {
        const status = args.status ?? "in_transit_or_stale";
        if (!["in_transit_or_stale", "in_transit", "stale_in_transit", "received", "no_dispatch_date", "all"].includes(status)) {
          throw new AdventoryError("status không hợp lệ.", {
            code: "invalid_param",
            param: "status"
          });
        }

        const query: Query = { status };
        if (args.from_branch) query.from_branch = args.from_branch;
        if (args.to_branch) query.to_branch = args.to_branch;
        if (args.sla_override_days !== undefined) query.sla_override_days = args.sla_override_days;
        if (args.include_lines !== undefined) query.include_lines = args.include_lines;
        if (args.as_of) query.as_of = args.as_of;
        return client.get("/api/warehouse/transfers", query);
      }
    },
    {
      name: "warehouse_sku_trends",
      description:
        "SKU tăng/giảm mạnh nhất giữa N ngày gần nhất và N ngày liền trước (mặc định 14 ngày, anchor = hôm qua). Trả current/prior, % thay đổi, hướng và xếp hạng gainers/losers.",
      inputSchema: {
        type: "object",
        properties: {
          date: { type: "string", description: "Ngày anchor YYYY-MM-DD. Mặc định hôm qua." },
          window_days: { type: "integer", minimum: 3, maximum: 90, description: "Độ dài mỗi kỳ. Mặc định 14." },
          metric: { type: "string", enum: ["units", "line_revenue", "orders"], description: "Metric xếp hạng. Mặc định units." },
          direction: { type: "string", enum: ["gainers", "losers", "both"], description: "Chiều cần lấy. Mặc định both." },
          limit: { type: "integer", minimum: 1, maximum: 100, description: "Số SKU mỗi chiều. Mặc định 10." },
          branch: { type: "string", description: "Lọc một kho (tùy chọn)." },
          sale_channel: { type: "string", description: "Lọc một kênh bán (tùy chọn)." },
          order_basis: { type: "string", enum: ["all_non_cancelled", "completed"], description: "Tập đơn. Mặc định all_non_cancelled." },
          line_filter: { type: "string", enum: ["paid_only", "all_positive_quantity"], description: "Lọc dòng. Mặc định paid_only." },
          min_prior: { type: "number", description: "Ngưỡng tối thiểu của metric đã chọn ở kỳ trước để loại nhiễu khi xếp losers. Mặc định 5." }
        },
        additionalProperties: false
      },
      async handler(args: {
        date?: string; window_days?: number; metric?: string; direction?: string;
        limit?: number; branch?: string; sale_channel?: string;
        order_basis?: string; line_filter?: string; min_prior?: number;
      }) {
        const query: Query = { date: args.date ?? yesterday() };

        const windowDays = args.window_days ?? 14;
        if (!Number.isInteger(windowDays) || windowDays < 3 || windowDays > 90) {
          throw new AdventoryError("window_days phải là số nguyên từ 3 đến 90.", {
            code: "invalid_param",
            param: "window_days"
          });
        }
        query.window_days = windowDays;

        const metric = args.metric ?? "units";
        if (!["units", "line_revenue", "orders"].includes(metric)) {
          throw new AdventoryError("metric không hợp lệ (units | line_revenue | orders).", {
            code: "invalid_param",
            param: "metric"
          });
        }
        query.metric = metric;

        const direction = args.direction ?? "both";
        if (!["gainers", "losers", "both"].includes(direction)) {
          throw new AdventoryError("direction không hợp lệ (gainers | losers | both).", {
            code: "invalid_param",
            param: "direction"
          });
        }
        query.direction = direction;

        const limit = args.limit ?? 10;
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
          throw new AdventoryError("limit phải là số nguyên từ 1 đến 100.", {
            code: "invalid_param",
            param: "limit"
          });
        }
        query.limit = limit;

        const orderBasis = args.order_basis ?? "all_non_cancelled";
        if (!["all_non_cancelled", "completed"].includes(orderBasis)) {
          throw new AdventoryError("order_basis không hợp lệ (all_non_cancelled | completed).", {
            code: "invalid_param",
            param: "order_basis"
          });
        }
        query.order_basis = orderBasis;

        const lineFilter = args.line_filter ?? "paid_only";
        if (!["paid_only", "all_positive_quantity"].includes(lineFilter)) {
          throw new AdventoryError("line_filter không hợp lệ (paid_only | all_positive_quantity).", {
            code: "invalid_param",
            param: "line_filter"
          });
        }
        query.line_filter = lineFilter;

        if (args.branch) query.branch = args.branch;
        if (args.sale_channel) query.sale_channel = args.sale_channel;
        if (args.min_prior !== undefined) query.min_prior = args.min_prior;
        return client.get("/api/warehouse/sku-trends", query);
      }
    },
    {
      name: "reorder_suggestions",
      description: "Đề xuất nhập hàng/điều chuyển cho một chi nhánh (mã chi nhánh lấy từ warehouse_branches).",
      inputSchema: {
        type: "object",
        properties: { branch: { type: "string", description: "Mã chi nhánh." } },
        required: ["branch"], additionalProperties: false
      },
      async handler(args: { branch?: string }) {
        const branch = requireStr(args as Record<string, unknown>, "branch");
        return client.get("/api/warehouse/reorder", { branch });
      }
    },
    {
      name: "production_plan",
      description: "Kế hoạch sản xuất hiện tại cho một chi nhánh nhà máy (mã chi nhánh lấy từ warehouse_branches).",
      inputSchema: {
        type: "object",
        properties: { branch: { type: "string", description: "Mã chi nhánh nhà máy." } },
        required: ["branch"], additionalProperties: false
      },
      async handler(args: { branch?: string }) {
        const branch = requireStr(args as Record<string, unknown>, "branch");
        return client.get("/api/warehouse/production/plan", { branch });
      }
    },
    {
      name: "production_materials",
      description: "Thiếu hụt nguyên liệu (BOM) cho một kế hoạch sản xuất. Lấy plan id từ production_plan.",
      inputSchema: {
        type: "object",
        properties: { plan: { type: "string", description: "ID kế hoạch sản xuất (UUID)." } },
        required: ["plan"], additionalProperties: false
      },
      async handler(args: { plan?: string }) {
        const plan = requireStr(args as Record<string, unknown>, "plan");
        return client.get("/api/warehouse/production/materials", { plan });
      }
    },
    {
      name: "analytics_summary",
      description: "Tổng hợp đơn hàng/doanh thu theo khoảng ngày, lọc theo nền tảng (tùy chọn).",
      inputSchema: {
        type: "object",
        properties: { ...rangeProps, platform: { type: "string", description: "Lọc theo nền tảng (tùy chọn)." } },
        additionalProperties: false
      },
      async handler(args: RangeArgs & { platform?: string }) {
        const r = range(args);
        return client.get("/api/analytics/summary", { from: r.from, to: r.to, platform: args.platform });
      }
    },
    {
      name: "analytics_by_platform",
      description: "Doanh thu/đơn hàng chia theo nền tảng trong khoảng ngày.",
      inputSchema: {
        type: "object",
        properties: { ...rangeProps, platform: { type: "string" } },
        additionalProperties: false
      },
      async handler(args: RangeArgs & { platform?: string }) {
        const r = range(args);
        return client.get("/api/analytics/by-platform", { from: r.from, to: r.to, platform: args.platform });
      }
    },
    {
      name: "analytics_orders",
      description: "Danh sách đơn hàng (phân trang) trong khoảng ngày, lọc theo nền tảng/trạng thái.",
      inputSchema: {
        type: "object",
        properties: {
          ...rangeProps,
          platform: { type: "string" },
          status: { type: "string" },
          page: { type: "integer", minimum: 1, description: "Mặc định 1." },
          page_size: { type: "integer", minimum: 1, maximum: 100, description: "Mặc định 50." }
        },
        additionalProperties: false
      },
      async handler(args: RangeArgs & { platform?: string; status?: string; page?: number; page_size?: number }) {
        const r = range(args);
        return client.get("/api/analytics/orders", {
          from: r.from, to: r.to, platform: args.platform, status: args.status,
          page: args.page ?? 1, page_size: args.page_size ?? 50
        });
      }
    },
    createDualAlertsTool(client),
  ];
}
