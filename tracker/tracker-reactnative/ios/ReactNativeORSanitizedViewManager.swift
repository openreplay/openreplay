import Openreplay
import React

@objc(RnSanitizedViewManager)
class RnSanitizedViewManager: RCTViewManager {

  override func view() -> (RntrackerSanitizedView) {
    return RntrackerSanitizedView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

class RntrackerSanitizedView : UIView {
    override func didMoveToSuperview() {
        super.didMoveToSuperview()

        if superview != nil {
            ScreenshotManager.shared.addSanitizedElement(self)
        }
    }
}
