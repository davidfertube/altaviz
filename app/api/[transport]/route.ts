import { createMcpHandler } from "mcp-handler";
import { TOOLS, runTool } from "@/lib/tools";

/**
 * The same tool registry that powers the in-app copilot, exposed as a Model
 * Context Protocol server over Streamable HTTP at /api/mcp. Media buyers can
 * drive the account from Claude Desktop, Claude Code, or Cursor — matching how
 * the It's Today team already works. Connection instructions are in the README
 * and on the landing page.
 */
const handler = createMcpHandler(
  (server) => {
    for (const t of TOOLS) {
      server.tool(t.name, t.description, t.schema.shape, async (args) => {
        const res = runTool(t.name, args);
        return {
          content: [{ type: "text" as const, text: res.content }],
          isError: res.isError,
        };
      });
    }
  },
  {
    serverInfo: { name: "altaviz", version: "1.0.0" },
  },
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: false,
  },
);

/**
 * Guard: only the stateless Streamable HTTP transport at /api/mcp is served.
 * Without this, a probe of /api/sse reaches mcp-handler's SSE path, which
 * requires Redis and would hang the invocation; malformed JSON bodies would
 * likewise hang instead of returning a parse error.
 */
function guarded(req: Request, ctx: { params: Promise<{ transport: string }> }) {
  return (async () => {
    const { transport } = await ctx.params;
    if (transport !== "mcp") {
      return Response.json(
        { error: "Not found. The MCP endpoint is /api/mcp (Streamable HTTP)." },
        { status: 404 },
      );
    }
    if (req.method === "POST") {
      try {
        await req.clone().json();
      } catch {
        return Response.json(
          {
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Parse error: request body is not valid JSON" },
          },
          { status: 400 },
        );
      }
    }
    return handler(req);
  })();
}

export { guarded as GET, guarded as POST, guarded as DELETE };
