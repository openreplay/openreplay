package com.openreplay.reactnative

import android.content.Context
import android.graphics.PointF
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.views.view.ReactViewGroup
import com.openreplay.tracker.listeners.Analytics
import com.openreplay.tracker.listeners.SwipeDirection
import kotlin.math.abs
import kotlin.math.sqrt

class RnTrackerTouchManager : ViewGroupManager<ReactViewGroup>() {

  override fun getName(): String = "RnTrackerTouchView"

  override fun createViewInstance(reactContext: ThemedReactContext): ReactViewGroup {
    return RnTrackerRootLayout(reactContext)
  }
}

class RnTrackerRootLayout(context: Context) : ReactViewGroup(context) {
  private val touchStart = PointF()
  private val gestureDetector: GestureDetector

  private var currentTappedView: View? = null

  private var totalDeltaX: Float = 0f
  private var totalDeltaY: Float = 0f

  init {
    gestureDetector = GestureDetector(context, GestureListener())
  }

  override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
    gestureDetector.onTouchEvent(ev)

    when (ev.action) {
      MotionEvent.ACTION_DOWN -> {
        touchStart.x = ev.x
        touchStart.y = ev.y
        totalDeltaX = 0f
        totalDeltaY = 0f
        currentTappedView = findViewAt(this, ev.x.toInt(), ev.y.toInt())
      }
      MotionEvent.ACTION_MOVE -> {
        val deltaX = ev.x - touchStart.x
        val deltaY = ev.y - touchStart.y
        totalDeltaX += deltaX
        totalDeltaY += deltaY
        touchStart.x = ev.x
        touchStart.y = ev.y
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        val distance = sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY)

        if (distance > SWIPE_DISTANCE_THRESHOLD) {
          val direction = if (abs(totalDeltaX) > abs(totalDeltaY)) {
            if (totalDeltaX > 0) "RIGHT" else "LEFT"
          } else {
            if (totalDeltaY > 0) "DOWN" else "UP"
          }
          Analytics.sendSwipe(SwipeDirection.valueOf(direction), ev.rawX, ev.rawY)
        }
        currentTappedView = null
      }
    }

    return super.dispatchTouchEvent(ev)
  }

  companion object {
    private const val SWIPE_DISTANCE_THRESHOLD = 100f
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

  private fun extractLabel(view: View?): String {
    if (view == null) return "Button"
    view.contentDescription?.toString()?.takeIf { it.isNotBlank() }?.let { return it }
    if (view is TextView) {
      view.text?.toString()?.takeIf { it.isNotBlank() }?.let { return it }
    }
    if (view is ViewGroup) {
      for (i in 0 until view.childCount) {
        val childLabel = extractLabel(view.getChildAt(i))
        if (childLabel != "Button") return childLabel
      }
    }
    return "Button"
  }

  inner class GestureListener : GestureDetector.SimpleOnGestureListener() {
    override fun onSingleTapUp(e: MotionEvent): Boolean {
      val label = extractLabel(currentTappedView)
      Analytics.sendClick(e, label)
      return super.onSingleTapUp(e)
    }
  }
}
