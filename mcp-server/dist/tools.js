import { defaultRange, today } from "./dates.js";
import { AdventoryError } from "./errors.js";
const AD_PLATFORMS = ["tiktok_ads", "facebook", "shopee"];
function range(args) {
    if (args.from && args.to)
        return { from: args.from, to: args.to };
    return defaultRange();
}
function requireStr(args, key) {
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
export function createTools(client) {
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
            async handler(args) {
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
            async handler(args) {
                const platform = requireStr(args, "platform");
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
            async handler(args) {
                const platform = requireStr(args, "platform");
                const r = range(args);
                return client.get("/api/ads/creatives", { platform, from: r.from, to: r.to });
            }
        },
        {
            name: "ads_insights",
            description: "Phát hiện theo luật: chiến dịch lỗ, không chuyển đổi, đang scale tốt, creative bị bão hòa.",
            inputSchema: { type: "object", properties: { ...rangeProps }, additionalProperties: false },
            async handler(args) {
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
            async handler(args) {
                const query = {};
                if (args.branch)
                    query.branch = args.branch;
                if (args.status)
                    query.status = args.status;
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
            async handler(args) {
                return client.get("/api/warehouse/daily-sales", { date: args.date ?? today() });
            }
        },
        {
            name: "warehouse_daily_sales_by_channel",
            description: "Báo cáo doanh số trong ngày theo từng kho × kênh bán: số đơn, số sản phẩm, doanh thu gross/net, returns, insight, freshness, kèm tổng theo kho và toàn công ty. Mặc định hôm nay (giờ Việt Nam).",
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
            async handler(args) {
                const query = { date: args.date ?? today() };
                if (args.branch)
                    query.branch = args.branch;
                if (args.include_returns !== undefined)
                    query.include_returns = args.include_returns;
                if (args.include_zero_sales_branches !== undefined) {
                    query.include_zero_sales_branches = args.include_zero_sales_branches;
                }
                return client.get("/api/warehouse/daily-sales-by-channel", query);
            }
        },
        {
            name: "warehouse_sales_anomalies",
            description: "Phát hiện kho (hoặc kho × kênh) tăng/giảm bất thường so với trung bình N ngày gần nhất (mặc định 14 ngày, không gồm ngày báo cáo). Trả về today, baseline trung bình/ngày, % thay đổi, hướng và mức độ nghiêm trọng.",
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
            async handler(args) {
                const query = { date: args.date ?? today() };
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
                if (args.branch)
                    query.branch = args.branch;
                if (args.min_baseline_orders !== undefined)
                    query.min_baseline_orders = args.min_baseline_orders;
                if (args.change_threshold_pct !== undefined)
                    query.change_threshold_pct = args.change_threshold_pct;
                if (args.include_zero_today !== undefined)
                    query.include_zero_today = args.include_zero_today;
                return client.get("/api/warehouse/sales-anomalies", query);
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
            async handler(args) {
                const branch = requireStr(args, "branch");
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
            async handler(args) {
                const branch = requireStr(args, "branch");
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
            async handler(args) {
                const plan = requireStr(args, "plan");
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
            async handler(args) {
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
            async handler(args) {
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
            async handler(args) {
                const r = range(args);
                return client.get("/api/analytics/orders", {
                    from: r.from, to: r.to, platform: args.platform, status: args.status,
                    page: args.page ?? 1, page_size: args.page_size ?? 50
                });
            }
        }
    ];
}
//# sourceMappingURL=tools.js.map