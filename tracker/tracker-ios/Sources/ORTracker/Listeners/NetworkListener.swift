import UIKit

open class NetworkListener: NSObject {
    private let startTime: UInt64
    private var url: String = ""
    private var method: String = ""
    private var requestBody: String?
    private var requestHeaders: [String: String]?
    var ignoredKeys = ["password"]
    var ignoredHeaders = ["Authentication", "Auth"]

    public override init() {
        startTime = UInt64(Date().timeIntervalSince1970 * 1000)
    }

    public convenience init(request: URLRequest) {
        self.init()
        start(request: request)
    }

    public convenience init(task: URLSessionTask) {
        self.init()
        start(task: task)
    }

    open func start(request: URLRequest) {
        url = request.url?.absoluteString ?? ""
        method = request.httpMethod ?? "GET"
        requestHeaders = request.allHTTPHeaderFields

        if let body = request.httpBody {
            requestBody = String(data: body, encoding: .utf8)
        } else {
            requestBody = ""
            DebugUtils.log("error getting request body (start request)")
        }
    }

    open func start(task: URLSessionTask) {
        if let request = task.currentRequest {
            start(request: request)
        } else {
            DebugUtils.log("error getting request body (start task)")
        }
    }

    open func finish(response: URLResponse?, data: Data?) {
        let endTime = UInt64(Date().timeIntervalSince1970 * 1000)
        let httpResponse = response as? HTTPURLResponse

        var responseBody: String? = nil
        if let data = data {
            responseBody = String(data: data, encoding: .utf8)
        } else {
            DebugUtils.log("error getting request body (finish)")
        }

        let requestContent: [String: Any?] = [
            "body": sanitizeBody(body: requestBody),
            "headers": sanitizeHeaders(headers: requestHeaders)
        ]

        var responseContent: [String: Any?]
        if let httpResponse = httpResponse {
            let headers = transformHeaders(httpResponse.allHeaderFields)
            responseContent = [
                "body": sanitizeBody(body: responseBody),
                "headers": sanitizeHeaders(headers: headers)
            ]
        } else {
            responseContent = [
                "body": "",
                "headers": ""
            ]
        }
        

        let requestJSON = convertDictionaryToJSONString(dictionary: requestContent) ?? ""
        let responseJSON = convertDictionaryToJSONString(dictionary: responseContent) ?? ""

        let status = httpResponse?.statusCode ?? 0
        let message = ORIOSNetworkCall(
            type: "request",
            method: method,
            URL: url,
            request: requestJSON,
            response: responseJSON,
            status: UInt64(status),
            duration: endTime - startTime
        )
        
        MessageCollector.shared.sendMessage(message)
    }

    private func sanitizeHeaders(headers: [String: String]?) -> [String: String]? {
        guard let headerContent = headers else { return nil }

        var sanitizedHeaders = headerContent
        for key in ignoredKeys {
            if sanitizedHeaders.keys.contains(key) {
                sanitizedHeaders[key] = "***"
            }
        }
        return sanitizedHeaders
    }

    
    private func sanitizeBody(body: String?) -> String? {
        guard let bodyContent = body else { return nil }

        var sanitizedBody = bodyContent
        for key in ignoredKeys {
            if let range = sanitizedBody.range(of: "\"\(key)\":\"[^\"]*\"", options: .regularExpression) {
                sanitizedBody.replaceSubrange(range, with: "\"\(key)\":\"***\"")
            }
        }
        return sanitizedBody
    }
}

func convertDictionaryToJSONString(dictionary: [String: Any?]) -> String? {
    if let jsonData = try? JSONSerialization.data(withJSONObject: dictionary, options: []) {
        return String(data: jsonData, encoding: .utf8)
    }
    return nil
}

func transformHeaders(_ headers: [AnyHashable: Any]) -> [String: String] {
    var stringHeaders: [String: String] = [:]
    for (key, value) in headers {
        if let stringKey = key.base as? String, let stringValue = value as? String {
            stringHeaders[stringKey] = stringValue
        }
    }
    return stringHeaders
}


func isJSONString(string: String) -> Bool {
    if let data = string.data(using: .utf8) {
        do {
            _ = try JSONSerialization.jsonObject(with: data, options: [])
            return true
        } catch {
            DebugUtils.log("Error: \(error)")
            return false
        }
    }
    return false
}
