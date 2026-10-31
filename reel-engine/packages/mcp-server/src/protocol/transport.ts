import { JSONRPCNotification, JSONRPCRequest, JSONRPCResponse } from "./types.js";

export type MessageHandler = (message: JSONRPCRequest | JSONRPCNotification) => Promise<JSONRPCResponse | null>;

export interface Transport {
  onMessage(handler: MessageHandler): void;
  send(response: JSONRPCResponse): void;
  close(): void;
}

/**
 * Standard Stdio Transport for MCP:
 * Reads line-delimited or Content-Length framed JSON-RPC messages from stdin.
 * Writes JSON-RPC responses to stdout with newline terminator.
 * Diagnostic logs are directed to stderr to keep stdout pristine.
 */
export class StdioTransport implements Transport {
  private handler: MessageHandler | null = null;
  private buffer: string = "";
  private stdin: NodeJS.ReadableStream;
  private stdout: NodeJS.WritableStream;

  constructor(stdin: NodeJS.ReadableStream = process.stdin, stdout: NodeJS.WritableStream = process.stdout) {
    this.stdin = stdin;
    this.stdout = stdout;
    this.init();
  }

  public onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  private init(): void {
    this.stdin.setEncoding("utf-8");
    this.stdin.on("data", (chunk: string) => {
      this.buffer += chunk;
      this.processBuffer();
    });
  }

  private processBuffer(): void {
    // Process line-delimited JSON or Content-Length framed messages
    while (true) {
      // Check for Content-Length framing
      if (this.buffer.startsWith("Content-Length:")) {
        const headerEnd = this.buffer.indexOf("\r\n\r\n");
        if (headerEnd === -1) break;

        const headerLine = this.buffer.substring(0, headerEnd);
        const match = headerLine.match(/Content-Length:\s*(\d+)/i);
        if (!match) {
          this.buffer = this.buffer.substring(headerEnd + 4);
          continue;
        }

        const contentLength = parseInt(match[1], 10);
        const bodyStart = headerEnd + 4;
        if (this.buffer.length < bodyStart + contentLength) {
          break; // Incomplete body
        }

        const body = this.buffer.substring(bodyStart, bodyStart + contentLength);
        this.buffer = this.buffer.substring(bodyStart + contentLength);
        this.dispatchRaw(body);
      } else {
        // Line-delimited JSON
        const newlineIdx = this.buffer.indexOf("\n");
        if (newlineIdx === -1) break;

        const line = this.buffer.substring(0, newlineIdx).trim();
        this.buffer = this.buffer.substring(newlineIdx + 1);

        if (line.length > 0) {
          this.dispatchRaw(line);
        }
      }
    }
  }

  private async dispatchRaw(raw: string): Promise<void> {
    try {
      const parsed = JSON.parse(raw);
      if (this.handler) {
        const response = await this.handler(parsed);
        if (response) {
          this.send(response);
        }
      }
    } catch (err: any) {
      process.stderr.write(`[MCP Transport Error] Failed to parse message: ${err?.message || err}\n`);
    }
  }

  public send(response: JSONRPCResponse): void {
    const raw = JSON.stringify(response);
    this.stdout.write(raw + "\n");
  }

  public close(): void {
    // No-op or cleanup
  }
}

/**
 * In-memory Transport for fast, isolated unit and integration testing.
 */
export class InMemoryTransport implements Transport {
  private handler: MessageHandler | null = null;
  public sentResponses: JSONRPCResponse[] = [];

  public onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  public async simulateClientMessage(message: JSONRPCRequest | JSONRPCNotification): Promise<JSONRPCResponse | null> {
    if (!this.handler) {
      throw new Error("No message handler registered on InMemoryTransport");
    }
    const response = await this.handler(message);
    if (response) {
      this.sentResponses.push(response);
    }
    return response;
  }

  public send(response: JSONRPCResponse): void {
    this.sentResponses.push(response);
  }

  public close(): void {
    this.sentResponses = [];
  }
}
