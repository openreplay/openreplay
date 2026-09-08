import 'dart:async';
import 'dart:convert';
import 'dart:io';

import '../debug.dart';
import '../openreplay.dart';
import 'network_options.dart';

/// Captures `dart:io` HTTP traffic. Port of the web tracker's network module.
///
/// `HttpOverrides.global` is a single global slot that Sentry, Datadog and
/// Firebase Performance also install into, so this chains to whatever was
/// already there instead of replacing it. It covers `HttpClient`, and with it
/// `package:http`'s IOClient and Dio's default adapter; a custom Dio adapter
/// needs its own interceptor calling [OpenReplay.networkRequest].
class ORHttpOverrides extends HttpOverrides {
  ORHttpOverrides(this._previous, this._options);

  final HttpOverrides? _previous;
  final ORNetworkOptions _options;

  static ORHttpOverrides? _installed;

  /// Installs the interceptor. Idempotent.
  static void install(ORNetworkOptions options) {
    if (_installed != null) return;
    final overrides = ORHttpOverrides(HttpOverrides.current, options);
    _installed = overrides;
    HttpOverrides.global = overrides;
  }

  /// Restores whatever was installed beforehand.
  static void uninstall() {
    final overrides = _installed;
    if (overrides == null) return;
    _installed = null;
    HttpOverrides.global = overrides._previous;
  }

  @override
  HttpClient createHttpClient(SecurityContext? context) {
    final inner =
        _previous?.createHttpClient(context) ?? super.createHttpClient(context);
    return _RecordingHttpClient(inner, _options);
  }

  @override
  String findProxyFromEnvironment(Uri url, Map<String, String>? environment) =>
      _previous?.findProxyFromEnvironment(url, environment) ??
      super.findProxyFromEnvironment(url, environment);
}

/// Delegates every member to [_inner], wrapping only request creation.
class _RecordingHttpClient implements HttpClient {
  _RecordingHttpClient(this._inner, this._options);

  final HttpClient _inner;
  final ORNetworkOptions _options;

  @override
  Future<HttpClientRequest> open(
    String method,
    String host,
    int port,
    String path,
  ) async =>
      _wrap(await _inner.open(method, host, port, path));

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) async =>
      _wrap(await _inner.openUrl(method, url));

  // The convenience methods are routed through our own openUrl so they are
  // captured too; the inner client's versions would bypass the wrapper.
  @override
  Future<HttpClientRequest> get(String host, int port, String path) =>
      open('get', host, port, path);
  @override
  Future<HttpClientRequest> getUrl(Uri url) => openUrl('get', url);
  @override
  Future<HttpClientRequest> post(String host, int port, String path) =>
      open('post', host, port, path);
  @override
  Future<HttpClientRequest> postUrl(Uri url) => openUrl('post', url);
  @override
  Future<HttpClientRequest> put(String host, int port, String path) =>
      open('put', host, port, path);
  @override
  Future<HttpClientRequest> putUrl(Uri url) => openUrl('put', url);
  @override
  Future<HttpClientRequest> delete(String host, int port, String path) =>
      open('delete', host, port, path);
  @override
  Future<HttpClientRequest> deleteUrl(Uri url) => openUrl('delete', url);
  @override
  Future<HttpClientRequest> patch(String host, int port, String path) =>
      open('patch', host, port, path);
  @override
  Future<HttpClientRequest> patchUrl(Uri url) => openUrl('patch', url);
  @override
  Future<HttpClientRequest> head(String host, int port, String path) =>
      open('head', host, port, path);
  @override
  Future<HttpClientRequest> headUrl(Uri url) => openUrl('head', url);

  HttpClientRequest _wrap(HttpClientRequest request) {
    final tokenHeader = _options.sessionTokenHeader;
    if (tokenHeader != null) {
      final sessionId = OpenReplay.instance.sessionId;
      if (sessionId.isNotEmpty) request.headers.set(tokenHeader, sessionId);
    }
    return _RecordingRequest(request, _options);
  }

  @override
  bool get autoUncompress => _inner.autoUncompress;
  @override
  set autoUncompress(bool value) => _inner.autoUncompress = value;

  @override
  Duration? get connectionTimeout => _inner.connectionTimeout;
  @override
  set connectionTimeout(Duration? value) => _inner.connectionTimeout = value;

  @override
  Duration get idleTimeout => _inner.idleTimeout;
  @override
  set idleTimeout(Duration value) => _inner.idleTimeout = value;

  @override
  int? get maxConnectionsPerHost => _inner.maxConnectionsPerHost;
  @override
  set maxConnectionsPerHost(int? value) => _inner.maxConnectionsPerHost = value;

  @override
  String? get userAgent => _inner.userAgent;
  @override
  set userAgent(String? value) => _inner.userAgent = value;

  @override
  set authenticate(
          Future<bool> Function(Uri url, String scheme, String? realm)? f) =>
      _inner.authenticate = f;

  @override
  set authenticateProxy(
          Future<bool> Function(
                  String host, int port, String scheme, String? realm)?
              f) =>
      _inner.authenticateProxy = f;

  @override
  set badCertificateCallback(
          bool Function(X509Certificate cert, String host, int port)?
              callback) =>
      _inner.badCertificateCallback = callback;

  @override
  set connectionFactory(
          Future<ConnectionTask<Socket>> Function(
                  Uri url, String? proxyHost, int? proxyPort)?
              f) =>
      _inner.connectionFactory = f;

  @override
  set findProxy(String Function(Uri url)? f) => _inner.findProxy = f;

  @override
  set keyLog(void Function(String line)? callback) => _inner.keyLog = callback;

  @override
  void addCredentials(
          Uri url, String realm, HttpClientCredentials credentials) =>
      _inner.addCredentials(url, realm, credentials);

  @override
  void addProxyCredentials(
    String host,
    int port,
    String realm,
    HttpClientCredentials credentials,
  ) =>
      _inner.addProxyCredentials(host, port, realm, credentials);

  @override
  void close({bool force = false}) => _inner.close(force: force);
}

