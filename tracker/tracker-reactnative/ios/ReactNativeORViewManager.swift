import Openreplay
import React

@objc(RnTrackerViewManager)
class RnTrackerViewManager: RCTViewManager {

  override func view() -> (RntrackerView) {
    return RntrackerView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

/// Invisible marker that reports the frame of a tracked region to the analytics
/// listener. It is rendered as an absolutely positioned sibling behind the
/// tracked subtree (see `ORTrackedView` in src/index.tsx), so it must never
/// swallow touches meant for the content it covers. `RCTComponentData`
/// force-sets `userInteractionEnabled = YES` on every paper view it creates, so
/// opting out of hit testing is the only way to stay transparent to touches.
class RntrackerView : UIView {
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        return nil
    }

    @objc var viewName: String = "" {
        didSet { register() }
    }
    @objc var screenName: String = "" {
        didSet { register() }
    }

    /// `Analytics` holds observed views in a weak set, so `addObservedView` is
    /// idempotent and a deallocated view leaves the set on its own. Props can
    /// land either side of the view entering the window, so registration is
    /// (re)done on every change — each call also refreshes the screen/view name.
    override func didMoveToWindow() {
        super.didMoveToWindow()

        if window != nil {
            register()
        }
    }

    private func register() {
        guard window != nil, !screenName.isEmpty || !viewName.isEmpty else { return }
        Analytics.shared.addObservedView(view: self, screenName: screenName, viewName: viewName)
    }
}
