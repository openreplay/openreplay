package com.openreplay.flutter

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.hardware.display.DisplayManager
import android.os.BatteryManager
import android.os.Build
import android.os.Debug
import android.os.PowerManager
import android.view.Display
import android.view.Surface
import android.view.WindowManager
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.Executors

/**
 * Native half of the OpenReplay Flutter SDK.
 *
 * Only what Dart cannot do: JPEG encoding, OS counters, and secure storage.
 * The wire protocol, batching and capture scheduling are all Dart, so this does
 * not depend on the standalone Android tracker.
 */
class OpenreplayPlugin : FlutterPlugin, MethodChannel.MethodCallHandler {
  private lateinit var channel: MethodChannel
  private lateinit var context: Context
  private lateinit var secureStore: ORSecureStore

  /** Single-threaded: the Dart side drops frames when the encoder is busy. */
  private val encodeExecutor = Executors.newSingleThreadExecutor()

  private val prefs by lazy {
    context.getSharedPreferences("io.openreplay.tracker", Context.MODE_PRIVATE)
  }

  override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    context = binding.applicationContext
    secureStore = ORSecureStore(context)
    channel = MethodChannel(binding.binaryMessenger, "openreplay")
    channel.setMethodCallHandler(this)
  }

  override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    channel.setMethodCallHandler(null)
    encodeExecutor.shutdown()
  }

  override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
    when (call.method) {
      "encodeFrame" -> encodeFrame(call, result)
      "systemMetrics" -> result.success(systemMetrics())
      "deviceInfo" -> result.success(deviceInfo())
      "secureGet" -> result.success(secureStore.get(call.argument<String>("key") ?: ""))
      "secureSet" -> {
        secureStore.set(call.argument<String>("key") ?: "", call.argument<String>("value"))
        result.success(null)
      }
      "prefsGet" -> result.success(prefs.getString(call.argument<String>("key") ?: "", null))
      "prefsSet" -> {
        prefs.edit()
          .putString(call.argument<String>("key") ?: "", call.argument<String>("value"))
          .apply()
        result.success(null)
      }
      "cacheDirectory" -> result.success(context.cacheDir.absolutePath)
      else -> result.notImplemented()
    }
  }

  // MARK: - frame encoding

  private fun encodeFrame(call: MethodCall, result: MethodChannel.Result) {
    val rgba = call.argument<ByteArray>("rgba")
    val width = call.argument<Int>("width") ?: 0
    val height = call.argument<Int>("height") ?: 0
    val quality = call.argument<Double>("quality") ?: 0.5
    val previousHash = call.argument<Long>("previousHash")

    if (rgba == null || width <= 0 || height <= 0 || rgba.size < width * height * 4) {
      result.error("bad_args", "encodeFrame needs rgba/width/height/quality", null)
      return
    }

    encodeExecutor.execute {
      // Hash before encoding: an unchanged frame then costs a hash rather than
      // a hash plus an encode plus an upload.
      val hash = hash64(rgba)
      if (previousHash != null && previousHash == hash) {
        postSuccess(result, mapOf("bytes" to null, "hash" to hash))
        return@execute
      }

      val jpeg = try {
        // Flutter's rawRgba is straight RGBA; Bitmap wants premultiplied
        // ARGB_8888, and copyPixelsFromBuffer expects the platform's own
        // component order, so convert explicitly.
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        bitmap.copyPixelsFromBuffer(ByteBuffer.wrap(rgba).order(ByteOrder.nativeOrder()))
        val out = ByteArrayOutputStream(width * height / 8)
        bitmap.compress(Bitmap.CompressFormat.JPEG, (quality * 100).toInt().coerceIn(1, 100), out)
        bitmap.recycle()
        out.toByteArray()
      } catch (e: Throwable) {
        null
      }

      if (jpeg == null) {
        postError(result, "encode_failed", "could not encode frame")
      } else {
        postSuccess(result, mapOf("bytes" to jpeg, "hash" to hash))
      }
    }
  }

  private fun postSuccess(result: MethodChannel.Result, value: Map<String, Any?>) {
    android.os.Handler(context.mainLooper).post { result.success(value) }
  }

  private fun postError(result: MethodChannel.Result, code: String, message: String) {
    android.os.Handler(context.mainLooper).post { result.error(code, message, null) }
  }

  /** FNV-1a over the raw pixels; only has to notice that a frame changed. */
  private fun hash64(data: ByteArray): Long {
    var hash = -0x340d631b7bdddcdbL // 0xcbf29ce484222325
    for (byte in data) {
      hash = hash xor (byte.toLong() and 0xff)
      hash *= 0x100000001b3L
    }
    // Dart ints are signed; keep it positive so the channel round-trips it.
    return hash and 0x7fffffffffffffffL
  }

  // MARK: - metrics

  /**
   * Keys are the MobilePerformanceEvent names the player understands; do not
   * rename them. `orientation` deliberately uses UIDeviceOrientation numbering
   * because the player matches on the raw values 3 and 4.
   */
  private fun systemMetrics(): Map<String, Int> {
    val out = mutableMapOf<String, Int>()

    val memInfo = Debug.MemoryInfo()
    Debug.getMemoryInfo(memInfo)
    out["memoryUsage"] = memInfo.totalPss * 1024

    // Android exposes no per-thread CPU percentage comparable to iOS's
    // mainThreadCPU, and /proc self-reads were restricted in API 26+. Reported
    // as unavailable rather than guessed.

    val battery = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    if (battery != null) {
      val level = battery.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
      val scale = battery.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
      if (level >= 0 && scale > 0) out["batteryLevel"] = level * 100 / scale
      out["batteryState"] = when (battery.getIntExtra(BatteryManager.EXTRA_STATUS, -1)) {
        BatteryManager.BATTERY_STATUS_CHARGING -> 2
        BatteryManager.BATTERY_STATUS_FULL -> 3
        BatteryManager.BATTERY_STATUS_DISCHARGING,
        BatteryManager.BATTERY_STATUS_NOT_CHARGING -> 1
        else -> 0
      }
    }

    val power = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
    out["isLowPowerModeEnabled"] = if (power?.isPowerSaveMode == true) 1 else 0

    out["orientation"] = deviceOrientation()
    return out
  }

  /** Surface rotation mapped onto UIDeviceOrientation values. */
  private fun deviceOrientation(): Int {
    val rotation = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      (context.getSystemService(Context.DISPLAY_SERVICE) as? DisplayManager)
        ?.getDisplay(Display.DEFAULT_DISPLAY)?.rotation
    } else {
      @Suppress("DEPRECATION")
      (context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager)?.defaultDisplay?.rotation
    }
    return when (rotation) {
      Surface.ROTATION_90 -> 3 // landscapeLeft
      Surface.ROTATION_270 -> 4 // landscapeRight
      Surface.ROTATION_180 -> 2 // portraitUpsideDown
      else -> 1 // portrait
    }
  }

  private fun deviceInfo(): Map<String, Any> {
    val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
    val memInfo = ActivityManager.MemoryInfo()
    activityManager?.getMemoryInfo(memInfo)

    val versionName = try {
      context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "N/A"
    } catch (e: Throwable) {
      "N/A"
    }

    return mapOf(
      "revID" to versionName,
      "userOSVersion" to Build.VERSION.RELEASE,
      "userDevice" to Build.MODEL,
      "userDeviceType" to "mobile",
      "deviceMemory" to (memInfo.totalMem / 1024).toInt(),
      "performances" to mapOf(
        "physicalMemory" to memInfo.totalMem.toInt(),
        "processorCount" to Runtime.getRuntime().availableProcessors(),
        "activeProcessorCount" to Runtime.getRuntime().availableProcessors(),
      ),
    )
  }
}
