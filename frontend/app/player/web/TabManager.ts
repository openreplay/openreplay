import ListWalker from "Player/common/ListWalker";
import {
  ConnectionInformation,
  Message, MType,
  SetPageLocation,
  SetViewportScroll,
  SetViewportSize
} from "Player/web/messages";
import PerformanceTrackManager from "Player/web/managers/PerformanceTrackManager";
import WindowNodeCounter from "Player/web/managers/WindowNodeCounter";
import PagesManager from "Player/web/managers/PagesManager";
import { Decoder } from "syncod";
import Lists, { InitialLists } from "Player/web/Lists";
import type  { Store } from '../common/types';
import Screen from "Player/web/Screen/Screen";
import { TYPES as EVENT_TYPES } from "Types/session/event";
import MouseMoveManager from "Player/web/managers/MouseMoveManager";
import ActivityManager from "Player/web/managers/ActivityManager";
import { getResourceFromNetworkRequest, getResourceFromResourceTiming, Log, ResourceType } from "Player";
import { isDOMType } from "Player/web/messages/filters.gen";

export default class TabManager {
  private locationEventManager: ListWalker<any>/*<LocationEvent>*/ = new ListWalker();
  private locationManager: ListWalker<SetPageLocation> = new ListWalker();
  private loadedLocationManager: ListWalker<SetPageLocation> = new ListWalker();
  private connectionInfoManger: ListWalker<ConnectionInformation> = new ListWalker();
  private performanceTrackManager: PerformanceTrackManager = new PerformanceTrackManager();
  private windowNodeCounter: WindowNodeCounter = new WindowNodeCounter();

  private resizeManager: ListWalker<SetViewportSize> = new ListWalker([]);
  private pagesManager: PagesManager;
  private scrollManager: ListWalker<SetViewportScroll> = new ListWalker();

  public readonly decoder = new Decoder();
  private lists: Lists;


  constructor(
    private readonly session: any,
    private readonly state: Store<{}>,
    private readonly screen: Screen,
    initialLists?: Partial<InitialLists>
  ) {
    this.pagesManager = new PagesManager(screen, this.session.isMobile, this.setCSSLoading)
    this.lists = new Lists(initialLists)
    initialLists?.event?.forEach((e: Record<string, string>) => { // TODO: to one of "Moveable" module
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

    this.state.update({ ...this.lists.getFullListsState() });
  }

  private setCSSLoading = (cssLoading: boolean) => {
    this.screen.displayFrame(!cssLoading)
    this.state.update({ cssLoading, ready: !this.state.get().messagesLoading && !cssLoading })
  }

  resetMessageManagers() {
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
    const lastMessageTime =  Math.max(msg.time, this.lastMessageTime)
    this.lastMessageTime = lastMessageTime
    this.state.update({ lastMessageTime })
    if (visualChanges.includes(msg.tp)) {
      this.activityManager?.updateAcctivity(msg.time);
    }
    let decoded;
    const time = msg.time;
    // console.log(msg)
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
      case MType.MouseThrashing:
        this.mouseThrashingManager.append(msg);
        break;
      case MType.MouseMove:
        this.mouseMoveManager.append(msg);
        break;
      case MType.MouseClick:
        this.clickManager.append(msg);
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
          this.lists.lists.resource.insert(getResourceFromResourceTiming(msg, this.sessionStart))
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
            if (!this.firstVisualEventSet) {
              this.state.update({ firstVisualEvent: msg.time });
              this.firstVisualEventSet = true;
            }
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
}