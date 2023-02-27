// @ts-ignore
import { Decoder } from "syncod";
import logger from 'App/logger';

import { TYPES as EVENT_TYPES } from 'Types/session/event';
import { Log } from './types/log';
import { Resource, ResourceType, getResourceFromResourceTiming, getResourceFromNetworkRequest } from './types/resource'

import { toast } from 'react-toastify';

import type  { Store, Timed } from '../common/types';
import ListWalker from '../common/ListWalker';

import PagesManager from './managers/PagesManager';
import MouseMoveManager from './managers/MouseMoveManager';

import PerformanceTrackManager from './managers/PerformanceTrackManager';
import WindowNodeCounter from './managers/WindowNodeCounter';
import ActivityManager from './managers/ActivityManager';

import MFileReader from './messages/MFileReader';
import { MType } from './messages';
import { isDOMType } from './messages/filters.gen';
import type {
  Message,
  SetPageLocation,
  ConnectionInformation,
  SetViewportSize,
  SetViewportScroll,
  MouseClick,
} from './messages';

import { loadFiles, requestEFSDom, requestEFSDevtools } from './network/loadFiles';
import { decryptSessionBytes } from './network/crypto';

import Lists, { INITIAL_STATE as LISTS_INITIAL_STATE, State as ListsState } from './Lists';

import Screen, {
  INITIAL_STATE as SCREEN_INITIAL_STATE,
  State as ScreenState,
} from './Screen/Screen';

import type { InitialLists } from './Lists'
import type { PerformanceChartPoint } from './managers/PerformanceTrackManager';
import type { SkipInterval } from './managers/ActivityManager';


export interface State extends ScreenState, ListsState {
  performanceChartData: PerformanceChartPoint[],
  skipIntervals: SkipInterval[],
  connType?: string,
  connBandwidth?: number,
  location?: string,
  performanceChartTime?: number,
  performanceAvaliability?: PerformanceTrackManager['avaliability']

  domContentLoadedTime?:  { time: number, value: number },
  domBuildingTime?: number,
  loadTime?: { time: number, value: number },
  error: boolean,
  devtoolsLoading: boolean,

  messagesLoading: boolean,
  cssLoading: boolean,

  ready: boolean,
  lastMessageTime: number,
}


