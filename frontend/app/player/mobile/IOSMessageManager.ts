import logger from 'App/logger';
import { getResourceFromNetworkRequest } from "Player";

import type { Store } from 'Player';
import { IMessageManager } from 'Player/player/Animator';

import TouchManager from 'Player/mobile/managers/TouchManager';
import ActivityManager from '../web/managers/ActivityManager';
import Lists, {
  InitialLists,
  INITIAL_STATE as LISTS_INITIAL_STATE,
  State as ListsState,
} from './IOSLists';
import IOSPerformanceTrackManager, { PerformanceChartPoint } from "Player/mobile/managers/IOSPerformanceTrackManager";
import { MType } from '../web/messages';
import type { Message } from '../web/messages';

import Screen, {
  INITIAL_STATE as SCREEN_INITIAL_STATE,
  State as ScreenState,
} from '../web/Screen/Screen';

import { Log } from './types/log'

import type { SkipInterval } from '../web/managers/ActivityManager';

export const performanceWarnings = ['thermalState', 'memoryWarning', 'lowDiskSpace', 'isLowPowerModeEnabled', 'batteryLevel']

const perfWarningFrustrations = {
  thermalState: {
    title: "Overheating",
    icon: "thermometer-sun",
  },
  memoryWarning: {
    title: "High Memory Usage",
    icon: "memory-ios"
  },
  lowDiskSpace: {
    title: "Low Disk Space",
    icon: "low-disc-space"
  },
  isLowPowerModeEnabled: {
    title: "Low Power Mode",
    icon: "battery-charging"
  },
  batteryLevel: {
    title: "Low Battery",
    icon: "battery"
  }
}

export interface State extends ScreenState, ListsState {
  skipIntervals: SkipInterval[];
  performanceChartData: PerformanceChartPoint[];
  performanceChartTime: number;
  location?: string;

  error: boolean;
  messagesLoading: boolean;

  cssLoading: boolean;
  ready: boolean;
  lastMessageTime: number;
  messagesProcessed: boolean;
  eventCount: number;
  updateWarnings: number;
}

const userEvents = [MType.IosSwipeEvent, MType.IosClickEvent, MType.IosInputEvent, MType.IosScreenChanges];

export default class IOSMessageManager implements IMessageManager {
  static INITIAL_STATE: State = {
    ...SCREEN_INITIAL_STATE,
    ...LISTS_INITIAL_STATE,
    updateWarnings: 0,
    eventCount: 0,
    performanceChartData: [],
    performanceChartTime: 0,
    skipIntervals: [],
    error: false,
    ready: false,
    cssLoading: false,
    lastMessageTime: 0,
    messagesProcessed: false,
    messagesLoading: false,
  };

  private activityManager: ActivityManager | null = null;
  private performanceManager = new IOSPerformanceTrackManager();

  private readonly sessionStart: number;
  private lastMessageTime: number = 0;
  private touchManager: TouchManager;
  private lists: Lists;

  constructor(
    private readonly session: Record<string, any>,
    private readonly state: Store<State & { time: number }>,
    private readonly screen: Screen,
    private readonly uiErrorHandler?: { error: (error: string) => void },
    initialLists?: Partial<InitialLists>
  ) {
    this.sessionStart = this.session.startedAt;
    this.lists = new Lists(initialLists);
    this.touchManager = new TouchManager(screen);
    this.activityManager = new ActivityManager(this.session.duration.milliseconds); // only if not-live
  }

  public updateDimensions(dimensions: { width: number; height: number }) {
    this.touchManager.updateDimensions(dimensions);
  }

  public updateLists(lists: Partial<InitialLists>) {
    const exceptions = lists.exceptions
    exceptions?.forEach(e => {
      this.lists.lists.exceptions.insert(e);
      this.lists.lists.log.insert(e)
    })
    lists.frustrations?.forEach(f => {
      this.lists.lists.frustrations.insert(f);
    })

    const eventCount = this.lists.lists.event.count //lists?.event?.length || 0;
    const currentState = this.state.get();
    this.state.update({
      eventCount: currentState.eventCount + eventCount,
      ...this.lists.getFullListsState(),
    });
  }

  /** empty here. Kept for consistency with normal manager */
  sortDomRemoveMessages() {
    return;
  }

