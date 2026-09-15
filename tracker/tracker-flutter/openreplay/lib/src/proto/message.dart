import 'dart:typed_data';

import 'writer.dart';

/// Base class for every message sent to `/v1/mobile/i`.
///
/// The encoded form is `varint(type) varint(timestamp) varint(len) body`,
/// matching `ORMessage.contentData()` in the iOS SDK. The schema in
/// `mobs/mobile_messages.rb` models `Timestamp` and `Length` as leading
/// attributes of every mobile message; they are structural, so generated
/// subclasses only describe the body fields.
abstract class ORMessage {
  ORMessage(this.messageType, [int? timestamp])
      : timestamp = timestamp ?? DateTime.now().millisecondsSinceEpoch;

  final int messageType;
  final int timestamp;

  /// Encodes just the message body, without type/timestamp/length.
  Uint8List body();

  Uint8List encode() {
    final w = MessageWriter()
      ..writeUint(messageType)
      ..writeUint(timestamp)
      ..writeBytes(body());
    return w.takeBytes();
  }
}
