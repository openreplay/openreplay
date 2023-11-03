import UIKit
import SwiftUI
import Combine
import ObjectiveC

open class Analytics: NSObject {
    public static let shared = Analytics()
    public var enabled = false
    public var observedInputs: [UITextField] = []
    public var observedViews: [UIView] = []
    private override init() {
        super.init()
    }

    public func start() {
        enabled = true
        UIViewController.swizzleLifecycleMethods()
    }
    
    public func stop() {
        observedViews.removeAll()
        observedInputs.removeAll()
        enabled = false
        // Unswizzle (reverse the swizzling) if needed in the
    }
    
    @objc private func handleTap(gesture: UITapGestureRecognizer) {
        let location = gesture.location(in: nil)
        DebugUtils.log("Tap detected at: \(location)")
    }
    
    @objc public func addObservedInput(_ element: UITextField) {
        observedInputs.append(element)
        element.addTarget(self, action: #selector(textInputFinished), for: .editingDidEnd)
    }
    
    @objc public func addObservedView(view: UIView, screenName: String, viewName: String) {
        view.orScreenName = screenName
        view.orViewName = viewName
        observedViews.append(view)
    }
    
    @objc public func sendClick(label: String, x: UInt64, y: UInt64) {
        let message = ORIOSClickEvent(label: label, x: x, y: y)
        
        if Analytics.shared.enabled {
            MessageCollector.shared.sendMessage(message)
        }
    }
    
    @objc public func sendSwipe(label: String, x: UInt64, y: UInt64, direction: String) {
        let message = ORIOSSwipeEvent(label: label, x: x,y: y, direction: direction)
        
        if Analytics.shared.enabled {
            MessageCollector.shared.sendMessage(message)
        }
    }
    
    @objc func textInputFinished(_ sender: UITextField) {
        #if DEBUG
        DebugUtils.log(">>>>>Text finish \(sender.text ?? "no_text") \(sender.placeholder ?? "no_placeholder")")
        #endif
        var sentText = sender.text
        if sender.isSecureTextEntry {
            sentText = "***"
        }
        MessageCollector.shared.sendMessage(ORIOSInputEvent(value: sentText ?? "", valueMasked: sender.isSecureTextEntry, label: sender.placeholder ?? ""))
    }
}

extension UIViewController {

