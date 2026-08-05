package com.openreplay.reactnative

import android.content.Context
import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.views.view.ReactViewGroup
import com.openreplay.tracker.managers.ScreenshotManager

class RnTrackerSanitizedViewManager : ViewGroupManager<RnTrackerSanitizedView>() {
  override fun getName(): String = "RnSanitizedView"

  override fun createViewInstance(reactContext: ThemedReactContext): RnTrackerSanitizedView =
    RnTrackerSanitizedView(reactContext)

}

/**
 * Invisible marker that reports the frame of a sanitized region to the
 * screenshot manager. It is rendered as an absolutely positioned sibling behind
 * the sanitized subtree (see `ORSanitizedView` in src/index.tsx), so it must
 * never become a touch target for the content it covers.
 */
class RnTrackerSanitizedView(context: Context) : ReactViewGroup(context) {
  init {
    pointerEvents = PointerEvents.NONE
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    pointerEvents = PointerEvents.NONE
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
