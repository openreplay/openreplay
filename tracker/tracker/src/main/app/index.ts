import type Message from '../../common/messages.js';
import { Timestamp, Metadata, UserID } from '../../common/messages.js';
import { timestamp, deprecationWarn } from '../utils.js';
import Nodes from './nodes.js';
import Observer from './observer/top_observer.js';
import Sanitizer from './sanitizer.js';
import Ticker from './ticker.js';
import Logger, { LogLevel } from './logger.js';
import Session from './session.js';

import { deviceMemory, jsHeapSizeLimit } from '../modules/performance.js';

import type { Options as ObserverOptions } from './observer/top_observer.js';
import type { Options as SanitizerOptions } from './sanitizer.js';
import type { Options as LoggerOptions } from './logger.js';
import type { Options as WebworkerOptions, WorkerMessageData } from '../../common/webworker.js';

// TODO: Unify and clearly describe options logic
export interface StartOptions {
  userID?: string;
  metadata?: Record<string, string>;
  forceNew?: boolean;
}

interface OnStartInfo {
  sessionID: string;
  sessionToken: string;
  userUUID: string;
}
const CANCELED = 'canceled' as const;
const START_ERROR = ':(' as const;
type SuccessfulStart = OnStartInfo & { success: true };
type UnsuccessfulStart = {
  reason: typeof CANCELED | string;
  success: false;
};
const UnsuccessfulStart = (reason: string): UnsuccessfulStart => ({ reason, success: false });
const SuccessfulStart = (body: OnStartInfo): SuccessfulStart => ({ ...body, success: true });
export type StartPromiseReturn = SuccessfulStart | UnsuccessfulStart;

type StartCallback = (i: OnStartInfo) => void;
type CommitCallback = (messages: Array<Message>) => void;
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
  resourceBaseHref: string | null; // resourceHref?
  //resourceURLRewriter: (url: string) => string | boolean,
  verbose: boolean;
  __is_snippet: boolean;
  __debug_report_edp: string | null;
  __debug__?: LoggerOptions;
  localStorage: Storage | null;
  sessionStorage: Storage | null;

  // @deprecated
  onStart?: StartCallback;
} & WebworkerOptions;

