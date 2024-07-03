package com.openreplay.reactnative

import android.content.Context
import android.view.View
import android.widget.FrameLayout
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.openreplay.tracker.listeners.Analytics

class RnTrackerViewManager : ViewGroupManager<FrameLayout>() {
  override fun getName(): String = "RnTrackerView"

  override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
    return TrackingFrameLayout(reactContext)
  }

  @ReactProp(name = "screenName")
  fun setScreenName(view: TrackingFrameLayout, screenName: String) {
    view.screenName = screenName
  }

  @ReactProp(name = "viewName")
  fun setViewName(view: TrackingFrameLayout, viewName: String) {
    view.viewName = viewName
  }

  override fun addView(parent: FrameLayout, child: View, index: Int) {
    parent.addView(child, index)
  }

  override fun getChildCount(parent: FrameLayout): Int = parent.childCount

  override fun getChildAt(parent: FrameLayout, index: Int): View = parent.getChildAt(index)

  override fun removeViewAt(parent: FrameLayout, index: Int) {
    parent.removeViewAt(index)
  }

  override fun removeAllViews(parent: FrameLayout) {
    parent.removeAllViews()
  }
}

class TrackingFrameLayout(context: Context) : FrameLayout(context) {
  var viewName: String? = null
  var screenName: String? = null

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (viewName != null && screenName != null) {
      Analytics.addObservedView(this, screenName!!, viewName!!)
    }
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
//    if (viewName != null && screenName != null) {
//      Analytics.removeObservedView(this)
//    }
  }
}
