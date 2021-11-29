import { timestamp, log, warn } from '../utils';
import { Timestamp, PageClose } from '../../messages';
import Message from '../../messages/message';
import Nodes from './nodes';
import Observer from './observer';
import Ticker from './ticker';

import { deviceMemory, jsHeapSizeLimit } from '../modules/performance';

import type { Options as ObserverOptions } from './observer';

import type { Options as WebworkerOptions, WorkerMessageData } from '../../messages/webworker';

interface OnStartInfo {
  sessionID: string, 
  sessionToken: string, 
  userUUID: string,
}

export type Options = {
  revID: string;
  node_id: string;
  session_token_key: string;
  session_pageno_key: string;
  local_uuid_key: string;
  ingestPoint: string;
  resourceBaseHref: string | null, // resourceHref?
  //resourceURLRewriter: (url: string) => string | boolean,
  __is_snippet: boolean;
  __debug_report_edp: string | null;
  __debug_log: boolean;
  onStart?: (info: OnStartInfo) => void;
} & ObserverOptions & WebworkerOptions;

type Callback = () => void;
type CommitCallback = (messages: Array<Message>) => void;


// TODO: use backendHost only
export const DEFAULT_INGEST_POINT = 'https://api.openreplay.com/ingest';

export default class App {
  readonly nodes: Nodes;
  readonly ticker: Ticker;
  readonly projectKey: string;
  private readonly messages: Array<Message> = [];
  /*private*/ readonly observer: Observer; // temp, for fast security fix. TODO: separate security/obscure module with nodeCallback that incapsulates `textMasked` functionality from Observer
  private readonly startCallbacks: Array<Callback> = [];
  private readonly stopCallbacks: Array<Callback> = [];
  private readonly commitCallbacks: Array<CommitCallback> = [];
  private readonly options: Options;
  private readonly revID: string;
  private  _sessionID: string | null = null;
  private isActive = false;
  private version = 'TRACKER_VERSION';
  private readonly worker?: Worker;
  constructor(
    projectKey: string,
    sessionToken: string | null | undefined,
    opts: Partial<Options>,
  ) {
    this.projectKey = projectKey;
    this.options = Object.assign(
      {
        revID: '',
        node_id: '__openreplay_id',
        session_token_key: '__openreplay_token',
        session_pageno_key: '__openreplay_pageno',
        local_uuid_key: '__openreplay_uuid',
        ingestPoint: DEFAULT_INGEST_POINT,
        resourceBaseHref: null,
        __is_snippet: false,
        __debug_report_edp: null,
        __debug_log: false,
        obscureTextEmails: true,
        obscureTextNumbers: false,
        captureIFrames: false,
      },
      opts,
    );
    if (sessionToken != null) {
      sessionStorage.setItem(this.options.session_token_key, sessionToken);
    }
    this.revID = this.options.revID;
    this.nodes = new Nodes(this.options.node_id);
    this.observer = new Observer(this, this.options);
    this.ticker = new Ticker(this);
    this.ticker.attach(() => this.commit());
    try {
      this.worker = new Worker(
        URL.createObjectURL(
          new Blob([`WEBWORKER_BODY`], { type: 'text/javascript' }),
        ),
      );
      this.worker.onerror = e => {
        this._debug("webworker_error", e)
      }
      let lastTs = timestamp();
      let fileno = 0;
      this.worker.onmessage = ({ data }: MessageEvent) => {
        if (data === null) {
          this.stop();
        } else if (data === "restart") {
          this.stop();
          this.start(true);
        }
      };
      const alertWorker = () => {
        if (this.worker) {
          this.worker.postMessage(null);
        }
      }
      // TODO: keep better tactics, discard others (look https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
      this.attachEventListener(window, 'beforeunload', alertWorker, false);
      this.attachEventListener(document, 'mouseleave', alertWorker, false, false);
      this.attachEventListener(document, 'visibilitychange', alertWorker, false);
    } catch (e) { 
      this._debug("worker_start", e);
    }
  }

