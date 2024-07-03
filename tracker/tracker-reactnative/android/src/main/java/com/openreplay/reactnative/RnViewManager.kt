//package com.openreplay.reactnative
//
//import android.content.Context
//import android.view.View
//import com.facebook.react.uimanager.SimpleViewManager
//import com.facebook.react.uimanager.ThemedReactContext
//
//import com.openreplay.tracker.listeners.Analytics
//
//class RnTrackerViewManager : SimpleViewManager<View>() {
//    override fun getName(): String = "RnTrackerView"
//
//    override fun createViewInstance(reactContext: ThemedReactContext): View = RnTrackerView(reactContext)
//
//    companion object {
//        fun requiresMainQueueSetup(): Boolean = true
//    }
//}
//
//class RnTrackerView(context: Context) : View(context) {
//    private var orViewName: String = ""
//    private var orScreenName: String = ""
//
//    var viewName: String = ""
//        set(value) {
//            field = value
//            orViewName = value
//        }
//
//    var screenName: String = ""
//        set(value) {
//            field = value
//            orScreenName = value
//        }
//
//    override fun onAttachedToWindow() {
//        super.onAttachedToWindow()
//        Analytics.addObservedView(this, orScreenName, orViewName)
//    }
//
//    override fun onDetachedFromWindow() {
//        super.onDetachedFromWindow()
////        Analytics.removeObservedView(this)
//    }
//}
