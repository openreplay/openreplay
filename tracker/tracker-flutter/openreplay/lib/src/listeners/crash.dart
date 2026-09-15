import 'dart:async';
import 'dart:isolate';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';

import '../debug.dart';
import '../proto/messages.gen.dart';
import '../transport/message_collector.dart';

/// Port of Crash.swift.
///
/// Covers the framework's own error handler, the engine's uncaught-error hook,
/// and the error port of the isolate the tracker runs in (the root isolate).
/// Errors in isolates the app spawns itself are not seen: forward them with
/// [report], or add the spawned isolate's error port and call it from there.
/// Crashes in native code are not visible here and need a native handler.
class Crashs {
  Crashs._();
  static final Crashs shared = Crashs._();

  FlutterExceptionHandler? _previousOnError;
  FlutterExceptionHandler? _installedOnError;
  ui.ErrorCallback? _previousPlatformOnError;
  ui.ErrorCallback? _installedPlatformOnError;
  ReceivePort? _isolateErrors;
  bool _active = false;

  void start() {
    if (_active) return;
    _active = true;

    // Chain rather than replace: the host app, and other SDKs, install these
    // too.
    _previousOnError = FlutterError.onError;
    FlutterError.onError = _installedOnError = (details) {
      report(
        name: details.exception.runtimeType.toString(),
        reason: details.exceptionAsString(),
        stack: details.stack?.toString() ?? '',
      );
      _previousOnError?.call(details);
    };

    _previousPlatformOnError = PlatformDispatcher.instance.onError;
    PlatformDispatcher.instance.onError =
        _installedPlatformOnError = (error, stack) {
      report(
        name: error.runtimeType.toString(),
        reason: error.toString(),
        stack: stack.toString(),
      );
      return _previousPlatformOnError?.call(error, stack) ?? false;
    };

    final port = ReceivePort();
    _isolateErrors = port;
    port.listen((dynamic message) {
      if (message is! List || message.length < 2) return;
      report(
        name: 'IsolateError',
        reason: '${message[0]}',
        stack: '${message[1]}',
      );
    });
    Isolate.current.addErrorListener(port.sendPort);
  }

  void stop() {
    if (!_active) return;
    _active = false;
    // Only unwind our own hooks; an SDK that installed after us and chained
    // to them would otherwise be disconnected.
    if (identical(FlutterError.onError, _installedOnError)) {
      FlutterError.onError = _previousOnError;
    }
    if (identical(
        PlatformDispatcher.instance.onError, _installedPlatformOnError)) {
      PlatformDispatcher.instance.onError = _previousPlatformOnError;
    }
    _installedOnError = null;
    _installedPlatformOnError = null;
    final port = _isolateErrors;
    if (port != null) {
      Isolate.current.removeErrorListener(port.sendPort);
      port.close();
      _isolateErrors = null;
    }
  }

  void report({
    required String name,
    required String reason,
    required String stack,
  }) {
    DebugUtils.log('captured crash $name: $reason');
    MessageCollector.shared.sendMessage(
      ORMobileCrash(name: name, reason: reason, stacktrace: stack),
    );
    // A crash usually means the process is about to go away, so do not wait for
    // the 5s flush timer.
    unawaited(MessageCollector.shared.flush());
  }
}

// PlatformDispatcher lives in dart:ui; aliased so the import above reads
// clearly next to FlutterError.
typedef PlatformDispatcher = ui.PlatformDispatcher;
