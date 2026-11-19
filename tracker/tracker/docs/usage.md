# @openreplay/tracker — setup and usage

Records user sessions in the browser (DOM replay, clicks, console, network, errors, performance) and sends them to OpenReplay (cloud or self-hosted).
Method and option reference: [api.md](./api.md). Full docs: https://docs.openreplay.com/en/sdk

## 1. Install and start

```bash
npm i @openreplay/tracker
```

```ts
import { tracker } from '@openreplay/tracker'

tracker.configure({
  projectKey: 'YOUR_PROJECT_KEY', // dashboard: Preferences → Projects
  // ingestPoint: 'https://openreplay.example.com/ingest', // self-hosted only
})

tracker.start().then((r) => {
  if (!r.success) console.warn('OpenReplay did not start:', r.reason)
})
```

Rules:

- Browser only. Configure once per page load, from the app entry point; never on the server.
- One tracker per page. Don't create it inside a component that re-renders or mounts twice.
- The page must be served over HTTPS. For `http://localhost`, set `__DISABLE_SECURE_MODE` from your dev-build flag so it is never `true` in production: `import.meta.env.DEV` (Vite), `process.env.NODE_ENV === 'development'` (Next.js, webpack), `isDevMode()` (Angular), `import.meta.dev` (Nuxt).
- `start()` resumes the current session after reloads and in other tabs of the same site; you don't need extra logic for that.

**Without a bundler** (static sites): paste this before `</head>`. `initOpts` takes the same options as `configure()`; the queued `window.OpenReplay` methods (`start`, `stop`, `setUserID`, `setUserAnonymousID`, `setMetadata`, `event`, `issue`) work before the script loads.

```html
<script>
  var initOpts = { projectKey: 'YOUR_PROJECT_KEY' };
  var startOpts = {};
  (function(A,s,a,y,e,r){
    r=window.OpenReplay=[e,r,y,[s-1, e]];
    s=document.createElement('script');s.src=A;s.async=!a;
    document.getElementsByTagName('head')[0].appendChild(s);
    r.start=function(v){r.push([0])};
    r.stop=function(v){r.push([1])};
    r.setUserID=function(id){r.push([2,id])};
    r.setUserAnonymousID=function(id){r.push([3,id])};
    r.setMetadata=function(k,v){r.push([4,k,v])};
    r.event=function(k,p,i){r.push([5,k,p,i])};
    r.issue=function(k,p){r.push([6,k,p])};
    r.isActive=function(){return false};
    r.getSessionToken=function(){};
  })('https://static.openreplay.com/latest/openreplay.js',1,0,initOpts,startOpts);
</script>
```

Use `openreplay-assist.js` instead of `openreplay.js` for the build with Assist.

## 2. Identify users

```ts
tracker.start({ userID: user.email, metadata: { plan: 'pro' } })
// or later, once known:
tracker.setUserID(user.id)
tracker.setMetadata('plan', 'pro') // add the key in project metadata settings first
```

On logout, call `tracker.stop()` and then `tracker.start({ forceNew: true })` so the next user gets a new session.

## 3. Frameworks and SSR

Put configure + start in client-only code. A common layout is one module (`openreplay.ts`) that calls `configure()`, attaches plugins and calls `start()`, imported first from the client entry: `import './openreplay'`.

**React (Vite/CRA):** configure at module level in your entry file, call `start()` there or in a top-level `useEffect`.

**Next.js 15.3+:** `instrumentation-client.ts` (project root, or `src/`) runs in the browser before hydration, with either router:

```ts
// instrumentation-client.ts
import { tracker } from '@openreplay/tracker'

tracker.configure({ projectKey: process.env.NEXT_PUBLIC_OPENREPLAY_PROJECT_KEY! })
tracker.start()
```

**Next.js before 15.3, App Router:**

```tsx
// app/openreplay.tsx
'use client'
import { useEffect } from 'react'
import { tracker } from '@openreplay/tracker'

tracker.configure({ projectKey: process.env.NEXT_PUBLIC_OPENREPLAY_PROJECT_KEY! })

export default function OpenReplay() {
  useEffect(() => {
    tracker.start()
  }, [])
  return null
}
// render <OpenReplay /> once in app/layout.tsx
```

The singleton's methods are no-ops on the server, so module-level `configure()` is safe. With the class, create the instance inside `useEffect` (or behind `typeof window !== 'undefined'`).

Pages Router: import the setup module from `pages/_app.tsx`.

**Vue / Nuxt:** start in `onMounted` of the root component, or in a Nuxt client plugin (`plugins/openreplay.client.ts`, `app/plugins/` on Nuxt 4).

**Angular:** configure and start in `main.ts` before or after `bootstrapApplication`.

**React Router (framework mode) / Remix:** import the setup module from `app/entry.client.tsx`; `npx react-router reveal` creates that file if the app doesn't have it.

**SvelteKit:** import it from `src/hooks.client.ts`.

## 4. Privacy

Recorded data is masked in the browser before it is sent. Defaults: input values are obscured, emails in text and inputs are masked, network bodies and the `Cookie`/`Set-Cookie`/`Authorization` headers are not recorded.

