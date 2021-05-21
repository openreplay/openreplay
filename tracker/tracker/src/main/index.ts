import App, { DEFAULT_INGEST_POINT } from './app';
export { default as App } from './app';

import { UserID, UserAnonymousID, Metadata, RawCustomEvent, CustomIssue } from '../messages';
import * as _Messages from '../messages';
export const Messages = _Messages;

import Connection from './modules/connection';
import Console from './modules/console';
import Exception, { getExceptionMessageFromEvent, getExceptionMessage } from './modules/exception';
import Img from './modules/img';
import Input from './modules/input';
import Mouse from './modules/mouse';
import Timing from './modules/timing';
import Performance from './modules/performance';
import Scroll from './modules/scroll';
import Viewport from './modules/viewport';
import Longtasks from './modules/longtasks';
import CSSRules from './modules/cssrules';
import { IN_BROWSER, depricationWarn } from './utils';

import { Options as AppOptions } from './app';
import { Options as ExceptionOptions } from './modules/exception';
import { Options as ConsoleOptions } from './modules/console';
import { Options as InputOptions } from './modules/input';
import { Options as TimingOptions } from './modules/timing';
export type Options = Partial<
  AppOptions & ConsoleOptions & ExceptionOptions & InputOptions & TimingOptions
> & {
  projectID?: number; // For the back compatibility only (depricated)
  projectKey: string;
  sessionToken?: string;
  respectDoNotTrack?: boolean;
  // dev only
  __DISABLE_SECURE_MODE?: boolean;
};

const DOCS_SETUP = '/installation/setup-or';

function processOptions(obj: any): obj is Options {
  if (obj == null) {
    console.error(`OpenReplay: invalid options argument type. Please, check documentation on https://docs.openreplay.com${ DOCS_SETUP }`);
    return false;
  }
  if (typeof obj.projectKey !== 'string') {
    if (typeof obj.projectKey !== 'number') {
      if (typeof obj.projectID !== 'number') { // Back compatability
        console.error(`OpenReplay: projectKey is missing or wrong type (string is expected). Please, check https://docs.openreplay.com${ DOCS_SETUP } for more information.`)
        return false 
      } else {
        obj.projectKey = obj.projectID.toString();
        depricationWarn("`projectID` option", "`projectKey` option", DOCS_SETUP)
      }
    } else {
      console.warn("OpenReplay: projectKey is expected to have a string type.")
      obj.projectKey = obj.projectKey.toString()
    }
  }
  if (typeof obj.sessionToken !== 'string' && obj.sessionToken != null) {
    console.warn(`OpenReplay: invalid options argument type. Please, check documentation on https://docs.openreplay.com${ DOCS_SETUP }`)
  }
  return true;
}

