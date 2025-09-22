/**
 * I took inspiration in few stack exchange posts
 * and Tencent vConsole library (MIT)
 * by wrapping the XMLHttpRequest object in a Proxy
 * we can intercept the network requests
 * in not-so-hacky way
 * */
import NetworkMessage from "./networkMessage";
import { RequestState, INetworkMessage, RequestResponseData } from "./types";
import {
  formatByteSize,
  genStringBody,
  getStringResponseByType,
  getURL,
} from "./utils";

export class ResponseProxyHandler<T extends Response> implements ProxyHandler<T> {
  public resp: Response;
  public item: NetworkMessage;

  constructor(resp: T, item: NetworkMessage) {
    this.resp = resp;
    this.item = item;
  }

  public set(target: T, key: string, value: (args: any[]) => any) {
    return Reflect.set(target, key, value);
  }

  public get(target: T, key: string) {
    const value = Reflect.get(target, key);

    if (key === "arrayBuffer" || key === "blob") {
      return typeof value === "function" ? value.bind(target) : value;
    }

    switch (key) {
      case "formData":
      case "json":
      case "text":
        return () => {
          this.item.responseType = <any>key.toLowerCase();
          // @ts-ignore
          return value.apply(target).then((resp: any) => {
            this.item.response = getStringResponseByType(
              this.item.responseType,
              resp,
            );
            return resp;
          });
        };
    }
    if (typeof value === "function") {
      return value.bind(target);
    } else {
      return value;
    }
  }
}

export class FetchProxyHandler<T extends typeof fetch> implements ProxyHandler<T> {
  constructor(
    private readonly ignoredHeaders: boolean | string[],
    private readonly setSessionTokenHeader: (
      cb: (name: string, value: string) => void,
    ) => void,
    private readonly sanitize: (
      data: RequestResponseData,
    ) => RequestResponseData | null,
    private readonly sendMessage: (item: INetworkMessage) => void,
    private readonly isServiceUrl: (url: string) => boolean,
    private readonly tokenUrlMatcher?: (url: string) => boolean,
  ) {}

  public apply(
    target: T,
    _: typeof window,
    argsList: [RequestInfo | URL, RequestInit],
  ) {
    const input = argsList[0];
    const init = argsList[1];
    if (
      !input ||
      // @ts-ignore
      (typeof input !== "string" && !input?.url)
    ) {
      return <ReturnType<T>>target.apply(window, argsList);
    }

    const isORUrl =
      input instanceof URL || typeof input === "string"
        ? this.isServiceUrl(String(input))
        : this.isServiceUrl(String(input.url));

    if (isORUrl) {
      return target.apply(window, argsList);
    }

    const item = new NetworkMessage(
      this.ignoredHeaders,
      this.setSessionTokenHeader,
      this.sanitize,
    );
    this.beforeFetch(item, input as RequestInfo, init);

    this.setSessionTokenHeader((name, value) => {
      if (this.tokenUrlMatcher !== undefined) {
        if (!this.tokenUrlMatcher(item.url)) {
          return;
        }
      }
      if (argsList[1] === undefined && argsList[0] instanceof Request) {
        return argsList[0].headers.append(name, value);
      } else {
        if (!argsList[1]) argsList[1] = {};
        if (argsList[1].headers === undefined) {
          argsList[1] = { ...argsList[1], headers: {} };
        }
        if (argsList[1].headers instanceof Headers) {
          argsList[1].headers.append(name, value);
        } else if (Array.isArray(argsList[1].headers)) {
          argsList[1].headers.push([name, value]);
        } else {
          // @ts-ignore
          argsList[1].headers[name] = value;
        }
      }
    });
    return (<ReturnType<T>>target.apply(window, argsList))
      .then(this.afterFetch(item))
      .catch((e) => {
        // mock finally
        item.endTime = performance.now();
        item.duration = item.endTime - (item.startTime || item.endTime);
        throw e;
      });
  }

