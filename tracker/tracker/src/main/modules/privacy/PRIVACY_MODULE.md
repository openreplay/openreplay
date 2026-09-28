# Privacy module (draft, not wired)

`src/main/modules/privacy/` is a self-contained consent/privacy controller. Nothing in the
tracker imports it yet, so it adds 0 bytes to the bundle today. Standalone it is ~6.1 KB min /
~2.1 KB gzip.

Goal: one object decides **whether** we record, **what** we store on the device and **how** we
identify the visitor, based on consent, browser signals (GPC/DNT), Google Consent Mode or any
custom rule. The tracker only asks it questions at a handful of existing choke points.

## Files

| file | contents |
|---|---|
| `policy.ts` | types + `resolvePolicy()`: pure mapping from consent + signals to a `Policy` |
| `storage.ts` | `PolicyStorage`: drop-in `Storage` that is in-memory until storage consent exists |
| `signals.ts` | GPC / DNT reading, Google Consent Mode (`dataLayer`) watcher |
| `index.ts` | `PrivacyManager`: state, `setConsent`, `onChange`, `ready()`, storage factory, user id hashing |
| `../../../tests/privacy.unit.test.ts` | 25 tests |

## Concepts

**Consent** (what the visitor said), each `'granted' | 'denied' | 'pending'`:

- `recording` – session replay and events at all
- `storage` – persisting ids on the device (localStorage, sessionStorage, cookies)

**Signals** (what the browser says): `gpc` (`navigator.globalPrivacyControl`), `dnt`.

**Policy** (what the tracker may do; the only thing integration code reads):

```ts
interface Policy {
  record: 'none' | 'private' | 'full'
  storage: 'none' | 'session' | 'persistent'
  identity: 'none' | 'hashed' | 'raw'
  networkPayloads: boolean
}
```

### Default mapping

| recording | storage | → record | storage | identity | networkPayloads |
|---|---|---|---|---|---|
| granted (or pending in optOut) | granted (or pending in optOut) | full | persistent | raw | ✓ |
| granted | denied | full | none (cookieless) | hashed | ✓ |
| denied | any | none (or `private` with `deniedRecording: 'private'`) | none | none | ✗ |
| pending in optIn | any | none | none | none | ✗ |

- GPC (on by default) and DNT (off by default) count as `denied` for both categories. Page consent
  can override them only with `consentOverridesSignals: true`, and only while it is explicit:
  setting a category back to `'pending'` drops the override.
