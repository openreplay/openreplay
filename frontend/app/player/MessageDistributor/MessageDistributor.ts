import { Decoder } from "syncod";
import logger from 'App/logger';

import Resource, { TYPES } from 'Types/session/resource'; // MBTODO: player types?
import { TYPES as EVENT_TYPES } from 'Types/session/event';
import Log from 'Types/session/log';

import { update } from '../store';
import {
  init as initListsDepr,
  append as listAppend,
  setStartTime as setListsStartTime
} from '../lists';

import StatedScreen from './StatedScreen/StatedScreen';

import ListWalker from './managers/ListWalker';
import PagesManager from './managers/PagesManager';
import MouseMoveManager from './managers/MouseMoveManager';

import PerformanceTrackManager from './managers/PerformanceTrackManager';
import WindowNodeCounter from './managers/WindowNodeCounter';
import ActivityManager from './managers/ActivityManager';
import AssistManager from './managers/AssistManager';

import MFileReader from './messages/MFileReader';
import loadFiles from './network/loadFiles';

import { INITIAL_STATE as SUPER_INITIAL_STATE, State as SuperState } from './StatedScreen/StatedScreen';
import { INITIAL_STATE as ASSIST_INITIAL_STATE, State as AssistState } from './managers/AssistManager';
import { INITIAL_STATE as LISTS_INITIAL_STATE , LIST_NAMES, initLists } from './Lists';

import type { PerformanceChartPoint } from './managers/PerformanceTrackManager';
import type { SkipInterval } from './managers/ActivityManager';


export interface State extends SuperState, AssistState {
  performanceChartData: PerformanceChartPoint[],
  skipIntervals: SkipInterval[],
  connType?: string,
  connBandwidth?: number,
  location?: string,
  performanceChartTime?: number,

  domContentLoadedTime?: any,
  domBuildingTime?: any,
  loadTime?: any,
}
export const INITIAL_STATE: State = {
  ...SUPER_INITIAL_STATE,
  ...LISTS_INITIAL_STATE,
  ...ASSIST_INITIAL_STATE,
  performanceChartData: [],
  skipIntervals: [],
};


import type {
  Message,
  SetPageLocation,
  ConnectionInformation,
  SetViewportSize,
  SetViewportScroll,
  MouseClick,
} from './messages';

import type { Timed } from './messages/timed';

export default class MessageDistributor extends StatedScreen {
  // TODO: consistent with the other data-lists
  private readonly locationEventManager: ListWalker<any>/*<LocationEvent>*/ = new ListWalker();
  private readonly locationManager: ListWalker<SetPageLocation> = new ListWalker();
  private readonly loadedLocationManager: ListWalker<SetPageLocation> = new ListWalker();
  private readonly connectionInfoManger: ListWalker<ConnectionInformation> = new ListWalker();
  private readonly performanceTrackManager: PerformanceTrackManager = new PerformanceTrackManager();
  private readonly windowNodeCounter: WindowNodeCounter = new WindowNodeCounter();
  private readonly clickManager: ListWalker<MouseClick> = new ListWalker();

  private readonly resizeManager: ListWalker<SetViewportSize> = new ListWalker([]);
  private readonly pagesManager: PagesManager;
  private readonly mouseMoveManager: MouseMoveManager;
  private readonly assistManager: AssistManager;

  private readonly scrollManager: ListWalker<SetViewportScroll> = new ListWalker();

  private readonly decoder = new Decoder();
  private readonly lists = initLists();

  private activirtManager: ActivityManager | null = null;

  private readonly sessionStart: number;
  private navigationStartOffset: number = 0;
  private lastMessageTime: number = 0;

  constructor(private readonly session: any /*Session*/, jwt: string, config, live: boolean) {
    super();
    this.pagesManager = new PagesManager(this, this.session.isMobile)
    this.mouseMoveManager = new MouseMoveManager(this);
    this.assistManager = new AssistManager(session, this, config);

    this.sessionStart = this.session.startedAt;

    if (live) {
      // const sockUrl = `wss://live.openreplay.com/1/${ this.session.siteId }/${ this.session.sessionId }/${ jwt }`;
      // this.subscribeOnMessages(sockUrl);
      initListsDepr({})
      this.assistManager.connect();
    } else {
      this.activirtManager = new ActivityManager(this.session.duration.milliseconds);
      /* == REFACTOR_ME == */
      const eventList = this.session.events.toJSON();
      initListsDepr({
        event: eventList,
        stack: this.session.stackEvents.toJSON(),
        resource: this.session.resources.toJSON(),
      });

      eventList.forEach(e => {
        if (e.type === EVENT_TYPES.LOCATION) { //TODO type system
          this.locationEventManager.append(e);
        }
      });
      this.session.errors.forEach(e => {
        this.lists.exceptions.append(e);
      });
      /* === */
      this.loadMessages();
    }
  }

