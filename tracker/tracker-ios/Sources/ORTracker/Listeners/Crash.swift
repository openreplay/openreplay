import UIKit

public class Crashs: NSObject {
    public static let shared = Crashs()
    private static var fileUrl: URL? = nil
    private var isActive = false
    
    private override init() {
        Crashs.fileUrl = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first?.appendingPathComponent("ASCrash.dat")
        if let fileUrl = Crashs.fileUrl,
           FileManager.default.fileExists(atPath: fileUrl.path),
           let crashData = try? Data(contentsOf: fileUrl) {
            NetworkManager.shared.sendLateMessage(content: crashData) { (success) in
                guard success else { return }
                if FileManager.default.fileExists(atPath: fileUrl.path) {
                    try? FileManager.default.removeItem(at: fileUrl)
                }
            }
        }
    }

    public func start() {
        NSSetUncaughtExceptionHandler { (exception) in
            print("<><> captured crash \(exception)")
            let message = ORIOSCrash(name: exception.name.rawValue,
                                     reason: exception.reason ?? "",
                                     stacktrace: exception.callStackSymbols.joined(separator: "\n"))
            let messageData = message.contentData()
            if let fileUrl = Crashs.fileUrl {
                try? messageData.write(to: fileUrl)
            }
            NetworkManager.shared.sendMessage(content: messageData) { (success) in
                guard success else { return }
                if let fileUrl = Crashs.fileUrl,
                   FileManager.default.fileExists(atPath: fileUrl.path) {
                    try? FileManager.default.removeItem(at: fileUrl)
                }
            }
        }
        isActive = true
    }
    
    public func sendLateError(exception: NSException) {
        let message = ORIOSCrash(name: exception.name.rawValue,
                                 reason: exception.reason ?? "",
                                 stacktrace: exception.callStackSymbols.joined(separator: "\n")
        )
        NetworkManager.shared.sendLateMessage(content: message.contentData()) { (success) in
            guard success else { return }
            if let fileUrl = Crashs.fileUrl,
               FileManager.default.fileExists(atPath: fileUrl.path) {
                try? FileManager.default.removeItem(at: fileUrl)
            }
        }
    }
    
    public func stop() {
        if isActive {
            NSSetUncaughtExceptionHandler(nil)
            isActive = false
        }
        
    }
}