- `hashUserId: true` always hashes the user id.
- `resolvePolicy(policy, input)` option has the final word: regional laws, a CMP cookie, a
  per-project rule, etc. `storage: 'session'` exists for such custom rules (e.g. "session-only
  storage in the EU"); the default mapping never produces it.

## API

```ts
import PrivacyManager from './modules/privacy/index.js'

const privacy = new PrivacyManager({
  mode: 'optIn',                 // 'optOut' (default) | 'optIn'
  respectGPC: true,
  respectDNT: false,
  consentOverridesSignals: false,
  deniedRecording: 'none',       // or 'private'
  hashUserId: false,
  googleConsentMode: true,       // follow gtag('consent', ...) via window.dataLayer
  consent: { recording: 'pending', storage: 'pending' },
  storageKeys: ['__openreplay_token', '__openreplay_uuid' /* ... */],
  resolvePolicy: (policy, { consent, signals }) => policy,
})

privacy.getPolicy()            // current Policy
await privacy.ready()          // resolves when not waiting for an optIn decision
privacy.setConsent({ recording: 'granted', storage: 'denied' })   // from the page / CMP
privacy.onChange(({ prev, next, source, revoked }) => { /* restart / stop */ })
privacy.createStorage('local')  // Storage to hand to App / analytics
await privacy.transformUserId('john@acme.com') // null | sha256 hex | raw
privacy.describe()             // { policy, consent, signals, source } for session metadata
```

Storage behaviour (`PolicyStorage`):

- not allowed → reads/writes go to memory (cookieless, lives as long as the page);
- consent granted later → memory values are copied to the real storage;
- consent withdrawn → keys it wrote (plus `storageKeys`) are erased from the device;
- `storageKeys` are also erased when a storage is created without storage consent (denied, GPC)
  and when an optIn visitor decides against it; not while optIn is still pending, so a returning
  visitor's ids survive until the CMP replays their choice;
- erasing only ever touches the device: whatever the page already holds (own keys moved to memory
  on revocation, listed or not) stays readable for the rest of the page. Dropping those ids is the
  integration's job (`revoked` → `session.reset()`, step 7);
- never touches keys it didn't write or wasn't told about;
- swallows storage exceptions (private windows, sandboxed iframes).

Google Consent Mode: `default` commands with a `region` are ignored (we don't know the
visitor's region); `update` commands always apply. After `destroy()` the hook is inert even if
another wrapper was installed on top of ours and can't be unhooked.

## Integration plan

Each step is independent and small; the tracker keeps working without the module when the
`privacy` option is absent (current behaviour, zero cost if we lazy-create it).

| # | where | change |
|---|---|---|
| 1 | `index.ts` `Tracker` constructor (next to `checkDoNotTrack()`, ~l.147) | create `PrivacyManager` from a new `options.privacy`; map `respectDoNotTrack` → `respectDNT: true`, keep the early return only when `policy.record === 'none'` **and** mode is not optIn |
| 2 | `app/index.ts` storage resolution (~l.362) and `index.ts` analytics storage (~l.213) | replace `options.localStorage ?? window.localStorage` (both places) with `privacy.createStorage('local', options.localStorage ?? undefined)`; same for session. This single change covers session token, tab id, uuid, page number, offline buffer and all analytics keys |
| 3 | `App.waitStart()` / `start()` (~l.2147 / 2180) | `await privacy.ready()` before `_start`; if `policy.record === 'none'` resolve start with `{ success: false, reason: 'no consent' }` |
| 4 | `Sanitizer` constructor (`app/sanitizer.ts`) | `privateMode = options.privateMode \|\| policy.record === 'private'`. All modules already read `app.sanitizer.privateMode` |
| 5 | `Session.setUserID` / update callback (`app/session.ts:62-90`, `app/index.ts:384`) | send `await privacy.transformUserId(id)`; skip `Metadata` when `identity === 'none'`. Same for `analytics.people.identify` |
| 6 | `modules/network.ts` `sanitize()` (~l.103) | drop bodies/headers when `!policy.networkPayloads` |
| 7 | `privacy.onChange` handler in `App` | `revoked` → `stop()` + `session.reset()` (+ optional restart in cookieless mode, like Clarity); upgrade from `none` → `start()`; `record` full↔private → restart so the snapshot is re-taken with the new masking |
| 8 | public API (`index.ts`, `singleton.ts`) | `tracker.setConsent(consent)`, `tracker.getPrivacy()` → `privacy.describe()` |
| 9 | analytics SDK constructor (`modules/analytics/index.ts`, `constantProperties.ts`) | today it writes device id, referrer and UTM **before** `start()`; step 2 already routes this to memory until consent. Optionally defer `startAutosend` until `ready()` |
| 10 | start request (`app/index.ts` `_start` ~l.1909) | send `privacy: privacy.describe().policy` so the backend can flag / filter sessions and skip geo enrichment when identity is `none` |

Storage keys to pass as `storageKeys` (from the inventory): `__openreplay_token`,
`__openreplay_token_version`, `__openreplay_pageno`, `__openreplay_reset`, `__openreplay_tabid`,
`__openreplay_uuid`, `or_buffer_1`, `__or_sdk_analytics_token`, `$__or__user_id__$`,
`$__or__distinct_device_id__$`, `$__or__initial_ref__$`, `$__or__utm_params__$`,
`$__or__super_properties__$`. Custom `session_token_key` etc. from options must be added too.

### Not covered by the storage wrapper

- BroadcastChannel tab sync (`app/index.ts:349`): shares the session token between tabs. With
  `storage: 'none'` it should be disabled, otherwise a cookieless session is effectively shared.
- Crossdomain iframes receive the token via `postMessage` — same reasoning.
- Analytics cookie probe (`modules/analytics/utils.ts:120`) writes a real `testcookie` when
  `navigator.cookieEnabled` is undefined.

## Open questions

1. Should GPC be respected by default (legally binding in some US states; Clarity does it)?
   Current default: yes.
2. `recording: denied` → `none` or `private` by default? Current default: `none`.
3. Hashing makes the user id unreadable in the dashboard; do we want a salt per project (so hashes
   can't be matched across products) or plain SHA-256 so customers can search by hashing on their
   side? Current: plain SHA-256, hex.
4. Google Consent Mode: we wrap `dataLayer.push` and keep any existing wrapper. If GTM loads later
   and replaces `push` without chaining, updates are missed — may need a fallback (poll
   `dataLayer.length` on the ticker).
5. Do we want TCF v2 (`__tcfapi`) and other CMPs as adapters? The adapter shape is just
   `(onConsent) => stop`, same as `watchGoogleConsentMode`.
6. When consent flips `denied → granted` mid-page, should we upload the cold-start buffer
   (retroactive recording) or start fresh? Retroactive is nicer but arguably records before consent.
