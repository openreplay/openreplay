/**
 * I took inspiration in few stack exchange posts
 * and Tencent vConsole library (MIT)
 * by wrapping the XMLHttpRequest object in a Proxy
 * we can intercept the network requests
 * in not-so-hacky way
 * */
import NetworkMessage from "./networkMessage.js";
import { INetworkMessage, ProxyConfig, RequestResponseData } from "./types.js";
import { BODY_LIMIT, documentBase, formatByteSize, genStringBody, getURL, shouldCapture, tagOf } from "./utils.js";
import { proxiedRequests } from "./proxied.js";

// Requests may come from another realm, so no instanceof
const isRequest = (x: unknown): x is Request =>
  !!x && typeof x === "object" && typeof (x as Request).url === "string" && typeof (x as Request).clone === "function";
const TEXTUAL = /json|text\/|xml|javascript|urlencoded|graphql/i;
// end only when the app stops reading: a copy being read would keep the connection open
const STREAMING = /event-stream|ndjson|jsonl|json-seq|stream\+json|x-mixed-replace/i;
// the copy keeps the connection open even after the app cancelled its own body
const BODY_TIMEOUT = 10_000;

// what fetch reads from init, getters included (a Request or class instance passed as init)
const INIT_KEYS = ["body", "cache", "credentials", "duplex", "integrity", "keepalive", "method", "mode",
  "priority", "redirect", "referrer", "referrerPolicy", "signal", "window"];

/** init as fetch would read it; own extra members (e.g. Next.js `next`) are kept */
function copyInit(init: RequestInit): RequestInit & Record<string, any> {
  const copy: Record<string, any> = { ...init };
  for (const key of INIT_KEYS) {
    if (!(key in copy) && key in init) copy[key] = (init as any)[key];
  }
  return copy;
}

interface Body {
  text: string;
  size: number;
}

/**
 * Reads a body copy as text, or only counts its bytes; past the limit or the timeout, lets go of the copy and
 * resolves null.
 */
function readCapped(body: ReadableStream<Uint8Array> | null, keepText = true): Promise<Body | null> {
  if (!body) return Promise.resolve({ text: "", size: 0 });
  const reader = body.getReader();
  const decoder = keepText ? new TextDecoder() : null;
  let text = "";
  let size = 0;
  return new Promise((resolve, reject) => {
    const giveUp = () => {
      reader.cancel().catch(() => {});
      resolve(null);
    };
    const timer = setTimeout(giveUp, BODY_TIMEOUT);
    const pump = () =>
      reader.read().then(({ done, value }) => {
        try {
          if (done) {
            clearTimeout(timer);
            return resolve({ text: decoder ? text + decoder.decode() : "", size });
          }
          // a stream from a fetch wrapper below may carry other chunks than bytes
          if (typeof value?.byteLength !== "number") throw new TypeError("not a byte chunk");
          size += value.byteLength;
          if (size > BODY_LIMIT) {
            clearTimeout(timer);
            return giveUp();
          }
          if (decoder) text += decoder.decode(value, { stream: true });
        } catch {
          clearTimeout(timer);
          return giveUp();
        }
        pump();
      }, (e) => {
        clearTimeout(timer);
        reject(e);
      });
    pump();
  });
}

/** One intercepted request: sends its message once, whichever way it ends. */
class Exchange {
  private sent = false;
  private onAbort?: () => void;

  constructor(
    readonly item: NetworkMessage,
    private readonly config: ProxyConfig,
    private readonly signal: AbortSignal | null | undefined,
  ) {
    if (!signal) return;
    if (signal.aborted) {
      this.aborted();
    } else {
      this.onAbort = () => this.aborted();
      signal.addEventListener("abort", this.onAbort, { once: true });
    }
  }

  detach() {
    if (this.onAbort) this.signal?.removeEventListener("abort", this.onAbort);
    this.onAbort = undefined;
  }

  aborted() {
    this.fail("Aborted");
  }

  fail(statusText: string) {
    if (this.sent) return;
    const { item } = this;
    item.endTime = performance.now();
    item.duration = item.endTime - (item.startTime || item.endTime);
    item.status = 0;
    item.statusText = statusText;
    item.readyState = 0;
    this.send();
  }

