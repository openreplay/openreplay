import UIKit

struct BatchArch {
    var name: String
    var data: Data
}

class MessageCollector: NSObject {
    public static let shared = MessageCollector()
    private var imagesWaiting = [BatchArch]()
    private var imagesSending = [BatchArch]()
    private var messagesWaiting = [Data]()
    private var nextMessageIndex = 0
    private var sendingLastMessages = false
    private let maxMessagesSize = 500_000
    private let messagesQueue = OperationQueue()
    private let lateMessagesFile: URL?
    private var sendInderval: Timer?
    
    override init() {
        lateMessagesFile = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first?.appendingPathComponent("/lateMessages.dat")
        super.init()
    }

    func start() {
        sendInderval = Timer.scheduledTimer(withTimeInterval: 5, repeats: true, block: { [weak self] _ in
            self?.flush()
        })
        NotificationCenter.default.addObserver(self, selector: #selector(terminate), name: UIApplication.willResignActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(terminate), name: UIApplication.willTerminateNotification, object: nil)
        messagesQueue.maxConcurrentOperationCount = 1

        if let fileUrl = lateMessagesFile,
           FileManager.default.fileExists(atPath: fileUrl.path),
           let lateData = try? Data(contentsOf: fileUrl) {
            NetworkManager.shared.sendLateMessage(content: lateData) { (success) in
                guard success else { return }
                try? FileManager.default.removeItem(at: fileUrl)
            }
        }
    }
    
    func stop() {
        sendInderval?.invalidate()
        NotificationCenter.default.removeObserver(self, name: UIApplication.willResignActiveNotification, object: nil)
        NotificationCenter.default.removeObserver(self, name: UIApplication.willTerminateNotification,  object: nil)
        self.terminate()
    }

    func sendImagesBatch(batch: Data, fileName: String) {
        self.imagesWaiting.append(BatchArch(name: fileName, data: batch))
        messagesQueue.addOperation {
            self.flushImages()
        }
    }

    @objc func terminate() {
        guard !sendingLastMessages else { return }
        messagesQueue.addOperation {
            self.sendingLastMessages = true
            self.flushMessages()
        }
    }

    @objc func flush() {
        messagesQueue.addOperation {
            self.flushMessages()
            self.flushImages()
        }
    }

    private func flushImages() {
        let images = imagesWaiting.first
        guard !imagesWaiting.isEmpty, let images = images, let projectKey = ORTracker.shared.projectKey else { return }
        imagesWaiting.remove(at: 0)
        
        imagesSending.append(images)

        DebugUtils.log("Sending images \(images.name) \(images.data.count)")
        NetworkManager.shared.sendImages(projectKey: projectKey, images: images.data, name: images.name) { (success) in
            self.imagesSending.removeAll { (waiting) -> Bool in
                images.name == waiting.name
            }
            guard success else {
                self.imagesWaiting.append(images)
                return
            }
        }
    }

    func sendMessage(_ message: ORMessage) {
        let data = message.contentData()
        #if DEBUG
        if !message.description.contains("IOSLog") && !message.description.contains("IOSNetworkCall") {
            DebugUtils.log(message.description)
        }
        if let networkCallMessage = message as? ORIOSNetworkCall {
            DebugUtils.log("-->> IOSNetworkCall(105): \(networkCallMessage.method) \(networkCallMessage.URL)")
        }
        #endif
        self.sendRawMessage(data)
    }
    
    private var debounceTimer: Timer?
    private var debouncedMessage: ORMessage?
    func sendDebouncedMessage(_ message: ORMessage) {
        debounceTimer?.invalidate()

        debouncedMessage = message
        debounceTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: false) { [weak self] _ in
            if let debouncedMessage = self?.debouncedMessage {
                self?.sendMessage(debouncedMessage)
                self?.debouncedMessage = nil
            }
        }
    }

    func sendRawMessage(_ data: Data) {
        messagesQueue.addOperation {
            if data.count > self.maxMessagesSize {
                DebugUtils.log("<><><>Single message size exceeded limit")
                return
            }
            self.messagesWaiting.append(data)
            var totalWaitingSize = 0
            self.messagesWaiting.forEach { totalWaitingSize += $0.count }
            if totalWaitingSize > Int(Double(self.maxMessagesSize) * 0.8) {
                self.flushMessages()
            }
        }
    }

    private func flushMessages() {
        var messages = [Data]()
        var sentSize = 0
        while let message = messagesWaiting.first, sentSize + message.count <= maxMessagesSize {
            messages.append(message)
            messagesWaiting.remove(at: 0)
            sentSize += message.count
        }
        guard !messages.isEmpty else { return }
        var content = Data()
        let index = ORIOSBatchMeta(firstIndex: UInt64(nextMessageIndex))
        content.append(index.contentData())
        DebugUtils.log(index.description)
        messages.forEach { (message) in
            content.append(message)
        }
        if sendingLastMessages, let fileUrl = lateMessagesFile {
            try? content.write(to: fileUrl)
        }
        nextMessageIndex += messages.count
        DebugUtils.log("messages batch \(content)")
        NetworkManager.shared.sendMessage(content: content) { (success) in
            guard success else {
                DebugUtils.log("<><>re-sending failed batch<><>")
                self.messagesWaiting.insert(contentsOf: messages, at: 0)
                return
            }
            if self.sendingLastMessages {
                self.sendingLastMessages = false
                if let fileUrl = self.lateMessagesFile, FileManager.default.fileExists(atPath: fileUrl.path) {
                    try? FileManager.default.removeItem(at: fileUrl)
                }
            }
        }
    }
}
