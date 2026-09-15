/// One captured request/response pair, handed to [ORNetworkOptions.sanitizer].
class ORRequestResponse {
  ORRequestResponse({
    required this.url,
    required this.method,
    required this.status,
    required this.duration,
    required this.requestHeaders,
    required this.responseHeaders,
    this.requestBody,
    this.responseBody,
  });

  String url;
  final String method;
  final int status;
  final int duration;
  Map<String, String> requestHeaders;
  Map<String, String> responseHeaders;

  /// Decoded when it parses as JSON, so a sanitizer gets an object rather than
  /// a string - matching the web tracker's behaviour.
  Object? requestBody;
  Object? responseBody;
}

/// Mirrors the web tracker's network options
/// (tracker/tracker/src/main/modules/network.ts).
class ORNetworkOptions {
  const ORNetworkOptions({
    this.capturePayload = false,
    this.ignoreHeaders = const ['cookie', 'set-cookie', 'authorization'],
    this.ignoreAllHeaders = false,
    this.failuresOnly = false,
    this.sessionTokenHeader,
    this.sanitizer,
  });

  /// Bodies are dropped unless this is opted into.
  final bool capturePayload;

  /// Header names to drop, compared case-insensitively.
  final List<String> ignoreHeaders;

  /// The web tracker expresses this as `ignoreHeaders: true`; Dart has no
  /// `List<String> | bool` union, so it is a separate flag.
  final bool ignoreAllHeaders;

  /// Record only responses outside 2xx.
  final bool failuresOnly;

  /// When set, a header of this name carrying the session token is added to
  /// outgoing requests so backend logs can be correlated with the replay.
  final String? sessionTokenHeader;

  /// Last say over what is recorded. Return null to drop the call entirely.
  final ORRequestResponse? Function(ORRequestResponse)? sanitizer;
}
