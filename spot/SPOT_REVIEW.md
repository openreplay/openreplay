# OpenReplay Spot Extension — Code Review

## Executive Summary

The post-refactor Spot extension is structurally coherent: the typed `@webext-core/messaging` protocol, alarm-driven token lifecycle, and session-persisted `recState` are genuine improvements over the prior in-memory-readiness design. However, the review surfaced one **critical security flaw** (the web-app handshake trusts a JWT and ingest origin from any page) and several **high-severity** issues that undermine both data confidentiality (debugger/proxy network capture ships unscrubbed headers and bodies) and recording reliability (all capture buffers live only in service-worker memory, and an EncodingError fallback that destroys its own stream). The dominant architectural risk is that the MV3 service worker is the single owner of every byte of captured data — including the base64 video held two-to-three times concurrently — so any eviction silently loses a recording the user believes succeeded. A cluster of medium issues stems from this same design (keepalive throttling, dual source-of-truth for `recState`, double-serialized video chunks). Maintainability is generally good but spotted with dead code, an `any`-typed hot path that defeats the new typed protocol, and zero test coverage for pure, correctness-sensitive utilities. None of the issues block normal happy-path recording, but the security and data-loss findings should be addressed before the next release.

---

## Critical

### 1. `orspot:token` login handshake accepts a JWT and ingest origin from ANY page
**File:** `entrypoints/content/index.tsx` — window `message` listener, lines 196-210 (esp. 200-207)

The content script is injected on every page (`*://*/*`) and its `orspot:token` handler reads `event.data.token` and forwards it to the background as the extension's auth JWT (`ort:login-token`) with no `event.origin` / `event.source` check. Any site the user visits can run `window.postMessage({type:'orspot:token', token:'<attacker-jwt>'}, '*')` and silently replace the user's OpenReplay session token. Compounding this, `ingest` is derived from `window.location.origin` (line 202) and persisted as `settings.ingestPoint`, which becomes the upload/refresh base URL — so a malicious page can cause all subsequently-recorded Spot data (video, console, network bodies, headers, clicks) **and the bearer token** to be POSTed to that same malicious origin. `orspot:ping` / `orspot:invalidate` are likewise unauthenticated (forced-logout / DoS). This is the core trust boundary of the web-app↔extension contract and it is unprotected. (Note: the page can only redirect uploads to an origin it already controls, since `ingest` comes from `location.origin`, not an attacker-supplied field — but that fully satisfies the attack.)

**Recommendation:** Gate all `orspot:*` handlers on `event.source === window` and a strict origin allowlist (`https://app.openreplay.com`, plus the validated `settings.ingestPoint` origin). Do not derive the ingest target from `window.location.origin`; validate it against the configured OpenReplay host. Consider restricting the content-script match patterns (or at least this listener) to OpenReplay app origins rather than `<all_urls>`.

---

## High

### 2. All recording buffers live only in service-worker memory; an SW death mid-recording silently loses the session
**File:** `entrypoints/background.ts` — `SpotBuffers`/`buffers` lines 37-61; accumulation handlers 532-552, 624-638

