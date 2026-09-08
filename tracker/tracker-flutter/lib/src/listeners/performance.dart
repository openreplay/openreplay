import 'dart:async';

import '../debug.dart';
import '../native.dart';
import '../proto/messages.gen.dart';
import '../transport/message_collector.dart';

/// Port of PerformanceListener.swift.
///
/// Event names are load-bearing: the player charts only `background`,
/// `memoryUsage` and `mainThreadCPU`, and raises warnings for `thermalState`,
/// `memoryWarning`, `lowDiskSpace`, `isLowPowerModeEnabled` and
/// `batteryLevel`. Any other spelling is silently ignored, so these strings
/// must not be "tidied".
class PerformanceListener {
  PerformanceListener._();
  static final PerformanceListener shared = PerformanceListener._();

  /// Sampled on the same cadence as the iOS SDK.
  static const _cpuInterval = Duration(seconds: 5);
  static const _memInterval = Duration(seconds: 10);

  /// Reported only when they change, as the iOS SDK does from notifications.
  static const _onChangeKeys = {
    'batteryLevel',
    'batteryState',
    'thermalState',
    'isLowPowerModeEnabled',
    'orientation',
  };

  Timer? _cpuTimer;
  Timer? _memTimer;
  final Map<String, int> _lastReported = {};
  bool isActive = false;

  Future<void> start() async {
    if (isActive) return;
    isActive = true;
    await _sampleCpu();
    await _sampleMemory();
    _cpuTimer = Timer.periodic(_cpuInterval, (_) => unawaited(_sampleCpu()));
    _memTimer = Timer.periodic(_memInterval, (_) => unawaited(_sampleMemory()));
  }

  void stop() {
    isActive = false;
    _cpuTimer?.cancel();
    _cpuTimer = null;
    _memTimer?.cancel();
    _memTimer = null;
    _lastReported.clear();
  }

  Future<void> _sampleCpu() async {
    final metrics = await ORNative.shared.systemMetrics();
    _emitIfPresent(metrics, 'mainThreadCPU');
    // The on-change metrics ride along with whichever sample runs first.
    for (final key in _onChangeKeys) {
      _emitIfChanged(metrics, key);
    }
  }

  Future<void> _sampleMemory() async {
    final metrics = await ORNative.shared.systemMetrics();
    _emitIfPresent(metrics, 'memoryUsage');
  }

  void _emitIfPresent(Map<String, int> metrics, String key) {
    final value = metrics[key];
    if (value == null) return;
    _send(key, value);
  }

  void _emitIfChanged(Map<String, int> metrics, String key) {
    final value = metrics[key];
    if (value == null || _lastReported[key] == value) return;
    _lastReported[key] = value;
    _send(key, value);
  }

  /// 1 on entering the background, 0 on resume - matching the iOS SDK, which
  /// the player reads to build inactivity intervals.
  void backgroundStateChange({required bool inBackground}) =>
      _send('background', inBackground ? 1 : 0);

  /// 1 for wifi or ethernet, 0 for cellular.
  void networkStateChange(int state) => _send('networkState', state);

  void memoryWarning() => _send('memoryWarning', 0);

  void lowDiskSpace() => _send('lowDiskSpace', 0);

  void _send(String name, int value) {
    if (value < 0) {
      DebugUtils.log('skipping negative $name');
      return;
    }
    MessageCollector.shared
        .sendMessage(ORMobilePerformanceEvent(name: name, value: value));
  }
}