  protected beforeFetch(
    item: NetworkMessage,
    input: RequestInfo | string,
    init?: RequestInit,
  ) {
    let url: URL,
      method = "GET",
      requestHeader: HeadersInit = {};

    // handle `input` content
    if (typeof input === "string") {
      // when `input` is a string
      method = init?.method || "GET";
      url = getURL(input);
      requestHeader = init?.headers || {};
    } else {
      // when `input` is a `Request` object
      method = input.method || "GET";
      url = getURL(input.url);
      requestHeader = input.headers;
    }

    item.method = <NetworkMessage["method"]>method;
    item.requestType = "fetch";
    item.requestHeader = requestHeader;
    item.url = url.toString();
    item.name = (url.pathname.split("/").pop() || "") + url.search;
    item.status = 0;
    item.statusText = "Pending";
    item.readyState = 1;
    if (!item.startTime) {
      // UNSENT
      item.startTime = performance.now();
    }

    if (Object.prototype.toString.call(requestHeader) === "[object Headers]") {
      item.requestHeader = {};
      for (const [key, value] of <Headers>requestHeader) {
        item.requestHeader[key] = value;
      }
    } else {
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
    if (init?.body) {
      item.requestData = genStringBody(init.body);
    }
  }

  protected afterFetch(item: NetworkMessage) {
    return (resp: Response) => {
      item.endTime = performance.now();
      item.duration = item.endTime - (item.startTime || item.endTime);
      item.status = resp.status;
      item.statusText = String(resp.status);

      let isChunked = false;
      item.header = {};
      for (const [key, value] of resp.headers) {
        item.header[key] = value;
        isChunked =
          value.toLowerCase().indexOf("chunked") > -1 ? true : isChunked;
      }

      if (isChunked) {
        // when `transfer-encoding` is chunked, the response is a stream which is under loading,
        // so the `readyState` should be 3 (Loading),
        // and the response should NOT be `clone()` which will affect stream reading.
        item.readyState = 3;
      } else {
        // Otherwise, not chunked, the response is not a stream,
        // so it's completed and can be cloned for `text()` calling.
        item.readyState = 4;

        this.handleResponseBody(resp.clone(), item)
          .then((responseValue: string | ArrayBuffer) => {
            item.responseSize =
              typeof responseValue === "string"
                ? responseValue.length
                : responseValue.byteLength;
            item.responseSizeText = formatByteSize(item.responseSize);
            item.response = getStringResponseByType(
              item.responseType,
              responseValue,
            );

            const msg = item.getMessage();
            if (msg) {
              this.sendMessage(msg);
            }
          })
          .catch((e) => {
            if (e.name !== "AbortError") {
              throw e;
            } else {
              // ignore AbortError
            }
          });
      }

      const ct = (resp.headers.get("content-type") || "").toLowerCase();
      const isTextLike =
        ct.includes("application/json") || ct.startsWith("text/");
      return isTextLike
        ? new Proxy(resp, new ResponseProxyHandler(resp, item))
        : resp;
    };
  }

  protected handleResponseBody(resp: Response, item: NetworkMessage) {
    // parse response body by Content-Type
    const contentType = resp.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      item.responseType = "json";
      return resp.text();
    } else if (
      contentType &&
      (contentType.includes("text/html") || contentType.includes("text/plain"))
    ) {
      item.responseType = "text";
      return resp.text();
    } else {
      item.responseType = "arraybuffer";
      return resp.arrayBuffer();
    }
  }
}

export default class FetchProxy {
  public static create(
    ignoredHeaders: boolean | string[],
    setSessionTokenHeader: (cb: (name: string, value: string) => void) => void,
    sanitize: (data: RequestResponseData) => RequestResponseData | null,
    sendMessage: (item: INetworkMessage) => void,
    isServiceUrl: (url: string) => boolean,
    tokenUrlMatcher?: (url: string) => boolean,
  ) {
    return new Proxy(
      fetch,
      new FetchProxyHandler(
        ignoredHeaders,
        setSessionTokenHeader,
        sanitize,
        sendMessage,
        isServiceUrl,
        tokenUrlMatcher,
      ),
    );
  }
}
