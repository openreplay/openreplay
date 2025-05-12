// @ts-ignore
import { Decoder } from 'syncod';
import logger from 'App/logger';
import { VIRTUAL_MODE_KEY } from '@/constants/storageKeys';
import type { Store, ILog, SessionFilesInfo } from 'Player';
import TabSessionManager, { TabState } from 'Player/web/TabManager';
import ActiveTabManager from 'Player/web/managers/ActiveTabManager';
import ListWalker from '../common/ListWalker';

import MouseMoveManager from './managers/MouseMoveManager';

import ActivityManager from './managers/ActivityManager';
import TabClosingManager from './managers/TabClosingManager';

import { MouseThrashing, MType } from './messages';
import type { Message, MouseClick } from './messages';

import Screen, {
  INITIAL_STATE as SCREEN_INITIAL_STATE,
  State as ScreenState,
} from './Screen/Screen';

import type { InitialLists } from './Lists';
import type { SkipInterval } from './managers/ActivityManager';

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
  connType?: string;
  eventCount: number;
  connBandwidth?: number;
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
}

export const visualChanges = [
  MType.MouseMove,
  MType.MouseClick,
  MType.CreateElementNode,
  MType.SetInputValue,
  MType.SetInputChecked,
  MType.SetViewportSize,
  MType.SetViewportScroll,
];

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
  };

  private clickManager: ListWalker<MouseClick> = new ListWalker();

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

  private tabsAmount = 0;

  private tabChangeEvents: TabChangeEvent[] = [];
  private activeTab = '';

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
  }

  private virtualMode = false;
  public setVirtualMode = (virtualMode: boolean) => {
    this.virtualMode = virtualMode;
    Object.values(this.tabs).forEach((tab) => tab.setVirtualMode(virtualMode));
  };

  public getListsFullState = () => {
    const fullState: Record<string, any> = {};
    for (const tab in Object.keys(this.tabs)) {
      fullState[tab] = this.tabs[tab].getListsFullState();
    }
    return Object.values(this.tabs)[0].getListsFullState();
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
    Object.keys(this.tabs).forEach((tab) => {
      this.tabs[tab]!.updateLists(lists);
      // once upon a time we wanted to insert events for each tab individually
      // but then evil magician came and said "no, you don't want to do that"
      // because it was bad for database size
      // const list = {
      //   event: lists.event.filter((e) => e.tabId === tab),
      //   frustrations: lists.frustrations.filter((e) => e.tabId === tab),
      //   stack: lists.stack.filter((e) => e.tabId === tab),
      //   exceptions: lists.exceptions.filter((e) => e.tabId === tab),
      // };
      // // saving some microseconds here probably
      // if (Object.values(list).some((l) => l.length > 0)) {
      //   this.tabs[tab]!.updateLists(list);
      // }
    });
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
  }

  public onFileReadFailed = (...e: any[]) => {
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

  public startLoading = () => {
    this.waitingForFiles = true;
    this.state.update({ messagesProcessed: false });
    this.setMessagesLoading(true);
  };

  resetMessageManagers() {
    this.clickManager = new ListWalker();
    this.mouseMoveManager = new MouseMoveManager(this.screen);
    this.activityManager = new ActivityManager(this.session.durationMs);
    this.activeTabManager = new ActiveTabManager();

    Object.values(this.tabs).forEach((tab) => tab.resetMessageManagers());
  }

  move(t: number): any {
    // usually means waiting for messages from live session
    if (Object.keys(this.tabs).length === 0) return;
    this.activeTabManager.moveReady(t).then(async (tabId) => {
      const closeMessage = await this.tabCloseManager.moveReady(t);
      if (closeMessage) {
        const { closedTabs } = this.tabCloseManager;
        if (closedTabs.size === this.tabsAmount) {
          if (this.session.durationMs - t < 250) {
            this.state.update({ closedTabs: Array.from(closedTabs) });
          }
        } else {
          this.state.update({ closedTabs: Array.from(closedTabs) });
        }
      }
      // Moving mouse and setting :hover classes on ready view
      this.mouseMoveManager.move(t);
      const lastClick = this.clickManager.moveGetLast(t);
      // getting clicks happened during last 600ms
      if (!!lastClick && t - lastClick.time < 600) {
        this.screen.cursor.click();
      }
      const lastThrashing = this.mouseThrashingManager.moveGetLast(t);
      if (!!lastThrashing && t - lastThrashing.time < 300) {
        this.screen.cursor.shake();
      }
      if (!this.activeTab) {
        this.activeTab =
          this.state.get().currentTab ?? Object.keys(this.tabs)[0];
      }

      if (tabId) {
        const stateUpdate: { currentTab?: string, tabs?: Set<string> } = {}
        if (this.activeTab !== tabId) {
          stateUpdate['currentTab'] = tabId;
          this.activeTab = tabId;
          this.tabs[this.activeTab].clean();
        }
        const activeTabs = this.state.get().tabs;
        if (activeTabs.size !== this.activeTabManager.tabInstances.size) {
          stateUpdate['tabs'] = this.activeTabManager.tabInstances;
        }
        this.state.update(stateUpdate)
      }

      if (this.tabs[this.activeTab]) {
        this.tabs[this.activeTab].move(t);
      } else {
        // should we add ui error here?
        console.error(
          'missing tab state',
          this.tabs,
          this.activeTab,
          tabId,
          this.activeTabManager.list,
        );
      }
    });
    if (
      this.waitingForFiles ||
      (this.lastMessageTime <= t && t < this.session.durationMs)
    ) {
      this.setMessagesLoading(true);
    }
  }

  public getNode(id: number) {
    return this.tabs[this.activeTab]?.getNode(id);
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

  spriteMapSvg: SVGElement | null = null;
  potentialSpriteMap: Record<string, any> = {};
  domParser: DOMParser | null = null;
  createSpriteMap = () => {
    if (!this.spriteMapSvg) {
      this.domParser = new DOMParser();
      this.spriteMapSvg = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      this.spriteMapSvg.setAttribute('style', 'display: none;');
      this.spriteMapSvg.setAttribute('id', 'reconstructed-sprite');
    }
  };

  distributeMessage = (msg: Message & { tabId: string }): void => {
    // @ts-ignore placeholder msg for timestamps
    if (msg.tp === 9999) return;
    if (msg.tp === MType.SetNodeAttribute) {
      if (msg.value.includes('_$OPENREPLAY_SPRITE$_')) {
        this.createSpriteMap();
        if (!this.domParser) {
          return console.error('DOM parser is not initialized?');
        }
        handleSprites(
          this.potentialSpriteMap,
          this.domParser,
          msg,
          this.spriteMapSvg!,
        );
      }
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

    const lastMessageTime = Math.max(msg.time, this.lastMessageTime);
    this.lastMessageTime = lastMessageTime;
    this.state.update({ lastMessageTime });
    if (visualChanges.includes(msg.tp)) {
      this.activityManager?.updateAcctivity(msg.time);
    }
    switch (msg.tp) {
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

  // TODO: clean managers?
  clean() {
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

function handleSprites(
  potentialSpriteMap: Record<string, any>,
  parser: DOMParser,
  msg: Record<string, any>,
  spriteMapSvg: SVGElement,
) {
  const [_, svgData] = msg.value.split('_$OPENREPLAY_SPRITE$_');
  const potentialSprite = potentialSpriteMap[svgData];
  if (potentialSprite) {
    msg.value = potentialSprite;
  } else {
    const svgDoc = parser.parseFromString(svgData, 'image/svg+xml');
    const originalSvg = svgDoc.querySelector('svg');
    if (originalSvg) {
      const symbol = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'symbol',
      );
      const symbolId = `symbol-${msg.id || `ind-${msg.time}`}`; // Generate an ID if missing
      symbol.setAttribute('id', symbolId);
      symbol.setAttribute(
        'viewBox',
        originalSvg.getAttribute('viewBox') || '0 0 24 24',
      );
      symbol.innerHTML = originalSvg.innerHTML;

      spriteMapSvg.appendChild(symbol);
      msg.value = `#${symbolId}`;
      potentialSpriteMap[svgData] = `#${symbolId}`;
    }
  }
}
