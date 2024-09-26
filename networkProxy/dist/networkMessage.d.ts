import { RequestResponseData, INetworkMessage, httpMethod, RequestState } from './types';
/**
 * I know we're not using most of the information from this class
 * but it can be useful in the future if we will decide to display more stuff in our ui
 * */
export default class NetworkMessage {
    private readonly ignoredHeaders;
    private readonly setSessionTokenHeader;
    private readonly sanitize;
    id: string;
    name?: string;
    method: httpMethod;
    url: string;
    status: number;
    statusText?: string;
    cancelState?: 0 | 1 | 2 | 3;
    readyState?: RequestState;
    header: {
        [key: string]: string;
    };
    responseType: XMLHttpRequest['responseType'];
    requestType: 'xhr' | 'fetch' | 'ping' | 'custom' | 'beacon';
    requestHeader: HeadersInit;
    response: any;
    responseSize: number;
    responseSizeText: string;
    startTime: number;
    endTime: number;
    duration: number;
    getData: {
        [key: string]: string;
    };
    requestData: string | null;
    constructor(ignoredHeaders: boolean | string[], setSessionTokenHeader: (cb: (name: string, value: string) => void) => void, sanitize: (data: RequestResponseData) => RequestResponseData | null);
    getMessage(): INetworkMessage | null;
    writeHeaders(): {
        reqHs: Record<string, string>;
        resHs: Record<string, string>;
    };
    isHeaderIgnored(key: string): boolean;
}
