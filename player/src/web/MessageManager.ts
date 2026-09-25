// @ts-ignore
import { Decoder } from 'syncod';
import logger from '../logger';
import { VIRTUAL_MODE_KEY } from '../constants';
import type { Store, ILog, SessionFilesInfo } from '../index';
import TabSessionManager, { TabState } from './TabManager';
import ActiveTabManager from './managers/ActiveTabManager';
import ListWalker from '../common/ListWalker';
import { INACTIVITY_SETTING_KEY as inactivitySettingKey } from '../constants';

import MouseMoveManager from './managers/MouseMoveManager';

import ActivityManager from './managers/ActivityManager';
import TabClosingManager from './managers/TabClosingManager';
import MessageTabSourceManager from './managers/MessageTabSourceManager';

import { MouseThrashing, MType, MouseClick, Message } from './messages';

import Screen, {
  INITIAL_STATE as SCREEN_INITIAL_STATE,
  State as ScreenState,
} from './Screen/Screen';

import type { InitialLists } from './Lists';
import type { SkipInterval } from './managers/ActivityManager';

import HookManager from './managers/HookManager';
import ConnectionManager from './managers/ConnectionManager';
import { parseSanitizedSvg } from './managers/DOM/sanitize';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SPRITE_MARKER = '_$OPENREPLAY_SPRITE$_';

interface RawList {
  event: Record<string, any>[] & { tabId: string | null };
  frustrations: Record<string, any>[] & { tabId: string | null };
  stack: Record<string, any>[] & { tabId: string | null };
  exceptions: ILog[];
}

type TabChangeEvent = {
  tabId: string;
  timestamp: number;
  tabName: string;
  time: number;
  toTab: string;
  fromTab: string;
  type: string;
  activeUrl: '';
};

export interface State extends ScreenState {
  skipIntervals: SkipInterval[];
  eventCount: number;
  location?: string;
  tabStates: {
    [tabId: string]: TabState;
  };
  tabNames: {
    [tabId: string]: string;
  };

  domContentLoadedTime?: { time: number; value: number };
  domBuildingTime?: number;
  loadTime?: { time: number; value: number };
  error: boolean;
  messagesLoading: boolean;

  ready: boolean;
  lastMessageTime: number;
  firstVisualEvent: number;
  messagesProcessed: boolean;
  currentTab: string;
  tabs: Set<string>;
  tabChangeEvents: TabChangeEvent[];
  closedTabs: string[];
  sessionStart: number;
  vModeBadge: boolean;
  /** from 0 to 4 */
  connectionQuality: number;
}

export const visualChanges = [
  MType.MouseMove,
  MType.MouseClickDeprecated,
  MType.MouseClick,
  MType.CreateElementNode,
  MType.SetInputValue,
  MType.SetInputChecked,
  MType.SetViewportSize,
  MType.SetViewportScroll,
];

export const userOnlyChanges = [
  MType.MouseClick,
  MType.MouseClickDeprecated,
  MType.MouseMove,
  MType.SetInputChecked,
  MType.SetInputValue,
  MType.SetViewportSize,
  MType.SetViewportScroll,
];

const visualChangesSet = new Set<number>(visualChanges);
const HOOK_TYPES = [
  { tp: MType.SetPageLocation, name: 'LOCATION', attrKey: 'url' },
  { tp: MType.SetPageLocationDeprecated, name: 'LOCATION', attrKey: 'url' },
];
const userOnlyChangesSet = new Set<number>(userOnlyChanges);

export default class MessageManager {
  static INITIAL_STATE: State = {
    ...SCREEN_INITIAL_STATE,
    tabStates: {},
    eventCount: 0,
    skipIntervals: [],
    error: false,
    ready: false,
    lastMessageTime: 0,
    firstVisualEvent: 0,
    messagesProcessed: false,
    messagesLoading: false,
    currentTab: '',
    tabs: new Set(),
    tabChangeEvents: [],
    closedTabs: [],
    sessionStart: 0,
    tabNames: {},
    vModeBadge: false,
    connectionQuality: 4,
  };

