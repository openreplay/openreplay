import BeaconProxy from "./beaconProxy";
import FetchProxy from "./fetchProxy";
import XHRProxy from "./xhrProxy";
export { BeaconProxy, FetchProxy, XHRProxy, };
const getWarning = (api) => {
    const str = `Openreplay: Can't find ${api} in global context.`;
    console.warn(str);
};
export default function createNetworkProxy(context, ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl, modules = {
    xhr: true,
    fetch: true,
    beacon: true,
}, tokenUrlMatcher) {
    var _a;
    if (modules.xhr) {
        if (context.XMLHttpRequest) {
            context.XMLHttpRequest = XHRProxy.create(ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl, tokenUrlMatcher);
        }
        else {
            getWarning("XMLHttpRequest");
        }
    }
    if (modules.fetch) {
        if (context.fetch) {
            context.fetch = FetchProxy.create(ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl, tokenUrlMatcher);
        }
        else {
            getWarning("fetch");
        }
    }
    if (modules.beacon) {
        if ((_a = context === null || context === void 0 ? void 0 : context.navigator) === null || _a === void 0 ? void 0 : _a.sendBeacon) {
            context.navigator.sendBeacon = BeaconProxy.create(ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl);
        }
    }
}
//# sourceMappingURL=index.js.map