import Foundation

class DebugUtils: NSObject {

    static func error(_ str: String) {
        // TODO: fix this one
//        MessageCollector.shared.sendMessage(ASIOSInternalError(content: str))
        log(str)
    }

    static func log(_ str: String) {
        #if DEBUG
        print(str)
        #endif
    }
}
