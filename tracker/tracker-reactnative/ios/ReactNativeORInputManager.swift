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

/// Native text field observed by the tracker. `Analytics` keeps observed inputs
/// in a strong array with no removal API and appends on every call, so the
/// registration is bound to window membership and always unwound first.
class RnTrackedInput : UITextField {
    override func didMoveToWindow() {
        super.didMoveToWindow()

        if window != nil {
            unregister()
            Analytics.shared.addObservedInput(self)
        } else {
            unregister()
        }
    }

    private func unregister() {
        Analytics.shared.observedInputs.removeAll { $0 === self }
        removeTarget(Analytics.shared, action: nil, for: .editingDidEnd)
    }
}