  private clickManager: ListWalker<MouseClick> = new ListWalker();
  private lastSelectClickTime = -1;
  private highlightClickHasTarget = false;
  private onClickPause?: (ms: number) => void;
  private mouseThrashingManager: ListWalker<MouseThrashing> = new ListWalker();
  private activityManager: ActivityManager | null = null;
  private mouseMoveManager: MouseMoveManager;
  private activeTabManager = new ActiveTabManager();
  private tabCloseManager = new TabClosingManager();
  public readonly decoder = new Decoder();
  private sessionStart: number;
  private lastMessageTime: number = 0;
  private firstVisualEventSet = false;
  public readonly tabs: Record<string, TabSessionManager> = {};
  private connectionInfoManger = new ConnectionManager();
  private tabsAmount = 0;

  private tabChangeEvents: TabChangeEvent[] = [];
  private activeTab = '';
  private ignoreDomOnInactivity = false;

  private hookManager = new HookManager();
  public messageTabSourceManager = new MessageTabSourceManager();
  private lastMessageTimeScheduled = false;
  /** All session files are in (or loading failed): stop guessing whether more data is coming. */
  private allFilesLoaded = false;
  private loadingByHeuristic = false;

  constructor(
    private session: SessionFilesInfo,
    private readonly state: Store<State & { time: number }>,
    private readonly screen: Screen,
    private readonly initialLists?: Partial<InitialLists>,
    private readonly uiErrorHandler?: { error: (error: string) => void },
  ) {
    this.mouseMoveManager = new MouseMoveManager(screen);
    this.sessionStart = this.session.startedAt;
    state.update({ sessionStart: this.sessionStart });
    this.activityManager = new ActivityManager(
      this.session.duration.milliseconds,
    ); // only if not-live

    const vMode = localStorage.getItem(VIRTUAL_MODE_KEY);
    if (vMode === 'true') {
      this.setVirtualMode(true);
    }

    const inactivitySetting = localStorage.getItem(inactivitySettingKey);
    if (inactivitySetting === 'true') {
      this.ignoreDomOnInactivity = true;
    }

    this.hookManager.setTypes(HOOK_TYPES);
  }

  private virtualMode = false;
  public setVirtualMode = (virtualMode: boolean) => {
    this.virtualMode = virtualMode;
    Object.values(this.tabs).forEach((tab) => tab.setVirtualMode(virtualMode));
  };

  public getListsFullState = () => {
    const firstTab = Object.values(this.tabs)[0];
    return firstTab ? firstTab.getListsFullState() : {};
  };

  public injectSpriteMap = (spriteEl: SVGElement) => {
    Object.values(this.tabs).forEach((tab) => {
      tab.injectSpriteMap(spriteEl);
    });
  };

  public setSession = (session: SessionFilesInfo) => {
    this.session = session;
    this.sessionStart = this.session.startedAt;
    this.state.update({ sessionStart: this.sessionStart });
    Object.values(this.tabs).forEach((tab) => tab.setSession(session));
  };

  public updateLists(lists: RawList) {
    // session-level lists are shared by every tab (stored once per session in the db)
    let eventCount = 0;
    Object.values(this.tabs).forEach((tab) => {
      eventCount = Math.max(eventCount, tab.updateLists(lists));
    });
    this.state.update({ eventCount });
  }

  /**
   * Legacy code. Iterates over all tab managers and sorts messages for their pagesManager.
   * Ensures that RemoveNode messages with parent being <HEAD> are sorted before other RemoveNode messages.
   * */
  public sortDomRemoveMessages = (msgs: Message[]) => {
    Object.values(this.tabs).forEach((tab) => tab.sortDomRemoveMessages(msgs));
  };

  private waitingForFiles: boolean = false;

  public onFileReadSuccess = () => {
    this.markAllFilesLoaded();
    if (this.activityManager) {
      this.activityManager.end();
      this.state.update({ skipIntervals: this.activityManager.list });
    }

    Object.values(this.tabs).forEach((tab) => tab.onFileReadSuccess?.());

    this.updateSpriteMap();
  };

  public updateSpriteMap = () => {
    if (this.spriteMapSvg) {
      this.injectSpriteMap(this.spriteMapSvg);
    }
  };

  public onFileReadFailed = (...e: any[]) => {
    this.markAllFilesLoaded();
    logger.error(e);
    this.state.update({ error: true });
    this.uiErrorHandler?.error('Error requesting a session file');
  };

  public onFileReadFinally = () => {
    this.waitingForFiles = false;
    this.setMessagesLoading(false);
    this.state.update({ messagesProcessed: true });
  };

