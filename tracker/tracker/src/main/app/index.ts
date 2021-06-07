import { timestamp, log } from '../utils';
import { Timestamp, TechnicalInfo, PageClose } from '../../messages';
import Message from '../../messages/message';
import Nodes from './nodes';
import Observer from './observer';
import Ticker from './ticker';

import { deviceMemory, jsHeapSizeLimit } from '../modules/performance';

import type { Options as ObserverOptions } from './observer';

import type { Options as WebworkerOptions, MessageData } from '../../webworker/types';

export type Options = {
  revID: string;
  node_id: string;
  session_token_key: string;
  session_pageno_key: string;
  local_uuid_key: string;
  ingestPoint: string;
  __is_snippet: boolean;
  onStart?: (info: { sessionID: string, sessionToken: string, userUUID: string }) => void;
} & ObserverOptions & WebworkerOptions;

type Callback = () => void;

export const DEFAULT_INGEST_POINT = 'https://ingest.openreplay.com';

export default class App {
  readonly nodes: Nodes;
  readonly ticker: Ticker;
  private readonly messages: Array<Message> = [];
  private readonly observer: Observer;
  private readonly startCallbacks: Array<Callback>;
  private readonly stopCallbacks: Array<Callback>;
  private readonly options: Options;
  private readonly projectKey: string;
  private readonly revID: string;
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
        __is_snippet: false,
        obscureTextEmails: true,
        obscureTextNumbers: false,
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
    this.startCallbacks = [];
    this.stopCallbacks = [];
    try {
      this.worker = new Worker(
        URL.createObjectURL(
          new Blob([`WEBWORKER_BODY`], { type: 'text/javascript' }),
        ),
      );
      // this.worker.onerror = e => {
      //   this.send(new TechnicalInfo("webworker_error", JSON.stringify(e)));
      // /* TODO: send report */
      // }
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
      this.attachEventListener(window, 'beforeunload', alertWorker, false);
      this.attachEventListener(document, 'mouseleave', alertWorker, false, false);
    } catch (e) { /* TODO: send report */}
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
      this.messages.length = 0;
    }
  }

  safe<T extends (...args: any[]) => void>(fn: T): T {
    const app = this;
    return function (this: any, ...args: any) {
      try {
        fn.apply(this, args);
      } catch (e) {
        app.send(new TechnicalInfo("error", JSON.stringify({ 
          time: timestamp(), 
          name: e.name, 
          message: e.message,
          stack: e.stack 
        })));
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
  // @Depricated; for the old fetch-plugin versions
  sessionID(): string | undefined {
    return this.getSessionToken();
  }

  isServiceURL(url: string): boolean {
    return url.startsWith(this.options.ingestPoint);
  }

  active(): boolean {
    return this.isActive;
  }
  _start(reset: boolean): void {   // TODO: return a promise instead of onStart handling
    if (!this.isActive) {
      this.isActive = true;
      if (!this.worker) {
        throw new Error("Stranger things: no worker found"); 
      }

      let pageNo: number = 0;
      const pageNoStr = sessionStorage.getItem(this.options.session_pageno_key);
      if (pageNoStr != null) {
        pageNo = parseInt(pageNoStr);
        pageNo++;
      }
      sessionStorage.setItem(this.options.session_pageno_key, pageNo.toString());
      const startTimestamp = timestamp();

      const messageData: MessageData = { 
        ingestPoint: this.options.ingestPoint, 
        pageNo, 
        startTimestamp,
        connAttemptCount: this.options.connAttemptCount,
        connAttemptGap: this.options.connAttemptGap,
      }
      this.worker.postMessage(messageData); // brings delay of 10th ms?  
      this.observer.observe();
      this.startCallbacks.forEach((cb) => cb());
      this.ticker.start();

      window.fetch(this.options.ingestPoint + '/v1/web/start', { 
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
          throw new Error("Server error");
        }
      })
      .then(r => {
        const { token, userUUID } = r;
        if (typeof token !== 'string' || 
            typeof userUUID !== 'string') {
          throw new Error("Incorrect server responce");
        }
        sessionStorage.setItem(this.options.session_token_key, token);
        localStorage.setItem(this.options.local_uuid_key, userUUID);
        if (!this.worker) {
          throw new Error("Stranger things: no worker found after start request"); 
        }
        this.worker.postMessage({ token });

        log("OpenReplay tracking started.");
        if (typeof this.options.onStart === 'function') {
          this.options.onStart({ sessionToken: token, userUUID, sessionID: token /* back compat (depricated) */ });
        }
      })
      .catch(e => {
        this.stop();
        /* TODO: send report */
      })
    }
  }

  start(reset: boolean = false): void {
    if (!document.hidden) {
      this._start(reset);
    } else {
      const onVisibilityChange = () => {
        if (!document.hidden) {
          document.removeEventListener("visibilitychange", onVisibilityChange);
          this._start(reset);
        }
      }
      document.addEventListener("visibilitychange", onVisibilityChange);
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
