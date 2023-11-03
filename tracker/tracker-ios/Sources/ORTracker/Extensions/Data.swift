import UIKit
import CommonCrypto

protocol NSObjectCoding: NSCoding, NSObject {}

extension NSObjectCoding {
    static func from(data: Data, offset: inout Int) throws -> Self {
        let valueData = try data.readData(offset: &offset)
        guard let result = try NSKeyedUnarchiver.unarchivedObject(ofClass: self, from: valueData)
        else { throw NSError(domain: "ErrorDomain", code: 0, userInfo: [NSLocalizedDescriptionKey: "Error reading NSCoding"]) }
        return result
    }
}

extension Data {
    mutating func appendString(_ string: String) {
        if let data = string.data(using: .utf8) {
            append(data)
        }
    }

    func sha256() -> String {
        var hash = [UInt8](repeating: 0,  count: Int(CC_SHA256_DIGEST_LENGTH))
        self.withUnsafeBytes {
            _ = CC_SHA256($0.baseAddress, CC_LONG(self.count), &hash)
        }
        return Data(hash).hexEncodedString()
    }

    func hexEncodedString() -> String {
        return map { String(format: "%02hhx", $0) }.joined()
    }

    func subdata(start: Int, length: Int) -> Data? {
        let start = startIndex.advanced(by: start)
        let end = start.advanced(by: length)
        guard start >= 0, end <= count else { return nil }
        return subdata(in: start..<end)
    }
}

extension Data {
    func readPrimary<T>(offset: inout Int) throws -> T {
        if T.self == CGFloat.self {
            return CGFloat(try readPrimary(offset: &offset) as Double) as! T
        }
        if T.self == UInt64.self {
            return try readUint(offset: &offset) as! T
        }
        if T.self == Int64.self {
            return try readInt(offset: &offset) as! T
        }
        if T.self == Bool.self {
            return try readBoolean(offset: &offset) as! T
        }
        let valueSize = MemoryLayout<T>.size
        guard let data = subdata(start: offset, length: valueSize) else { throw "Error reading primary value" }
        let result = data.withUnsafeBytes {
            $0.load(as: T.self)
        }
        offset += data.count
        return result
    }

    func readData(offset: inout Int) throws -> Data {
        let length = try readUint(offset: &offset)
        guard let data = subdata(start: offset, length: Int(length)),
              length == data.count else { throw "Error reading data" }

        offset += Int(length)
        return data
    }

    func readString(offset: inout Int) throws -> String {
        let data = try readData(offset: &offset)
        guard let result = String(data: data, encoding: .utf8)
              else { throw "Error reading string" }
        return result
    }

    private func readByte(offset: inout Int) throws -> UInt8 {
        guard offset < count else { throw "Error reading byte" }
        let b = self[offset]
        offset += 1
        return b
    }

    private func readUint(offset: inout Int) throws -> UInt64 {
        var x: UInt64 = 0
        var s: Int = 0
        var i: Int = 0
        while true {
            let b = try readByte(offset: &offset)
            if b < 0x80 {
                if i > 9 || i == 9 && b > 1 {
                    throw "Invalid UInt"
                }
                return x | UInt64(b)<<s
            }
            x |= UInt64(b&0x7f) << s
            s += 7
            i += 1
        }
    }

    private func readInt(offset: inout Int) throws -> Int64 {
        let ux = try readUint(offset: &offset)
        var x = Int64(ux >> 1)
        if ux&1 != 0 {
            x = ~x
        }
        return x
    }

    private func readBoolean(offset: inout Int) throws -> Bool {
        return try readByte(offset: &offset) == 1
    }
}

extension Data {
    init(value: Any?) {
        self.init()
        if let value = value {
            writeValue(value: value)
        }
    }

    init(values: Any...) {
        self.init()
        values.forEach { writeValue(value: $0) }
    }

    mutating func writeValues(values: Any...) {
        values.forEach { writeValue(value: $0) }
    }

    mutating func writeValue(value: Any) {
        let oldLength = count
        switch value {
        case is NSNull: break
        case let parsed as Data: writeData(parsed, sizePrefix: true)
        case let parsed as Int64: writeInt(parsed)
        case let parsed as UInt64: writeUint(parsed)
        case let parsed as Int: writePrimary(parsed)
        case let parsed as UInt8: writePrimary(parsed)
        case let parsed as UInt16: writePrimary(parsed)
        case let parsed as UInt32: writePrimary(parsed)
        case let parsed as Float: writePrimary(parsed)
        case let parsed as CGFloat: writePrimary(Double(parsed))
        case let parsed as Double: writePrimary(parsed)
        case let parsed as Bool: writeBoolean(parsed)
        case let parsed as UIEdgeInsets:
            writeValues(values: parsed.top, parsed.bottom, parsed.left, parsed.right)
        case let parsed as CGRect:
        writeValues(values: parsed.origin.x, parsed.origin.y, parsed.size.width, parsed.size.height)
        case let parsed as CGPoint: writeValues(values: parsed.x, parsed.y)
        case let parsed as CGSize: writeValues(values: parsed.width, parsed.height)
        case let parsed as UIColor:
            var red: CGFloat = 0
            var green: CGFloat = 0
            var blue: CGFloat = 0
            var alpha: CGFloat = 0
            parsed.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
            writeValues(values: red, green, blue, alpha)
        case let parsed as String: writeString(parsed)
        case let parsed as UIFont: writeNSCoding(parsed.fontDescriptor)
        case let parsed as NSAttributedString: writeNSCoding(parsed)
        default: break
        }
        if CFGetTypeID(value as CFTypeRef) == CGColor.typeID {
            writeValue(value: UIColor(cgColor: value as! CGColor))
        }
        let length = count - oldLength
        if length == 0 && !(value is NSNull) {
            print("Nothing was written for \(String(describing: type(of: value))):\(value) ")
        }
    }

    private mutating func writePrimary<T>(_ value: T) {
        writeData(Swift.withUnsafeBytes(of: value) { Data($0) }, sizePrefix: false)
    }

    private mutating func writeString(_ string: String) {
        let stringData = string.data(using: .utf8, allowLossyConversion: true) ?? Data()
        writeData(stringData, sizePrefix: true)
    }

    private mutating func writeNSCoding(_ coding: NSCoding) {
        do {
            let valueData = try NSKeyedArchiver.archivedData(withRootObject: coding, requiringSecureCoding: true)
            writeData(valueData, sizePrefix: true)
        } catch {
            print("Unexpected error: \(error).")
        }
    }

    private mutating func writeData(_ data: Data, sizePrefix: Bool) {
        if sizePrefix {
            writeValue(value: UInt64(data.count))
        }
        append(data)
    }

    private mutating func writeUint(_ input: UInt64) {
        var v = input
        while v >= 0x80 {
            append(UInt8(v.littleEndian & 0x7F) | 0x80) // v.littleEndian ?
            v >>= 7
        }
        append(UInt8(v))
    }

    private mutating func writeInt(_ v: Int64) {
        var uv = UInt64(v) << 1
        if v < 0 {
            uv = ~uv
        }
        writeUint(uv)
    }

    private mutating func writeBoolean(_ v: Bool) {
        append(v ? 1 : 0)
    }
}

extension Encodable {
    func toJSONData() -> Data? { try? JSONEncoder().encode(self) }
}

extension String: Error {}
