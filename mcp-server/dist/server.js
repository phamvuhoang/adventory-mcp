import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { serializeToolError } from "./errors.js";
import { createTools } from "./tools.js";
export const VERSION = "0.1.0";
export function buildServer(client) {
    const tools = createTools(client);
    const server = new Server({ name: "adventory-mcp", version: VERSION }, { capabilities: { tools: {} } });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema }))
    }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const tool = tools.find((candidate) => candidate.name === request.params.name);
        if (!tool)
            throw new Error(`Unknown tool: ${request.params.name}`);
        try {
            const result = await tool.handler((request.params.arguments ?? {}));
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
        catch (error) {
            return { isError: true, content: [{ type: "text", text: JSON.stringify(serializeToolError(error), null, 2) }] };
        }
    });
    return { server, tools };
}
//# sourceMappingURL=server.js.map