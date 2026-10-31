import { join } from "node:path";
import { SceneCache } from "../../core/src/cache/scene-cache.js";
import { StateManager } from "../../core/src/state/state-manager.js";
import {
  JSONRPCNotification,
  JSONRPCRequest,
  JSONRPCResponse,
  MCP_ERROR_CODES,
} from "./protocol/types.js";
import { StdioTransport, Transport } from "./protocol/transport.js";
import { ToolRegistry } from "./tools/registry.js";
import { ToolContext } from "./tools/tool.interface.js";

export interface MCPServerOptions {
  workDir?: string;
  transport?: Transport;
}

export class MCPServer {
  private transport: Transport;
  private workDir: string;
  private stateManager: StateManager;
  private cache: SceneCache;
  private registry: ToolRegistry;

  constructor(options: MCPServerOptions = {}) {
    this.workDir = options.workDir || process.cwd();
    this.transport = options.transport || new StdioTransport();

    const statePath = join(this.workDir, ".state", "project-state.json");
    const cacheDir = join(this.workDir, ".cache");

    this.stateManager = new StateManager(statePath);
    this.cache = new SceneCache(cacheDir);
    this.registry = new ToolRegistry();

    this.init();
  }

  private init(): void {
    this.transport.onMessage(async (msg) => this.handleMessage(msg));
  }

  public getContext(): ToolContext {
    return {
      workDir: this.workDir,
      stateManager: this.stateManager,
      cache: this.cache,
    };
  }

  public getRegistry(): ToolRegistry {
    return this.registry;
  }

  public async handleMessage(msg: JSONRPCRequest | JSONRPCNotification): Promise<JSONRPCResponse | null> {
    // If notification without ID, handle and return null
    const id = "id" in msg ? msg.id : null;

    try {
      switch (msg.method) {
        case "initialize": {
          return {
            jsonrpc: "2.0",
            id: id!,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: {},
              },
              serverInfo: {
                name: "reel-engine-mcp",
                version: "0.1.0",
              },
            },
          };
        }

        case "notifications/initialized": {
          // Notification from client; no response needed
          return null;
        }

        case "ping": {
          return {
            jsonrpc: "2.0",
            id: id!,
            result: {},
          };
        }

        case "tools/list": {
          const tools = this.registry.getAllDefinitions();
          return {
            jsonrpc: "2.0",
            id: id!,
            result: {
              tools,
            },
          };
        }

        case "tools/call": {
          const toolName = msg.params?.name;
          const toolArgs = msg.params?.arguments || {};

          if (!toolName) {
            return {
              jsonrpc: "2.0",
              id: id!,
              error: {
                code: MCP_ERROR_CODES.INVALID_PARAMS,
                message: "Missing tool name in tools/call request",
              },
            };
          }

          const envelope = await this.registry.execute(toolName, toolArgs, this.getContext());

          return {
            jsonrpc: "2.0",
            id: id!,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(envelope, null, 2),
                },
              ],
              isError: !envelope.success,
            },
          };
        }

        default: {
          if (id === null) return null; // Unhandled notification
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: MCP_ERROR_CODES.METHOD_NOT_FOUND,
              message: `Unknown method: ${msg.method}`,
            },
          };
        }
      }
    } catch (err: any) {
      if (id === null) return null;
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: MCP_ERROR_CODES.INTERNAL_ERROR,
          message: err?.message || "Internal server error",
        },
      };
    }
  }

  public start(): void {
    process.stderr.write(`[reel-engine-mcp] Server started in ${this.workDir}\n`);
  }

  public close(): void {
    this.transport.close();
  }
}
