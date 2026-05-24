#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createAdventoryClient } from "./client.js";
import { buildServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = createAdventoryClient(config);
  const { server, tools } = buildServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[adventory-mcp] Server started. Tools: ${tools.map((t) => t.name).join(", ")}`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);
if (invokedPath === modulePath) {
  main().catch((error) => {
    console.error(`[adventory-mcp] startup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
