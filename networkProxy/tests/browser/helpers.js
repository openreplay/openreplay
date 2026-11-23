window.h = {
  /** Installs the proxies on `opts.context` (default window) with the positional API the tracker uses. */
  setup(opts = {}) {
    const state = { msgs: [], errors: [] };
    window.addEventListener("error", (e) => state.errors.push(String(e.message)));
    window.addEventListener("unhandledrejection", (e) => state.errors.push("rejection: " + (e.reason && e.reason.message)));
    state.restore = NP.default(
      opts.context || window,
      opts.ignoredHeaders ?? false,
      opts.token || (() => {}),
      opts.sanitize || ((x) => x),
      (m) => state.msgs.push(m),
      // like the tracker's app.isServiceURL
      (url) => url.startsWith("https://ingest.invalid/"),
      { xhr: true, fetch: true, beacon: true },
      opts.tokenUrlMatcher,
    );
    return state;
  },
  /** Same, through the options object. */
  setupWith(options, context = window) {
    const state = { msgs: [], errors: [] };
    window.addEventListener("error", (e) => state.errors.push(String(e.message)));
    state.restore = NP.default(context, { sendMessage: (m) => state.msgs.push(m), ...options });
    return state;
  },
  async until(fn, ms = 3000) {
    const start = performance.now();
    while (!fn()) {
      if (performance.now() - start > ms) return false;
      await new Promise((r) => setTimeout(r, 20));
    }
    return true;
  },
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  xhr(method, url, { body, setup, Ctor = XMLHttpRequest } = {}) {
    const x = new Ctor();
    return new Promise((resolve) => {
      x.addEventListener("loadend", () => setTimeout(() => resolve(x), 0));
      x.open(method, url);
      if (setup) setup(x);
      x.send(body);
    });
  },
  parse: (m) => ({ ...m, request: JSON.parse(m.request), response: JSON.parse(m.response) }),
};
