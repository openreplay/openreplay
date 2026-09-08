import 'package:flutter/services.dart';

import 'debug.dart';

/// Result of a native encode: JPEG bytes plus a hash of the source pixels.
///
/// [bytes] is null when the frame was byte-identical to the previous one and
/// dedupe was requested, in which case the encode is skipped entirely.
class EncodedFrame {
  const EncodedFrame(this.bytes, this.hash);
  final Uint8List? bytes;
  final int hash;
}

/// The plugin's single platform channel.
///
/// Everything here exists because it has no pure-Dart equivalent: a JPEG
/// encoder, OS performance counters, secure storage, and connectivity. Keeping
/// it to one channel is what lets the package ship with zero pub dependencies.
class ORNative {
  ORNative._();
  static final ORNative shared = ORNative._();

  static const MethodChannel _channel = MethodChannel('openreplay');

  /// Hashes the raw RGBA buffer and, unless it matches [previousHash], encodes
  /// it as JPEG. Runs on a background thread natively.
  Future<EncodedFrame?> encodeFrame({
    required Uint8List rgba,
    required int width,
    required int height,
    required double quality,
    int? previousHash,
  }) async {
    try {
      final res =
          await _channel.invokeMapMethod<String, Object?>('encodeFrame', {
        'rgba': rgba,
        'width': width,
        'height': height,
        'quality': quality,
        'previousHash': previousHash,
      });
      if (res == null) return null;
      return EncodedFrame(res['bytes'] as Uint8List?, res['hash'] as int);
    } on Object catch (e) {
      DebugUtils.error('encodeFrame failed: $e');
      return null;
    }
  }

  /// System metrics keyed by the exact `MobilePerformanceEvent` names the
  /// player understands: `mainThreadCPU`, `memoryUsage`, `batteryLevel`,
  /// `batteryState`, `thermalState`, `isLowPowerModeEnabled`, `orientation`.
  ///
  /// `orientation` uses UIDeviceOrientation numbering on both platforms
  /// (1 portrait, 2 portraitUpsideDown, 3 landscapeLeft, 4 landscapeRight),
  /// because the player matches on the raw values 3 and 4.
  Future<Map<String, int>> systemMetrics() async {
    try {
      final res = await _channel.invokeMapMethod<String, int>('systemMetrics');
      return res ?? const {};
    } on Object catch (e) {
      DebugUtils.error('systemMetrics failed: $e');
      return const {};
    }
  }

  /// Device and OS facts needed by `/v1/mobile/start`.
  Future<Map<String, Object?>> deviceInfo() async {
    try {
      final res = await _channel.invokeMapMethod<String, Object?>('deviceInfo');
      return res ?? const {};
    } on Object catch (e) {
      DebugUtils.error('deviceInfo failed: $e');
      return const {};
    }
  }

  /// Session token, held in the Keychain on iOS and Keystore-encrypted on
  /// Android - it is a credential, so not in plain preferences. Mirrors
  /// ORKeychain.swift.
  Future<String?> secureGet(String key) async {
    try {
      return await _channel.invokeMethod<String>('secureGet', {'key': key});
    } on Object catch (e) {
      DebugUtils.error('secureGet failed: $e');
      return null;
    }
  }

  Future<void> secureSet(String key, String? value) async {
    try {
      await _channel
          .invokeMethod<void>('secureSet', {'key': key, 'value': value});
    } on Object catch (e) {
      DebugUtils.error('secureSet failed: $e');
    }
  }

  /// Non-secret persistence (the user UUID), mirroring ORUserDefaults.swift.
  Future<String?> prefsGet(String key) async {
    try {
      return await _channel.invokeMethod<String>('prefsGet', {'key': key});
    } on Object catch (e) {
      DebugUtils.error('prefsGet failed: $e');
      return null;
    }
  }

  Future<void> prefsSet(String key, String value) async {
    try {
      await _channel
          .invokeMethod<void>('prefsSet', {'key': key, 'value': value});
    } on Object catch (e) {
      DebugUtils.error('prefsSet failed: $e');
    }
  }

  /// Directory for the late-message file. Mirrors the iOS SDK's use of
  /// `.cachesDirectory`.
  Future<String?> cacheDirectory() async {
    try {
      return await _channel.invokeMethod<String>('cacheDirectory');
    } on Object catch (e) {
      DebugUtils.error('cacheDirectory failed: $e');
      return null;
    }
  }
}
