import 'package:flutter_test/flutter_test.dart';
import 'package:openreplay/src/proto/messages.gen.dart';
import 'package:openreplay/src/proto/writer.dart';

void main() {
  group('varint', () {
    test('single byte values', () {
      expect((MessageWriter()..writeUint(0)).takeBytes(), [0]);
      expect((MessageWriter()..writeUint(1)).takeBytes(), [1]);
      expect((MessageWriter()..writeUint(127)).takeBytes(), [127]);
    });

    test('multi byte values', () {
      expect((MessageWriter()..writeUint(128)).takeBytes(), [0x80, 0x01]);
      expect((MessageWriter()..writeUint(300)).takeBytes(), [0xac, 0x02]);
      expect(
          (MessageWriter()..writeUint(16384)).takeBytes(), [0x80, 0x80, 0x01]);
    });

    test('zigzag signed', () {
      expect((MessageWriter()..writeInt(0)).takeBytes(), [0]);
      expect((MessageWriter()..writeInt(-1)).takeBytes(), [1]);
      expect((MessageWriter()..writeInt(1)).takeBytes(), [2]);
      expect((MessageWriter()..writeInt(-2)).takeBytes(), [3]);
      expect((MessageWriter()..writeInt(150)).takeBytes(), [0xac, 0x02]);
    });
  });

  group('primitives', () {
    test('string is length prefixed utf8', () {
      expect(
          (MessageWriter()..writeString('abc')).takeBytes(), [3, 97, 98, 99]);
    });

    test('multibyte string counts bytes, not runes', () {
      // 'é' is two UTF-8 bytes.
      expect((MessageWriter()..writeString('é')).takeBytes(), [2, 0xc3, 0xa9]);
    });

    test('bool is one byte', () {
      expect((MessageWriter()..writeBool(true)).takeBytes(), [1]);
      expect((MessageWriter()..writeBool(false)).takeBytes(), [0]);
    });

    test('little endian frame header', () {
      final w = MessageWriter()
        ..writeUint64LE(1)
        ..writeUint32LE(2);
      expect(w.takeBytes(), [1, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0]);
    });
  });

  group('message envelope', () {
    test('type, timestamp, length, body', () {
      final msg = ORMobileUserID(id: 'abc', timestamp: 1);
      // 94 = type, 1 = ts, 4 = body length, then length-prefixed 'abc'.
      expect(msg.encode(), [94, 1, 4, 3, 97, 98, 99]);
    });

    test('field order follows the schema', () {
      final msg = ORMobileClickEvent(label: 'a', x: 2, y: 3, timestamp: 1);
      expect(msg.encode(), [100, 1, 4, 1, 97, 2, 3]);
    });

    test('bool fields encode inline', () {
      final msg = ORMobileViewComponentEvent(
        screenName: 'a',
        viewName: 'b',
        visible: true,
        timestamp: 1,
      );
      expect(msg.encode(), [98, 1, 5, 1, 97, 1, 98, 1]);
    });

    test('timestamp defaults to now', () {
      final before = DateTime.now().millisecondsSinceEpoch;
      final msg = ORMobileUserID(id: 'x');
      expect(msg.timestamp, greaterThanOrEqualTo(before));
    });
  });
}
