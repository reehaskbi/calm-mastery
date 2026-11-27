// Tiny static server for the app (no dependencies).
// Run: node server.js   then open http://localhost:5173
// Add --lan to make it reachable from your phone on the same Wi-Fi.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "app");
const PORT = 5173;
const HOST = process.argv.includes("--lan") ? "0.0.0.0" : "127.0.0.1";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const file = path.normalize(path.join(ROOT, urlPath === "/" ? "index.html" : urlPath));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
}).listen(PORT, HOST, () => console.log(`Calm Mastery running at http://localhost:${PORT}`));
