package com.openreplay.reactnative

import android.app.Activity
import android.content.Intent
import com.facebook.common.activitylistener.BaseActivityListener
import com.facebook.react.bridge.*
import com.openreplay.tracker.OpenReplay
import com.openreplay.tracker.models.OROptions

class ReactNativeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return NAME
  }

  companion object {
    const val NAME = "ORTrackerConnector"
  }

  data class Options(
    val crashes: Boolean = true,
    val analytics: Boolean = true,
    val performances: Boolean = true,
    val logs: Boolean = true,
    val screen: Boolean = true,
    val debugLogs: Boolean = false,
    val wifiOnly: Boolean = true
  )

  private fun getBooleanOrDefault(map: ReadableMap, key: String, default: Boolean): Boolean {
    return if (map.hasKey(key)) map.getBoolean(key) else default
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
      wifiOnly = getBooleanOrDefault(optionsMap, "wifiOnly", true),
    )

    val context = currentActivity as Activity
    OpenReplay.serverURL = serverURL

    OpenReplay.start(context, projectKey, options, onStarted = {
      println("OpenReplay started")
      promise.resolve("OpenReplay Started")
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
    // val durationLong: Long = duration.toLong()
    val durationULong: ULong = duration.toLong().toULong()

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
