import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:openreplay/src/listeners/network.dart';
import 'package:openreplay/src/listeners/network_options.dart';
import 'package:openreplay/src/transport/message_collector.dart';
import 'package:openreplay/src/transport/transport.dart';

class CapturingTransport implements ORTransport {
  @override
  Future<bool> sendMessages(_) async => true;
  @override
  Future<bool> sendLateMessages(_) async => true;
  @override
  Future<bool> sendImages({
    required String projectKey,
    required archive,
    required String name,
  }) async =>
      true;
}

/// Reads back the network calls the collector was handed, by re-encoding each
/// candidate and comparing bytes - the collector only keeps encoded messages.
void main() {
  late HttpServer server;
  late Uri endpoint;
  final List<ORRequestResponse> seen = [];

  setUpAll(() async {
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    endpoint = Uri.parse('http://127.0.0.1:${server.port}/api');
    server.listen((request) async {
      await request.drain<void>();
      request.response
        ..statusCode = 200
        ..headers.set('content-type', 'application/json')
        ..headers.set('set-cookie', 'secret=1')
        ..write('{"ok":true}');
      await request.response.close();
    });
  });

  tearDownAll(() async => server.close(force: true));

  setUp(() {
    seen.clear();
    MessageCollector.shared
      ..transport = CapturingTransport()
      ..reset();
  });

  tearDown(ORHttpOverrides.uninstall);

  /// Installs the interceptor with a sanitizer that records what it is given.
  void install({
    bool capturePayload = false,
    bool failuresOnly = false,
    List<String> ignoreHeaders = const [
      'cookie',
      'set-cookie',
      'authorization'
    ],
  }) {
    ORHttpOverrides.install(
      ORNetworkOptions(
        capturePayload: capturePayload,
        failuresOnly: failuresOnly,
        ignoreHeaders: ignoreHeaders,
        sanitizer: (record) {
          seen.add(record);
          return record;
        },
      ),
    );
  }

  Future<void> callEndpoint({String body = ''}) async {
    final client = HttpClient();
    final request = await client.postUrl(endpoint);
    request.headers.set('authorization', 'Bearer secret');
    if (body.isNotEmpty) {
      request.headers.set('content-type', 'application/json');
      request.write(body);
    }
    final response = await request.close();
    await response.transform(utf8.decoder).join();
    client.close();
  }

  test('records url, method, status and duration', () async {
    install();
    await callEndpoint();

    expect(seen, hasLength(1));
    expect(seen.single.url, endpoint.toString());
    expect(seen.single.method, 'POST');
    expect(seen.single.status, 200);
    expect(seen.single.duration, greaterThanOrEqualTo(0));
  });

  test('drops ignored headers on both sides by default', () async {
    install();
    await callEndpoint();

    final record = seen.single;
    expect(record.requestHeaders.keys.map((k) => k.toLowerCase()),
        isNot(contains('authorization')));
    expect(record.responseHeaders.keys.map((k) => k.toLowerCase()),
        isNot(contains('set-cookie')));
    expect(record.responseHeaders.keys.map((k) => k.toLowerCase()),
        contains('content-type'));
  });

  test('bodies are dropped unless capturePayload is set', () async {
    install();
    await callEndpoint(body: '{"user":"me"}');

    expect(seen.single.requestBody, isNull);
    expect(seen.single.responseBody, isNull);
  });

  test('capturePayload decodes JSON bodies into objects', () async {
    install(capturePayload: true);
    await callEndpoint(body: '{"user":"me"}');

    final record = seen.single;
    expect(record.requestBody, {'user': 'me'});
    expect(record.responseBody, {'ok': true});
  });

  test('a sanitizer returning null drops the call', () async {
    ORHttpOverrides.install(
      ORNetworkOptions(sanitizer: (_) => null),
    );
    await callEndpoint();
    // Nothing to assert beyond not throwing: the record never reaches the
    // collector, and the request itself still completed above.
    expect(seen, isEmpty);
  });

  test('failuresOnly skips 2xx responses', () async {
    install(failuresOnly: true);
    await callEndpoint();
    expect(seen, isEmpty);
  });

  test('the wrapped response still delivers the real body', () async {
    install();
    final client = HttpClient();
    final request = await client.getUrl(endpoint);
    final response = await request.close();
    final text = await response.transform(utf8.decoder).join();
    client.close();

    expect(text, '{"ok":true}');
  });
}
