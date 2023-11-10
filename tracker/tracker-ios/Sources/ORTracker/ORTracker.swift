import UIKit
import Network

public enum CheckState {
    case unchecked
    case canStart
    case cantStart
}

open class ORTracker: NSObject {
    @objc public static let shared = ORTracker()
    public let userDefaults = UserDefaults(suiteName: "io.asayer.AsayerSDK-defaults")
    public var projectKey: String?
    public var trackerState = CheckState.unchecked
    private var networkCheckTimer: Timer?
    public var serverURL: String {
        get { NetworkManager.shared.baseUrl }
        set { NetworkManager.shared.baseUrl = newValue }
    }
    public var options: OROptions = OROptions.defaults

    @objc open func start(projectKey: String, options: OROptions) {
        self.options = options
        let monitor = NWPathMonitor()
        let q = DispatchQueue.global(qos: .background)
        
        self.projectKey = projectKey
        
        monitor.start(queue: q)
        
        monitor.pathUpdateHandler = { path in
            if path.usesInterfaceType(.wifi) {
                if PerformanceListener.shared.isActive {
                    PerformanceListener.shared.networkStateChange(1)
                }
                self.trackerState = CheckState.canStart
            } else if path.usesInterfaceType(.cellular) {
                if PerformanceListener.shared.isActive {
                    PerformanceListener.shared.networkStateChange(0)
                }
                if options.wifiOnly {
                    self.trackerState = CheckState.cantStart
                    print("Connected to Cellular and options.wifiOnly is true. ORTracker will not start.")
                } else {
                    self.trackerState = CheckState.canStart
                }
            } else {
                self.trackerState = CheckState.cantStart
                print("Not connected to either WiFi or Cellular. ORTracker will not start.")
            }
        }
        
        networkCheckTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true, block: { (_) in
            if self.trackerState == CheckState.canStart {
                self.startSession(projectKey: projectKey, options: options)
                self.networkCheckTimer?.invalidate()
            }
            if self.trackerState == CheckState.cantStart {
                self.networkCheckTimer?.invalidate()
            }
        })
    }
    
    @objc open func startSession(projectKey: String, options: OROptions) {
        self.projectKey = projectKey
        ORSessionRequest.create() { sessionResponse in
            guard let sessionResponse = sessionResponse else { return print("Openreplay: no response from /start request") }
            let captureSettings = getCaptureSettings(fps: sessionResponse.fps, quality: sessionResponse.quality)
            ScreenshotManager.shared.setSettings(settings: captureSettings)
            
            MessageCollector.shared.start()
            
            if options.logs {
                LogsListener.shared.start()
            }
            
            if options.crashes {
                Crashs.shared.start()
            }
            
            if options.performances {
                PerformanceListener.shared.start()
            }
            
            if options.screen {
                ScreenshotManager.shared.start()
            }
            
            if options.analytics {
                Analytics.shared.start()
            }
        }
    }
    
    @objc open func stop() {
        MessageCollector.shared.stop()
        ScreenshotManager.shared.stop()
        Crashs.shared.stop()
        PerformanceListener.shared.stop()
        Analytics.shared.stop()
    }
    
    @objc open func addIgnoredView(_ view: UIView) {
        ScreenshotManager.shared.addSanitizedElement(view)
    }
    
    @objc open func setMetadata(key: String, value: String) {
        let message = ORIOSMetadata(key: key, value: value)
        MessageCollector.shared.sendMessage(message)
    }

    @objc open func event(name: String, object: NSObject?) {
        event(name: name, payload: object as? Encodable)
    }

    open func event(name: String, payload: Encodable?) {
        var json = ""
        if let payload = payload,
           let data = payload.toJSONData(),
           let jsonStr = String(data: data, encoding: .utf8) {
            json = jsonStr
        }
        let message = ORIOSEvent(name: name, payload: json)
        MessageCollector.shared.sendMessage(message)
    }
    
    open func eventStr(name: String, payload: String?) {
        let message = ORIOSEvent(name: name, payload: payload ?? "")
        MessageCollector.shared.sendMessage(message)
    }

    @objc open func setUserID(_ userID: String) {
        let message = ORIOSUserID(iD: userID)
        MessageCollector.shared.sendMessage(message)
    }

    @objc open func userAnonymousID(_ userID: String) {
        let message = ORIOSUserAnonymousID(iD: userID)
        MessageCollector.shared.sendMessage(message)
    }
}



func getCaptureSettings(fps: Int, quality: String) -> (captureRate: Double, imgCompression: Double) {
    let limitedFPS = min(max(fps, 1), 99)
    let captureRate = 1.0 / Double(limitedFPS)
    
    var imgCompression: Double
    switch quality.lowercased() {
    case "low":
        imgCompression = 0.4
    case "standard":
        imgCompression = 0.5
    case "high":
        imgCompression = 0.6
    default:
        imgCompression = 0.5  // default to standard if quality string is not recognized
    }
    
    return (captureRate: captureRate, imgCompression: imgCompression)
}