/// Buffers the outgoing body (only when asked) and times the round trip.
class _RecordingRequest implements HttpClientRequest {
  _RecordingRequest(this._inner, this._options);

  final HttpClientRequest _inner;
  final ORNetworkOptions _options;
  final List<int> _body = [];
  final Stopwatch _clock = Stopwatch()..start();

  bool get _wantsBody => _options.capturePayload;

  @override
  Future<HttpClientResponse> close() async {
    final response = await _inner.close();
    return _RecordingResponse(
      response,
      _options,
      request: _inner,
      requestBody: _wantsBody ? _body : null,
      clock: _clock,
    );
  }

  @override
  void add(List<int> data) {
    if (_wantsBody) _body.addAll(data);
    _inner.add(data);
  }

  @override
  void write(Object? object) {
    final text = '$object';
    if (_wantsBody) _body.addAll(encoding.encode(text));
    _inner.write(text);
  }

  @override
  void writeAll(Iterable<dynamic> objects, [String separator = '']) =>
      write(objects.join(separator));

  @override
  void writeCharCode(int charCode) => write(String.fromCharCode(charCode));

  @override
  void writeln([Object? object = '']) => write('$object\n');

  @override
  Future<void> addStream(Stream<List<int>> stream) {
    if (!_wantsBody) return _inner.addStream(stream);
    return _inner.addStream(stream.map((chunk) {
      _body.addAll(chunk);
      return chunk;
    }));
  }

  @override
  void addError(Object error, [StackTrace? stackTrace]) =>
      _inner.addError(error, stackTrace);

  @override
  Future<void> flush() => _inner.flush();

  @override
  Future<HttpClientResponse> get done => _inner.done;

  @override
  bool get bufferOutput => _inner.bufferOutput;
  @override
  set bufferOutput(bool value) => _inner.bufferOutput = value;

  @override
  int get contentLength => _inner.contentLength;
  @override
  set contentLength(int value) => _inner.contentLength = value;

  @override
  Encoding get encoding => _inner.encoding;
  @override
  set encoding(Encoding value) => _inner.encoding = value;

  @override
  bool get followRedirects => _inner.followRedirects;
  @override
  set followRedirects(bool value) => _inner.followRedirects = value;

  @override
  int get maxRedirects => _inner.maxRedirects;
  @override
  set maxRedirects(int value) => _inner.maxRedirects = value;

  @override
  bool get persistentConnection => _inner.persistentConnection;
  @override
  set persistentConnection(bool value) => _inner.persistentConnection = value;

  @override
  HttpConnectionInfo? get connectionInfo => _inner.connectionInfo;
  @override
  List<Cookie> get cookies => _inner.cookies;
  @override
  HttpHeaders get headers => _inner.headers;
  @override
  String get method => _inner.method;
  @override
  Uri get uri => _inner.uri;

