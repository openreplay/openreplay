import BeaconProxy from "./beaconProxy";
import FetchProxy from "./fetchProxy";
import XHRProxy from "./xhrProxy";
import { INetworkMessage, RequestResponseData } from "./types";
export { BeaconProxy, FetchProxy, XHRProxy, INetworkMessage, RequestResponseData, };
export default function createNetworkProxy(context: typeof globalThis, ignoredHeaders: boolean | string[], setSessionTokenHeader: (cb: (name: string, value: string) => void) => void, sanitize: (data: RequestResponseData) => RequestResponseData | null, sendMessage: (message: INetworkMessage) => void, isServiceUrl: (url: string) => boolean, modules?: {
    xhr: boolean;
    fetch: boolean;
    beacon: boolean;
}, tokenUrlMatcher?: (url: string) => boolean): void;
