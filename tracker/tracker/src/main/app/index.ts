import { timestamp, deprecationWarn } from "../utils.js";
import { Timestamp, Metadata } from "../../messages/index.js";
import Message from "../../messages/message.js";
import Nodes from "./nodes.js";
import Observer from "./observer/top_observer.js";
import Sanitizer from "./sanitizer.js";
import Ticker from "./ticker.js";
import Logger, { LogLevel } from "./logger.js";
import Session from "./session.js";

import { deviceMemory, jsHeapSizeLimit } from "../modules/performance.js";

import type { Options as ObserverOptions } from "./observer/top_observer.js";
import type { Options as SanitizerOptions } from "./sanitizer.js";
import type { Options as LoggerOptions } from "./logger.js"
import type { Options as WebworkerOptions, WorkerMessageData } from "../../webworker/types.js";


// TODO: Unify and clearly describe options logic
export interface StartOptions {
  userID?: string,
  metadata?: Record<string, string>,
  forceNew?: boolean,
}

export interface OnStartInfo {
  sessionID: string, 
  sessionToken: string, 
  userUUID: string,
}

type StartCallback = (i: OnStartInfo) => void
type CommitCallback = (messages: Array<Message>) => void
enum ActivityState {
  NotActive,
  Starting,
  Active,
}

type AppOptions = {
  revID: string;
  node_id: string;
  session_token_key: string;
  session_pageno_key: string;
  session_reset_key: string;
  local_uuid_key: string;
  ingestPoint: string;
  resourceBaseHref: string | null, // resourceHref?
  //resourceURLRewriter: (url: string) => string | boolean,
  verbose: boolean;
  __is_snippet: boolean;
  __debug_report_edp: string | null;
  __debug__?: LoggerOptions;

  // @deprecated
  onStart?: StartCallback;
} & WebworkerOptions;

export type Options = AppOptions & ObserverOptions & SanitizerOptions

export const CANCELED = "canceled"

// TODO: use backendHost only
export const DEFAULT_INGEST_POINT = 'https://api.openreplay.com/ingest';

