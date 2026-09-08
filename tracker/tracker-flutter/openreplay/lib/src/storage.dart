import 'dart:math';

import 'native.dart';

/// Port of ORUserDefaults.swift.
///
/// The user UUID lives in plain preferences; the session token is a credential
/// and lives in the platform secure store (Keychain on iOS, Keystore-encrypted
/// on Android), mirroring ORKeychain.swift.
class ORUserDefaults {
  ORUserDefaults._();
  static final ORUserDefaults shared = ORUserDefaults._();

  static const _userUuidKey = 'userUUID';
  static const _lastTokenKey = 'lastToken';

  static final Random _random = Random.secure();

  String? _cachedUuid;

  /// Reads the stored UUID, minting and persisting one on first run.
  Future<String> userUUID() async {
    final cached = _cachedUuid;
    if (cached != null) return cached;

    final stored = await ORNative.shared.prefsGet(_userUuidKey);
    if (stored != null && stored.isNotEmpty) {
      _cachedUuid = stored;
      return stored;
    }

    final fresh = randomUuidV4();
    await ORNative.shared.prefsSet(_userUuidKey, fresh);
    _cachedUuid = fresh;
    return fresh;
  }

  Future<String?> lastToken() => ORNative.shared.secureGet(_lastTokenKey);

  Future<void> setLastToken(String? token) =>
      ORNative.shared.secureSet(_lastTokenKey, token);

  /// A v4 UUID from `Random.secure()`, so the package needs no `uuid` package.
  /// Upper-cased to match `UUID().uuidString` on iOS.
  static String randomUuidV4() {
    final b = List<int>.generate(16, (_) => _random.nextInt(256));
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant 1
    String hex(int start, int end) => b
        .sublist(start, end)
        .map((x) => x.toRadixString(16).padLeft(2, '0'))
        .join();
    return '${hex(0, 4)}-${hex(4, 6)}-${hex(6, 8)}-${hex(8, 10)}-${hex(10, 16)}'
        .toUpperCase();
  }
}