```html
<div data-openreplay-obscured>Card ending 4242</div>   <!-- text masked, layout kept -->
<section data-openreplay-hidden>...</section>          <!-- content not recorded -->
```

```ts
import { tracker, SanitizeLevel } from '@openreplay/tracker'

tracker.configure({
  projectKey,
  // per-element rule
  domSanitizer: (el) =>
    el.classList.contains('pii') ? SanitizeLevel.Obscured : SanitizeLevel.Plain,
  // strip secrets from recorded URLs
  urls: { urlSanitizer: (url) => url.replace(/token=[^&]+/, 'token=***') },
})
```

- Mask everything by default: `privateMode: true`, then mark safe areas with `data-openreplay-unmask`.
- After changing masking attributes at runtime, call `tracker.resanitize(el)`.

## 5. Network capture

Fetch, XHR, axios and `sendBeacon` are captured automatically (URL, status, timing, headers). To record bodies, enable `capturePayload` and sanitize:

```ts
tracker.configure({
  projectKey,
  network: {
    capturePayload: true,
    sanitizer: (data) => {
      if (data.url.includes('/auth')) data.request.body = null
      return data // or null to drop the request
    },
  },
})
```

Common keys like `password` and `token` in bodies are masked automatically; your `sanitizer` should still handle app-specific secrets.

To tie backend logs and traces to a replay, send the session token with your API calls:

```ts
network: {
  sessionTokenHeader: true, // adds X-OpenReplay-SessionToken (or pass a header name)
  tokenUrlMatcher: (url) => url.startsWith('https://api.example.com/'), // gets the absolute request URL
}
```

Without `tokenUrlMatcher` the header goes on every request. A custom header makes cross-origin requests preflighted: the API must list it in `Access-Control-Allow-Headers`. End the prefix with `/` so `https://api.example.com.evil.io` doesn't match.

## 6. Custom events, errors and links

```ts
tracker.event('order_placed', { orderId, total })      // timeline event, searchable
tracker.issue('payment_declined', { code })            // shows up as an issue
try { risky() } catch (e) { tracker.handleError(e as Error, { step: 'checkout' }) }

// link replays from other tools (Sentry, support widget, logs)
const replayUrl = tracker.getSessionURL()
```

Product analytics (`track`, user properties) needs `analytics: { active: true }`:

```ts
tracker.configure({ projectKey, analytics: { active: true } })
tracker.track('signup_clicked', { source: 'hero' })
```

## 7. Plugins

```ts
import trackerAssist from '@openreplay/tracker-assist'  // live co-browsing / calls
tracker.use(trackerAssist())
```

Call `use()` after `configure()`. Before it (and on the server) `use()` returns the plugin's inert version: it records nothing and logs no warning.

State plugins show the app's state and actions in replays. Each is a default export; `tracker.use()` returns the piece you wire into the store:

| Package | `tracker.use(plugin())` returns | Wire it |
|---|---|---|
| `@openreplay/tracker-redux` | Redux middleware | Redux Toolkit: `configureStore({ reducer, middleware: (getDefault) => getDefault().concat(mw) })`; Redux: `createStore(reducer, applyMiddleware(mw))` |
| `@openreplay/tracker-zustand` | store wrapper `(initializer, name?)` | `create(wrap((set) => ({ ... }), 'bears'))`. TypeScript: `tracker.use(trackerZustand()) as unknown as StateLogger` (`StateLogger` is a type export of the package) |
| `@openreplay/tracker-vuex` | `(storeName) => (store) => void` (typed as `Function`) | Vuex: `createStore({ ..., plugins: [p('main')] })`; Pinia: `pinia.use(({ store }) => p(store.$id)(store))` |
| `@openreplay/tracker-ngrx` | NgRx meta-reducer | `provideStore(reducers, { metaReducers: [mr] })` or `StoreModule.forRoot(reducers, { metaReducers: [mr] })` |
| `@openreplay/tracker-mobx` | change listener | `observe(store, listener)` from `mobx`, per store |

```ts
import trackerRedux from '@openreplay/tracker-redux'

export const openReplayMiddleware = tracker.use(trackerRedux()) // after configure()
```

Others: `@openreplay/tracker-graphql` (queries), `@openreplay/tracker-profiler` (function timings).

## 8. Troubleshooting

- `start()` resolved `{ success: false }`: read `reason`. Usual causes: not HTTPS, `respectDoNotTrack` + DNT on, called on the server, `configure()` not called, a second tracker instance. A repeated `start()` (React StrictMode) also resolves `success: false` and is harmless.
- Set `__debug__: 4` to see tracker logs in the console.
- CSP: allow `worker-src blob:` and your `ingestPoint` origin in `connect-src`.
- Missing styles in replays: by default the OpenReplay backend downloads your CSS files, so they must be publicly reachable. For CSS behind a VPN or login use `inlineCss: 1`: the tracker reads each stylesheet in the browser and falls back to fetching it. Cross-origin stylesheets need CORS headers for that. For CSS-in-JS use `css: { scanInMemoryCSS: true }`.
- Cross-origin iframes: set `crossdomain: { enabled: true }` in the parent page tracker and in a tracker running inside the iframe.
