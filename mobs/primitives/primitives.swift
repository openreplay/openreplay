extension Data {
    func readByte(offset: inout Int) -> UInt8 {
        if offset >= self.count {
            fatalError(">>> Error reading Byte")
        }
        let b = self[offset]
        offset += 1
        return b
    }
    func readUint(offset: inout Int) -> UInt64 {
        var x: UInt64 = 0
        var s: Int = 0
        var i: Int = 0
        while true {
            let b = readByte(offset: &offset)
            if b < 0x80 {
                if i > 9 || i == 9 && b > 1 {
                    fatalError(">>> Error reading UInt")
                }
                return x | UInt64(b)<<s
            }
            x |= UInt64(b&0x7f) << s
            s += 7
            i += 1
        }
    }
    func readInt(offset: inout Int) -> Int64 {
        let ux = readUint(offset: &offset)
        var x = Int64(ux >> 1)
        if ux&1 != 0 {
            x = ~x
        }
        return x
    }
    func readBoolean(offset: inout Int) -> Bool {
        return readByte(offset: &offset) == 1
    }
    mutating func writeUint(_ input: UInt64) {
        var v = input
        while v >= 0x80 {
            append(UInt8(v.littleEndian & 0x7F) | 0x80) // v.littleEndian ?
            v >>= 7
        }
        append(UInt8(v))
    }
    mutating func writeInt(_ v: Int64) {
        var uv = UInt64(v) << 1
        if v < 0 {
            uv = ~uv
        }
        writeUint(uv)
    }
    mutating func writeBoolean(_ v: Bool) {
        if v {
            append(1)
        } else {
            append(0)
        }
    }
}