import Openreplay
import React

@objc(RnTrackerTouchViewManager)
class RnTrackerTouchViewManager: RCTViewManager {

  override func view() -> (RntrackerTouchView) {
    return RntrackerTouchView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

class RntrackerTouchView: UIView, UIGestureRecognizerDelegate {
  private var touchStart: CGPoint?

  override init(frame: CGRect) {
    super.init(frame: frame)
    setupRecognizers()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setupRecognizers()
  }

  private func setupRecognizers() {
    let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
    tap.cancelsTouchesInView = false
    tap.delaysTouchesBegan = false
    tap.delaysTouchesEnded = false
    tap.delegate = self
    addGestureRecognizer(tap)

    let pan = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
    pan.cancelsTouchesInView = false
    pan.delaysTouchesBegan = false
    pan.delaysTouchesEnded = false
    pan.delegate = self
    addGestureRecognizer(pan)
  }

  // UInt64(_:) traps on negative/NaN values
  private func coordinate(_ value: CGFloat) -> UInt64 {
    guard value.isFinite, value > 0 else { return 0 }
    return UInt64(value)
  }

  @objc private func handleTap(_ recognizer: UITapGestureRecognizer) {
    let point = recognizer.location(in: nil)
    Analytics.shared.sendClick(label: "React-Native View", x: coordinate(point.x), y: coordinate(point.y))
  }

  @objc private func handlePan(_ recognizer: UIPanGestureRecognizer) {
    switch recognizer.state {
    case .began:
      touchStart = recognizer.location(in: nil)
    case .ended:
      guard let startPoint = touchStart else { return }
      let endPoint = recognizer.location(in: nil)
      touchStart = nil

      let deltaX = endPoint.x - startPoint.x
      let deltaY = endPoint.y - startPoint.y
      let distance = sqrt(deltaX * deltaX + deltaY * deltaY)

      if distance > 10 {
        let direction = abs(deltaX) > abs(deltaY) ? (deltaX > 0 ? "right" : "left") : (deltaY > 0 ? "down" : "up")
        Analytics.shared.sendSwipe(label: "React-Native View", x: coordinate(endPoint.x), y: coordinate(endPoint.y), direction: direction)
      }
    case .cancelled, .failed:
      touchStart = nil
    default:
      break
    }
  }

  func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer,
                         shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
    return true
  }
}
