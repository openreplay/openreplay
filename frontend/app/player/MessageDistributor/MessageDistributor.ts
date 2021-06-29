import { Decoder } from "syncod";
import logger from 'App/logger';

import Resource, { TYPES } from 'Types/session/resource'; // MBTODO: player types?
import { TYPES as EVENT_TYPES } from 'Types/session/event';
import Log from 'Types/session/log';
import Profile from 'Types/session/profile';
import ReduxAction from 'Types/session/reduxAction';

import { update } from '../store';
import { 
  init as initListsDepr,
  append as listAppend,
  setStartTime as setListsStartTime 
 } from '../lists';

import StatedScreen from './StatedScreen';

import ListWalker from './managers/ListWalker';
import PagesManager from './managers/PagesManager';
import MouseManager from './managers/MouseManager';

import PerformanceTrackManager from './managers/PerformanceTrackManager';
import WindowNodeCounter from './managers/WindowNodeCounter';
import ActivityManager from './managers/ActivityManager';

import MessageReader from './MessageReader';
import { ID_TP_MAP } from './messages';

import { INITIAL_STATE as PARENT_INITIAL_STATE } from './StatedScreen';

import type Peer from 'peerjs';
import type { TimedMessage } from './Timed';

const LIST_NAMES = [ "redux", "mobx", "vuex", "ngrx", "graphql", "exceptions", "profiles", "longtasks" ] as const;
const LISTS_INITIAL_STATE = {};
LIST_NAMES.forEach(name => {
  LISTS_INITIAL_STATE[`${name}ListNow`] = [];
  LISTS_INITIAL_STATE[`${name}List`] = [];
})
export const INITIAL_STATE = {
  ...PARENT_INITIAL_STATE,
  ...LISTS_INITIAL_STATE,
  performanceChartData: [],
  skipIntervals: [],
} as const;

type ListsObject = {
  [key in typeof LIST_NAMES[number]]: ListWalker<any> //
}

function initLists(): ListsObject {
  const lists: Partial<ListsObject> = {} ;
  for (var i = 0; i < LIST_NAMES.length; i++) {
    lists[ LIST_NAMES[i] ] = new ListWalker();
  }
  return lists as ListsObject;
}


import type { 
  Message,
  SetPageLocation,
  ConnectionInformation,
  SetViewportSize,
  SetViewportScroll,
} from './messages';

interface Timed { //TODO: to common space
  time: number;
}

type ReduxDecoded = Timed & {
  action: {},
  state: {},
  duration: number,
}

export default class MessageDistributor extends StatedScreen {
  // TODO: consistent with the other data-lists
  private readonly locationEventManager: ListWalker<any>/*<LocationEvent>*/ = new ListWalker();
  private readonly locationManager: ListWalker<SetPageLocation & Timed> = new ListWalker();
  private readonly loadedLocationManager: ListWalker<SetPageLocation  & Timed> = new ListWalker();
  private readonly connectionInfoManger: ListWalker<ConnectionInformation  & Timed> = new ListWalker();
  private readonly performanceTrackManager: PerformanceTrackManager = new PerformanceTrackManager();
  private readonly windowNodeCounter: WindowNodeCounter = new WindowNodeCounter();
  private readonly clickManager: ListWalker<Timed> = new ListWalker();

  private readonly resizeManager: ListWalker<SetViewportSize & Timed> = new ListWalker([]);
  private readonly pagesManager: PagesManager;
  private readonly mouseManager: MouseManager;

  private readonly scrollManager: ListWalker<SetViewportScroll & Timed> = new ListWalker();

  private readonly decoder = new Decoder();
  private readonly lists = initLists();

  private activirtManager: ActivityManager | null = null;

  private readonly sessionStart: number;
  private navigationStartOffset: number = 0;
  private lastMessageTime: number = 0;

