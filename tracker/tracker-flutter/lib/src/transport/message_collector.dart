import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';

import '../debug.dart';
import '../native.dart';
import '../proto/message.dart';
import '../proto/messages.gen.dart';
import '../proto/writer.dart';
import 'network_manager.dart';
import 'transport.dart';

class _ImageBatch {
  _ImageBatch(this.name, this.data);
  final String name;
  final Uint8List data;
}

/// Port of MessageCollector.swift.
///
/// Dart's single-threaded event loop removes the need for the Swift version's
/// locks and operation queues; the only concurrency control needed is a guard
/// so two flushes never overlap.
class MessageCollector {
  MessageCollector._();
  static final MessageCollector shared = MessageCollector._();

  static const _maxMessagesSize = 500 * 1000;
  static const _maxQueuedMessages = 10000;
  static const _maxWaitingImages = 200;
  // ~3 MB, matching the iOS SDK's maxMessagesSize * 6.
  static const _hardCapBytes = _maxMessagesSize * 6;

  final List<Uint8List> _waiting = [];
  final List<Uint8List> _waitingBackup = [];
  final List<_ImageBatch> _imagesWaiting = [];

  Timer? _sendInterval;
  Timer? _bufferTimer;
  Timer? _debounceTimer;
  ORMessage? _debouncedMessage;

  int _nextMessageIndex = 0;
  int _tick = 0;
  bool _flushingMessages = false;
  bool _flushingImages = false;
  bool _sendingLastMessages = false;

  /// Swappable for tests; defaults to the real HTTP layer.
  ORTransport transport = ORNetworkManager.shared;

  /// Set by the tracker while in cold-start buffering mode.
  bool bufferingMode = false;

  File? _lateMessagesFile;

  Future<void> start() async {
    _sendInterval?.cancel();
    _sendInterval = Timer.periodic(const Duration(seconds: 5), (_) => flush());
    await _replayLateMessages();
  }

  Future<void> stop() async {
    DebugUtils.log('stopping sender');
    _sendInterval?.cancel();
    _sendInterval = null;
    _bufferTimer?.cancel();
    _bufferTimer = null;
    _debounceTimer?.cancel();
    _debounceTimer = null;
    await terminate();
  }

  /// Clears all queued state. Exposed so tests start from a known point.
  @visibleForTesting
  void reset() {
    _waiting.clear();
    _waitingBackup.clear();
    _imagesWaiting.clear();
    _nextMessageIndex = 0;
    _tick = 0;
    _flushingMessages = false;
    _flushingImages = false;
    _sendingLastMessages = false;
    bufferingMode = false;
  }

  // MARK: - messages

  void sendMessage(ORMessage message) {
    DebugUtils.log(message.toString());
    sendRawMessage(message.encode());
  }

  /// Coalesces rapid updates, as the iOS SDK does for SwiftUI text bindings.
  void sendDebouncedMessage(ORMessage message) {
    _debounceTimer?.cancel();
    _debouncedMessage = message;
    _debounceTimer = Timer(const Duration(seconds: 2), () {
      final pending = _debouncedMessage;
      if (pending != null) {
        sendMessage(pending);
        _debouncedMessage = null;
      }
    });
  }

  void sendRawMessage(Uint8List data) {
    if (_waiting.length >= _maxQueuedMessages) {
      DebugUtils.log('message queue size exceeded, dropping message');
      return;
    }
    if (data.length > _maxMessagesSize) {
      DebugUtils.log('single message size exceeded limit');
      return;
    }

    _waiting.add(data);
    if (bufferingMode) _waitingBackup.add(data);

    var total = _waiting.fold<int>(0, (sum, m) => sum + m.length);
    if (total > _hardCapBytes) {
      var shed = 0;
      while (shed < total - _hardCapBytes && _waiting.isNotEmpty) {
        shed += _waiting.removeAt(0).length;
      }
      total -= shed;
      DebugUtils.log('dropped $shed bytes from the message backlog');
    }

    if (!bufferingMode && total > (_maxMessagesSize * 0.8)) {
      unawaited(_flushMessages());
    }
  }

  Future<void> flush() async {
    await _flushMessages();
    await _flushImages();
  }

  Future<void> terminate() async {
    if (_sendingLastMessages) return;
    _sendingLastMessages = true;
    await _flushMessages();
    await _flushImages();
    _sendingLastMessages = false;
  }

