// @ts-ignore
import { Decoder } from "syncod";
import logger from 'App/logger';

import type { Store } from 'Player';
import ListWalker from '../common/ListWalker';

import MouseMoveManager from './managers/MouseMoveManager';

import ActivityManager from './managers/ActivityManager';

import { MouseThrashing, MType } from "./messages";
import type {
  Message,
  MouseClick,
} from './messages';

import Lists from './Lists';

import Screen, {
  INITIAL_STATE as SCREEN_INITIAL_STATE,
  State as ScreenState,
} from './Screen/Screen';

import type { InitialLists } from './Lists'
import type { SkipInterval } from './managers/ActivityManager';
import TabSessionManager, { TabState } from "Player/web/TabManager";
import ActiveTabManager from "Player/web/managers/ActiveTabManager";

export interface State extends ScreenState {
  skipIntervals: SkipInterval[],
  connType?: string,
  connBandwidth?: number,
  location?: string,
  tabStates: {
    [tabId: string]: TabState,
  }

  domContentLoadedTime?:  { time: number, value: number },
  domBuildingTime?: number,
  loadTime?: { time: number, value: number },
  error: boolean,
  messagesLoading: boolean,

  ready: boolean,
  lastMessageTime: number,
  firstVisualEvent: number,
  messagesProcessed: boolean,
  currentTab: string,
  tabs: string[],
}


export const visualChanges = [
  MType.MouseMove,
  MType.MouseClick,
  MType.CreateElementNode,
  MType.SetInputValue,
  MType.SetInputChecked,
  MType.SetViewportSize,
  MType.SetViewportScroll,
]

export default class MessageManager {
  static INITIAL_STATE: State = {
    ...SCREEN_INITIAL_STATE,
    tabStates: {
      '': { ...TabSessionManager.INITIAL_STATE },
    },
    skipIntervals: [],
    error: false,
    ready: false,
    lastMessageTime: 0,
    firstVisualEvent: 0,
    messagesProcessed: false,
    messagesLoading: false,
    currentTab: '',
    tabs: [],
  }

  private clickManager: ListWalker<MouseClick> = new ListWalker();
  private mouseThrashingManager: ListWalker<MouseThrashing> = new ListWalker();
  private activityManager: ActivityManager | null = null;
  private mouseMoveManager: MouseMoveManager;
  private activeTabManager = new ActiveTabManager()

  public readonly decoder = new Decoder();

  private readonly sessionStart: number;
  private lastMessageTime: number = 0;
  private firstVisualEventSet = false;
  public readonly tabs: Record<string, TabSessionManager> = {};
  private activeTab = ''

  constructor(
    private readonly session: Record<string, any>,
    private readonly state: Store<State & { time: number }>,
    private readonly screen: Screen,
    private readonly initialLists?: Partial<InitialLists>,
    private readonly uiErrorHandler?: { error: (error: string) => void, },
  ) {
    this.mouseMoveManager = new MouseMoveManager(screen)
    this.sessionStart = this.session.startedAt
    this.activityManager = new ActivityManager(this.session.duration.milliseconds) // only if not-live
  }

  public getListsFullState = () => {
    // fullstate by tab
    console.log(Object.values(this.tabs)[0].getListsFullState())
    return Object.values(this.tabs)[0].getListsFullState()
  }

  public updateLists(lists: Partial<InitialLists>) {
    // update each tab with tabid from events !!!
    Object.values(this.tabs)[0].updateLists(lists)
  }

  public _sortMessagesHack = (msgs: Message[]) => {
    Object.values(this.tabs).forEach(tab => tab._sortMessagesHack(msgs))
  }

  private waitingForFiles: boolean = false
  public onFileReadSuccess = () => {
    if (this.activityManager) {
      this.activityManager.end()
      this.state.update({ skipIntervals: this.activityManager.list })
    }
  }

  public onFileReadFailed = (e: any) => {
    logger.error(e)
    this.state.update({ error: true })
    this.uiErrorHandler?.error('Error requesting a session file')
  }

  public onFileReadFinally = () => {
    this.waitingForFiles = false
    this.state.update({ messagesProcessed: true })
  }

  public startLoading = () => {
    this.waitingForFiles = true
    this.state.update({ messagesProcessed: false })
    this.setMessagesLoading(true)
  }

  resetMessageManagers() {
    this.clickManager = new ListWalker();
    this.mouseMoveManager = new MouseMoveManager(this.screen);
    this.activityManager = new ActivityManager(this.session.duration.milliseconds);
    this.activeTabManager = new ActiveTabManager()

    Object.values(this.tabs).forEach(tab => tab.resetMessageManagers())
  }

  move(t: number): any {
    this.activeTabManager.moveReady(t).then(tabId => {
      // Moving mouse and setting :hover classes on ready view
      this.mouseMoveManager.move(t);
      const lastClick = this.clickManager.moveGetLast(t);
      if (!!lastClick && t - lastClick.time < 600) { // happened during last 600ms
        this.screen.cursor.click();
      }
      const lastThrashing = this.mouseThrashingManager.moveGetLast(t)
      if (!!lastThrashing && t - lastThrashing.time < 300) {
        this.screen.cursor.shake();
      }

      const activeTabs = this.state.get().tabs
      if (tabId && !activeTabs.includes(tabId)) {
        this.state.update({ tabs: activeTabs.concat(tabId) })
      }

      if (tabId && this.activeTab !== tabId) {
        this.state.update({ currentTab: tabId })
        this.activeTab = tabId
      }
      if (!this.tabs[this.activeTab]) {
        console.log(this.tabs, this.activeTab, tabId, this.activeTabManager.list)
      }
      // console.log(this.tabs, this.activeTab)
      this.tabs[this.activeTab].move(t)
    })

    if (this.waitingForFiles && this.lastMessageTime <= t && t !== this.session.duration.milliseconds) {
      this.setMessagesLoading(true)
    }
  }

  public changeTab(tabId) {
    this.activeTab = tabId
    this.state.update({ currentTab: tabId })
    this.tabs[tabId].move(this.state.get().time)
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
        this.initialLists,
      )
    }

    const lastMessageTime =  Math.max(msg.time, this.lastMessageTime)
    this.lastMessageTime = lastMessageTime
    this.state.update({ lastMessageTime })
    if (visualChanges.includes(msg.tp)) {
      this.activityManager?.updateAcctivity(msg.time);
    }
    switch (msg.tp) {
      case MType.TabChange:
        this.activeTabManager.append(msg)
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
              this.activeTabManager.append({ tp: MType.TabChange, tabId: msg.tabId, time: 0 })
              this.state.update({ firstVisualEvent: msg.time, currentTab: msg.tabId, tabs: [msg.tabId] });
              this.firstVisualEventSet = true;
            }
        }
        this.tabs[msg.tabId].distributeMessage(msg)
        break;
    }
  }

  setMessagesLoading = (messagesLoading: boolean) => {
    this.screen.display(!messagesLoading);
    this.state.update({ messagesLoading, ready: !messagesLoading && !this.state.get().cssLoading });
  }

  decodeMessage(msg: Message) {
    return this.tabs[this.activeTab].decodeMessage(msg)
  }

  private setSize({ height, width }: { height: number, width: number }) {
    this.screen.scale({ height, width });
    this.state.update({ width, height });
  }

  // TODO: clean managers?
  clean() {
    this.state.update(MessageManager.INITIAL_STATE);
  }

}
