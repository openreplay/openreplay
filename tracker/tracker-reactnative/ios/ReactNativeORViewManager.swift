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
    var _orViewName: String = ""
    var _orScreenName: String = ""

    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        return nil
    }

    @objc var viewName: String = "" {
        didSet {
            self._orViewName = viewName
        }
    }
    @objc var screenName: String = "" {
        didSet {
            self._orScreenName = screenName
        }
    }

    override func didMoveToSuperview() {
        super.didMoveToSuperview()

        if superview != nil {
            Analytics.shared.addObservedView(view: self, screenName: self._orScreenName, viewName: self._orViewName)
        }
    }
}
