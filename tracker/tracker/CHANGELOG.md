## 16.2.0

- css batching and inlining via (!plain mode will cause fake text nodes in style tags occupying 99*10^6 id space, can conflict with crossdomain iframes!)

```
inlineCss: 0 | 1 | 2 | 3

/**
* export enum InlineCssMode {
*  0 = None,
*  1 = inlineRemoteCss,
*  2 = inlineRemoteCss + forceFetch
*  3 = inlineRemoteCss + forceFetch + forcePlain
* }
* */
```

## 16.1.4

- bump proxy version to .3

## 16.1.3

- same as previous, more strict checks for body obj

## 16.1.2

- bump networkProxy version (prevent reusage of body streams, fix for sanitizer network body checks)

## 16.1.1

- fixing debug logs from 16.1.0

## 16.1.0

- new `privateMode` option to hide all possible data from tracking
- update `networkProxy` to 1.1.0 (auto sanitizer for sensitive parameters in network requests)
- reduced the frequency of performance tracker calls
- reduced the number of events when the user is idle

## 16.0.3

- better handling for local svg spritemaps

## 16.0.2

- fix attributeSender key generation to prevent calling native methods on objects

## 16.0.1

- drop computing ts digits
- drop logLevel for "! node is already observed" message (not critical)
- prevent crashes on buffer upload if msg value is wrapped in proxy via other frameworks
- add support for singleton (moved from 15.x.x)

## 16.0.0

- **[breaking]** new string dictionary message format

## 15.1.0

- move domparser for sprites under observer code for better SSR support
- introduce singleton approach for tracker
```js
import { tracker } from '@openreplay/tracker'

// configure it once
tracker.configure({ ...options })

// use it anywhere
// .../main/app.tsx
import { tracker } from '@openreplay/tracker'
tracker.start()
```

## 15.0.7

- fix for svg sprite handling

## 15.0.6

- fix for batch sending to prevent proxy wrappers

## 15.0.5

- update medv/finder to 4.0.2 for better support of css-in-js libs
- fixes for single tab recording
- add option to disable network completely `{ network: { disabled: true } }`
- fix for batching during offline recording syncs

## 15.0.4

- support for spritemaps (svg with `use` tags)
- improvements for missing resources tracking

## 15.0.3

- fixing `failuresOnly` option for network

## 15.0.2

- fixing crossdomain access check

## 15.0.1

- update dependencies
- fix for cjs build process

## 15.0.0

- new webvitals messages source (new msg type)
- new structure for string dictionary (new msg type)

## 14.0.14

- more improvements for crossdomain iframe tracking

## 14.0.13

- fixes for restart logic
- fixed top context check in case of crossdomain placement
- fixed crossdomain restart logic (when triggered via assist)
- keep allowstart option on manual stop

## 14.0.11 & .12

- fix for node maintainer stability around `#document` nodes (mainly iframes field)

## 14.0.10

- adjust timestamps for messages from tracker instances inside child iframes (if they were loaded later)
- restart child trackers if parent tracker is restarted
- fixes for general stability of crossdomain iframe tracking
- refactored usage of memory for everything regarding dom nodes to prevent possible memory leaks (i.e switched Map/Set to WeakMap/WeakSet where possible)
- introduced configurable Maintainer to drop nodes that are not in the dom anymore from memory;

```
interface MaintainerOptions {
    /**
    * Run cleanup each X ms
    *
    * @default 30 * 1000
    * */
  interval: number
    /**
    * Maintainer checks nodes in small batches over 50ms timeouts
    *
    * @default 2500
    * */
  batchSize: number
    /**
    * @default true
    * */
  enabled: boolean
}

new Tracker({
    ...yourOptions,
    nodes: {
        maintainer: {
            interval: 60 * 1000,
            batchSize: 2500,
            enabled: true
        }
    }
})
```

- added `startCallback` option callback to tracker.start options (returns `{ success: false, reason: string } | { success: true, sessionToken, userUUID, sessionID }`)

## 14.0.9

- more stable crossdomain iframe tracking (refactored child/parent process discovery)
- checks for bad start error

## 14.0.8

