import ORTracker

@objc(ORTrackerConnector)
public class ORTrackerConnector: NSObject {
    @objc public static func moduleName() -> String {
        return "ORTrackerConnector"
    }
    
    @objc public static func requiresMainQueueSetup() -> Bool {
        return true
    }

    @objc(start:optionsDict:projectUrl:)
    open func start(_ projectKey: String, optionsDict: NSDictionary, projectUrl: String?) {
        let options = OROptions(
          crashes: optionsDict["crashes"] as? Bool ?? true,
          analytics: optionsDict["analytics"] as? Bool ?? true,
          performances: optionsDict["performances"] as? Bool ?? true,
          logs: optionsDict["logs"] as? Bool ?? true,
          screen: optionsDict["screen"] as? Bool ?? true,
          wifiOnly: optionsDict["wifiOnly"] as? Bool ?? true
        )
        ORTracker.shared.serverURL = projectUrl ?? "https://app.openreplay.com/ingest"
        ORTracker.shared.start(projectKey: projectKey, options: options)
        print("Starting for \(options) \(projectKey) \(projectUrl ?? "no url")")
    }

    @objc open func stop() {
        ORTracker.shared.stop()
    }
    
    @objc(startSession:optionsDict:projectUrl:)
    open func startSession(_ projectKey: String, optionsDict: NSDictionary, projectUrl: String?) {
        let options = OROptions(
          crashes: optionsDict["crashes"] as? Bool ?? true,
          analytics: optionsDict["analytics"] as? Bool ?? true,
          performances: optionsDict["performances"] as? Bool ?? true,
          logs: optionsDict["logs"] as? Bool ?? true,
          screen: optionsDict["screen"] as? Bool ?? true,
          wifiOnly: false
        )
        ORTracker.shared.serverURL = projectUrl ?? "https://app.openreplay.com/ingest"
        ORTracker.shared.startSession(projectKey: projectKey, options: options)
        print("Starting for \(options) \(projectKey) \(projectUrl ?? "no url")")
    }
        
    @objc(setMetadata:value:)
    open func setMetadata(_ key: String, value: String) {
        ORTracker.shared.setMetadata(key: key, value: value)
    }

    @objc(event:object:)
    open func event(_ name: String, object: String?) {
        ORTracker.shared.eventStr(name: name, payload: object)
    }


    @objc(setUserID:)
    open func setUserID(_ userID: String) {
        ORTracker.shared.setUserID(userID)
    }

    @objc(userAnonymousID:)
    open func userAnonymousID(_ userID: String) {
        ORTracker.shared.userAnonymousID(userID)
    }
}
