package com.openreplay.reactnative

import android.content.Context
import android.widget.EditText
import androidx.appcompat.widget.AppCompatEditText
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.openreplay.tracker.listeners.Analytics

class RnTrackerInputManager : SimpleViewManager<EditText>() {
  override fun getName(): String = "RnTrackedInput"

  override fun createViewInstance(reactContext: ThemedReactContext): EditText =
    RnTrackerInput(reactContext)

  @ReactProp(name = "trackingLabel")
  fun setTrackingLabel(view: RnTrackerInput, label: String?) {
    view.trackingLabel = label
  }

  @ReactProp(name = "placeholder")
  fun setPlaceholder(view: RnTrackerInput, placeholder: String?) {
    view.hint = placeholder
  }
}

class RnTrackerInput(context: Context) : AppCompatEditText(context) {
  var trackingLabel: String? = null
  private var lastSentValue: String? = null

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    Analytics.addObservedInput(this)
    setOnFocusChangeListener { _, hasFocus ->
      if (!hasFocus) {
        val value = text?.toString() ?: ""
        if (value.isNotEmpty() && value != lastSentValue) {
          val label = trackingLabel
            ?: hint?.toString()
            ?: contentDescription?.toString()
            ?: "Input"
          Analytics.sendTextInput(value, label)
          lastSentValue = value
        }
      }
    }
  }

  override fun onDetachedFromWindow() {
    onFocusChangeListener = null
    super.onDetachedFromWindow()
    Analytics.cleanupDeadReferences()
  }
}
