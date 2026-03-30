package com.openreplay.reactnative

import android.app.Activity
import com.facebook.react.bridge.*
import com.openreplay.tracker.OpenReplay
import com.openreplay.tracker.models.OROptions
import com.openreplay.tracker.models.RecordingFrequency
import com.openreplay.tracker.models.RecordingQuality

class ReactNativeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return NAME
  }

  companion object {
    const val NAME = "ORTrackerConnector"
  }

  private fun getBooleanOrDefault(map: ReadableMap, key: String, default: Boolean): Boolean {
    return if (map.hasKey(key)) map.getBoolean(key) else default
  }

  private fun getIntOrDefault(map: ReadableMap, key: String, default: Int): Int {
    return if (map.hasKey(key)) map.getInt(key) else default
  }

  private fun getStringOrDefault(map: ReadableMap, key: String, default: String): String {
    return if (map.hasKey(key)) map.getString(key) ?: default else default
  }

  private fun parseRecordingFrequency(value: String): RecordingFrequency {
    return when (value.lowercase()) {
      "standard" -> RecordingFrequency.Standard
      "high" -> RecordingFrequency.High
      else -> RecordingFrequency.Low
    }
  }

  private fun parseRecordingQuality(value: String): RecordingQuality {
    return when (value.lowercase()) {
      "standard" -> RecordingQuality.Standard
      "high" -> RecordingQuality.High
      else -> RecordingQuality.Low
    }
  }

  private fun safeGetCurrentActivity(): Activity? {
    return reactApplicationContext.currentActivity
  }

  @ReactMethod
  fun startSession(
    projectKey: String,
    optionsMap: ReadableMap,
    projectUrl: String?,
    promise: Promise
  ) {
    val serverURL = projectUrl ?: "https://api.openreplay.com/ingest"
    val options = OROptions(
      crashes = getBooleanOrDefault(optionsMap, "crashes", true),
      analytics = getBooleanOrDefault(optionsMap, "analytics", true),
      performances = getBooleanOrDefault(optionsMap, "performances", true),
      logs = getBooleanOrDefault(optionsMap, "logs", false),
      screen = getBooleanOrDefault(optionsMap, "screen", true),
      debugLogs = getBooleanOrDefault(optionsMap, "debugLogs", false),
      debugImages = getBooleanOrDefault(optionsMap, "debugImages", false),
      wifiOnly = getBooleanOrDefault(optionsMap, "wifiOnly", true),
      fps = getIntOrDefault(optionsMap, "fps", 1),
      screenshotFrequency = parseRecordingFrequency(getStringOrDefault(optionsMap, "screenshotFrequency", "low")),
      screenshotQuality = parseRecordingQuality(getStringOrDefault(optionsMap, "screenshotQuality", "low")),
    )

    val activity = safeGetCurrentActivity()
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No current activity available")
      return
    }

    OpenReplay.serverURL = serverURL

    OpenReplay.start(activity, projectKey, options, onStarted = {
      reactApplicationContext.runOnNativeModulesQueueThread {
        promise.resolve("OpenReplay Started")
      }
    })
  }

  @ReactMethod
  fun stop() {
    OpenReplay.stop()
  }


  @ReactMethod
  fun setMetadata(key: String, value: String) {
    OpenReplay.setMetadata(key, value)
  }

  @ReactMethod
  fun event(name: String, obj: String?) {
    OpenReplay.event(name, obj)
  }

  @ReactMethod
  fun setUserID(userID: String) {
    OpenReplay.setUserID(userID)
  }

  @ReactMethod
  fun userAnonymousID(userID: String) {
    OpenReplay.userAnonymousID(userID)
  }

  @ReactMethod
  fun getSessionID(promise: Promise) {
    try {
      val sessionId = OpenReplay.getSessionID()
      promise.resolve(sessionId)
    } catch (e: Exception) {
      promise.reject("GET_SESSION_ID_ERROR", "Failed to retrieve session ID", e)
    }
  }

  @ReactMethod
  fun networkRequest(
    url: String,
    method: String,
    requestJSON: String,
    responseJSON: String,
    status: Int,
    duration: Double
  ) {
    val durationULong: ULong = maxOf(0L, duration.toLong()).toULong()

    OpenReplay.networkRequest(
      url = url,
      method = method,
      requestJSON = requestJSON,
      responseJSON = responseJSON,
      status = status,
      duration = durationULong
    )
  }

  @ReactMethod
  fun sendMessage(type: String, message: String) {
    OpenReplay.sendMessage(type, message)
  }
}
