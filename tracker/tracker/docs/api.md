# @openreplay/tracker — API reference

Public API of the OpenReplay web tracker (session replay, errors, network, custom events, product analytics).
Setup guide: [usage.md](./usage.md). Full docs: https://docs.openreplay.com/en/sdk

## Entry points

```ts
import { tracker } from '@openreplay/tracker'      // singleton (recommended), alias: openReplay
import Tracker from '@openreplay/tracker'          // class: new Tracker(options)
import Tracker from '@openreplay/tracker/cjs'      // CommonJS build (some SSR setups)
import { SanitizeLevel, type Options } from '@openreplay/tracker'
```

Other exports: `App` (internal app instance, for plugin authors), `Analytics` (standalone analytics SDK), `Messages` (message constructors).

Singleton vs class — same methods, different failure modes:

- **singleton** `tracker`: call `configure()` once, then any method. Every method is a safe no-op on the server and before `configure()` (logs a warning). `start()` never rejects; it resolves `{ success: false, reason }`.
- **class** `new Tracker(options)`: the constructor validates options and silently does nothing on the server. `start()` **rejects** if the tracker could not initialize (no HTTPS, `doNotTrack`, unsupported browser, second instance).

Only one tracker instance per page; a second one logs `one tracker instance has been initialised already` and stays inert.

## Lifecycle

