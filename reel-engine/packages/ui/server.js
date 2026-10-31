import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.resolve(__dirname, "../..");

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // API endpoint for live state
  if (pathname === "/api/state") {
    const statePath = path.join(ROOT_DIR, ".state", "project-state.json");
    if (fs.existsSync(statePath)) {
      const data = fs.readFileSync(statePath, "utf-8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(data);
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ phase: "input", state: "empty" }));
    }
    return;
  }

  // Serve preview video
  if (pathname === "/preview.mp4") {
    const candidatePaths = [
      path.join(ROOT_DIR, "fixtures/hybrid-30s-corsela/.test_run/out/hybrid-30s-corsela.mp4"),
      path.join(ROOT_DIR, "fixtures/quick-tip-15s/.test_run/out/quick-tip-15s.mp4"),
    ];

    let videoPath = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        videoPath = p;
        break;
      }
    }

    if (videoPath) {
      const stat = fs.statSync(videoPath);
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Length": stat.size,
      });
      fs.createReadStream(videoPath).pipe(res);
      return;
    }
  }

  // Serve main HTML app
  const htmlPath = path.join(__dirname, "index.html");
  if (fs.existsSync(htmlPath)) {
    const content = fs.readFileSync(htmlPath, "utf-8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(content);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`[Reel Engine Studio] UI running at http://localhost:${PORT}`);
});
