# openreplay (Flutter) — notes for agents

Flutter session replay SDK. Pure Dart wire protocol plus one platform channel;
it does **not** wrap the standalone iOS/Android trackers.

Behavioural reference is the iOS SDK (`github.com/openreplay/ios-tracker`).
When something is ambiguous, match the Swift.

## Layout

```
lib/openreplay.dart          public exports
lib/src/openreplay.dart      OpenReplay singleton, lifecycle
lib/src/proto/               varint writer + generated messages
lib/src/transport/           session start, ingest, frames, collector
lib/src/capture/             frame capture, masking
lib/src/listeners/           touches, nav, logs, crashes, perf, network
ios/openreplay/Sources/      Swift: JPEG encode, metrics, Keychain
android/src/main/kotlin/     Kotlin: same, Keystore-backed storage
```

## Things that silently break if changed

- **`lib/src/proto/messages.gen.dart` is generated.** Edit
  `mobs/templates/tracker~tracker-flutter~lib~src~proto~messages.gen.dart.erb`
  and run `cd mobs && ruby run.rb`, then `gofmt -w ../backend/pkg/messages`
  (`run.rb` regenerates every target and emits unformatted Go — that is what
  `generate.sh` does). Schema lives in `mobs/mobile_messages.rb`.
- **Tracker version must stay ≥ 1.0.9.** `checkMobileTrackerVersion` in
  `backend/pkg/sessions/api/mobile/handlers.go` rejects lower with 426. It is
  `kTrackerVersion` in `lib/src/openreplay.dart`, kept equal to the pubspec
  version.
- **`platform` must be `ios` or `android`.** Anything else fails the backend's
  `IsMobile()` gate and the player's platform switch.
- **Performance event names are matched literally by the player.** It charts
  only `background`, `memoryUsage`, `mainThreadCPU` and warns on
  `thermalState`, `memoryWarning`, `lowDiskSpace`, `isLowPowerModeEnabled`,
  `batteryLevel`. Renaming one drops it with no error.
- **`orientation` uses UIDeviceOrientation numbering on both platforms**
  (1 portrait, 2 upside-down, 3 landscapeLeft, 4 landscapeRight). The player
  matches raw 3 and 4, so Android maps Surface rotation onto these.
- **Never match render objects or widgets by type name.** `--obfuscate`
  reduces `runtimeType.toString()` to noise. Use `is` checks and keys.
- **Zero pub dependencies is deliberate.** UUIDs come from `Random.secure()`,
  multipart is hand-built, gzip from `dart:io`. Anything native goes through
  the existing `openreplay` method channel.

## Deliberate divergences from the Swift

- **Failed batches roll `nextMessageIndex` back.** The iOS SDK advances it
  before sending and never restores it, so a retry ships under a higher
  `firstIndex` and gaps the sequence the player orders on. Pinned by a test.
- **Capture is change-driven, not timer-driven.** An idle Flutter UI schedules
  no frames, so the post-frame callback never fires; a 10s heartbeat is the
  floor. `_capture` also throttles to the server-provided rate.
- **Resolution is capped by long edge** (`targetLongEdge`, default 720) rather
  than a fixed 1.25 scale, so cost does not swing ~2.3x with screen size.
- **Touch labels come from hit-tested text**, not UIKit-style class names.
- **Frames-only.** The legacy tar container is not implemented, so a backend
  older than v1.26.0 records events but no screen.

## Semantics worth preserving

- `pause()` stops capture, flushes, and **keeps** buffers (backgrounding);
  `stop()` is teardown and discards them. Same split as the iOS SDK.
- Masking is a second raster pass. Drawing into the widget tree would change
  what the user sees.
- Crash, log and `HttpOverrides` hooks all **chain** to whatever was installed
  before — other SDKs claim the same slots.
- The ingest `HttpClient` is constructed directly so tracker traffic is never
  captured by our own network listener.
- Frames are never persisted to disk; only the final message batch is
  (`lateMessages.dat`), matching the iOS SDK.

## Commands

```sh
flutter analyze && flutter test        # in package root
cd example && flutter build ios --no-codesign --debug
```

## Known gaps

- Android Kotlin is **not compiled** in CI or locally yet (needs an SDK).
- `wifiOnly` option exists but nothing enforces it.
- `ConditionsManager` not ported: `coldStart`/`triggerRecording` work, but
  server-side condition evaluation does not.
- No Swift Package Manager support: SPM derives package identity from the
  directory name, which is `tracker-flutter`, not `openreplay`. Blocks SPM
  until the directory is renamed. CocoaPods only for now.
- Android reports no `mainThreadCPU` — no per-thread equivalent exists and
  `/proc` self-reads were restricted in API 26+.
- Frame dedupe is exact-hash only; a blinking text cursor still produces
  frames. Perceptual (dHash) dedupe is a possible follow-up.
