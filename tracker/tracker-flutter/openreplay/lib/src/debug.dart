import 'dart:developer' as developer;

/// Port of DebugUtils.swift. Logging is gated on `OROptions.debugLogs`, which
/// is set once the tracker starts.
class DebugUtils {
  static bool enabled = false;

  static void log(String message) {
    if (enabled) developer.log(message, name: 'OpenReplay');
  }

  static void error(String message) {
    developer.log('Error: $message', name: 'OpenReplay');
  }
}
