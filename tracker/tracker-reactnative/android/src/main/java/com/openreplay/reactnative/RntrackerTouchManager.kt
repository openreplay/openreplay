package com.openreplay.reactnative

import android.content.Context
import android.graphics.PointF
import android.util.Log
import android.view.GestureDetector
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
  private val gestureDetector: GestureDetector

  private var currentTappedView: View? = null

  // Variables to track total movement
  private var totalDeltaX: Float = 0f
  private var totalDeltaY: Float = 0f

  init {
    gestureDetector = GestureDetector(context, GestureListener())
  }

  override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
    // Pass all touch events to the GestureDetector
    gestureDetector.onTouchEvent(ev)

    when (ev.action) {
      MotionEvent.ACTION_DOWN -> {
        // Record the starting point for potential swipe
        touchStart.x = ev.x
        touchStart.y = ev.y
        // Reset total movement
        totalDeltaX = 0f
        totalDeltaY = 0f
        // Find and store the view that was touched
        currentTappedView = findViewAt(this, ev.x.toInt(), ev.y.toInt())
//        Log.d(
//          "RnTrackerRootLayout",
//          "ACTION_DOWN at global: (${ev.rawX}, ${ev.rawY}) on view: $currentTappedView"
//        )
      }
      MotionEvent.ACTION_MOVE -> {
        // Accumulate movement
        val deltaX = ev.x - touchStart.x
        val deltaY = ev.y - touchStart.y
        totalDeltaX += deltaX
        totalDeltaY += deltaY
        // Update touchStart for the next move event
        touchStart.x = ev.x
        touchStart.y = ev.y
//        Log.d("RnTrackerRootLayout", "Accumulated movement - X: $totalDeltaX, Y: $totalDeltaY")
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        // Determine if the accumulated movement qualifies as a swipe
        val distance = sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY)

        if (distance > SWIPE_DISTANCE_THRESHOLD) {
          val direction = if (abs(totalDeltaX) > abs(totalDeltaY)) {
            if (totalDeltaX > 0) "RIGHT" else "LEFT"
          } else {
            if (totalDeltaY > 0) "DOWN" else "UP"
          }
          Log.d("RnTrackerRootLayout", "Swipe detected: $direction")
          Analytics.sendSwipe(SwipeDirection.valueOf(direction), ev.rawX, ev.rawY)
        }
      }
    }

    // Ensure normal event propagation
    return super.dispatchTouchEvent(ev)
  }

  companion object {
    private const val SWIPE_DISTANCE_THRESHOLD = 100f // Adjust as needed
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

  inner class GestureListener : GestureDetector.SimpleOnGestureListener() {
    override fun onSingleTapUp(e: MotionEvent): Boolean {
      Log.d("GestureListener", "Single tap detected at: (${e.rawX}, ${e.rawY})")
      val label = currentTappedView?.contentDescription?.toString() ?: "Button"
      Analytics.sendClick(e, label)
      currentTappedView?.performClick()
      return super.onSingleTapUp(e)
    }
  }
}
