---
name: adventory-inventory-analytics
description: Dùng khi người dùng hỏi về tồn kho, cảnh báo kho, chi nhánh/kho, đề xuất nhập hàng hoặc điều chuyển, kế hoạch sản xuất, nguyên liệu/định mức, doanh số ngày — tất cả dữ liệu kho vận của Adventory. Vietnamese triggers: tồn kho, kho, chi nhánh, cảnh báo tồn kho, nhập hàng, điều chuyển, sản xuất, kế hoạch sản xuất, nguyên liệu, định mức, doanh số, doanh thu ngày, reorder, BOM.
---

# Adventory Inventory Analytics

## Khi Nào Dùng

Dùng skill này cho mọi câu hỏi về kho vận và sản xuất của cửa hàng trên Adventory: tồn kho theo chi nhánh, cảnh báo hết hàng/tồn cao/tồn thấp, đề xuất nhập hàng hoặc điều chuyển, kế hoạch sản xuất, thiếu hụt nguyên liệu (BOM), doanh số theo ngày và theo kênh.

**Adventory cung cấp dữ liệu đã được tính toán sẵn** — các cảnh báo, đề xuất nhập hàng, kế hoạch sản xuất và BOM material shortfall đều là kết quả của engine phân tích phía backend (dựa trên dữ liệu KiotViet kéo mỗi giờ), không phải dữ liệu thô. Claude không cần tự tính toán lại — hãy đọc và trình bày kết quả, rồi đề xuất hành động.

Server này **chỉ đọc** — không thể tạo đơn nhập hàng, xác nhận điều chuyển, hay phê duyệt kế hoạch sản xuất qua đây.

Luôn trả lời bằng tiếng Việt nếu người dùng viết tiếng Việt.

## Thứ Tự Gọi Tool — Quan Trọng

Nhiều tool yêu cầu mã chi nhánh hoặc plan ID:

1. **Luôn gọi `warehouse_branches` trước** khi dùng `reorder_suggestions` hoặc `production_plan` — để lấy mã chi nhánh (`branch`) chính xác.
2. **Gọi `production_plan` trước** khi dùng `production_materials` — để lấy `plan` ID (UUID) của kế hoạch sản xuất hiện tại.

Không đoán mã chi nhánh hay plan ID. Nếu người dùng cung cấp tên chi nhánh (không phải mã), hãy gọi `warehouse_branches` để tra đúng mã.

## Tool Reference

| Tool | Dùng để làm gì | Tham số |
|---|---|---|
| `adventory_capabilities` | Xem gian hàng và các nền tảng đã kết nối — gọi đầu tiên để định hướng | không có |
| `warehouse_branches` | Danh sách chi nhánh/kho và cấu hình — **gọi trước khi dùng reorder_suggestions hoặc production_plan** | không có |
| `warehouse_alerts` | Cảnh báo tồn kho (hết hàng, tồn thấp, tồn cao...) | `branch?` (mã chi nhánh), `status?` (lọc theo trạng thái cảnh báo) |
| `warehouse_daily_sales` | Doanh số theo kênh trong một ngày (chỉ số đơn + số sản phẩm) | `date?` (YYYY-MM-DD — mặc định hôm nay) |
| `warehouse_daily_sales_by_channel` | Báo cáo ngày theo **kho × kênh** kèm **doanh thu gross/net**, trả hàng, tên kênh thật, `insights`, `source.data_freshness`/`partial` — dùng cho báo cáo CEO | `date?` (mặc định hôm nay), `branch?` (lọc một kho), `include_returns?` (mặc định true), `include_zero_sales_branches?` (mặc định false) |
| `warehouse_sales_anomalies` | So sánh hôm nay với trung bình N ngày (mặc định 14) để tìm kho/kênh **tăng/giảm bất thường** — kèm % thay đổi, hướng, mức độ | `date?`, `lookback_days?` (3-90, mặc định 14), `metric?` (orders\|units\|gross_revenue\|net_revenue), `group_by?` (branch\|branch_channel), `branch?`, `min_baseline_orders?`, `change_threshold_pct?`, `include_zero_today?` |
| `warehouse_top_skus` | Top SKU bán chạy theo số lượng, kèm kho chính / kênh chính / kho × kênh chính | `date?` (mặc định hôm qua) hoặc `from`+`to`, `limit?` (1-100, mặc định 10), `branch?`, `sale_channel?`, `order_basis?` (all_non_cancelled\|completed), `line_filter?` (paid_only\|all_positive_quantity), `sort_by?` (units\|line_revenue\|orders) |
| `warehouse_transfers` | Phiếu chuyển kho + trạng thái SLA (in_transit / stale_in_transit / received / no_dispatch_date) theo lead_time_days kho nhận | `status?` (mặc định in_transit_or_stale), `from_branch?`, `to_branch?`, `sla_override_days?`, `include_lines?`, `as_of?` |
| `warehouse_sku_trends` | SKU tăng/giảm mạnh giữa N ngày gần nhất và N ngày trước đó | `date?` (anchor, mặc định hôm qua), `window_days?` (3-90, mặc định 14), `metric?` (units\|line_revenue\|orders), `direction?` (gainers\|losers\|both), `limit?`, `branch?`, `sale_channel?`, `order_basis?`, `line_filter?`, `min_prior?` (ngưỡng theo metric đã chọn) |
| `reorder_suggestions` | Đề xuất nhập hàng/điều chuyển cho một chi nhánh | `branch` (**bắt buộc** — mã chi nhánh từ `warehouse_branches`) |
| `production_plan` | Kế hoạch sản xuất hiện tại cho một chi nhánh nhà máy | `branch` (**bắt buộc** — mã chi nhánh từ `warehouse_branches`) |
| `production_materials` | Thiếu hụt nguyên liệu BOM cho một kế hoạch sản xuất | `plan` (**bắt buộc** — UUID từ `production_plan`) |
| `analytics_summary` | Tổng hợp đơn hàng/doanh thu theo khoảng ngày | `from?`, `to?` (YYYY-MM-DD — mặc định 7 ngày), `platform?` (lọc theo nền tảng) |
| `analytics_by_platform` | Doanh thu/đơn hàng chia theo nền tảng trong khoảng ngày | `from?`, `to?`, `platform?` |
| `analytics_orders` | Danh sách đơn hàng (phân trang) theo khoảng ngày | `from?`, `to?`, `platform?`, `status?`, `page?` (mặc định 1), `page_size?` (mặc định 50, tối đa 100) |

