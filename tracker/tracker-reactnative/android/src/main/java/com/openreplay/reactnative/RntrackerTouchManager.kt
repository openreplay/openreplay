package com.openreplay.reactnative

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.PointF
import android.view.MotionEvent
import android.view.View
import android.widget.FrameLayout
import android.widget.Toast
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.openreplay.tracker.listeners.Analytics
import com.openreplay.tracker.listeners.SwipeDirection
import kotlin.math.abs
import kotlin.math.sqrt

class RnTrackerTouchManager : ViewGroupManager<FrameLayout>() {
  override fun getName(): String = "RnTrackerTouchView"

  override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
    return FrameLayout(reactContext).apply {
      layoutParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT
      )
      isClickable = true
      val touchStart = PointF()
      setOnTouchListener { view, event ->
        when (event.action) {
          MotionEvent.ACTION_DOWN -> {
            touchStart.set(event.x, event.y)
            false
          }

          MotionEvent.ACTION_UP -> {
            val deltaX = event.x - touchStart.x
            val deltaY = event.y - touchStart.y
            val distance = sqrt(deltaX * deltaX + deltaY * deltaY)

            if (distance > 10) {
              val direction = if (abs(deltaX) > abs(deltaY)) {
                if (deltaX > 0) "RIGHT" else "LEFT"
              } else {
                if (deltaY > 0) "DOWN" else "UP"
              }
              Analytics.sendSwipe(SwipeDirection.valueOf(direction), event.x, event.y)
            } else {
              Analytics.sendClick(event)
              view.performClick()  // Perform click for accessibility
              false
            }
            true
          }

          else -> false
        }
      }
    }
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
