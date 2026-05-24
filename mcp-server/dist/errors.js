export class AdventoryError extends Error {
    data;
    constructor(message, data) {
        super(message);
        this.data = data;
    }
}
export function mapHttpError(status, body) {
    const detail = messageFromBody(body);
    if (status === 401)
        return new AdventoryError("API key không hợp lệ hoặc đã bị thu hồi. Hãy tạo key mới trong dashboard (mục MCP / API access).", { code: "unauthorized", http_status: 401 });
    if (status === 403)
        return new AdventoryError("Tài khoản chưa gắn với gian hàng nào hoặc không có quyền đọc dữ liệu này.", { code: "forbidden", http_status: 403 });
    if (status === 404)
        return new AdventoryError("Không tìm thấy dữ liệu cho yêu cầu này.", { code: "not_found", http_status: 404 });
    if (status === 429)
        return new AdventoryError("Hệ thống đang giới hạn request. Hãy thu hẹp khoảng ngày hoặc thử lại sau.", { code: "rate_limited", http_status: 429 });
    return new AdventoryError(detail ?? "Adventory API tạm thời không phản hồi. Thử lại sau ít phút.", { code: "api_error", http_status: status });
}
export function serializeToolError(error) {
    if (error instanceof AdventoryError)
        return { error: error.name || "AdventoryError", message: error.message, data: error.data };
    if (error instanceof Error)
        return { error: error.name || "Error", message: error.message };
    return { error: "Error", message: String(error) };
}
function messageFromBody(body) {
    if (!body || typeof body !== "object")
        return undefined;
    const record = body;
    for (const key of ["detail", "message", "error"]) {
        const value = record[key];
        if (typeof value === "string" && value.trim())
            return value;
    }
    return undefined;
}
//# sourceMappingURL=errors.js.map