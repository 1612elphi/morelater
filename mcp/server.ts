import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { MoreLaterAPI } from "./api.js";
import { registerResources } from "./resources.js";
import { registerTools } from "./tools.js";
import { registerPrompts } from "./prompts.js";

const PORT = Number(process.env.MCP_PORT ?? 3001);
const BASE_URL = process.env.MORELATER_API_URL ?? "http://localhost:3000";

function createConfiguredServer() {
  const server = new McpServer({ name: "morelater", version: "0.1.0" });
  const api = new MoreLaterAPI(BASE_URL);
  registerResources(server, api);
  registerTools(server, api);
  registerPrompts(server, api);
  return server;
}

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "", `http://localhost:${PORT}`);

  if (url.pathname !== "/mcp") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createConfiguredServer();
  await server.connect(transport);

  if (req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    await transport.handleRequest(req, res, JSON.parse(body));
  } else if (req.method === "GET" || req.method === "DELETE") {
    await transport.handleRequest(req, res);
  } else {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method not allowed");
  }
});

httpServer.listen(PORT, () => {
  console.log(`MoreLater MCP server listening on http://localhost:${PORT}/mcp`);
});
