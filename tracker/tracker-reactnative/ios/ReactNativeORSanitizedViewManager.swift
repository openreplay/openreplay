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

/// Invisible marker that reports the frame of a sanitized region to the
/// screenshot manager. It is rendered as an absolutely positioned sibling behind
/// the sanitized subtree (see `ORSanitizedView` in src/index.tsx), so it must
/// never swallow touches meant for the content it covers.
class RntrackerSanitizedView : UIView {
    // RCTComponentData force-sets `userInteractionEnabled = YES` on every paper
    // view it creates, so opting out of hit testing is the only way to stay
    // transparent to touches.
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        return nil
    }

    override func didMoveToWindow() {
        super.didMoveToWindow()

        if window != nil {
            ScreenshotManager.shared.addSanitizedElement(self)
        } else {
            ScreenshotManager.shared.removeSanitizedElement(self)
        }
    }
}