### `configure(options: Partial<Options>): void` — singleton only
Creates the tracker. `projectKey` is required. Call once, as early as possible, in browser code. See [Options](#options).

### `start(startOpts?: Partial<StartOptions>): Promise<StartPromiseReturn>`
Starts recording (or resumes the session of this tab after a reload). Call after `configure()` / construction, on the client.

```ts
interface StartOptions {
  userID?: string                    // same as setUserID() right at start
  metadata?: Record<string, string>  // same as setMetadata() for each key
  forceNew?: boolean                 // drop the stored session, start a new one
  sessionHash?: string               // continue a session from stop() (cross-subdomain stitching)
  assistOnly?: boolean               // Assist (live) only, don't record
}
type StartPromiseReturn =
  | { success: true; sessionID: string; sessionToken: string; userUUID: string }
  | { success: false; reason: string }  // reason 'canceled' if stop() was called meanwhile
```

### `stop(): string | undefined`
Stops recording and ends the session. Returns the `sessionHash`; pass it to `start({ sessionHash })` (e.g. on another subdomain) to continue the same session.

### `discard(): void`
Stops recording for good without sending what is still buffered, e.g. when the user withdraws consent (`stop()` flushes it). Drops pending messages, canvas uploads and analytics batches (uploads and analytics requests in flight are aborted) and clears the tracker's own keys from the configured `localStorage` / `sessionStorage` (session token, tab id, device id, offline buffer, analytics identity); other app storage is left alone. Data already sent stays on the server.

Every method is a no-op afterwards and the page can't record again until it reloads (a second tracker instance is refused). With `crossdomain.enabled`, also call it inside cross-origin iframes: their trackers keep running, though the parent no longer records what they send.

### `coldStart(startOpts?: Partial<StartOptions>, conditional?: boolean): Promise<never> | undefined`
Records into a rolling ~30 s in-memory buffer without creating a session. Calling `start()` later creates the session and sends the buffer, so the moments before the trigger (an error, a checkout step) are kept. `conditional: true` loads the recording conditions set in the project settings and starts when one matches. Returns a rejected promise only when the tracker isn't initialized.

### `isActive(): boolean`
`true` while a session is being recorded.

### `forceFlushBatch(): void`
Sends buffered messages now (normally batched). Useful before a hard navigation or app shutdown you control.

### `startOfflineRecording(startOpts: Partial<StartOptions>, onSessionSent: () => void)`
Records without network. Returns `{ saveBuffer(), getBuffer(), setBuffer(buffer) }` (or a rejected promise when the tracker isn't initialized); `saveBuffer()` persists to `localStorage`. Timestamps use device time only.

### `uploadOfflineRecording(): Promise<void> | undefined`
Uploads the offline buffer as a session. Await it.

## User and session

### `setUserID(id: string): void` (alias `identify`)
Attaches a user identifier (email, DB id) to the session; searchable in the dashboard. Also identifies the user in product analytics when enabled.

### `setUserAnonymousID(id: string): void`
Attaches an anonymous/device identifier before the user is known.

### `setMetadata(key: string, value: string): void`
Sets a session metadata field. Add the key in the project's metadata settings first (max 10 keys), otherwise it isn't saved. Same key overwrites.

### `getSessionURL(options?: { withCurrentTime?: boolean }): string | undefined`
Dashboard link to the current replay (for support tickets, error reporters, Slack). `withCurrentTime` opens the replay at the current moment. `undefined` until `start()` has resolved successfully.

### `getSessionID(): string | null | undefined`
Current session id. Use to correlate with backend logs.

### `getSessionInfo(): SessionInfo | null`
```ts
interface SessionInfo {
  sessionID: string | undefined
  metadata: Record<string, string>
  userID: string | null
  timestamp: number      // session start, ms
  projectID?: string
}
```

### `getSessionToken(): string | null | undefined`
Token of the current session (what `network.sessionTokenHeader` sends), for backend integrations. To continue a session, use `stop()` + `start({ sessionHash })` instead.

### `getTabId(): string | null`
Id of this tab inside the session (a session can span several tabs).

## Events and errors

### `event(key: string, payload?: any, issue?: boolean): void`
Custom event on the replay timeline, searchable in the dashboard. `payload` is a string or a JSON-serializable object. `issue = true` is the same as `issue()`.

```ts
tracker.event('checkout_completed', { orderId, total })
```

### `issue(key: string, payload?: any): void`
Custom issue: shown as an issue in the replay and filterable. Use for handled failures (payment declined, empty search).

### `handleError(e: Error | ErrorEvent | PromiseRejectionEvent, metadata?: Record<string, any>): void`
Reports an error you caught yourself (uncaught errors and rejections are captured automatically). Use in `try/catch`, React error boundaries, framework error handlers.

### `incident(options: { label?: string; startTime: number; endTime?: number }): void`
Marks a time range (ms timestamps, e.g. `Date.now()`) on the replay as an incident.

### `trackWs(channelName: string): ((msgType: string, data: string, dir?: 'up' | 'down') => void) | undefined`
Returns a logger for WebSocket (or any socket-like) traffic, shown in the replay. `dir`: `'up'` sent, `'down'` received (default). Skips data over 5 MB or `msgType` over 255 chars.

```ts
const logWs = tracker.trackWs('chat')
socket.addEventListener('message', (e) => logWs?.('message', e.data, 'down'))
```

## Product analytics

Requires `analytics: { active: true }` in options; otherwise these are no-ops / `null`.

### `track(eventName: string, properties?: Record<string, any>, options?: { send_immediately: boolean }): void`
Product analytics event (batched; `send_immediately` skips the batch).

### `analytics: Analytics | null`
- `analytics.identify(userId)`, `analytics.reset()` (call on logout)
- `analytics.people.setProperties(propsOrName, value?)`, `.setPropertiesOnce(props)`, `.increment(key, n)`, `.appendValues(key, value)`, `.appendUniqueValues(key, value)`, `.deleteUser()`
- `analytics.events.setProperty(propsOrName, value?)` (super property sent with every event), `.setPropertiesOnce(...)`, `.unsetProperties(names)`

### `setAnalyticsToken(token: string): void` / `getAnalyticsToken(): string | undefined`
Bind analytics events to a custom token instead of the recorded session's token.

## Privacy

### `resanitize(el?: Element): void`
Re-applies sanitization after you change `data-openreplay-*` attributes or whatever your `domSanitizer` checks, and updates already-recorded nodes. Pass the highest changed node; omit to rescan the whole document (cost grows with DOM size).

### `checkSanitization(el: Node): SanitizeLevel | undefined`
Current level of a recorded node: `0` Plain, `1` Obscured, `2` Hidden; `undefined` if not tracked. Useful for debugging masking.

### `captureSanitizer` option
Filters values the built-in masking leaves in: return the value, a replacement, or `null` to leave it out. It must be synchronous and fast (it runs for every recorded attribute); a throw or a non-string result counts as `null`.

```ts
import type { CaptureData } from '@openreplay/tracker'

type CaptureSanitizer = (data: Readonly<CaptureData>) => string | null
type CaptureData =
  | { kind: 'attribute'; name: string; value: string; node: Element | null }
  | { kind: 'resource'; resourceType: 'image' | 'stylesheet' | 'svg' | 'timing' | 'base'; value: string; node: Element | null }
  | { kind: 'css'; source: 'attribute' | 'text' | 'rule' | 'adopted'; value: string; node: Element | null; sourceUrl?: string }
  | { kind: 'font'; field: 'family' | 'source' | 'descriptors'; value: string; node: null }
  | { kind: 'svg'; value: string; node: SVGUseElement; sourceUrl: string }
```

| `kind` | Values |
|---|---|
| `attribute` | Element attributes (`class`, `id`, `data-*`, `aria-*`, ...). |
| `resource` | `image`: `<img>` / `<source>` `src` and `srcset`. `stylesheet`: `<link>` `href`. `svg`: SVG `href`, including `<use>` sprites. `timing`: resource timing URLs (after `resourceNameSanitizer`). `base`: the URL relative URLs are resolved against; `null` leaves out every URL-based value. |
| `css` | `attribute`: `style` attributes. `text`: `<style>` text and inlined stylesheets (`sourceUrl` set). `rule`: rules added through `insertRule`. `adopted`: constructed stylesheets. A rule left out or rewritten into something that doesn't parse is replaced by an empty rule, so rule indexes stay aligned. |
| `font` | `new FontFace()` family, source and descriptors; `null` for any of them drops the font. |
| `svg` | Markup of an inlined `<use>` sprite icon. |

- Not passed to it: page text and input values (use masking), page URLs and titles (`urls`), network requests (`network.sanitizer`), console.
- Inlined stylesheets (`inlineCss` other than `0`) and sprite icons are read from the copy the page loaded, and their content goes through the `css` / `svg` kinds. Return the URL unchanged or with query parameters removed (e.g. a signed `?token=`) to keep them; any other URL leaves them out of the replay, since the tracker doesn't fetch URLs the policy returns. With `inlineCss: 0` the replay loads the stylesheet URL you return.
- Canvas and cross-domain iframe capture are off while it is set.

## Other

### `use<T>(plugin: (app: App | null, options?: Partial<Options>) => T): T`
Attaches a plugin and returns its result (what each state plugin returns and where it goes: [usage.md §7](./usage.md#7-plugins)). Plugins: `@openreplay/tracker-assist`, `-redux`, `-vuex`, `-zustand`, `-mobx`, `-ngrx`, `-graphql`, `-profiler`. Call it after `configure()`: before that (and on the server) the singleton passes `null` to the plugin, which then returns an inert version that records nothing, without a warning.

```ts
import trackerAssist from '@openreplay/tracker-assist'
tracker.use(trackerAssist())
```

### `restartCanvasTracking(): void`
Re-scans canvases; call after a canvas/WebGL context was recreated.

### `getInstance(): Tracker | null` — singleton only
The underlying class instance.

### `options: Partial<Options> | null`
Options passed at creation.

## Options

Passed to `configure()` / `new Tracker()`. All optional except `projectKey`.

| Option | Type / default | Purpose |
|---|---|---|
| `projectKey` | `string` (required) | Project key from the dashboard (Preferences → Projects). |
| `ingestPoint` | `'https://api.openreplay.com/ingest'` | Self-hosted: `'https://<your-domain>/ingest'`. |
| `revID` | `string` | App release/revision, for filtering sessions. |
| `resourceBaseHref` | `string \| null` | Public base URL for assets when the app's own host isn't reachable from the replay. |
| `respectDoNotTrack` | `false` | Don't record when the browser sends DNT. |
| `forceSingleTab` | `false` | Every tab is its own session. |
| `__debug__` | `0` | Console log level: 2 errors, 3 +warnings, 4 +logs, 5 verbose. |
| `__DISABLE_SECURE_MODE` | `false` | Allow non-HTTPS pages. **Local development only**: set it from your dev-build flag, e.g. `import.meta.env.DEV`. |
| `privateMode` | `false` | Mask everything: text, inputs, URLs, titles, console, network URLs/headers/bodies. Opt subtrees back in with `data-openreplay-unmask`. |
| `obscureTextEmails` / `obscureTextNumbers` | `true` / `false` | Mask emails/numbers in page text. |
| `obscureInputEmails` / `obscureInputNumbers` / `obscureInputDates` | `true` / `true` / `false` | With `defaultInputMode: 0`: mask email and date fields, and other fields once the value has `@` or 4 digits in a row; what was typed before that is recorded, so mark fields that hold such values with `data-openreplay-obscured`. |
| `defaultInputMode` | `1` | Inputs: `0` plain, `1` obscured, `2` ignored. |
| `domSanitizer` | `(node: Element) => SanitizeLevel` | Per-element masking rule. |
| `urls` | `{ urlSanitizer?, titleSanitizer?, replaceHashSymbol? }` | Rewrite recorded page URLs/titles (strip tokens, PII). |
| `resourceNameSanitizer` | `(url: string) => string` | Rewrite resource timing URLs. |
| `captureSanitizer` | `(data: CaptureData) => string \| null` | Rewrite or drop attributes, resource URLs, CSS and fonts after masking, see [`captureSanitizer`](#capturesanitizer-option). Turns off canvas and cross-domain iframe capture. |
| `excludedResourceUrls` | `string[]` | Skip resource timings for these URLs. |
| `customAttributes` | `string[]` | Attributes (e.g. `'data-testid'`) to prefer in click selectors and input labels. |
| `network` | object, see below | Fetch/XHR/beacon capture. |
| `consoleMethods` | all of `log info warn error debug assert` | Console methods to record; `[]` or `null` disables. |
| `consoleThrottling` | `30` | Max console entries per second. |
| `captureExceptions` | `true` | Uncaught errors and rejections. |
| `capturePerformance` | `true` | Performance graph (FPS, CPU, memory). |
| `captureResourceTimings` / `capturePageLoadTimings` / `capturePageRenderTimings` | `true` | Resource timings and web vitals. |
| `longTasks` | `false` | Long animation frame tracking. |
| `captureIFrames` | `true` | Record same-origin iframes. |
| `crossdomain` | `{ enabled: false, parentDomain: '*', childDomains? }` | Cross-origin iframes: set `enabled` in the parent page and inside the iframe, which runs its own tracker. In the iframe, `parentDomain` (an origin or a list of them) limits which embedding pages it talks to; on the parent, `childDomains` limits which iframe origins can join. |
| `nextObserver` | `true` | DOM core: one MutationObserver for the page, iframes and shadow roots, no node maintainer, same recording format. Needs `WeakRef`; without it the previous core is used. Set `false` to switch back to the previous core; leaving it unset logs a one-time console warning about the new default. |
| `canvas` | `{ disableCanvas: false, fixedCanvasScaling: false, useAnimationFrame: false, fileExt: 'webp' }` | Canvas/WebGL capture. |
| `mouse` | `{ disableClickmaps?, trackingOffset? }` | Click/movement capture. |
| `disableScrollmaps` | `false` | Don't send scroll depth. |
| `inlineCss` | auto (`3` on localhost, `0` elsewhere) | How stylesheets are recorded: `0` the backend downloads the CSS file (it must be public); `1` the tracker reads the loaded stylesheet in the browser, falling back to fetching it; `2` fetches it, sent as an adopted sheet; `3` fetches it, sent as `<style>`. Use `1` for CSS behind a VPN or login. Cross-origin CSS can only be read or fetched with CORS. |
| `css` | `{ scanInMemoryCSS: false, checkCssInterval: 200, checkLimit? }` | CSS-in-JS (emotion, MUI): turn on `scanInMemoryCSS` if styles are missing in replays. |
| `autoResetOnWindowOpen` | `false` | Start a new session in tabs opened with `window.open`. |
| `analytics` | `{ active: false, ingestPoint? }` | Enable `track()` / `analytics`. |
| `assistSocketHost` | `ingestPoint` host | Assist (live) socket host. |
| `connAttemptCount` / `connAttemptGap` | `10` / `250` ms | Upload retries; delay grows by `connAttemptGap` per attempt. |
| `localStorage` / `sessionStorage` | `window.*` | Custom `Storage` implementations. |

`network` options:

```ts
network?: {
  failuresOnly?: boolean            // false — only record 4xx/5xx
  capturePayload?: boolean          // false — record request/response bodies (sanitize first!)
  ignoreHeaders?: string[] | boolean // ['cookie','set-cookie','authorization']; false = keep all
  sanitizer?: (data: RequestResponseData) => RequestResponseData | null // edit, or null to drop the request
  sessionTokenHeader?: string | boolean // false; true = 'X-OpenReplay-SessionToken' on outgoing requests (cross-origin APIs must allow it: CORS preflight)
  tokenUrlMatcher?: (url: string) => boolean // gets the absolute request URL; limits sessionTokenHeader to matches (default: every request)
  captureInIframes?: boolean        // true
  axiosInstances?: AxiosInstance[]  // only for axios instances with a custom adapter
  disabled?: boolean                // turn network capture off
}
// RequestResponseData: { status, method, url, request: { headers, body }, response: { headers, body } }
```

## HTML attributes

| Attribute | Effect |
|---|---|
| `data-openreplay-obscured` | Mask the element's text/value (layout kept). Checkbox/radio state is kept; hide them to drop it. |
| `data-openreplay-hidden` | Don't record content; element replays as an empty box of the same size. |
| `data-openreplay-unmask` | With `privateMode`: record this subtree in plain. |
| `data-openreplay-capture` | On an `<iframe>`: record it when `captureIFrames` is off. |
| `data-openreplay-label` | Readable name for clicks on this element. |
