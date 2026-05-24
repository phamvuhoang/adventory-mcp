# Example Questions — Adventory MCP

Questions a tenant can ask their AI assistant (Claude / Codex) once the Adventory
MCP is connected. Each is given in **English** and **Vietnamese (Tiếng Việt)**.
The assistant answers in the language you ask in.

This server is **read-only**: it can query and analyze your ads + inventory, but
it never changes data, sends messages, or places orders.

> Tip: ranges default to the **last 7 days** when you don't say a date. You can
> always say "this month", "yesterday", "1–15 May", etc.

---

## Getting started / orientation
*(tool: `adventory_capabilities`)*

1. **EN:** What can you see about my account — which ad platforms and branches are connected?
   **VI:** Bạn thấy được gì về tài khoản của tôi — những nền tảng quảng cáo và chi nhánh nào đang kết nối?

2. **EN:** Give me a quick health check of my business right now.
   **VI:** Cho tôi xem nhanh "sức khỏe" hoạt động kinh doanh hiện tại.

3. **EN:** What should I look at first today?
   **VI:** Hôm nay tôi nên xem việc gì trước tiên?

---

## Ads — overview & ROAS
*(tools: `ads_overview`, `ads_insights`)*

4. **EN:** How are my ads performing this week — total spend, revenue, and ROAS?
   **VI:** Tuần này quảng cáo chạy thế nào — tổng chi tiêu, doanh thu và ROAS?

5. **EN:** Which ad channel is giving me the best return right now?
   **VI:** Kênh quảng cáo nào đang cho hiệu quả tốt nhất hiện tại?

6. **EN:** Compare my TikTok, Facebook, and Shopee ad spend and ROAS for the last 30 days.
   **VI:** So sánh chi tiêu và ROAS quảng cáo TikTok, Facebook, Shopee trong 30 ngày qua.

7. **EN:** Are any campaigns losing money? Show me the worst offenders.
   **VI:** Có chiến dịch nào đang lỗ không? Cho tôi xem những cái tệ nhất.

8. **EN:** Any insights or warnings about my ads I should act on today?
   **VI:** Có cảnh báo hay phát hiện nào về quảng cáo mà hôm nay tôi nên xử lý không?

9. **EN:** Which campaigns are scaling well and worth more budget?
   **VI:** Chiến dịch nào đang scale tốt và đáng tăng ngân sách?

---

## Ads — campaigns & creatives
*(tools: `ads_campaigns`, `ads_creatives`)*

10. **EN:** List my top TikTok campaigns by spend this month.
    **VI:** Liệt kê các chiến dịch TikTok chi tiêu nhiều nhất tháng này.

11. **EN:** Show my Facebook campaigns with their ROAS and CTR.
    **VI:** Cho tôi xem các chiến dịch Facebook kèm ROAS và CTR.

12. **EN:** Which creatives have the highest CTR on TikTok?
    **VI:** Creative nào có CTR cao nhất trên TikTok?

13. **EN:** Are any creatives showing fatigue (CTR dropping while spend stays high)?
    **VI:** Có creative nào bị "bão hòa" không (CTR giảm trong khi chi tiêu vẫn cao)?

14. **EN:** Which Shopee campaigns spent money but got zero conversions?
    **VI:** Chiến dịch Shopee nào tiêu tiền nhưng không có chuyển đổi nào?

15. **EN:** Break down my Facebook ad-level performance for last week.
    **VI:** Phân tích hiệu suất theo từng quảng cáo Facebook trong tuần trước.

---

## Inventory & stock alerts
*(tools: `warehouse_branches`, `warehouse_alerts`)*

16. **EN:** Which products are out of stock or about to run out?
    **VI:** Sản phẩm nào đang hết hàng hoặc sắp hết?

17. **EN:** Show me all stock alerts across my branches.
    **VI:** Cho tôi xem tất cả cảnh báo tồn kho ở các chi nhánh.

18. **EN:** Do I have any overstocked items I should discount or transfer?
    **VI:** Có mặt hàng nào tồn quá nhiều cần giảm giá hoặc điều chuyển không?

19. **EN:** List my branches and warehouses.
    **VI:** Liệt kê các chi nhánh và kho của tôi.

20. **EN:** What stock problems does the main branch have right now?
    **VI:** Chi nhánh chính đang gặp những vấn đề tồn kho nào?

---

## Reordering & purchasing
*(tools: `warehouse_branches`, `reorder_suggestions`)*

21. **EN:** What should I reorder for my main branch this week?
    **VI:** Tuần này chi nhánh chính nên nhập lại những gì?

22. **EN:** Give me a suggested purchase list with quantities for each branch.
    **VI:** Cho tôi danh sách đề xuất nhập hàng kèm số lượng cho từng chi nhánh.

23. **EN:** Which fast-selling products are at risk of stocking out soon?
    **VI:** Sản phẩm bán chạy nào có nguy cơ hết hàng sớm?

---

## Production planning & materials
*(tools: `production_plan`, `production_materials`)*

24. **EN:** What's the current production plan for my factory branch?
    **VI:** Kế hoạch sản xuất hiện tại của chi nhánh nhà máy là gì?

25. **EN:** Do I have enough raw materials to run the planned production?
    **VI:** Tôi có đủ nguyên liệu để chạy kế hoạch sản xuất không?

26. **EN:** Which materials are short, and by how much, for the current plan?
    **VI:** Nguyên liệu nào đang thiếu và thiếu bao nhiêu cho kế hoạch hiện tại?

27. **EN:** Which finished products can't be made yet because of missing components?
    **VI:** Thành phẩm nào chưa sản xuất được vì thiếu thành phần?

---

## Sales, orders & revenue
*(tools: `warehouse_daily_sales`, `analytics_summary`, `analytics_by_platform`, `analytics_orders`)*

28. **EN:** How much did I sell today, by channel?
    **VI:** Hôm nay tôi bán được bao nhiêu, chia theo kênh?

29. **EN:** Give me a revenue and order summary for this month.
    **VI:** Cho tôi tổng hợp doanh thu và đơn hàng trong tháng này.

30. **EN:** Which sales platform is performing best over the last 30 days?
    **VI:** Nền tảng bán hàng nào hoạt động tốt nhất trong 30 ngày qua?

31. **EN:** Show me yesterday's sales compared with the day before.
    **VI:** Cho tôi xem doanh số hôm qua so với hôm kia.

32. **EN:** List my most recent orders that are still unpaid.
    **VI:** Liệt kê các đơn hàng gần đây vẫn chưa thanh toán.

33. **EN:** How is revenue trending week over week this month?
    **VI:** Doanh thu tháng này đang thay đổi thế nào theo từng tuần?

---

## Combined / cross-domain
*(the assistant chains several tools)*

34. **EN:** Give me a daily briefing: top ad issues, stock alerts, and what to reorder.
    **VI:** Cho tôi bản tóm tắt hằng ngày: vấn đề quảng cáo nổi bật, cảnh báo tồn kho và cần nhập gì.

35. **EN:** I'm spending a lot on ads for product X — do I even have enough stock to sell it?
    **VI:** Tôi đang chi nhiều quảng cáo cho sản phẩm X — liệu tôi có đủ hàng để bán không?

36. **EN:** Suggest 5 concrete actions for today based on my ads and inventory.
    **VI:** Đề xuất 5 việc cụ thể cần làm hôm nay dựa trên quảng cáo và tồn kho của tôi.
