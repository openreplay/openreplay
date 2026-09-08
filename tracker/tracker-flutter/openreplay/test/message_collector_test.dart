import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:openreplay/src/proto/messages.gen.dart';
import 'package:openreplay/src/transport/message_collector.dart';
import 'package:openreplay/src/transport/transport.dart';

class FakeTransport implements ORTransport {
  final List<Uint8List> sent = [];
  bool succeed = true;

  @override
  Future<bool> sendMessages(Uint8List content) async {
    if (!succeed) return false;
    sent.add(content);
    return true;
  }

  @override
  Future<bool> sendLateMessages(Uint8List content) async => succeed;

  @override
  Future<bool> sendImages({
    required String projectKey,
    required Uint8List archive,
    required String name,
  }) async =>
      succeed;
}

/// Reads a LEB128 varint, returning the value and the offset after it.
(int, int) _readVarint(Uint8List b, int offset) {
  var result = 0;
  var shift = 0;
  var i = offset;
  while (true) {
    final byte = b[i++];
    result |= (byte & 0x7f) << shift;
    if (byte < 0x80) return (result, i);
    shift += 7;
  }
}

/// Every batch opens with BatchMeta(107); its body is the first index.
int _firstIndexOf(Uint8List batch) {
  var (type, off) = _readVarint(batch, 0);
  expect(type, 107);
  (_, off) = _readVarint(batch, off); // timestamp
  (_, off) = _readVarint(batch, off); // body length
  final (firstIndex, _) = _readVarint(batch, off);
  return firstIndex;
}

void main() {
  late MessageCollector collector;
  late FakeTransport transport;

  setUp(() {
    collector = MessageCollector.shared;
    transport = FakeTransport();
    collector
      ..transport = transport
      ..projectKey = 'test-key'
      ..reset();
  });

  test('batch is prefixed with BatchMeta starting at index 0', () async {
    collector.sendMessage(ORMobileUserID(id: 'a'));
    await collector.flush();

    expect(transport.sent, hasLength(1));
    expect(_firstIndexOf(transport.sent.first), 0);
  });

  test('first index advances by the number of messages sent', () async {
    collector.sendMessage(ORMobileUserID(id: 'a'));
    collector.sendMessage(ORMobileUserID(id: 'b'));
    await collector.flush();

    collector.sendMessage(ORMobileUserID(id: 'c'));
    await collector.flush();

    expect(transport.sent, hasLength(2));
    expect(_firstIndexOf(transport.sent[0]), 0);
    expect(_firstIndexOf(transport.sent[1]), 2);
  });

  test('a failed batch is requeued and keeps its index', () async {
    // The iOS SDK advances nextMessageIndex before sending and never rolls it
    // back, so a retry ships under a higher firstIndex and leaves a gap in the
    // sequence the player orders on.
    transport.succeed = false;
    collector.sendMessage(ORMobileUserID(id: 'a'));
    await collector.flush();
    expect(transport.sent, isEmpty);

    transport.succeed = true;
    await collector.flush();

    expect(transport.sent, hasLength(1));
    expect(_firstIndexOf(transport.sent.first), 0,
        reason: 'retried batch must reuse the index it was assigned');
  });

  test('an oversized single message is dropped, not queued', () async {
    collector.sendRawMessage(Uint8List(600 * 1000));
    await collector.flush();
    expect(transport.sent, isEmpty);
  });

  test('flush with nothing queued sends nothing', () async {
    await collector.flush();
    expect(transport.sent, isEmpty);
  });
}