  private waitingForFiles: boolean = false
  private loadMessages(): void {
    this.setMessagesLoading(true)
    this.waitingForFiles = true

    const r = new MFileReader(new Uint8Array(), this.sessionStart)
    const msgs: Array<Message> = []
    loadFiles(this.session.mobsUrl,
      b => {
        r.append(b)
        let next: ReturnType<MFileReader['next']>
        while (next = r.next()) {
          const [msg, index] = next
          this.distributeMessage(msg, index)
          this.lastMessageTime = Math.max(msg.time, this.lastMessageTime)

          msgs.push(msg)
        }

        logger.info("Messages count: ", msgs.length, msgs)

        // @ts-ignore Hack for upet (TODO: fix ordering in one mutation in tracker(removes first))  
        const headChildrenIds = msgs.filter(m => m.parentID === 1).map(m => m.id);
        this.pagesManager.sort((m1, m2) => {
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

        const stateToUpdate: {[key:string]: any} = {
          performanceChartData: this.performanceTrackManager.chartData,
          performanceAvaliability: this.performanceTrackManager.avaliability,
        } 
        LIST_NAMES.forEach(key => {
          stateToUpdate[ `${ key }List` ] = this.lists[ key ].list
        })
        update(stateToUpdate)
        this.setMessagesLoading(false)
      }
    )
    .then(() => {
      this.windowNodeCounter.reset()
      if (this.activirtManager) {
        this.activirtManager.end()
        update({ 
          skipIntervals: this.activirtManager.list
        })
      }
      this.waitingForFiles = false
      this.setMessagesLoading(false)
    })
    .catch(e => {
      logger.error(e)
      this.waitingForFiles = false
      this.setMessagesLoading(false)
      update({ error: true })
    })
  }

  move(t: number, index?: number): void {
    const stateToUpdate: Partial<State> = {};
    /* == REFACTOR_ME ==  */
    const lastLoadedLocationMsg = this.loadedLocationManager.moveGetLast(t, index);
    if (!!lastLoadedLocationMsg) {
      setListsStartTime(lastLoadedLocationMsg.time)
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

    LIST_NAMES.forEach(key => {
      const lastMsg = this.lists[key].moveGetLast(t, key === 'exceptions' ? undefined : index);
      if (lastMsg != null) {
        stateToUpdate[`${key}ListNow`] = this.lists[key].listNow;
      }
    });

    update(stateToUpdate);

    /* Sequence of the managers is important here */
    // Preparing the size of "screen"
    const lastResize = this.resizeManager.moveGetLast(t, index);
    if (!!lastResize) {
      this.setSize(lastResize)
    }
    this.pagesManager.moveReady(t).then(() => {

      const lastScroll = this.scrollManager.moveGetLast(t, index);
      if (!!lastScroll && this.window) {
        this.window.scrollTo(lastScroll.x, lastScroll.y);
      }
      // Moving mouse and setting :hover classes on ready view
      this.mouseMoveManager.move(t);
      const lastClick = this.clickManager.moveGetLast(t);
      if (!!lastClick && t - lastClick.time < 600) { // happend during last 600ms
        this.cursor.click();
      }
      // After all changes - redraw the marker
      //this.marker.redraw();
    })

    if (this.waitingForFiles && this.lastMessageTime <= t) {
      this.setMessagesLoading(true)
    }
  }

  private decodeMessage(msg, keys: Array<string>) {
    const decoded = {};
    try {
      keys.forEach(key => {
        decoded[key] = this.decoder.decode(msg[key]);
      });
    } catch (e) {
      logger.error("Error on message decoding: ", e, msg);
      return null;
    }
    return { ...msg, ...decoded };
  }

  /* Binded */
  distributeMessage(msg: Message, index: number): void {
    if ([
      "mouse_move",
      "mouse_click",
      "create_element_node", // not a user activity, though visual change
      "set_input_value",
      "set_input_checked",
      "set_viewport_size",
      "set_viewport_scroll",
    ].includes(msg.tp)) {
      this.activirtManager?.updateAcctivity(msg.time);
    }
    //const index = i + index; //?
    let decoded;
    const time = msg.time;
    switch (msg.tp) {
      /* Lists: */
      case "console_log":
        if (msg.level === 'debug') break;
        listAppend("log", Log({
          level: msg.level,
          value: msg.value,
          time,
          index,
        }));
        break;
      case "fetch":
        listAppend("fetch", Resource({
          method: msg.method,
          url: msg.url,
          payload: msg.request,
          response: msg.response,
          status: msg.status,
          duration: msg.duration,
          type: TYPES.FETCH,
          time: msg.timestamp - this.sessionStart, //~
          index,
        }));
        break;
      /* */
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
      case "redux":
        decoded = this.decodeMessage(msg, ["state", "action"]);
        logger.log(decoded)
        if (decoded != null) {
          this.lists.redux.append(decoded);
        }
        break;
      case "ng_rx":
        decoded = this.decodeMessage(msg, ["state", "action"]);
        logger.log(decoded)
        if (decoded != null) {
          this.lists.ngrx.append(decoded);
        }
        break;
      case "vuex":
        decoded = this.decodeMessage(msg, ["state", "mutation"]);
        logger.log(decoded)
        if (decoded != null) {
          this.lists.vuex.append(decoded);
        }
        break;
      case "mob_x":
        decoded = this.decodeMessage(msg, ["payload"]);
        logger.log(decoded)

        if (decoded != null) {
          this.lists.mobx.append(decoded);
        }
        break;
      case "graph_ql":
        this.lists.graphql.append(msg);
        break;
      case "profiler":
        this.lists.profiles.append(msg);
        break;
      case "long_task":
        this.lists.longtasks.append({
          ...msg,
          time: msg.timestamp - this.sessionStart,
        });
        break;
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
        this.pagesManager.appendMessage(msg);
        break;
    }
  }

  getLastMessageTime(): number {
    return this.lastMessageTime;
  }

  getFirstMessageTime(): number {
    return this.pagesManager.minTime;
  }

  // TODO: clean managers?
  clean() {
    super.clean();
    update(INITIAL_STATE);
    this.assistManager.clear();
  }
}