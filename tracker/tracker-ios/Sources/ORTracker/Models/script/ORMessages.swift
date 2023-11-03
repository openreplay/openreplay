
// Auto-generated, do not edit
import UIKit

enum ORMessageType: UInt64 {
    case iOSMetadata = 92
    case iOSEvent = 93
    case iOSUserID = 94
    case iOSUserAnonymousID = 95
    case iOSScreenChanges = 96
    case iOSCrash = 97
    case iOSViewComponentEvent = 98
    case iOSClickEvent = 100
    case iOSInputEvent = 101
    case iOSPerformanceEvent = 102
    case iOSLog = 103
    case iOSInternalError = 104
    case iOSNetworkCall = 105
    case iOSSwipeEvent = 106
    case iOSBatchMeta = 107
}

class ORIOSMetadata: ORMessage {
    let key: String
    let value: String

    init(key: String, value: String) {
        self.key = key
        self.value = value
        super.init(messageType: .iOSMetadata)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.key = try genericMessage.body.readString(offset: &offset)
            self.value = try genericMessage.body.readString(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(92), timestamp, Data(values: key, value))
    }

    override var description: String {
        return "-->> IOSMetadata(92): timestamp:\(timestamp) key:\(key) value:\(value)";
    }
}

class ORIOSEvent: ORMessage {
    let name: String
    let payload: String

    init(name: String, payload: String) {
        self.name = name
        self.payload = payload
        super.init(messageType: .iOSEvent)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.name = try genericMessage.body.readString(offset: &offset)
            self.payload = try genericMessage.body.readString(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(93), timestamp, Data(values: name, payload))
    }

    override var description: String {
        return "-->> IOSEvent(93): timestamp:\(timestamp) name:\(name) payload:\(payload)";
    }
}

class ORIOSUserID: ORMessage {
    let iD: String

    init(iD: String) {
        self.iD = iD
        super.init(messageType: .iOSUserID)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.iD = try genericMessage.body.readString(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(94), timestamp, Data(values: iD))
    }

    override var description: String {
        return "-->> IOSUserID(94): timestamp:\(timestamp) iD:\(iD)";
    }
}

class ORIOSUserAnonymousID: ORMessage {
    let iD: String

    init(iD: String) {
        self.iD = iD
        super.init(messageType: .iOSUserAnonymousID)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.iD = try genericMessage.body.readString(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(95), timestamp, Data(values: iD))
    }

    override var description: String {
        return "-->> IOSUserAnonymousID(95): timestamp:\(timestamp) iD:\(iD)";
    }
}

class ORIOSScreenChanges: ORMessage {
    let x: UInt64
    let y: UInt64
    let width: UInt64
    let height: UInt64

    init(x: UInt64, y: UInt64, width: UInt64, height: UInt64) {
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        super.init(messageType: .iOSScreenChanges)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.x = try genericMessage.body.readPrimary(offset: &offset)
            self.y = try genericMessage.body.readPrimary(offset: &offset)
            self.width = try genericMessage.body.readPrimary(offset: &offset)
            self.height = try genericMessage.body.readPrimary(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(96), timestamp, Data(values: x, y, width, height))
    }

    override var description: String {
        return "-->> IOSScreenChanges(96): timestamp:\(timestamp) x:\(x) y:\(y) width:\(width) height:\(height)";
    }
}

class ORIOSCrash: ORMessage {
    let name: String
    let reason: String
    let stacktrace: String

    init(name: String, reason: String, stacktrace: String) {
        self.name = name
        self.reason = reason
        self.stacktrace = stacktrace
        super.init(messageType: .iOSCrash)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.name = try genericMessage.body.readString(offset: &offset)
            self.reason = try genericMessage.body.readString(offset: &offset)
            self.stacktrace = try genericMessage.body.readString(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(97), timestamp, Data(values: name, reason, stacktrace))
    }

    override var description: String {
        return "-->> IOSCrash(97): timestamp:\(timestamp) name:\(name) reason:\(reason) stacktrace:\(stacktrace)";
    }
}

class ORIOSViewComponentEvent: ORMessage {
    let screenName: String
    let viewName: String
    let visible: Bool

    init(screenName: String, viewName: String, visible: Bool) {
        self.screenName = screenName
        self.viewName = viewName
        self.visible = visible
        super.init(messageType: .iOSViewComponentEvent)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.screenName = try genericMessage.body.readString(offset: &offset)
            self.viewName = try genericMessage.body.readString(offset: &offset)
            self.visible = try genericMessage.body.readPrimary(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(98), timestamp, Data(values: screenName, viewName, visible))
    }

    override var description: String {
        return "-->> IOSViewComponentEvent(98): timestamp:\(timestamp) screenName:\(screenName) viewName:\(viewName) visible:\(visible)";
    }
}

class ORIOSClickEvent: ORMessage {
    let label: String
    let x: UInt64
    let y: UInt64

    init(label: String, x: UInt64, y: UInt64) {
        self.label = label
        self.x = x
        self.y = y
        super.init(messageType: .iOSClickEvent)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.label = try genericMessage.body.readString(offset: &offset)
            self.x = try genericMessage.body.readPrimary(offset: &offset)
            self.y = try genericMessage.body.readPrimary(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(100), timestamp, Data(values: label, x, y))
    }

