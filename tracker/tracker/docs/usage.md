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
- The page must be served over HTTPS. For `http://localhost` add `__DISABLE_SECURE_MODE: true` (dev only).
- `start()` resumes the current session after reloads and in other tabs of the same site; you don't need extra logic for that.

## 2. Identify users

```ts
tracker.start({ userID: user.email, metadata: { plan: 'pro' } })
// or later, once known:
tracker.setUserID(user.id)
tracker.setMetadata('plan', 'pro') // add the key in project metadata settings first
```

On logout, call `tracker.stop()` and then `tracker.start({ forceNew: true })` so the next user gets a new session.

## 3. Frameworks and SSR

Put configure + start in client-only code.

**React (Vite/CRA):** configure at module level in your entry file, call `start()` there or in a top-level `useEffect`.

**Next.js App Router:**

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

**Vue / Nuxt:** start in `onMounted` of the root component, or in a Nuxt client plugin (`plugins/openreplay.client.ts`).

**Angular:** configure and start in `main.ts` before or after `bootstrapApplication`.

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

Others: `@openreplay/tracker-redux`, `-vuex`, `-zustand`, `-mobx`, `-ngrx` (state), `-graphql` (queries), `-profiler` (function timings). Call `use()` after `configure()`.

## 8. Troubleshooting

- `start()` resolved `{ success: false }`: read `reason`. Usual causes: not HTTPS, `respectDoNotTrack` + DNT on, called on the server, `configure()` not called, a second tracker instance. A repeated `start()` (React StrictMode) also resolves `success: false` and is harmless.
- Set `__debug__: 4` to see tracker logs in the console.
- CSP: allow `worker-src blob:` and your `ingestPoint` origin in `connect-src`.
- Missing styles in replays: CSS files must be publicly reachable by the OpenReplay backend. For assets behind VPN/auth use `inlineCss: 3` (already the default on localhost); for CSS-in-JS use `css: { scanInMemoryCSS: true }`.
- Cross-origin iframes: set `crossdomain: { enabled: true }` in the parent page tracker and in a tracker running inside the iframe.