    static func swizzleLifecycleMethods() {
        DebugUtils.log(">>>>> ORTracker: swizzle UIViewController")

        Self.swizzle(original: #selector(viewDidAppear(_:)), swizzled: #selector(swizzledViewDidAppear(_:)))
        Self.swizzle(original: #selector(viewDidDisappear(_:)), swizzled: #selector(swizzledViewDidDisappear(_:)))
    }

    static private func swizzle(original: Selector, swizzled: Selector) {
        if let originalMethod = class_getInstanceMethod(self, original),
            let swizzledMethod = class_getInstanceMethod(self, swizzled) {
            method_exchangeImplementations(originalMethod, swizzledMethod)
        }
    }

    @objc private func swizzledViewDidAppear(_ animated: Bool) {
        self.swizzledViewDidAppear(animated)
                
        if let (screenName, viewName) = isViewOrSubviewObservedEnter() {
            let message = ORIOSViewComponentEvent(screenName: screenName, viewName: viewName, visible: true)
            if Analytics.shared.enabled {
                MessageCollector.shared.sendMessage(message)
            }
        }
    }

    @objc private func swizzledViewDidDisappear(_ animated: Bool) {
        self.swizzledViewDidDisappear(animated)
        
        if let (screenName, viewName) = isViewOrSubviewObservedEnter() {
            let message = ORIOSViewComponentEvent(screenName: screenName, viewName: viewName, visible: false)
            if Analytics.shared.enabled {
                MessageCollector.shared.sendMessage(message)
            }
        }
    }
    
    private func isViewOrSubviewObservedEnter() -> (screenName: String, viewName: String)? {
        var viewsToCheck: [UIView] = [self.view]
        while !viewsToCheck.isEmpty {
            let view = viewsToCheck.removeFirst()
            if let observed = Analytics.shared.observedViews.first(where: { $0 == view }) {
                let screenName = observed.orScreenName ?? "Unknown ScreenName"
                let viewName = observed.orViewName ?? "Unknown View"
                
                return (screenName, viewName)
            }
            viewsToCheck.append(contentsOf: view.subviews)
        }
        return nil
    }
}

public class TouchTrackingWindow: UIWindow {
    var touchStart: CGPoint?
    
    public override func sendEvent(_ event: UIEvent) {
        super.sendEvent(event)
        
        guard let touches = event.allTouches else { return }
    
        for touch in touches {
            switch touch.phase {
            case .began:
                touchStart = touch.location(in: self)
            case .ended:
                let location = touch.location(in: self)
                let isSwipe = touchStart!.distance(to: location) > 10
                var event: ORMessage
                let description = getViewDescription(touch.view) ?? "UIView"
                if isSwipe {
                    DebugUtils.log("Swipe from \(touchStart ?? CGPoint(x: 0, y: 0)) to \(location)")
                    event = ORIOSSwipeEvent(label: description, x: UInt64(location.x),y: UInt64(location.y), direction: detectSwipeDirection(from: touchStart!, to: location))
                } else {
                    event = ORIOSClickEvent(label: description, x: UInt64(location.x), y: UInt64(location.y))
                    DebugUtils.log("Touch from \(touchStart ?? CGPoint(x: 0, y: 0)) to \(location)")
                }
                touchStart = nil
                MessageCollector.shared.sendMessage(event)
            default:
                break
            }
        }
    }
    
    
    private func getViewDescription(_ view: UIView?) -> String? {
        guard let view = view else {
            return nil
        }
        
        if let textField = view as? UITextField {
            return "UITextField '\(textField.placeholder ?? "No Placeholder")'"
        } else if let label = view as? UILabel {
            return "UILabel '\(label.text ?? "No Text")'"
        } else if let button = view as? UIButton {
            return "UIButton '\(button.currentTitle ?? "No Title")'"
        } else if let textView = view as? UITextView {
            return "UITextView '\(textView.text ?? "No Text")'"
        } else {
            return "\(type(of: view))"
        }
    }

    
    private func detectSwipeDirection(from start: CGPoint, to end: CGPoint) -> String {
        let deltaX = end.x - start.x
        let deltaY = end.y - start.y
        
        if abs(deltaX) > abs(deltaY) {
            if deltaX > 0 {
                return "right"
            } else {
                return "left"
            }
        } else if abs(deltaY) > abs(deltaX) {
            if deltaY > 0 {
                return "down"
            } else {
                return "up"
            }
        }
        
        return "right"
    }
}



extension CGPoint {
    func distance(to point: CGPoint) -> CGFloat {
        return hypot(point.x - x, point.y - y)
    }
}

public struct ObservedInputModifier: ViewModifier {
    @Binding var text: String
    let label: String?
    let masked: Bool?
    
    public func body(content: Content) -> some View {
        content
            .onReceive(text.publisher.collect()) { value in
                let stringValue = String(value)
                textInputFinished(value: stringValue, label: label, masked: masked)
            }
    }
    
    private func textInputFinished(value: String, label: String?, masked: Bool?) {
        guard !value.isEmpty else { return }
        var sentValue = value
        if masked ?? false {
            sentValue = "****"
        }
        MessageCollector.shared.sendDebouncedMessage(ORIOSInputEvent(value: sentValue, valueMasked: masked ?? false, label: label ?? ""))
    }
}

public struct ViewLifecycleModifier: ViewModifier {
    let screenName: String
    let viewName: String
    
    public func body(content: Content) -> some View {
        content
            .onAppear {
                DebugUtils.log("<><><>view appear \(viewName)")
                let message = ORIOSViewComponentEvent(screenName: screenName, viewName: viewName, visible: true)
                if Analytics.shared.enabled {
                    MessageCollector.shared.sendMessage(message)
                }
                
            }
            .onDisappear {
                DebugUtils.log("<><><>disappear view \(viewName)")
                let message = ORIOSViewComponentEvent(screenName: screenName, viewName: viewName, visible: false)
                if Analytics.shared.enabled {
                    MessageCollector.shared.sendMessage(message)
                }
            }
    }
}


public extension View {
    func observeView(screenName: String, viewName: String) -> some View {
        self.modifier(ViewLifecycleModifier(screenName: screenName, viewName: viewName))
    }

    func observeInput(text: Binding<String>, label: String?, masked: Bool?) -> some View {
        self.modifier(ObservedInputModifier(text: text, label: label, masked: masked))
    }
}

extension UIView {
    private struct AssociatedKeys {
        static var orScreenName: String = "OR: screenName"
        static var orViewName: String = "OR: viewName"
    }
    
    var orScreenName: String? {
        get {
            return objc_getAssociatedObject(self, &AssociatedKeys.orScreenName) as? String
        }
        set {
            objc_setAssociatedObject(self, &AssociatedKeys.orScreenName, newValue, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
    }
    
    var orViewName: String? {
        get {
            return objc_getAssociatedObject(self, &AssociatedKeys.orViewName) as? String
        }
        set {
            objc_setAssociatedObject(self, &AssociatedKeys.orViewName, newValue, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
    }
}
