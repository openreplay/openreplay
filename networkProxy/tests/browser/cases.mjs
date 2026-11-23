/* global h, NP, $ */
// `run` executes in the page (helpers.js is loaded there); `expect` gets its result and returns true or a reason.

const ok = (cond, reason) => (cond ? true : reason);

export const cases = [
  {
    id: "xhr-handler-null",
    title: "jQuery $.ajax().abort() (sets xhr.onabort = null) throws nothing",
    page: "/?jquery",
    async run() {
      const s = h.setup();
      const jq = $.ajax({ url: "/slow" });
      await h.sleep(50);
      jq.abort();
      await h.until(() => s.msgs.length > 0);
      await h.sleep(100);
      return { errors: s.errors, msgs: s.msgs.map((m) => m.status) };
    },
    expect: (r) => ok(r.errors.length === 0 && r.msgs.length === 1, `errors ${JSON.stringify(r.errors)}, msgs ${r.msgs}`),
  },
  {
    id: "fetch-network-error",
    title: "fetch network errors (CORS, refused) are recorded with status 0",
    async run() {
      const s = h.setup();
      const cross = location.origin.replace("127.0.0.1", "localhost") + "/echo";
      const a = await fetch(cross).then(() => "ok", (e) => e.name);
      const b = await fetch("http://127.0.0.1:9/").then(() => "ok", (e) => e.name);
      await h.sleep(200);
      return { a, b, msgs: s.msgs.map((m) => [m.url, m.status]) };
    },
    expect: (r) =>
      ok(r.a === "TypeError" && r.b === "TypeError" && r.msgs.length === 2 && r.msgs.every(([, s]) => s === 0), JSON.stringify(r)),
  },
  {
    id: "fetch-relative-http-path",
    title: "fetch('http-status/200') reaches the network like native",
    async run() {
      const s = h.setup();
      let sync = null;
      let p;
      try {
        p = fetch("http-status/200");
      } catch (e) {
        sync = e.message;
      }
      const status = p && (await p.then((r) => r.status, (e) => "rejected " + e.message));
      await h.until(() => s.msgs.length > 0);
      return { sync, status, url: s.msgs[0]?.url };
    },
    expect: (r) => ok(r.sync === null && r.status === 404 && r.url?.endsWith("/http-status/200"), JSON.stringify(r)),
  },
  {
    id: "fetch-invalid-url",
    title: "fetch('http://[') rejects like native instead of throwing",
    async run() {
      h.setup();
      let sync = null;
      let p;
      try {
        p = fetch("http://[");
      } catch (e) {
        sync = e.message;
      }
      const res = p && (await p.then(() => "resolved", (e) => e.name));
      return { sync, res };
    },
    expect: (r) => ok(r.sync === null && r.res === "TypeError", JSON.stringify(r)),
  },
  {
    id: "beacon-url-object",
    title: "sendBeacon(new URL(...)) works and is recorded",
    async run() {
      const s = h.setup();
      let err = null;
      let sent;
      try {
        sent = navigator.sendBeacon(new URL("/beacon", location.href), "x");
      } catch (e) {
        err = e.message;
      }
      return { err, sent, url: s.msgs[0]?.url };
    },
    expect: (r) => ok(r.err === null && r.sent === true && r.url?.endsWith("/beacon"), JSON.stringify(r)),
  },
  {
    id: "fetch-consumed-body",
    title: "a fetch wrapper below that consumed the body doesn't make the app's fetch reject",
    async run() {
      const native = window.fetch;
      window.fetch = async (...a) => {
        const r = await native(...a);
        await r.text();
        return r;
      };
      const s = h.setup();
      const res = await fetch("/json").then((r) => "resolved " + r.status, (e) => "rejected " + e.message);
      await h.until(() => s.msgs.length > 0, 1000);
      return { res, msgs: s.msgs.length };
    },
    expect: (r) => ok(r.res === "resolved 200" && r.msgs === 1, JSON.stringify(r)),
  },
  {
    id: "fetch-response-like",
    title: "a Response-like object from a wrapper below is passed through",
    async run() {
      window.fetch = async () => ({ ok: true, status: 200, json: async () => ({ a: 1 }) });
      const s = h.setup();
      const res = await fetch("/json").then((r) => r.json()).then((j) => "resolved " + j.a, (e) => "rejected " + e.message);
      await h.sleep(100);
      return { res, errors: s.errors };
    },
    expect: (r) => ok(r.res === "resolved 1" && r.errors.length === 0, JSON.stringify(r)),
  },
  {
    id: "sanitizer-throws",
    title: "a throwing sanitizer doesn't surface as a page error",
    async run() {
      const s = h.setup({ sanitize: () => { throw new Error("boom"); } });
      await h.xhr("GET", "/echo");
      const f = await fetch("/echo").then((r) => r.status, () => "rejected");
      navigator.sendBeacon("/beacon", "x");
      await h.sleep(100);
      return { errors: s.errors, f };
    },
    expect: (r) => ok(r.errors.length === 0 && r.f === 200, JSON.stringify(r)),
  },
  {
    id: "xhr-abort-after-done",
    title: "an XHR aborted from its own onload (after DONE) is still recorded",
    async run() {
      const s = h.setup();
      const x = new XMLHttpRequest();
      x.onload = () => x.abort();
      x.open("GET", "/echo");
      x.send();
      await h.sleep(300);
      return { msgs: s.msgs.map((m) => m.status), readyState: x.readyState };
    },
    expect: (r) => ok(r.msgs.length === 1 && r.msgs[0] === 200, JSON.stringify(r)),
  },
  {
    id: "fetch-signal-listeners",
    title: "fetch removes its abort listener from a long-lived signal",
    async run() {
      h.setup();
      const sig = new AbortController().signal;
      let added = 0;
      let removed = 0;
      const add = sig.addEventListener;
      const rem = sig.removeEventListener;
      sig.addEventListener = function (...a) { added++; return add.apply(this, a); };
      sig.removeEventListener = function (...a) { removed++; return rem.apply(this, a); };
      for (let i = 0; i < 20; i++) await (await fetch("/echo", { signal: sig })).text();
      await h.sleep(100);
      return { added, removed };
    },
    expect: (r) => ok(r.added === r.removed, JSON.stringify(r)),
  },
  {
    id: "graphql-status",
    title: "graphql keeps HTTP errors and flags only a real errors array",
    async run() {
      const s = h.setup();
      for (const mode of ["502", "text", "err"]) {
        await fetch("/graphql?mode=" + mode, { method: "POST", headers: { "content-type": "application/json" }, body: '{"query":"{a}"}' }).then((r) => r.text());
      }
      await h.until(() => s.msgs.length >= 3);
      return s.msgs.map((m) => [m.url.split("mode=")[1], m.status]);
    },
    expect: (r) => ok(JSON.stringify(r) === JSON.stringify([["502", 502], ["text", 200], ["err", 400]]), JSON.stringify(r)),
  },
  {
    id: "privacy-masking",
    title: "nested and camelCase sensitive fields are masked, token counts kept",
    async run() {
      const s = h.setup();
      const body = { token: { access: "abc" }, password: ["p1"], accessToken: "zzz", refresh_token: "r", client_secret: "s", newPassword: "n", max_tokens: 1000, name: "bob" };
      await fetch("/echo", { method: "POST", headers: { "content-type": "application/json", "X-Auth-Token": "hdr" }, body: JSON.stringify(body) }).then((r) => r.text());
      await h.until(() => s.msgs.length > 0);
      const m = h.parse(s.msgs[0]);
      return { req: JSON.parse(m.request.body), headers: m.request.headers, res: JSON.parse(m.response.body).json };
    },
    expect: (r) => {
      const leaks = [];
      for (const [where, b] of [["request", r.req], ["response", r.res]]) {
        if (b.token.access === "abc") leaks.push(where + " token.access");
        if (b.password[0] === "p1") leaks.push(where + " password[0]");
        for (const k of ["accessToken", "refresh_token", "client_secret", "newPassword"]) if (/^[a-z]+$/.test(b[k]) && b[k] !== "*".repeat(b[k].length)) leaks.push(where + " " + k);
        if (b.max_tokens !== 1000 || b.name !== "bob") leaks.push(where + " over-masked");
      }
      if (r.headers["X-Auth-Token"] === "hdr") leaks.push("X-Auth-Token header");
      return ok(leaks.length === 0, leaks.join(", "));
    },
  },
  {
    id: "capture-body-off",
    title: "captureBody: false keeps bodies out of messages and still records decoded sizes",
    async run() {
      const s = h.setupWith({ captureBody: false });
      const expected = JSON.stringify({ data: "x".repeat(64 * 1024) }).length;
      for (const q of ["", "&chunked", "&gzip"]) await fetch("/json?kb=64" + q).then((r) => r.json());
      for (const q of ["&chunked", "&gzip"]) await h.xhr("GET", "/json?kb=64" + q);
      await h.xhr("POST", "/echo", { body: '{"a":1}' });
      await h.until(() => s.msgs.length >= 6);
      const parsed = s.msgs.map(h.parse);
      const xhr = parsed.find((m) => m.method === "POST");
      const sizes = parsed.filter((m) => m.method === "GET").map((m) => [m.url.split("?")[1], m.requestType, m.responseSize]);
      return { expected, msgs: s.msgs.length, responseBodies: parsed.filter((m) => m.response.body).length, xhrBody: xhr.request.body ?? null, sizes };
    },
    expect: (r) =>
      ok(r.msgs === 6 && r.responseBodies === 0 && r.xhrBody === null && r.sizes.length === 5 && r.sizes.every(([, , s]) => s === r.expected), JSON.stringify(r)),
  },
  {
    id: "perf-bodies-dropped-by-sanitize",
    title: "[bench] 40 × 512KB JSON, bodies deleted in sanitize (tracker default today)",
    bench: true,
    async run() {
      const s = h.setup({ sanitize: (d) => { delete d.request.body; delete d.response.body; return d; } });
      const t = performance.now();
      await Promise.all(Array.from({ length: 40 }, () => fetch("/json?kb=512").then((r) => r.json())));
      await h.until(() => s.msgs.length >= 40, 10000);
      return { msgs: s.msgs.length, ms: Math.round(performance.now() - t) };
    },
    expect: (r) => ok(r.msgs === 40, JSON.stringify(r)),
  },
  {
    id: "perf-capture-body-off",
    title: "[bench] 40 × 512KB JSON, captureBody: false",
    bench: true,
    async run() {
      const s = h.setupWith({ captureBody: false });
      const t = performance.now();
      await Promise.all(Array.from({ length: 40 }, () => fetch("/json?kb=512").then((r) => r.json())));
      await h.until(() => s.msgs.length >= 40, 10000);
      return { msgs: s.msgs.length, ms: Math.round(performance.now() - t) };
    },
    expect: (r) => ok(r.msgs === 40, JSON.stringify(r)),
  },
  {
    id: "perf-xhr-bodies-dropped-by-sanitize",
    title: "[bench] 40 × 512KB JSON over XHR, bodies deleted in sanitize (tracker default today)",
    bench: true,
    async run() {
      const s = h.setup({ sanitize: (d) => { delete d.request.body; delete d.response.body; return d; } });
      const t = performance.now();
      await Promise.all(Array.from({ length: 40 }, () => h.xhr("GET", "/json?kb=512&chunked")));
      await h.until(() => s.msgs.length >= 40, 10000);
      return { msgs: s.msgs.length, ms: Math.round(performance.now() - t) };
    },
    expect: (r) => ok(r.msgs === 40, JSON.stringify(r)),
  },
  {
    id: "perf-xhr-capture-body-off",
    title: "[bench] 40 × 512KB JSON over XHR, captureBody: false",
    bench: true,
    async run() {
      const s = h.setupWith({ captureBody: false });
      const t = performance.now();
      await Promise.all(Array.from({ length: 40 }, () => h.xhr("GET", "/json?kb=512&chunked")));
      await h.until(() => s.msgs.length >= 40, 10000);
      return { msgs: s.msgs.length, ms: Math.round(performance.now() - t) };
    },
    expect: (r) => ok(r.msgs === 40, JSON.stringify(r)),
  },
  {
    id: "xhr-token-once",
    title: "reading xhr.send twice sends the session token once",
    async run() {
      h.setup({ token: (cb) => cb("X-OpenReplay-SessionToken", "t") });
      const x = await h.xhr("GET", "/echo", {
        setup: (x) => { void x.send; },
      });
      return { echoed: JSON.parse(x.responseText).headers["x-openreplay-sessiontoken"] };
    },
    expect: (r) => ok(r.echoed === "t", JSON.stringify(r)),
  },
  {
    id: "fetch-base-href",
    title: "fetch resolves relative URLs against <base href> like the browser",
    page: "/base/deep/page",
    async run() {
      const s = h.setup();
      const r = await fetch("api/x");
      await h.until(() => s.msgs.length > 0);
      return { actual: r.url, recorded: s.msgs[0]?.url };
    },
    expect: (r) => ok(r.actual === r.recorded, JSON.stringify(r)),
  },
  {
    id: "xhr-absolute-url",
    title: "XHR records absolute URLs and tokenUrlMatcher sees them",
    async run() {
      const seen = [];
      const s = h.setup({ token: (cb) => cb("X-T", "t"), tokenUrlMatcher: (u) => (seen.push(u), u.startsWith(location.origin + "/")) });
      const x = await h.xhr("GET", "/echo");
      return { origin: location.origin, recorded: s.msgs[0]?.url, seen, sent: JSON.parse(x.responseText).headers["x-t"] };
    },
    expect: (r) => ok(r.recorded === r.origin + "/echo" && r.seen[0] === r.origin + "/echo" && r.sent === "t", JSON.stringify(r)),
  },
  {
    id: "iframe-relative-urls",
    title: "beacon and XHR inside an iframe resolve against the iframe",
    async run() {
      const f = document.createElement("iframe");
      f.src = "/frame/inner.html";
      document.body.append(f);
      await new Promise((r) => (f.onload = r));
      const w = f.contentWindow;
      const s = h.setup({ context: w });
      w.navigator.sendBeacon("b", "x");
      await h.xhr("GET", "x", { Ctor: w.XMLHttpRequest });
      return { origin: location.origin, urls: s.msgs.map((m) => m.url) };
    },
    expect: (r) => ok(JSON.stringify(r.urls) === JSON.stringify([r.origin + "/frame/b", r.origin + "/frame/x"]), JSON.stringify(r)),
  },
  {
    id: "xhr-subclass",
    title: "subclasses of the proxied XMLHttpRequest keep their prototype",
    async run() {
      const s = h.setup();
      class X extends XMLHttpRequest {
        hi() { return "hi"; }
      }
      const x = new X();
      const hi = typeof x.hi === "function" ? x.hi() : null;
      await h.xhr("GET", "/echo", { Ctor: X });
      return { hi, isX: x instanceof X, isXHR: x instanceof XMLHttpRequest, msgs: s.msgs.length };
    },
    expect: (r) => ok(r.hi === "hi" && r.isX && r.isXHR && r.msgs === 1, JSON.stringify(r)),
  },
  {
    id: "xhr-subclass-private",
    title: "a subclass with #private fields, super calls and its own this.setRequestHeader works and is recorded",
    async run() {
      const s = h.setup({ token: (cb) => cb("X-T", "t") });
      class X extends XMLHttpRequest {
        #n = 0;
        open(...a) { this.#n++; return super.open(...a); }
        send(b) { this.setRequestHeader("X-Sub", String(this.#n)); return super.send(b); }
        get count() { return this.#n; }
      }
      let err = null;
      let x;
      try { x = await h.xhr("POST", "/echo?sub", { Ctor: X, body: "b=1" }); } catch (e) { err = String(e); }
      await h.sleep(50);
      const echo = x && JSON.parse(x.responseText);
      const m = s.msgs[0] && h.parse(s.msgs[0]);
      return { err, count: x?.count, sent: echo && [echo.headers["x-sub"], echo.headers["x-t"]], n: s.msgs.length, header: m?.request.headers["X-Sub"], body: m?.request.body };
    },
    expect: (r) => ok(!r.err && r.count === 1 && JSON.stringify(r.sent) === '["1","t"]' && r.n === 1 && r.header === "1" && r.body === "b=1", JSON.stringify(r)),
  },
  {
    id: "xhr-subclass-stacked",
    title: "a subclass over two stacked copies or a foreign proxy below works and every layer records once",
    async run() {
      const code = await (await fetch("/np.js")).text();
      (0, eval)(code.replace(/^var NP\b/m, "var NP2"));
      const inner = [];
      NP2.default(window, { sendMessage: (m) => inner.push(m.url.replace(location.origin, "")) });
      const s = h.setup();
      class X extends XMLHttpRequest { #n = 0; open(...a) { this.#n++; return super.open(...a); } }
      const errors = [];
      try { await h.xhr("GET", "/echo?sub-stacked", { Ctor: X }); } catch (e) { errors.push(String(e)); }
      s.restore();
      const N = window.XMLHttpRequest;
      window.XMLHttpRequest = new Proxy(N, {
        construct(t, a, nt) {
          const x = Reflect.construct(t, a, nt);
          return new Proxy(x, { get: (t2, k) => { const v = Reflect.get(t2, k); return typeof v === "function" ? v.bind(t2) : v; }, set: (t2, k, v) => Reflect.set(t2, k, v) });
        },
      });
      const s2 = h.setup();
      class Y extends XMLHttpRequest {}
      try { await h.xhr("GET", "/echo?sub-foreign", { Ctor: Y }); } catch (e) { errors.push(String(e)); }
      await h.sleep(50);
      return { errors, outer: s.msgs.map((m) => m.url.replace(location.origin, "")), inner, foreign: s2.msgs.map((m) => m.url.replace(location.origin, "")) };
    },
    expect: (r) => ok(!r.errors.length && JSON.stringify(r.outer) === '["/echo?sub-stacked"]' && r.inner[0] === "/echo?sub-stacked" && JSON.stringify(r.foreign) === '["/echo?sub-foreign"]', JSON.stringify(r)),
  },
  {
    id: "xhr-global-subclass",
    title: "a library replacing XMLHttpRequest with a subclass of ours keeps working and is recorded, with pace.js on top",
    async run() {
      const s = h.setup();
      const seen = [];
      const Base = window.XMLHttpRequest;
      window.XMLHttpRequest = class extends Base {
        open(...a) { seen.push("sub"); return super.open(...a); }
      };
      const Sub = window.XMLHttpRequest;
      window.XMLHttpRequest = function () { const req = new Sub(); const _open = req.open; req.open = function () { seen.push("pace"); return _open.apply(req, arguments); }; return req; };
      let err = null;
      try { await h.xhr("GET", "/echo?global-sub"); } catch (e) { err = String(e); }
      await h.sleep(50);
      return { err, seen: seen.join(","), urls: s.msgs.map((m) => m.url.replace(location.origin, "")) };
    },
    expect: (r) => ok(!r.err && r.seen === "pace,sub" && JSON.stringify(r.urls) === '["/echo?global-sub"]', JSON.stringify(r)),
  },
  {
    id: "text-body-kept",
    title: "text bodies keep their '&'; url-encoded ones are masked in place",
    async run() {
      const s = h.setup();
      await fetch("/echo", { method: "POST", headers: { "content-type": "text/plain" }, body: "Tom & Jerry" });
      await fetch("/echo", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "user=a&password=secret" });
      await h.until(() => s.msgs.length >= 2);
      return s.msgs.map((m) => JSON.parse(m.request).body);
    },
    expect: (r) => ok(JSON.stringify(r) === JSON.stringify(["Tom & Jerry", "user=a&password=******"]), JSON.stringify(r)),
  },
  {
    id: "xhr-header-values",
    title: "XHR response header values have no trailing \\r",
    async run() {
      const s = h.setup();
      await h.xhr("GET", "/echo");
      return h.parse(s.msgs[0]).response.headers;
    },
    expect: (r) => ok(r["content-type"] === "application/json" && Object.values(r).every((v) => !v.includes("\r")), JSON.stringify(r)),
  },
  {
    id: "fetch-duration-body",
    title: "fetch duration includes the body download (body sent after 400ms)",
    async run() {
      const s = h.setup();
      await fetch("/slow-body").then((r) => r.json());
      await h.until(() => s.msgs.length > 0);
      return { duration: Math.round(s.msgs[0].duration) };
    },
    expect: (r) => ok(r.duration >= 350, JSON.stringify(r)),
  },
  {
    id: "stream-cancel-closes",
    title: "an app cancelling a text stream closes the connection (clone gives up)",
    timeout: 20000,
    async run() {
      h.setup();
      const id = String(Math.random());
      const r = await fetch("/trickle?id=" + id);
      const reader = r.body.getReader();
      await reader.read();
      await reader.cancel();
      const start = performance.now();
      let closed = false;
      while (!closed && performance.now() - start < 13000) {
        await h.sleep(250);
        closed = (await (await fetch("/trickle-status?id=" + id)).json()).closed;
      }
      return { closed, afterMs: Math.round(performance.now() - start) };
    },
    expect: (r) => ok(r.closed, JSON.stringify(r)),
  },
  {
    id: "no-object-hasown",
    title: "masking works without Object.hasOwn (Safari < 15.4)",
    async run() {
      delete Object.hasOwn;
      const s = h.setup();
      await h.xhr("POST", "/echo", { body: '{"password":"x"}' });
      await h.sleep(50);
      return { errors: s.errors, body: s.msgs[0] && JSON.parse(s.msgs[0].request).body };
    },
    expect: (r) => ok(r.errors.length === 0 && r.body === '{"password":"*"}', JSON.stringify(r)),
  },
  {
    id: "fetch-method-case",
    title: "lowercase fetch methods are recorded uppercase with their query",
    async run() {
      const s = h.setup();
      await fetch("/echo?q=2&password=1", { method: "get" });
      await h.until(() => s.msgs.length > 0);
      return { method: s.msgs[0].method, body: JSON.parse(s.msgs[0].request).body };
    },
    expect: (r) => ok(r.method === "GET" && r.body === '{"q":"2","password":"*"}', JSON.stringify(r)),
  },
  {
    id: "xhr-response-size",
    title: "XHR response size is in bytes, also for responseType json",
    async run() {
      const s = h.setup();
      const t = await h.xhr("GET", "/utf8");
      await h.xhr("GET", "/json", { setup: (x) => (x.responseType = "json") });
      return { bytes: new TextEncoder().encode(t.responseText).length, sizes: s.msgs.map((m) => m.responseSize) };
    },
    expect: (r) => ok(r.sizes[0] === r.bytes && r.sizes[1] > 1024, JSON.stringify(r)),
  },
  {
    id: "fetch-request-init-override",
    title: "fetch(Request, init) records init's method and headers, as sent",
    async run() {
      const s = h.setup();
      const req = new Request("/echo", { method: "POST", headers: { "x-a": "1" }, body: "r" });
      const echo = await (await fetch(req, { method: "PUT", headers: { "x-b": "2" }, body: "i" })).json();
      await h.until(() => s.msgs.length > 0);
      const m = h.parse(s.msgs[0]);
      return { sent: [echo.method, echo.headers["x-a"] ?? null, echo.headers["x-b"]], recorded: [m.method, m.request.headers["x-a"] ?? null, m.request.headers["x-b"]] };
    },
    expect: (r) => ok(JSON.stringify(r.sent) === JSON.stringify(r.recorded), JSON.stringify(r)),
  },
  {
    id: "fetch-init-signal",
    title: "aborting init.signal of fetch(Request, init) records one aborted request",
    async run() {
      const s = h.setup();
      const c = new AbortController();
      const p = fetch(new Request("/slow"), { signal: c.signal }).catch((e) => e.name);
      setTimeout(() => c.abort(), 50);
      const res = await p;
      await h.sleep(100);
      return { res, msgs: s.msgs.map((m) => m.status) };
    },
    expect: (r) => ok(r.res === "AbortError" && JSON.stringify(r.msgs) === "[0]", JSON.stringify(r)),
  },
  {
    id: "xhr-method-identity",
    title: "xhr methods keep their identity between reads",
    async run() {
      h.setup();
      const x = new XMLHttpRequest();
      return { send: x.send === x.send, open: x.open === x.open, add: x.addEventListener === x.addEventListener };
    },
    expect: (r) => ok(r.send && r.open && r.add, JSON.stringify(r)),
  },
  {
    id: "xhr-instance-override",
    title: "xhr methods overridden on the instance (pace.js) or rebound don't recurse and are recorded once",
    async run() {
      const s = h.setup();
      const errors = [];
      const x = new XMLHttpRequest();
      const o = x.open, sd = x.send, srh = x.setRequestHeader;
      x.open = function () { return o.apply(this, arguments); };
      x.send = function () { return sd.apply(this, arguments); };
      x.setRequestHeader = function () { return srh.apply(this, arguments); };
      let echo;
      try {
        x.open("POST", "/echo?pace");
        x.setRequestHeader("X-A", "1");
        await new Promise((r) => { x.onloadend = r; x.send("hi"); });
        echo = JSON.parse(x.responseText);
      } catch (e) { errors.push(String(e)); }
      const y = new XMLHttpRequest();
      y.open = y.open.bind(y);
      y.send = y.send.bind(y);
      try {
        y.open("GET", "/echo?bound");
        await new Promise((r) => { y.onloadend = r; y.send(); });
      } catch (e) { errors.push(String(e)); }
      await h.until(() => s.msgs.length >= 2);
      await h.sleep(50);
      return { errors, header: echo?.headers?.["x-a"], body: echo?.body, urls: s.msgs.map((m) => m.url.replace(location.origin, "")) };
    },
    expect: (r) => ok(!r.errors.length && r.header === "1" && r.body === "hi" && JSON.stringify(r.urls) === '["/echo?pace","/echo?bound"]', JSON.stringify(r)),
  },
  {
    id: "xhr-pace-before-tracker",
    title: "an instance open() installed before us (pace.js loaded first) is recorded",
    async run() {
      const N = window.XMLHttpRequest;
      window.XMLHttpRequest = function (flags) {
        const req = new N(flags);
        const _open = req.open;
        req.open = function () { return _open.apply(req, arguments); };
        return req;
      };
      const s = h.setup();
      const x = await h.xhr("GET", "/echo?pace-first");
      await h.sleep(50);
      return { status: x.status, msgs: s.msgs.map((m) => [m.url.replace(location.origin, ""), m.status]) };
    },
    expect: (r) => ok(r.status === 200 && JSON.stringify(r.msgs) === '[["/echo?pace-first",200]]', JSON.stringify(r)),
  },
  {
    id: "xhr-proxy-below",
    title: "another library's per-instance XHR Proxy below ours (vConsole-style) keeps working and is recorded",
    async run() {
      const N = window.XMLHttpRequest;
      window.XMLHttpRequest = new Proxy(N, {
        construct(t, a, nt) {
          const x = Reflect.construct(t, a, nt);
          return new Proxy(x, {
            get: (t2, k) => { const v = Reflect.get(t2, k); return typeof v === "function" ? v.bind(t2) : v; },
            set: (t2, k, v) => Reflect.set(t2, k, v),
          });
        },
      });
      const s = h.setup();
      let err = null;
      let x;
      try { x = await h.xhr("POST", "/echo?below", { body: "a=1", setup: (x) => x.setRequestHeader("x-a", "1") }); } catch (e) { err = String(e); }
      await h.sleep(50);
      const m = s.msgs[0] && h.parse(s.msgs[0]);
      return { err, status: x?.status, n: s.msgs.length, header: m?.request.headers["x-a"] };
    },
    expect: (r) => ok(!r.err && r.status === 200 && r.n === 1 && r.header === "1", JSON.stringify(r)),
  },
  {
    id: "two-copies",
    title: "two bundled copies (page tracker + Spot) both record XHR and fetch once, nothing throws",
    async run() {
      const code = await (await fetch("/np.js")).text();
      (0, eval)(code.replace(/^var NP\b/m, "var NP2"));
      const inner = [];
      NP2.default(window, { sendMessage: (m) => inner.push(m.url.replace(location.origin, "")) });
      const s = h.setup();
      let err = null;
      try { await h.xhr("GET", "/echo?n=1"); await fetch("/echo?n=2").then((r) => r.text()); } catch (e) { err = String(e); }
      await h.sleep(100);
      const outer = s.msgs.map((m) => m.url.replace(location.origin, ""));
      return { distinct: NP2 !== NP, err, outer, inner };
    },
    expect: (r) => ok(r.distinct && !r.err && r.outer.sort().join() === "/echo?n=1,/echo?n=2" && r.inner.sort().join() === "/echo?n=1,/echo?n=2", JSON.stringify(r)),
  },
  {
    id: "xhr-pace-after-two-copies",
    title: "pace.js loaded after two stacked copies: nothing throws, both copies record once",
    async run() {
      const code = await (await fetch("/np.js")).text();
      (0, eval)(code.replace(/^var NP\b/m, "var NP2"));
      const inner = [];
      NP2.default(window, { sendMessage: (m) => inner.push(m.url.replace(location.origin, "")) });
      const s = h.setup();
      const P = window.XMLHttpRequest;
      window.XMLHttpRequest = function () {
        const req = new P();
        const _open = req.open;
        req.open = function () { return _open.apply(req, arguments); };
        return req;
      };
      let err = null;
      try { await h.xhr("GET", "/echo?pace2"); } catch (e) { err = String(e); }
      await h.sleep(100);
      return { err, outer: s.msgs.map((m) => m.url.replace(location.origin, "")), inner };
    },
    expect: (r) => ok(!r.err && JSON.stringify(r.outer) === '["/echo?pace2"]' && JSON.stringify(r.inner) === '["/echo?pace2"]', JSON.stringify(r)),
  },
  {
    id: "xhr-foreign-proxy-below-overrides",
    title: "a foreign instance Proxy below us with Sentry-style or pace.js-after overrides works and records once",
    async run() {
      const proxyBelow = () => {
        const N = window.XMLHttpRequest;
        window.XMLHttpRequest = new Proxy(N, {
          construct(t, a, nt) {
            const x = Reflect.construct(t, a, nt);
            return new Proxy(x, {
              get: (t2, k) => { const v = Reflect.get(t2, k); return typeof v === "function" ? v.bind(t2) : v; },
              set: (t2, k, v) => Reflect.set(t2, k, v),
            });
          },
        });
      };
      const p = XMLHttpRequest.prototype;
      const o = p.open;
      p.open = function (...a) { const orig = this.setRequestHeader; this.setRequestHeader = function (...b) { return orig.apply(this, b); }; return o.apply(this, a); };
      proxyBelow();
      const s = h.setup();
      const errors = [];
      try { await h.xhr("GET", "/echo?sentry-below", { setup: (x) => x.setRequestHeader("x-a", "1") }); } catch (e) { errors.push(String(e)); }
      const P = window.XMLHttpRequest;
      window.XMLHttpRequest = function () { const req = new P(); const _open = req.open; req.open = function () { return _open.apply(req, arguments); }; return req; };
      try { await h.xhr("GET", "/echo?pace-after-below"); } catch (e) { errors.push(String(e)); }
      await h.sleep(100);
      const first = s.msgs[0] && h.parse(s.msgs[0]);
      return { errors, urls: s.msgs.map((m) => m.url.replace(location.origin, "")), header: first?.request.headers["x-a"] };
    },
    expect: (r) => ok(!r.errors.length && JSON.stringify(r.urls) === '["/echo?sentry-below","/echo?pace-after-below"]' && r.header === "1", JSON.stringify(r)),
  },
  {
    id: "xhr-readonly-override",
    title: "a read-only, non-configurable instance method (defineProperty) can be read and works",
    async run() {
      const s = h.setup();
      const x = new XMLHttpRequest();
      const _send = x.send;
      Object.defineProperty(x, "send", { value: function (b) { return _send.call(x, b); } });
      let err = null;
      try {
        x.open("GET", "/echo?readonly");
        x.send();
        await new Promise((r) => x.addEventListener("loadend", r));
      } catch (e) { err = String(e); }
      await h.sleep(50);
      return { err, n: s.msgs.length };
    },
    expect: (r) => ok(!r.err && r.n === 1, JSON.stringify(r)),
  },
  {
    id: "xhr-deferred-override",
    title: "an instance override that calls the original later (promise, timer) opens once and is recorded",
    timeout: 10000,
    async run() {
      const s = h.setup();
      let calls = 0;
      const one = (defer, tag) => new Promise((res) => {
        const x = new XMLHttpRequest();
        const _open = x.open;
        x.open = function (...a) { calls++; if (calls > 20) return; defer(() => _open.apply(x, a)); };
        x.onloadend = () => res(x.status);
        x.open("GET", "/echo?" + tag);
        defer(() => defer(() => x.send()));
        setTimeout(() => res("timeout"), 3000);
      });
      const statuses = [await one((f) => Promise.resolve().then(f), "promise"), await one((f) => setTimeout(f, 10), "timer")];
      await h.sleep(50);
      return { calls, statuses, urls: s.msgs.map((m) => m.url.replace(location.origin, "")) };
    },
    expect: (r) => ok(r.calls === 2 && r.statuses.join() === "200,200" && JSON.stringify(r.urls) === '["/echo?promise","/echo?timer"]', JSON.stringify(r)),
  },
  {
    id: "xhr-chained-overrides",
    title: "two overrides stacked on one instance each run once and the request is recorded once",
    async run() {
      const s = h.setup();
      const x = new XMLHttpRequest();
      const seen = [];
      const o0 = x.open;
      x.open = function () { seen.push("a"); return o0.apply(this, arguments); };
      const o1 = x.open;
      x.open = function () { seen.push("b"); return o1.apply(this, arguments); };
      x.open("GET", "/echo?chain");
      await new Promise((r) => { x.onloadend = r; x.send(); });
      await h.sleep(50);
      return { seen: seen.join(""), urls: s.msgs.map((m) => m.url.replace(location.origin, "")) };
    },
    expect: (r) => ok(r.seen === "ba" && JSON.stringify(r.urls) === '["/echo?chain"]', JSON.stringify(r)),
  },
  {
    id: "xhr-override-calls-prototype",
    title: "instance open()/send() that call the prototype's method are recorded and get the token once",
    async run() {
      const s = h.setup({ token: (cb) => cb("X-OR-Token", "tok") });
      const x = new XMLHttpRequest();
      x.open = function () { return XMLHttpRequest.prototype.open.apply(this, arguments); };
      x.send = function (b) { return XMLHttpRequest.prototype.send.call(this, b); };
      x.open("POST", "/echo?proto-override");
      await new Promise((r) => { x.onloadend = r; x.send("b=1"); });
      await h.sleep(50);
      const m = s.msgs[0] && h.parse(s.msgs[0]);
      return { token: JSON.parse(x.responseText).headers["x-or-token"], msgs: s.msgs.map((m) => m.url.replace(location.origin, "")), body: m?.request.body };
    },
    expect: (r) => ok(r.token === "tok" && JSON.stringify(r.msgs) === '["/echo?proto-override"]' && r.body === "b=1", JSON.stringify(r)),
  },
  {
    id: "xhr-sentry-like",
    title: "a setRequestHeader that a patched prototype open() installs per instance (Sentry) is still recorded",
    async run() {
      const proto = XMLHttpRequest.prototype;
      const origOpen = proto.open;
      proto.open = function (...a) {
        const orig = this.setRequestHeader;
        this.setRequestHeader = function (...b) { return orig.apply(this, b); };
        return origOpen.apply(this, a);
      };
      const s = h.setup({ token: (cb) => cb("X-OR-Token", "tok") });
      const x = await h.xhr("GET", "/echo?sentry", { setup: (x) => { x.setRequestHeader("x-app", "1"); x.setRequestHeader("X-OR-Token", "tok"); } });
      await h.sleep(50);
      const m = s.msgs[0] && h.parse(s.msgs[0]);
      return { sent: JSON.parse(x.responseText).headers["x-or-token"], recorded: m && Object.keys(m.request.headers).map((k) => k.toLowerCase()).sort() };
    },
    expect: (r) => ok(r.sent === "tok" && JSON.stringify(r.recorded) === '["x-app","x-or-token"]', JSON.stringify(r)),
  },
  {
    id: "xhr-send-twice-inflight",
    title: "a second send() while in flight throws natively and leaves the recorded request intact",
    async run() {
      const s = h.setup();
      const x = new XMLHttpRequest();
      x.open("POST", "/slow-body");
      x.send("first");
      await h.sleep(200);
      let threw = false;
      try { x.send("second"); } catch { threw = true; }
      await new Promise((r) => x.addEventListener("loadend", r));
      await h.sleep(50);
      return { threw, msgs: s.msgs.map((m) => [JSON.parse(m.request).body, Math.round(m.duration)]) };
    },
    expect: (r) => ok(r.threw && r.msgs.length === 1 && r.msgs[0][0] === "first" && r.msgs[0][1] >= 350, JSON.stringify(r)),
  },
  {
    id: "xhr-open-from-handlers",
    title: "re-opening from readystatechange, load, abort and loadend (then sync) records every request once",
    async run() {
      const s = h.setup();
      const x = new XMLHttpRequest();
      await new Promise((res) => {
        let step = 0;
        x.onreadystatechange = () => { if (x.readyState === 4 && step === 0) { step = 1; x.open("GET", "/echo?h=rsc"); x.send(); } };
        x.onload = () => { if (step === 1) { step = 2; x.open("GET", "/slow-body?h=load"); x.send(); setTimeout(() => x.abort(), 50); } };
        x.onabort = () => { if (step === 2) { step = 3; x.open("GET", "/echo?h=abort"); x.send(); } };
        x.onloadend = () => { if (step === 3 && x.readyState === 4 && x.responseURL.includes("h=abort")) { step = 4; x.open("GET", "/echo?h=sync", false); x.send(); res(); } };
        x.open("GET", "/echo?h=0");
        x.send();
        setTimeout(res, 5000);
      });
      await h.sleep(100);
      return s.msgs.map((m) => m.url.replace(/^.*\?/, ""));
    },
    expect: (r) => ok(["h=0", "h=rsc", "h=load", "h=abort", "h=sync"].every((u) => r.filter((x) => x === u).length === 1) && r.length === 5, JSON.stringify(r)),
  },
  {
    id: "xhr-nested-open-in-rsc1",
    title: "open() from a readystatechange(1) handler: the request actually sent is the one recorded",
    async run() {
      const s = h.setup();
      const x = new XMLHttpRequest();
      let n = 0;
      x.addEventListener("readystatechange", () => { if (x.readyState === 1 && n === 1) { n = 2; x.open("GET", "/echo?r=nested"); } });
      x.open("GET", "/slow-body?r=1");
      x.send();
      await h.sleep(100);
      n = 1;
      x.open("GET", "/echo?r=2");
      x.send();
      await new Promise((r) => x.addEventListener("loadend", r));
      await h.sleep(100);
      return { real: x.responseURL.replace(/^.*\?/, ""), msgs: s.msgs.map((m) => m.url.replace(/^.*\?/, "")) };
    },
    expect: (r) => ok(r.msgs.length === 2 && r.msgs[0] === "r=1" && r.msgs[1] === r.real, JSON.stringify(r)),
  },
  {
    id: "fetch-one-shot-headers",
    title: "headers given as a one-shot iterator reach the server and are recorded, with and without the token",
    async run() {
      const s = h.setup({ token: (cb) => cb("X-T", "t") });
      const a = await fetch("/echo?it=1", { headers: new Map([["authorization", "Bearer x"]]).entries() }).then((r) => r.json());
      s.restore();
      const s2 = h.setup();
      const b = await fetch("/echo?it=2", { headers: new Map([["authorization", "Bearer y"]]).entries() }).then((r) => r.json());
      await h.sleep(50);
      const rec = [...s.msgs, ...s2.msgs].map((m) => h.parse(m).request.headers.authorization);
      return { sent: [a.headers.authorization, a.headers["x-t"], b.headers.authorization], rec };
    },
    expect: (r) => ok(JSON.stringify(r.sent) === '["Bearer x","t","Bearer y"]' && r.rec.every((v) => v), JSON.stringify(r)),
  },
  {
    id: "xhr-untracked-open",
    title: "an XHR opened past the proxy (prototype call, subclass this.open) works and records no empty message",
    async run() {
      const s = h.setup();
      const x = new XMLHttpRequest();
      x.open = function () { return XMLHttpRequest.prototype.open.apply(this, arguments); };
      x.open("GET", "/echo?proto");
      await new Promise((r) => { x.onloadend = r; x.send(); });
      class X extends XMLHttpRequest { go(u) { this.open("GET", u); this.send(); } }
      const y = new X();
      await new Promise((r) => { y.onloadend = r; y.go("/echo?sub"); });
      await h.sleep(100);
      return { statuses: [x.status, y.status], msgs: s.msgs.map((m) => [m.method, m.url.replace(location.origin, "")]) };
    },
    expect: (r) => ok(r.statuses.join() === "200,200" && r.msgs.every(([method, url]) => method && url), JSON.stringify(r)),
  },
  {
    id: "xhr-send-before-open",
    title: "send() before open() throws like native and leaves no empty message",
    async run() {
      const s = h.setup();
      const x = new XMLHttpRequest();
      let threw = false;
      try { x.send(); } catch { threw = true; }
      x.open("GET", "/echo?after");
      await new Promise((r) => { x.onloadend = r; x.send(); });
      await h.sleep(50);
      return { threw, urls: s.msgs.map((m) => m.url.replace(location.origin, "")) };
    },
    expect: (r) => ok(r.threw && JSON.stringify(r.urls) === '["/echo?after"]', JSON.stringify(r)),
  },
  {
    id: "xhr-open-twice-duration",
    title: "open() twice before send() still records start time and duration",
    async run() {
      const s = h.setup();
      const x = new XMLHttpRequest();
      x.open("GET", "/slow-body");
      x.open("GET", "/slow-body?2");
      await new Promise((r) => { x.onloadend = r; x.send(); });
      await h.until(() => s.msgs.length > 0);
      return { n: s.msgs.length, startTime: s.msgs[0]?.startTime, duration: Math.round(s.msgs[0]?.duration) };
    },
    expect: (r) => ok(r.n === 1 && r.startTime > 0 && r.duration >= 300 && r.duration < 5000, JSON.stringify(r)),
  },
  {
    id: "xhr-open-throws-in-flight",
    title: "an open() that throws leaves the request in flight recorded once, as it completed",
    timeout: 20000,
    async run() {
      const s = h.setup();
      const x = new XMLHttpRequest();
      const done = new Promise((r) => (x.onloadend = r));
      x.open("GET", "/slow");
      x.send();
      await h.sleep(100);
      let threw = false;
      try { x.open("GET", "http://["); } catch { threw = true; }
      await done;
      await h.sleep(100);
      return { threw, status: x.status, msgs: s.msgs.map((m) => [m.url.replace(location.origin, ""), m.status]) };
    },
    expect: (r) => ok(r.threw && r.status === 200 && JSON.stringify(r.msgs) === '[["/slow",200]]', JSON.stringify(r)),
  },
  {
    id: "fetch-iterable-headers-token",
    title: "adding the session token keeps the app's headers given as a Map",
    async run() {
      h.setup({ token: (cb) => cb("X-T", "t") });
      const echo = await fetch("/echo", { headers: new Map([["authorization", "Bearer x"]]) }).then((r) => r.json());
      return { auth: echo.headers.authorization, token: echo.headers["x-t"] };
    },
    expect: (r) => ok(r.auth === "Bearer x" && r.token === "t", JSON.stringify(r)),
  },
  {
    id: "fetch-body-read-error",
    title: "a body copy that can't be read doesn't reject unhandled or hold the message back",
    async run() {
      const odd = () => new Response(new ReadableStream({ start(c) { c.enqueue("not bytes"); c.close(); } }), { headers: { "content-type": "application/json" } });
      window.fetch = async () => odd();
      const s = h.setup();
      const t = performance.now();
      await fetch("/x").then((r) => r.text()).catch(() => {});
      const s2 = h.setupWith({ captureBody: false });
      await fetch("/y").then((r) => r.text()).catch(() => {});
      await h.until(() => s.msgs.length + s2.msgs.length >= 2, 3000);
      await h.sleep(50);
      return { ms: Math.round(performance.now() - t), n: s.msgs.length + s2.msgs.length, sizes: [...s.msgs, ...s2.msgs].map((m) => m.responseSize), errors: s.errors };
    },
    expect: (r) => ok(r.n === 2 && r.ms < 2000 && r.sizes.every((x) => Number.isFinite(x)) && !r.errors.length, JSON.stringify(r)),
  },
  {
    id: "xhr-json-null",
    title: "responseType json with no body records size 0 and no '[object Null]'",
    async run() {
      const s = h.setup();
      await h.xhr("GET", "/beacon", { setup: (x) => (x.responseType = "json") });
      await h.until(() => s.msgs.length > 0);
      const m = h.parse(s.msgs[0]);
      return { size: m.responseSize, body: m.response.body ?? null };
    },
    expect: (r) => ok(r.size === 0 && !String(r.body ?? "").includes("[object"), JSON.stringify(r)),
  },
  {
    id: "iframe-binary-sizes",
    title: "binary XHR responses and beacon Blob types inside an iframe are measured",
    async run() {
      const f = document.createElement("iframe");
      f.src = "/frame/inner.html";
      document.body.append(f);
      await new Promise((r) => (f.onload = r));
      const w = f.contentWindow;
      const s = h.setup({ context: w });
      for (const type of ["arraybuffer", "blob"]) await h.xhr("GET", "/json?kb=1", { Ctor: w.XMLHttpRequest, setup: (x) => (x.responseType = type) });
      w.navigator.sendBeacon("/beacon", new w.Blob(["{}"], { type: "application/json" }));
      await h.until(() => s.msgs.length >= 3);
      const p = s.msgs.map(h.parse);
      return { expected: JSON.stringify({ data: "x".repeat(1024) }).length, sizes: p.slice(0, 2).map((m) => m.responseSize), beaconType: p[2]?.request.headers["Content-Type"] };
    },
    expect: (r) => ok(r.sizes.every((x) => x === r.expected) && r.beaconType === "application/json", JSON.stringify(r)),
  },
  {
    id: "xhr-body-cap",
    title: "XHR text bodies over 1MB stay out of the message like fetch's, sizes are kept",
    async run() {
      const s = h.setup();
      await h.xhr("GET", "/json?kb=512");
      await h.xhr("GET", "/json?kb=1100");
      await h.until(() => s.msgs.length >= 2);
      const p = s.msgs.map(h.parse);
      const len = (kb) => JSON.stringify({ data: "x".repeat(kb * 1024) }).length;
      return { kept: !!p[0].response.body, dropped: !p[1].response.body, sizes: p.map((m) => m.responseSize), expected: [len(512), len(1100)] };
    },
    expect: (r) => ok(r.kept && r.dropped && JSON.stringify(r.sizes) === JSON.stringify(r.expected), JSON.stringify(r)),
  },
  {
    id: "restore",
    title: "restore() puts the native APIs back and stops recording",
    async run() {
      const native = [window.fetch, window.XMLHttpRequest, navigator.sendBeacon];
      const s = h.setupWith({});
      const patched = window.fetch !== native[0] && window.XMLHttpRequest !== native[1];
      s.restore();
      await fetch("/echo");
      await h.xhr("GET", "/echo");
      navigator.sendBeacon("/beacon", "x");
      await h.sleep(100);
      return {
        patched,
        same: [window.fetch === native[0], window.XMLHttpRequest === native[1], navigator.sendBeacon === native[2]],
        ownBeacon: Object.prototype.hasOwnProperty.call(navigator, "sendBeacon"),
        msgs: s.msgs.length,
      };
    },
    expect: (r) => ok(r.patched && r.same.every(Boolean) && !r.ownBeacon && r.msgs === 0, JSON.stringify(r)),
  },
  {
    id: "restore-under-wrapper",
    title: "restore() under another library's wrapper leaves it and passes through",
    async run() {
      const s = h.setupWith({});
      const ours = window.fetch;
      const theirs = (...a) => ours(...a);
      window.fetch = theirs;
      const OurXHR = window.XMLHttpRequest;
      const early = new XMLHttpRequest();
      s.restore();
      const status = await fetch("/echo").then((r) => r.status);
      early.open("GET", "/echo");
      early.send();
      await h.xhr("GET", "/echo", { Ctor: OurXHR });
      await h.sleep(100);
      return { kept: window.fetch === theirs, status, msgs: s.msgs.length };
    },
    expect: (r) => ok(r.kept && r.status === 200 && r.msgs === 0, JSON.stringify(r)),
  },
];
