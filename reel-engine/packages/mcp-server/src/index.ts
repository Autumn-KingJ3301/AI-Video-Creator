#!/usr/bin/env node
import { MCPServer } from "./server.js";
import { StdioTransport } from "./protocol/transport.js";

export * from "./protocol/index.js";
export * from "./tools/index.js";
export * from "./server.js";

// If invoked as a CLI executable directly
const isMain = import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/")) || process.argv[1]?.includes("mcp-server");

if (isMain) {
  const transport = new StdioTransport();
  const server = new MCPServer({
    workDir: process.cwd(),
    transport,
  });

  server.start();

  process.on("SIGINT", () => {
    server.close();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    server.close();
    process.exit(0);
  });
}
