import 'dart:io' show Platform;

import 'package:flutter/widgets.dart';

import '../debug.dart';
import '../native.dart';
import '../storage.dart';
import 'network_manager.dart';

/// Response of `POST /v1/mobile/start`.
class ORSessionResponse {
  const ORSessionResponse({
    required this.token,
    required this.userUuid,
    required this.sessionId,
    required this.projectId,
    required this.fps,
    required this.quality,
    required this.framesSupport,
  });

  factory ORSessionResponse.fromJson(Map<String, Object?> json) =>
      ORSessionResponse(
        token: json['token'] as String? ?? '',
        userUuid: json['userUUID'] as String? ?? '',
        sessionId: json['sessionID'] as String? ?? '',
        projectId: json['projectID'] as String? ?? '',
        fps: (json['fps'] as num?)?.toInt() ?? 1,
        quality: json['quality'] as String? ?? 'standard',
        framesSupport: json['framesSupport'] as bool? ?? false,
      );

  final String token;
  final String userUuid;
  final String sessionId;
  final String projectId;
  final int fps;
  final String quality;

  /// False only on backends older than v1.26.0, which this SDK does not
  /// support - the legacy tar container is deliberately not implemented.
  final bool framesSupport;
}

/// Port of ORSessionRequest.create, including the retry-every-5s behaviour.
class ORSessionRequest {
  static Future<ORSessionResponse?> create({
    required String projectKey,
    required String trackerVersion,
    required bool doNotRecord,
    String condition = '',
  }) async {
    final params = await _params(
      projectKey: projectKey,
      trackerVersion: trackerVersion,
      doNotRecord: doNotRecord,
      condition: condition,
    );

    // The iOS SDK retries indefinitely every 5 seconds; keep that, but bound it
    // so a permanently misconfigured key does not spin forever.
    for (var attempt = 0; attempt < 5; attempt++) {
      final res = await ORNetworkManager.shared.createSession(params);
      if (res != null) {
        DebugUtils.log('session started: ${res.sessionId}');
        return res;
      }
      await Future<void>.delayed(const Duration(seconds: 5));
    }
    DebugUtils.error('could not start a session after 5 attempts');
    return null;
  }

  static Future<Map<String, Object?>> _params({
    required String projectKey,
    required String trackerVersion,
    required bool doNotRecord,
    required String condition,
  }) async {
    final device = await ORNative.shared.deviceInfo();
    final view = WidgetsBinding.instance.platformDispatcher.views.first;
    final size = view.physicalSize / view.devicePixelRatio;

    return <String, Object?>{
      'projectKey': projectKey,
      'trackerVersion': trackerVersion,
      'revID': device['revID'] ?? 'N/A',
      'userUUID': await ORUserDefaults.shared.userUUID(),
      'userOSVersion': device['userOSVersion'] ?? '',
      'userDevice': device['userDevice'] ?? '',
      'userDeviceType': device['userDeviceType'] ?? '',
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'deviceMemory': device['deviceMemory'] ?? 0,
      'timezone': currentTimezone(),
      'width': size.width.round(),
      'height': size.height.round(),
      'doNotRecord': doNotRecord,
      if (condition.isNotEmpty) 'condition': condition,
      // Flutter reports the host OS, never a distinct "flutter" platform:
      // anything outside ios/android fails the backend's IsMobile() gate and
      // the player's platform switch.
      'platform': Platform.isIOS ? 'ios' : 'android',
      'performances': device['performances'] ?? const <String, int>{},
    };
  }

  /// Port of getTimezone() - format is `UTC+HH:MM`.
  static String currentTimezone() {
    final offset = DateTime.now().timeZoneOffset;
    final sign = offset.isNegative ? '-' : '+';
    final total = offset.inMinutes.abs();
    final h = (total ~/ 60).toString().padLeft(2, '0');
    final m = (total % 60).toString().padLeft(2, '0');
    return 'UTC$sign$h:$m';
  }
}
