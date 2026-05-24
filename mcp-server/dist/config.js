const DEFAULT_API_BASE_URL = "https://dashboard-api.clipoox.com";
const DEFAULT_TIMEOUT_MS = 30000;
function read(env, name) {
    const value = env[name];
    if (value === undefined)
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function readRequired(env, name, hint) {
    const value = read(env, name);
    if (!value)
        throw new Error(`${name} is not set. ${hint}`);
    return value;
}
export function loadConfig(env = process.env) {
    return {
        apiKey: readRequired(env, "ADVENTORY_API_KEY", "Mint a key in the Adventory dashboard (MCP / API access)."),
        apiBaseUrl: (read(env, "ADVENTORY_API_BASE_URL") ?? DEFAULT_API_BASE_URL).replace(/\/+$/, ""),
        timeoutMs: Number(read(env, "ADVENTORY_TIMEOUT_MS") ?? DEFAULT_TIMEOUT_MS)
    };
}
//# sourceMappingURL=config.js.map