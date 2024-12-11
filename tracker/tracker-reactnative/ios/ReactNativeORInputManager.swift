import Openreplay
import React

@objc(RnTrackedInputManager)
class RnTrackedInputManager: RCTViewManager {

  override func view() -> (RnTrackedInput) {
    return RnTrackedInput()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}


class RnTrackedInput : UITextField {
    override func didMoveToSuperview() {
        super.didMoveToSuperview()

        if superview != nil {
            Analytics.shared.addObservedInput(self)
        }
    }
}
