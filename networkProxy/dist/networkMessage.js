/**
 * I know we're not using most of the information from this class
 * but it can be useful in the future if we will decide to display more stuff in our ui
 * */
export default class NetworkMessage {
    constructor(ignoredHeaders = [], setSessionTokenHeader, sanitize) {
        this.ignoredHeaders = ignoredHeaders;
        this.setSessionTokenHeader = setSessionTokenHeader;
        this.sanitize = sanitize;
        this.id = '';
        this.name = '';
        this.method = '';
        this.url = '';
        this.status = 0;
        this.statusText = '';
        this.cancelState = 0;
        this.readyState = 0;
        this.header = {};
        this.responseType = '';
        this.requestType = 'xhr';
        this.requestHeader = {};
        this.responseSize = 0; // bytes
        this.responseSizeText = '';
        this.startTime = 0;
        this.endTime = 0;
        this.duration = 0;
        this.getData = {};
        this.requestData = null;
    }
    getMessage() {
        const { reqHs, resHs } = this.writeHeaders();
        const request = {
            headers: reqHs,
            body: this.method === 'GET' ? JSON.stringify(this.getData) : this.requestData,
        };
        const response = { headers: resHs, body: this.response };
        const messageInfo = this.sanitize({
            url: this.url,
            method: this.method,
            status: this.status,
            request,
            response,
        });
        if (!messageInfo)
            return null;
        return {
            requestType: this.requestType,
            method: messageInfo.method,
            url: messageInfo.url,
            request: JSON.stringify(messageInfo.request),
            response: JSON.stringify(messageInfo.response),
            status: messageInfo.status,
            startTime: this.startTime,
            duration: this.duration,
            responseSize: this.responseSize,
        };
    }
    writeHeaders() {
        const reqHs = {};
        Object.entries(this.requestHeader).forEach(([key, value]) => {
            if (this.isHeaderIgnored(key))
                return;
            reqHs[key] = value;
        });
        this.setSessionTokenHeader((name, value) => {
            reqHs[name] = value;
        });
        const resHs = {};
        Object.entries(this.header).forEach(([key, value]) => {
            if (this.isHeaderIgnored(key))
                return;
            resHs[key] = value;
        });
        return { reqHs, resHs };
    }
    isHeaderIgnored(key) {
        if (Array.isArray(this.ignoredHeaders)) {
            return this.ignoredHeaders.map((k) => k.toLowerCase()).includes(key.toLowerCase());
        }
        else {
            return this.ignoredHeaders;
        }
    }
}
//# sourceMappingURL=networkMessage.js.map