export type Options = AppOptions & ObserverOptions & SanitizerOptions;

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
  readonly localStorage: Storage;
  readonly sessionStorage: Storage;
  private readonly messages: Array<Message> = [];
  private readonly observer: Observer;
  private readonly startCallbacks: Array<StartCallback> = [];
  private readonly stopCallbacks: Array<() => any> = [];
  private readonly commitCallbacks: Array<CommitCallback> = [];
  private readonly options: AppOptions;
  private readonly revID: string;
  private activityState: ActivityState = ActivityState.NotActive;
  private readonly version = 'TRACKER_VERSION'; // TODO: version compatability check inside each plugin.
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
        localStorage: null,
        sessionStorage: null,
      },
      options,
    );

    this.revID = this.options.revID;
    this.sanitizer = new Sanitizer(this, options);
    this.nodes = new Nodes(this.options.node_id);
    this.observer = new Observer(this, options);
    this.ticker = new Ticker(this);
    this.ticker.attach(() => this.commit());
    this.debug = new Logger(this.options.__debug__);
    this.notify = new Logger(this.options.verbose ? LogLevel.Warnings : LogLevel.Silent);
    this.session = new Session();
    this.session.attachUpdateCallback(({ userID, metadata }) => {
      if (userID != null) {
        // TODO: nullable userID
        this.send(new UserID(userID));
      }
      if (metadata != null) {
        Object.entries(metadata).forEach(([key, value]) => this.send(new Metadata(key, value)));
      }
    });

    // window.localStorage and window.sessionStorage should only be accessed if required, see #490, #637
    this.localStorage = this.options.localStorage ?? window.localStorage;
    this.sessionStorage = this.options.sessionStorage ?? window.sessionStorage;

    if (sessionToken != null) {
      this.sessionStorage.setItem(this.options.session_token_key, sessionToken);
    }

    try {
      this.worker = new Worker(
        URL.createObjectURL(new Blob(['WEBWORKER_BODY'], { type: 'text/javascript' })),
      );
      this.worker.onerror = (e) => {
        this._debug('webworker_error', e);
      };
      this.worker.onmessage = ({ data }: MessageEvent) => {
        if (data === 'failed') {
          this.stop();
          this._debug('worker_failed', {}); // add context (from worker)
        } else if (data === 'restart') {
          this.stop();
          this.start({ forceNew: true });
        }
      };
      const alertWorker = () => {
        if (this.worker) {
          this.worker.postMessage(null);
        }
      };
      // keep better tactics, discard others?
      this.attachEventListener(window, 'beforeunload', alertWorker, false);
      this.attachEventListener(document.body, 'mouseleave', alertWorker, false, false);
      // TODO: stop session after inactivity timeout (make configurable)
      this.attachEventListener(document, 'visibilitychange', alertWorker, false);
    } catch (e) {
      this._debug('worker_start', e);
    }
  }

  private _debug(context: string, e: any) {
    if (this.options.__debug_report_edp !== null) {
      fetch(this.options.__debug_report_edp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          error: `${e}`,
        }),
      });
    }
    this.debug.error('OpenReplay error: ', context, e);
  }

  send(message: Message, urgent = false): void {
    if (this.activityState === ActivityState.NotActive) {
      return;
    }
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
      this.commitCallbacks.forEach((cb) => cb(this.messages));
      this.messages.length = 0;
    }
  }

  safe<T extends (...args: any[]) => void>(fn: T): T {
    const app = this;
    return function (this: any, ...args: any) {
      try {
        fn.apply(this, args);
      } catch (e) {
        app._debug('safe_fn_call', e);
        // time: timestamp(),
        // name: e.name,
        // message: e.message,
        // stack: e.stack
      }
    } as any; // TODO: correct typing
  }

  attachCommitCallback(cb: CommitCallback): void {
    this.commitCallbacks.push(cb);
  }
  attachStartCallback(cb: StartCallback): void {
    this.startCallbacks.push(cb);
  }
  attachStopCallback(cb: () => any): void {
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
    this.attachStartCallback(() => target.addEventListener(type, listener, useCapture));
    this.attachStopCallback(() => target.removeEventListener(type, listener, useCapture));
  }

  // TODO: full correct semantic
  checkRequiredVersion(version: string): boolean {
    const reqVer = version.split(/[.-]/);
    const ver = this.version.split(/[.-]/);
    for (let i = 0; i < 3; i++) {
      if (Number(ver[i]) < Number(reqVer[i]) || isNaN(Number(ver[i])) || isNaN(Number(reqVer[i]))) {
        return false;
      }
    }
    return true;
  }

  private getStartInfo() {
    return {
      userUUID: this.localStorage.getItem(this.options.local_uuid_key),
      projectKey: this.projectKey,
      revID: this.revID,
      timestamp: timestamp(), // shouldn't it be set once?
      trackerVersion: this.version,
      isSnippet: this.options.__is_snippet,
    };
  }
  getSessionInfo() {
    return {
      ...this.session.getInfo(),
      ...this.getStartInfo(),
    };
  }
  getSessionToken(): string | undefined {
    const token = this.sessionStorage.getItem(this.options.session_token_key);
    if (token !== null) {
      return token;
    }
  }
  getSessionID(): string | undefined {
    return this.session.getInfo().sessionID || undefined;
  }
  getHost(): string {
    return new URL(this.options.ingestPoint).hostname;
  }
  getProjectKey(): string {
    return this.projectKey;
  }
  getBaseHref(): string {
    if (typeof this.options.resourceBaseHref === 'string') {
      return this.options.resourceBaseHref;
    } else if (typeof this.options.resourceBaseHref === 'object') {
      //switch between  types
    }
    if (document.baseURI) {
      return document.baseURI;
    }
    // IE only
    return (
      document.head?.getElementsByTagName('base')[0]?.getAttribute('href') ||
      location.origin + location.pathname
    );
  }
  resolveResourceURL(resourceURL: string): string {
    const base = new URL(this.getBaseHref());
    base.pathname += '/' + new URL(resourceURL).pathname;
    base.pathname.replace(/\/+/g, '/');
    return base.toString();
  }

  isServiceURL(url: string): boolean {
    return url.startsWith(this.options.ingestPoint);
  }

  active(): boolean {
    return this.activityState === ActivityState.Active;
  }

  resetNextPageSession(flag: boolean) {
    if (flag) {
      this.sessionStorage.setItem(this.options.session_reset_key, 't');
    } else {
      this.sessionStorage.removeItem(this.options.session_reset_key);
    }
  }
  private _start(startOpts: StartOptions): Promise<StartPromiseReturn> {
    if (!this.worker) {
      return Promise.resolve(UnsuccessfulStart('No worker found: perhaps, CSP is not set.'));
    }
    if (this.activityState !== ActivityState.NotActive) {
      return Promise.resolve(
        UnsuccessfulStart(
          'OpenReplay: trying to call `start()` on the instance that has been started already.',
        ),
      );
    }
    this.activityState = ActivityState.Starting;

    let pageNo = 0;
    const pageNoStr = this.sessionStorage.getItem(this.options.session_pageno_key);
    if (pageNoStr != null) {
      pageNo = parseInt(pageNoStr);
      pageNo++;
    }
    this.sessionStorage.setItem(this.options.session_pageno_key, pageNo.toString());

    const startInfo = this.getStartInfo();
    const startWorkerMsg: WorkerMessageData = {
      type: 'start',
      pageNo,
      ingestPoint: this.options.ingestPoint,
      timestamp: startInfo.timestamp,
      connAttemptCount: this.options.connAttemptCount,
      connAttemptGap: this.options.connAttemptGap,
    };
    this.worker.postMessage(startWorkerMsg);

    this.session.update({
      // TODO: transparent "session" module logic AND explicit internal api for plugins.
      // "updating" with old metadata in order to trigger session's UpdateCallbacks.
      // (for the case of internal .start() calls, like on "restart" webworker signal or assistent connection in tracker-assist )
      metadata: startOpts.metadata || this.session.getInfo().metadata,
      userID: startOpts.userID,
    });

    const sReset = this.sessionStorage.getItem(this.options.session_reset_key);
    this.sessionStorage.removeItem(this.options.session_reset_key);

    return window
      .fetch(this.options.ingestPoint + '/v1/web/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...startInfo,
          userID: this.session.getInfo().userID,
          token: this.sessionStorage.getItem(this.options.session_token_key),
          deviceMemory,
          jsHeapSizeLimit,
          reset: startOpts.forceNew || sReset !== null,
        }),
      })
      .then((r) => {
        if (r.status === 200) {
          return r.json();
        } else {
          return r
            .text()
            .then((text) =>
              text === CANCELED
                ? Promise.reject(CANCELED)
                : Promise.reject(`Server error: ${r.status}. ${text}`),
            );
        }
      })
      .then((r) => {
        if (!this.worker) {
          return Promise.reject('no worker found after start request (this might not happen)');
        }
        const { token, userUUID, sessionID, beaconSizeLimit } = r;
        if (
          typeof token !== 'string' ||
          typeof userUUID !== 'string' ||
          (typeof beaconSizeLimit !== 'number' && typeof beaconSizeLimit !== 'undefined')
        ) {
          return Promise.reject(`Incorrect server response: ${JSON.stringify(r)}`);
        }
        this.sessionStorage.setItem(this.options.session_token_key, token);
        this.localStorage.setItem(this.options.local_uuid_key, userUUID);
        this.session.update({ sessionID }); // TODO: no no-explicit 'any'
        const startWorkerMsg: WorkerMessageData = {
          type: 'auth',
          token,
          beaconSizeLimit,
        };
        this.worker.postMessage(startWorkerMsg);

        this.activityState = ActivityState.Active;

        const onStartInfo = { sessionToken: token, userUUID, sessionID };

        this.startCallbacks.forEach((cb) => cb(onStartInfo)); // TODO: start as early as possible (before receiving the token)
        this.observer.observe();
        this.ticker.start();

        this.notify.log('OpenReplay tracking started.');
        // get rid of onStart ?
        if (typeof this.options.onStart === 'function') {
          this.options.onStart(onStartInfo);
        }
        return SuccessfulStart(onStartInfo);
      })
      .catch((reason) => {
        this.sessionStorage.removeItem(this.options.session_token_key);
        this.stop();
        if (reason === CANCELED) {
          return UnsuccessfulStart(CANCELED);
        }

        this.notify.log('OpenReplay was unable to start. ', reason);
        this._debug('session_start', reason);
        return UnsuccessfulStart(START_ERROR);
      });
  }

  start(options: StartOptions = {}): Promise<StartPromiseReturn> {
    if (!document.hidden) {
      return this._start(options);
    } else {
      return new Promise((resolve) => {
        const onVisibilityChange = () => {
          if (!document.hidden) {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            resolve(this._start(options));
          }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
      });
    }
  }
  stop(calledFromAPI = false, restarting = false): void {
    if (this.activityState !== ActivityState.NotActive) {
      try {
        this.sanitizer.clear();
        this.observer.disconnect();
        this.nodes.clear();
        this.ticker.stop();
        this.stopCallbacks.forEach((cb) => cb());
        if (calledFromAPI) {
          this.session.reset();
        }
        this.notify.log('OpenReplay tracking stopped.');
        if (this.worker && !restarting) {
          this.worker.postMessage('stop');
        }
      } finally {
        this.activityState = ActivityState.NotActive;
      }
    }
  }
  restart() {
    this.stop(false, true);
    this.start({ forceNew: false });
  }
}
