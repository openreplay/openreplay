var _a;
import NetworkMessage from './networkMessage';
import { genStringBody, getURL } from './utils';
// https://fetch.spec.whatwg.org/#concept-bodyinit-extract
const getContentType = (data) => {
    if (data instanceof Blob) {
        return data.type;
    }
    if (data instanceof FormData) {
        return 'multipart/form-data';
    }
    if (data instanceof URLSearchParams) {
        return 'application/x-www-form-urlencoded;charset=UTF-8';
    }
    return 'text/plain;charset=UTF-8';
};
export class BeaconProxyHandler {
    constructor(ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl) {
        this.ignoredHeaders = ignoredHeaders;
        this.setSessionTokenHeader = setSessionTokenHeader;
        this.sanitize = sanitize;
        this.sendMessage = sendMessage;
        this.isServiceUrl = isServiceUrl;
    }
    apply(target, thisArg, argsList) {
        const urlString = argsList[0];
        const data = argsList[1];
        const item = new NetworkMessage(this.ignoredHeaders, this.setSessionTokenHeader, this.sanitize);
        if (this.isServiceUrl(urlString)) {
            return target.apply(thisArg, argsList);
        }
        const url = getURL(urlString);
        item.method = 'POST';
        item.url = urlString;
        item.name = (url.pathname.split('/').pop() || '') + url.search;
        item.requestType = 'beacon';
        item.requestHeader = { 'Content-Type': getContentType(data) };
        item.status = 0;
        item.statusText = 'Pending';
        if (url.search && url.searchParams) {
            item.getData = {};
            for (const [key, value] of url.searchParams) {
                item.getData[key] = value;
            }
        }
        item.requestData = genStringBody(data);
        if (!item.startTime) {
            item.startTime = performance.now();
        }
        const isSuccess = target.apply(thisArg, argsList);
        if (isSuccess) {
            item.endTime = performance.now();
            item.duration = item.endTime - (item.startTime || item.endTime);
            item.status = 0;
            item.statusText = 'Sent';
            item.readyState = 4;
        }
        else {
            item.status = 500;
            item.statusText = 'Unknown';
        }
        const msg = item.getMessage();
        if (msg) {
            this.sendMessage(msg);
        }
        return isSuccess;
    }
}
class BeaconProxy {
    static hasSendBeacon() {
        return !!BeaconProxy.origSendBeacon;
    }
    static create(ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl) {
        if (!BeaconProxy.hasSendBeacon()) {
            return undefined;
        }
        return new Proxy(BeaconProxy.origSendBeacon, new BeaconProxyHandler(ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl));
    }
}
BeaconProxy.origSendBeacon = (_a = window === null || window === void 0 ? void 0 : window.navigator) === null || _a === void 0 ? void 0 : _a.sendBeacon;
export default BeaconProxy;
//# sourceMappingURL=beaconProxy.js.map