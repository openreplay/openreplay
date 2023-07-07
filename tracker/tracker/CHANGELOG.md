# 9.0.0

- Option to disable string dictionary
- Introduced Feature flags api
- Fixed input durations recorded on programmable autofill

# 8.1.1

[collective patch]

- Console and network are now using proxy objects to capture calls (opt in for network), use ` { network: { useProxy: true } }` to enable it
- Force disable Multitab feature for old browsers (2016 and older + safari 14)

# 8.0.0

- **[breaking]** support for multi-tab sessions

# 7.0.3

- Prevent auto restart after manual stop

# 7.0.2

- fixed header sanitization for axios causing empty string in some cases

# 7.0.1

- fix time inputs capturing
- add option `{ network: { captureInIframes: boolean } }` to disable network tracking inside iframes (default true)
- added option `{ network: { axiosInstances: AxiosInstance[] } }` to include custom axios instances for better tracking

# 7.0.0

- **[breaking]** added gzip compression to large messages
- fix email regexp to significantly improve performance

# 6.0.2

- fix network tracking for same domain iframes created by js code

# 6.0.1

- fix webworker writer re-init request
- remove useless logs
- tune mouse thrashing detection
- fix iframe handling
- optimise node counting for dom drop

# 6.0.0

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