`logs`/`clicks`/`locations`/`vitals`/`network` and the full base64 video accumulate in the module-scoped `buffers` object, which is never persisted (only `recState` coordination metadata goes to session storage). If the MV3 worker is evicted or crashes mid-recording (5-min forced termination during a long save, OOM from holding a multi-MB base64 video, browser crash, or keepalive failure — see #7), `buffers` is reinitialized to `makeBuffers()` on the next wake (line 60) while `recState` still says "recording". The UI keeps running against an empty buffer and the user only discovers the total loss at save time. The video has a partial mirror in the content script, but `saveSpot` reconstructs the upload from `buffers.base64data` (line 763), so the save path still loses it; the event buffers have no mirror at all. The keepalive reduces but does not eliminate eviction, and OOM risk is amplified precisely because the video is base64 (4/3 size) in memory.

**Recommendation:** Stop accumulating in SW memory. Move event buffers into session storage incrementally (batched append on each `ort:bump-*`) or accumulate them in the content script and hand the full payload over only at save time. For the video, do not route it through the SW at all — have the offscreen document keep the Blob and upload it directly (or stash it in IndexedDB), with the SW only orchestrating.

### 3. Debugger (CDP) and page-world proxy network capture upload raw headers and bodies with NO sensitive-data filtering
**Files:** `utils/networkDebuggerTracking.ts` — `handleRequestIntercept` lines 47-90 (consumed in background.ts `ort:stop` 603-605); `utils/proxyNetworkTracking.ts` — `createSpotNetworkRequest` lines 49-88

Two capture paths bypass the sanitizers (`filterHeaders`/`filterBody`/`obscureSensitiveData`/`tryFilterUrl` in `networkTrackingUtils.ts`) that exist specifically to scrub Authorization/Cookie/set-cookie/password/token/PII data. **Debugger path** (`settings.useDebugger` on): stores `params.request.headers` (58), `params.response.headers` (67), request `postData` (55) and the full text/JSON response body (82) verbatim, then uploads them as-is — both response bodies *and* response headers leak. **Proxy path:** builds `SpotNetworkRequest` with request/response headers (64-65) and bodies (68-69) straight from the parsed message; in the non-debugger flow `mergeRequests` keeps the filtered webRequest object as the base but copies the **unfiltered proxy `responseBody`** into it (`networkTrackingUtils.ts` 282-291). Net effect across both paths: response bodies (and, on the debugger path, headers) reach the ingest endpoint in cleartext. (Binary/base64 responses on the debugger path are stored as the literal `'base64 payload'`, so they don't leak; the default webRequest-only path scrubs correctly via `createSpotNetworkRequest`.)

**Recommendation:** Route every capture path through a single shared normalize-and-scrub function: `filterHeaders()` on request/response headers, `filterBody()`/`obscureSensitiveData()` on bodies, `tryFilterUrl()` on URLs — applied inside `getDebuggerRequests`/`createSpotNetworkRequest`/`mergeRequests` so filtering cannot be forgotten per-path. Define an explicit policy on whether response bodies should be captured at all.

### 4. EncodingError fallback stops the new recorder's own media tracks (recording dies, empty blob)
**File:** `entrypoints/offscreen/main.js` — `_handleStop`/onerror fallback, lines 326-368 and 540-580

The first recorder gets `onstop = this._handleStop` attached (326-327). When it fires `onerror` with an EncodingError (329), the fallback calls `this.mRecorder.stop()` on the **old** recorder (340) without detaching its handlers, so `_handleStop` runs — and `_handleStop` does not merely build a blob: it iterates `this.stream.getTracks()` calling `t.stop()` (553-559) and closes the AudioContext via `_cleanupAudioGraph()` (580). The fallback then builds a new MediaRecorder over the **same** `combinedStream` (351-353/362), so the new recorder records the just-stopped tracks and closed audio mix, producing an empty/zero-length blob — the exact failure the fallback was meant to recover from. It also prematurely sets `recorded = true` and resolves `_stopPromise` against empty chunks. (Per spec the `stop()` event is queued async, so ordering is: stop queued → new recorder started → `_handleStop` later kills the shared tracks; net effect identical.)

**Recommendation:** Before stopping the old recorder in the onerror fallback, detach its handlers (`onstop`/`ondataavailable`/`onerror = null`) and wrap the stop in try/catch — or, better, do not stop the old recorder at all and re-acquire a fresh stream (`getUserMedia`/`getDisplayMedia`) for the fallback recorder rather than reusing `combinedStream`.

---

## Medium

### 5. Paused recording re-mounts as actively "recording" after navigation/tab-switch
**File:** `entrypoints/content/index.tsx` — `onMessage("content:start")` lines 287-297

When a paused recording's tab navigates (`background.ts` `webNavigation.onCompleted`, 325) or, in desktop mode, the user switches tabs (`tabs.onActivated`, 356), the background re-sends `content:start` with `state: rec.recording` — which may be `"paused"` (348, 377). The content handler ignores `msg.state` entirely: it unconditionally sets `recState = "recording"`, starts click/location recording, and `ControlsBox` mounts `RecordingControls` with a running timer (`RecordingControls.tsx:73`). Meanwhile the offscreen MediaRecorder is still paused (no `offscr:resume` was sent), so the wall-clock timer keeps counting and can hit the 3-minute auto-stop while zero additional video is captured; background thinks paused, content shows recording. Requires the specific sequence pause→navigate/switch-while-paused; the common pause→resume-in-place flow is unaffected.

**Recommendation:** Honor `msg.state` in the `content:start` handler (`recState = msg.state`) and render the paused UI (stopped timer, resume button) when `state === "paused"`. At minimum, do not start the count-up timer or click/location intervals when re-mounting into a paused session. Passing `state` through cleanly also fixes the general re-mount guard.

### 6. `saveSpot` proceeds to upload with an empty/expired token when refresh fails (recording destroyed, unretryable)
**File:** `entrypoints/background.ts` — `saveSpot`, lines 721-742

`saveSpot` calls `await refreshToken()` and, on `false`, only calls `notifyError(...)` without returning. `refreshToken` clears the in-memory token via `setJWTToken("")` in its `!token` (186-189) and `!resp.ok` (200-202) branches, so execution falls through to a POST to `/spot/v1/spots` with `Authorization: Bearer ` (empty). The server 401s, the catch clears the token again, and the user gets two stacked error notifications. The base64 video buffer is then wiped in the `finally` (784), making retry impossible. (The `refreshToken` catch branch at 207-209 returns false without clearing, so a refresh *network* error reuses the prior token, but the missing early-return still produces a guaranteed-failed POST and buffer destruction whenever the token was cleared.)

**Recommendation:** `if (!refreshed) { notifyError(...); return; }` before the POST and before clearing buffers. Preserve buffers so the save can be retried after re-auth.

### 7. The 1s click-bump keepalive is a throttled content-script `setInterval` — it stops keeping the SW alive in exactly the backgrounded-tab case
**File:** `entrypoints/content/eventTrackers.ts` — `startClickRecording`, lines 82-89

The periodic SW keepalive intended to bridge the 30s idle window during a static recording is the 1s `ort:bump-clicks` message, driven by a `setInterval` in the recorded page's content script. Chromium intensively throttles timers in non-visible/backgrounded tabs (clamped to ~once/minute after ~5 min hidden; tab-freezing can pause them entirely). In desktop-recording mode the user is *expected* to switch to other tabs/apps while the recorded surface is backgrounded, so the cadence collapses to ~60s or stops and the SW idles out at 30s — combined with #2, the buffers are lost. The `ALARM_PING` alarm (158-160, fires ~60s) is not visibility-throttled but cannot reliably hold a worker that idles at 30s, and an alarm wake spins up a fresh SW whose `buffers` is empty. Data loss is probabilistic (depends on recording length, static-ness, backgrounding duration), not guaranteed.

**Recommendation:** Drive keepalive from the offscreen document instead — have `ScreenRecorder`'s existing 1s `trackDuration` interval (`offscreen/main.js` 134-139) send a lightweight `offscr:tick` to the background each second. Offscreen docs are not visibility-throttled.

### 8. `recState` mirror drifts from session storage across SW restarts; message handlers mix sync mirror and async store reads
**File:** `entrypoints/background.ts` — mirror lines 76-84, sync reads at 432/467/494/597/608/636/719/758; listeners re-read store at 326/357/390

Two sources of truth: persisted `recStateStore` and the in-memory mirror `recState`. The top-level listeners correctly re-read the store (the mirror may be stale after a wake), but the message handlers read the synchronous mirror. The mirror is only populated by a fire-and-forget `recStateStore.getValue().then(...)` at 840 with no await, so a message arriving on a freshly-woken worker before that resolves reads `DEFAULT_REC_STATE` (`recording: "stopped"`, `activeTabId: null`). An `ort:stop` racing the rehydrate would log "stop called on a stopped recording" (598) and no-op (recording fails to finalize), or `pushToTab` would target `tabId null`. This is the same wake-race class the listeners were explicitly hardened against (comment at 479). Within a single live worker the mirror never drifts (all mutations route through `setRecState`); exposure is the first message handled on a freshly-woken worker.

**Recommendation:** Have state-dependent message handlers `await recStateStore.getValue()` like the listeners, or gate all handlers behind an awaited hydration `ready` promise. Best: drop the mirror entirely and always read the store (session reads are cheap), eliminating the dual-source class of bug.

### 9. Video is base64-encoded and held in memory two-to-three times to build a local preview; chunks are double-serialized across two runtime hops
**Files:** `entrypoints/background.ts` `offscr:video-data-chunk` 624-638; `entrypoints/content/index.tsx` `videoChunks` 70/315-318/124-125; consumer `SavingControls.tsx` 154-163; `offscreen/main.js` `sendMessage('offscr:video-data-chunk')` 839-847

On stop, the offscreen doc base64-encodes the whole Blob (~33% inflation) into ≤24MB chunks (`hardLimit`, `main.js:7`) and messages them to the SW, which stores them in `buffers.base64data` (the actual upload source, 626/763) **and** re-pushes each chunk to the content script, where they are stored independently in `videoChunks` (316) solely to rebuild a Blob for the in-page `<video>` preview (`SavingControls.tsx:158`). So a 720p/3-min clip (~56MB binary → ~75MB base64) is resident at peak in three places (offscreen Blob+base64, SW buffer, content array) and structured-clone-serialized twice (offscreen→bg at `main.js:839`, bg→content via `pushToTab`→`sendMessage` at `background.ts:628`). This is the primary OOM driver compounding #2, plus ~150MB of serialization work, and a single 24MB message risks approaching runtime size limits. (The SW copy is *not* redundant — it's the upload source; the content `videoChunks` and the bg→content re-forward are the waste.)

**Recommendation:** Eliminate the content-side duplication. Transfer the Blob once (MessageChannel/port with a transferable, or have the preview fetch from a single SW-held Blob URL) so the SW need not re-push chunks, and request the preview lazily then free it. Lower the per-chunk size (1-4MB) to reduce peak buffers and serialization spikes. Note offscreen's `this.videoUrl` blob: URL (`main.js:546`) is scoped to the offscreen context and is not directly loadable by the content page-world `<video>` — which is likely why the base64 round-trip exists.

### 10. webRequest tracking on `<all_urls>` accumulates every request with an O(n²) update pattern
**File:** `utils/networkTracking.ts` — push at 43, `modifyOnSpot` `findIndex` 20-30, listeners 119-139

`startTrackingNetwork` registers `onBeforeRequest`/`onBeforeSendHeaders`/`onCompleted`/`onErrorOccurred` on `<all_urls>` (in desktop mode: across all tabs). Every request is pushed into the unbounded `rawRequests` array (43), with POST bodies decoded and stored verbatim (35-41). `modifyOnSpot` does `rawRequests.findIndex(r => r.requestId === id)` on every header/complete/error event (22/49/53/57) — O(N²) linear scans over a never-pruned array (`getFinalRequests` runs once at `background.ts:607`). The 3-min hard cap bounds total volume, so impact is moderate rather than severe.

**Recommendation:** Index `rawRequests` by `requestId` in a Map for O(1) lookup (eliminates the three `findIndex` scans per request). Secondarily: truncate large stored bodies, and pass `tabId` in the listener filter for tab-mode.

### 11. Debugger network tracking captures full response bodies for every request and never trims; desktop mode leaks per-tab maps
**File:** `utils/networkDebuggerTracking.ts` — `Network.getResponseBody` 78-84, `requestMaps` growth 47-62

With `useDebugger` on, `loadingFinished` issues `Network.getResponseBody` for every non-OPTIONS request and stores the full text/JSON/HTML/JS/CSS body in `requestMaps[tabId][reqId].responseBody` (82) with no size cap (base64 responses are stored as the literal `'base64 payload'`). `requestMaps` grows for the whole session; in desktop mode `onActivated` attaches the debugger and creates a fresh per-tab map for every visited tab, and `onRemoved` never clears it — so bodies for tabs the user left long ago remain buffered in the SW until stop, holding many MBs.

**Recommendation:** Truncate stored `responseBody` beyond ~32-64KB, skip `getResponseBody` for filtered-out resource types (img/font/media/script), and call `resetMap(tabId)`/`stopDebugger(tabId)` from `onRemoved` for desktop recordings.

### 12. Desktop tab-follow attaches a debugger to each new tab but never detaches the old one; discard/restart paths never tear down network capture
**File:** `entrypoints/background.ts` — `tabs.onActivated` 365-367; `ort:stop` 602-606

In desktop mode with `useDebugger` + `networkLogs`, every switched-to tab triggers `attachDebuggerToTab(tabId)` (366), accumulating attached tabs; the previous tab's debugger is never detached on switch (only `content:unmount` is pushed, 383), so the "started debugging this browser" banner accumulates across every visited tab for the session. Worse, `discardActiveRecording()` (via `tabs.onRemoved`, 393), `ort:discard` (554) and `ort:restart` never call `stopDebugger()`/`stopTrackingNetwork()` — only the happy-path `ort:stop` does — so after a discard, debuggers stay attached and webRequest listeners stay live until the SW is recycled, and stale state can bleed into a later recording in the same SW lifetime.

**Recommendation:** Detach the previous tab's debugger on switch (`stopDebugger(prevTab)`), and crucially call `stopDebugger()`/`stopTrackingNetwork()` inside `discardActiveRecording()` and the `ort:discard`/`ort:restart` handlers so capture is always torn down on session end.

### 13. `sendToTab` retries up to 5s per recording message; navigation/tab-switch hot paths can stack multi-second stalls
**File:** `entrypoints/background.ts` — `sendToTab` 117-140; callers `onCompleted` 339, `onActivated` 368, `startRecording` 293

`sendToTab` loops 50× with a fixed 100ms delay (and re-injection at attempt 15), i.e. up to ~5s of blocking awaits before giving up. It is awaited on the navigation-completion and desktop tab-follow paths. On pages where the content script genuinely can't run (chrome://, web store, PDF viewer, blocked CSP), every follow event pays the full 5s, during which the `previousTab` `recState` write (`onActivated` 385) is delayed and rapid tab switching can interleave stale follows. These are SW-internal stalls, not page jank. (The duplicate-UI concern is mitigated by the `recState === 'recording'` guard at `index.tsx:288`.)

**Recommendation:** Detect un-injectable URLs up front and skip them, cap retries much lower for follow events with exponential backoff, and decouple the `previousTab` `recState` write from the (potentially failing) `sendToTab`.

### 14. `sendToTab`/`pushToTab` type their args as `any`, defeating the typed protocol
**File:** `entrypoints/background.ts` — `sendToTab` 117-121; `pushToTab` 143-147

The entire purpose of `utils/messaging.ts` is a typed `ProtocolMap`, but the two functions through which background sends *every* background→content message declare `type: any, data: any`. All `content:mount`/`content:start`/`content:video-chunk`/`notif:display` sends lose compile-time checking of both the message key and payload shape — a typo or wrong field in the 8-field `content:start` payload (293-307) would not be caught by `tsc`. This is the single largest typing gap introduced by the refactor, on the hottest path. (A wrong message name would still likely surface at the content-side `onMessage` handler, so no runtime impact.)

**Recommendation:** Make these generic over `keyof ProtocolMap`, mirroring `notifyPopup` (`messaging.ts:155-161`). Use `notifyPopup`'s variadic/conditional arg handling rather than a literal `data: Parameters<ProtocolMap[T]>[0]`, which would break existing zero-arg calls like `pushToTab("content:unmount", undefined, ...)` (275/383) and `pushToTab("content:stop", undefined, ...)` (494).

### 15. `sendToTab` re-injection can create a second content-script instance with duplicate listeners
**File:** `entrypoints/background.ts` — `sendToTab`/`reinjectContent`, lines 100-140

When delivery fails ≥15 attempts (~1.5s), `reinjectContent()` runs `scripting.executeScript({ files: ["/content-scripts/content.js"] })` (102-105). If the original content script is alive but merely slow (a >1.5s post-navigation init or stalled round-trip), this injects a second copy. Because the script never unregisters its runtime/window message listeners on context invalidation, subsequent `content:start`/`content:video-chunk`/`bump-*` messages get handled twice: two `ControlsBox` UIs can mount, clicks/logs get double-counted, and `injected.js` can inject twice; the stale instance's 1s intervals leak for the page's lifetime. The trigger is a narrow ~1.5s-failure race, but when it fires the corruption is real.

**Recommendation:** Set a sentinel (window property or `<html>` data attribute) in `main()` and bail if present, or gate re-injection on a cheap dedicated "are-you-there" ping rather than a fixed retry count of heavier messages. Additionally register the IPC listeners via `ctx` (or remove them in `ctx.onInvalidated`) so an invalidated instance stops handling messages and clears its intervals.

### 16. Captured audio is routed to `audioCtx.destination` (speakers), causing audible feedback for desktop + system audio
**File:** `entrypoints/offscreen/main.js` — `_getStream`, line 494

When the captured stream has audio tracks, `tabSource` is connected both to the mix destination (for recording) and to `audioCtx.destination` (real speakers) at 494. For tab capture this passthrough is desirable. But the branch is unconditional and also runs for desktop (`'monitor'`) capture where `audio:true` requests system/loopback audio — routing captured system audio back to the speakers creates an audible feedback loop. (Bounded in practice: only occurs if the user opts into "share system audio", and Chrome doesn't offer system-audio capture for full-screen `monitor` surface on macOS — mainly a Windows / tab-window-surface case.)

**Recommendation:** One-line guard — only connect `tabSource` to `audioCtx.destination` when `type === 'tab'`; for desktop/system-audio capture connect to `mixDest` only.

### 17. `debugger` permission grants broad capability; recordings silently bypass scrubbing when enabled
**File:** `wxt.config.ts` — permissions line 31 (`"debugger"`); host_permissions line 11 (`<all_urls>`)

The manifest requests `chrome.debugger` (full CDP: read/modify all traffic, DOM, execute script in attached tabs) — a Web Store review red flag — used solely as an opt-in alternative network-capture mechanism (`useDebugger`, default false). The concrete code-level harm is the scrubbing asymmetry of #3: enabling it captures and uploads sensitive data unfiltered, whereas the default webRequest path scrubs it. Given `<all_urls>` + webRequest already provide network visibility, debugger is a large incremental permission surface for a marginal feature. (Default-off keeps this at medium rather than high.)

**Recommendation:** Fix the filtering gap (#3) as the higher-priority remediation regardless. Strongly consider dropping the `debugger` permission entirely and relying on webRequest + the page-world proxy, removing a high-risk permission and the unfiltered path at once; if it must stay, document the justification for Web Store review.

### 18. Offscreen stop-recording uses a redundant `return await (async () => {})()` wrapper and the whole recorder file is `@ts-nocheck`
**File:** `entrypoints/offscreen/main.js` — `@ts-nocheck` line 1; IIFE wrapper 719-856

(1) The `offscr:stop-recording` handler is an async function whose entire body is an immediately-invoked async arrow that is awaited and returned, adding an extra closure/promise tick and ~140 lines of indentation for zero benefit. (2) The whole 856-line file is `@ts-nocheck`, so the most failure-prone code in the extension (MediaRecorder lifecycle, AudioContext mixing, mime fallback, the chunk message) gets no type checking — it is a `.js` file in a TS codebase specifically to opt out. Functions today; the severity is driven by type checking being disabled on the riskiest component.

**Recommendation:** Inline the IIFE body into the handler (the early returns already return objects). Convert `main.js` to `main.ts`, remove `@ts-nocheck`, and fix the handful of real DOM/webkit typings so the recorder is type-checked against `ProtocolMap`.

---

## Low

### 19. `checkVitals` gates on `locationInt`, dropping final CLS/LCP values reported at page-hide
**File:** `entrypoints/content/eventTrackers.ts` — `checkVitals` 15-20; `vitalsSet` guard 7/22-27

web-vitals callbacks are registered once per page (`vitalsSet`, never reset), and `checkVitals` only forwards a metric if `locationInt !== null` (16). But `onCLS`/`onLCP` report their final values at page-hidden, while Spot calls `stopLocationRecording()` (nulling `locationInt`) *before* the page hides (stop/onClose/onRestart/`content:unmount` at `index.tsx:109/165/253/308`) — so those final metrics are dropped. (The "stale closure / cross-instance" framing in the original finding is inaccurate: `locationInt` is a module-level `export let` read live, so the gate re-opens correctly on re-start in the normal single-context case.)

**Recommendation:** Track recording state with an explicit boolean set by `content:start`/`content:unmount` rather than piggybacking on `locationInt`, or always forward and let the background decide.

### 20. Reconstructed video preview can fail/hole on dropped chunks; `chunksReady` flips on last index regardless
**File:** `entrypoints/content/index.tsx` — `content:video-chunk` 315-318, delivery via `pushToTab` `background.ts:628`; polling loops 86-104 and 113-131

Chunks are delivered fire-and-forget via `pushToTab` (swallows errors, 143-155) and written `videoChunks[msg.index] = msg.data`; completeness is declared purely by `msg.total === msg.index + 1` (317). If the final chunk arrives but an earlier one was dropped, a sparse array results — `base64ToBlob` then throws on the `undefined` hole (`smallUtils.ts:34`) and `SavingControls.tsx:155` has no `.catch()`, so the preview simply never renders (unhandled rejection); a dropped *last* chunk leaves `chunksReady` false and `stop()` times out after 60s. Two separate 100ms loops busy-wait instead of resolving from the message. (The uploaded copy is the SW buffer, so it is unaffected; the dominant single-chunk case is also unaffected. In practice Chrome delivers `sendMessage` in order, so corruption is theoretical — the checkable defect is the fragile readiness signal and redundant polling.)

**Recommendation:** Set `chunksReady` only when a received-count equals `total` (or `videoChunks.filter(Boolean).length === total`), resolve a Promise from the handler instead of polling, and have the content script request resends of missing indices — or drop the content-side chunk path entirely per #9.

### 21. Hand-rolled byte-by-byte base64 encoder instead of native `btoa`/`FileReader.readAsDataURL`
**File:** `entrypoints/offscreen/main.js` — `arrayBufferToBase64` 615-634, `convertBlobToBase64Chunks` 644-676

`arrayBufferToBase64` builds output via `base64 += ...` four single-char appends per 3 input bytes — ~75M append operations aggregate for a ~56MB blob, with per-iteration table lookups and bounds checks, run synchronously. The codebase already reads blobs via `FileReader`, so a native encoder is trivially available. (Bounded: the work is chunked into ~24MB slices so the largest intermediate string is one chunk, runs once at stop in the non-UI offscreen doc, and engines flatten `+=` ropes — real but not hot-path.)

**Recommendation:** Use `FileReader.readAsDataURL` (returns base64 directly, strip the `data:...;base64,` prefix) — also eliminates the separate `readAsArrayBuffer` step. If #9 removes base64 entirely, this cost disappears.

### 22. Click bump fires a runtime message every second even with zero clicks
**File:** `entrypoints/content/eventTrackers.ts` — `startClickRecording` setInterval 84-89

The 1s interval always sends `ort:bump-clicks` with `clicksArray.concat([])` regardless of whether clicks occurred (it doubles as the SW keepalive). The `concat([])` allocates a new array each tick and an empty bump still triggers a full messaging round-trip plus `buffers.clicks.push(...[])` (`background.ts:541`). (The location interval at line 43 only *reads* `href` per tick; it messages only on change, guarded at 45.) The empty bump cannot simply be skipped without breaking the keepalive — which ties to #7.

**Recommendation:** Send a lightweight dedicated keepalive ping (per #7) and skip the clicks message when empty; avoid the `concat([])` by reassigning/splicing the array.

### 23. JWT stored in `chrome.storage.local` in plaintext and logged on decode failure
**File:** `utils/storage.ts` — `jwtTokenStore` line 34; `utils/jwt.ts` `decodeJwt` line 15

The session JWT is persisted in `chrome.storage.local` as plaintext (recoverable from disk on a shared machine, not cleared on browser close), and `decodeJwt` logs the raw decode error (15) which could surface token fragments. The token is correctly removed on logout/401 (`setJWTToken('')` 174, 401 handling 737). Plaintext `storage.local` is the standard MV3 tradeoff; the actionable part only becomes high-impact combined with the attacker-controllable `ingestPoint` (#1).

**Recommendation:** Drop the error object in `decodeJwt` (log a static message), keep token TTL short (refresh flow exists), and most importantly pin the `Authorization` target to a validated OpenReplay origin before attaching the bearer header (`background.ts:198/226/732/778`) so a hijacked `ingestPoint` can't receive the token.

### 24. `notifications.js` renders message via `innerHTML` (latent injection sink, no source check)
**File:** `entrypoints/notifications.js` — `createNotification` 42-65 (`notification.innerHTML = notificationContent`, line 65)

Runs in the page world (injected as a web-accessible `<script src>`), string-interpolates `event.data.message` into `innerHTML` (46/65), and listens for `ornotif:display` on window with no origin/source check. Today values originate from the extension, so it is not currently page-controlled — but it's a classic DOM-XSS sink: any future path that lets page/network-derived text reach `message` yields script execution. (Because it runs in the page's own world, a page posting its own `ornotif:display` is self-XSS in its own origin, no extension-privilege gain — hence low.)

**Recommendation:** Use `textContent` for the message span, and add `if (event.source !== window) return;` plus a shape check in `handleMessage`. Apply the same to the `ornotif:copy` branch (copies `event.data.url` to clipboard with no source check).

### 25. `frameRate` constraint placed at the top level of `MediaStreamConstraints` and silently ignored
**File:** `entrypoints/offscreen/main.js` — `getRecordingSettings` 78-82, `_getStream` desktop branch 457-463

`frameRate` is a sibling of `audio`/`video`, but `getDisplayMedia`/`getUserMedia` only honor it inside the `video` member. The desktop branch spreads `{ ...constraints, video: {...} }`, leaving `frameRate` a top-level key the spec ignores, so the intended 20-30fps ceiling is never applied (the tab branch uses only mandatory `chromeMediaSource` constraints and ignores it entirely). Soft hint, so capture just runs at the source default — does not break recording.

**Recommendation:** Move `frameRate` into the `video` member: `video: { ...constraints.video, frameRate: {min:20,max:30}, displaySurface:'monitor' }` and drop the top-level key. (The tab branch needs `maxFrameRate` under its legacy `mandatory` block separately if capping is desired there.)

### 26. `getVideoData`/`stop` can resolve with an empty blob when `mRecorder.stop()` throws
**File:** `entrypoints/offscreen/main.js` — `stop()` 417-432, `getVideoData` 593-609

If `mRecorder.stop()` throws (e.g. recorder already `inactive`), the catch resolves `_stopResolve()` (425) but `_handleStop` never runs, so `recorded` stays false and `videoBlob` null; `getVideoData` returns `{ blob: null }` and the handler discards a recording that may have buffered chunks, firing the empty-blob diagnostic for what is really a benign double-stop. Edge case (requires a wrong-state stop).

**Recommendation:** In the `stop()` catch, build the blob from `this.chunks` (or invoke `_handleStop`) before resolving, so a stop-state error doesn't discard captured data; alternatively reject so diagnostics reflect a stop failure rather than a false "empty capture".

### 27. `ort:countend` returns `true` even when `startRecording` failed internally
**File:** `entrypoints/background.ts` — `onMessage("ort:countend")` 436-476; `messaging.ts:72`

Declared to return `boolean` ("countdown accepted"), the handler returns `true` at 475 even though `startRecording` (470/473) is awaited but swallows errors and returns void — conflating "countdown accepted" with "recording started". Practical impact is minimal: the only consumer (`ControlsBox.tsx:66`) discards the boolean and polls `getInitState()` instead. It's a misleading contract that invites future misuse.

**Recommendation:** Have `startRecording` return a `boolean` success and propagate it (`return await startRecording(...)`) so the typed boolean genuinely means "recording started".

### 28. Two alarms fire every minute doing overlapping JWT work; `refreshToken` has no busy guard
**File:** `entrypoints/background.ts` — `armAlarms` 158-161, `onAlarm` 397-400, `refreshToken` 180-211, `pingJWT` 213-232

`ALARM_REFRESH` and `ALARM_PING` both run every minute. `pingJWT` GETs `/ping` and on failure calls `refreshToken()` again, while the refresh alarm independently may refresh. There's no busy guard on `refreshToken` (unlike `checkTokenValidity`'s `checkBusy`), and both alarms wake the SW every 60s indefinitely while logged in. (The duplicate-refresh race is bounded by `refreshToken`'s early return when `!isTokenExpired`, 190-193; refresh is a GET, not POST — churn, not a correctness defect.)

**Recommendation:** Collapse into a single alarm that refreshes only near expiry (`isTokenExpired` exists) and pings on a longer cadence (5-10 min). Add a busy guard to `refreshToken`.

### 29. Dead code: `convertBlobToBase64`, `slackChannels`, `patchRecState`
- **`entrypoints/content/utils.ts` 19-43** — `convertBlobToBase64` (and unused `hardLimit` at line 19) is exported but imported by nobody; it's a stale, divergent base64 chunker (string-chunks a data URL, producing non-decodable fragments) duplicating the offscreen `convertBlobToBase64Chunks`. Delete both.
- **`entrypoints/background.ts` 67** — `slackChannels` is a never-mutated empty array threaded into three `content:start` sends (298/344/373) and required on the protocol type (`messaging.ts:104`), leftover from a removed Slack feature. The content receiver (`index.tsx:287`) doesn't read it. Remove from background.ts and `messaging.ts:104` only — there is no `ControlsBox`/`RecordingControls` consumer to update.
- **`utils/storage.ts` 88-93** — `patchRecState` (read-merge-write) is unused; background uses its own mirror-aware `setRecState` (77-81). A future caller using `patchRecState` would bypass the in-memory mirror and reintroduce the #8 drift. Delete it (the parallel `patchSettings` *is* used, so this is a copy-paste artifact).

**Recommendation:** Delete all three.

### 30. Redundant double `safeApiUrl` wrap when building the ping URL
**File:** `entrypoints/background.ts` — `pingJWT`, line 222

`safeApiUrl(\`${safeApiUrl(settings.ingestPoint)}/spot/v1/ping\`)` — the inner call already produces the canonical host with no trailing slash, so the outer wrap is a pure no-op that only adds a second URL parse. Every other call site (`refresh` 194, `saveSpot` 717) wraps once; the asymmetry reads like a copy-paste bug.

**Recommendation:** Drop the outer wrap: `const url = \`${safeApiUrl(settings.ingestPoint)}/spot/v1/ping\`;`. Preserve the `/spot/v1/ping` path (it legitimately differs from the refresh endpoint).

### 31. `videoKeyFrameIntervalDuration` is a non-standard MediaRecorder option with no effect
**File:** `entrypoints/offscreen/main.js` — `recorderOpts`, line 289

`videoKeyFrameIntervalDuration: 1000` is not a recognized MediaRecorder option (only `mimeType`/`audioBitsPerSecond`/`videoBitsPerSecond`/`bitsPerSecond`) and is silently ignored by Chromium; keyframe cadence is driven by `start(1000)`'s timeslice (which governs blob-boundary granularity, not GOP spacing). Misleading because it implies a guaranteed 1s keyframe interval relevant to the SavingControls trim feature that isn't enforced.

**Recommendation:** Remove it; document that trim accuracy depends on encoder keyframes and the 1s timeslice (no MediaRecorder API forces a keyframe interval in Chrome).

### 32. No automated tests for pure, easily-testable utilities
**File:** `utils/networkTrackingUtils.ts` (whole file); `content/utils.ts` `formatMsToTime`

The repo has zero test files and no test script/runner in `package.json`. Several pure functions carry real correctness risk only exercisable by recording a live Spot: `mergeRequests`' fuzzy key (`statusCode::method::url::timestamp-rounded-100ms`, 266-267), `filterBody`/`obscureSensitiveData`/`tryFilterUrl` sanitization, `getNetworkRequestType`, and `formatMsToTime` (which has a real bug at `utils.ts:11-12` string-concatenating `'1'` to produce e.g. `'001:00'`, though reachable only in a ~59.5s rounding window under the 3-min cap).

**Recommendation:** Add `vitest` (works out-of-the-box with the existing vite/wxt toolchain) plus a `test` script, and cover the pure utils — these need no browser mocks and lock down the sanitization/merge contracts.

---

## Uncertain (needs confirmation)

### U1. `trackClick` reads `e.target.innerText`/`tagName` without `Element` guards (needs confirmation)
**File:** `entrypoints/content/eventTrackers.ts` — `trackClick` 64-78 — *Low / uncertain*

The handler reads `tagName`/`innerText` off `e.target` and filters Spot-UI self-clicks via `document.querySelector("spot-ui")` + `parentShadowRoot?.contains(e.target)` (65-67). The verifier found this is **not a bug as it stands**: for document-level `click` events `e.target` is always an `Element`, both label assignments have working fallbacks (no crash), and the shadow-root retargeting filter works correctly today (host `contains` host). It is fragile only if the UI is ever mounted open/inline differently — i.e. a robustness/hardening suggestion, arguably informational, not an observable defect.

**Recommendation:** Use `e.composedPath()` to reliably detect clicks inside the spot-ui shadow root and guard with `e.target instanceof Element` before reading properties. Defensive hygiene only.

---

## Quick wins (low-effort, high-value)
- **#1** — add `event.source === window` + origin allowlist to the `orspot:*` handlers (the single most important fix; the gating code is a few lines).
- **#3 / #17** — route the debugger and proxy capture paths through the existing `filterHeaders`/`filterBody`/`obscureSensitiveData`/`tryFilterUrl` scrubbers.
- **#4** — detach the old recorder's handlers before stopping it in the EncodingError fallback (one block).
- **#16** — wrap the `audioCtx.destination` connection in `if (type === 'tab')` (one line).
- **#6** — add the early `return` after `notifyError` in `saveSpot`.
- **#14** — make `sendToTab`/`pushToTab` generic over `keyof ProtocolMap` (mirror `notifyPopup`).
- **#10** — index `rawRequests` by `requestId` in a Map.
- **#24** — `textContent` + `event.source` guard in `notifications.js`.
- **#25 / #31** — move `frameRate` into `video`; delete the no-op `videoKeyFrameIntervalDuration`.
- **#29 / #30** — delete `convertBlobToBase64`, `slackChannels`, `patchRecState`; drop the double `safeApiUrl` wrap.
- **#32** — add `vitest` + a few unit tests for the sanitizers, `mergeRequests`, and `formatMsToTime` (also fixes the real `formatMsToTime` bug).

## Larger efforts (architectural, worth scheduling)
- **#2 + #7 + #9** — eliminate the SW as the sole owner of capture data: persist event buffers to session storage incrementally, drive keepalive from the offscreen document (`offscr:tick`), and have the offscreen doc own/upload the video Blob directly instead of routing base64 through the SW and double-storing it in the content script. This single restructuring resolves the largest reliability and OOM risks together.
- **#8** — collapse the dual source of truth for `recState`: drop the in-memory mirror and always read the session store (or gate handlers behind an awaited hydration promise).
- **#3 (full)** — factor a single shared normalize-and-scrub function used by the webRequest, debugger, and proxy capture paths so filtering can never be forgotten per-path; reconsider whether response bodies should be captured at all.
- **#17** — drop the `chrome.debugger` permission entirely and standardize on webRequest + the page-world proxy, removing both a Web Store red-flag permission and an unfiltered code path.
- **#18** — convert `offscreen/main.js` to `.ts`, remove `@ts-nocheck`, and type-check the recorder against `ProtocolMap`.
- **#15** — make the content script idempotent (running-instance sentinel) and tie IPC listeners to `ctx` so re-injection and context invalidation never leave duplicate/leaked listeners.