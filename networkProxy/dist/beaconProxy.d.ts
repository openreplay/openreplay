import { INetworkMessage, RequestResponseData } from './types';
export declare class BeaconProxyHandler<T extends typeof navigator.sendBeacon> implements ProxyHandler<T> {
    private readonly ignoredHeaders;
    private readonly setSessionTokenHeader;
    private readonly sanitize;
    private readonly sendMessage;
    private readonly isServiceUrl;
    constructor(ignoredHeaders: boolean | string[], setSessionTokenHeader: (cb: (name: string, value: string) => void) => void, sanitize: (data: RequestResponseData) => RequestResponseData | null, sendMessage: (item: INetworkMessage) => void, isServiceUrl: (url: string) => boolean);
    apply(target: T, thisArg: T, argsList: any[]): any;
}
export default class BeaconProxy {
    static origSendBeacon: (url: string | URL, data?: BodyInit | null) => boolean;
    static hasSendBeacon(): boolean;
    static create(ignoredHeaders: boolean | string[], setSessionTokenHeader: (cb: (name: string, value: string) => void) => void, sanitize: (data: RequestResponseData) => RequestResponseData | null, sendMessage: (item: INetworkMessage) => void, isServiceUrl: (url: string) => boolean): any;
}
