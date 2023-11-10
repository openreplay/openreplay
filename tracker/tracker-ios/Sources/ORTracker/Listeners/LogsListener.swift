import UIKit

class LogsListener: NSObject {
    static let shared = LogsListener()
    private let outputListener = Listener(fileHandle: FileHandle.standardOutput, severity: "info")
    private let errorListener = Listener(fileHandle: FileHandle.standardError, severity: "error")

    func start() {
        outputListener.start()
        errorListener.start()
    }

    class Listener: NSObject {
        let inputPipe = Pipe()
        let outputPipe = Pipe()
        let fileHandle: FileHandle
        let severity: String

        init(fileHandle: FileHandle, severity: String) {
            self.fileHandle = fileHandle
            self.severity = severity
            super.init()

            inputPipe.fileHandleForReading.readabilityHandler = { [weak self] fileHandle in
                guard let strongSelf = self else { return }

                let data = fileHandle.availableData
                if let string = String(data: data, encoding: String.Encoding.utf8) {
                    let message = ORIOSLog(severity: severity, content: string)
                    MessageCollector.shared.sendMessage(message)
                }

                strongSelf.outputPipe.fileHandleForWriting.write(data)
            }
        }

        func start() {
            dup2(fileHandle.fileDescriptor, outputPipe.fileHandleForWriting.fileDescriptor)
            dup2(inputPipe.fileHandleForWriting.fileDescriptor, fileHandle.fileDescriptor)
        }
        
        func stop() {
            
        }

    }
}
