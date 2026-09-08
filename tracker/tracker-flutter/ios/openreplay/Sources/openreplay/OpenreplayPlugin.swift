import Flutter
import UIKit

/// Native half of the OpenReplay Flutter SDK.
///
/// Only the pieces Dart cannot do live here: a JPEG encoder, OS performance
/// counters, the Keychain, and preferences. Everything else - the wire
/// protocol, batching, capture scheduling - is Dart, so there is no dependency
/// on the standalone iOS SDK.
public class OpenreplayPlugin: NSObject, FlutterPlugin {
    /// Serial so a slow encode cannot pile up; the Dart side drops frames when
    /// this is busy rather than queueing raw buffers.
    private let encodeQueue = DispatchQueue(label: "com.openreplay.encode", qos: .utility)

    public static func register(with registrar: FlutterPluginRegistrar) {
        let channel = FlutterMethodChannel(name: "openreplay", binaryMessenger: registrar.messenger())
        registrar.addMethodCallDelegate(OpenreplayPlugin(), channel: channel)
    }

    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "encodeFrame":
            encodeFrame(call, result)
        case "systemMetrics":
            result(systemMetrics())
        case "deviceInfo":
            result(deviceInfo())
        case "secureGet":
            guard let key = arg(call, "key") as? String else { return result(nil) }
            result(ORKeychain.get(key))
        case "secureSet":
            guard let key = arg(call, "key") as? String else { return result(nil) }
            ORKeychain.set(arg(call, "value") as? String, forKey: key)
            result(nil)
        case "prefsGet":
            guard let key = arg(call, "key") as? String else { return result(nil) }
            result(defaults?.string(forKey: key))
        case "prefsSet":
            guard let key = arg(call, "key") as? String,
                  let value = arg(call, "value") as? String else { return result(nil) }
            defaults?.set(value, forKey: key)
            result(nil)
        case "cacheDirectory":
            result(FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first?.path)
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    private let defaults = UserDefaults(suiteName: "io.orenreplay.openreplaytr-defaults")

    private func arg(_ call: FlutterMethodCall, _ name: String) -> Any? {
        (call.arguments as? [String: Any])?[name]
    }

    // MARK: - frame encoding

    /// Hashes the raw RGBA and, unless it matches `previousHash`, encodes JPEG.
    ///
    /// Hashing before encoding is what makes dedupe cheap: an unchanged frame
    /// costs a hash rather than a hash plus an encode plus an upload.
    private func encodeFrame(_ call: FlutterMethodCall, _ result: @escaping FlutterResult) {
        guard let args = call.arguments as? [String: Any],
              let data = (args["rgba"] as? FlutterStandardTypedData)?.data,
              let width = args["width"] as? Int,
              let height = args["height"] as? Int,
              let quality = args["quality"] as? Double
        else {
            result(FlutterError(code: "bad_args", message: "encodeFrame needs rgba/width/height/quality", details: nil))
            return
        }
        let previousHash = args["previousHash"] as? Int

        encodeQueue.async {
            let hash = Self.hash64(data)
            if let previousHash = previousHash, previousHash == hash {
                DispatchQueue.main.async { result(["bytes": nil, "hash": hash]) }
                return
            }
            guard let jpeg = Self.jpegFromRGBA(data, width: width, height: height, quality: quality) else {
                DispatchQueue.main.async {
                    result(FlutterError(code: "encode_failed", message: "could not encode frame", details: nil))
                }
                return
            }
            DispatchQueue.main.async {
                result(["bytes": FlutterStandardTypedData(bytes: jpeg), "hash": hash])
            }
        }
    }

    /// FNV-1a over the raw pixels. Not cryptographic - it only has to notice
    /// that a frame changed.
    private static func hash64(_ data: Data) -> Int {
        var hash: UInt64 = 0xcbf2_9ce4_8422_2325
        data.withUnsafeBytes { raw in
            for byte in raw.bindMemory(to: UInt8.self) {
                hash ^= UInt64(byte)
                hash = hash &* 0x0000_0100_0000_01b3
            }
        }
        // Truncate to 63 bits: Dart ints are signed and the channel would
        // otherwise round-trip this as a negative number.
        return Int(hash & 0x7fff_ffff_ffff_ffff)
    }