  private _debug(context: string, e: any) {
    if(this.options.__debug_report_edp !== null) {
      fetch(this.options.__debug_report_edp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          error: `${e}`
        })
      });
    }
    if(this.options.__debug_log) {
      warn("OpenReplay error: ", context, e)
    }
  }

  send(message: Message, urgent = false): void {
    if (!this.isActive) {
      return;
    }
    this.messages.push(message);
    if (urgent) {
      this.commit();
    }
  }
  private commit(): void {
    if (this.worker && this.messages.length) {
      this.messages.unshift(new Timestamp(timestamp()));
      this.worker.postMessage(this.messages);
      this.commitCallbacks.forEach(cb => cb(this.messages));
      this.messages.length = 0;
    }
  }

  attachCommitCallback(cb: CommitCallback): void {
    this.commitCallbacks.push(cb)
  }
  // @Depricated (TODO: remove in 3.5.*)
  addCommitCallback(cb: CommitCallback): void {
    this.attachCommitCallback(cb)
  }


  safe<T extends (...args: any[]) => void>(fn: T): T {
    const app = this;
    return function (this: any, ...args: any) {
      try {
        fn.apply(this, args);
      } catch (e) {
        app._debug("safe_fn_call", e)
        // time: timestamp(),
        // name: e.name,
        // message: e.message,
        // stack: e.stack
      }
    } as any // TODO: correct typing
  }

  attachStartCallback(cb: Callback): void {
    this.startCallbacks.push(cb);
  }
  attachStopCallback(cb: Callback): void {
    this.stopCallbacks.push(cb);
  }
  attachEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    useSafe = true,
    useCapture = true,
  ): void {
    if (useSafe) {
      listener = this.safe(listener);
    }
    this.attachStartCallback(() =>
      target.addEventListener(type, listener, useCapture),
    );
    this.attachStopCallback(() =>
      target.removeEventListener(type, listener, useCapture),
    );
  }

  getSessionToken(): string | undefined {
    const token = sessionStorage.getItem(this.options.session_token_key);
    if (token !== null) {
      return token;
    }
  }
  getSessionID(): string | undefined {
    return this._sessionID || undefined;
  }
  getHost(): string {
    return new URL(this.options.ingestPoint).hostname
  }
  getProjectKey(): string {
    return this.projectKey
  }
  getBaseHref(): string {
    if (typeof this.options.resourceBaseHref === 'string') {
      return this.options.resourceBaseHref
    } else if (typeof this.options.resourceBaseHref === 'object') {
      //switch between  types
    }
    if (document.baseURI) {
      return document.baseURI
    }
    // IE only
    return document.head
      ?.getElementsByTagName("base")[0]
      ?.getAttribute("href") || location.origin + location.pathname
  }
  resolveResourceURL(resourceURL: string): string {
    const base = new URL(this.getBaseHref())
    base.pathname += "/" + new URL(resourceURL).pathname
    base.pathname.replace(/\/+/g, "/")
    return base.toString()
  }

  isServiceURL(url: string): boolean {
    return url.startsWith(this.options.ingestPoint)
  }

  active(): boolean {
    return this.isActive;
  }
  private _start(reset: boolean): Promise<OnStartInfo> {
    if (!this.isActive) {
      if (!this.worker) {
        return Promise.reject("No worker found: perhaps, CSP is not set.");
      }
      this.isActive = true;

      let pageNo: number = 0;
      const pageNoStr = sessionStorage.getItem(this.options.session_pageno_key);
      if (pageNoStr != null) {
        pageNo = parseInt(pageNoStr);
        pageNo++;
      }
      sessionStorage.setItem(this.options.session_pageno_key, pageNo.toString());
      const startTimestamp = timestamp();

      const messageData: WorkerMessageData = {
        ingestPoint: this.options.ingestPoint,
        pageNo,
        startTimestamp,
        connAttemptCount: this.options.connAttemptCount,
        connAttemptGap: this.options.connAttemptGap,
      }
      this.worker.postMessage(messageData); // brings delay of 10th ms?
      return window.fetch(this.options.ingestPoint + '/v1/web/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: sessionStorage.getItem(this.options.session_token_key),
          userUUID: localStorage.getItem(this.options.local_uuid_key),
          projectKey: this.projectKey,
          revID: this.revID,
          timestamp: startTimestamp,
          trackerVersion: this.version,
          isSnippet: this.options.__is_snippet,
          deviceMemory,
          jsHeapSizeLimit,
          reset,
        }),
      })
      .then(r => {
        if (r.status === 200) {
          return r.json()
        } else { // TODO: handle canceling && 403
          return r.text().then(text => {
            throw new Error(`Server error: ${r.status}. ${text}`);
          });
        }
      })
      .then(r => {
        const { token, userUUID, sessionID, beaconSizeLimit } = r;
        if (typeof token !== 'string' ||
            typeof userUUID !== 'string' ||
            (typeof beaconSizeLimit !== 'number' && typeof beaconSizeLimit !== 'undefined')) {
          throw new Error(`Incorrect server response: ${ JSON.stringify(r) }`);
        }
        sessionStorage.setItem(this.options.session_token_key, token);
        localStorage.setItem(this.options.local_uuid_key, userUUID);
        if (typeof sessionID === 'string') {
          this._sessionID = sessionID;
        }
        if (!this.worker) {
          throw new Error("no worker found after start request (this might not happen)");
        }
        this.worker.postMessage({ token, beaconSizeLimit });
        this.startCallbacks.forEach((cb) => cb());
        this.observer.observe();
        this.ticker.start();

        log("OpenReplay tracking started.");
        const onStartInfo = { sessionToken: token, userUUID, sessionID };
        if (typeof this.options.onStart === 'function') {
          this.options.onStart(onStartInfo);
        }
        return onStartInfo;
      })
      .catch(e => {
        sessionStorage.removeItem(this.options.session_token_key)
        this.stop()
        warn("OpenReplay was unable to start. ", e)
        this._debug("session_start", e);
        throw e
      })
    }
    return Promise.reject("Player is already active");
  }

  start(reset: boolean = false): Promise<OnStartInfo> {
    if (!document.hidden) {
      return this._start(reset);
    } else {
      return new Promise((resolve) => {
        const onVisibilityChange = () => {
          if (!document.hidden) {
            document.removeEventListener("visibilitychange", onVisibilityChange);
            resolve(this._start(reset));
          }
        }
        document.addEventListener("visibilitychange", onVisibilityChange);
      });
    }
  }
  stop(): void {
    if (this.isActive) {
      try {
        if (this.worker) {
          this.worker.postMessage("stop");
        }
        this.observer.disconnect();
        this.nodes.clear();
        this.ticker.stop();
        this.stopCallbacks.forEach((cb) => cb());
        log("OpenReplay tracking stopped.")
      } finally {
        this.isActive = false;
      }
    }
  }
}