  @override
  void abort([Object? exception, StackTrace? stackTrace]) =>
      _inner.abort(exception, stackTrace);
}

/// Tees the response body, then reports the call once the stream completes.
///
/// Extending Stream means every derived stream method comes for free in terms
/// of [listen].
class _RecordingResponse extends Stream<List<int>>
    implements HttpClientResponse {
  _RecordingResponse(
    this._inner,
    this._options, {
    required HttpClientRequest request,
    required List<int>? requestBody,
    required Stopwatch clock,
  })  : _request = request,
        _requestBody = requestBody,
        _clock = clock;

  final HttpClientResponse _inner;
  final ORNetworkOptions _options;
  final HttpClientRequest _request;
  final List<int>? _requestBody;
  final Stopwatch _clock;

  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int> event)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) {
    final captured = _options.capturePayload ? <int>[] : null;
    return _inner.listen(
      (chunk) {
        captured?.addAll(chunk);
        onData?.call(chunk);
      },
      onError: onError,
      onDone: () {
        _report(captured);
        onDone?.call();
      },
      cancelOnError: cancelOnError,
    );
  }

  void _report(List<int>? responseBody) {
    _clock.stop();
    try {
      if (_options.failuresOnly && statusCode >= 200 && statusCode <= 299) {
        return;
      }

      var record = ORRequestResponse(
        url: _request.uri.toString(),
        method: _request.method.toUpperCase(),
        status: statusCode,
        duration: _clock.elapsedMilliseconds,
        requestHeaders: _headers(_request.headers),
        responseHeaders: _headers(_inner.headers),
        requestBody: _decode(_requestBody),
        responseBody: _decode(responseBody),
      );

      final sanitizer = _options.sanitizer;
      if (sanitizer != null) {
        final sanitized = sanitizer(record);
        if (sanitized == null) return;
        record = sanitized;
      }

      OpenReplay.instance.networkRequest(
        url: record.url,
        method: record.method,
        requestJson: _encode(record.requestHeaders, record.requestBody),
        responseJson: _encode(record.responseHeaders, record.responseBody),
        status: record.status,
        duration: record.duration,
      );
    } on Object catch (e) {
      DebugUtils.error('could not record request: $e');
    }
  }

  Map<String, String> _headers(HttpHeaders headers) {
    if (_options.ignoreAllHeaders) return {};
    final ignored = _options.ignoreHeaders.map((h) => h.toLowerCase()).toSet();
    final out = <String, String>{};
    headers.forEach((name, values) {
      if (!ignored.contains(name.toLowerCase())) out[name] = values.join(', ');
    });
    return out;
  }

  /// Parses JSON so a sanitizer sees an object, as the web tracker does.
  Object? _decode(List<int>? bytes) {
    if (bytes == null || bytes.isEmpty) return null;
    try {
      final text = utf8.decode(bytes, allowMalformed: true);
      try {
        return jsonDecode(text);
      } on FormatException {
        return text;
      }
    } on Object {
      return null;
    }
  }

  String _encode(Map<String, String> headers, Object? body) {
    try {
      return jsonEncode({'headers': headers, if (body != null) 'body': body});
    } on Object {
      return jsonEncode({'headers': headers});
    }
  }

  @override
  X509Certificate? get certificate => _inner.certificate;
  @override
  HttpClientResponseCompressionState get compressionState =>
      _inner.compressionState;
  @override
  HttpConnectionInfo? get connectionInfo => _inner.connectionInfo;
  @override
  int get contentLength => _inner.contentLength;
  @override
  List<Cookie> get cookies => _inner.cookies;
  @override
  Future<Socket> detachSocket() => _inner.detachSocket();
  @override
  HttpHeaders get headers => _inner.headers;
  @override
  bool get isRedirect => _inner.isRedirect;
  @override
  bool get persistentConnection => _inner.persistentConnection;
  @override
  String get reasonPhrase => _inner.reasonPhrase;
  @override
  Future<HttpClientResponse> redirect([
    String? method,
    Uri? url,
    bool? followLoops,
  ]) =>
      _inner.redirect(method, url, followLoops);
  @override
  List<RedirectInfo> get redirects => _inner.redirects;
  @override
  int get statusCode => _inner.statusCode;
}
