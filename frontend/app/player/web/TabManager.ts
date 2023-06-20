import ListWalker from "Player/common/ListWalker";
import {
  ConnectionInformation,
  Message, MType, ResourceTiming,
  SetPageLocation,
  SetViewportScroll,
  SetViewportSize
} from "Player/web/messages";
import PerformanceTrackManager from "Player/web/managers/PerformanceTrackManager";
import WindowNodeCounter from "Player/web/managers/WindowNodeCounter";
import PagesManager from "Player/web/managers/PagesManager";
// @ts-ignore
import { Decoder } from "syncod";
import Lists, { InitialLists, INITIAL_STATE as LISTS_INITIAL_STATE, State as ListsState } from "Player/web/Lists";
import type  { Store } from 'Player';
import Screen from "Player/web/Screen/Screen";
import { TYPES as EVENT_TYPES } from "Types/session/event";
import type { PerformanceChartPoint } from './managers/PerformanceTrackManager';
import { getResourceFromNetworkRequest, getResourceFromResourceTiming, Log, ResourceType } from "Player";
import { isDOMType } from "Player/web/messages/filters.gen";

export interface TabState extends ListsState {
  performanceAvailability?: PerformanceTrackManager['availability']
  performanceChartData: PerformanceChartPoint[],
  performanceChartTime: PerformanceChartPoint[]
  cssLoading: boolean
  location: string
  urlsList: SetPageLocation[]
}

/**
 * DO NOT DELETE UNUSED METHODS
 * THEY'RE ALL USED IN MESSAGE MANAGER VIA this.tabs[id]
 * */

export default class TabSessionManager {
  static INITIAL_STATE: TabState = {
    ...LISTS_INITIAL_STATE,
    performanceChartData: [],
    performanceChartTime: [],
    cssLoading: false,
    location: '',
    urlsList: [],
  }

  public locationManager: ListWalker<SetPageLocation> = new ListWalker();
  private locationEventManager: ListWalker<any>/*<LocationEvent>*/ = new ListWalker();
  private loadedLocationManager: ListWalker<SetPageLocation> = new ListWalker();
  private connectionInfoManger: ListWalker<ConnectionInformation> = new ListWalker();
  private performanceTrackManager: PerformanceTrackManager = new PerformanceTrackManager();
  private windowNodeCounter: WindowNodeCounter = new WindowNodeCounter();

  private resizeManager: ListWalker<SetViewportSize> = new ListWalker([]);
  private pagesManager: PagesManager;
  private scrollManager: ListWalker<SetViewportScroll> = new ListWalker();

  public readonly decoder = new Decoder();
  private lists: Lists;
  private navigationStartOffset = 0

  constructor(
    private readonly session: any,
    private readonly state: Store<{ tabStates: { [tabId: string]: TabState } }>,
    private readonly screen: Screen,
    private readonly id: string,
    private readonly setSize: ({ height, width }: { height: number, width: number }) => void,
    private readonly sessionStart: number,
    initialLists?: Partial<InitialLists>,
  ) {
    this.pagesManager = new PagesManager(screen, this.session.isMobile, this.setCSSLoading)
    this.lists = new Lists(initialLists)
    initialLists?.event?.forEach((e: Record<string, string>) => { // TODO: to one of "Movable" module
      if (e.type === EVENT_TYPES.LOCATION) {
        this.locationEventManager.append(e);
      }
    })
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
    const eventCount = lists?.event?.length || 0

    const currentState = this.state.get()
    this.state.update({
      // @ts-ignore comes from parent state
      eventCount: currentState.eventCount + eventCount,
      tabStates: {
        ...currentState.tabStates,
        [this.id]: {
          ...currentState.tabStates[this.id],
          ...this.lists.getFullListsState(),
        }
      }
    })
  }

  updateLocalState(state: Partial<TabState>) {
    this.state.update({
      tabStates: {
        ...this.state.get().tabStates,
        [this.id]: {
          ...this.state.get().tabStates[this.id],
          ...state
        }
      }
    })
  }

  private setCSSLoading = (cssLoading: boolean) => {
    this.screen.displayFrame(!cssLoading)
    this.updateLocalState({
      cssLoading
    })
    this.state.update({
    // @ts-ignore
      ready: !this.state.get().messagesLoading && !cssLoading
    })
  }

  public resetMessageManagers() {
    this.locationEventManager = new ListWalker();
    this.locationManager = new ListWalker();
    this.loadedLocationManager = new ListWalker();
    this.connectionInfoManger = new ListWalker();
    this.scrollManager = new ListWalker();
    this.resizeManager = new ListWalker();

    this.performanceTrackManager = new PerformanceTrackManager()
    this.windowNodeCounter = new WindowNodeCounter();
    this.pagesManager = new PagesManager(this.screen, this.session.isMobile, this.setCSSLoading)
  }


