---
name: adventory-ads-analytics
description: Dùng khi người dùng hỏi về hiệu suất quảng cáo trên Adventory — TikTok Ads, Facebook/Meta, Shopee Ads: chi tiêu, ROAS, chiến dịch, creative, phát hiện/insight. Vietnamese triggers: quảng cáo, chiến dịch, ROAS, CPM, CPC, hiệu suất quảng cáo, ngân sách quảng cáo, chuyển đổi, creative, insight quảng cáo, TikTok Ads, Facebook Ads, Shopee Ads.
---

# Adventory Ads Analytics

## Khi Nào Dùng

Dùng skill này khi người dùng hỏi về hiệu suất quảng cáo của cửa hàng trên Adventory: chi tiêu, doanh thu từ quảng cáo, ROAS, CPM, CPC, chiến dịch đang chạy, creative nào hiệu quả, phát hiện vấn đề (lỗ, không chuyển đổi, creative bão hòa) hoặc cơ hội scale.

Adventory tổng hợp dữ liệu từ TikTok Ads, Facebook/Meta, và Shopee Ads vào một điểm truy cập duy nhất. Skill này đọc dữ liệu trực tiếp từ API Adventory (đã được cache 5 phút) — **không ghi, không thay đổi chiến dịch**.

Luôn trả lời bằng tiếng Việt nếu người dùng viết tiếng Việt.

## Tool Reference

| Tool | Dùng để làm gì | Tham số |
|---|---|---|
| `adventory_capabilities` | Xem gian hàng và các nền tảng đã kết nối — gọi đầu tiên để định hướng | không có |
| `ads_overview` | Tổng quan quảng cáo: tổng chi tiêu, doanh thu, ROAS, số kênh đang chạy | `from?` (YYYY-MM-DD), `to?` (YYYY-MM-DD) — mặc định 7 ngày gần nhất |
| `ads_insights` | Phát hiện theo luật: chiến dịch lỗ, không chuyển đổi, đang scale tốt, creative bão hòa | `from?`, `to?` — mặc định 7 ngày gần nhất |
| `ads_campaigns` | Danh sách chiến dịch của một nền tảng | `platform` (**bắt buộc**: `tiktok_ads` \| `facebook` \| `shopee`), `from?`, `to?` |
| `ads_creatives` | Danh sách creative/quảng cáo của một nền tảng | `platform` (**bắt buộc**: `tiktok_ads` \| `facebook` \| `shopee`), `from?`, `to?` |

**Lưu ý về khoảng ngày:** Nếu không truyền `from`/`to`, hệ thống tự lấy 7 ngày gần nhất. Khi người dùng hỏi "tuần này", "hôm qua", hãy tính ngày và truyền tường minh.

## Quy Trình Chuẩn

### Bước Khởi Đầu — Định Hướng Nền Tảng

Trước khi phân tích, gọi `adventory_capabilities` để biết nền tảng quảng cáo nào đã kết nối. Chỉ phân tích những nền tảng có trong danh sách kết nối. Nếu một nền tảng chưa kết nối, thông báo cho người dùng thay vì gọi tool với nền tảng đó.

### Tổng Quan Quảng Cáo

Trigger: *"Quảng cáo tuần này thế nào?"*, *"Tổng quan hiệu suất quảng cáo"*, *"Chi tiêu quảng cáo bao nhiêu?"*

1. Gọi `adventory_capabilities` để xác nhận nền tảng đã kết nối.
2. Gọi `ads_overview` với khoảng ngày phù hợp.
3. Gọi `ads_insights` cùng khoảng ngày đó để lấy các phát hiện.
4. Trình bày tổng chi tiêu, doanh thu, ROAS theo từng kênh.
5. Nêu rõ các phát hiện quan trọng nhất từ `ads_insights`.
6. Kết thúc bằng 2–3 đề xuất hành động cụ thể.

### Phân Tích Insight — Vấn Đề Và Cơ Hội

Trigger: *"Chiến dịch nào đang lỗ?"*, *"Insight quảng cáo"*, *"Creative nào bão hòa?"*, *"Chiến dịch nào đang scale tốt?"*

1. Gọi `ads_insights` với khoảng ngày.
2. Phân nhóm findings:
   - **Lỗ vốn** (`losing_money`): chiến dịch chi tiêu nhưng ROAS dưới ngưỡng → đề xuất tạm dừng hoặc cắt giảm ngân sách.
   - **Không chuyển đổi** (`zero_conversion`): chi tiêu nhưng không có chuyển đổi → kiểm tra tracking, landing page, audience.
   - **Đang scale tốt** (`scaling_win`): ROAS cao, còn dư địa → đề xuất tăng ngân sách có kiểm soát.
   - **Creative bão hòa** (`creative_fatigue`): CTR giảm, tần suất cao → đề xuất làm mới creative.
