import Openreplay

@objc(RntrackerInputManager)
class RntrackerInputManager: RCTViewManager {

  override func view() -> (RntrackerInput) {
    return RntrackerInput()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}


class RntrackerInput : UITextField {
    override func didMoveToSuperview() {
        super.didMoveToSuperview()

        if superview != nil {
            Analytics.shared.addObservedInput(self)
        }
    }
}