  distributeMessage(msg: Message): void {
    switch (msg.tp) {
      case MType.SetPageLocation:
        this.locationManager.append(msg);
        if (msg.navigationStart > 0) {
          this.loadedLocationManager.append(msg);
        }
        break;
      case MType.SetViewportSize:
        this.resizeManager.append(msg);
        break;
      case MType.SetViewportScroll:
        this.scrollManager.append(msg);
        break;
      case MType.PerformanceTrack:
        this.performanceTrackManager.append(msg);
        break;
      case MType.SetPageVisibility:
        this.performanceTrackManager.handleVisibility(msg)
        break;
      case MType.ConnectionInformation:
        this.connectionInfoManger.append(msg);
        break;
      case MType.OTable:
        this.decoder.set(msg.key, msg.value);
        break;
      /* Lists: */
      case MType.ConsoleLog:
        if (msg.level === 'debug') break;
        this.lists.lists.log.append(
          // @ts-ignore : TODO: enums in the message schema
          Log(msg)
        )
        break;
      case MType.ResourceTimingDeprecated:
      case MType.ResourceTiming:
        // TODO: merge `resource` and `fetch` lists into one here instead of UI
        if (msg.initiator !== ResourceType.FETCH && msg.initiator !== ResourceType.XHR) {
          this.lists.lists.resource.insert(getResourceFromResourceTiming(msg as ResourceTiming, this.sessionStart))
        }
        break;
      case MType.Fetch:
      case MType.NetworkRequest:
        this.lists.lists.fetch.insert(getResourceFromNetworkRequest(msg, this.sessionStart))
        break;
      case MType.Redux:
        this.lists.lists.redux.append(msg);
        break;
      case MType.NgRx:
        this.lists.lists.ngrx.append(msg);
        break;
      case MType.Vuex:
        this.lists.lists.vuex.append(msg);
        break;
      case MType.Zustand:
        this.lists.lists.zustand.append(msg)
        break
      case MType.MobX:
        this.lists.lists.mobx.append(msg);
        break;
      case MType.GraphQl:
        this.lists.lists.graphql.append(msg);
        break;
      case MType.Profiler:
        this.lists.lists.profiles.append(msg);
        break;
      /* ===|=== */
      default:
        switch (msg.tp) {
          case MType.CreateDocument:
            this.windowNodeCounter.reset();
            this.performanceTrackManager.setCurrentNodesCount(this.windowNodeCounter.count);
            break;
          case MType.CreateTextNode:
          case MType.CreateElementNode:
            this.windowNodeCounter.addNode(msg.id, msg.parentID);
            this.performanceTrackManager.setCurrentNodesCount(this.windowNodeCounter.count);
            break;
          case MType.MoveNode:
            this.windowNodeCounter.moveNode(msg.id, msg.parentID);
            this.performanceTrackManager.setCurrentNodesCount(this.windowNodeCounter.count);
            break;
          case MType.RemoveNode:
            this.windowNodeCounter.removeNode(msg.id);
            this.performanceTrackManager.setCurrentNodesCount(this.windowNodeCounter.count);
            break;
        }
        this.performanceTrackManager.addNodeCountPointIfNeed(msg.time)
        isDOMType(msg.tp) && this.pagesManager.appendMessage(msg)
        break;
    }
  }

  move(t: number, index?: number): void {
    const stateToUpdate: Record<string, any> = {};
    /* == REFACTOR_ME ==  */
    const lastLoadedLocationMsg = this.loadedLocationManager.moveGetLast(t, index);
    if (!!lastLoadedLocationMsg) {
      // TODO: page-wise resources list  // setListsStartTime(lastLoadedLocationMsg.time)
      this.navigationStartOffset = lastLoadedLocationMsg.navigationStart - this.sessionStart;
    }
    const llEvent = this.locationEventManager.moveGetLast(t, index);
    if (!!llEvent) {
      if (llEvent.domContentLoadedTime != null) {
        stateToUpdate.domContentLoadedTime = {
          time: llEvent.domContentLoadedTime + this.navigationStartOffset, //TODO: predefined list of load event for the network tab (merge events & SetPageLocation: add navigationStart to db)
          value: llEvent.domContentLoadedTime,
        }
      }
      if (llEvent.loadTime != null) {
        stateToUpdate.loadTime = {
          time: llEvent.loadTime + this.navigationStartOffset,
          value: llEvent.loadTime,
        }
      }
      if (llEvent.domBuildingTime != null) {
        stateToUpdate.domBuildingTime = llEvent.domBuildingTime;
      }
    }
    /* === */
    const lastLocationMsg = this.locationManager.moveGetLast(t, index);
    if (!!lastLocationMsg) {
      // @ts-ignore comes from parent state
      this.state.update({ location: lastLocationMsg.url })
    }
    // ConnectionInformation message is not used at this moment
    // const lastConnectionInfoMsg = this.connectionInfoManger.moveGetLast(t, index);
    // if (!!lastConnectionInfoMsg) {
    //   stateToUpdate.connType = lastConnectionInfoMsg.type;
    //   stateToUpdate.connBandwidth = lastConnectionInfoMsg.downlink;
    // }
    const lastPerformanceTrackMessage = this.performanceTrackManager.moveGetLast(t, index);
    if (!!lastPerformanceTrackMessage) {
      stateToUpdate.performanceChartTime = lastPerformanceTrackMessage.time;
    }

    Object.assign(stateToUpdate, this.lists.moveGetState(t))
    Object.keys(stateToUpdate).length > 0 && this.updateLocalState(stateToUpdate);

    /* Sequence of the managers is important here */
    // Preparing the size of "screen"
    const lastResize = this.resizeManager.moveGetLast(t, index);
    if (!!lastResize) {
      this.setSize(lastResize)
    }
    this.pagesManager.moveReady(t).then(() => {
      const lastScroll = this.scrollManager.moveGetLast(t, index);
      if (!!lastScroll && this.screen.window) {
        this.screen.window.scrollTo(lastScroll.x, lastScroll.y);
      }
    })
  }

  public decodeMessage(msg: Message) {
    return this.decoder.decode(msg)
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

  public onFileReadSuccess = () => {
    const stateToUpdate : Partial<Record<string,any>> = {
      performanceChartData: this.performanceTrackManager.chartData,
      performanceAvailability: this.performanceTrackManager.availability,
      urlsList: this.locationManager.list,
      ...this.lists.getFullListsState(),
    }

    this.updateLocalState(stateToUpdate)
  }

  public getListsFullState = () => {
    return this.lists.getFullListsState()
  }

  clean() {
    this.pagesManager.reset()
  }
}