    override var description: String {
        return "-->> IOSClickEvent(100): timestamp:\(timestamp) label:\(label) x:\(x) y:\(y)";
    }
}

class ORIOSInputEvent: ORMessage {
    let value: String
    let valueMasked: Bool
    let label: String

    init(value: String, valueMasked: Bool, label: String) {
        self.value = value
        self.valueMasked = valueMasked
        self.label = label
        super.init(messageType: .iOSInputEvent)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.value = try genericMessage.body.readString(offset: &offset)
            self.valueMasked = try genericMessage.body.readPrimary(offset: &offset)
            self.label = try genericMessage.body.readString(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(101), timestamp, Data(values: value, valueMasked, label))
    }

    override var description: String {
        return "-->> IOSInputEvent(101): timestamp:\(timestamp) value:\(value) valueMasked:\(valueMasked) label:\(label)";
    }
}

class ORIOSPerformanceEvent: ORMessage {
    let name: String
    let value: UInt64

    init(name: String, value: UInt64) {
        self.name = name
        self.value = value
        super.init(messageType: .iOSPerformanceEvent)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.name = try genericMessage.body.readString(offset: &offset)
            self.value = try genericMessage.body.readPrimary(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(102), timestamp, Data(values: name, value))
    }

    override var description: String {
        return "-->> IOSPerformanceEvent(102): timestamp:\(timestamp) name:\(name) value:\(value)";
    }
}

class ORIOSLog: ORMessage {
    let severity: String
    let content: String

    init(severity: String, content: String) {
        self.severity = severity
        self.content = content
        super.init(messageType: .iOSLog)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.severity = try genericMessage.body.readString(offset: &offset)
            self.content = try genericMessage.body.readString(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(103), timestamp, Data(values: severity, content))
    }

    override var description: String {
        return "-->> IOSLog(103): timestamp:\(timestamp) severity:\(severity) content:\(content)";
    }
}

class ORIOSInternalError: ORMessage {
    let content: String

    init(content: String) {
        self.content = content
        super.init(messageType: .iOSInternalError)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.content = try genericMessage.body.readString(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(104), timestamp, Data(values: content))
    }

    override var description: String {
        return "-->> IOSInternalError(104): timestamp:\(timestamp) content:\(content)";
    }
}

class ORIOSNetworkCall: ORMessage {
    let type: String
    let method: String
    let URL: String
    let request: String
    let response: String
    let status: UInt64
    let duration: UInt64

    init(type: String, method: String, URL: String, request: String, response: String, status: UInt64, duration: UInt64) {
        self.type = type
        self.method = method
        self.URL = URL
        self.request = request
        self.response = response
        self.status = status
        self.duration = duration
        super.init(messageType: .iOSNetworkCall)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.type = try genericMessage.body.readString(offset: &offset)
            self.method = try genericMessage.body.readString(offset: &offset)
            self.URL = try genericMessage.body.readString(offset: &offset)
            self.request = try genericMessage.body.readString(offset: &offset)
            self.response = try genericMessage.body.readString(offset: &offset)
            self.status = try genericMessage.body.readPrimary(offset: &offset)
            self.duration = try genericMessage.body.readPrimary(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(105), timestamp, Data(values: type, method, URL, request, response, status, duration))
    }

    override var description: String {
        return "-->> IOSNetworkCall(105): timestamp:\(timestamp) type:\(type) method:\(method) URL:\(URL) request:\(request) response:\(response) status:\(status) duration:\(duration)";
    }
}

class ORIOSSwipeEvent: ORMessage {
    let label: String
    let x: UInt64
    let y: UInt64
    let direction: String

    init(label: String, x: UInt64, y: UInt64, direction: String) {
        self.label = label
        self.x = x
        self.y = y
        self.direction = direction
        super.init(messageType: .iOSSwipeEvent)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.label = try genericMessage.body.readString(offset: &offset)
            self.x = try genericMessage.body.readPrimary(offset: &offset)
            self.y = try genericMessage.body.readPrimary(offset: &offset)
            self.direction = try genericMessage.body.readString(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(106), timestamp, Data(values: label, x, y, direction))
    }

    override var description: String {
        return "-->> IOSSwipeEvent(106): timestamp:\(timestamp) label:\(label) x:\(x) y:\(y) direction:\(direction)";
    }
}

class ORIOSBatchMeta: ORMessage {
    let firstIndex: UInt64

    init(firstIndex: UInt64) {
        self.firstIndex = firstIndex
        super.init(messageType: .iOSBatchMeta)
    }

    override init?(genericMessage: GenericMessage) {
      do {
            var offset = 0
            self.firstIndex = try genericMessage.body.readPrimary(offset: &offset)
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    }

    override func contentData() -> Data {
        return Data(values: UInt64(107), timestamp, Data(values: firstIndex))
    }

    override var description: String {
        return "-->> IOSBatchMeta(107): timestamp:\(timestamp) firstIndex:\(firstIndex)";
    }
}

