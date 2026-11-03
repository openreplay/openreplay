import http from "node:http";
import fs from "node:fs";
import zlib from "node:zlib";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jquery = fs.readFileSync(require.resolve("jquery/dist/jquery.min.js"));
const helpers = fs.readFileSync(new URL("./helpers.js", import.meta.url));

const page = (head = "", body = "") =>
  `<!doctype html><html><head><meta charset="utf-8">${head}</head><body>${body}` +
  `<script src="/np.js"></script><script src="/helpers.js"></script></body></html>`;

/** Fixture server: the bundle under /np.js, pages, and endpoints the cases call. */
export function startServer(bundle) {
  const closed = new Map();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const send = (status, type, body, extra = {}) => {
      res.writeHead(status, { "content-type": type, "content-length": Buffer.byteLength(body), ...extra });
      res.end(body);
    };
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString();
      switch (url.pathname) {
        case "/":
          return send(200, "text/html", page("", url.searchParams.has("jquery") ? '<script src="/jquery.js"></script>' : ""));
        case "/base/deep/page":
          return send(200, "text/html", page('<base href="/app/">'));
        case "/frame/inner.html":
          return send(200, "text/html", "<!doctype html><html><body>frame</body></html>");
        case "/np.js":
          return send(200, "text/javascript", bundle);
        case "/helpers.js":
          return send(200, "text/javascript", helpers);
        case "/jquery.js":
          return send(200, "text/javascript", jquery);
        case "/echo": {
          let json;
          try {
            json = JSON.parse(body);
          } catch {}
          return send(200, "application/json", JSON.stringify({ method: req.method, url: req.url, headers: req.headers, body, json }));
        }
        case "/json": {
          const json = JSON.stringify({ data: "x".repeat(Number(url.searchParams.get("kb") || 1) * 1024) });
          if (url.searchParams.has("chunked")) {
            res.writeHead(200, { "content-type": "application/json" });
            return res.end(json);
          }
          if (url.searchParams.has("gzip")) {
            const gz = zlib.gzipSync(json);
            res.writeHead(200, { "content-type": "application/json", "content-encoding": "gzip", "content-length": gz.length });
            return res.end(gz);
          }
          return send(200, "application/json", json);
        }
        case "/utf8":
          return send(200, "text/plain; charset=utf-8", "héllo wörld ✓ 日本");
        case "/slow":
          return setTimeout(() => !res.destroyed && send(200, "application/json", "{}"), 1500);
        case "/slow-body":
          res.writeHead(200, { "content-type": "application/json" });
          res.flushHeaders();
          return setTimeout(() => res.end('{"ok":true}'), 400);
        case "/trickle": {
          const id = url.searchParams.get("id");
          res.writeHead(200, { "content-type": "text/plain" });
          res.flushHeaders();
          const timer = setInterval(() => res.write("tick\n"), 100);
          res.on("close", () => {
            clearInterval(timer);
            closed.set(id, true);
          });
          return;
        }
        case "/trickle-status":
          return send(200, "application/json", JSON.stringify({ closed: closed.has(url.searchParams.get("id")) }));
        case "/graphql": {
          const mode = url.searchParams.get("mode");
          if (mode === "502") return send(502, "text/html", "<html>Bad gateway</html>");
          if (mode === "err") return send(200, "application/json", '{"errors":[{"message":"bad"}],"data":null}');
          return send(200, "application/json", '{"data":{"bio":"no errors here"}}');
        }
        case "/beacon":
          res.writeHead(204);
          return res.end();
        default:
          return send(404, "text/plain", "not found");
      }
    });
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve({ origin: `http://127.0.0.1:${server.address().port}`, close: () => server.close() })),
  );
}
