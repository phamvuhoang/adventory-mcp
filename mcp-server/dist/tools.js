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