import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import '../debug.dart';
import '../storage.dart';
import 'session.dart';
import 'transport.dart';

const startUrl = '/v1/mobile/start';
const ingestUrl = '/v1/mobile/i';
const lateUrl = '/v1/mobile/late';
const imagesUrl = '/v1/mobile/images';

/// Port of NetworkManager.swift.
///
/// Uses `dart:io` directly rather than `package:http` to keep the package
/// dependency-free. Requests go out on a dedicated client so a host app's
/// `HttpOverrides` - including our own network listener - cannot see them.
class ORNetworkManager implements ORTransport {
  ORNetworkManager._();
  static final ORNetworkManager shared = ORNetworkManager._();

  String baseUrl = 'https://api.openreplay.com/ingest';
  String? sessionId;
  String? _token;
  bool _framesSupport = false;

  /// Token of the session that was live before the current one started. The
  /// late-message file is written by that session, so replaying it must not
  /// use the token [createSession] has just overwritten.
  String? _previousToken;

  /// HTTP status of the last failed `/start`, null when the request threw.
  int? lastStartStatus;

  /// Invoked when ingest answers 401; the tracker starts a fresh session.
  void Function()? onUnauthorized;

  /// Built without `HttpOverrides` so tracker traffic is never self-recorded.
  late final HttpClient _client = _makeClient();

  static HttpClient _makeClient() {
    // `HttpClient()` consults HttpOverrides.current, so if patchNetwork() ran
    // first the ingest client would be wrapped by our own recorder. Running the
    // constructor under a plain HttpOverrides yields the raw dart:io client.
    return HttpOverrides.runWithHttpOverrides(
      () => HttpClient()
        ..connectionTimeout = const Duration(seconds: 30)
        ..idleTimeout = const Duration(seconds: 15)
        ..maxConnectionsPerHost = 4,
      _PlainOverrides(),
    );
  }

  bool get hasToken => _token != null;

  void reset() {
    _token = null;
    sessionId = null;
  }

  Future<ORSessionResponse?> createSession(Map<String, Object?> params) async {
    try {
      final req = await _client.postUrl(Uri.parse('$baseUrl$startUrl'));
      req.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      req.add(utf8.encode(jsonEncode(params)));
      final res = await req.close();
      final bodyText = await res.transform(utf8.decoder).join();

      if (res.statusCode < 200 || res.statusCode > 299) {
        lastStartStatus = res.statusCode;
        DebugUtils.error('start failed ${res.statusCode}: $bodyText');
        return null;
      }

      final session = ORSessionResponse.fromJson(
        jsonDecode(bodyText) as Map<String, Object?>,
      );
      _token = session.token;
      sessionId = session.sessionId;
      _framesSupport = session.framesSupport;
      lastStartStatus = null;
      // Kept until the late file is replayed, so a coldStart -> trigger pair
      // (two starts before the first replay) still uses the right token.
      _previousToken ??= await ORUserDefaults.shared.lastToken();
      await ORUserDefaults.shared.setLastToken(session.token);
      return session;
    } on Object catch (e) {
      lastStartStatus = null;
      DebugUtils.error('start request threw: $e');
      return null;
    }
  }

  /// Sends a gzipped message batch. Returns false so the caller can requeue.
  @override
  Future<bool> sendMessages(Uint8List content) async {
    final token = _token;
    if (token == null) return false;
    try {
      final req = await _client.postUrl(Uri.parse('$baseUrl$ingestUrl'));
      req.headers
        ..set(HttpHeaders.authorizationHeader, 'Bearer $token')
        ..set(HttpHeaders.contentTypeHeader, 'application/octet-stream')
        ..set(HttpHeaders.contentEncodingHeader, 'gzip');
      final compressed = gzip.encode(content);
      DebugUtils.log('batch ${content.length} -> ${compressed.length} bytes');
      req.add(compressed);
      final res = await req.close();
      final body = await res.transform(utf8.decoder).join();
      if (res.statusCode < 200 || res.statusCode > 299) {
        DebugUtils.error('ingest ${res.statusCode}: $body');
      }
      if (res.statusCode == 401) {
        // Token expired: drop it so queued batches wait, and ask the tracker
        // for a fresh session (what the iOS SDK does in callAPI).
        _token = null;
        DebugUtils.error('ingest returned 401, token cleared');
        onUnauthorized?.call();
        return false;
      }
      return res.statusCode >= 200 && res.statusCode <= 299;
    } on Object catch (e) {
      DebugUtils.error('ingest threw: $e');
      return false;
    }
  }

  /// Replays the batch persisted at the end of a previous run.
  @override
  Future<bool> sendLateMessages(Uint8List content) async {
    final token = _previousToken ?? await ORUserDefaults.shared.lastToken();
    if (token == null) {
      DebugUtils.log('no last token, skipping late messages');
      return false;
    }
    try {
      final req = await _client.postUrl(Uri.parse('$baseUrl$lateUrl'));
      req.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      req.add(content);
      final res = await req.close();
      await res.drain<void>();
      final ok = res.statusCode >= 200 && res.statusCode <= 299;
      if (ok) _previousToken = null;
      return ok;
    } on Object catch (e) {
      DebugUtils.error('late request threw: $e');
      return false;
    }
  }

  /// Uploads a gzipped `.frames` archive as multipart/form-data.
  /// Built by hand, as the iOS SDK does, to avoid a dependency.
  @override
  Future<bool> sendImages({
    required String projectKey,
    required Uint8List archive,
    required String name,
  }) async {
    final token = _token;
    if (token == null) return false;
    final boundary = 'Boundary-${ORUserDefaults.randomUuidV4()}';

    final head = StringBuffer();
    void field(String key, String value) {
      head
        ..write('--$boundary\r\n')
        ..write('Content-Disposition: form-data; name="$key"\r\n\r\n')
        ..write('$value\r\n');
    }

    field('projectKey', projectKey);
    if (_framesSupport) field('type', 'frames');
    head
      ..write('--$boundary\r\n')
      ..write(
          'Content-Disposition: form-data; name="batch"; filename="$name"\r\n')
      ..write('Content-Type: gzip\r\n\r\n');

    final body = BytesBuilder(copy: false)
      ..add(utf8.encode(head.toString()))
      ..add(archive)
      ..add(utf8.encode('\r\n--$boundary--\r\n'));

    try {
      final req = await _client.postUrl(Uri.parse('$baseUrl$imagesUrl'));
      req.headers
        ..set(HttpHeaders.authorizationHeader, 'Bearer $token')
        ..set(HttpHeaders.contentTypeHeader,
            'multipart/form-data; boundary=$boundary');
      req.add(body.takeBytes());
      final res = await req.close();
      final responseText = await res.transform(utf8.decoder).join();
      final ok = res.statusCode >= 200 && res.statusCode <= 299;
      if (ok) {
        DebugUtils.log('images $name uploaded (${res.statusCode})');
      } else {
        DebugUtils.error(
            'images $name rejected ${res.statusCode}: $responseText');
      }
      return ok;
    } on Object catch (e) {
      DebugUtils.error('images threw: $e');
      return false;
    }
  }
}

/// Default `HttpOverrides`: its `createHttpClient` is the stock dart:io one.
class _PlainOverrides extends HttpOverrides {}
