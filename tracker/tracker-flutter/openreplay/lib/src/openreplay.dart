import 'dart:async';
import 'dart:convert';

import 'package:flutter/widgets.dart';

import 'capture/screenshot_manager.dart';
import 'debug.dart';
import 'listeners/analytics.dart';
import 'listeners/crash.dart';
import 'listeners/logs.dart';
import 'listeners/network.dart';
import 'listeners/network_options.dart';
import 'listeners/performance.dart';
import 'options.dart';
import 'proto/messages.gen.dart';
import 'transport/message_collector.dart';
import 'transport/network_manager.dart';
import 'transport/session.dart';

/// Tracker version reported to ingest as `trackerVersion`.
///
/// Must stay in step with pubspec.yaml, and must not drop below 1.0.9 - the
/// backend rejects anything lower with 426 Upgrade Required.
const String kTrackerVersion = '1.0.9';

/// Entry point of the SDK. Port of `Openreplay` in ORTracker.swift.
///
/// Wrap the app in [OpenReplayWidget] and call [start]:
///
/// ```dart
/// void main() {
///   runApp(OpenReplayWidget(child: MyApp()));
/// }
/// // then, once the first frame is up:
/// await OpenReplay.instance.start(projectKey: 'key');
/// ```
class OpenReplay with WidgetsBindingObserver {
  OpenReplay._();

  /// The shared tracker.
  static final OpenReplay instance = OpenReplay._();

  OROptions options = OROptions.defaults;
  String? projectKey;
  int sessionStartTs = 0;
  bool bufferingMode = false;

  ORSessionResponse? _session;
  bool _observing = false;

  /// Ingest base URL. Defaults to OpenReplay cloud.
  String get serverUrl => ORNetworkManager.shared.baseUrl;
  set serverUrl(String value) => ORNetworkManager.shared.baseUrl = value;

  String get sessionId => _session?.sessionId ?? '';

  /// Starts recording. Safe to call before the first frame; capture only
  /// begins once [OpenReplayWidget] has laid out.
  Future<void> start({
    required String projectKey,
    OROptions options = OROptions.defaults,
    String? serverUrl,
  }) async {
    this.options = options;
    this.projectKey = projectKey;
    DebugUtils.enabled = options.debugLogs;
    if (serverUrl != null) this.serverUrl = serverUrl;

    final session = await ORSessionRequest.create(
      projectKey: projectKey,
      trackerVersion: kTrackerVersion,
      doNotRecord: false,
    );
    if (session == null) {
      DebugUtils.error('no response from /start, not recording');
      return;
    }

    _session = session;
    sessionStartTs = DateTime.now().millisecondsSinceEpoch;
    bufferingMode = false;

    _applySettings(session);
    await MessageCollector.shared.start();
    _startListeners();
  }

  /// Records into a rolling buffer without creating a session, so a later
  /// [triggerRecording] can ship the preceding ~30s. Port of `coldStart`.
  Future<void> coldStart({
    required String projectKey,
    OROptions options = OROptions.defaults,
    String? serverUrl,
  }) async {
    this.options = options;
    this.projectKey = projectKey;
    DebugUtils.enabled = options.debugLogs;
    bufferingMode = true;
    if (serverUrl != null) this.serverUrl = serverUrl;

    final session = await ORSessionRequest.create(
      projectKey: projectKey,
      trackerVersion: kTrackerVersion,
      doNotRecord: true,
    );
    if (session == null) return;

    _session = session;
    sessionStartTs = DateTime.now().millisecondsSinceEpoch;

    _applySettings(session);
    MessageCollector.shared
      ..bufferingMode = true
      ..cycleBuffer();
    ScreenshotManager.shared.bufferingMode = true;
    ScreenshotManager.shared.cycleBuffer();
    _startListeners();
  }

  /// Promotes a cold-started session into a real one and flushes the buffers.
  Future<void> triggerRecording({String? condition}) async {
    bufferingMode = false;
    final session = await ORSessionRequest.create(
      projectKey: projectKey ?? '',
      trackerVersion: kTrackerVersion,
      doNotRecord: false,
      condition: condition ?? '',
    );
    if (session == null) return;
    _session = session;

    MessageCollector.shared.bufferingMode = false;
    ScreenshotManager.shared.bufferingMode = false;
    await MessageCollector.shared.syncBuffers();
    await ScreenshotManager.shared.syncBuffers();
    await MessageCollector.shared.start();
  }

  Future<void> stop() async {
    ScreenshotManager.shared.stop();
    Crashs.shared.stop();
    PerformanceListener.shared.stop();
    Analytics.shared.stop();
    LogsListener.shared.stop();
    await MessageCollector.shared.stop();
    if (_observing) {
      WidgetsBinding.instance.removeObserver(this);
      _observing = false;
    }
    ORNetworkManager.shared.reset();
    _session = null;
  }

