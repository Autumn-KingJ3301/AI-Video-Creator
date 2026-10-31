import { describe, expect, it } from "vitest";
import { InMemoryTransport } from "../../packages/mcp-server/src/protocol/transport.js";
import { MCPServer } from "../../packages/mcp-server/src/server.js";

describe("MCP Protocol & Server Unit Tests", () => {
  it("should handle initialize handshake according to MCP specification 2024-11-05", async () => {
    const transport = new InMemoryTransport();
    const server = new MCPServer({ transport });

    const response = await transport.simulateClientMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "antigravity-test-client", version: "1.0.0" },
      },
    });

    expect(response).toBeDefined();
    expect(response?.id).toBe(1);
    expect(response?.result.protocolVersion).toBe("2024-11-05");
    expect(response?.result.serverInfo.name).toBe("reel-engine-mcp");
    expect(response?.result.capabilities).toHaveProperty("tools");
  });

  it("should respond to ping with empty object", async () => {
    const transport = new InMemoryTransport();
    const server = new MCPServer({ transport });

    const response = await transport.simulateClientMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "ping",
    });

    expect(response?.id).toBe(2);
    expect(response?.result).toEqual({});
  });

  it("should list all 10 registered tools on tools/list request", async () => {
    const transport = new InMemoryTransport();
    const server = new MCPServer({ transport });

    const response = await transport.simulateClientMessage({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/list",
    });

    expect(response?.id).toBe(3);
    const tools = response?.result.tools;
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBe(10);

    const toolNames = tools.map((t: any) => t.name);
    expect(toolNames).toContain("reel_init_project");
    expect(toolNames).toContain("reel_transcribe_audio");
    expect(toolNames).toContain("reel_plan_scenes");
    expect(toolNames).toContain("reel_lint_scene_ir");
    expect(toolNames).toContain("reel_author_scene");
    expect(toolNames).toContain("reel_render_scene");
    expect(toolNames).toContain("reel_verify_quality");
    expect(toolNames).toContain("reel_apply_edits");
    expect(toolNames).toContain("reel_compose_video");
    expect(toolNames).toContain("reel_get_state");
  });

  it("should return MethodNotFound error code -32601 on unknown methods", async () => {
    const transport = new InMemoryTransport();
    const server = new MCPServer({ transport });

    const response = await transport.simulateClientMessage({
      jsonrpc: "2.0",
      id: 99,
      method: "unsupported_unknown_method",
    });

    expect(response?.id).toBe(99);
    expect(response?.error?.code).toBe(-32601);
  });
});
