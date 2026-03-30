package com.openreplay.reactnative

import android.content.Context
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.views.view.ReactViewGroup
import com.openreplay.tracker.managers.ScreenshotManager

class RnTrackerSanitizedViewManager : ViewGroupManager<RnTrackerSanitizedView>() {
  override fun getName(): String = "RnSanitizedView"

  override fun createViewInstance(reactContext: ThemedReactContext): RnTrackerSanitizedView =
    RnTrackerSanitizedView(reactContext)

}

class RnTrackerSanitizedView(context: Context) : ReactViewGroup(context) {
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    ScreenshotManager.addSanitizedElement(this)
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    ScreenshotManager.removeSanitizedElement(this)
  }

  override fun getLocationInWindow(outLocation: IntArray?) {
    if (outLocation == null) return
    super.getLocationInWindow(outLocation)
    val metrics = resources.displayMetrics
    val windowHeight = rootView.height
    if (windowHeight > 0 && windowHeight != metrics.heightPixels) {
      val scale = metrics.heightPixels.toFloat() / windowHeight.toFloat()
      outLocation[1] = (outLocation[1] * scale).toInt()
    }
  }
}
