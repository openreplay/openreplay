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


import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.GestureDetector

//class RnTrackerTouchManager : ViewGroupManager<TouchableFrameLayout>() {
//  override fun getName(): String = "RnTrackerTouchView"
//
//  override fun createViewInstance(reactContext: ThemedReactContext): TouchableFrameLayout {
//    return TouchableFrameLayout(reactContext)
//  }
//}
//
//class TouchableFrameLayout(context: Context) : FrameLayout(context) {
//  private var gestureDetector: GestureDetector
//  private var handler = Handler(Looper.getMainLooper())
//  private var isScrolling = false
//  private var lastX: Float = 0f
//  private var lastY: Float = 0f
//  private var swipeDirection: SwipeDirection = SwipeDirection.UNDEFINED
//
//  init {
//    gestureDetector = GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
//      override fun onSingleTapUp(e: MotionEvent): Boolean {
//        Analytics.sendClick(e)
//        return true
//      }
//
//      override fun onDown(e: MotionEvent): Boolean = true
//
//      override fun onScroll(e1: MotionEvent?, e2: MotionEvent, distanceX: Float, distanceY: Float): Boolean {
//        if (!isScrolling) {
//          isScrolling = true
//        }
//
//        swipeDirection = SwipeDirection.fromDistances(distanceX, distanceY)
//        lastX = e2.x
//        lastY = e2.y
//
//        handler.removeCallbacksAndMessages(null)
//        handler.postDelayed({
//          if (isScrolling) {
//            isScrolling = false
//            Analytics.sendSwipe(swipeDirection, lastX, lastY)
//          }
//        }, 200)
//        return true
//      }
//    })
//
//    setOnTouchListener { _, event ->
//      Log.d("TouchEvent", "Event: ${event.actionMasked}, X: ${event.x}, Y: ${event.y}")
//      gestureDetector.onTouchEvent(event)
//      this.performClick()
//    }
//  }
//}


class RnTrackerTouchManager : ViewGroupManager<FrameLayout>() {
  override fun getName(): String = "RnTrackerTouchView"

  override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
    return FrameLayout(reactContext).apply {
//      layoutParams = FrameLayout.LayoutParams(
//        FrameLayout.LayoutParams.MATCH_PARENT,
//        FrameLayout.LayoutParams.MATCH_PARENT
//      )
      isClickable = true
      val touchStart = PointF()
      setOnTouchListener { view, event ->
        when (event.action) {
          MotionEvent.ACTION_DOWN -> {
            touchStart.set(event.x, event.y)
            true
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
            }
            true
          }

          else -> false
        }
      }
    }
  }

  override fun addView(parent: FrameLayout, child: View, index: Int) {
    child.isClickable = true
    child.isFocusable = true
    child.setOnTouchListener(
      View.OnTouchListener { view, event ->
        when (event.action) {
          MotionEvent.ACTION_DOWN -> {
            view.performClick()
            Analytics.sendClick(event)
            true
          }

          MotionEvent.ACTION_UP -> {
            view.performClick()
            true
          }

          else -> false
        }
      }
    )
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

//class RnTrackerTouchManager : ViewGroupManager<FrameLayout>() {
//  override fun getName(): String = "RnTrackerTouchView"
//
//  override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
//    return FrameLayout(reactContext).apply {
//      layoutParams = FrameLayout.LayoutParams(
//        FrameLayout.LayoutParams.MATCH_PARENT,
//        FrameLayout.LayoutParams.MATCH_PARENT
//      )
//      isClickable = true
//      val touchStart = PointF()
//      setOnTouchListener { view, event ->
//        when (event.action) {
//          MotionEvent.ACTION_DOWN -> {
//            touchStart.set(event.x, event.y)
//            view.performClick()
//          }
//
//          MotionEvent.ACTION_UP -> {
//            val deltaX = event.x - touchStart.x
//            val deltaY = event.y - touchStart.y
//            val distance = sqrt(deltaX * deltaX + deltaY * deltaY)
//
//            if (distance > 10) {
//              val direction = if (abs(deltaX) > abs(deltaY)) {
//                if (deltaX > 0) "RIGHT" else "LEFT"
//              } else {
//                if (deltaY > 0) "DOWN" else "UP"
//              }
//              Analytics.sendSwipe(SwipeDirection.valueOf(direction), event.x, event.y)
//              view.performClick()
//            } else {
//              Analytics.sendClick(event)
//              view.performClick()
//            }
//            true
//          }
//
//          else -> false
//        }
//      }
//    }
//  }
//
//  override fun addView(parent: FrameLayout, child: View, index: Int) {
//    parent.addView(child, index)
//  }
//
//  override fun getChildCount(parent: FrameLayout): Int = parent.childCount
//
//  override fun getChildAt(parent: FrameLayout, index: Int): View = parent.getChildAt(index)
//
//  override fun removeViewAt(parent: FrameLayout, index: Int) {
//    parent.removeViewAt(index)
//  }
//
//  override fun removeAllViews(parent: FrameLayout) {
//    parent.removeAllViews()
//  }
//}
