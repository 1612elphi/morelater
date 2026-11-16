import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { MoreLaterAPI } from "./api.js";
import { registerResources } from "./resources.js";
import { registerTools } from "./tools.js";
import { registerPrompts } from "./prompts.js";

process.env.TZ = process.env.TZ ?? "Europe/Berlin";

const PORT = Number(process.env.MCP_PORT ?? 3001);
// Loopback only: clients come in through the app's /mcp, which checks the lock.
const HOST = process.env.MCP_HOST ?? "127.0.0.1";
const BASE_URL = process.env.MORELATER_API_URL ?? "http://localhost:3000";
const MAX_BODY = 4 << 20;

function createConfiguredServer(authorization?: string) {
  const server = new McpServer({ name: "morelater", version: "0.1.0" });
  const api = new MoreLaterAPI(BASE_URL, authorization);
  registerResources(server, api);
  registerTools(server, api);
  registerPrompts(server, api);
  return server;
}

function plain(res: ServerResponse, status: number, text: string) {
  res.writeHead(status, { "Content-Type": "text/plain" });
  res.end(text);
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "", `http://localhost:${PORT}`);
  if (url.pathname !== "/mcp") return plain(res, 404, "Not found");
  if (!["POST", "GET", "DELETE"].includes(req.method ?? "")) return plain(res, 405, "Method not allowed");

  let parsed: unknown;
  if (req.method === "POST") {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > MAX_BODY) return plain(res, 413, "Body too large");
    }
    try {
      parsed = JSON.parse(body);
    } catch {
      return plain(res, 400, "Invalid JSON");
    }
  }

  // stateless: one server and transport per request, released when it ends
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = createConfiguredServer(req.headers.authorization);
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, parsed);
}

const httpServer = createServer((req, res) => {
  // an unhandled rejection would take the whole process down
  handle(req, res).catch((err) => {
    console.error("MCP request failed:", err);
    if (!res.headersSent) plain(res, 500, "Internal error");
    else res.end();
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`MoreLater MCP server listening on http://${HOST}:${PORT}/mcp`);
});