export default class App {
  readonly nodes: Nodes;
  readonly ticker: Ticker;
  readonly projectKey: string;
  readonly sanitizer: Sanitizer;
  readonly debug: Logger;
  readonly notify: Logger;
  readonly session: Session;
  private readonly messages: Array<Message> = [];
  private readonly observer: Observer;
  private readonly startCallbacks: Array<StartCallback> = [];
  private readonly stopCallbacks: Array<Function> = [];
  private readonly commitCallbacks: Array<CommitCallback> = [];
  private readonly options: AppOptions;
  private readonly revID: string;
  private activityState: ActivityState = ActivityState.NotActive;
  private version = 'TRACKER_VERSION'; // TODO: version compatability check inside each plugin.
  private readonly worker?: Worker;
  constructor(
    projectKey: string,
    sessionToken: string | null | undefined,
    options: Partial<Options>,
  ) {

    // if (options.onStart !== undefined) {
    //   deprecationWarn("'onStart' option", "tracker.start().then(/* handle session info */)")
    // } ?? maybe onStart is good

    this.projectKey = projectKey;
    this.options = Object.assign(
      {
        revID: '',
        node_id: '__openreplay_id',
        session_token_key: '__openreplay_token',
        session_pageno_key: '__openreplay_pageno',
        session_reset_key: '__openreplay_reset',
        local_uuid_key: '__openreplay_uuid',
        ingestPoint: DEFAULT_INGEST_POINT,
        resourceBaseHref: null,
        verbose: false,
        __is_snippet: false,
        __debug_report_edp: null,
      },
      options,
    );
    if (sessionToken != null) {
      sessionStorage.setItem(this.options.session_token_key, sessionToken);
    }
    this.revID = this.options.revID;
    this.sanitizer = new Sanitizer(this, options);
    this.nodes = new Nodes(this.options.node_id);
    this.observer = new Observer(this, options);
    this.ticker = new Ticker(this);
    this.ticker.attach(() => this.commit());
    this.debug = new Logger(this.options.__debug__);
    this.notify = new Logger(this.options.verbose ? LogLevel.Warnings : LogLevel.Silent);
    this.session = new Session(this);
    try {
      this.worker = new Worker(
        URL.createObjectURL(
          new Blob([`WEBWORKER_BODY`], { type: 'text/javascript' }),
        ),
      );
      this.worker.onerror = e => {
        this._debug("webworker_error", e)
      }
      this.worker.onmessage = ({ data }: MessageEvent) => {
        if (data === "failed") {
          this.stop();
        } else if (data === "restart") {
          this.stop();
          this.start({ forceNew: true });
        }
      }
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
    this.debug.error("OpenReplay error: ", context, e)
  }

  send(message: Message, urgent = false): void {
    if (this.activityState === ActivityState.NotActive) { return }
    this.messages.push(message);
    // TODO: commit on start if there were `urgent` sends; 
    // Clearify where urgent can be used for;
    // Clearify workflow for each type of message in case it was sent before start 
    //      (like Fetch before start; maybe add an option "preCapture: boolean" or sth alike)
    if (this.activityState === ActivityState.Active && urgent) {
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

  attachCommitCallback(cb: CommitCallback): void {
    this.commitCallbacks.push(cb)
  }
  attachStartCallback(cb: StartCallback): void {
    this.startCallbacks.push(cb);
  }
  attachStopCallback(cb: Function): void {
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

  // TODO: full correct semantic
  checkRequiredVersion(version: string): boolean {
    const reqVer = version.split('.')
    const ver = this.version.split('.')
    for (let i = 0; i < 3; i++) {
      if (Number(ver[i]) < Number(reqVer[i]) || isNaN(Number(ver[i])) || isNaN(Number(reqVer[i]))) {
        return false
      }
    }
    return true
  }

  private getStartInfo() {
    return {
      userUUID: localStorage.getItem(this.options.local_uuid_key),
      projectKey: this.projectKey,
      revID: this.revID,
      timestamp: timestamp(),
      trackerVersion: this.version,
      isSnippet: this.options.__is_snippet,
    }
  }
  getSessionInfo() {
    return {
      ...this.session.getInfo(),
      ...this.getStartInfo()
    }
  }
  getSessionToken(): string | undefined {
    const token = sessionStorage.getItem(this.options.session_token_key);
    if (token !== null) {
      return token;
    }
  }
  getSessionID(): string | undefined {
    return this.session.getInfo().sessionID || undefined;
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
    return this.activityState === ActivityState.Active
  }

  resetNextPageSession(flag: boolean) {
    if (flag) {
      sessionStorage.setItem(this.options.session_reset_key, 't');
    } else {
      sessionStorage.removeItem(this.options.session_reset_key);
    }
  }
  private _start(startOpts: StartOptions): Promise<OnStartInfo> {
    if (!this.worker) {
      return Promise.reject("No worker found: perhaps, CSP is not set.");
    }
    if (this.activityState !== ActivityState.NotActive) { 
      return Promise.reject("OpenReplay: trying to call `start()` on the instance that has been started already.") 
    }
    this.activityState = ActivityState.Starting;

    let pageNo: number = 0;
    const pageNoStr = sessionStorage.getItem(this.options.session_pageno_key);
    if (pageNoStr != null) {
      pageNo = parseInt(pageNoStr);
      pageNo++;
    }
    sessionStorage.setItem(this.options.session_pageno_key, pageNo.toString());

    const startInfo = this.getStartInfo()
    const startWorkerMsg: WorkerMessageData = {
      type: "start",
      pageNo,
      ingestPoint: this.options.ingestPoint,
      timestamp: startInfo.timestamp,
      connAttemptCount: this.options.connAttemptCount,
      connAttemptGap: this.options.connAttemptGap,
    }
    this.worker.postMessage(startWorkerMsg) // brings delay of 10th ms?

    const sReset = sessionStorage.getItem(this.options.session_reset_key);
    sessionStorage.removeItem(this.options.session_reset_key);

    return window.fetch(this.options.ingestPoint + '/v1/web/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...startInfo,
        userID: startOpts.userID || this.session.getInfo().userID,
        token: sessionStorage.getItem(this.options.session_token_key),
        deviceMemory,
        jsHeapSizeLimit,
        reset: startOpts.forceNew || sReset !== null,
      }),
    })
    .then(r => {
      if (r.status === 200) {
        return r.json()
      } else {
        return r.text().then(text => text === CANCELED 
          ? Promise.reject(CANCELED) // TODO: return {error: CANCELED} instead
          : Promise.reject(`Server error: ${r.status}. ${text}`)
        );
      }
    })
    .then(r => {
      if (!this.worker) {
        return Promise.reject("no worker found after start request (this might not happen)");
      }
      const { token, userUUID, sessionID, beaconSizeLimit } = r;
      if (typeof token !== 'string' ||
          typeof userUUID !== 'string' ||
          (typeof beaconSizeLimit !== 'number' && typeof beaconSizeLimit !== 'undefined')) {
        return Promise.reject(`Incorrect server response: ${ JSON.stringify(r) }`);
      }
      sessionStorage.setItem(this.options.session_token_key, token);
      localStorage.setItem(this.options.local_uuid_key, userUUID);
      this.session.update({
        sessionID, // any. TODO check
        ...startOpts
      });

      this.activityState = ActivityState.Active
      const startWorkerMsg: WorkerMessageData = {
        type: "auth",
        token,
        beaconSizeLimit
      }
      this.worker.postMessage(startWorkerMsg)

      const onStartInfo = { sessionToken: token, userUUID, sessionID };

      this.startCallbacks.forEach((cb) => cb(onStartInfo));
      this.observer.observe();
      this.ticker.start();

      this.notify.log("OpenReplay tracking started.");
      // TODO: get rid of onStart
      if (typeof this.options.onStart === 'function') {
        this.options.onStart(onStartInfo);
      }
      return onStartInfo;
    })
    .catch(reason => {        
      sessionStorage.removeItem(this.options.session_token_key)
      this.stop()
      //if (reason === CANCELED) { return Promise.resolve(CANCELED) } // TODO: what to return ????? Throwing is baad

      if (reason !== CANCELED) {
        this.notify.log("OpenReplay was unable to start. ", reason)
        this._debug("session_start", reason)
      }
      return Promise.reject(reason)
    })
  }

  start(options: StartOptions = {}): Promise<OnStartInfo> {
    if (!document.hidden) {
      return this._start(options);
    } else {
      return new Promise((resolve) => {
        const onVisibilityChange = () => {
          if (!document.hidden) {
            document.removeEventListener("visibilitychange", onVisibilityChange);
            resolve(this._start(options));
          }
        }
        document.addEventListener("visibilitychange", onVisibilityChange);
      });
    }
  }
  stop(): void {
    if (this.activityState !== ActivityState.NotActive) {
      try {
        if (this.worker) {
          this.worker.postMessage("stop")
        }
        this.sanitizer.clear()
        this.observer.disconnect()
        this.nodes.clear()
        this.ticker.stop()
        this.stopCallbacks.forEach((cb) => cb())
        this.notify.log("OpenReplay tracking stopped.")
      } finally {
        this.activityState = ActivityState.NotActive
      }
    }
  }
}