	constructor(private readonly session: any /*Session*/, jwt: string) {
    super();
    this.pagesManager = new PagesManager(this, this.session.isMobile)
    this.mouseManager = new MouseManager(this);

    this.sessionStart = this.session.startedAt;

    if (this.session.live) {
      // const sockUrl = `wss://live.openreplay.com/1/${ this.session.siteId }/${ this.session.sessionId }/${ jwt }`;
      // this.subscribeOnMessages(sockUrl);
      initListsDepr({})
      this.connectToPeer();
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
          this.locationEventManager.add(e);
        }
        if (e.type === EVENT_TYPES.CLICK) {
          this.clickManager.add(e);
        }
      });
      this.session.errors.forEach(e => {
        this.lists.exceptions.add(e);
      });
      /* === */
      this._loadMessages();
    }
  }

  private peer: Peer | null = null;
  private connectToPeer() {
    this.setMessagesLoading(true);
    import('peerjs').then(({ default: Peer }) => {
      const peer = new Peer();
      this.peer = peer;
      peer.on("open", me => {
        console.log("peer opened", me);
        const id = `3sWXSsqHgSKnEO5YkNJK-${this.session.sessionId}`;
        console.log("trying to connect to", id)
        const conn = peer.connect(id);
        conn.on('open', () => {
          this.setMessagesLoading(false);
          let i = 0;
          console.log("peer connected")
          conn.on('data', (data) => {
            if (!Array.isArray(data)) { return; }
            let time = 0;
            let ts0 = 0;
            (data as Array<Message & { _id: number}>).forEach(msg => {
              msg.tp = ID_TP_MAP[msg._id];  // _id goes from tracker
              if (msg.tp === "timestamp") {
                ts0 = ts0 || msg.timestamp
                time = msg.timestamp - ts0;
                return;
              }
              const tMsg: TimedMessage = Object.assign(msg, {
                time,
                _index: i,
              });
              this.distributeMessage(tMsg, i++);
            });
          });
        });
      });
    });
  }

  callPeer(localStream: MediaStream, cb: (s: MediaStream)=>void): boolean {
    if (!this.peer) { return false; }
    const conn = this.peer.connections[`3sWXSsqHgSKnEO5YkNJK-${this.session.sessionId}`]?.[0];
    if (!conn || !conn.open) { return false; } // Conn not established
    const call =  this.peer.call(conn.peer, localStream);
    console.log('calling...')
    // on refuse?
    call.on('stream', function(stream) {
      cb(stream);
    });
    //@ts-ignore
    this.document?.
        addEventListener("mousemove", ({ x, y }) => {
      conn.send([ x, y ]); // debounce?
    });
    return true;
  }


  // subscribeOnMessages(sockUrl) {
  //   this.setMessagesLoading(true);
  //   const socket = new WebSocket(sockUrl);
  //   socket.binaryType = 'arraybuffer';
  //   socket.onerror = (e) => {
  //     // TODO: reconnect
  //     update({ error: true });
  //   }
  //   socket.onmessage = (socketMessage) => {
  //     const data = new Uint8Array(socketMessage.data);
  //     const msgs = [];
  //     messageGenerator // parseBuffer(msgs, data);
  //     // TODO: count indexes. Now will not work due to wrong indexes
  //     //msgs.forEach(this.distributeMessage); 
  //     this.setMessagesLoading(false);
  //     this.setDisconnected(false);
  //   }
  //   this._socket = socket;
  // }

  _loadMessages(): void {
    const fileUrl: string = this.session.mobsUrl;
    this.setMessagesLoading(true);
    window.fetch(fileUrl)
    .then(r => r.arrayBuffer())
    .then(b => {
      const r = new MessageReader(new Uint8Array(b), this.sessionStart);
      const msgs: Array<Message> = [];

      while (r.hasNext()) {
        const next = r.next();
        if (next != null) {
          this.lastMessageTime = next[0].time;
          this.distributeMessage(next[0], next[1]);
          msgs.push(next[0]);
        }
      }

      // @ts-ignore Hack for upet (TODO: fix ordering in one mutation (removes first))
      const headChildrenIds = msgs.filter(m => m.parentID === 1).map(m => m.id);
      //const createNodeTypes = ["create_text_node", "create_element_node"];
      this.pagesManager.sort((m1, m2) =>{
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
      //

      logger.info("Messages count: ", msgs.length, msgs);

      const stateToUpdate: {[key:string]: any} = {
        performanceChartData: this.performanceTrackManager.chartData,
        performanceAvaliability: this.performanceTrackManager.avaliability,
      };
      this.activirtManager?.end();
      stateToUpdate.skipIntervals = this.activirtManager?.list || [];
      LIST_NAMES.forEach(key => {
        stateToUpdate[ `${ key }List` ] = this.lists[ key ].list;
      });
      update(stateToUpdate);

      this.windowNodeCounter.reset();

      this.setMessagesLoading(false);
    })
    .catch((e) => { 
      logger.error(e);
      this.setMessagesLoading(false);
      update({ error: true });
    }); 
  }

  move(t: number, index?: number):void {
    const stateToUpdate: typeof INITIAL_STATE = {};
    /* == REFACTOR_ME ==  */
    const lastLoadedLocationMsg = this.loadedLocationManager.moveToLast(t, index);
    if (!!lastLoadedLocationMsg) {
      setListsStartTime(lastLoadedLocationMsg.time)
      this.navigationStartOffset = lastLoadedLocationMsg.navigationStart - this.sessionStart;
    }
    const llEvent = this.locationEventManager.moveToLast(t, index);
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
    const lastLocationMsg = this.locationManager.moveToLast(t, index);
    if (!!lastLocationMsg) {
      stateToUpdate.location = lastLocationMsg.url;
    }
    const lastConnectionInfoMsg = this.connectionInfoManger.moveToLast(t, index);
    if (!!lastConnectionInfoMsg) {
      stateToUpdate.connType = lastConnectionInfoMsg.type;
      stateToUpdate.connBandwidth = lastConnectionInfoMsg.downlink;
    }
    const lastPerformanceTrackMessage = this.performanceTrackManager.moveToLast(t, index);
    if (!!lastPerformanceTrackMessage) {
      stateToUpdate.performanceChartTime = lastPerformanceTrackMessage.time;
    }

    LIST_NAMES.forEach(key => {
      const lastMsg = this.lists[ key ].moveToLast(t, key === 'exceptions' ? undefined : index);
      if (lastMsg != null) {
        stateToUpdate[`${key}ListNow`] = this.lists[ key ].listNow;
      }
    });

    update(stateToUpdate);

    /* Sequence of the managers is important here */
    // Preparing the size of "screen"
    const lastResize = this.resizeManager.moveToLast(t, index);
    if (!!lastResize) {
      this.setSize(lastResize)
    }
    this.pagesManager.moveReady(t).then(() => {

      const lastScroll = this.scrollManager.moveToLast(t, index);
      // @ts-ignore ??can't see double inheritance
      if (!!lastScroll && this.window) {
        // @ts-ignore
        this.window.scrollTo(lastScroll.x, lastScroll.y);
      }
      // Moving mouse and setting :hover classes on ready view
      this.mouseManager.move(t); 
      const lastClick = this.clickManager.moveToLast(t);
      // if (!!lastClick) {
      //   this.cursor.click();
      // }
      // After all changes - redraw the marker
      //this.marker.redraw();
    })    
  }

  _decodeMessage(msg, keys: Array<string>) {
    const decoded = {};
    try {
      keys.forEach(key => {
        decoded[ key ] = this.decoder.decode(msg[ key ]);
      });
    } catch (e) {
      logger.error("Error on message decoding: ", e, msg);
      return null;
    }
    return { ...msg, ...decoded };
  }

  /* Binded */
  distributeMessage = (msg: TimedMessage, index: number): void => {
    if ([ 
      "mouse_move",
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
        this.locationManager.add(msg);
        if (msg.navigationStart > 0) {
          this.loadedLocationManager.add(msg);
        }
      break;
      case "set_viewport_size":
        console.log("setvvs", msg)
        this.resizeManager.add(msg);
      break;
      case "mouse_move":
        this.mouseManager.add(msg);
      break;
      case "set_viewport_scroll":
        this.scrollManager.add(msg);
      break;
      case "performance_track":
        this.performanceTrackManager.add(msg);
      break;
      case "set_page_visibility":
        this.performanceTrackManager.handleVisibility(msg)
      break;
      case "connection_information":
        this.connectionInfoManger.add(msg);
      break;
      case "o_table":
        this.decoder.set(msg.key, msg.value);
      break;
      case "redux":
        decoded = this._decodeMessage(msg, ["state", "action"]);
        logger.log(decoded)
        if (decoded != null) {
          this.lists.redux.add(decoded);
        }
      break;
      case "ng_rx":
        decoded = this._decodeMessage(msg, ["state", "action"]);
        logger.log(decoded)
        if (decoded != null) {
          this.lists.ngrx.add(decoded);
        } 
      break;
      case "vuex":
        decoded = this._decodeMessage(msg, ["state", "mutation"]);
        logger.log(decoded)
        if (decoded != null) {
          this.lists.vuex.add(decoded);
        } 
      break;
      case "mob_x":
        decoded = this._decodeMessage(msg, ["payload"]);
        logger.log(decoded)

        if (decoded != null) {
          this.lists.mobx.add(decoded);
        } 
      break;
      case "graph_ql":
        // @ts-ignore some hack? TODO: remove
        msg.duration = 0;
        this.lists.graphql.add(msg);
      break;
      case "profiler":
        this.lists.profiles.add(msg);
      break;
      case "long_task":
        this.lists.longtasks.add({
          ...msg,
          time: msg.timestamp - this.sessionStart,
        });
      break;
      default:
        switch (msg.tp){
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
        this.pagesManager.add(msg);
      break;
    }
  }

  getLastMessageTime():number {
    return this.lastMessageTime;
  }

  getFirstMessageTime():number {
    return 0; //this.pagesManager.minTime;
  }

  // TODO: clean managers?
  clean() {
    // @ts-ignore
    super.clean();
    //if (this._socket) this._socket.close();
    update(INITIAL_STATE);
  }
}