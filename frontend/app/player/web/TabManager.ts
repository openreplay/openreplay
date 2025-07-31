import type { Store } from 'Player';
import {
  Log,
  ResourceType,
  getResourceFromNetworkRequest,
  getResourceFromResourceTiming,
} from 'Player';
import ListWalker from 'Player/common/ListWalker';
import Lists, {
  InitialLists,
  INITIAL_STATE as LISTS_INITIAL_STATE,
  State as ListsState,
} from 'Player/web/Lists';
import Screen from 'Player/web/Screen/Screen';
import CanvasManager from 'Player/web/managers/CanvasManager';
import { VElement } from 'Player/web/managers/DOM/VirtualDOM';
import PagesManager from 'Player/web/managers/PagesManager';
import PerformanceTrackManager from 'Player/web/managers/PerformanceTrackManager';
import WindowNodeCounter from 'Player/web/managers/WindowNodeCounter';
import {
  CanvasNode,
  ConnectionInformation,
  MType,
  Message,
  ResourceTiming,
  SetPageLocation,
  SetViewportScroll,
  SetViewportSize,
} from 'Player/web/messages';
import { isDOMType } from 'Player/web/messages/filters.gen';
import { TYPES as EVENT_TYPES } from 'Types/session/event';
// @ts-ignore
import { Decoder } from 'syncod';

import type { PerformanceChartPoint } from './managers/PerformanceTrackManager';

