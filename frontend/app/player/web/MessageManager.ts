// @ts-ignore
import { Decoder } from 'syncod';
import logger from 'App/logger';

import type { Store, ILog, SessionFilesInfo } from 'Player';
import ListWalker from '../common/ListWalker';

import MouseMoveManager from './managers/MouseMoveManager';

import ActivityManager from './managers/ActivityManager';

import { MouseThrashing, MType } from './messages';
import type { Message, MouseClick } from './messages';

import Screen, {
  INITIAL_STATE as SCREEN_INITIAL_STATE,
  State as ScreenState,
} from './Screen/Screen';

import type { InitialLists } from './Lists';
import type { SkipInterval } from './managers/ActivityManager';
import TabSessionManager, { TabState } from 'Player/web/TabManager';
import ActiveTabManager from 'Player/web/managers/ActiveTabManager';

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
  sessionStart: number;
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
    sessionStart: 0,
  };

  private clickManager: ListWalker<MouseClick> = new ListWalker();
  private mouseThrashingManager: ListWalker<MouseThrashing> = new ListWalker();
  private activityManager: ActivityManager | null = null;
  private mouseMoveManager: MouseMoveManager;
  private activeTabManager = new ActiveTabManager();

  public readonly decoder = new Decoder();

  private readonly sessionStart: number;
  private lastMessageTime: number = 0;
  private firstVisualEventSet = false;
  public readonly tabs: Record<string, TabSessionManager> = {};
  private tabChangeEvents: TabChangeEvent[] = [];
  private activeTab = '';

  constructor(
    private readonly session: SessionFilesInfo,
    private readonly state: Store<State & { time: number }>,
    private readonly screen: Screen,
    private readonly initialLists?: Partial<InitialLists>,
    private readonly uiErrorHandler?: { error: (error: string) => void }
  ) {
    this.mouseMoveManager = new MouseMoveManager(screen);
    this.sessionStart = this.session.startedAt;
    state.update({ sessionStart: this.sessionStart });
    this.activityManager = new ActivityManager(this.session.duration.milliseconds); // only if not-live
  }

  public getListsFullState = () => {
    const fullState: Record<string, any> = {};
    for (let tab in Object.keys(this.tabs)) {
      fullState[tab] = this.tabs[tab].getListsFullState();
    }
    return Object.values(this.tabs)[0].getListsFullState();
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
  };

  public onFileReadFailed = (...e: any[]) => {
    logger.error(e);
    this.state.update({ error: true });
    this.uiErrorHandler?.error('Error requesting a session file');
  };

  public onFileReadFinally = () => {
    this.waitingForFiles = false;
    this.state.update({ messagesProcessed: true });
  };

  public startLoading = () => {
    this.waitingForFiles = true;
    this.state.update({ messagesProcessed: false });
    this.setMessagesLoading(true);
  };

  resetMessageManagers() {
    this.clickManager = new ListWalker();
    this.mouseMoveManager = new MouseMoveManager(this.screen);
    this.activityManager = new ActivityManager(this.session.duration.milliseconds);
    this.activeTabManager = new ActiveTabManager();

    Object.values(this.tabs).forEach((tab) => tab.resetMessageManagers());
  }

  move(t: number): any {
    // usually means waiting for messages from live session
    if (Object.keys(this.tabs).length === 0) return;
    this.activeTabManager.moveReady(t).then((tabId) => {
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
        this.activeTab = this.state.get().currentTab ?? Object.keys(this.tabs)[0];
      }
      if (tabId) {
        if (this.activeTab !== tabId) {
          this.state.update({ currentTab: tabId });
          this.activeTab = tabId;
          this.tabs[this.activeTab].clean();
        }
        const activeTabs = this.state.get().tabs;
        if (activeTabs.size !== this.activeTabManager.tabInstances.size) {
          this.state.update({ tabs: this.activeTabManager.tabInstances });
        }
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
          this.activeTabManager.list
        );
      }
    });

    if (
      this.waitingForFiles &&
      this.lastMessageTime <= t &&
      t !== this.session.duration.milliseconds
    ) {
      this.setMessagesLoading(true);
    }
  }

  public getNode(id: number) {
    return this.tabs[this.activeTab]?.getNode(id);
  }

  public changeTab(tabId: string) {
    this.activeTab = tabId;
    this.state.update({ currentTab: tabId });
    this.tabs[tabId].clean();
    this.tabs[tabId].move(this.state.get().time);
  }

  public updateChangeEvents() {
    this.state.update({ tabChangeEvents: this.tabChangeEvents });
  }

  distributeMessage = (msg: Message & { tabId: string }): void => {
    if (!this.tabs[msg.tabId]) {
      this.tabs[msg.tabId] = new TabSessionManager(
        this.session,
        this.state,
        this.screen,
        msg.tabId,
        this.setSize,
        this.sessionStart,
        this.initialLists
      );
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
          this.tabChangeEvents.push({
            tabId: msg.tabId,
            time: msg.time,
            tabName: prevChange?.tabId ? mapTabs(this.tabs)[prevChange.tabId] : '',
            timestamp: this.sessionStart + msg.time,
            toTab: mapTabs(this.tabs)[msg.tabId],
            fromTab: prevChange?.tabId ? mapTabs(this.tabs)[prevChange.tabId] : '',
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
        this.mouseMoveManager.append(msg);
        break;
      case MType.MouseClick:
        this.clickManager.append(msg);
        break;
      default:
        switch (msg.tp) {
          case MType.CreateDocument:
            if (!this.firstVisualEventSet) {
              this.activeTabManager.unshift({ tp: MType.TabChange, tabId: msg.tabId, time: 0 });
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
    const cssLoading = Object.values(this.state.get().tabStates).some((tab) => tab.cssLoading);
    const isReady = !messagesLoading && !cssLoading
    this.state.update({ messagesLoading, ready: isReady});
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
