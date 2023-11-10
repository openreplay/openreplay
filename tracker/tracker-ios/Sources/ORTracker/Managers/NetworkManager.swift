import UIKit
import SWCompression

let START_URL = "/v1/mobile/start"
let INGEST_URL = "/v1/mobile/i"
let LATE_URL = "/v1/mobile/late"
let IMAGES_URL = "/v1/mobile/images"

class NetworkManager: NSObject {
    static let shared = NetworkManager()
    var baseUrl = "https://api.openreplay.com/ingest"
    public var sessionId: String? = nil
    private var token: String? = nil
    public var writeToFile = false
    #if DEBUG
    private let localFilePath = "/Users/nikitamelnikov/Desktop/session.dat"
    #endif

    override init() {
        #if DEBUG
        if writeToFile, FileManager.default.fileExists(atPath: localFilePath) {
            try? FileManager.default.removeItem(at: URL(fileURLWithPath: localFilePath))
        }
        #endif
    }

    private func createRequest(method: String, path: String) -> URLRequest {
        let url = URL(string: baseUrl+path)!
        var request = URLRequest(url: url)
        request.httpMethod = method
        return request
    }

    private func callAPI(request: URLRequest,
                 onSuccess: @escaping (Data) -> Void,
                 onError: @escaping (Error?) -> Void) {
        guard !writeToFile else { return }
        let task = URLSession.shared.dataTask(with: request) { (data, response, error) in
            
            DebugUtils.log(">>>\(request.httpMethod ?? ""):\(request.url?.absoluteString ?? "")\n<<<\(String(data: data ?? Data(), encoding: .utf8) ?? "")")
            
            DispatchQueue.main.async {
                guard let data = data,
                      let httpResponse = response as? HTTPURLResponse,
                      (200...299).contains(httpResponse.statusCode) else {
                    DebugUtils.error(">>>>>> Error in call \(request.url?.absoluteString ?? "") : \(error?.localizedDescription ?? "N/A")")
                    if (response as? HTTPURLResponse)?.statusCode == 401 {
                        self.token = nil
                        ORTracker.shared.startSession(projectKey: ORTracker.shared.projectKey ?? "", options: ORTracker.shared.options)
                    }
                    onError(error)
                    return
                }
                onSuccess(data)
            }
        }
        task.resume()
    }

    func createSession(params: [String: AnyHashable], completion: @escaping (ORSessionResponse?) -> Void) {
        guard !writeToFile else {
            self.token = "writeToFile"
            return
        }
        var request = createRequest(method: "POST", path: START_URL)
        guard let jsonData = try? JSONSerialization.data(withJSONObject: params, options: []) else {
            completion(nil)
            return
        }
        request.httpBody = jsonData
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        callAPI(request: request) { (data) in
            do {
                let session = try JSONDecoder().decode(ORSessionResponse.self, from: data)
                
                self.token = session.token
                self.sessionId = session.sessionID
                ORUserDefaults.shared.lastToken = self.token

                completion(session)
            } catch {
                DebugUtils.log("Can't unwrap session start resp: \(error)")
            }
        } onError: { _ in
            completion(nil)
        }
    }

    func sendMessage(content: Data, completion: @escaping (Bool) -> Void) {
        guard !writeToFile else {
            appendLocalFile(data: content)
            return
        }
        var request = createRequest(method: "POST", path: INGEST_URL)
        guard let token = token else {
            completion(false)
            return
        }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        var compressedContent = content
        let oldSize = compressedContent.count
        var newSize = oldSize
        do {
            let compressed = try GzipArchive.archive(data: content)
            compressedContent = compressed
            newSize = compressed.count
            request.setValue("gzip", forHTTPHeaderField: "Content-Encoding")
            request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
            DebugUtils.log(">>>>Compress batch file \(oldSize)>\(newSize)")
        } catch {
            DebugUtils.log("Error with compression: \(error)")
        }
        
        request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")

        request.httpBody = compressedContent
        callAPI(request: request) { (data) in
            completion(true)
        } onError: { _ in
            completion(false)
        }
    }

    func sendLateMessage(content: Data, completion: @escaping (Bool) -> Void) {
        DebugUtils.log(">>>sending late messages")
        var request = createRequest(method: "POST", path: LATE_URL)
        guard let token = ORUserDefaults.shared.lastToken else {
            completion(false)
            DebugUtils.log("! No last token found")
            return
        }
        print(token)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = content
        callAPI(request: request) { (data) in
            completion(true)
            DebugUtils.log("<<< late messages sent")
        } onError: { _ in
            completion(false)
        }
    }

    func sendImages(projectKey: String, images: Data, name: String, completion: @escaping (Bool) -> Void) {
        var request = createRequest(method: "POST", path: IMAGES_URL)
        guard let token = token else {
            completion(false)
            return
        }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let boundary = "Boundary-\(NSUUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        let parameters = ["projectKey": projectKey]
        for (key, value) in parameters {
            body.appendString("--\(boundary)\r\n")
            body.appendString("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n")
            body.appendString("\(value)\r\n")
        }

        body.appendString("--\(boundary)\r\n")
        body.appendString("Content-Disposition: form-data; name=\"batch\"; filename=\"\(name)\"\r\n")
        body.appendString("Content-Type: gzip\r\n\r\n")
        body.append(images)
        body.appendString("\r\n")

        body.appendString("--\(boundary)--\r\n")
        DebugUtils.log(">>>>>> sending \(body.count) bytes")
        request.httpBody = body

        callAPI(request: request) { (data) in
            completion(true)
        } onError: { _ in
            completion(false)
        }
    }

    private func appendLocalFile(data: Data) {
        #if DEBUG
        DebugUtils.log("appendInFile \(data.count) bytes")
        
        let fileURL = URL(fileURLWithPath: localFilePath)
        if let fileHandle = try? FileHandle(forWritingTo: fileURL) {
            defer {
                fileHandle.closeFile()
            }
            fileHandle.seekToEndOfFile()
            fileHandle.write(data)
        } else {
            try? data.write(to: fileURL, options: .atomic)
        }
        #endif
    }
}