  /**
   * Scan tab managers for last message ts
   * */
  public createTabCloseEvents = () => {
    const lastMsgArr: [string, number][] = [];
    if (this.tabsAmount === 1) {
      return this.tabCloseManager.append({
        tabId: Object.keys(this.tabs)[0],
        time: this.session.durationMs - 100,
      });
    }

    for (const [tabId, tab] of Object.entries(this.tabs)) {
      const { lastMessageTs } = tab;
      if (lastMessageTs && tabId) {
        lastMsgArr.push([tabId, lastMessageTs]);
      }
    }

    lastMsgArr
      .sort((a, b) => a[1] - b[1])
      .forEach(([tabId, lastMessageTs]) => {
        this.tabCloseManager.append({ tabId, time: lastMessageTs });
      });
  };

  private markAllFilesLoaded() {
    this.allFilesLoaded = true;
    if (this.loadingByHeuristic) {
      this.loadingByHeuristic = false;
      this.setMessagesLoading(false);
    }
  }

  public startLoading = () => {
    this.waitingForFiles = true;
    this.allFilesLoaded = false;
    this.state.update({ messagesProcessed: false });
    this.setMessagesLoading(true);
  };

  /** Full reset of every message-derived manager (live time travel re-feeds the whole session). */
  resetMessageManagers() {
    this.clickManager = new ListWalker();
    this.mouseThrashingManager = new ListWalker();
    this.lastSelectClickTime = -1;
    this.screen.selectMenu.hide();
    this.mouseMoveManager.destroy();
    this.mouseMoveManager = new MouseMoveManager(this.screen);
    this.activityManager = new ActivityManager(this.session.durationMs);
    this.activeTabManager = new ActiveTabManager();
    this.tabCloseManager = new TabClosingManager();
    this.hookManager = new HookManager();
    this.hookManager.setTypes(HOOK_TYPES);
    this.connectionInfoManger.reset();
    this.tabChangeEvents = [];
    this.lastT = 0;

    Object.values(this.tabs).forEach((tab) => tab.resetMessageManagers());
  }

  lastT = 0;
  move(t: number): any {
    // usually means waiting for messages from live session
    if (Object.keys(this.tabs).length === 0) return;
    const isRewind = t < this.lastT;
    this.lastT = t;
    if (isRewind) {
      const inactive = Object.values(this.tabs).filter(
        (tab) => tab.firstMessageTs > t,
      );
      inactive.forEach((tab) => tab.resetToStart());
      this.mouseMoveManager.clearTrail();
      this.lastSelectClickTime = -1;
    }
    const tabId = this.activeTabManager.moveReady(t);
    const newState: Record<string, any> = {};
    const closeMessage = this.tabCloseManager.moveReady(t);
    if (closeMessage) {
      const { closedTabs } = this.tabCloseManager;
      if (closedTabs.size === this.tabsAmount) {
        if (this.session.durationMs - t < 250) {
          newState['closedTabs'] = Array.from(closedTabs);
        }
      } else {
        newState['closedTabs'] = Array.from(closedTabs);
      }
    }
    // Moving mouse and setting :hover classes on ready view
    this.mouseMoveManager.move(t);
    const lastClick = this.clickManager.moveGetLast(t);
    // getting clicks happened during last 600ms
    if (!!lastClick && t - lastClick.time < 600) {
      const highlight = this.screen.cursor.highlightMode;
      // Fire once per click: a native <select> picker can't be reopened during
      // replay (needs a user gesture), so approximate it with a synthetic list.
      if (lastClick.time !== this.lastSelectClickTime) {
        this.lastSelectClickTime = lastClick.time;
        const clickedNode = this.getNode(lastClick.id)?.node;
        this.screen.showSelectMenu(clickedNode);
        if (highlight) {
          const target =
            this.screen.getElementFromInternalPoint(
              this.screen.cursor.position,
            ) ?? clickedNode;
          this.highlightClickHasTarget = !!target;
          this.screen.highlightClick(target);
          // Hold the replay briefly so the highlighted click is unmistakable.
          this.onClickPause?.(750);
        }
      }
      // In highlight mode the brackets mark the click, so the cursor ring is
      // only drawn as a fallback when no element could be resolved.
      this.screen.cursor.click(!highlight || !this.highlightClickHasTarget);
    }
    const lastThrashing = this.mouseThrashingManager.moveGetLast(t);
    if (!!lastThrashing && t - lastThrashing.time < 300) {
      this.screen.cursor.shake();
    }
    if (!this.activeTab) {
      this.activeTab =
        this.state.get().currentTab || Object.keys(this.tabs)[0];
    }

    const connectionQuality = this.connectionInfoManger.moveReady(t);
    if (connectionQuality !== null) {
      newState['connectionQuality'] = connectionQuality;
    }
    if (tabId) {
      if (this.activeTab !== tabId) {
        newState['currentTab'] = tabId;
        this.activeTab = tabId;
        this.tabs[this.activeTab].clean();
      }
      const activeTabs = this.state.get().tabs;
      if (activeTabs.size !== this.activeTabManager.tabInstances.size) {
        newState['tabs'] = this.activeTabManager.tabInstances;
      }
    }
    if (Object.keys(newState).length > 0) {
      this.state.update(newState);
    }
    if (this.tabs[this.activeTab]) {
      this.tabs[this.activeTab].move(t);
    } else {
      console.error('missing tab state', this.activeTab, tabId);
    }
    this.hookManager.moveReady(t);

    // first file is 15 secs usually; being past the last loaded message while
    // the rest is still downloading means we should wait for it
    const waitingForData =
      !this.allFilesLoaded &&
      this.lastMessageTime <= t &&
      t < this.session.durationMs &&
      t < 15000;
    if (this.waitingForFiles || waitingForData) {
      this.loadingByHeuristic = !this.waitingForFiles;
      if (!this.state.get().messagesLoading) {
        this.setMessagesLoading(true);
      }
    } else if (this.loadingByHeuristic) {
      this.loadingByHeuristic = false;
      this.setMessagesLoading(false);
    }
  }

