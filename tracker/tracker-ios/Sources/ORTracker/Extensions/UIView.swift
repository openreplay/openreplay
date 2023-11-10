import UIKit

private var viewCounter = 0
private var shortIds = [String: String]()

extension UIView: Sanitizable {
    public var identifier: String {
        let longId = longIdentifier
        if let existingId = shortIds[longId] {
            return existingId
        }
        let shortId = "\(viewCounter)"
        viewCounter += 1
        shortIds[longId] = shortId
        return shortId
    }

    public var longIdentifier: String {
        return String(describing: type(of: self)) + "-" + Unmanaged.passUnretained(self).toOpaque().debugDescription
    }
    
    public var frameInWindow: CGRect? {
        return self.window == nil ? nil : self.convert(self.bounds, to: self.window)
    }
}

