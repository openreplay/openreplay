package com.openreplay.flutter

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Secure storage for the session token, the counterpart to ORKeychain on iOS.
 *
 * Values are encrypted with an AES-GCM key held in the Android Keystore and the
 * ciphertext is kept in private SharedPreferences. Done directly rather than
 * through androidx.security-crypto, which is deprecated and would add a
 * dependency for one string.
 */
internal class ORSecureStore(context: Context) {
  private companion object {
    const val KEY_ALIAS = "com.openreplay.tracker.key"
    const val PREFS = "io.openreplay.tracker.secure"
    const val KEYSTORE = "AndroidKeyStore"
    const val TRANSFORMATION = "AES/GCM/NoPadding"
    const val IV_LENGTH = 12
    const val TAG_LENGTH_BITS = 128
  }

  private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun set(key: String, value: String?) {
    if (key.isEmpty()) return
    if (value == null) {
      prefs.edit().remove(key).apply()
      return
    }
    try {
      val cipher = Cipher.getInstance(TRANSFORMATION)
      cipher.init(Cipher.ENCRYPT_MODE, secretKey())
      val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
      // Prefix the IV so decryption needs nothing else stored alongside.
      val packed = cipher.iv + encrypted
      prefs.edit().putString(key, Base64.encodeToString(packed, Base64.NO_WRAP)).apply()
    } catch (e: Throwable) {
      // A token that cannot be stored only costs us late-message replay.
      prefs.edit().remove(key).apply()
    }
  }

  fun get(key: String): String? {
    if (key.isEmpty()) return null
    val stored = prefs.getString(key, null) ?: return null
    return try {
      val packed = Base64.decode(stored, Base64.NO_WRAP)
      if (packed.size <= IV_LENGTH) return null
      val cipher = Cipher.getInstance(TRANSFORMATION)
      cipher.init(
        Cipher.DECRYPT_MODE,
        secretKey(),
        GCMParameterSpec(TAG_LENGTH_BITS, packed, 0, IV_LENGTH),
      )
      String(cipher.doFinal(packed, IV_LENGTH, packed.size - IV_LENGTH), Charsets.UTF_8)
    } catch (e: Throwable) {
      // Key rotated, app restored to another device, or corrupt value.
      prefs.edit().remove(key).apply()
      null
    }
  }

  private fun secretKey(): SecretKey {
    val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
    (keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }

    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
    generator.init(
      KeyGenParameterSpec.Builder(
        KEY_ALIAS,
        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
      )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .build(),
    )
    return generator.generateKey()
  }
}
