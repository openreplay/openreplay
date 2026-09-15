/// Recording quality, mirroring `RecordingQuality` in OROptions.swift.
enum RecordingQuality { low, standard, high }

/// Number of frames buffered before a batch is packed and uploaded.
/// Mirrors `OROptions.ScreenshotBatchSize`.
enum ScreenshotBatchSize {
  low(10),
  normal(20),
  high(30);

  const ScreenshotBatchSize(this.value);
  final int value;
}

/// Configuration for the tracker, mirroring `OROptions` in the iOS SDK.
///
/// The frame rate and image quality actually used come from the `/start`
/// response, not from here - see [ORCaptureSettings].
class OROptions {
  const OROptions({
    this.crashes = true,
    this.analytics = true,
    this.performances = true,
    this.logs = true,
    this.screen = true,
    this.screenshotBatchSize = ScreenshotBatchSize.normal,
    this.wifiOnly = true,
    this.debugLogs = false,
    this.debugImages = false,
    this.targetLongEdge = 720,
    this.dedupeFrames = true,
    this.maskPlatformViews = true,
  });

  /// Defaults for release builds.
  static const OROptions defaults = OROptions();

  /// Defaults for debug builds.
  static const OROptions defaultDebug = OROptions(debugLogs: true);

  final bool crashes;
  final bool analytics;
  final bool performances;
  final bool logs;
  final bool screen;
  final ScreenshotBatchSize screenshotBatchSize;
  final bool wifiOnly;
  final bool debugLogs;
  final bool debugImages;

  /// Longest edge of a captured frame, in pixels.
  ///
  /// The iOS SDK uses a fixed `screenScale` of 1.25, which makes a large phone
  /// cost far more per frame than a small one for identical content. Capping
  /// the long edge instead keeps per-session storage predictable across
  /// devices, and shrinks raster, readback, encode and peak memory together.
  final int targetLongEdge;

  /// Skip frames whose pixels are byte-identical to the previous one.
  ///
  /// Playback is unaffected: the player holds the last snapshot at or before
  /// the current time, so a sparse timeline simply keeps showing it.
  final bool dedupeFrames;

  /// Cover platform views (WebView, maps, camera preview) with a placeholder.
  ///
  /// They render in separate native layers that `toImage` cannot read, so
  /// without this they appear as blank regions.
  final bool maskPlatformViews;

  OROptions copyWith({bool? screen, bool? analytics}) => OROptions(
        crashes: crashes,
        analytics: analytics ?? this.analytics,
        performances: performances,
        logs: logs,
        screen: screen ?? this.screen,
        screenshotBatchSize: screenshotBatchSize,
        wifiOnly: wifiOnly,
        debugLogs: debugLogs,
        debugImages: debugImages,
        targetLongEdge: targetLongEdge,
        dedupeFrames: dedupeFrames,
        maskPlatformViews: maskPlatformViews,
      );
}

/// Capture rate and JPEG quality derived from the `/start` response.
/// Port of `getCaptureSettings(fps:quality:)` in ORTracker.swift.
class ORCaptureSettings {
  const ORCaptureSettings(this.captureRate, this.imgCompression);

  factory ORCaptureSettings.fromServer(
      {required int fps, required String quality}) {
    final limitedFps = fps.clamp(1, 99);
    final double compression;
    switch (quality.toLowerCase()) {
      case 'low':
        compression = 0.4;
      case 'standard':
        compression = 0.5;
      case 'high':
        compression = 0.6;
      default:
        compression = 0.5;
    }
    return ORCaptureSettings(
      Duration(microseconds: (1000000 / limitedFps).round()),
      compression,
    );
  }

  /// Minimum interval between two captured frames.
  final Duration captureRate;

  /// JPEG quality, 0..1.
  final double imgCompression;
}
