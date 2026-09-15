import 'dart:typed_data';

/// Seam between the collector and the HTTP layer, so batching behaviour can be
/// exercised without a server.
abstract class ORTransport {
  Future<bool> sendMessages(Uint8List content);
  Future<bool> sendLateMessages(Uint8List content);
  Future<bool> sendImages({
    required String projectKey,
    required Uint8List archive,
    required String name,
  });
}
