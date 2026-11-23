this tiny library helps us (OpenReplay folks) to create proxy objects for fetch,
XHR and beacons for proper request tracking in @openreplay/tracker and Spot extension.

example usage:
```ts
import createNetworkProxy from '@openreplay/network-proxy';

const restore = createNetworkProxy(window, {
  sendMessage: (message) => app.send(message),
  // requests to these urls are passed through untouched
  isServiceUrl: (url) => app.isServiceURL(url),
  // `true` drops all headers
  ignoredHeaders: ['Authorization'],
  setSessionTokenHeader: (setRequestHeader) => {
    const sessionToken = getToken();
    if (sessionToken) setRequestHeader('X-Session-Token', sessionToken);
  },
  // the token header is only added to urls this returns true for
  tokenUrlMatcher: (url) => url.startsWith('https://api.example.com/'),
  // return null to drop the request
  sanitize: (reqResInfo) => {
    delete reqResInfo.request.body;
    return reqResInfo;
  },
  // false (or a function returning false for a url) leaves bodies out of messages; response sizes are still measured
  captureBody: true,
  modules: { xhr: true, fetch: true, beacon: true },
});

// puts the original fetch / XMLHttpRequest / sendBeacon back; if another library wrapped them
// in the meantime, our proxies stay in its chain and pass everything through
restore();
```

The positional form `createNetworkProxy(context, ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage,
isServiceUrl, modules?, tokenUrlMatcher?)` still works and returns the same `restore`.

axios instances with a custom adapter (native HTTP bridge, mock, `env.fetch`) never reach
the global XHR/fetch, hook them explicitly. Requests that went through the proxies are
skipped, so hooking an instance with the default adapter records nothing twice:
```ts
import { hookAxios } from '@openreplay/network-proxy';

const unhook = hookAxios(api /* axios.create(...) */, {
  sendMessage: (message) => app.send(message),
  isServiceUrl: (url) => app.isServiceURL(url),
});
```

tests: `bun run test` (unit, jsdom) and `bun run test:browser` (Chromium, Firefox and WebKit through
playwright-core, first `npx playwright-core install chromium firefox webkit`; `--browsers=chromium --only=<case id>`
to narrow, `--src=<dir>` to run against another copy of `src`).