  Future<void> _flushMessages() async {
    if (_flushingMessages || _waiting.isEmpty) return;
    _flushingMessages = true;
    try {
      final batch = <Uint8List>[];
      var size = 0;
      while (_waiting.isNotEmpty &&
          size + _waiting.first.length <= _maxMessagesSize) {
        size += _waiting.first.length;
        batch.add(_waiting.removeAt(0));
      }
      if (batch.isEmpty) return;

      final firstIndex = _nextMessageIndex;
      final content = MessageWriter()
        ..writeBytes(ORMobileBatchMeta(firstIndex: firstIndex).encode(),
            sizePrefix: false);
      for (final m in batch) {
        if (m.isNotEmpty) content.writeBytes(m, sizePrefix: false);
      }
      final payload = content.takeBytes();

      _nextMessageIndex += batch.length;

      if (_sendingLastMessages) await _persistLateMessages(payload);

      final ok = await transport.sendMessages(payload);
      if (!ok) {
        DebugUtils.log('re-queueing failed batch');
        _waiting.insertAll(0, batch);
        // The iOS SDK leaves the counter advanced here, so a retried batch
        // ships under a higher firstIndex and leaves a gap in the sequence the
        // player orders on. Roll it back instead.
        _nextMessageIndex = firstIndex;
        return;
      }

      if (_sendingLastMessages) await _clearLateMessages();
    } finally {
      _flushingMessages = false;
    }
  }

  // MARK: - images

  Future<void> sendImagesBatch(Uint8List archive, String fileName) async {
    if (_imagesWaiting.length >= _maxWaitingImages) {
      _imagesWaiting.removeRange(
          0, _imagesWaiting.length - _maxWaitingImages + 1);
    }
    _imagesWaiting.add(_ImageBatch(fileName, archive));
    await _flushImages();
  }

  Future<void> _flushImages() async {
    if (_flushingImages || _imagesWaiting.isEmpty) return;
    _flushingImages = true;
    try {
      while (_imagesWaiting.isNotEmpty) {
        final batch = _imagesWaiting.removeAt(0);
        final projectKey = _projectKey;
        if (projectKey == null) {
          _imagesWaiting.insert(0, batch);
          return;
        }
        DebugUtils.log('sending images ${batch.name} ${batch.data.length}');
        final ok = await transport.sendImages(
          projectKey: projectKey,
          archive: batch.data,
          name: batch.name,
        );
        if (!ok) {
          _imagesWaiting.insert(0, batch);
          return;
        }
      }
    } finally {
      _flushingImages = false;
    }
  }

  String? _projectKey;
  set projectKey(String? value) => _projectKey = value;

  // MARK: - cold start buffering

  /// Alternates between two buffers every 30s so that, when a condition fires,
  /// at least the previous 30s of messages are still around.
  void cycleBuffer() {
    _bufferTimer?.cancel();
    _bufferTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!bufferingMode) return;
      if (_tick.isEven) {
        _waiting.clear();
      } else {
        _waitingBackup.clear();
      }
      _tick++;
    });
  }

  Future<void> syncBuffers() async {
    _bufferTimer?.cancel();
    _bufferTimer = null;
    _tick = 0;
    if (_waiting.length > _waitingBackup.length) {
      _waitingBackup.clear();
    } else {
      _waiting
        ..clear()
        ..addAll(_waitingBackup);
      _waitingBackup.clear();
    }
    await _flushMessages();
  }

  // MARK: - late messages

  Future<File?> _lateFile() async {
    final cached = _lateMessagesFile;
    if (cached != null) return cached;
    final dir = await ORNative.shared.cacheDirectory();
    if (dir == null) return null;
    return _lateMessagesFile = File('$dir/lateMessages.dat');
  }

  Future<void> _persistLateMessages(Uint8List payload) async {
    try {
      final f = await _lateFile();
      await f?.writeAsBytes(payload, flush: true);
    } on Object catch (e) {
      DebugUtils.error('could not persist late messages: $e');
    }
  }

  Future<void> _clearLateMessages() async {
    try {
      final f = await _lateFile();
      if (f != null && f.existsSync()) await f.delete();
    } on Object catch (e) {
      DebugUtils.error('could not clear late messages: $e');
    }
  }

  Future<void> _replayLateMessages() async {
    try {
      final f = await _lateFile();
      if (f == null || !f.existsSync()) return;
      final data = await f.readAsBytes();
      if (data.isEmpty) {
        await f.delete();
        return;
      }
      DebugUtils.log('sending ${data.length} bytes of late messages');
      if (await transport.sendLateMessages(data)) {
        await f.delete();
      }
    } on Object catch (e) {
      DebugUtils.error('could not replay late messages: $e');
    }
  }
}
