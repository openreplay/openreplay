import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import '../debug.dart';
import '../native.dart';
import '../options.dart';
import '../proto/writer.dart';
import '../transport/message_collector.dart';
import '../transport/network_manager.dart';
import 'mask.dart';
import 'sanitized.dart';

/// Port of ScreenshotManager in ScreenCapture.swift, rebuilt around Flutter's
/// rendering model.
///
/// The iOS SDK polls a timer regardless of what is on screen. Flutter does not
/// need to: an idle UI schedules no frames, so the post-frame callback simply
/// does not fire and a static screen costs nothing. A slow heartbeat provides
/// a floor so long-lived sessions still get periodic frames.
class ScreenshotManager {
  ScreenshotManager._();
  static final ScreenshotManager shared = ScreenshotManager._();

  static const _maxBufferedFrames = 500;
  static const _heartbeat = Duration(seconds: 10);

  /// Upload cadence floor.
  ///
  /// The iOS SDK relies on the batch-size trigger alone, which is fine there
  /// because it captures on a fixed timer. Capture here follows repaints, so an
  /// idle screen would take minutes to reach a full batch - hence a time-based
  /// flush as well.
  static const _flushInterval = Duration(seconds: 5);

  /// Set by [OpenReplayWidget]; the boundary wrapping the host app.
  GlobalKey? boundaryKey;

  final Set<RenderORSanitized> _sanitized = {};
  final List<(Uint8List, int)> _frames = [];
  final List<(Uint8List, int)> _framesBackup = [];

  OROptions _options = OROptions.defaults;
  ORCaptureSettings _settings =
      ORCaptureSettings(const Duration(milliseconds: 333), 0.5);

  Timer? _heartbeatTimer;
  Timer? _flushTimer;
  Timer? _bufferTimer;
  bool _running = false;
  bool _capturing = false;
  int _lastCaptureMs = 0;
  int _lastTs = 0;
  int _tick = 0;
  int? _previousHash;

  /// True while the tracker is buffering for a cold start.
  bool bufferingMode = false;

  bool get isRunning => _running;

  void setSettings(ORCaptureSettings settings) => _settings = settings;
  void setOptions(OROptions options) => _options = options;

  void addSanitized(RenderORSanitized node) => _sanitized.add(node);
  void removeSanitized(RenderORSanitized node) => _sanitized.remove(node);

  void start({required int startTs}) {
    if (_running) return;
    _running = true;
    _lastTs = startTs;
    _scheduleNextCapture();
    _heartbeatTimer = Timer.periodic(_heartbeat, (_) => unawaited(_capture()));
    _flushTimer =
        Timer.periodic(_flushInterval, (_) => unawaited(sendFrames()));
  }

  /// Backgrounding: stop capturing and get what is buffered out, but keep the
  /// buffers. Anything that misses the window goes out on [resume].
  ///
  /// [stop] is the full teardown and discards buffers, because whatever it
  /// still holds belongs to a session that is over.
  Future<void> pause() async {
    _running = false;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    _flushTimer?.cancel();
    _flushTimer = null;
    _bufferTimer?.cancel();
    _bufferTimer = null;
    await sendFrames();
  }

  void resume({required int startTs}) {
    if (_running) return;
    // Anything the last pause could not get out before suspension.
    unawaited(sendFrames());
    _lastTs = _lastTs == 0 ? startTs : _lastTs;
    _running = true;
    _scheduleNextCapture();
    _heartbeatTimer = Timer.periodic(_heartbeat, (_) => unawaited(_capture()));
    _flushTimer =
        Timer.periodic(_flushInterval, (_) => unawaited(sendFrames()));
  }

  void stop() {
    _running = false;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    _flushTimer?.cancel();
    _flushTimer = null;
    _bufferTimer?.cancel();
    _bufferTimer = null;
    _frames.clear();
    _framesBackup.clear();
    _previousHash = null;
    _lastTs = 0;
  }

