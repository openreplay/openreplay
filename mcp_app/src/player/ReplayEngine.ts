import Screen from '@openreplay/player/web/Screen/Screen';
import PagesManager from '@openreplay/player/web/managers/PagesManager';
import ListWalker from '@openreplay/player/common/ListWalker';
import rewriteMessage from '@openreplay/player/web/messages/rewriter/rewriteMessage';
import type { Message, MouseMove, MouseClick, SetViewportScroll, SetViewportSize } from '@openreplay/player/web/messages';
import { MType } from '@openreplay/player/web/messages';

export interface SkipInterval {
  start: number;
  end: number;
}

export interface PlaybackState {
  time: number;
  playing: boolean;
  completed: boolean;
  endTime: number;
  ready: boolean;
  speed: number;
  skipInactivity: boolean;
  skipIntervals: SkipInterval[];
}

const DOM_MESSAGE_TYPES = new Set([
  MType.CreateDocument,
  MType.CreateElementNode,
  MType.CreateTextNode,
  MType.MoveNode,
  MType.RemoveNode,
  MType.SetNodeAttribute,
  MType.RemoveNodeAttribute,
  MType.SetNodeData,
  MType.SetCssData,
  MType.SetNodeScroll,
  MType.SetInputValue,
  MType.SetInputChecked,
  MType.SetNodeFocus,
  MType.SelectionChange,
  MType.CreateIFrameDocument,
  MType.AdoptedSsReplace,
  MType.AdoptedSsInsertRule,
  MType.AdoptedSsDeleteRule,
  MType.AdoptedSsAddOwner,
  MType.AdoptedSsRemoveOwner,
  MType.LoadFontFace,
  MType.SetNodeSlot,
  MType.NodeAnimationResult,
  MType.StringDict,
  MType.StringDictGlobal,
  MType.StringDictDeprecated,
  MType.SetNodeAttributeDict,
  MType.SetNodeAttributeDictGlobal,
  MType.SetNodeAttributeDictDeprecated,
  // URLBased variants get rewritten to their non-URL counterparts
  MType.SetNodeAttributeURLBased,
  MType.SetCssDataURLBased,
  MType.AdoptedSsInsertRuleURLBased,
  MType.AdoptedSsReplaceURLBased,
]);

export type CssProxyFn = (url: string) => Promise<string | null>;

export default class ReplayEngine {
  private screen: Screen;
  private pagesManager: PagesManager;
  private mouseWalker = new ListWalker<MouseMove>();
  private clickWalker = new ListWalker<MouseClick>();
  private scrollWalker = new ListWalker<SetViewportScroll>();
  private resizeWalker = new ListWalker<SetViewportSize>();

  private time = 0;
  private playing = false;
  private completed = false;
  private endTime = 0;
  private speed = 1;
  private skipInactivity = false;
  private skipIntervals: SkipInterval[] = [];
  private animFrameId = 0;
  private ready = false;
  private cssLoading = false;

  // CSS proxy for sandbox — fetches external stylesheets via server
  private cssProxyFn: CssProxyFn | null = null;
  private proxiedCss = new Map<string, string>(); // href -> CSS content
  private lastProxiedDoc: Document | null = null;

  private onStateChange: (state: PlaybackState) => void;

  constructor(opts: { onStateChange: (s: PlaybackState) => void }) {
    this.onStateChange = opts.onStateChange;
    this.screen = new Screen(false);
    this.pagesManager = new PagesManager(
      this.screen,
      false,
      (flag: boolean) => {
        this.cssLoading = flag;
      },
      () => {},
    );
  }

  setCssProxy(fn: CssProxyFn) {
    this.cssProxyFn = fn;
  }

  loadMessages(messages: Message[], duration: number) {
    for (const rawMsg of messages) {
      const msg = rewriteMessage(rawMsg) as Message;

      if (msg.tp === MType.MouseMove) {
        this.mouseWalker.append(msg as MouseMove);
      } else if (msg.tp === MType.MouseClick || msg.tp === MType.MouseClickDeprecated) {
        this.clickWalker.append(msg as MouseClick);
      } else if (msg.tp === MType.SetViewportScroll) {
        this.scrollWalker.append(msg as SetViewportScroll);
      } else if (msg.tp === MType.SetViewportSize) {
        this.resizeWalker.append(msg as SetViewportSize);
      }

      // DOM messages go to pagesManager
      if (DOM_MESSAGE_TYPES.has(msg.tp)) {
        this.pagesManager.appendMessage(msg);
      }
    }

    this.endTime = duration;
    this.skipIntervals = this.computeSkipIntervals(messages, duration);
    this.ready = true;
    this.emitState();
  }

  attach(parent: HTMLElement) {
    this.screen.attach(parent);
  }

  play() {
    if (this.completed) {
      this.jump(0);
      this.completed = false;
    }

    if (!this.ready) return;
    cancelAnimationFrame(this.animFrameId);
    this.playing = true;
    this.emitState();
    this.startAnimation();
  }

  pause() {
    cancelAnimationFrame(this.animFrameId);
    this.playing = false;
    this.emitState();
  }

  togglePlay() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  jump(time: number) {
    this.time = Math.max(0, Math.min(time, this.endTime));
    this.completed = false;
    this.move(this.time);
    this.emitState();

    if (this.playing) {
      cancelAnimationFrame(this.animFrameId);
      this.startAnimation();
    }
  }

  setSpeed(speed: number) {
    this.speed = speed;
    this.emitState();
  }