## Quy Trình Chuẩn

### Cảnh Báo Tồn Kho

Trigger: *"Sản phẩm nào sắp hết?"*, *"Có cảnh báo tồn kho nào không?"*, *"Tồn kho chi nhánh X thế nào?"*

1. Gọi `warehouse_branches` để biết danh sách chi nhánh và mã của chúng.
2. Gọi `warehouse_alerts` — không truyền `branch` để lấy toàn bộ, hoặc truyền mã chi nhánh cụ thể nếu người dùng hỏi chi nhánh đó.
3. Phân nhóm cảnh báo rõ ràng:
   - **Hết hàng** — cần xử lý ngay.
   - **Tồn thấp** — sắp hết, cần theo dõi.
   - **Tồn cao** — tồn đọng, rủi ro vốn.
   - **Khác** — các cảnh báo trạng thái khác nếu có.
4. Nêu sản phẩm, chi nhánh, số lượng tồn hiện tại và ngưỡng cảnh báo (nếu API trả về).
5. Kết thúc bằng danh sách hành động ưu tiên: xử lý hết hàng trước, sau đó tồn thấp.

### Đề Xuất Nhập Hàng / Điều Chuyển

Trigger: *"Nên nhập hàng gì?"*, *"Đề xuất nhập hàng chi nhánh X"*, *"Điều chuyển hàng từ đâu?"*

1. Gọi `warehouse_branches` để lấy danh sách và mã chi nhánh.
2. Nếu người dùng chỉ định chi nhánh, xác định đúng mã. Nếu không, hỏi hoặc gọi cho chi nhánh chính.
3. Gọi `reorder_suggestions` với mã chi nhánh.
4. Trình bày đề xuất theo nhóm: nhập từ nhà cung cấp / điều chuyển từ chi nhánh khác.
5. Nêu rõ: sản phẩm, số lượng đề xuất, lý do (tồn dưới ngưỡng, velocity cao...).
6. Nhấn mạnh đây là đề xuất đọc-dữ liệu — thao tác thực hiện cần làm thủ công trên KiotViet hoặc giao diện Adventory.

### Kế Hoạch Sản Xuất

Trigger: *"Kế hoạch sản xuất hiện tại?"*, *"Sản xuất tuần này thế nào?"*, *"Chi nhánh nhà máy đang sản xuất gì?"*

1. Gọi `warehouse_branches` để lấy mã chi nhánh nhà máy.
2. Gọi `production_plan` với mã chi nhánh nhà máy.
3. Trình bày kế hoạch: các dòng sản xuất, trạng thái (`suggested` / `approved` / `in_production` / `completed` / `cancelled`), số lượng.
4. Tập trung vào các dòng đang trong trạng thái `approved` và `in_production` trước.

