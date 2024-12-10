package com.openreplay.reactnative

import android.content.Context
import android.graphics.PointF
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.openreplay.tracker.listeners.Analytics
import com.openreplay.tracker.listeners.SwipeDirection
import kotlin.math.abs
import kotlin.math.sqrt

class RnTrackerTouchManager : ViewGroupManager<FrameLayout>() {

  override fun getName(): String = "RnTrackerTouchView"

  override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
    return RnTrackerRootLayout(reactContext)
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

class RnTrackerRootLayout(context: Context) : FrameLayout(context) {
  private val touchStart = PointF()

  override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
    when (ev.action) {
      MotionEvent.ACTION_DOWN -> {
        // Record the starting point for swipe/tap differentiation
        touchStart.x = ev.x
        touchStart.y = ev.y
        Log.d("RnTrackerRootLayout", "ACTION_DOWN at global: (${ev.rawX}, ${ev.rawY})")
      }
      MotionEvent.ACTION_UP -> {
        val deltaX = ev.x - touchStart.x
        val deltaY = ev.y - touchStart.y
        val distance = sqrt(deltaX * deltaX + deltaY * deltaY)

        // Find the exact view that was tapped
        val tappedView = findViewAt(this, ev.x.toInt(), ev.y.toInt())

        if (distance > 10) {
          // Consider this a swipe
          val direction = if (abs(deltaX) > abs(deltaY)) {
            if (deltaX > 0) "RIGHT" else "LEFT"
          } else {
            if (deltaY > 0) "DOWN" else "UP"
          }
          Log.d("RnTrackerRootLayout", "Swipe detected: $direction")
          Analytics.sendSwipe(SwipeDirection.valueOf(direction), ev.rawX, ev.rawY)
        } else {
          // Consider this a tap
          val label = tappedView?.contentDescription?.toString() ?: "Button"
          Log.d("RnTrackerRootLayout", "Tap detected on $tappedView with label: $label")

          val currentTime = android.os.SystemClock.uptimeMillis()
          val syntheticEvent = MotionEvent.obtain(
            currentTime,
            currentTime,
            MotionEvent.ACTION_UP,
            ev.rawX,
            ev.rawY,
            0
          )

          Analytics.sendClick(syntheticEvent, label)
          syntheticEvent.recycle()

          // Perform the click on the tapped view
          tappedView?.performClick()
        }
      }
    }
    // Call super to ensure normal behavior (scrolling, clicks, etc.) is not disturbed
    return super.dispatchTouchEvent(ev)
  }

  private fun findViewAt(parent: ViewGroup, x: Int, y: Int): View? {
    for (i in parent.childCount - 1 downTo 0) {
      val child = parent.getChildAt(i)
      if (isPointInsideView(x, y, child)) {
        if (child is ViewGroup) {
          val childX = x - child.left
          val childY = y - child.top
          val result = findViewAt(child, childX, childY)
          return result ?: child
        } else {
          return child
        }
      }
    }
    return null
  }

  private fun isPointInsideView(x: Int, y: Int, view: View): Boolean {
    return x >= view.left && x <= view.right && y >= view.top && y <= view.bottom
  }
}