  send() {
    this.detach();
    if (this.sent) return;
    this.sent = true;
    try {
      const msg = this.item.getMessage();
      if (msg) this.config.sendMessage(msg);
    } catch {}
  }
}

export class FetchProxyHandler<T extends typeof fetch> implements ProxyHandler<T> {
  constructor(
    private readonly config: ProxyConfig,
    private readonly context: typeof globalThis = window,
  ) {}

  public apply(
    target: T,
    _: typeof window,
    argsList: [RequestInfo | URL, RequestInit],
  ) {
    let exchange: Exchange | null = null;
    let requestBodyRead: Promise<void> | undefined;
    try {
      [exchange, requestBodyRead] = this.prepare(argsList);
    } catch {}
    let result: ReturnType<T>;
    try {
      result = <ReturnType<T>>target.apply(this.context, argsList);
    } catch (e) {
      exchange?.detach();
      throw e;
    }
    if (!exchange || !result || typeof result.then !== "function") return result;
    return result.then(
      (resp: Response) => {
        this.afterFetch(exchange!, resp, requestBodyRead);
        return resp;
      },
      (e: any) => {
        exchange!.fail(e && e.name === "AbortError" ? "Aborted" : "Failed");
        throw e;
      },
    ) as ReturnType<T>;
  }

  private prepare(argsList: [RequestInfo | URL, RequestInit]): [Exchange | null, Promise<void>?] {
    if (this.config.disabled) return [null];
    const input = argsList[0];
    const init = argsList[1];
    const request = isRequest(input) ? input : null;
    if (request) proxiedRequests.add(request);
    // URL objects may come from another realm, so no instanceof
    const isURLObject = !!input && typeof input === "object" && typeof (input as any).href === "string" && !("url" in input);
    if (!input || (typeof input !== "string" && !isURLObject && !request)) return [null];
    if (this.config.isServiceUrl(request ? request.url : String(input))) return [null];
    const headers = init?.headers as any;
    // a Map or one-shot iterator of pairs, read once here: recording or the token header would use it up
    if (
      headers && typeof headers === "object" && !Array.isArray(headers) &&
      tagOf(headers) !== "Headers" && typeof headers[Symbol.iterator] === "function"
    ) {
      try {
        argsList[1] = { ...copyInit(init), headers: Array.from(headers as Iterable<[string, string]>) };
      } catch {}
    }

    const item = new NetworkMessage(
      this.config.ignoredHeaders,
      this.config.setSessionTokenHeader,
      this.config.sanitize,
    );
    const requestBodyRead = this.beforeFetch(item, request || String(input), argsList[1]);
    this.addSessionToken(item, argsList);
    const signal = init && init.signal !== undefined ? init.signal : request?.signal;
    return [new Exchange(item, this.config, signal), requestBodyRead];
  }

  private addSessionToken(item: NetworkMessage, argsList: [RequestInfo | URL, RequestInit]) {
    this.config.setSessionTokenHeader((name, value) => {
      if (this.config.tokenUrlMatcher !== undefined && !this.config.tokenUrlMatcher(item.url)) return;
      // init.headers replaces the Request's headers entirely, so only add it there if it's already set
      if (argsList[1]?.headers === undefined && isRequest(argsList[0])) {
        // already set by the app or the axios hook: append would join the values
        if (!argsList[0].headers.has(name)) {
          argsList[0].headers.append(name, value);
          item.sessionTokenSent = true;
        }
        return;
      }
      // copies, not the app's own headers: it may reuse them for a url that must not get the token
      const init = argsList[1] || {};
      const headers = new Headers(init.headers);
      if (headers.has(name)) return;
      const copy = copyInit(init);
      // tag check: an iframe's fetch gets that realm's Headers
      if (Object.prototype.toString.call(init.headers) === "[object Headers]") {
        headers.append(name, value);
        copy.headers = headers;
      } else if (Array.isArray(init.headers)) {
        copy.headers = [...init.headers, [name, value]];
      } else {
        copy.headers = { ...init.headers, [name]: value };
      }
      argsList[1] = copy;
      item.sessionTokenSent = true;
    });
  }

