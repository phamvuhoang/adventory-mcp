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
| `warehouse_daily_sales` | Doanh số theo kênh trong một ngày | `date?` (YYYY-MM-DD — mặc định hôm nay) |
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

1. Doanh số một ngày cụ thể: gọi `warehouse_daily_sales` với `date`.
2. Doanh thu khoảng ngày: gọi `analytics_summary` với `from`/`to`.
3. Phân tích theo kênh: gọi `analytics_by_platform` với cùng khoảng ngày.
4. Nêu rõ: khoảng ngày, kênh, số đơn, doanh thu, so sánh nếu người dùng hỏi.

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
