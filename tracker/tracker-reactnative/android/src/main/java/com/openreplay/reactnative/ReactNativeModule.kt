package com.openreplay.reactnative

import android.app.Activity
import android.content.Intent
import com.facebook.common.activitylistener.BaseActivityListener
import com.facebook.react.bridge.*
import com.openreplay.tracker.OpenReplay
import com.openreplay.tracker.models.OROptions

class ReactNativeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  //  private val context = reactContext.acti
  override fun getName(): String {
    return NAME
  }

  // Example method
  // See https://reactnative.dev/docs/native-modules-android
  @ReactMethod
  fun multiply(a: Double, b: Double, promise: Promise) {
    promise.resolve(a * b * 2)
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
    val wifiOnly: Boolean = true  // assuming you want this as well
  )

  //    optionsMap: ReadableMap?,
  @ReactMethod
  fun startSession(
    projectKey: String,
    optionsMap: ReadableMap,
    projectUrl: String?,
    promise: Promise
  ) {
    val serverURL = projectUrl ?: "https://foss.openreplay.com/ingest"
    val options = OROptions(
      crashes = optionsMap.getBoolean("crashes"),
      analytics = optionsMap.getBoolean("analytics"),
//      performances = optionsMap.getBoolean("performances") ?: true,
//      logs = optionsMap.getBoolean("logs") ?: true,
      screen = optionsMap.getBoolean("screen"),
//      debugLogs = optionsMap.getBoolean("debugLogs") ?: false
//      wifiOnly = optionsMap.getBoolean("wifiOnly") ?: false,
//      debugImages = optionsMap.getBoolean("debugImages") ?: false
    )

    val context = currentActivity as Activity
    OpenReplay.serverURL = serverURL

    OpenReplay.start(context, projectKey, options, onStarted = {
      println("OpenReplay started")
      promise.resolve("OpenReplay Started")
    })
//    promise.resolve("OpenReplay Started")
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
  fun networkRequest(
    url: String,
    method: String,
    requestJSON: String,
    responseJSON: String,
    status: Int,
    duration: ULong
  ) {
    OpenReplay.networkRequest(url, method, requestJSON, responseJSON, status, duration)
  }
}
