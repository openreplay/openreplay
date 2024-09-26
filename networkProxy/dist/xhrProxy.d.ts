/**
 * I took inspiration in few stack exchange posts
 * and Tencent vConsole library (MIT)
 * by wrapping the XMLHttpRequest object in a Proxy
 * we can intercept the network requests
 * in not-so-hacky way
 * */
import NetworkMessage from './networkMessage';
import { INetworkMessage, RequestResponseData } from './types';
export declare class XHRProxyHandler<T extends XMLHttpRequest> implements ProxyHandler<T> {
    private readonly ignoredHeaders;
    private readonly setSessionTokenHeader;
    private readonly sanitize;
    private readonly sendMessage;
    private readonly isServiceUrl;
    private readonly tokenUrlMatcher?;
    XMLReq: XMLHttpRequest;
    item: NetworkMessage;
    constructor(XMLReq: XMLHttpRequest, ignoredHeaders: boolean | string[], setSessionTokenHeader: (cb: (name: string, value: string) => void) => void, sanitize: (data: RequestResponseData) => RequestResponseData | null, sendMessage: (message: INetworkMessage) => void, isServiceUrl: (url: string) => boolean, tokenUrlMatcher?: (url: string) => boolean);
    get(target: T, key: string): any;
    set(target: T, key: string, value: (args: any[]) => any): boolean;
    onReadyStateChange(): void;
    onAbort(): void;
    onTimeout(): void;
    protected getOpen(target: T): (...args: any[]) => any;
    protected getSend(target: T): (...args: any[]) => any;
    protected getSetRequestHeader(target: T): (...args: any[]) => any;
    protected setOnReadyStateChange(target: T, key: string, orscFunction: (args: any[]) => any): boolean;
    protected setOnAbort(target: T, key: string, oaFunction: (args: any[]) => any): boolean;
    protected setOnTimeout(target: T, key: string, otFunction: (args: any[]) => any): boolean;
    /**
     * Update item's properties according to readyState.
     */
    protected updateItemByReadyState(): void;
}
export default class XHRProxy {
    static create(ignoredHeaders: boolean | string[], setSessionTokenHeader: (cb: (name: string, value: string) => void) => void, sanitize: (data: RequestResponseData) => RequestResponseData | null, sendMessage: (data: INetworkMessage) => void, isServiceUrl: (url: string) => boolean, tokenUrlMatcher?: (url: string) => boolean): any;
}
