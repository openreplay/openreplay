// @ts-ignore
import { Decoder } from "syncod";
import logger from 'App/logger';

import { TYPES as EVENT_TYPES } from 'Types/session/event';

import type { Store } from 'Player';
import ListWalker from '../common/ListWalker';

import PagesManager from './managers/PagesManager';
import MouseMoveManager from './managers/MouseMoveManager';

import PerformanceTrackManager from './managers/PerformanceTrackManager';
import WindowNodeCounter from './managers/WindowNodeCounter';
import ActivityManager from './managers/ActivityManager';

import { MouseThrashing, MType } from "./messages";
import type {
  Message,
  SetPageLocation,
  ConnectionInformation,
  SetViewportSize,
  SetViewportScroll,
  MouseClick,
} from './messages';

import Lists, { INITIAL_STATE as LISTS_INITIAL_STATE, State as ListsState } from './Lists';

import Screen, {
  INITIAL_STATE as SCREEN_INITIAL_STATE,
  State as ScreenState,
} from './Screen/Screen';

import type { InitialLists } from './Lists'
import type { PerformanceChartPoint } from './managers/PerformanceTrackManager';
import type { SkipInterval } from './managers/ActivityManager';
import TabManager from "Player/web/TabManager";
import ActiveTabManager from "Player/web/managers/ActiveTabManager";

export interface State extends ScreenState, ListsState {
  performanceChartData: PerformanceChartPoint[],
  skipIntervals: SkipInterval[],
  connType?: string,
  connBandwidth?: number,
  location?: string,
  performanceChartTime?: number,
  performanceAvailability?: PerformanceTrackManager['availability']