- use separate library to handle network requests ([@openreplay/network-proxy](https://www.npmjs.com/package/@openreplay/network-proxy))
- fixes for window.message listeners

## 14.0.7

- check for stopping status during restarts
- restart if token expired during canvas fetch

## 14.0.6

- support feature off toggle for feature flags and usability testing
- additional checks for canvas snapshots

## 14.0.5

- remove canvas snapshot interval if canvas is gone

## 14.0.4

- remove reject from start

## 14.0.3

- send integer instead of float for normalizedX/Y coords (basically moving from 0-100 to 0-10000 range)

## 14.0.2

- fix logger check

## 14.0.0 & .1

- titles for tabs
- new `MouseClick` message to introduce heatmaps instead of clickmaps
- crossdomain iframe tracking functionality
- updated graphql plugin and messages

## 13.0.2

- more file extensions for canvas

## 13.0.1

- moved canvas snapshots to webp, additional option to utilize useAnimationFrame method (for webgl)
- simpler, faster canvas recording manager

## 13.0.0

- `assistOnly` flag for tracker options (EE only feature)

## 12.0.12

- fix for potential redux plugin issues after .11 ...

## 12.0.11

- better restart on unauth (new token assign for long sessions)
- more safeguards around arraybuffer and dataview types for network proxy

## 12.0.10

- improved logs for node binding errors, full nodelist clear before start, getSessionInfo method

## 12.0.9

- moved logging to query

## 12.0.8

- better logging for network batches

## 12.0.7

- fixes for window.open reinit method

## 12.0.6

- allow network sanitizer to return null (will ignore network req)

## 12.0.5

- patch for img.ts srcset detector

## 12.0.4

- patch for email sanitizer (supports + now)
- update fflate version for better compression
- `disableCanvas` option to disable canvas capture
- better check for adopted stylesheets in doc (old browser support)

## 12.0.3

- fixed scaling option for canvas (to ignore window.devicePixelRatio and always render the canvas as 1)

## 12.0.2

- fix for canvas snapshot check

## 12.0.1

- pause canvas snapshotting when its offscreen

## 12.0.0

- offline session recording and manual sending
- conditional recording with 30s buffer
- websockets tracking hook

## 11.0.5

- add method to restart canvas tracking (in case of context recreation)
- scan dom tree for canvas els on tracker start

## 11.0.4

- some additional security for canvas capture (check if canvas el itself is obscured/ignored)

## 11.0.3

- move all logs under internal debugger
- fix for XHR proxy ORSC 'abort' state

## 11.0.1 & 11.0.2

- minor fixes and refactoring

## 11.0.0

- canvas support
- some safety guards for iframe components
- user testing module

## 10.0.2

- fix default ignore headers

## 10.0.1

- network proxy api is now default turned on

## 10.0.0

- networkRequest message changed to include `TransferredBodySize`
- tracker now attempts to create proxy for beacon api as well (if its in scope of the current env)
- safe wrapper for angular apps
- better browser lag handling (and some performance improvements as a bonus)

## 9.0.11

- new `resetTabOnWindowOpen` option to fix window.open issue with sessionStorage being inherited (replicating tabId bug), users still should use 'noopener=true' in window.open to prevent it in general...
- do not create BC channel in iframe context, add regeneration of tabid incase of duplication

## 9.0.10

- added `excludedResourceUrls` to timings options to better sanitize network data

## 9.0.9

- Fix for `{disableStringDict: true}` behavior

## 9.0.8

- added slight delay to iframe handler (rapid updates of stacked frames used to break player)

## 9.0.7

- fix for `getSessionURL` method

## 9.0.6

- added `tokenUrlMatcher` option to network settings, allowing to ingest session token header to custom allowed urls

## 9.0.5

- same fixes but for fetch proxy

## 9.0.2 & 9.0.3 & 9.0.4

- fixes for "setSessionTokenHeader" method

## 9.0.1

- Warning about SSR mode
- Prevent crashes due to network proxy in SSR

## 9.0.0

- Option to disable string dictionary `{disableStringDict: true}` in Tracker constructor
- Introduced Feature flags api
- Fixed input durations recorded on programmable autofill
- change InputMode from enum to const Object

## 8.1.2

- option to disable string dictionary `{disableStringDict: true}` in Tracker constructor

## 8.1.1

[collective patch]

- Console and network are now using proxy objects to capture calls (opt in for network), use ` { network: { useProxy: true } }` to enable it
- Force disable Multitab feature for old browsers (2016 and older + safari 14)

## 8.0.0

- **[breaking]** support for multi-tab sessions

## 7.0.4

- option to disable string dictionary `{disableStringDict: true}` in Tracker constructor

## 7.0.3

- Prevent auto restart after manual stop

## 7.0.2

- fixed header sanitization for axios causing empty string in some cases

## 7.0.1

- fix time inputs capturing
- add option `{ network: { captureInIframes: boolean } }` to disable network tracking inside iframes (default true)
- added option `{ network: { axiosInstances: AxiosInstance[] } }` to include custom axios instances for better tracking

## 7.0.0

- **[breaking]** added gzip compression to large messages
- fix email regexp to significantly improve performance

## 6.0.2

- fix network tracking for same domain iframes created by js code

## 6.0.1

- fix webworker writer re-init request
- remove useless logs
- tune mouse thrashing detection
- fix iframe handling
- optimise node counting for dom drop

## 6.0.0

**(Compatible with OpenReplay v1.11.0+ only)**

- **[breaking]:** Capture mouse thrashing, input hesitation+duration, click hesitation
- Capture DOM node drop event (>30% nodes removed)
- Capture iframe network requests
- Detect cached requests to img, css and js resources; send transferred size
- added `{ mouse: { disableClickmaps: boolean } }` to disable calculating el. selectors
- added `{ mouse: { minSelectorDepth?: number; nthThreshold?: number; maxOptimiseTries?: number }` for selector finding optimizations

## 5.0.2

- fixed inline css loading in specific cases when assets gets around min flush size

## 5.0.1

- Re-init worker after device sleep/hybernation
- Default text input mode is now Obscured
- Use `@medv/finder` instead of our own implementation of `getSelector` for better clickmaps experience

## 5.0.0

**(Compatible with OpenReplay v1.10.0+ only)**

- **[breaking]:** string dictionary to reduce session size
- Added "tel" to supported input types
- Added `{ withCurrentTime: true }` to `tracker.getSessionURL` method which will return sessionURL with current session's timestamp
- Added Network module that captures fetch/xhr by default (with no plugin required)
- Use `timeOrigin()` instead of `performance.timing.navigationStart` in ResourceTiming messages
- Added app restart when service worker died after inactivity (mobile safari)

## 4.1.8

- recalculate timeOrigin on start to prevent wrong timestamps on "sleeping" sessions

## 4.1.7

- resend metadata on start

## 4.1.6

- remove log that potentially caused crashed during slow initial render