### Thiếu Hụt Nguyên Liệu (BOM)

Trigger: *"Thiếu nguyên liệu gì?"*, *"BOM kế hoạch sản xuất"*, *"Có đủ nguyên liệu không?"*

1. Gọi `warehouse_branches` → lấy mã chi nhánh nhà máy.
2. Gọi `production_plan` → lấy plan ID (UUID).
3. Gọi `production_materials` với plan ID đó.
4. Trình bày thiếu hụt: nguyên liệu, tồn hiện có, lượng cần, lượng thiếu.
5. Nêu rõ nguyên liệu thiếu cần nhập gấp để không chặn sản xuất.

### Doanh Số Ngày / Khoảng Ngày

Trigger: *"Hôm nay bán được bao nhiêu?"*, *"Doanh số theo kênh hôm qua?"*, *"Doanh thu tuần này?"*

1. Báo cáo "hôm nay mỗi kho bán bao nhiêu đơn/sản phẩm/doanh thu theo kênh?": gọi `warehouse_daily_sales_by_channel` với `date` — trả về tổng công ty, tổng theo kho và bảng kho × kênh kèm doanh thu (VND), `returns_value`/`net_revenue`, `insights`, tên kênh thật và freshness. Đây là tool ưu tiên cho báo cáo CEO.
2. Chỉ cần số đơn + số sản phẩm theo kênh (không cần doanh thu): `warehouse_daily_sales`.
3. Doanh thu khoảng ngày: gọi `analytics_summary` với `from`/`to`.
4. Phân tích theo nền tảng: gọi `analytics_by_platform` với cùng khoảng ngày.
5. Nêu rõ: ngày/khoảng ngày, kho, kênh, số đơn, số sản phẩm, doanh thu; nếu `source.partial=true`, `source.data_freshness` cũ (>90 phút), hoặc có `source.warnings` thì nói rõ dữ liệu có thể chưa đầy đủ.

### Bất Thường So Với Trung Bình 14 Ngày

Trigger: *"Kho nào tăng/giảm bất thường?"*, *"So với 2 tuần trước, hôm nay kho nào lạ?"*

1. Gọi `warehouse_sales_anomalies` với `date` (mặc định hôm nay). Mặc định gom theo kho, xếp hạng theo số đơn.
2. Nếu cần chi tiết theo kênh: thêm `group_by=branch_channel`.
3. Đọc `rows[].direction` (up/down/flat), `severity` (low_volume/normal/warning/high/critical), `is_anomaly`, `change_pct`, `reason`.
4. Nếu `source.partial_today=true`, nói rõ hôm nay chưa hết ngày nên số liệu có thể thấp hơn thực tế (xem `source.elapsed_day_ratio`).
5. Kho `today=0` nhưng baseline cao → cảnh báo critical, gợi ý kiểm tra đồng bộ kênh bán (Shopee/TikTok/KiotViet).

### Top SKU Bán Chạy

Trigger: *"Top 10 SKU bán chạy hôm qua là gì, nằm ở kho nào, kênh nào kéo chính?"*

1. Gọi `warehouse_top_skus` (mặc định hôm qua, xếp theo số lượng). Cần khoảng ngày thì dùng `from`+`to`.
2. Đọc `rows[].main_branch`, `main_channel`, `main_branch_channel` và `unit_share_pct` để nói SKU chủ yếu bán ở đâu/kênh nào.
3. Muốn xét hàng đi ra kho gồm cả quà tặng/0đ → `line_filter=all_positive_quantity`; đối soát kế toán → `order_basis=completed`.

### Phiếu Chuyển Kho Và SLA

Trigger: *"Transfer nào quá SLA chưa nhận nhưng đang tính vào effective stock?"*, *"Hàng đang về kho nào?"*

1. Gọi `warehouse_transfers` (mặc định chỉ phiếu đang đi). `stale_in_transit` + `counts_toward_effective_stock=true` là phiếu quá hạn vẫn được cộng — cần đối soát.
2. Trước khi đề xuất nhập thêm/sản xuất một SKU, kiểm tra phiếu đang về cùng kho.
3. `status=received` cho biết phiếu đã nhận → cảnh báo thiếu tương ứng có thể tự hết.
4. Kho nhận chưa cấu hình `lead_time_days` → hệ thống dùng fallback và ghi `source.warnings`.

### SKU Tăng/Giảm 2 Tuần