  toggleSkipInactivity() {
    this.skipInactivity = !this.skipInactivity;
    this.emitState();
  }

  clean() {
    cancelAnimationFrame(this.animFrameId);
    this.screen.clean();
  }

  getState(): PlaybackState {
    return {
      time: this.time,
      playing: this.playing,
      completed: this.completed,
      endTime: this.endTime,
      ready: this.ready,
      speed: this.speed,
      skipInactivity: this.skipInactivity,
      skipIntervals: this.skipIntervals,
    };
  }

  private emitState() {
    this.onStateChange(this.getState());
  }

  private startAnimation() {
    let prevAnimTime = performance.now();

    const frameHandler = (animCurrentTime: number) => {
      const diffTime = Math.max(animCurrentTime - prevAnimTime, 0) * this.speed;
      let newTime = this.time + diffTime;
      prevAnimTime = animCurrentTime;

      // Skip inactivity — jump past inactive intervals
      if (this.skipInactivity) {
        const interval = this.skipIntervals.find(
          (si) => newTime > si.start && newTime < si.end,
        );
        if (interval) newTime = interval.end;
      }

      if (newTime >= this.endTime) {
        newTime = this.endTime;
        this.time = newTime;
        this.move(newTime);
        this.playing = false;
        this.completed = true;
        this.emitState();
        return;
      }

      this.time = newTime;
      this.move(newTime);
      this.emitState();
      this.animFrameId = requestAnimationFrame(frameHandler);
    };

    this.animFrameId = requestAnimationFrame(frameHandler);
  }

  /**
   * Detect gaps in activity longer than 10% of session duration.
   * Mirrors ActivityManager from the main player.
   */
  private computeSkipIntervals(messages: Message[], duration: number): SkipInterval[] {
    const minGap = duration * 0.1;
    const intervals: SkipInterval[] = [];
    let lastActivity = 0;

    for (const msg of messages) {
      if (DOM_MESSAGE_TYPES.has(msg.tp) || msg.tp === MType.MouseMove || msg.tp === MType.MouseClick) {
        const t = (msg as any).time ?? 0;
        if (t - lastActivity >= minGap) {
          intervals.push({ start: lastActivity, end: t });
        }
        lastActivity = t;
      }
    }
    if (duration - lastActivity >= minGap) {
      intervals.push({ start: lastActivity, end: duration });
    }
    return intervals;
  }

  private move(t: number) {
    // Apply DOM mutations
    this.pagesManager.moveReady(t);

    // Move cursor
    const mouseMsg = this.mouseWalker.moveGetLast(t);
    if (mouseMsg) {
      this.screen.cursor.move({ x: mouseMsg.x, y: mouseMsg.y });
    }

    // Handle clicks
    const clickMsg = this.clickWalker.moveGetLast(t);
    if (clickMsg) {
      this.screen.cursor.click();
    }

    // Viewport scroll
    const scrollMsg = this.scrollWalker.moveGetLast(t);
    if (scrollMsg) {
      this.screen.window?.scrollTo(scrollMsg.x, scrollMsg.y);
    }

    // Viewport resize
    const resizeMsg = this.resizeWalker.moveGetLast(t);
    if (resizeMsg) {
      this.screen.scale({ width: resizeMsg.width, height: resizeMsg.height });
    }

    // Proxy external stylesheets (async, fire-and-forget)
    this.proxyNewStylesheets();
  }

  /**
   * Scan the iframe document for <link rel="stylesheet"> tags that haven't
   * been proxied yet. Uses adoptedStyleSheets to inject CSS WITHOUT modifying
   * the DOM tree (which would break VirtualDOM reconciliation).
   */
  private proxyNewStylesheets() {
    if (!this.cssProxyFn) return;
    const doc = this.screen.document;
    if (!doc) return;

    // When the document changes (page navigation), re-apply cached stylesheets
    if (doc !== this.lastProxiedDoc) {
      this.lastProxiedDoc = doc;
      this.reapplyAdoptedStylesheets(doc);
    }

    const links = doc.querySelectorAll('link[rel="stylesheet"]');
    if (links.length === 0) return;

    const fetcher = this.cssProxyFn;
    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href || this.proxiedCss.has(href)) continue;
      // Mark as in-progress immediately to avoid double-fetching
      this.proxiedCss.set(href, '');

      // Fire-and-forget async fetch — doesn't block animation loop
      (async () => {
        try {
          const css = await fetcher(href);
          if (css) {
            const processed = css
              .replace(/:hover/g, '.-openreplay-hover')
              .replace(/:focus/g, '.-openreplay-focus');
            this.proxiedCss.set(href, processed);
            this.applyAdoptedStylesheet(doc, processed);
          }
        } catch {
          // CSS proxy fetch failed — non-critical, skip
        }
      })();
    }
  }

  /** Apply a single stylesheet via adoptedStyleSheets (no DOM modification) */
  private applyAdoptedStylesheet(doc: Document, css: string) {
    try {
      const win = doc.defaultView;
      if (!win) return;
      const sheet = new win.CSSStyleSheet();
      sheet.replaceSync(css);
      doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
    } catch {
      // adoptedStyleSheets not supported or doc detached
    }
  }

  /** Re-apply all cached stylesheets to a new document (after page change) */
  private reapplyAdoptedStylesheets(doc: Document) {
    for (const [, css] of this.proxiedCss) {
      if (css) {
        this.applyAdoptedStylesheet(doc, css);
      }
    }
  }
}
