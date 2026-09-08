import 'dart:convert';
import 'dart:typed_data';

/// Binary writer for the OpenReplay mobile wire format.
///
/// Mirrors `Extensions/Data.swift` in the iOS SDK: unsigned integers are
/// LEB128 varints, signed integers are zigzag-then-varint, strings and byte
/// blobs carry a varint length prefix, and booleans are a single byte.
class MessageWriter {
  final BytesBuilder _out = BytesBuilder(copy: false);

  int get length => _out.length;

  void writeUint(int value) {
    assert(value >= 0, 'writeUint got a negative value: $value');
    var v = value;
    while (true) {
      final b = v & 0x7f;
      // Logical shift: values above 2^63-1 arrive here as negative ints.
      v = v >>> 7;
      if (v == 0) {
        _out.addByte(b);
        return;
      }
      _out.addByte(b | 0x80);
    }
  }

  void writeInt(int value) {
    var uv = value << 1;
    if (value < 0) uv = ~uv;
    writeUint(uv);
  }

  void writeString(String value) {
    writeBytes(utf8.encode(value));
  }

  void writeBool(bool value) => _out.addByte(value ? 1 : 0);

  void writeBytes(Uint8List data, {bool sizePrefix = true}) {
    if (sizePrefix) writeUint(data.length);
    _out.add(data);
  }

  /// Little-endian helpers for the `.frames` container, which is not varint
  /// encoded (see `backend/pkg/images/api/handlers.go`).
  void writeUint64LE(int value) {
    final b = ByteData(8)..setUint64(0, value, Endian.little);
    _out.add(b.buffer.asUint8List());
  }

  void writeUint32LE(int value) {
    final b = ByteData(4)..setUint32(0, value, Endian.little);
    _out.add(b.buffer.asUint8List());
  }

  Uint8List takeBytes() => _out.takeBytes();
}