  /// Re-arms the post-frame callback. Registering again from inside the
  /// callback is what makes capture follow actual repaints.
  void _scheduleNextCapture() {
    if (!_running) return;
    SchedulerBinding.instance.addPostFrameCallback((_) async {
      try {
        await _capture();
      } on Object catch (e) {
        // Re-arming in `finally` matters: anything escaping _capture (an
        // unmounted boundary, say) would otherwise stop capture silently for
        // the rest of the session.
        DebugUtils.error('capture tick failed: $e');
      } finally {
        _scheduleNextCapture();
      }
    });
  }

  Future<void> _capture() async {
    if (!_running || _capturing) return;

    final now = DateTime.now().millisecondsSinceEpoch;
    if (now - _lastCaptureMs < _settings.captureRate.inMilliseconds) return;

    final boundary = boundaryKey?.currentContext?.findRenderObject();
    if (boundary is! RenderRepaintBoundary) {
      DebugUtils.log('no repaint boundary yet - is the app wrapped in '
          'OpenReplayWidget?');
      return;
    }
    if (boundary.debugNeedsPaint) return;

    final size = boundary.size;
    if (size.isEmpty) return;

    _capturing = true;
    _lastCaptureMs = now;
    try {
      final ratio = _pixelRatio(size);
      // toImageSync rasterises the existing layer without waiting for a frame.
      var image = boundary.toImageSync(pixelRatio: ratio);
      try {
        image = maskFrame(
          source: image,
          sensitive: _rects(boundary, ratio),
          platformViews: _options.maskPlatformViews
              ? _platformViewRects(boundary, ratio)
              : const [],
          blurMode: true,
          debugOutlines: _options.debugImages,
        );

        final raw = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
        if (raw == null) return;

        final encoded = await ORNative.shared.encodeFrame(
          rgba: raw.buffer.asUint8List(),
          width: image.width,
          height: image.height,
          quality: _settings.imgCompression,
          previousHash: _options.dedupeFrames ? _previousHash : null,
        );
        if (encoded == null) return;
        _previousHash = encoded.hash;

        final bytes = encoded.bytes;
        if (bytes == null) {
          // Identical to the previous frame; the player holds the last
          // snapshot at or before the current time, so dropping it is
          // invisible on playback.
          DebugUtils.log('frame unchanged, skipped');
          return;
        }
        _enqueue(bytes, DateTime.now().millisecondsSinceEpoch);
        DebugUtils.log('frame ${image.width}x${image.height} '
            '-> ${bytes.length} bytes, buffered ${_frames.length}');
      } finally {
        // ui.Image holds memory outside the Dart heap; the GC will not reclaim
        // it promptly. This is the standard Flutter screenshot leak.
        image.dispose();
      }
    } on Object catch (e) {
      DebugUtils.error('capture failed: $e');
    } finally {
      _capturing = false;
    }
  }

  /// Scale that puts the longest edge at [OROptions.targetLongEdge].
  ///
  /// toImage rasterises the scene at this scale rather than downscaling a
  /// full-resolution bitmap, so a lower ratio cuts raster, readback, encode and
  /// peak memory together - and text stays sharp because glyphs are rendered
  /// at the target resolution.
  double _pixelRatio(Size size) {
    final longEdge = size.longestSide;
    if (longEdge <= 0) return 1;
    return (_options.targetLongEdge / longEdge).clamp(0.1, 3.0);
  }

  List<Rect> _rects(RenderRepaintBoundary boundary, double ratio) {
    final out = <Rect>[];
    for (final node in _sanitized) {
      if (!node.attached || !node.hasSize) continue;
      final rect = _rectIn(node, boundary, ratio);
      if (rect != null) out.add(rect);
    }
    return out;
  }