  void _applySettings(ORSessionResponse session) {
    if (!session.framesSupport) {
      // The legacy tar container is deliberately not implemented; that path
      // needs a backend older than v1.26.0.
      DebugUtils.error(
        'this backend does not support the frames format; '
        'screen recording needs OpenReplay v1.26.0 or newer',
      );
    }
    DebugUtils.log('session ${session.sessionId} fps=${session.fps} '
        'quality=${session.quality} framesSupport=${session.framesSupport}');
    ORNetworkManager.shared.sessionId = session.sessionId;
    MessageCollector.shared.projectKey = projectKey;
    ScreenshotManager.shared
      ..setOptions(options)
      ..setSettings(
        ORCaptureSettings.fromServer(
            fps: session.fps, quality: session.quality),
      );
  }

  void _startListeners() {
    if (!_observing) {
      WidgetsBinding.instance.addObserver(this);
      _observing = true;
    }
    if (options.logs) LogsListener.shared.start();
    if (options.crashes) Crashs.shared.start();
    if (options.performances) unawaited(PerformanceListener.shared.start());
    if (options.analytics) Analytics.shared.start();
    if (options.screen && _session?.framesSupport == true) {
      ScreenshotManager.shared.start(startTs: sessionStartTs);
    }
  }

  // MARK: - lifecycle

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
        unawaited(_pause());
      case AppLifecycleState.resumed:
        unawaited(_resume());
      case AppLifecycleState.inactive:
      case AppLifecycleState.detached:
        break;
    }
  }

  @override
  void didChangeMetrics() {
    final view = WidgetsBinding.instance.platformDispatcher.views.first;
    Analytics.shared
        .sendScreenChange(view.physicalSize / view.devicePixelRatio);
  }

  Future<void> _pause() async {
    PerformanceListener.shared.backgroundStateChange(inBackground: true);
    PerformanceListener.shared.stop();
    LogsListener.shared.stop();
    await ScreenshotManager.shared.pause();
    await MessageCollector.shared.flush();
  }

  Future<void> _resume() async {
    PerformanceListener.shared.backgroundStateChange(inBackground: false);
    if (options.logs) LogsListener.shared.start();
    if (options.performances) await PerformanceListener.shared.start();
    if (options.screen && _session?.framesSupport == true) {
      ScreenshotManager.shared.resume(startTs: sessionStartTs);
    }
  }

  /// Starts capturing `dart:io` HTTP traffic, chaining to any HttpOverrides
  /// already installed. Idempotent.
  ///
  /// Bodies are dropped unless [ORNetworkOptions.capturePayload] is set, and
  /// cookie/authorization headers are dropped by default.
  void patchNetwork([ORNetworkOptions options = const ORNetworkOptions()]) =>
      ORHttpOverrides.install(options);

  /// Stops capturing HTTP traffic and restores the previous overrides.
  void unpatchNetwork() => ORHttpOverrides.uninstall();

  // MARK: - public message API

  void setMetadata(String key, String value) => MessageCollector.shared
      .sendMessage(ORMobileMetadata(key: key, value: value));

  void setUserID(String userId) =>
      MessageCollector.shared.sendMessage(ORMobileUserID(id: userId));

  void userAnonymousID(String userId) =>
      MessageCollector.shared.sendMessage(ORMobileUserAnonymousID(id: userId));

  /// Custom event. [payload] is JSON-encoded if it is not already a string.
  void event(String name, [Object? payload]) {
    final encoded = switch (payload) {
      null => '',
      final String s => s,
      _ => _tryEncode(payload),
    };
    MessageCollector.shared
        .sendMessage(ORMobileEvent(name: name, payload: encoded));
  }

  static String _tryEncode(Object payload) {
    try {
      return jsonEncode(payload);
    } on Object {
      return payload.toString();
    }
  }

  void log(String severity, String content) =>
      LogsListener.shared.log(severity, content);

  /// Records a network call. Mirrors `sendNetworkMessage`.
  void networkRequest({
    required String url,
    required String method,
    required String requestJson,
    required String responseJson,
    required int status,
    required int duration,
  }) {
    MessageCollector.shared.sendMessage(
      ORMobileNetworkCall(
        type: 'request',
        method: method,
        url: url,
        request: requestJson,
        response: responseJson,
        status: status < 0 ? 0 : status,
        duration: duration,
      ),
    );
  }

  /// Records a GraphQL operation, for use with the OpenReplay gql plugins.
  void graphQL({
    required String operationKind,
    required String operationName,
    required String variables,
    required String response,
    required int duration,
  }) {
    MessageCollector.shared.sendMessage(
      ORMobileGraphQL(
        operationKind: operationKind,
        operationName: operationName,
        variables: variables,
        response: response,
        duration: duration,
      ),
    );
  }

  /// Reports text input, debounced. Port of `observeInput`.
  ///
  /// Attach to a controller:
  /// ```dart
  /// OpenReplay.instance.observeInput(controller, label: 'Email');
  /// ```
  VoidCallback observeInput(
    TextEditingController controller, {
    required String label,
    bool masked = false,
  }) {
    void listener() => Analytics.shared
        .sendInput(value: controller.text, label: label, masked: masked);
    controller.addListener(listener);
    return () => controller.removeListener(listener);
  }
}