  public getListsFullState = () => {
    return  this.lists.getFullListsState();
  }

  private waitingForFiles: boolean = false;
  public onFileReadSuccess = () => {
    let newState: Partial<State> = {
      ...this.state.get(),
      eventCount: this.lists?.lists.event?.length || 0,
      performanceChartData: this.performanceManager.chartData,
      ...this.lists.getFullListsState(),
    }

    if (this.activityManager) {
      this.activityManager.end();
      newState['skipIntervals'] = this.activityManager.list
    }
    this.state.update(newState);
  };

  public onFileReadFailed = (...e: any[]) => {
    logger.error(e);
    this.state.update({error: true});
    this.uiErrorHandler?.error('Error requesting a session file');
  };

  public onFileReadFinally = () => {
    this.waitingForFiles = false;
    this.state.update({messagesProcessed: true});
  };

  public startLoading = () => {
    this.waitingForFiles = true;
    this.state.update({messagesProcessed: false});
    this.setMessagesLoading(true);
  };

  resetMessageManagers() {
    this.touchManager = new TouchManager(this.screen);
    this.activityManager = new ActivityManager(this.session.duration.milliseconds);
  }

  move(t: number): any {
    const stateToUpdate: Record<string, any> = {};

    const lastPerformanceTrackMessage = this.performanceManager.moveGetLast(t);
    if (lastPerformanceTrackMessage) {
      Object.assign(stateToUpdate, {
        performanceChartTime: lastPerformanceTrackMessage.time,
      })
    }

    this.touchManager.move(t);
    if (
      this.waitingForFiles &&
      this.lastMessageTime <= t &&
      t !== this.session.duration.milliseconds
    ) {
      this.setMessagesLoading(true);
    }

    Object.assign(stateToUpdate, this.lists.moveGetState(t))
    Object.assign(stateToUpdate, { performanceListNow: this.lists.lists.performance.listNow })
    Object.keys(stateToUpdate).length > 0 && this.state.update(stateToUpdate);
  }

  distributeMessage = (msg: Message & { tabId: string }): void => {
    const lastMessageTime = Math.max(msg.time, this.lastMessageTime);
    this.lastMessageTime = lastMessageTime;
    this.state.update({lastMessageTime});
    if (userEvents.includes(msg.tp)) {
      this.activityManager?.updateAcctivity(msg.time);
    }

    switch (msg.tp) {
      case MType.IosPerformanceEvent:
        const performanceStats = ['background', 'memoryUsage', 'mainThreadCPU']
        if (performanceStats.includes(msg.name)) {
          this.performanceManager.append(msg);
        }
        if (performanceWarnings.includes(msg.name)) {
          // @ts-ignore
          const item = perfWarningFrustrations[msg.name]
          this.lists.lists.performance.append({
            ...msg,
            name: item.title,
            techName: msg.name,
            icon: item.icon,
            type: 'ios_perf_event'
          } as any)
        }
        break;
      // case MType.IosInputEvent:
      //   console.log('input', msg)
      //   break;
      case MType.IosNetworkCall:
        this.lists.lists.fetch.insert(getResourceFromNetworkRequest(msg, this.sessionStart))
        break;
      case MType.WsChannel:
        this.lists.lists.websocket.insert(msg)
        break;
      case MType.IosEvent:
        // @ts-ignore
        this.lists.lists.event.insert({...msg, source: 'openreplay'});
        break;
      case MType.IosSwipeEvent:
      case MType.IosClickEvent:
        this.touchManager.append(msg);
        break;
      case MType.IosLog:
        const log = {...msg, level: msg.severity}
        // @ts-ignore
        this.lists.lists.log.append(Log(log));
        break;
      default:
        console.log(msg)
        // stuff
        break;
    }
  };

  setMessagesLoading = (messagesLoading: boolean) => {
    this.screen.display(!messagesLoading);
    // @ts-ignore idk
    this.state.update({messagesLoading, ready: !messagesLoading && !this.state.get().cssLoading});
  };

  private setSize({height, width}: { height: number; width: number }) {
    this.screen.scale({height, width});
    this.state.update({width, height});
  }

  // TODO: clean managers?
  clean() {
    this.state.update(IOSMessageManager.INITIAL_STATE);
  }
}