export default class API {
  private readonly app: App | null = null;
  constructor(options: Options) {
    if (!IN_BROWSER || !processOptions(options)) {
      return;
    }
    if (!options.__DISABLE_SECURE_MODE && location.protocol !== 'https:') {
      console.error("OpenReplay: Your website must be publicly accessible and running on SSL in order for OpenReplay to properly capture and replay the user session.")
      return;
    }
    const doNotTrack = options.respectDoNotTrack && (navigator.doNotTrack == '1' || window.doNotTrack == '1');
    this.app = doNotTrack ||
      !('Map' in window) ||
      !('Set' in window) ||
      !('MutationObserver' in window) ||
      !('performance' in window) ||
      !('timing' in performance) ||
      !('startsWith' in String.prototype) ||
      !('Blob' in window) ||
      !('Worker' in window)
        ? null
        : new App(options.projectKey, options.sessionToken, options);
    if (this.app !== null) {
      Connection(this.app);
      Console(this.app, options);
      Exception(this.app, options);
      Img(this.app);
      Input(this.app, options);
      Mouse(this.app);
      Timing(this.app, options);
      Performance(this.app);
      Scroll(this.app);
      Viewport(this.app);
      Longtasks(this.app);
      CSSRules(this.app);
      (window as any).__OPENREPLAY__ = (window as any).__OPENREPLAY__ || this;
    } else {
      console.log("OpenReplay: broeser doesn't support API required for tracking.")
      const req = new XMLHttpRequest();
      const orig = options.ingestPoint || DEFAULT_INGEST_POINT;
      req.open("POST", orig + "/v1/web/not-started");
      // no-cors issue only with text/plain or not-set Content-Type
      // req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      req.send(JSON.stringify({
        trackerVersion: 'TRACKER_VERSION',
        projectKey: options.projectKey,
        doNotTrack,
        // TODO: add precise reason (an exact API missing)
      }));
    }
  }

  use<T>(fn: (app: App | null) => T): T {
    return fn(this.app);
  }

  isActive(): boolean {
    if (this.app === null) {
      return false;
    }
    return this.app.active();
  }
  active(): boolean {
    depricationWarn("'active' method", "'isActive' method", "/")
    return this.isActive();
  }

  start(): void {
    if (!IN_BROWSER) {
      console.error(`OpenReplay: you are trying to start Tracker on a node.js environment. If you want to use OpenReplay with SSR, please, use componentDidMount or useEffect API for placing the \`tracker.start()\` line. Check documentation on https://docs.openreplay.com${ DOCS_SETUP }`)
      return;
    }
    if (this.app === null) {
      return;
    }
    this.app.start();
  }
  stop(): void {
    if (this.app === null) {
      return;
    }
    this.app.stop();
  }

  getSessionToken(): string | null | undefined {
    if (this.app === null) {
      return null;
    }
    return this.app.getSessionToken();
  }
  sessionID(): string | null | undefined {
    depricationWarn("'sessionID' method", "'getSessionToken' method", "/")
    return this.getSessionToken();
  }

  setUserID(id: string): void {
    if (typeof id === 'string' && this.app !== null) {
      this.app.send(new UserID(id));
    }
  }
  userID(id: string): void {
    depricationWarn("'userID' method", "'setUserID' method", "/");
    this.setUserID(id);
  }

  setUserAnonymousID(id: string): void {
    if (typeof id === 'string' && this.app !== null) {
      this.app.send(new UserAnonymousID(id));
    }
  }
  userAnonymousID(id: string): void {
    depricationWarn("'userAnonymousID' method", "'setUserAnonymousID' method", "/")
    this.setUserAnonymousID(id);
  }

  setMetadata(key: string, value: string): void {
    if (
      typeof key === 'string' &&
      typeof value === 'string' &&
      this.app !== null
    ) {
      this.app.send(new Metadata(key, value));
    }
  }
  metadata(key: string, value: string): void {
    depricationWarn("'metadata' method", "'setMetadata' method", "/")
    this.setMetadata(key, value);
  }

  event(key: string, payload: any, issue: boolean = false): void {
    if (typeof key === 'string' && this.app !== null) {
      if (issue) {
        return this.issue(key, payload);
      } else {
        try {
          payload = JSON.stringify(payload);
        } catch (e) {
          return;
        }
        this.app.send(new RawCustomEvent(key, payload));
      }
    }
  }

  issue(key: string, payload: any): void {
    if (typeof key === 'string' && this.app !== null) {
      try {
        payload = JSON.stringify(payload);
      } catch (e) {
        return;
      }
      this.app.send(new CustomIssue(key, payload));
    }
  }

  handleError = (e: Error) => {
    if (e instanceof Error && this.app !== null) {
      this.app.send(getExceptionMessage(e, []));
    }
  }

  handleErrorEvent = (e: ErrorEvent | PromiseRejectionEvent) => {
    if (
      (e instanceof ErrorEvent || 
        ('PromiseRejectionEvent' in window && e instanceof PromiseRejectionEvent)
      ) &&
      this.app !== null
    ) {
      const msg = getExceptionMessageFromEvent(e);
      if (msg != null) {
        this.app.send(msg);
      }
    }
  }
}
