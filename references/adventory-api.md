# Adventory MCP — API Reference

All 19 tools send **GET** requests to the Adventory backend. Authentication uses the header:

```
Authorization: Bearer adv_live_...
```

Tenancy is enforced server-side via the API key — the key is scoped to a single tenant's data. No tenant ID parameter is needed in any request.

Default base URL: `https://dashboard-api.clipoox.com` (override with `ADVENTORY_API_BASE_URL`).

---

## Tool Reference Table

| Tool | Backend Endpoint | Parameters | Returns |
|---|---|---|---|
| `adventory_capabilities` | `GET /api/me` + `GET /api/connections` | none | Tenant profile and list of connected platform integrations |
| `ads_overview` | `GET /api/ads/overview` | `from` (optional, YYYY-MM-DD), `to` (optional, YYYY-MM-DD) — defaults to last 7 days | Aggregate ad spend, revenue, ROAS, and active channel count across all connected ad platforms |
| `ads_campaigns` | `GET /api/ads/campaigns` | `platform` (**required**, enum: `tiktok_ads` \| `facebook` \| `shopee`), `from` (optional), `to` (optional) — date defaults to last 7 days | Campaign list with performance metrics for the specified platform |
| `ads_creatives` | `GET /api/ads/creatives` | `platform` (**required**, enum: `tiktok_ads` \| `facebook` \| `shopee`), `from` (optional), `to` (optional) — date defaults to last 7 days | Creative/ad list with performance metrics for the specified platform |
| `ads_insights` | `GET /api/ads/insights` | `from` (optional, YYYY-MM-DD), `to` (optional, YYYY-MM-DD) — defaults to last 7 days | Rule-based findings: losing-money campaigns, zero-conversion campaigns, scaling wins, creative fatigue signals |
| `warehouse_branches` | `GET /api/warehouse/branches` | none | Branch/warehouse list with codes, names, and per-branch configuration |
| `warehouse_alerts` | `GET /api/warehouse/alerts` | `branch` (optional, branch code), `status` (optional, alert status filter) | Pre-computed stock alerts classified by type (out-of-stock, low-stock, overstock, etc.) |
| `warehouse_daily_sales` | `GET /api/warehouse/daily-sales` | `date` (optional, YYYY-MM-DD — defaults to today) | Sales by channel for the specified day |
| `warehouse_daily_sales_by_channel` | `GET /api/warehouse/daily-sales-by-channel` | `date` (optional), `branch` (optional), `include_returns` (optional), `include_zero_sales_branches` (optional) | Warehouse x channel sales with gross/net revenue, returns, insights, and data freshness |
| `warehouse_sales_anomalies` | `GET /api/warehouse/sales-anomalies` | `date` (optional), `lookback_days` (3-90), `metric` (`orders`\|`units`\|`gross_revenue`\|`net_revenue`), `group_by` (`branch`\|`branch_channel`), `branch` (optional), thresholds | Branch or branch x channel sales anomalies versus trailing daily average |
| `warehouse_top_skus` | `GET /api/warehouse/top-skus` | `date` (optional, default yesterday) or `from`+`to`; `limit` (1-100); `branch`; `sale_channel`; `order_basis` (`all_non_cancelled`\|`completed`); `line_filter` (`paid_only`\|`all_positive_quantity`); `sort_by` (`units`\|`line_revenue`\|`orders`) | Top SKUs by units with main branch/channel and branch x channel breakdown |
| `warehouse_transfers` | `GET /api/warehouse/transfers` | `status` (default `in_transit_or_stale`); `from_branch`; `to_branch`; `sla_override_days`; `include_lines`; `as_of` | Inter-branch transfers with SLA status from destination lead time |
| `warehouse_sku_trends` | `GET /api/warehouse/sku-trends` | `date` (anchor); `window_days` (3-90); `metric` (`units`\|`line_revenue`\|`orders`); `direction` (`gainers`\|`losers`\|`both`); `limit`; `branch`; `sale_channel`; `order_basis`; `line_filter`; `min_prior` (threshold in the selected metric) | SKU growth/decline: trailing-N vs prior-N window |
| `reorder_suggestions` | `GET /api/warehouse/reorder` | `branch` (**required**, branch code from `warehouse_branches`) | Pre-computed reorder and transfer suggestions for the specified branch |
| `production_plan` | `GET /api/warehouse/production/plan` | `branch` (**required**, branch code from `warehouse_branches`) | Current production plan lines for the specified factory branch, with status and quantities |
| `production_materials` | `GET /api/warehouse/production/materials` | `plan` (**required**, UUID from `production_plan`) | BOM-derived material shortfalls for the specified production plan |
| `analytics_summary` | `GET /api/analytics/summary` | `from` (optional, YYYY-MM-DD), `to` (optional) — defaults to last 7 days; `platform` (optional, filter by platform) | Aggregated order count and revenue for the date range |
| `analytics_by_platform` | `GET /api/analytics/by-platform` | `from` (optional), `to` (optional) — defaults to last 7 days; `platform` (optional, filter) | Revenue and order count broken down by platform |
| `analytics_orders` | `GET /api/analytics/orders` | `from` (optional), `to` (optional) — defaults to last 7 days; `platform` (optional); `status` (optional); `page` (optional integer ≥ 1, default `1`); `page_size` (optional integer 1–100, default `50`) | Paginated order list for the date range with optional platform and status filters |

---

## Parameter Defaults

| Parameter | Default | Notes |
|---|---|---|
| `from` / `to` (date range) | Last 7 days | Computed at request time by the MCP server (`defaultRange()` in `dates.ts`) |
| `date` (daily sales) | Today | Computed at request time by the MCP server (`today()` in `dates.ts`) |
| `date` (`warehouse_top_skus`, `warehouse_sku_trends`) | Yesterday | Computed at request time by the MCP server (`yesterday()` in `dates.ts`) |
| `lookback_days` (sales anomalies) | `14` | Baseline excludes the report date; allowed range is 3-90 days |
| `page` | `1` | For `analytics_orders` only |
| `page_size` | `50` | For `analytics_orders` only; maximum 100 |

---

## Discovery Order

Some tools depend on IDs returned by prior calls:

```
adventory_capabilities          — confirm connected platforms
    └── warehouse_branches      — get branch codes
            ├── reorder_suggestions(branch=<code>)
            └── production_plan(branch=<code>)
                    └── production_materials(plan=<UUID>)
```

Never pass a guessed branch code or plan ID. Always resolve from the appropriate parent call first.

---

## Error HTTP Status Codes

| HTTP Status | Meaning | MCP error message |
|---|---|---|
| 401 | API key invalid or revoked | "API key không hợp lệ hoặc đã bị thu hồi. Hãy tạo key mới trong dashboard (mục MCP / API access)." |
| 403 | Account not linked to a tenant or missing read permission | "Tài khoản chưa gắn với gian hàng nào hoặc không có quyền đọc dữ liệu này." |
| 404 | Resource not found | "Không tìm thấy dữ liệu cho yêu cầu này." |
| 429 | Rate limited | "Hệ thống đang giới hạn request. Hãy thu hẹp khoảng ngày hoặc thử lại sau." |
| 503 / timeout | Backend unreachable or timed out (default 30 s) | "Adventory API tạm thời không phản hồi. Thử lại sau ít phút." |
