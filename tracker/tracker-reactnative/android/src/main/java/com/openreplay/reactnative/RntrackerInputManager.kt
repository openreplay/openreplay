package com.openreplay.reactnative

import android.content.Context
import android.widget.EditText
import androidx.appcompat.widget.AppCompatEditText
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.openreplay.tracker.listeners.Analytics

class RnTrackerInputManager : SimpleViewManager<EditText>() {
  override fun getName(): String = "RnTrackedInput"

  override fun createViewInstance(reactContext: ThemedReactContext): EditText =
    RnTrackerInput(reactContext)

  companion object {
    fun requiresMainQueueSetup(): Boolean = true
  }
}

class RnTrackerInput(context: Context) : AppCompatEditText(context) {
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    Analytics.addObservedInput(this)
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
//        Analytics.removeObservedInput(this)
  }
}
