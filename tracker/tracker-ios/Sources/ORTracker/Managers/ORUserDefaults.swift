import UIKit

class ORUserDefaults: NSObject {
    public static let shared = ORUserDefaults()
    private let userDefaults: UserDefaults?

    override init() {
        userDefaults = UserDefaults(suiteName: "io.orenreplay.openreplaytr-defaults")
    }

    var userUUID: String {
        get {
            if let savedUUID = userDefaults?.string(forKey: "userUUID") {
                return savedUUID
            }
            let newUUID = UUID().uuidString
            self.userUUID = newUUID
            return newUUID
        }
        set {
            userDefaults?.set(newValue, forKey: "userUUID")
        }
    }

    var lastToken: String? {
        get {
            return userDefaults?.string(forKey: "lastToken")
        }
        set {
            userDefaults?.set(newValue, forKey: "lastToken")
        }
    }
}