  protected beforeFetch(
    item: NetworkMessage,
    input: Request | string,
    init?: RequestInit,
  ): Promise<void> | undefined {
    const request = typeof input === "string" ? null : input;
    const url = getURL(typeof input === "string" ? input : input.url, documentBase(this.context));
    // init members override the Request's own
    const method = String(init?.method || request?.method || "GET").toUpperCase();
    const requestHeader: HeadersInit = init?.headers !== undefined ? init.headers : request ? request.headers : {};

    item.method = <NetworkMessage["method"]>method;
    item.requestType = "fetch";
    item.url = url.toString();
    item.name = (url.pathname.split("/").pop() || "") + url.search;
    item.status = 0;
    item.statusText = "Pending";
    item.readyState = 1;
    if (!item.startTime) {
      item.startTime = performance.now();
    }

    if (Object.prototype.toString.call(requestHeader) === "[object Headers]" || Array.isArray(requestHeader)) {
      item.requestHeader = {};
      for (const [key, value] of <Headers | [string, string][]>requestHeader) {
        item.requestHeader[key] = value;
      }
    } else {
      item.requestHeader = requestHeader || {};
    }

    if (url.search && url.searchParams) {
      item.getData = {};
      for (const [key, value] of url.searchParams) {
        item.getData[key] = value;
      }
    }

    if (!shouldCapture(this.config.captureBody, item.url)) return;
    // an init body (even an empty one) replaces the Request's own, null keeps it
    if (init?.body != null) {
      item.requestData = genStringBody(init.body);
    } else if (
      request &&
      method !== "GET" &&
      method !== "HEAD" &&
      TEXTUAL.test(request.headers.get("content-type") || "")
    ) {
      // the body is inside the Request; read a copy before fetch consumes it
      try {
        return readCapped(request.clone().body).then(
          (body) => {
            if (body) item.requestData = genStringBody(body.text);
          },
          () => {},
        );
      } catch {}
    }
  }

  private afterFetch(exchange: Exchange, resp: Response, requestBodyRead?: Promise<void>) {
    const { item } = exchange;
    // abort while the body streams in shows up as the copy's read failing
    exchange.detach();
    try {
      item.endTime = performance.now();
      item.duration = item.endTime - (item.startTime || item.endTime);
      item.status = resp.status;
      item.statusText = String(resp.status);
      item.readyState = 4;
      item.header = {};
      for (const [key, value] of resp.headers) {
        item.header[key] = value;
      }
    } catch {
      return exchange.send();
    }

    let bodyRead: ReturnType<FetchProxyHandler<T>["handleResponseBody"]>;
    try {
      bodyRead = this.handleResponseBody(resp, item);
    } catch {
      bodyRead = Promise.resolve({ text: "", size: 0 });
    }
    Promise.all([bodyRead, requestBodyRead])
      .then(([body]) => {
        item.responseSize = body.size;
        item.responseSizeText = formatByteSize(body.size);
        item.response = body.text;
        if (body.read) {
          item.endTime = performance.now();
          item.duration = item.endTime - (item.startTime || item.endTime);
        }
        exchange.send();
      })
      .catch((e) => {
        if (e && e.name === "AbortError") exchange.aborted();
        else exchange.send();
      });
  }

  protected handleResponseBody(resp: Response, item: NetworkMessage): Promise<Body & { read?: boolean }> {
    const contentType = resp.headers.get("content-type") || "";
    const declaredSize = Number(resp.headers.get("content-length")) || 0;
    const none = { text: "", size: declaredSize };
    if (STREAMING.test(contentType)) {
      item.responseType = "text";
      return Promise.resolve({ text: "", size: 0 });
    }
    if (contentType && !TEXTUAL.test(contentType)) {
      // binary bodies are recorded by size only
      item.responseType = "arraybuffer";
      return Promise.resolve(none);
    }
    item.responseType = contentType.includes("json") ? "json" : "text";
    let copy: Response;
    try {
      copy = resp.clone();
    } catch {
      // body already used, or not a real Response
      return Promise.resolve(none);
    }
    // Content-Length is missing on chunked responses and is the compressed size otherwise
    const keepText = shouldCapture(this.config.captureBody, item.url);
    return readCapped(copy.body, keepText).then((body) => (body ? { ...body, read: true } : none));
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
    return FetchProxy.fromConfig(
      { ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl, tokenUrlMatcher },
      target,
      context,
    );
  }

  public static fromConfig(config: ProxyConfig, target: typeof fetch = fetch, context: typeof globalThis = window) {
    return new Proxy(target, new FetchProxyHandler(config, context));
  }
}
