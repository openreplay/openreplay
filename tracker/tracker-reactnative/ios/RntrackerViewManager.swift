import Openreplay

@objc(RntrackerViewManager)
class RntrackerViewManager: RCTViewManager {

  override func view() -> (RntrackerView) {
    return RntrackerView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

class RntrackerView : UIView {
    var _orViewName: String = ""
    var _orScreenName: String = ""

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
