import Openreplay

@objc(RntrackerTouchManager)
class RntrackerTouchManager: RCTViewManager {

  override func view() -> (RntrackerTouchView) {
    return RntrackerTouchView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

class RntrackerTouchView : UIView {
  var touchStart: CGPoint?

  override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
    super.touchesBegan(touches, with: event)

    if let touch = touches.first {
      touchStart = touch.location(in: self)
    }
  }

  override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
    super.touchesEnded(touches, with: event)

    guard let touch = touches.first, let startPoint = touchStart else { return }
    let endPoint = touch.location(in: self)

    let deltaX = endPoint.x - startPoint.x
    let deltaY = endPoint.y - startPoint.y

    let distance = sqrt(deltaX * deltaX + deltaY * deltaY)

    if distance > 10 {
        let direction = abs(deltaX) > abs(deltaY) ? (deltaX > 0 ? "right" : "left") : (deltaY > 0 ? "down" : "up")
        Analytics.shared.sendSwipe(label: "React-Native View", x: UInt64(endPoint.x), y: UInt64(endPoint.x), direction: direction)
    } else {
        Analytics.shared.sendClick(label: "React-Native View", x: UInt64(endPoint.x), y: UInt64(endPoint.y))
    }
  }
}