Trigger: *"Top SKU tăng trưởng / tụt mạnh 2 tuần qua?"*

1. Gọi `warehouse_sku_trends` (mặc định 14 ngày vs 14 ngày liền trước).
2. `gainers`/`losers` kèm `growth_pct` (null = SKU mới) và `change`.
3. `min_prior` là ngưỡng theo metric đã chọn: nếu `metric=line_revenue` thì ngưỡng là VND/cents theo dữ liệu backend, không phải số đơn/sản phẩm.
4. Suy luận nguyên nhân SKU tụt bằng cách đối chiếu `warehouse_alerts` (hết hàng) và `ads_insights` (quảng cáo) — endpoint không tự gán nguyên nhân.

### Tra Cứu Đơn Hàng

Trigger: *"Đơn hàng hôm nay?"*, *"Đơn nền tảng Shopee tuần này?"*, *"Đơn hàng trạng thái nào đang chờ xử lý?"*

1. Gọi `analytics_orders` với `from`/`to`, `platform?`, `status?`, `page?`.
2. Nếu kết quả nhiều trang, nêu rõ tổng số và trang đang xem.
3. Tóm tắt phân bố đơn theo trạng thái và nền tảng.

## Cách Trình Bày Kết Quả

**Mở đầu bằng insight chính trong 1 câu** — ví dụ: "Hiện có 7 sản phẩm hết hàng và 12 sản phẩm tồn thấp cần nhập ngay."

**Nêu rõ trong mọi báo cáo:**
- Chi nhánh/kho đang xét
- Thời điểm dữ liệu (Adventory cập nhật mỗi giờ từ KiotViet)
- Khoảng ngày nếu liên quan đến doanh số/đơn hàng

**Bảng cảnh báo gọn:**

| Sản phẩm | Chi nhánh | Tồn hiện tại | Trạng thái | Đề xuất |
|---|---|---|---|---|

**Kết thúc bằng đề xuất hành động ưu tiên** — nêu sản phẩm, chi nhánh, số lượng cụ thể khi có thể.

## Dữ Liệu Đã Được Tính Sẵn

Không giống KiotViet raw API, Adventory trả về kết quả đã được engine backend tính toán:

- `warehouse_alerts` — cảnh báo đã được phân loại dựa trên velocity 2 tuần và ngưỡng mỗi chi nhánh.
- `warehouse_top_skus` — SKU bán chạy đã được backend gom theo đơn hợp lệ, kho và kênh.
- `warehouse_transfers` — phiếu chuyển kho đã được gắn trạng thái SLA theo lead time kho nhận.
- `warehouse_sku_trends` — SKU tăng/giảm đã được backend so sánh kỳ hiện tại với kỳ liền trước.
- `reorder_suggestions` — đề xuất đã tính toán bao gồm truck-fill greedy top-up.
- `production_plan` — kế hoạch đã được engine sản xuất tính từ tồn kho mạng lưới.
- `production_materials` — shortfall BOM đã được tính từ định mức và tồn hiện tại.

Claude không cần tự tính lại. Hãy đọc kết quả, trình bày rõ ràng và đề xuất hành động.

## Giới Hạn — Server Chỉ Đọc

Server này **chỉ đọc dữ liệu**. Không thể tạo đơn nhập hàng, xác nhận điều chuyển, phê duyệt kế hoạch sản xuất, hay gửi Telegram dispatch. Khi người dùng yêu cầu thao tác ghi, hãy nêu rõ giới hạn và hướng dẫn làm thủ công trên giao diện Adventory hoặc KiotViet.

## Lỗi Và Cách Phản Hồi

| Lỗi | Phản hồi |
|---|---|
| 401 — API key không hợp lệ/hết hạn | "API key không còn hợp lệ. Vui lòng vào Adventory Dashboard → mục MCP / API access để tạo key mới." |
| 403 — Không có quyền | "Tài khoản chưa gắn với gian hàng hoặc không có quyền đọc dữ liệu này. Kiểm tra lại trong dashboard." |
| 404 — Không tìm thấy | "Không tìm thấy dữ liệu cho yêu cầu này. Kiểm tra lại mã chi nhánh hoặc plan ID." |
| Nền tảng KiotViet chưa kết nối | "KiotViet chưa được kết nối. Vào Adventory → Connections để kết nối KiotViet trước khi xem dữ liệu kho." |
| 429 — Rate limit | "Hệ thống đang giới hạn request. Thu hẹp khoảng ngày hoặc thử lại sau ít phút." |
| Timeout | "Adventory API không phản hồi trong thời gian chờ. Thử lại sau ít phút." |
