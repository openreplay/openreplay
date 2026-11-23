/**
 * I took inspiration in few stack exchange posts
 * and Tencent vConsole library (MIT)
 * by wrapping the XMLHttpRequest object in a Proxy
 * we can intercept the network requests
 * in not-so-hacky way
 * */

import NetworkMessage from "./networkMessage.js";
import { RequestState, INetworkMessage, ProxyConfig, RequestResponseData } from "./types.js";
import {
  genGetDataByUrl,
  formatByteSize,
  genStringBody,
  getStringResponseByType,
  getURL,
  documentBase,
  shouldCapture,
  utf8Length,
  tagOf,
  BODY_LIMIT,
} from "./utils.js";
import { proxiedRequests } from "./proxied.js";

type Hooked = "open" | "send" | "setRequestHeader";
const HOOKED = new Set<PropertyKey>(["open", "send", "setRequestHeader"]);

/** A proxy must return such a property's own value as is */
const isFixed = (target: object, key: PropertyKey) => {
  const own = Object.getOwnPropertyDescriptor(target, key);
  return !!own && own.configurable === false && own.writable === false;
};

export class XHRProxyHandler<T extends XMLHttpRequest>
  implements ProxyHandler<T>
{
  public XMLReq: XMLHttpRequest;
  /** false when a proxy (an older copy, vConsole) is below: only it can call the native methods */
  public genuine = true;
  public item: NetworkMessage;
  private sent = false;
  private reported = false;
  /** the request that reached DONE; abort() after DONE resets readyState before loadend */
  private done: NetworkMessage | null = null;
  /** the url as given to open(); matchers written for it keep working */
  private rawUrl = "";
  /** per function read: the same wrapper for the same method, none kept for a replaced one */
  private readonly bound = new WeakMap<Function, Function>();
  private readonly wrapped = new Map<Hooked, WeakMap<Function, Function>>();
  /** send() calls running: an override's own call to the method it captured is nested in one */
  private sending = 0;

  constructor(
    XMLReq: XMLHttpRequest,
    private readonly config: ProxyConfig,
    private readonly context: typeof globalThis = window,
  ) {
    this.XMLReq = XMLReq;
    // listeners, not on* handlers: the app may set or null those at any time; the native method first, as a
    // subclass's own runs before its fields exist, then the object's own (a proxy below rejects the native)
    const native = (context as any).EventTarget?.prototype.addEventListener;
    const listen = (type: string, fn: () => void) => {
      try {
        native.call(XMLReq, type, fn);
      } catch {
        this.genuine = false;
        XMLReq.addEventListener(type, fn);
      }
    };
    listen("readystatechange", () => this.onReadyStateChange());
    listen("abort", () => this.onAbort());
    listen("timeout", () => this.onTimeout());
    // once per request, after load / error / abort / timeout; not the current one when re-opened
    // from an earlier handler, open() reported that request
    listen("loadend", () => {
      if (this.done === this.item) this.report();
    });
    this.item = this.newItem();
  }

  private newItem() {
    const item = new NetworkMessage(this.config.ignoredHeaders, this.config.setSessionTokenHeader, this.config.sanitize);
    item.requestType = "xhr";
    return item;
  }

  public get(target: T, key: PropertyKey) {
    const value = Reflect.get(target, key);
    if (typeof value !== "function" || isFixed(target, key)) return value;
    // the method as read: the prototype's, an override on the instance (pace.js, Sentry) or a proxy's
    // below us; a reference an override captured keeps calling what it captured, like the native one
    if (HOOKED.has(key)) return this.wrapperFor(target, key as Hooked, value);
    let method = this.bound.get(value);
    if (!method) {
      method = value.bind(target);
      this.bound.set(value, method!);
    }
    return method;
  }

  private wrapperFor(target: T, key: Hooked, fn: Function) {
    let cache = this.wrapped.get(key);
    if (!cache) this.wrapped.set(key, (cache = new WeakMap()));
    let method = cache.get(fn);
    if (!method) {
      method = this.hooked(target, key, fn);
      cache.set(fn, method);
    }
    return method;
  }

  /**
   * For a subclass instance, which is returned unproxied: its methods need the instance itself as `this`
   * (private #fields, super calls). The hooked methods go on the instance and call the prototype chain's.
   */
  public instrument(xhr: T) {
    for (const key of HOOKED) {
      const k = key as Hooked;
      // a copy of ours below instrumented it already: chain to its accessor so both record
      const below = Object.getOwnPropertyDescriptor(xhr, k);
      const base = this.hooked(xhr, k, (...args: any[]) =>
        (below?.get ? below.get.call(xhr) : Reflect.get(Object.getPrototypeOf(xhr), k, xhr)).apply(xhr, args));
      // an override assigned later (pace.js) is wrapped like the proxy's get does
      let assigned: unknown;
      Object.defineProperty(xhr, k, {
        configurable: true,
        enumerable: false,
        get: () => (assigned === undefined ? base : typeof assigned === "function" ? this.wrapperFor(xhr, k, assigned) : assigned),
        set: (value) => {
          assigned = value;
        },
      });
    }
    return xhr;
  }

  public set(target: T, key: PropertyKey, value: unknown) {
    // the target as receiver: accessors like onload or timeout reject the proxy
    return Reflect.set(target, key, value);
  }

  private hooked(target: T, key: Hooked, fn: Function) {
    const call = (args: any[]) => fn.apply(target, args);
    if (key === "open") return (...args: any[]) => this.open(args, call);
    if (key === "setRequestHeader") {
      return (...args: any[]) => {
        if (!this.config.disabled) {
          try {
            this.beforeSetRequestHeader(target, args);
          } catch {}
        }
        return call(args);
      };
    }
    return (...args: any[]) => {
      // a second send() while in flight throws natively and must not touch this request
      if (!this.config.disabled && (!this.sent || this.sending > 0)) {
        try {
          this.beforeSend(target, args);
        } catch {}
      }
      this.sending++;
      try {
        return call(args);
      } finally {
        this.sending--;
      }
    };
  }

  /** open() drops a request in flight without events, unless it throws on its arguments */
  private open(args: any[], native: (args: any[]) => unknown) {
    if (this.config.disabled) return native(args);
    const prev = { item: this.item, sent: this.sent, reported: this.reported, done: this.done, rawUrl: this.rawUrl };
    const dropped = this.sent && !this.reported ? this.item : null;
    const wasDone = this.XMLReq.readyState === RequestState.DONE;
    try {
      this.beforeOpen(args);
    } catch {}
    let result;
    try {
      result = native(args);
    } catch (e) {
      Object.assign(this, prev);
      throw e;
    }
    if (dropped) {
      if (!wasDone) {
        dropped.cancelState = 1;
        dropped.statusText = "Abort";
      }
      this.sendItem(dropped);
    }
    return result;
  }

  private beforeOpen(args: any[]) {
    this.item = this.newItem();
    this.sent = false;
    this.reported = false;
    this.done = null;
    const [method, url] = args;
    this.rawUrl = String(url ?? "");
    this.item.method = method ? String(method).toUpperCase() as NetworkMessage["method"] : "GET";
    try {
      this.item.url = getURL(url, documentBase(this.context)).toString();
    } catch {
      this.item.url = String(url ?? "");
    }
    this.item.name = this.item.url.replace(/\/*$/, "").split("/").pop() ?? "";
    this.item.getData = genGetDataByUrl(this.item.url, {});
  }

  private beforeSend(target: T, args: any[]) {
    // open() twice fires no second readystatechange(1); an override's nested call keeps the first time
    if (!this.sent) this.item.startTime = performance.now();
    this.sent = true;
    this.addSessionToken(target);
    if (shouldCapture(this.config.captureBody, this.item.url)) {
      this.item.requestData = genStringBody(args[0]);
    }
  }

  private beforeSetRequestHeader(_: T, args: any[]) {
    (this.item.requestHeader as Record<string, string>)[args[0]] = args[1];
  }

  private addSessionToken(target: T) {
    if (this.item.sessionTokenSent || target.readyState !== RequestState.OPENED) return;
    this.config.setSessionTokenHeader((name: string, value: string) => {
      const matcher = this.config.tokenUrlMatcher;
      if (matcher && !matcher(this.item.url) && (this.rawUrl === this.item.url || !matcher(this.rawUrl))) return;
      // already set by the app or the axios hook: a second call would join the values
      const lower = name.toLowerCase();
      if (Object.keys(this.item.requestHeader).some((k) => k.toLowerCase() === lower)) return;
      target.setRequestHeader(name, value);
      this.item.sessionTokenSent = true;
    });
  }

  private isTracked(item = this.item) {
    return !this.config.disabled && !(item.url && this.config.isServiceUrl(item.url));
  }

  public onReadyStateChange() {
    try {
      if (!this.isTracked()) return;
      this.item.readyState = this.XMLReq.readyState;
      this.item.responseType = this.XMLReq.responseType;
      this.item.endTime = performance.now();
      this.item.duration = this.item.endTime - this.item.startTime;
      this.updateItemByReadyState();
    } catch {}
  }

  private report() {
    if (this.reported) return;
    this.reported = true;
    this.sendItem(this.item);
  }

  private sendItem(item: NetworkMessage) {
    try {
      // no url: opened past the proxy (prototype call, a subclass's own this.open), or never opened
      if (!item.url || !this.isTracked(item)) return;
      const msg = item.getMessage();
      if (msg) this.config.sendMessage(msg);
    } catch {}
  }

  public onAbort() {
    this.item.cancelState = 1;
    this.item.statusText = "Abort";
  }

  public onTimeout() {
    this.item.cancelState = 3;
    this.item.statusText = "Timeout";
  }

  /**
   * Update item's properties according to readyState.
   */
  protected updateItemByReadyState() {
    switch (this.XMLReq.readyState) {
      case RequestState.UNSENT:
      case RequestState.OPENED:
        this.item.status = RequestState.UNSENT;
        this.item.statusText = "Pending";
        if (!this.item.startTime) {
          this.item.startTime = performance.now();
        }
        break;
      case RequestState.HEADERS_RECEIVED:
        this.item.status = this.XMLReq.status;
        this.item.statusText = "Loading";
        this.item.header = {};
        for (const line of (this.XMLReq.getAllResponseHeaders() || "").split(/\r?\n/)) {
          const colon = line.indexOf(":");
          if (colon > 0) this.item.header[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
        }
        break;
      case RequestState.LOADING:
        this.item.status = this.XMLReq.status;
        this.item.statusText = "Loading";
        break;
      case RequestState.DONE: {
        this.done = this.item;
        // `XMLReq.abort()` will change `status` from 200 to 0, so use previous value in this case
        this.item.status = this.XMLReq.status || this.item.status || 0;
        // show status code when request completed
        this.item.statusText = String(this.item.status);
        this.item.endTime = performance.now();
        this.item.duration =
          this.item.endTime - (this.item.startTime || this.item.endTime);

        const capture = shouldCapture(this.config.captureBody, this.item.url);
        const resp = this.XMLReq.response as any;
        const respType = this.XMLReq.responseType || "";
        let text = "";
        if (capture && (respType === "" || respType === "text" || respType === "json")) {
          text = getStringResponseByType(respType, resp);
          if (text.length <= BODY_LIMIT) this.item.response = text;
        }
        // the O(n) byte count only for bodies kept in the message, .length is exact for ASCII
        const tag = tagOf(resp);
        const size =
          typeof resp === "string"
            ? this.item.response
              ? utf8Length(resp)
              : resp.length
            : respType === "json"
              ? this.item.response
                ? utf8Length(this.item.response)
                : text.length || Number(this.XMLReq.getResponseHeader("content-length")) || 0
              : tag === "ArrayBuffer"
                ? resp.byteLength
                : tag === "Blob" || tag === "File"
                  ? resp.size
                  : 0;
        if (size) {
          this.item.responseSize = size;
          this.item.responseSizeText = formatByteSize(size);
        }
        break;
      }
      default:
        this.item.status = this.XMLReq.status;
        this.item.statusText = "Unknown";
        break;
    }
  }
}

export default class XHRProxy {
  public static create(
    ignoredHeaders: boolean | string[],
    setSessionTokenHeader: (cb: (name: string, value: string) => void) => void,
    sanitize: (data: RequestResponseData) => RequestResponseData | null,
    sendMessage: (data: INetworkMessage) => void,
    isServiceUrl: (url: string) => boolean,
    tokenUrlMatcher?: (url: string) => boolean,
    // the context's own constructor: wrapping this module's global breaks iframes
    target: typeof XMLHttpRequest = XMLHttpRequest,
    context: typeof globalThis = window,
  ) {
    return XHRProxy.fromConfig(
      { ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl, tokenUrlMatcher },
      target,
      context,
    );
  }

  public static fromConfig(
    config: ProxyConfig,
    target: typeof XMLHttpRequest = XMLHttpRequest,
    context: typeof globalThis = window,
  ) {
    return new Proxy(target, {
      construct(original: any, args: any[], newTarget: Function) {
        // newTarget: subclasses keep their prototype
        const XMLReq = Reflect.construct(original, args, newTarget);
        if (config.disabled) return XMLReq;
        const handler = new XHRProxyHandler(XMLReq as XMLHttpRequest, config, context);
        // a copy of this library stacked on ours passes its own constructor proxy, with the same prototype
        const subclass = Reflect.get(newTarget, "prototype") !== original.prototype;
        const xhr = subclass && handler.genuine ? handler.instrument(XMLReq) : new Proxy(XMLReq, handler);
        proxiedRequests.add(xhr);
        return xhr;
      },
    });
  }
}
