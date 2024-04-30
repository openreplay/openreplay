package com.openreplay.reactnative

import android.view.View
import android.widget.FrameLayout
import android.widget.Toast
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager

class CustomViewManager : ViewGroupManager<FrameLayout>() {
  override fun getName(): String = "RnCustomView"

  override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
    return FrameLayout(reactContext).apply {
      isClickable = true
      setOnClickListener { Toast.makeText(reactContext, "Tap detected", Toast.LENGTH_SHORT).show() }
    }
  }

  override fun addView(parent: FrameLayout, child: View, index: Int) {
    parent.addView(child, index)
  }

  override fun getChildCount(parent: FrameLayout): Int {
    return parent.childCount
  }

  override fun getChildAt(parent: FrameLayout, index: Int): View {
    return parent.getChildAt(index)
  }

  override fun removeViewAt(parent: FrameLayout, index: Int) {
    parent.removeViewAt(index)
  }

  override fun removeAllViews(parent: FrameLayout) {
    parent.removeAllViews()
  }
}