  public getNode(id: number) {
    return this.tabs[this.activeTab]?.getNode(id);
  }

  /** Hook to briefly pause playback on a highlighted click (timer mode). */
  public setOnClickPause(cb: (ms: number) => void) {
    this.onClickPause = cb;
  }

  public changeTab(tabId: string) {
    this.activeTab = tabId;
    this.tabs[tabId].clean();
    this.tabs[tabId].move(this.state.get().time);
    this.state.update({ currentTab: tabId });
  }

  public updateChangeEvents() {
    this.state.update({ tabChangeEvents: this.tabChangeEvents });
  }

  /**
   * Symbols rebuilt from sprite messages. Lives in an inert XML document: recorded
   * markup must never be parsed into the (live) player document.
   */
  spriteMapSvg: SVGElement | null = null;
  private spriteIds: Record<string, string> = {};
  private spriteCounter = 0;

  private createSpriteMap(): SVGElement {
    if (!this.spriteMapSvg) {
      const spriteDoc = document.implementation.createDocument(
        SVG_NS,
        'svg',
        null,
      );
      this.spriteMapSvg = spriteDoc.documentElement as unknown as SVGElement;
      this.spriteMapSvg.setAttribute('style', 'display: none;');
      this.spriteMapSvg.setAttribute('id', 'reconstructed-sprite');
    }
    return this.spriteMapSvg;
  }

  /** Rewrites a sprite attribute to `#<symbol id>` and stores the sanitized symbol. */
  private handleSprite(msg: { value: string }) {
    const svgData = msg.value.split(SPRITE_MARKER)[1] ?? '';
    const knownId = this.spriteIds[svgData];
    if (knownId) {
      msg.value = knownId;
      return;
    }
    const svg = parseSanitizedSvg(svgData);
    if (!svg) {
      return;
    }
    const spriteMap = this.createSpriteMap();
    const symbol = spriteMap.ownerDocument.createElementNS(SVG_NS, 'symbol');
    // node ids restart on every page, so they can't identify a symbol
    const symbolId = `__or_sprite_${++this.spriteCounter}`;
    symbol.setAttribute('id', symbolId);
    symbol.setAttribute('viewBox', svg.getAttribute('viewBox') || '0 0 24 24');
    while (svg.firstChild) {
      symbol.appendChild(svg.firstChild);
    }
    spriteMap.appendChild(symbol);
    msg.value = `#${symbolId}`;
    this.spriteIds[svgData] = msg.value;
  }

  private publishLastMessageTime = () => {
    this.lastMessageTimeScheduled = false;
    this.state.update({ lastMessageTime: this.lastMessageTime });
  };

