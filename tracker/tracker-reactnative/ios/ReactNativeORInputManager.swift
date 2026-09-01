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

/// Native text field observed by the tracker. `Analytics` holds observed inputs
/// in a weak set and `addObservedInput` re-points the `editingDidEnd` target, so
/// registering is idempotent and a deallocated field leaves the set on its own.
/// Leaving the window only detaches the action, so an offscreen field stops
/// emitting; re-entering re-registers it.
class RnTrackedInput : UITextField {
    override func didMoveToWindow() {
        super.didMoveToWindow()

        if window != nil {
            Analytics.shared.addObservedInput(self)
        } else {
            removeTarget(Analytics.shared, action: nil, for: .editingDidEnd)
        }
    }
}
