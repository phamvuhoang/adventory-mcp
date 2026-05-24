# Adventory MCP Server

A read-only Model Context Protocol (MCP) server that gives Claude access to a tenant's Adventory analytics data — ad performance across TikTok Ads, Facebook, and Shopee, plus warehouse intelligence (inventory alerts, reorder suggestions, production plans, BOM material shortfalls, and order analytics).

The server is a thin client: it forwards GET requests to the Adventory backend API with your API key, formats errors into helpful Vietnamese messages, and returns JSON responses as tool results. All analytics and computations happen on the backend; the MCP server does no heavy lifting of its own.

---

## Tools (14, read-only)

### Ads Analytics (5 tools)

| Tool | What it does |
|---|---|
| `ads_overview` | Total spend, revenue, ROAS across all connected ad platforms |
| `ads_insights` | Rule-based findings: losing-money campaigns, zero-conversion, scaling wins, creative fatigue |
| `ads_campaigns` | Campaign list and metrics for one platform (TikTok Ads / Facebook / Shopee) |
| `ads_creatives` | Creative/ad list and metrics for one platform |

### Warehouse & Inventory (6 tools)

| Tool | What it does |
|---|---|
| `warehouse_branches` | Branch and warehouse list with codes and configuration |
| `warehouse_alerts` | Pre-computed stock alerts (out-of-stock, low-stock, overstock) |
| `warehouse_daily_sales` | Sales by channel for a given day |
| `reorder_suggestions` | Pre-computed reorder and transfer suggestions for a branch |
| `production_plan` | Current production plan for a factory branch |
| `production_materials` | BOM-derived material shortfalls for a production plan |

### Orders & Analytics (3 tools)

| Tool | What it does |
|---|---|
| `analytics_summary` | Aggregated order count and revenue for a date range |
| `analytics_by_platform` | Revenue and orders broken down by platform |
| `analytics_orders` | Paginated order list with platform and status filters |

### Discovery (1 tool)

| Tool | What it does |
|---|---|
| `adventory_capabilities` | Lists the tenant profile and all connected platform integrations — call this first to orient |

---

## Configuration

Two environment variables are recognised:

| Variable | Required | Default | Description |
|---|---|---|---|
| `ADVENTORY_API_KEY` | Yes | — | Bearer token minted in the Adventory web dashboard (see below) |
| `ADVENTORY_API_BASE_URL` | No | `https://dashboard-api.clipoox.com` | Override to point at a self-hosted or staging backend |

An optional third variable `ADVENTORY_TIMEOUT_MS` (default `30000`) sets the per-request timeout in milliseconds.

---

## Local Install, Build, and Run

Node.js 20 or later is required.

```bash
cd adventory-mcp/mcp-server
npm install
npm run build          # compiles TypeScript → dist/
npm start              # runs dist/stdio.js via stdio transport
```

To verify the build works before wiring it into Claude:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | ADVENTORY_API_KEY=adv_live_... node dist/stdio.js
```

---

## Claude / Codex Config

Add the server to your MCP client config (e.g. `~/.claude/mcp.json` or your project's `.mcp.json`):

```json
{
  "mcpServers": {
    "adventory": {
      "command": "node",
      "args": ["/absolute/path/to/Adventory/adventory-mcp/mcp-server/dist/stdio.js"],
      "env": {
        "ADVENTORY_API_KEY": "adv_live_...",
        "ADVENTORY_API_BASE_URL": "https://dashboard-api.clipoox.com"
      }
    }
  }
}
```

Replace `/absolute/path/to/Adventory` with the actual path on your machine. The `ADVENTORY_API_BASE_URL` line can be omitted if you are using the production backend.

---

## Getting an API Key

1. Open the Adventory web dashboard at [dashboard.clipoox.com](https://dashboard.clipoox.com).
2. Navigate to **Settings → MCP / API access**.
3. Click **Mint new key**.
4. Copy the key (it is shown only once) and set it as `ADVENTORY_API_KEY` in your MCP config.

Keys can be revoked from the same page at any time. If the MCP server returns a 401 error, the key has expired or been revoked — mint a new one.

---

## Hosted Remote Version

A hosted remote MCP endpoint (no local build required) is planned for Phase 2. Until then, run the server locally as described above.