export interface TabState extends ListsState {
  performanceAvailability?: PerformanceTrackManager['availability'];
  performanceChartData: PerformanceChartPoint[];
  performanceChartTime: PerformanceChartPoint[];
  cssLoading: boolean;
  location: string;
  urlsList: SetPageLocation[];
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
  };

  public locationManager: ListWalker<SetPageLocation> = new ListWalker();

  private locationEventManager: ListWalker<any> /* <LocationEvent> */ =
    new ListWalker();

  private loadedLocationManager: ListWalker<SetPageLocation> = new ListWalker();

  private connectionInfoManger: ListWalker<ConnectionInformation> =
    new ListWalker();

  private performanceTrackManager: PerformanceTrackManager =
    new PerformanceTrackManager();

  private windowNodeCounter: WindowNodeCounter = new WindowNodeCounter();

  private resizeManager: ListWalker<SetViewportSize> = new ListWalker([]);

  private pagesManager: PagesManager;

  private scrollManager: ListWalker<SetViewportScroll> = new ListWalker();

  public readonly decoder = new Decoder();

  public lastMessageTs = 0;

  private lists: Lists;

  private navigationStartOffset = 0;

  private canvasManagers: {
    [key: string]: { manager: CanvasManager; start: number; running: boolean };
  } = {};

  private canvasReplayWalker: ListWalker<CanvasNode> = new ListWalker();

  constructor(
    private session: any,
    private readonly state: Store<{
      tabStates: { [tabId: string]: TabState };
      tabNames: { [tabId: string]: string };
      location?: string;
      vModeBadge?: boolean;
    }>,
    private readonly screen: Screen,
    private readonly id: string,
    private readonly setSize: ({
      height,
      width,
    }: {
      height: number;
      width: number;
    }) => void,
    private readonly sessionStart: number,
    initialLists?: Partial<InitialLists>,
  ) {
    this.pagesManager = new PagesManager(
      screen,
      this.session.isMobile,
      this.setCSSLoading,
      () => {
        setTimeout(() => {
          this.state.update({
            vModeBadge: true,
          })
        }, 0)
      }
    );
    this.lists = new Lists(initialLists);
    initialLists?.event?.forEach((e: Record<string, string>) => {
      // TODO: to one of "Movable" module
      if (e.type === EVENT_TYPES.LOCATION) {
        this.locationEventManager.append(e);
      }
    });
  }

  public setVirtualMode = (virtualMode: boolean) => {
    this.pagesManager.setVirtualMode(virtualMode);
  };

  setSession = (session: any) => {
    this.session = session;
  };

  public getNode = (id: number) => this.pagesManager.getNode(id);

  public injectSpriteMap = (spriteMapEl: SVGElement) => {
    this.pagesManager.injectSpriteMap(spriteMapEl);
  };

  public updateLists(lists: Partial<InitialLists>) {
    Object.keys(lists).forEach((key: 'event' | 'stack' | 'exceptions') => {
      const currentList = this.lists.lists[key];
      const insertingList = lists[key];
      insertingList?.forEach((item) => {
        if (
          currentList.list.findIndex(
            (exv: { time: number; key: number; messageId?: number }) =>
              exv.time === item.time &&
              exv.key === item.key &&
              (exv.messageId && item.messageId
                ? exv.messageId === item.messageId
                : true),
          ) === -1
        ) {
          currentList.insert(item);
          if (key === 'event' && item.type === EVENT_TYPES.LOCATION) {
            this.locationEventManager.append(item);
          }
        }
      });
    });
    const eventCount = lists?.event?.length || 0;

    const currentState = this.state.get();
    this.state.update({
      // @ts-ignore comes from parent state
      eventCount: currentState.eventCount + eventCount,
      tabStates: {
        ...currentState.tabStates,
        [this.id]: {
          ...currentState.tabStates[this.id],
          ...this.lists.getFullListsState(),
        },
      },
    });
  }

  /**
   * Because we use main state (from messageManager), we have to update it this way
   * */
  updateLocalState(state: Partial<TabState>) {
    this.state.updateTabStates(this.id, state);
  }

  private setCSSLoading = (cssLoading: boolean) => {
    this.screen.displayFrame(!cssLoading);
    this.updateLocalState({
      cssLoading,
    });
    this.state.update({
      // @ts-ignore
      ready: !this.state.get().messagesLoading && !cssLoading,
    });
  };

  public resetMessageManagers() {
    this.locationEventManager = new ListWalker();
    this.locationManager = new ListWalker();
    this.loadedLocationManager = new ListWalker();
    this.connectionInfoManger = new ListWalker();
    this.scrollManager = new ListWalker();
    this.resizeManager = new ListWalker();

    this.performanceTrackManager = new PerformanceTrackManager();
    this.windowNodeCounter = new WindowNodeCounter();
    this.pagesManager = new PagesManager(
      this.screen,
      this.session.isMobile,
      this.setCSSLoading,
    );
  }

  firstTitleSet = false;
  private resourceIdx = new Map<string, any>();
  private makeResKey = (url: string, ts: number) => `${url}|${ts}`;

  distributeMessage(msg: Message): void {
    if (this.lastMessageTs < msg.time) {
      this.lastMessageTs = msg.time;
    }
    switch (msg.tp) {
      case MType.CanvasNode:
        const managerId = `${msg.timestamp}_${msg.nodeId}`;
        if (!this.canvasManagers[managerId] && this.session.canvasURL?.length) {
          const fileId = managerId;
          const delta = msg.timestamp - this.sessionStart;

          const canvasNodeLinks = this.session.canvasURL.filter((url: string) =>
            url.includes(fileId),
          ) as string[];
          const tarball = canvasNodeLinks.find((url: string) =>
            url.includes('.tar.'),
          );
          const mp4file = canvasNodeLinks.find((url: string) =>
            url.includes('.mp4'),
          );
          if (!tarball && !mp4file) {
            console.error('no canvas recording provided');
            break;
          }
          const manager = new CanvasManager(
            msg.nodeId,
            delta,
            [tarball, mp4file],
            this.getNode as (id: number) => VElement | undefined,
            this.sessionStart,
          );
          this.canvasManagers[managerId] = {
            manager,
            start: msg.timestamp,
            running: false,
          };
          this.canvasReplayWalker.append(msg);
        }
        break;
      case MType.SetPageLocationDeprecated:
      case MType.SetPageLocation:
        this.locationManager.append(msg);
        if ('documentTitle' in msg && !this.firstTitleSet) {
          this.state.update({
            tabNames: {
              ...this.state.get().tabNames,
              [this.id]: msg.documentTitle,
            },
          });
          this.firstTitleSet = true;
        }
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
        this.performanceTrackManager.handleVisibility(msg);
        break;
      case MType.ConnectionInformation:
        this.connectionInfoManger.append(msg);
        break;
      case MType.OTable:
        this.decoder.set(msg.key, msg.value);
        break;
      /* Lists: */
      case MType.ConsoleLog:
        this.lists.lists.log.append(
          // @ts-ignore : TODO: enums in the message schema
          Log(msg),
        );
        break;
      case MType.ResourceTimingDeprecated:
      case MType.ResourceTiming:
        // TODO: merge `resource` and `fetch` lists into one here instead of UI
        if (
          msg.initiator !== ResourceType.FETCH &&
          msg.initiator !== ResourceType.XHR
        ) {
          const res = getResourceFromResourceTiming(
            msg as ResourceTiming,
            this.sessionStart,


          );
          const key = this.makeResKey(res.url, res.timestamp || res.time);
          if (this.resourceIdx.has(key)) return;
          this.lists.lists.resource.insert(res);
          this.resourceIdx.set(key, res);
        }
        break;
      case MType.NetworkRequest:
        const req = getResourceFromNetworkRequest(msg, this.sessionStart);
        const key = this.makeResKey(req.url, req.timestamp || req.time);
        const twin = this.resourceIdx.get(key);
        if (twin) {
          const twinId = this.lists.lists.resource.list.findIndex(
            (r) => r.url === twin.url && r.time === twin.time,
          );
          if (twinId !== -1) {
            this.lists.lists.resource.list.splice(twinId, 1);
          }
          this.resourceIdx.delete(key);
        }
        this.lists.lists.fetch.insert(req);
        break;
      case MType.WsChannel:
        this.lists.lists.websocket.insert(msg);
        break;
      case MType.ReduxDeprecated:
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
        this.lists.lists.zustand.append(msg);
        break;
      case MType.MobX:
        this.lists.lists.mobx.append(msg);
        break;
      case MType.GraphQlDeprecated:
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
            this.performanceTrackManager.setCurrentNodesCount(
              this.windowNodeCounter.count,
            );
            break;
          case MType.CreateTextNode:
          case MType.CreateElementNode:
            this.windowNodeCounter.addNode(msg);
            this.performanceTrackManager.setCurrentNodesCount(
              this.windowNodeCounter.count,
            );
            break;
          case MType.MoveNode:
            this.windowNodeCounter.moveNode(msg);
            this.performanceTrackManager.setCurrentNodesCount(
              this.windowNodeCounter.count,
            );
            break;
          case MType.RemoveNode:
            this.windowNodeCounter.removeNode(msg);
            this.performanceTrackManager.setCurrentNodesCount(
              this.windowNodeCounter.count,
            );
            break;
          case MType.LoadFontFace:
            if (msg.source.startsWith('url(/')) {
              const relativeUrl = msg.source.substring(4);
              const lastUrl = this.locationManager.findLast(msg.time)?.url;
              if (lastUrl) {
                const u = new URL(lastUrl);
                const base = `${u.protocol}//${u.hostname}/`;
                msg.source = `url(${base}${relativeUrl}`;
              }
            }
            break;
        }
        this.performanceTrackManager.addNodeCountPointIfNeed(msg.time);
        isDOMType(msg.tp) && this.pagesManager.appendMessage(msg);
        break;
    }
  }

  move(t: number, index?: number): void {
    const stateToUpdate: Record<string, any> = {};
    /* == REFACTOR_ME ==  */
    const lastLoadedLocationMsg = this.loadedLocationManager.moveGetLast(
      t,
      index,
    );
    if (lastLoadedLocationMsg) {
      // TODO: page-wise resources list  // setListsStartTime(lastLoadedLocationMsg.time)
      this.navigationStartOffset =
        lastLoadedLocationMsg.navigationStart - this.sessionStart;
    }
    const lastLocationEvent = this.locationEventManager.moveGetLast(t, index);
    if (lastLocationEvent) {
      if (lastLocationEvent.domContentLoadedTime != null) {
        stateToUpdate.domContentLoadedTime = {
          time:
            lastLocationEvent.domContentLoadedTime + this.navigationStartOffset,
          // TODO: predefined list of load event for the network tab (merge events & SetPageLocation: add navigationStart to db)
          value: lastLocationEvent.domContentLoadedTime,
        };
      }
      if (lastLocationEvent.loadTime != null) {
        stateToUpdate.loadTime = {
          time: lastLocationEvent.loadTime + this.navigationStartOffset,
          value: lastLocationEvent.loadTime,
        };
      }
      if (lastLocationEvent.domBuildingTime != null) {
        stateToUpdate.domBuildingTime = lastLocationEvent.domBuildingTime;
      }
    }
    /* === */
    const lastLocationMsg = this.locationManager.moveGetLast(t, index, true);
    if (lastLocationMsg) {
      const { tabNames, location } = this.state.get();
      if (location !== lastLocationMsg.url) {
        if (lastLocationMsg.documentTitle) {
          tabNames[this.id] = lastLocationMsg.documentTitle;
        }
        // @ts-ignore comes from parent state
        this.state.update({ location: lastLocationMsg.url, tabNames });
      }
    }

    const lastPerformanceTrackMessage =
      this.performanceTrackManager.moveGetLast(t, index);
    if (lastPerformanceTrackMessage) {
      stateToUpdate.performanceChartTime = lastPerformanceTrackMessage.time;
    }

    Object.assign(stateToUpdate, this.lists.moveGetState(t));
    if (Object.keys(stateToUpdate).length > 0) {
      this.updateLocalState(stateToUpdate);
    }
    /* Sequence of the managers is important here */
    // Preparing the size of "screen"
    const lastResize = this.resizeManager.moveGetLast(t, index);
    if (lastResize) {
      this.setSize(lastResize);
    }
    this.pagesManager.moveReady(t).then(() => {
      const lastScroll = this.scrollManager.moveGetLast(t, index);
      if (!!lastScroll && this.screen.window) {
        this.screen.window.scrollTo(lastScroll.x, lastScroll.y);
      }
      this.canvasReplayWalker.moveApply(t, (canvasMsg) => {
        if (canvasMsg) {
          const managerId = `${canvasMsg.timestamp}_${canvasMsg.nodeId}`;
          const possibleManager = this.canvasManagers[managerId];
          if (possibleManager && !possibleManager.running) {
            this.canvasManagers[managerId].manager.startVideo();
            this.canvasManagers[managerId].running = true;
          }
        }
      });
      const runningManagers = Object.values(this.canvasManagers).filter(
        (manager) => manager.running,
      );
      runningManagers.forEach(({ manager }) => {
        manager.move(t);
      });
    });
  }

  /**
   * Used to decode state messages, because they can be large we only want to decode whats rendered atm
   * */
  public decodeMessage(msg: Message) {
    return this.decoder.decode(msg);
  }

  /**
   * Legacy code. Ensures that RemoveNode messages with parent being <HEAD> are sorted before other RemoveNode messages.
   * */
  public sortDomRemoveMessages = (msgs: Message[]) => {
    // @ts-ignore Hack for upet (TODO: fix ordering in one mutation in tracker(removes first))
    const headChildrenMsgIds = msgs
      .filter((m) => m.parentID === 1)
      .map((m) => m.id);
    this.pagesManager.sortPages((m1, m2) => {
      if (m1.time === m2.time) {
        if (m1.tp === MType.RemoveNode && m2.tp !== MType.RemoveNode) {
          if (headChildrenMsgIds.includes(m1.id)) {
            return -1;
          }
        } else if (m2.tp === MType.RemoveNode && m1.tp !== MType.RemoveNode) {
          if (headChildrenMsgIds.includes(m2.id)) {
            return 1;
          }
        } else if (m2.tp === MType.RemoveNode && m1.tp === MType.RemoveNode) {
          const m1FromHead = headChildrenMsgIds.includes(m1.id);
          const m2FromHead = headChildrenMsgIds.includes(m2.id);
          if (m1FromHead && !m2FromHead) {
            return -1;
          }
          if (m2FromHead && !m1FromHead) {
            return 1;
          }
        }
      }
      return 0;
    });
  };

  public onFileReadSuccess = () => {
    const stateToUpdate: Partial<Record<string, any>> = {
      performanceChartData: this.performanceTrackManager.chartData,
      performanceAvailability: this.performanceTrackManager.availability,
      urlsList: this.locationManager.list,
      ...this.lists.getFullListsState(),
    };

    this.updateLocalState(stateToUpdate);
  };

  public getListsFullState = () => this.lists.getFullListsState();

  clean() {
    this.pagesManager.reset();
  }
}
