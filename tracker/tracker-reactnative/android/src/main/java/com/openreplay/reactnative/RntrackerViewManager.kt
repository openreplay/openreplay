package com.openreplay.reactnative

import android.content.Context
import android.view.View
import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.openreplay.tracker.listeners.Analytics

class RnTrackerViewManager : ViewGroupManager<TrackingView>() {
  override fun getName(): String = "RnTrackerView"

  override fun createViewInstance(reactContext: ThemedReactContext): TrackingView {
    return TrackingView(reactContext)
  }

  @ReactProp(name = "screenName")
  fun setScreenName(view: TrackingView, screenName: String) {
    view.screenName = screenName
  }

  @ReactProp(name = "viewName")
  fun setViewName(view: TrackingView, viewName: String) {
    view.viewName = viewName
  }

  override fun addView(parent: TrackingView, child: View, index: Int) {
    parent.addView(child, index)
  }

  override fun getChildCount(parent: TrackingView): Int = parent.childCount

  override fun getChildAt(parent: TrackingView, index: Int): View = parent.getChildAt(index)

  override fun removeViewAt(parent: TrackingView, index: Int) {
    parent.removeViewAt(index)
  }

  override fun removeAllViews(parent: TrackingView) {
    parent.removeAllViews()
  }
}

/**
 * Invisible marker that reports the frame of a tracked region to the analytics
 * listener. It is rendered as an absolutely positioned sibling behind the tracked
 * subtree (see `ORTrackedView` in src/index.tsx), so it must never become a touch
 * target for the content it covers.
 */
class TrackingView(context: Context) : ReactViewGroup(context) {
  var viewName: String? = null
  var screenName: String? = null

  init {
    pointerEvents = PointerEvents.NONE
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    pointerEvents = PointerEvents.NONE
    val sn = screenName ?: return
    val vn = viewName ?: return
    Analytics.addObservedView(this, sn, vn)
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    Analytics.cleanupDeadReferences()
  }
}
