// @ts-ignore
import { Decoder } from "syncod";
import logger from 'App/logger';

import Resource, { TYPES } from 'Types/session/resource';
import { TYPES as EVENT_TYPES } from 'Types/session/event';
import { Log } from './types';

import { toast } from 'react-toastify';

import type  { Store } from '../common/types';
import ListWalker from '../common/ListWalker';

import PagesManager from './managers/PagesManager';
import MouseMoveManager from './managers/MouseMoveManager';

import PerformanceTrackManager from './managers/PerformanceTrackManager';
import WindowNodeCounter from './managers/WindowNodeCounter';
import ActivityManager from './managers/ActivityManager';

import MFileReader from './messages/MFileReader';
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


import type {
  Message,
  SetPageLocation,
  ConnectionInformation,
  SetViewportSize,
  SetViewportScroll,
  MouseClick,
} from './messages';

const visualChanges = [
  "mouse_move",
  "mouse_click",
  "create_element_node",
  "set_input_value",
  "set_input_checked",
  "set_viewport_size",
  "set_viewport_scroll",
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
    get ready() {
      return !this.messagesLoading && !this.cssLoading
    },
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
  private lastMessageInFileTime: number = 0;

  constructor(
    private readonly session: any /*Session*/,
    private readonly state: Store<State>,
    private readonly screen: Screen,
    initialLists?: Partial<InitialLists>
  ) {
    this.pagesManager = new PagesManager(screen, this.session.isMobile,  this)
    this.mouseMoveManager = new MouseMoveManager(screen)

    this.sessionStart = this.session.startedAt

    this.lists = new Lists(initialLists)
    initialLists?.event?.forEach((e: Record<string, string>) => { // TODO: to one of "Moveable" module
      if (e.type === EVENT_TYPES.LOCATION) {
        this.locationEventManager.append(e);
      }
    })

    this.activityManager = new ActivityManager(this.session.duration.milliseconds) // only if not-live


    this.loadMessages()
  }

  private parseAndDistributeMessages(fileReader: MFileReader, onMessage?: (msg: Message) => void) {
    const msgs: Array<Message> = []
    let next: ReturnType<MFileReader['next']>
    while (next = fileReader.next()) {
      const [msg, index] = next
      this.distributeMessage(msg, index)
      msgs.push(msg)
      onMessage?.(msg)
    }

    logger.info("Messages count: ", msgs.length, msgs)


    // @ts-ignore Hack for upet (TODO: fix ordering in one mutation in tracker(removes first))
    const headChildrenIds = msgs.filter(m => m.parentID === 1).map(m => m.id);
    this.pagesManager.sortPages((m1, m2) => {
      if (m1.time === m2.time) {
        if (m1.tp === "remove_node" && m2.tp !== "remove_node") {
          if (headChildrenIds.includes(m1.id)) {
            return -1;
          }
        } else if (m2.tp === "remove_node" && m1.tp !== "remove_node") {
          if (headChildrenIds.includes(m2.id)) {
            return 1;
          }
        }  else if (m2.tp === "remove_node" && m1.tp === "remove_node") {
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
      ...this.lists.getFullListsState()
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
    this.incomingMessages
      .filter(msg => msg.time >= this.lastMessageInFileTime)
      .forEach(msg => this.distributeMessage(msg, 0))

    this.waitingForFiles = false
    this.setMessagesLoading(false)
  }

  private loadMessages() {
    // TODO: reuseable decryptor instance
    const createNewParser = (shouldDecrypt=true) => {
      const decrypt = shouldDecrypt && this.session.fileKey
        ? (b: Uint8Array) => decryptSessionBytes(b, this.session.fileKey)
        : (b: Uint8Array) => Promise.resolve(b)
      // Each time called - new fileReader created
      const fileReader = new MFileReader(new Uint8Array(), this.sessionStart)
      return (b: Uint8Array) => decrypt(b).then(b => {
        fileReader.append(b)
        this.parseAndDistributeMessages(fileReader)
        this.setMessagesLoading(false)
      })
    }
    this.setMessagesLoading(true)
    this.waitingForFiles = true

    loadFiles(this.session.domURL, createNewParser())
    .catch(() => // do if  only the first file missing (404) (?)
      requestEFSDom(this.session.sessionId)
        .then(createNewParser(false))
        // Fallback to back Compatability with mobsUrl
        .catch(e =>
          loadFiles(this.session.mobsUrl, createNewParser(false))
        )
    )
    .then(this.onFileReadSuccess)
    .catch(this.onFileReadFailed)
    .finally(this.onFileReadFinally)

    // load devtools
    if (this.session.devtoolsURL.length) {
      this.state.update({ devtoolsLoading: true })
      loadFiles(this.session.devtoolsURL, createNewParser())
      .catch(() =>
        requestEFSDevtools(this.session.sessionId)
          .then(createNewParser(false))
      )
      //.catch() // not able to download the devtools file
      .finally(() => this.state.update({ devtoolsLoading: false }))
    }
  }

  reloadWithUnprocessedFile(onSuccess: ()=>void) {
    const onData = (byteArray: Uint8Array) => {
      const onMessage = (msg: Message) => { this.lastMessageInFileTime = msg.time }
      this.parseAndDistributeMessages(new MFileReader(byteArray, this.sessionStart), onMessage)
    }

    // assist will pause and skip messages to prevent timestamp related errors
    this.reloadMessageManagers()
    this.windowNodeCounter.reset()

    this.setMessagesLoading(true)
    this.waitingForFiles = true

    return requestEFSDom(this.session.sessionId)
      .then(onData)
      .then(onSuccess)
      .then(this.onFileReadSuccess)
      .catch(this.onFileReadFailed)
      .finally(this.onFileReadFinally)
  }

  private reloadMessageManagers() {
    this.locationEventManager = new ListWalker();
    this.locationManager = new ListWalker();
    this.loadedLocationManager = new ListWalker();
    this.connectionInfoManger = new ListWalker();
    this.clickManager = new ListWalker();
    this.scrollManager = new ListWalker();
    this.resizeManager = new ListWalker();

    this.performanceTrackManager = new PerformanceTrackManager()
    this.windowNodeCounter = new WindowNodeCounter();
    this.pagesManager = new PagesManager(this.screen, this.session.isMobile, this)
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

    if (this.waitingForFiles && this.lastMessageTime <= t) {
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

  private readonly incomingMessages: Message[] = []
  appendMessage(msg: Message, index: number) {
     //TODO: put index in message type
    this.incomingMessages.push(msg)
    if (!this.waitingForFiles) {
      this.distributeMessage(msg, index)
    }
  }

  private distributeMessage(msg: Message, index: number): void {
    const lastMessageTime =  Math.max(msg.time, this.lastMessageTime)
    this.lastMessageTime = lastMessageTime
    this.state.update({ lastMessageTime })
    if (visualChanges.includes(msg.tp)) {
      this.activityManager?.updateAcctivity(msg.time);
    }
    let decoded;
    const time = msg.time;
    switch (msg.tp) {
      case "set_page_location":
        this.locationManager.append(msg);
        if (msg.navigationStart > 0) {
          this.loadedLocationManager.append(msg);
        }
        break;
      case "set_viewport_size":
        this.resizeManager.append(msg);
        break;
      case "mouse_move":
        this.mouseMoveManager.append(msg);
        break;
      case "mouse_click":
        this.clickManager.append(msg);
        break;
      case "set_viewport_scroll":
        this.scrollManager.append(msg);
        break;
      case "performance_track":
        this.performanceTrackManager.append(msg);
        break;
      case "set_page_visibility":
        this.performanceTrackManager.handleVisibility(msg)
        break;
      case "connection_information":
        this.connectionInfoManger.append(msg);
        break;
      case "o_table":
        this.decoder.set(msg.key, msg.value);
        break;
      /* Lists: */
      case "console_log":
        if (msg.level === 'debug') break;
        this.lists.lists.log.append(
          // @ts-ignore : TODO: enums in the message schema
          Log(msg)
        )
        break;
      case "fetch":
        this.lists.lists.fetch.append(Resource({
          method: msg.method,
          url: msg.url,
          payload: msg.request,
          response: msg.response,
          status: msg.status,
          duration: msg.duration,
          type: TYPES.XHR,
          time: Math.max(msg.timestamp - this.sessionStart, 0), // !!! doesn't look good. TODO: find solution to show negative timings
          index,
        }) as Timed)
        break;
      case "redux":
        decoded = this.decodeStateMessage(msg, ["state", "action"]);
        logger.log('redux', decoded)
        if (decoded != null) {
          this.lists.lists.redux.append(decoded);
        }
        break;
      case "ng_rx":
        decoded = this.decodeStateMessage(msg, ["state", "action"]);
        logger.log('ngrx', decoded)
        if (decoded != null) {
          this.lists.lists.ngrx.append(decoded);
        }
        break;
      case "vuex":
        decoded = this.decodeStateMessage(msg, ["state", "mutation"]);
        logger.log('vuex', decoded)
        if (decoded != null) {
          this.lists.lists.vuex.append(decoded);
        }
        break;
      case "zustand":
        decoded = this.decodeStateMessage(msg, ["state", "mutation"])
        logger.log('zustand', decoded)
        if (decoded != null) {
          this.lists.lists.zustand.append(decoded)
        }
      case "mob_x":
        decoded = this.decodeStateMessage(msg, ["payload"]);
        logger.log('mobx', decoded)

        if (decoded != null) {
          this.lists.lists.mobx.append(decoded);
        }
        break;
      case "graph_ql":
        this.lists.lists.graphql.append(msg);
        break;
      case "profiler":
        this.lists.lists.profiles.append(msg);
        break;
      /* ===|=== */
      default:
        switch (msg.tp) {
          case "create_document":
            this.windowNodeCounter.reset();
            this.performanceTrackManager.setCurrentNodesCount(this.windowNodeCounter.count);
            break;
          case "create_text_node":
          case "create_element_node":
            this.windowNodeCounter.addNode(msg.id, msg.parentID);
            this.performanceTrackManager.setCurrentNodesCount(this.windowNodeCounter.count);
            break;
          case "move_node":
            this.windowNodeCounter.moveNode(msg.id, msg.parentID);
            this.performanceTrackManager.setCurrentNodesCount(this.windowNodeCounter.count);
            break;
          case "remove_node":
            this.windowNodeCounter.removeNode(msg.id);
            this.performanceTrackManager.setCurrentNodesCount(this.windowNodeCounter.count);
            break;
        }
        this.performanceTrackManager.addNodeCountPointIfNeed(msg.time)
        this.pagesManager.appendMessage(msg);
        break;
    }
  }

  setMessagesLoading(messagesLoading: boolean) {
    this.screen.display(!messagesLoading);
    this.state.update({ messagesLoading });
  }

  setCSSLoading(cssLoading: boolean) {
    this.screen.displayFrame(!cssLoading);
    this.state.update({ cssLoading });
  }

  private setSize({ height, width }: { height: number, width: number }) {
    this.screen.scale({ height, width });
    this.state.update({ width, height });

    //this.updateMarketTargets()
  }

  // TODO: clean managers?
  clean() {
    this.state.update(MessageManager.INITIAL_STATE);
    this.incomingMessages.length = 0
  }

}