  /// Rect of [node] in the captured image's pixel space.
  ///
  /// Computed in the same frame as the snapshot: stale rects smear during
  /// scrolling.
  Rect? _rectIn(RenderBox node, RenderRepaintBoundary boundary, double ratio) {
    try {
      final transform = node.getTransformTo(boundary);
      final local = Rect.fromLTWH(0, 0, node.size.width, node.size.height);
      final global = MatrixUtils.transformRect(transform, local);
      return Rect.fromLTRB(
        global.left * ratio,
        global.top * ratio,
        global.right * ratio,
        global.bottom * ratio,
      );
    } on Object {
      // Detached mid-walk, or no common ancestor.
      return null;
    }
  }

  /// Platform views come back blank from toImage, so their rects get covered.
  ///
  /// Matched with `is` checks, never on type names: `--obfuscate` renames
  /// symbols, so `runtimeType.toString()` would return noise in exactly the
  /// builds that ship.
  List<Rect> _platformViewRects(RenderRepaintBoundary boundary, double ratio) {
    final out = <Rect>[];
    void visit(RenderObject node) {
      final isPlatformView = node is PlatformViewRenderBox ||
          node is RenderAndroidView ||
          node is RenderUiKitView ||
          node is TextureBox;
      if (isPlatformView && node is RenderBox && node.hasSize) {
        final rect = _rectIn(node, boundary, ratio);
        if (rect != null) out.add(rect);
        return;
      }
      node.visitChildren(visit);
    }

    boundary.visitChildren(visit);
    return out;
  }

  void _enqueue(Uint8List jpeg, int ts) {
    if (bufferingMode) _framesBackup.add((jpeg, ts));
    _frames.add((jpeg, ts));

    if (_frames.length > _maxBufferedFrames) {
      _frames.removeRange(0, _frames.length - _maxBufferedFrames);
    }
    if (_framesBackup.length > _maxBufferedFrames) {
      _framesBackup.removeRange(0, _framesBackup.length - _maxBufferedFrames);
    }

    if (!bufferingMode &&
        _frames.length >= _options.screenshotBatchSize.value) {
      unawaited(sendFrames());
    }
  }

  /// Packs the buffered frames into the `.frames` container and hands them to
  /// the collector. Layout is `[u64 LE ts][u32 LE size][jpeg]` repeated, gzipped
  /// - see backend/pkg/images/api/handlers.go.
  Future<void> sendFrames() async {
    final sessionId = ORNetworkManager.shared.sessionId;
    if (sessionId == null) {
      DebugUtils.log('no session id yet, holding ${_frames.length} frames');
      return;
    }
    if (_frames.isEmpty) return;

    final batch = List.of(_frames);
    _frames.clear();

    final name = '$sessionId-$_lastTs.gz';
    final w = MessageWriter();
    for (final (bytes, ts) in batch) {
      w
        ..writeUint64LE(ts)
        ..writeUint32LE(bytes.length)
        ..writeBytes(bytes, sizePrefix: false);
      _lastTs = ts;
    }

    try {
      final archive = Uint8List.fromList(gzip.encode(w.takeBytes()));
      DebugUtils.log('packed ${batch.length} frames -> ${archive.length} '
          'bytes as $name');
      await MessageCollector.shared.sendImagesBatch(archive, name);
    } on Object catch (e) {
      DebugUtils.error('could not pack frames: $e');
    }
  }

  // MARK: - cold start buffering

  void cycleBuffer() {
    _bufferTimer?.cancel();
    _bufferTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!bufferingMode) return;
      if (_tick.isEven) {
        _frames.clear();
      } else {
        _framesBackup.clear();
      }
      _tick++;
    });
  }

  Future<void> syncBuffers() async {
    _bufferTimer?.cancel();
    _bufferTimer = null;
    _tick = 0;
    if (_frames.length > _framesBackup.length) {
      _framesBackup.clear();
    } else {
      _frames
        ..clear()
        ..addAll(_framesBackup);
      _framesBackup.clear();
    }
    await sendFrames();
  }

  @visibleForTesting
  int get bufferedFrameCount => _frames.length;
}