3. Với mỗi nhóm, nêu tên chiến dịch/creative cụ thể, không chỉ mô tả chung.

### Phân Tích Chiến Dịch Theo Nền Tảng

Trigger: *"Chiến dịch TikTok tuần này?"*, *"Facebook đang chạy chiến dịch nào?"*, *"Shopee Ads hiệu suất ra sao?"*

1. Gọi `ads_campaigns` với `platform` tương ứng và khoảng ngày.
2. Xếp hạng chiến dịch theo chi tiêu (cao → thấp).
3. Nêu rõ ROAS, CPM, CPC, chuyển đổi cho từng chiến dịch.
4. So sánh chiến dịch tốt nhất và kém nhất.

### Phân Tích Creative

Trigger: *"Creative nào hiệu quả?"*, *"Xem chi tiết quảng cáo"*, *"Creative nào cần thay?"*

1. Gọi `ads_creatives` với `platform` và khoảng ngày.
2. Xếp hạng creative theo chi tiêu và ROAS.
3. Nêu rõ creative bão hòa (CTR thấp/tần suất cao) và creative đang hiệu quả.
4. Đề xuất creative nào cần làm mới, creative nào có thể nhân rộng.

### So Sánh Đa Nền Tảng

Trigger: *"So sánh TikTok vs Facebook"*, *"Kênh nào hiệu quả nhất?"*

1. Gọi `ads_overview` để lấy tổng hợp.
2. Gọi `ads_campaigns` cho từng nền tảng đã kết nối.
3. So sánh side-by-side: chi tiêu, doanh thu, ROAS, CPM, CTR.
4. Đề xuất phân bổ ngân sách dựa trên hiệu suất.

## Cách Trình Bày Kết Quả

**Mở đầu bằng insight chính trong 1 câu** — ví dụ: "Tuần này Facebook ROAS đạt 4.2x nhưng TikTok đang lỗ trên 3 chiến dịch cần xem ngay."

**Nêu rõ trong mọi báo cáo:**
- Khoảng ngày đang xét
- Nền tảng đang phân tích
- Nguồn dữ liệu (Adventory live feed, cache tối đa 5 phút)

**Bảng KPI gọn:**

| Kênh | Chi tiêu | Doanh thu | ROAS | CPM | CTR |
|---|---|---|---|---|---|

**Kết thúc bằng đề xuất hành động cụ thể** — nêu tên chiến dịch/nền tảng, không chung chung.

Ví dụ đề xuất tốt: "Tạm dừng chiến dịch 'Sale Hè 2026' trên TikTok (ROAS 0.8, lỗ ~2.3 triệu tuần này). Tăng ngân sách 20% cho 'Brand Awareness Q2' trên Facebook (ROAS 5.1, CTR ổn định)."

## Giới Hạn — Server Chỉ Đọc

Server này **chỉ đọc dữ liệu**. Không thể tạm dừng chiến dịch, thay đổi ngân sách, hoặc chỉnh sửa creative qua đây. Khi người dùng yêu cầu thực hiện thay đổi, hãy nêu rõ giới hạn và hướng dẫn thao tác thủ công trên giao diện TikTok Ads Manager / Meta Ads Manager / Shopee Seller Center.

## Lỗi Và Cách Phản Hồi

| Lỗi | Phản hồi |
|---|---|
| 401 — API key không hợp lệ/hết hạn | "API key không còn hợp lệ. Vui lòng vào Adventory Dashboard → mục MCP / API access để tạo key mới." |
| 403 — Không có quyền | "Tài khoản chưa gắn với gian hàng hoặc không có quyền đọc dữ liệu này. Kiểm tra lại trong dashboard." |
| Nền tảng báo `needs_reconnect` | "Kênh [TikTok Ads / Facebook / Shopee] cần kết nối lại. Vào Adventory → Connections để kết nối lại nền tảng này." |
| 429 — Rate limit | "Hệ thống đang giới hạn request. Thu hẹp khoảng ngày hoặc thử lại sau ít phút." |
| 404 — Không tìm thấy | "Không có dữ liệu cho yêu cầu này trong khoảng ngày đã chọn." |
| Timeout | "Adventory API không phản hồi trong thời gian chờ. Thử lại sau ít phút." |
