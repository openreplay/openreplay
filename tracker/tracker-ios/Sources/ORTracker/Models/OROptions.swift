import Foundation

@objc public enum RecordingQuality: Int {
    case Low
    case Standard
    case High
}

open class OROptions: NSObject {
    let crashes: Bool
    let analytics: Bool
    let performances: Bool
    let logs: Bool
    let screen: Bool
    let wifiOnly: Bool
    
    public static let defaults = OROptions(crashes: true, analytics: true, performances: true, logs: true, screen: true, wifiOnly: true)

    @objc public init(crashes: Bool, analytics: Bool, performances: Bool, logs: Bool, screen: Bool, wifiOnly: Bool) {
        self.crashes = crashes
        self.analytics = analytics
        self.performances = performances
        self.logs = logs
        self.screen = screen
        self.wifiOnly = wifiOnly
    }
}
