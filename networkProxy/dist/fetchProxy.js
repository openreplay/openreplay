/**
 * I took inspiration in few stack exchange posts
 * and Tencent vConsole library (MIT)
 * by wrapping the XMLHttpRequest object in a Proxy
 * we can intercept the network requests
 * in not-so-hacky way
 * */
import NetworkMessage from './networkMessage';
import { RequestState } from './types';
import { formatByteSize, genStringBody, getStringResponseByType, getURL } from './utils';
export class ResponseProxyHandler {
    constructor(resp, item) {
        this.resp = resp;
        this.item = item;
        this.mockReader();
    }
    set(target, key, value) {
        return Reflect.set(target, key, value);
    }
    get(target, key) {
        const value = Reflect.get(target, key);
        switch (key) {
            case 'arrayBuffer':
            case 'blob':
            case 'formData':
            case 'json':
            case 'text':
                return () => {
                    this.item.responseType = key.toLowerCase();
                    // @ts-ignore
                    return value.apply(target).then((resp) => {
                        this.item.response = getStringResponseByType(this.item.responseType, resp);
                        return resp;
                    });
                };
        }
        if (typeof value === 'function') {
            return value.bind(target);
        }
        else {
            return value;
        }
    }
    mockReader() {
        let readerReceivedValue;
        if (!this.resp.body) {
            // some browsers do not return `body` in some cases, like `OPTIONS` method
            return;
        }
        if (typeof this.resp.body.getReader !== 'function') {
            return;
        }
        const _getReader = this.resp.body.getReader;
        // @ts-ignore
        this.resp.body.getReader = () => {
            const reader = _getReader.apply(this.resp.body);
            // when readyState is already 4,
            // it's not a chunked stream, or it had already been read.
            // so should not update status.
            if (this.item.readyState === RequestState.DONE) {
                return reader;
            }
            const _read = reader.read;
            const _cancel = reader.cancel;
            this.item.responseType = 'arraybuffer';
            // @ts-ignore
            reader.read = () => {
                return _read.apply(reader).then((result) => {
                    if (!readerReceivedValue) {
                        // @ts-ignore
                        readerReceivedValue = new Uint8Array(result.value);
                    }
                    else {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        const newValue = new Uint8Array(readerReceivedValue.length + result.value.length);
                        newValue.set(readerReceivedValue);
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        newValue.set(result.value, readerReceivedValue.length);
                        readerReceivedValue = newValue;
                    }
                    this.item.endTime = performance.now();
                    this.item.duration = this.item.endTime - (this.item.startTime || this.item.endTime);
                    this.item.readyState = result.done ? 4 : 3;
                    this.item.statusText = result.done ? String(this.item.status) : 'Loading';
                    this.item.responseSize = readerReceivedValue.length;
                    this.item.responseSizeText = formatByteSize(this.item.responseSize);
                    if (result.done) {
                        this.item.response = getStringResponseByType(this.item.responseType, readerReceivedValue);
                    }
                    return result;
                });
            };
            reader.cancel = (...args) => {
                this.item.cancelState = 2;
                this.item.statusText = 'Cancel';
                this.item.endTime = performance.now();
                this.item.duration = this.item.endTime - (this.item.startTime || this.item.endTime);
                this.item.response = getStringResponseByType(this.item.responseType, readerReceivedValue);
                return _cancel.apply(reader, args);
            };
            return reader;
        };
    }
}
export class FetchProxyHandler {
    constructor(ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl, tokenUrlMatcher) {
        this.ignoredHeaders = ignoredHeaders;
        this.setSessionTokenHeader = setSessionTokenHeader;
        this.sanitize = sanitize;
        this.sendMessage = sendMessage;
        this.isServiceUrl = isServiceUrl;
        this.tokenUrlMatcher = tokenUrlMatcher;
    }
    apply(target, _, argsList) {
        const input = argsList[0];
        const init = argsList[1];
        if (!input ||
            // @ts-ignore
            (typeof input !== 'string' && !(input === null || input === void 0 ? void 0 : input.url))) {
            return target.apply(window, argsList);
        }
        const isORUrl = input instanceof URL || typeof input === 'string'
            ? this.isServiceUrl(String(input))
            : this.isServiceUrl(String(input.url));
        if (isORUrl) {
            return target.apply(window, argsList);
        }
        const item = new NetworkMessage(this.ignoredHeaders, this.setSessionTokenHeader, this.sanitize);
        this.beforeFetch(item, input, init);
        this.setSessionTokenHeader((name, value) => {
            if (this.tokenUrlMatcher !== undefined) {
                if (!this.tokenUrlMatcher(item.url)) {
                    return;
                }
            }
            if (argsList[1] === undefined && argsList[0] instanceof Request) {
                return argsList[0].headers.append(name, value);
            }
            else {
                if (!argsList[1])
                    argsList[1] = {};
                if (argsList[1].headers === undefined) {
                    argsList[1] = Object.assign(Object.assign({}, argsList[1]), { headers: {} });
                }
                if (argsList[1].headers instanceof Headers) {
                    argsList[1].headers.append(name, value);
                }
                else if (Array.isArray(argsList[1].headers)) {
                    argsList[1].headers.push([name, value]);
                }
                else {
                    // @ts-ignore
                    argsList[1].headers[name] = value;
                }
            }
        });
        return target.apply(window, argsList)
            .then(this.afterFetch(item))
            .catch((e) => {
            // mock finally
            item.endTime = performance.now();
            item.duration = item.endTime - (item.startTime || item.endTime);
            throw e;
        });
    }
    beforeFetch(item, input, init) {
        let url, method = 'GET', requestHeader = {};
        // handle `input` content
        if (typeof input === 'string') {
            // when `input` is a string
            method = (init === null || init === void 0 ? void 0 : init.method) || 'GET';
            url = getURL(input);
            requestHeader = (init === null || init === void 0 ? void 0 : init.headers) || {};
        }
        else {
            // when `input` is a `Request` object
            method = input.method || 'GET';
            url = getURL(input.url);
            requestHeader = input.headers;
        }
        item.method = method;
        item.requestType = 'fetch';
        item.requestHeader = requestHeader;
        item.url = url.toString();
        item.name = (url.pathname.split('/').pop() || '') + url.search;
        item.status = 0;
        item.statusText = 'Pending';
        item.readyState = 1;
        if (!item.startTime) {
            // UNSENT
            item.startTime = performance.now();
        }
        if (Object.prototype.toString.call(requestHeader) === '[object Headers]') {
            item.requestHeader = {};
            for (const [key, value] of requestHeader) {
                item.requestHeader[key] = value;
            }
        }
        else {
            item.requestHeader = requestHeader;
        }
        // save GET data
        if (url.search && url.searchParams) {
            item.getData = {};
            for (const [key, value] of url.searchParams) {
                item.getData[key] = value;
            }
        }
        // save POST data
        if (init === null || init === void 0 ? void 0 : init.body) {
            item.requestData = genStringBody(init.body);
        }
    }
    afterFetch(item) {
        return (resp) => {
            item.endTime = performance.now();
            item.duration = item.endTime - (item.startTime || item.endTime);
            item.status = resp.status;
            item.statusText = String(resp.status);
            let isChunked = false;
            item.header = {};
            for (const [key, value] of resp.headers) {
                item.header[key] = value;
                isChunked = value.toLowerCase().indexOf('chunked') > -1 ? true : isChunked;
            }
            if (isChunked) {
                // when `transfer-encoding` is chunked, the response is a stream which is under loading,
                // so the `readyState` should be 3 (Loading),
                // and the response should NOT be `clone()` which will affect stream reading.
                item.readyState = 3;
            }
            else {
                // Otherwise, not chunked, the response is not a stream,
                // so it's completed and can be cloned for `text()` calling.
                item.readyState = 4;
                this.handleResponseBody(resp.clone(), item)
                    .then((responseValue) => {
                    item.responseSize =
                        typeof responseValue === 'string' ? responseValue.length : responseValue.byteLength;
                    item.responseSizeText = formatByteSize(item.responseSize);
                    item.response = getStringResponseByType(item.responseType, responseValue);
                    const msg = item.getMessage();
                    if (msg) {
                        this.sendMessage(msg);
                    }
                })
                    .catch((e) => {
                    if (e.name !== 'AbortError') {
                        throw e;
                    }
                    else {
                        // ignore AbortError
                    }
                });
            }
            return new Proxy(resp, new ResponseProxyHandler(resp, item));
        };
    }
    handleResponseBody(resp, item) {
        // parse response body by Content-Type
        const contentType = resp.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            item.responseType = 'json';
            return resp.text();
        }
        else if (contentType &&
            (contentType.includes('text/html') || contentType.includes('text/plain'))) {
            item.responseType = 'text';
            return resp.text();
        }
        else {
            item.responseType = 'arraybuffer';
            return resp.arrayBuffer();
        }
    }
}
export default class FetchProxy {
    static create(ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl, tokenUrlMatcher) {
        return new Proxy(fetch, new FetchProxyHandler(ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl, tokenUrlMatcher));
    }
}
//# sourceMappingURL=fetchProxy.js.map