const visualChanges = [
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
    devtoolsLoading: false,

    messagesLoading: false,
    cssLoading: false,
    ready: false,
    lastMessageTime: 0,
  }

  private locationEventManager: ListWalker<any>/*<LocationEvent>*/ = new ListWalker();
  private locationManager: ListWalker<SetPageLocation> = new ListWalker();
  private loadedLocationManager: ListWalker<SetPageLocation> = new ListWalker();
  private connectionInfoManger: ListWalker<ConnectionInformation> = new ListWalker();
  private performanceTrackManager: PerformanceTrackManager = new PerformanceTrackManager();
  private windowNodeCounter: WindowNodeCounter = new WindowNodeCounter();
  private clickManager: ListWalker<MouseClick> = new ListWalker();

  private resizeManager: ListWalker<SetViewportSize> = new ListWalker([]);
  private pagesManager: PagesManager;
  private mouseMoveManager: MouseMoveManager;

  private scrollManager: ListWalker<SetViewportScroll> = new ListWalker();

  private readonly decoder = new Decoder();
  private readonly lists: Lists;

  private activityManager: ActivityManager | null = null;

  private sessionStart: number;
  private navigationStartOffset: number = 0;
  private lastMessageTime: number = 0;

  constructor(
    private readonly session: any /*Session*/,
    private readonly state: Store<State>,
    private readonly screen: Screen,
    initialLists?: Partial<InitialLists>
  ) {
    this.pagesManager = new PagesManager(screen, this.session.isMobile, this.setCSSLoading)
    this.mouseMoveManager = new MouseMoveManager(screen)

    this.sessionStart = this.session.startedAt

    this.lists = new Lists(initialLists)
    initialLists?.event?.forEach((e: Record<string, string>) => { // TODO: to one of "Moveable" module
      if (e.type === EVENT_TYPES.LOCATION) {
        this.locationEventManager.append(e);
      }
    })

    this.activityManager = new ActivityManager(this.session.duration.milliseconds) // only if not-live
  }

  private setCSSLoading = (cssLoading: boolean) => {
    this.screen.displayFrame(!cssLoading)
    this.state.update({ cssLoading, ready: !this.state.get().messagesLoading && !cssLoading })
  }

  private _sortMessagesHack(msgs: Message[]) {
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
  private onFileReadSuccess = () => {
    const stateToUpdate : Partial<State>= {
      performanceChartData: this.performanceTrackManager.chartData,
      performanceAvaliability: this.performanceTrackManager.avaliability,
      ...this.lists.getFullListsState(),
    }
    if (this.activityManager) {
      this.activityManager.end()
      stateToUpdate.skipIntervals = this.activityManager.list
    }
    this.state.update(stateToUpdate)
  }
  private onFileReadFailed = (e: any) => {
    logger.error(e)
    this.state.update({ error: true })
    toast.error('Error requesting a session file')
  }
  private onFileReadFinally = () => {
    this.waitingForFiles = false
    // this.setMessagesLoading(false)
    // this.state.update({ filesLoaded: true })
  }

  async loadMessages(isClickmap: boolean = false) {
    this.setMessagesLoading(true)
    // TODO: reusable decryptor instance
    const createNewParser = (shouldDecrypt = true) => {
      const decrypt = shouldDecrypt && this.session.fileKey
        ? (b: Uint8Array) => decryptSessionBytes(b, this.session.fileKey)
        : (b: Uint8Array) => Promise.resolve(b)
      // Each time called - new fileReader created
      const fileReader = new MFileReader(new Uint8Array(), this.sessionStart)
      return (b: Uint8Array) => decrypt(b).then(b => {
        fileReader.append(b)
        const msgs: Array<Message> = []
        for (let msg = fileReader.readNext();msg !== null;msg = fileReader.readNext()) {
          this.distributeMessage(msg, msg._index)
          msgs.push(msg)
        }

        logger.info("Messages count: ", msgs.length, msgs)
        this._sortMessagesHack(msgs)
        this.setMessagesLoading(false)
      })
    }

    this.waitingForFiles = true

    const loadMethod = this.session.domURL && this.session.domURL.length > 0
      ? { url: this.session.domURL, parser: createNewParser }
      : { url: this.session.mobsUrl, parser: () => createNewParser(false)}

    loadFiles(loadMethod.url, loadMethod.parser())
      // EFS fallback
      .catch((e) =>
        requestEFSDom(this.session.sessionId)
          .then(createNewParser(false))
      )
      .then(this.onFileReadSuccess)
      .catch(this.onFileReadFailed)
      .finally(this.onFileReadFinally);

    // load devtools (TODO: start after the first DOM file download)
    if (isClickmap) return;
    this.state.update({ devtoolsLoading: true })
    loadFiles(this.session.devtoolsURL, createNewParser())
    // EFS fallback
    .catch(() =>
      requestEFSDevtools(this.session.sessionId)
        .then(createNewParser(false))
    )
    .then(() => {
      this.state.update(this.lists.getFullListsState()) // TODO: also in case of dynamic update through assist
    })
    .catch(e => logger.error("Can not download the devtools file", e))
    .finally(() => this.state.update({ devtoolsLoading: false }))
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

  move(t: number, index?: number): void {
    const stateToUpdate: Partial<State> = {};
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
      stateToUpdate.location = lastLocationMsg.url;
    }
    const lastConnectionInfoMsg = this.connectionInfoManger.moveGetLast(t, index);
    if (!!lastConnectionInfoMsg) {
      stateToUpdate.connType = lastConnectionInfoMsg.type;
      stateToUpdate.connBandwidth = lastConnectionInfoMsg.downlink;
    }
    const lastPerformanceTrackMessage = this.performanceTrackManager.moveGetLast(t, index);
    if (!!lastPerformanceTrackMessage) {
      stateToUpdate.performanceChartTime = lastPerformanceTrackMessage.time;
    }

    Object.assign(stateToUpdate, this.lists.moveGetState(t))
    Object.keys(stateToUpdate).length > 0 && this.state.update(stateToUpdate);

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
      // Moving mouse and setting :hover classes on ready view
      this.mouseMoveManager.move(t);
      const lastClick = this.clickManager.moveGetLast(t);
      if (!!lastClick && t - lastClick.time < 600) { // happend during last 600ms
        this.screen.cursor.click();
      }
    })

    if (this.waitingForFiles && this.lastMessageTime <= t && t !== this.session.duration.milliseconds) {
      this.setMessagesLoading(true)
    }
  }

  private decodeStateMessage(msg: any, keys: Array<string>) {
    const decoded = {};
    try {
      keys.forEach(key => {
        // @ts-ignore TODO: types for decoder
        decoded[key] = this.decoder.decode(msg[key]);
      });
    } catch (e) {
      logger.error("Error on message decoding: ", e, msg);
      return null;
    }
    return { ...msg, ...decoded };
  }

  distributeMessage(msg: Message, index: number): void {
    const lastMessageTime =  Math.max(msg.time, this.lastMessageTime)
    this.lastMessageTime = lastMessageTime
    this.state.update({ lastMessageTime })
    if (visualChanges.includes(msg.tp)) {
      this.activityManager?.updateAcctivity(msg.time);
    }
    let decoded;
    const time = msg.time;
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
      case MType.ResourceTiming:
        // TODO: merge `resource` and `fetch` lists into one here instead of UI
        this.lists.lists.resource.insert(getResourceFromResourceTiming(msg, this.sessionStart))
        break;
      case MType.Fetch:
      case MType.NetworkRequest:
        this.lists.lists.fetch.insert(getResourceFromNetworkRequest(msg, this.sessionStart))
        break;
      case MType.Redux:
        decoded = this.decodeStateMessage(msg, ["state", "action"]);
        logger.log('redux', decoded)
        if (decoded != null) {
          this.lists.lists.redux.append(decoded);
        }
        break;
      case MType.NgRx:
        decoded = this.decodeStateMessage(msg, ["state", "action"]);
        logger.log('ngrx', decoded)
        if (decoded != null) {
          this.lists.lists.ngrx.append(decoded);
        }
        break;
      case MType.Vuex:
        decoded = this.decodeStateMessage(msg, ["state", "mutation"]);
        logger.log('vuex', decoded)
        if (decoded != null) {
          this.lists.lists.vuex.append(decoded);
        }
        break;
      case MType.Zustand:
        decoded = this.decodeStateMessage(msg, ["state", "mutation"])
        logger.log('zustand', decoded)
        if (decoded != null) {
          this.lists.lists.zustand.append(decoded)
        }
      case MType.MobX:
        decoded = this.decodeStateMessage(msg, ["payload"]);
        logger.log('mobx', decoded)

        if (decoded != null) {
          this.lists.lists.mobx.append(decoded);
        }
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

  setMessagesLoading(messagesLoading: boolean) {
    this.screen.display(!messagesLoading);
    this.state.update({ messagesLoading, ready: !messagesLoading && !this.state.get().cssLoading });
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
