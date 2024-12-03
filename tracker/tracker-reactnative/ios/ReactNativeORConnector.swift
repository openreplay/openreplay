import Openreplay

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
          screenshotBatchSize: .normal,
          wifiOnly: optionsDict["wifiOnly"] as? Bool ?? true,
          debugLogs: optionsDict["debugLogs"] as? Bool ?? false,
          debugImages: false
        )
        Openreplay.shared.serverURL = projectUrl ?? "https://api.openreplay.com/ingest"
        Openreplay.shared.start(projectKey: projectKey, options: options)
        print("Starting for \(options) \(projectKey) \(projectUrl ?? "no url")")
    }

    @objc open func stop() {
        Openreplay.shared.stop()
    }

    @objc(startSession:optionsDict:projectUrl:)
    open func startSession(_ projectKey: String, optionsDict: NSDictionary, projectUrl: String?) {
        let options = OROptions(
          crashes: optionsDict["crashes"] as? Bool ?? true,
          analytics: optionsDict["analytics"] as? Bool ?? true,
          performances: optionsDict["performances"] as? Bool ?? true,
          logs: optionsDict["logs"] as? Bool ?? true,
          screen: optionsDict["screen"] as? Bool ?? true,
          wifiOnly: false,
          debugLogs: optionsDict["debugLogs"] as? Bool ?? false,
          debugImages: false
        )
        Openreplay.shared.serverURL = projectUrl ?? "https://api.openreplay.com/ingest"
        Openreplay.shared.startSession(projectKey: projectKey, options: options)
        print("Starting for \(options) \(projectKey) \(projectUrl ?? "no url")")
    }

    @objc(setMetadata:value:)
    open func setMetadata(_ key: String, value: String) {
        Openreplay.shared.setMetadata(key: key, value: value)
    }

    @objc(event:object:)
    open func event(_ name: String, object: String?) {
        Openreplay.shared.eventStr(name: name, payload: object)
    }


    @objc(setUserID:)
    open func setUserID(_ userID: String) {
        Openreplay.shared.setUserID(userID)
    }

    @objc(userAnonymousID:)
    open func userAnonymousID(_ userID: String) {
        Openreplay.shared.userAnonymousID(userID)
    }

    @objc(networkRequest:method:requestJSON:responseJSON:status:duration:)
    open func networkRequest(_ url: String, method: String, requestJSON: String, responseJSON: String, status: NSNumber, duration: NSNumber) {
        Openreplay.shared.networkRequest(url: url, method: method, requestJSON: requestJSON, responseJSON: responseJSON, status: Int(truncating: status), duration: UInt64(truncating: duration))
    }

    @objc(getSessionID:rejecter:)
    open func getSessionID(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let sessionID = Openreplay.shared.getSessionID()
        resolve(sessionID)
    }
}
