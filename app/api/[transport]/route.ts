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

export { handler as GET, handler as POST, handler as DELETE };
