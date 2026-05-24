export function defaultRange(now = new Date()) {
    const to = now.toISOString().slice(0, 10);
    const fromDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const from = fromDate.toISOString().slice(0, 10);
    return { from, to };
}
export function today(now = new Date()) {
    return now.toISOString().slice(0, 10);
}
//# sourceMappingURL=dates.js.map