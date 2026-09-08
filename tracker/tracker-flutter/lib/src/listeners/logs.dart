import 'package:flutter/foundation.dart';

import '../proto/messages.gen.dart';
import '../transport/message_collector.dart';

/// Port of LogsListener.swift.
///
/// The iOS SDK redirects the stdout and stderr file descriptors with `dup2`.
/// Dart cannot see the native descriptors that way, but everything Flutter
/// logs goes through `debugPrint`, so overriding that captures the same
/// output - and keeps forwarding it to the original sink.
class LogsListener {
  LogsListener._();
  static final LogsListener shared = LogsListener._();

  DebugPrintCallback? _original;
  bool _started = false;

  /// Guards against a log emitted while we are sending a log.
  bool _reentrant = false;

  void start() {
    if (_started) return;
    _started = true;
    _original = debugPrint;
    debugPrint = _capture;
  }

  void stop() {
    if (!_started) return;
    _started = false;
    final original = _original;
    if (original != null) debugPrint = original;
    _original = null;
  }

  void _capture(String? message, {int? wrapWidth}) {
    _original?.call(message, wrapWidth: wrapWidth);
    if (message == null || message.isEmpty || _reentrant) return;
    _reentrant = true;
    try {
      MessageCollector.shared
          .sendMessage(ORMobileLog(severity: 'info', content: message));
    } finally {
      _reentrant = false;
    }
  }

  /// Records a log the host app raises explicitly.
  void log(String severity, String content) {
    MessageCollector.shared
        .sendMessage(ORMobileLog(severity: severity, content: content));
  }
}