    private static func jpegFromRGBA(_ data: Data, width: Int, height: Int, quality: Double) -> Data? {
        guard width > 0, height > 0, data.count >= width * height * 4 else { return nil }
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        guard let provider = CGDataProvider(data: data as CFData),
              let cgImage = CGImage(
                  width: width,
                  height: height,
                  bitsPerComponent: 8,
                  bitsPerPixel: 32,
                  bytesPerRow: width * 4,
                  space: colorSpace,
                  // Flutter's rawRgba is straight (unpremultiplied) RGBA.
                  bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.last.rawValue),
                  provider: provider,
                  decode: nil,
                  shouldInterpolate: false,
                  intent: .defaultIntent
              )
        else { return nil }
        return UIImage(cgImage: cgImage).jpegData(compressionQuality: CGFloat(quality))
    }

    // MARK: - metrics

    /// Keys are the MobilePerformanceEvent names the player understands; do not
    /// rename them.
    private func systemMetrics() -> [String: Int] {
        var out: [String: Int] = [:]
        if let cpu = mainThreadCPU() { out["mainThreadCPU"] = cpu }
        if let mem = memoryUsage() { out["memoryUsage"] = mem }
        out["thermalState"] = ProcessInfo.processInfo.thermalState.rawValue
        out["isLowPowerModeEnabled"] = ProcessInfo.processInfo.isLowPowerModeEnabled ? 1 : 0

        let device = UIDevice.current
        device.isBatteryMonitoringEnabled = true
        out["batteryLevel"] = Int(max(0, device.batteryLevel) * 100)
        out["batteryState"] = device.batteryState.rawValue
        out["orientation"] = device.orientation.rawValue
        return out
    }

    private func memoryUsage() -> Int? {
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info>.size) / 4
        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
            }
        }
        guard result == KERN_SUCCESS else { return nil }
        return Int(info.phys_footprint)
    }

    private func mainThreadCPU() -> Int? {
        var threadList: thread_act_array_t?
        var threadCount: mach_msg_type_number_t = 0
        guard task_threads(mach_task_self_, &threadList, &threadCount) == KERN_SUCCESS,
              let threads = threadList else { return nil }
        defer {
            vm_deallocate(mach_task_self_, vm_address_t(UInt(bitPattern: threads)),
                          vm_size_t(Int(threadCount) * MemoryLayout<thread_t>.stride))
        }

        var total: Double = 0
        for i in 0..<Int(threadCount) {
            var info = thread_basic_info()
            var infoCount = mach_msg_type_number_t(THREAD_INFO_MAX)
            let ok = withUnsafeMutablePointer(to: &info) {
                $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                    thread_info(threads[i], thread_flavor_t(THREAD_BASIC_INFO), $0, &infoCount)
                }
            }
            guard ok == KERN_SUCCESS, info.flags & TH_FLAGS_IDLE == 0 else { continue }
            total += Double(info.cpu_usage) / Double(TH_USAGE_SCALE) * 100
        }
        return Int(min(100, max(0, total)))
    }

    private func deviceInfo() -> [String: Any] {
        let bundle = Bundle.main
        var systemInfo = utsname()
        uname(&systemInfo)
        let machine = withUnsafePointer(to: &systemInfo.machine) {
            $0.withMemoryRebound(to: CChar.self, capacity: 1) { String(cString: $0) }
        }

        return [
            "revID": bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "N/A",
            "userOSVersion": UIDevice.current.systemVersion,
            "userDevice": machine,
            "userDeviceType": UIDevice.current.model,
            "deviceMemory": Int(ProcessInfo.processInfo.physicalMemory / 1024),
            "performances": [
                "physicalMemory": Int(ProcessInfo.processInfo.physicalMemory),
                "processorCount": ProcessInfo.processInfo.processorCount,
                "activeProcessorCount": ProcessInfo.processInfo.activeProcessorCount,
                "systemUptime": Int(ProcessInfo.processInfo.systemUptime),
            ],
        ]
    }
}