  domContentLoadedTime?:  { time: number, value: number },
  domBuildingTime?: number,
  loadTime?: { time: number, value: number },
  error: boolean,
  messagesLoading: boolean,
  cssLoading: boolean,

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
    ...LISTS_INITIAL_STATE,
    performanceChartData: [],
    skipIntervals: [],
    error: false,
    cssLoading: false,
    ready: false,
    lastMessageTime: 0,
    firstVisualEvent: 0,
    messagesProcessed: false,
    messagesLoading: false,
    currentTab: '',
    tabs: [],
  }

  private locationEventManager: ListWalker<any>/*<LocationEvent>*/ = new ListWalker();
  private locationManager: ListWalker<SetPageLocation> = new ListWalker();
  private loadedLocationManager: ListWalker<SetPageLocation> = new ListWalker();
  private connectionInfoManger: ListWalker<ConnectionInformation> = new ListWalker();
  private performanceTrackManager: PerformanceTrackManager = new PerformanceTrackManager();
  private windowNodeCounter: WindowNodeCounter = new WindowNodeCounter();
  private clickManager: ListWalker<MouseClick> = new ListWalker();
  private mouseThrashingManager: ListWalker<MouseThrashing> = new ListWalker();

  private resizeManager: ListWalker<SetViewportSize> = new ListWalker([]);
  private pagesManager: PagesManager;
  private mouseMoveManager: MouseMoveManager;

  private scrollManager: ListWalker<SetViewportScroll> = new ListWalker();

  public readonly decoder = new Decoder();
  private lists: Lists;

  private activityManager: ActivityManager | null = null;

  private readonly sessionStart: number;
  private navigationStartOffset: number = 0;
  private lastMessageTime: number = 0;
  private firstVisualEventSet = false;
  private tabs: Record<string,TabManager> = {};
  private activeTabManager = new ActiveTabManager()

  constructor(
    private readonly session: any /*Session*/,
    private readonly state: Store<State>,
    private readonly screen: Screen,
    private readonly initialLists?: Partial<InitialLists>,
    private readonly uiErrorHandler?: { error: (error: string) => void, },
  ) {
    this.pagesManager = new PagesManager(screen, this.session.isMobile, this.setCSSLoading)
    this.mouseMoveManager = new MouseMoveManager(screen)

    this.sessionStart = this.session.startedAt

    this.lists = new Lists(initialLists)
    initialLists?.event?.forEach((e: Record<string, string>) => { // TODO: to one of "Movable" module
      if (e.type === EVENT_TYPES.LOCATION) {
        this.locationEventManager.append(e);
      }
    })

    this.activityManager = new ActivityManager(this.session.duration.milliseconds) // only if not-live
  }

  public getListsFullState = () => {
    return this.lists.getFullListsState()
  }

  public updateLists(lists: Partial<InitialLists>) {
    Object.keys(lists).forEach((key: 'event' | 'stack' | 'exceptions') => {
      const currentList = this.lists.lists[key]
      lists[key]!.forEach(item => currentList.insert(item))
    })
    lists?.event?.forEach((e: Record<string, string>) => {
      if (e.type === EVENT_TYPES.LOCATION) {
        this.locationEventManager.append(e);
      }
    })

    this.state.update({ ...this.lists.getFullListsState() });
  }

  private setCSSLoading = (cssLoading: boolean) => {
    this.screen.displayFrame(!cssLoading)
    this.state.update({ cssLoading, ready: !this.state.get().messagesLoading && !cssLoading })
  }

  public _sortMessagesHack = (msgs: Message[]) => {
    // @ts-ignore Hack for upet (TODO: fix ordering in one mutation in tracker(removes first))
    const headChildrenIds = msgs.filter(m => m.parentID === 1).map(m => m.id);
    this.pagesManager.sortPages((m1, m2) => {
      if (m1.time === m2.time) {
        if (m1.tp === MType.RemoveNode && m2.tp !== MType.RemoveNode) {
          if (headChildrenIds.includes(m1.id)) {
            return -1;
          }
        } else if (m2.tp === MType.RemoveNode && m1.tp !== MType.RemoveNode) {
          if (headChildrenIds.includes(m2.id)) {
            return 1;
          }
        }  else if (m2.tp === MType.RemoveNode && m1.tp === MType.RemoveNode) {
          const m1FromHead = headChildrenIds.includes(m1.id);
          const m2FromHead = headChildrenIds.includes(m2.id);
          if (m1FromHead && !m2FromHead) {
            return -1;
          } else if (m2FromHead && !m1FromHead) {
            return 1;
          }
        }
      }
      return 0;
    })
  }

  private waitingForFiles: boolean = false
  public onFileReadSuccess = () => {
    const stateToUpdate : Partial<State>= {
      performanceChartData: this.performanceTrackManager.chartData,
      performanceAvailability: this.performanceTrackManager.availability,
      ...this.lists.getFullListsState(),
    }
    if (this.activityManager) {
      this.activityManager.end()
      stateToUpdate.skipIntervals = this.activityManager.list
    }
    this.state.update(stateToUpdate)
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
    this.locationEventManager = new ListWalker();
    this.locationManager = new ListWalker();
    this.loadedLocationManager = new ListWalker();
    this.connectionInfoManger = new ListWalker();
    this.clickManager = new ListWalker();
    this.scrollManager = new ListWalker();
    this.resizeManager = new ListWalker();

    this.performanceTrackManager = new PerformanceTrackManager()
    this.windowNodeCounter = new WindowNodeCounter();
    this.pagesManager = new PagesManager(this.screen, this.session.isMobile, this.setCSSLoading)
    this.mouseMoveManager = new MouseMoveManager(this.screen);
    this.activityManager = new ActivityManager(this.session.duration.milliseconds);
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

      if (tabId && this.state.get().currentTab !== tabId) {
        this.state.update({ currentTab: tabId })
      }
      this.tabs[this.state.get().currentTab].move(t)
    })

    if (this.waitingForFiles && this.lastMessageTime <= t && t !== this.session.duration.milliseconds) {
      this.setMessagesLoading(true)
    }
  }


  distributeMessage = (msg: Message & { tabId: string }): void => {
    if (!this.tabs[msg.tabId]) {
      console.log(msg.tabId)
      this.tabs[msg.tabId] = new TabManager(
        this.session,
        this.state,
        this.screen,
        msg.tabId,
        this.setSize,
        this.initialLists,
      )
    }

    // return this.tabs[msg.tabId].distributeMessage(msg)

    const lastMessageTime =  Math.max(msg.time, this.lastMessageTime)
    this.lastMessageTime = lastMessageTime
    this.state.update({ lastMessageTime })
    if (visualChanges.includes(msg.tp)) {
      this.activityManager?.updateAcctivity(msg.time);
    }
    switch (msg.tp) {
      case MType.TabChange:
        this.state.update({ tabs: this.state.get().tabs.concat(msg.tabId) })
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
      // /* Lists: */
      // case MType.ConsoleLog:
      //   if (msg.level === 'debug') break;
      //   this.lists.lists.log.append(
      //     // @ts-ignore : TODO: enums in the message schema
      //     Log(msg)
      //   )
      //   break;
      // case MType.ResourceTimingDeprecated:
      // case MType.ResourceTiming:
      //   // TODO: merge `resource` and `fetch` lists into one here instead of UI
      //   if (msg.initiator !== ResourceType.FETCH && msg.initiator !== ResourceType.XHR) {
      //     // @ts-ignore TODO: typing for lists
      //     this.lists.lists.resource.insert(getResourceFromResourceTiming(msg, this.sessionStart))
      //   }
      //   break;
      // case MType.Fetch:
      // case MType.NetworkRequest:
      //   this.lists.lists.fetch.insert(getResourceFromNetworkRequest(msg, this.sessionStart))
      //   break;
      // case MType.Redux:
      //   this.lists.lists.redux.append(msg);
      //   break;
      // case MType.NgRx:
      //   this.lists.lists.ngrx.append(msg);
      //   break;
      // case MType.Vuex:
      //   this.lists.lists.vuex.append(msg);
      //   break;
      // case MType.Zustand:
      //   this.lists.lists.zustand.append(msg)
      //   break
      // case MType.MobX:
      //   this.lists.lists.mobx.append(msg);
      //   break;
      // case MType.GraphQl:
      //   this.lists.lists.graphql.append(msg);
      //   break;
      // case MType.Profiler:
      //   this.lists.lists.profiles.append(msg);
      //   break;
      /* ===|=== */
      default:
        switch (msg.tp) {
          case MType.CreateDocument:
            if (!this.firstVisualEventSet) {
              this.state.update({ firstVisualEvent: msg.time, currentTab: msg.tabId, tabs: [msg.tabId] });
              this.firstVisualEventSet = true;
            }
          //   break;
          // case MType.CreateTextNode:
          // case MType.CreateElementNode:
          //   this.windowNodeCounter.addNode(msg.id, msg.parentID);
          //   this.performanceTrackManager.setCurrentNodesCount(this.windowNodeCounter.count);
          //   break;
          // case MType.MoveNode:
          //   this.windowNodeCounter.moveNode(msg.id, msg.parentID);
          //   this.performanceTrackManager.setCurrentNodesCount(this.windowNodeCounter.count);
          //   break;
          // case MType.RemoveNode:
          //   this.windowNodeCounter.removeNode(msg.id);
          //   this.performanceTrackManager.setCurrentNodesCount(this.windowNodeCounter.count);
          //   break;
        }
        this.tabs[msg.tabId].distributeMessage(msg)
        // this.performanceTrackManager.addNodeCountPointIfNeed(msg.time)
        // isDOMType(msg.tp) && this.pagesManager.appendMessage(msg)
        break;
    }
  }

  setMessagesLoading = (messagesLoading: boolean) => {
    this.screen.display(!messagesLoading);
    this.state.update({ messagesLoading, ready: !messagesLoading && !this.state.get().cssLoading });
  }

  decodeMessage(msg: Message) {
    return this.decoder.decode(msg)
  }

  private setSize({ height, width }: { height: number, width: number }) {
    this.screen.scale({ height, width });
    this.state.update({ width, height });
  }

  // TODO: clean managers?
  clean() {
    this.state.update(MessageManager.INITIAL_STATE);
    // @ts-ignore
    this.pagesManager.reset();
  }

}
