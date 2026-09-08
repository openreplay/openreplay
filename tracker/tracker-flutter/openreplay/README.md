# OpenReplay for Flutter

Session replay for Flutter apps on iOS and Android: screen recording, touches,
navigation, logs, crashes, performance and network calls.

## Install

```yaml
dependencies:
  openreplay: ^1.0.9
```

Requires Flutter 3.41 or newer, and an OpenReplay backend of v1.26.0 or newer.

## Usage

Wrap the app, then start the tracker. The wrapper provides the repaint boundary
frames are captured from, so it is required.

```dart
import 'package:openreplay/openreplay.dart';

void main() {
  runApp(const OpenReplayWidget(child: MyApp()));
}

// once the first frame is up
await OpenReplay.instance.start(
  projectKey: 'your-project-key',
  serverUrl: 'https://your-instance/ingest', // omit for OpenReplay cloud
);
```

Add the navigator observer to record screen transitions:

```dart
MaterialApp(navigatorObservers: [ORNavigatorObserver()], ...)
```

## Running the example

```sh
cd example
cp .env.example .env      # fill in OR_PROJECT_KEY
flutter run --dart-define-from-file=.env
```

Keys are compile-time constants, so changing `.env` needs a full restart rather
than a hot reload. Screen recording needs a backend of v1.26.0 or newer; older
ones report no frames support and only events are recorded.

## Masking

Wrap anything that must not appear in the replay. The region is blurred and
hatched, matching the iOS SDK.

```dart
ORSanitizedView(child: TextField(decoration: ...))
```

Platform views (WebView, maps, camera preview) are covered with a placeholder
by default: they render in native layers that Flutter cannot read back, so they
would otherwise appear blank. Set `maskPlatformViews: false` to opt out.

## Network

```dart
OpenReplay.instance.patchNetwork(ORNetworkOptions(
  capturePayload: true,                 // bodies are dropped by default
  ignoreHeaders: ['cookie', 'authorization'],
  sanitizer: (record) {
    record.url = record.url.replaceAll(RegExp(r'token=[^&]+'), 'token=***');
    return record;                      // return null to drop the call
  },
));
```

This installs an `HttpOverrides`, chaining to any already present, and covers
`dart:io` `HttpClient` — so `package:http`'s `IOClient` and Dio's default
adapter. A custom Dio adapter needs its own interceptor calling
`OpenReplay.instance.networkRequest(...)`.

## Other API

```dart
OpenReplay.instance.setUserID('user-42');
OpenReplay.instance.setMetadata('plan', 'pro');
OpenReplay.instance.event('checkout_started', {'cart': 3});
OpenReplay.instance.observeInput(controller, label: 'Email', masked: false);
await OpenReplay.instance.stop();
```

## Options

| Option | Default | Notes |
|---|---|---|
| `screen` | `true` | Frame capture |
| `analytics` | `true` | Touches, screens, inputs |
| `logs` | `true` | Captures `debugPrint` |
| `crashes` | `true` | Dart errors; native crashes need a native reporter |
| `performances` | `true` | CPU, memory, battery, thermal |
| `targetLongEdge` | `720` | Longest edge of a captured frame, in pixels |
| `dedupeFrames` | `true` | Skips frames identical to the previous one |
| `maskPlatformViews` | `true` | Placeholder over platform views |
| `screenshotBatchSize` | `normal` | Frames per upload (10/20/30) |
| `wifiOnly` | `true` | Reserved; not yet enforced |
| `debugLogs` | `false` | SDK's own logging |

Frame rate and image quality come from the project settings in the
`/start` response, not from these options.

## Dependencies

None. Everything beyond one platform channel — the wire protocol, batching,
gzip, multipart, UUIDs — is implemented in Dart.
