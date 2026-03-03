import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MoreLaterAPI } from "./api.js";
import { registerResources } from "./resources.js";
import { registerTools } from "./tools.js";
import { registerPrompts } from "./prompts.js";

const BASE_URL = process.env.MORELATER_API_URL ?? "http://localhost:3000";

const server = new McpServer({
  name: "morelater",
  version: "0.1.0",
});

const api = new MoreLaterAPI(BASE_URL);

registerResources(server, api);
registerTools(server, api);
registerPrompts(server, api);

const transport = new StdioServerTransport();
await server.connect(transport);