  distributeMessage = (msg: Message & { tabId: string }): void => {
    if (msg.time > this.lastMessageTime) {
      this.lastMessageTime = msg.time;
      // one store update per distributed batch instead of one per message
      if (!this.lastMessageTimeScheduled) {
        this.lastMessageTimeScheduled = true;
        queueMicrotask(this.publishLastMessageTime);
      }
    }
    // @ts-ignore placeholder msg for timestamps
    if (msg.tp === 9999) return;
    this.hookManager.append(msg);
    if (
      msg.tp === MType.SetNodeAttribute &&
      msg.value.includes(SPRITE_MARKER)
    ) {
      this.handleSprite(msg);
    }
    if (!this.tabs[msg.tabId]) {
      this.tabsAmount++;
      this.state.update({
        tabStates: {
          ...this.state.get().tabStates,
          [msg.tabId]: TabSessionManager.INITIAL_STATE,
        },
      });
      this.tabs[msg.tabId] = new TabSessionManager(
        this.session,
        this.state,
        this.screen,
        msg.tabId,
        this.setSize,
        this.sessionStart,
        this.initialLists,
      );
      if (this.virtualMode) {
        this.tabs[msg.tabId].setVirtualMode(this.virtualMode);
      }
    }

    const activityMessages = this.ignoreDomOnInactivity
      ? userOnlyChangesSet
      : visualChangesSet;
    if (activityMessages.has(msg.tp)) {
      this.activityManager?.updateAcctivity(msg.time);
    }
    switch (msg.tp) {
      case MType.ConnectionInformation:
        this.connectionInfoManger.append(msg);
        break;
      case MType.TabChange:
        const prevChange = this.activeTabManager.last;
        if (!prevChange || prevChange.tabId !== msg.tabId) {
          const tabMap = mapTabs(this.tabs);
          this.tabChangeEvents.push({
            tabId: msg.tabId,
            time: msg.time,
            tabName: prevChange?.tabId ? tabMap[prevChange.tabId] : '',
            timestamp: this.sessionStart + msg.time,
            toTab: tabMap[msg.tabId],
            fromTab: prevChange?.tabId ? tabMap[prevChange.tabId] : '',
            type: 'TABCHANGE',
            activeUrl: '',
          });
          this.activeTabManager.append(msg);
        }
        break;
      case MType.MouseThrashing:
        this.mouseThrashingManager.append(msg);
        break;
      case MType.MouseMove:
        if (this.tabs[msg.tabId].lastMessageTs < msg.time) {
          this.tabs[msg.tabId].lastMessageTs = msg.time;
        }
        this.mouseMoveManager.append(msg);
        break;
      case MType.MouseClickDeprecated:
      case MType.MouseClick:
        this.clickManager.append(msg);
        break;
      default:
        switch (msg.tp) {
          case MType.CreateDocument:
            if (!this.firstVisualEventSet) {
              this.activeTabManager.unshift({
                tp: MType.TabChange,
                tabId: msg.tabId,
                time: 0,
              });
              this.state.update({
                firstVisualEvent: msg.time,
                currentTab: msg.tabId,
                tabs: new Set([msg.tabId]),
              });
              this.firstVisualEventSet = true;
            }
        }
        this.tabs[msg.tabId].distributeMessage(msg);
        break;
    }
  };

  setMessagesLoading = (messagesLoading: boolean) => {
    if (!messagesLoading) {
      this.updateChangeEvents();
    }
    this.screen.display(!messagesLoading);
    const cssLoading = Object.values(this.state.get().tabStates).some(
      (tab) => tab.cssLoading,
    );
    const isReady = !messagesLoading && !cssLoading;
    this.state.update({ messagesLoading, ready: isReady });
  };

  decodeMessage(msg: Message) {
    return this.tabs[this.activeTab].decodeMessage(msg);
  }

  private setSize({ height, width }: { height: number; width: number }) {
    this.screen.scale({ height, width });
    this.state.update({ width, height });
  }

  clean() {
    this.mouseMoveManager.destroy();
    Object.values(this.tabs).forEach((tab) => tab.destroy());
    this.state.update(MessageManager.INITIAL_STATE);
  }
}

function mapTabs(tabs: Record<string, TabSessionManager>) {
  const tabIds = Object.keys(tabs);
  const tabMap: Record<string, string> = {};
  tabIds.forEach((tabId) => {
    tabMap[tabId] = `Tab ${tabIds.indexOf(tabId) + 1}`;
  });

  return tabMap;
}
