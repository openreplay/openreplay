package com.openreplay.reactnative

import android.content.Context
import android.view.View
import android.widget.FrameLayout
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.openreplay.tracker.managers.ScreenshotManager

class RnTrackerSanitizedViewManager : ViewGroupManager<RnTrackerSanitizedView>() {
  override fun getName(): String = "RnSanitizedView"

  override fun createViewInstance(reactContext: ThemedReactContext): RnTrackerSanitizedView =
    RnTrackerSanitizedView(reactContext)

  override fun addView(parent: RnTrackerSanitizedView, child: View, index: Int) {
    parent.addView(child, index)
  }

  override fun getChildCount(parent: RnTrackerSanitizedView): Int =
    parent.childCount

  override fun getChildAt(parent: RnTrackerSanitizedView, index: Int): View =
    parent.getChildAt(index)

  override fun removeViewAt(parent: RnTrackerSanitizedView, index: Int) {
    parent.removeViewAt(index)
  }

  override fun removeAllViews(parent: RnTrackerSanitizedView) {
    parent.removeAllViews()
  }

  companion object {
    fun requiresMainQueueSetup(): Boolean = true
  }
}

class RnTrackerSanitizedView(context: Context) : FrameLayout(context) {
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    ScreenshotManager.addSanitizedElement(this)
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    ScreenshotManager.removeSanitizedElement(this)
  }
}
