import UIKit
import DeviceKit

class ORSessionRequest: NSObject {
    private static var params = [String: AnyHashable]()

    static func create( completion: @escaping (ORSessionResponse?) -> Void) {
        guard let projectKey = ORTracker.shared.projectKey else { return print("Openreplay: no project key added") }
        #warning("Can interfere with client usage")
        UIDevice.current.isBatteryMonitoringEnabled = true
        UIDevice.current.beginGeneratingDeviceOrientationNotifications()

        let performances: [String: UInt64] = [
            "physicalMemory": UInt64(ProcessInfo.processInfo.physicalMemory),
            "processorCount": UInt64(ProcessInfo.processInfo.processorCount),
            "activeProcessorCount": UInt64(ProcessInfo.processInfo.activeProcessorCount),
            "systemUptime": UInt64(ProcessInfo.processInfo.systemUptime),
            "isLowPowerModeEnabled": UInt64(ProcessInfo.processInfo.isLowPowerModeEnabled ? 1 : 0),
            "thermalState": UInt64(ProcessInfo.processInfo.thermalState.rawValue),
            "batteryLevel": UInt64(max(0.0, UIDevice.current.batteryLevel)*100),
            "batteryState": UInt64(UIDevice.current.batteryState.rawValue),
            "orientation": UInt64(UIDevice.current.orientation.rawValue),
        ]
        
        let device = Device.current
        var deviceModel = ""
        var deviceSafeName = ""
        
        if device.isSimulator {
            deviceSafeName = "iPhone 14 Pro"
            deviceModel = "iPhone14,8"
        } else {
            deviceSafeName = device.safeDescription
            deviceModel = Device.identifier
        }

        DebugUtils.log(">>>> device \(device) type \(device.safeDescription) mem \(UInt64(ProcessInfo.processInfo.physicalMemory / 1024))")
        params = [
            "projectKey": projectKey,
            "trackerVersion": Bundle(for: ORTracker.shared.classForCoder).object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "N/A",
            "revID": Bundle(for: ORTracker.shared.classForCoder).object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "N/A",
            "userUUID": ORUserDefaults.shared.userUUID,
            "userOSVersion": UIDevice.current.systemVersion,
            "userDevice": deviceModel,
            "userDeviceType": deviceSafeName,
            "timestamp": UInt64(Date().timeIntervalSince1970 * 1000),
            "performances": performances,
            "deviceMemory": UInt64(ProcessInfo.processInfo.physicalMemory / 1024),
            "timezone": getTimezone(),
        ]
        callAPI(completion: completion)
    }

    private static func callAPI(completion: @escaping (ORSessionResponse?) -> Void) {
        guard !params.isEmpty else { return }
        NetworkManager.shared.createSession(params: params) { (sessionResponse) in
            guard let sessionResponse = sessionResponse else {
                DispatchQueue.global().asyncAfter(deadline: .now() + 5) {
                    callAPI(completion: completion)
                }
                return
            }
            DebugUtils.log(">>>> Starting session : \(sessionResponse.sessionID)")
            return completion(sessionResponse)
        }
    }
}

struct ORSessionResponse: Decodable {
    let userUUID: String
    let token: String
    let imagesHashList: [String]?
    let sessionID: String
    let fps: Int
    let quality: String
}

func getTimezone() -> String {
    let offset = TimeZone.current.secondsFromGMT()
    let sign = offset >= 0 ? "+" : "-"
    let hours = abs(offset) / 3600
    let minutes = (abs(offset) % 3600) / 60
    return String(format: "UTC%@%02d:%02d", sign, hours, minutes)
}
