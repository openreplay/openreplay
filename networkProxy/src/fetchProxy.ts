/**
 * I took inspiration in few stack exchange posts
 * and Tencent vConsole library (MIT)
 * by wrapping the XMLHttpRequest object in a Proxy
 * we can intercept the network requests
 * in not-so-hacky way
 * */
import NetworkMessage from "./networkMessage";
import { INetworkMessage, RequestResponseData } from "./types";
import { formatByteSize, genStringBody, getURL } from "./utils";
import { proxiedRequests } from "./proxied";

// Requests may come from another realm, so no instanceof
const isRequest = (x: unknown): x is Request =>
  !!x && typeof x === "object" && typeof (x as Request).url === "string" && typeof (x as Request).clone === "function";
const TEXTUAL = /json|text\/|xml|javascript|urlencoded|graphql/i;
// end only when the app stops reading: a copy being read would keep the connection open
const STREAMING = /event-stream|ndjson|jsonl|json-seq|stream\+json|x-mixed-replace/i;
// a larger body would not fit in a batch anyway
const BODY_LIMIT = 1_000_000;

interface Body {
  text: string;
  size: number;
}

/** Reads a body copy as text; past the limit, lets go of the copy and resolves null. */
function readCapped(body: ReadableStream<Uint8Array> | null): Promise<Body | null> {
  if (!body) return Promise.resolve({ text: "", size: 0 });
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  const pump = (): Promise<Body | null> =>
    reader.read().then(({ done, value }) => {
      if (done) return { text: text + decoder.decode(), size };
      size += value.byteLength;
      if (size > BODY_LIMIT) {
        reader.cancel().catch(() => {});
        return null;
      }
      text += decoder.decode(value, { stream: true });
      return pump();
    });
  return pump();
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
    private readonly context: typeof globalThis = window,
  ) {}

  public apply(
    target: T,
    _: typeof window,
    argsList: [RequestInfo | URL, RequestInit],
  ) {
    const input = argsList[0];
    const init = argsList[1];
    if (isRequest(input)) proxiedRequests.add(input);
    // URL objects may come from another realm, so no instanceof
    const isURLObject = !!input && typeof input === "object" && typeof (input as any).href === "string" && !("url" in input);
    if (
      !input ||
      // @ts-ignore
      (typeof input !== "string" && !isURLObject && !input?.url)
    ) {
      return <ReturnType<T>>target.apply(this.context, argsList);
    }

    const isORUrl =
      isURLObject || typeof input === "string"
        ? this.isServiceUrl(String(input))
        : this.isServiceUrl(String((input as Request).url));

    if (isORUrl) {
      return target.apply(this.context, argsList);
    }

    const item = new NetworkMessage(
      this.ignoredHeaders,
      this.setSessionTokenHeader,
      this.sanitize,
    );
    const requestBodyRead = this.beforeFetch(item, isURLObject ? String(input) : (input as RequestInfo), init);

    const signal =
      (isRequest(argsList[0]) ? argsList[0].signal : undefined) ||
      (argsList[1]?.signal as AbortSignal | undefined);
    // guard to avoid double-send
    let abortedNotified = false;
    const notifyAbort = () => {
      if (abortedNotified) return;
      abortedNotified = true;
      item.endTime = performance.now();
      item.duration = item.endTime - (item.startTime || item.endTime);
      item.status = 0;
      item.statusText = "Aborted";
      item.readyState = 0;
      const msg = item.getMessage();
      if (msg) this.sendMessage(msg);
    };
    if (signal) {
      if ((signal as any).aborted) {
        notifyAbort();
      } else {
        signal.addEventListener("abort", notifyAbort, { once: true });
      }
    }

    this.setSessionTokenHeader((name, value) => {
      if (this.tokenUrlMatcher !== undefined) {
        if (!this.tokenUrlMatcher(item.url)) {
          return;
        }
      }
      // init.headers replaces the Request's headers entirely, so only add it there if it's already set
      if (argsList[1]?.headers === undefined && isRequest(argsList[0])) {
        // already set by the app or the axios hook: append would join the values
        if (!argsList[0].headers.has(name)) argsList[0].headers.append(name, value);
        return;
      } else {
        if (!argsList[1]) argsList[1] = {};
        if (argsList[1].headers === undefined) {
          argsList[1] = { ...argsList[1], headers: {} };
        }
        if (argsList[1].headers instanceof Headers) {
          if (!argsList[1].headers.has(name)) argsList[1].headers.append(name, value);
        } else if (Array.isArray(argsList[1].headers)) {
          argsList[1].headers.push([name, value]);
        } else {
          // @ts-ignore
          argsList[1].headers[name] = value;
        }
      }
    });
    return (<ReturnType<T>>target.apply(this.context, argsList))
      .then(this.afterFetch(item, () => {
        abortedNotified = true;
      }, requestBodyRead))
      .catch((e) => {
        item.endTime = performance.now();
        item.duration = item.endTime - (item.startTime || item.endTime);
        if (e && e.name === "AbortError") {
          item.status = 0;
          item.statusText = "Aborted";
          item.readyState = 0;
          if (!abortedNotified) {
            const msg = item.getMessage();
            if (msg) this.sendMessage(msg);
          }
        }
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
      url = getURL(input, this.context.location?.href);
      requestHeader = init?.headers || {};
    } else {
      // when `input` is a `Request` object
      method = input.method || "GET";
      url = getURL(input.url, this.context.location?.href);
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
    } else if (
      typeof input !== "string" &&
      method !== "GET" &&
      method !== "HEAD" &&
      TEXTUAL.test(input.headers.get("content-type") || "")
    ) {
      // the body is inside the Request; read a copy before fetch consumes it
      try {
        return readCapped(input.clone().body).then(
          (body) => {
            if (body) item.requestData = genStringBody(body.text);
          },
          () => {},
        );
      } catch {}
    }
  }

  protected afterFetch(item: NetworkMessage, onResolved?: () => void, requestBodyRead?: Promise<void>) {
    return (resp: Response) => {
      if (onResolved) onResolved?.();
      item.endTime = performance.now();
      item.duration = item.endTime - (item.startTime || item.endTime);
      item.status = resp.status;
      item.statusText = String(resp.status);
      item.readyState = 4;

      item.header = {};
      for (const [key, value] of resp.headers) {
        item.header[key] = value;
      }

      Promise.all([this.handleResponseBody(resp, item), requestBodyRead])
        .then(([body]) => {
          item.responseSize = body.size;
          item.responseSizeText = formatByteSize(body.size);
          item.response = body.text;

          const msg = item.getMessage();
          if (msg) {
            this.sendMessage(msg);
          }
        })
        .catch((e) => {
          // other errors (a stream broken mid-body) are the app's to see on its own copy
          if (e.name === "AbortError") {
            item.status = 0;
            item.statusText = "Aborted";
            item.readyState = 0;
            const msg = item.getMessage();
            if (msg) this.sendMessage(msg);
          }
        });

      // the real Response: a Proxy fails brand checks (cache.put, structuredClone, instanceof
      // across realms); the body is already captured from the clone above
      return resp;
    };
  }

  protected handleResponseBody(resp: Response, item: NetworkMessage): Promise<Body> {
    const contentType = resp.headers.get("content-type") || "";
    const declaredSize = Number(resp.headers.get("content-length")) || 0;
    if (STREAMING.test(contentType)) {
      item.responseType = "text";
      return Promise.resolve({ text: "", size: 0 });
    }
    if (contentType && !TEXTUAL.test(contentType)) {
      // binary bodies are recorded by size only
      item.responseType = "arraybuffer";
      return Promise.resolve({ text: "", size: declaredSize });
    }
    item.responseType = contentType.includes("json") ? "json" : "text";
    return readCapped(resp.clone().body).then((body) => body ?? { text: "", size: declaredSize });
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
    // the context's own fetch and global: wrapping this module's globals breaks iframes
    target: typeof fetch = fetch,
    context: typeof globalThis = window,
  ) {
    return new Proxy(
      target,
      new FetchProxyHandler(
        ignoredHeaders,
        setSessionTokenHeader,
        sanitize,
        sendMessage,
        isServiceUrl,
        tokenUrlMatcher,
        context,
      ),
    );
  }
}
