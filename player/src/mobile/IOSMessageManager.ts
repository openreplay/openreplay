import logger from '../logger';
import { TarFile } from '../common/tarball';
import { FrameSnapshot } from '../common/parseFrames';
import { getResourceFromNetworkRequest } from '../web/types/resource';
import ListWalker from '../common/ListWalker'
import type { Store } from '../index';
import { IMessageManager } from '../player/Animator';

import TouchManager from './managers/TouchManager';
import IOSPerformanceTrackManager, {
  PerformanceChartPoint,
} from './managers/IOSPerformanceTrackManager';
import SnapshotManager from './managers/SnapshotManager';
import ActivityManager from '../web/managers/ActivityManager';
import type { SkipInterval } from '../web/managers/ActivityManager';
import { MType } from '../web/messages';
import type { Message } from '../web/messages';
import Lists, {
  InitialLists,
  INITIAL_STATE as LISTS_INITIAL_STATE,
  State as ListsState,
} from './IOSLists';

import Screen, {
  INITIAL_STATE as SCREEN_INITIAL_STATE,
  State as ScreenState,
} from '../web/Screen/Screen';
import { Log } from './types/log';

export const performanceWarnings = [
  'thermalState',
  'memoryWarning',
  'lowDiskSpace',
  'isLowPowerModeEnabled',
  'batteryLevel',
];

const perfWarningFrustrations = {
  thermalState: {
    title: 'Overheating',
    icon: 'thermometer-sun',
  },
  memoryWarning: {
    title: 'High Memory Usage',
    icon: 'memory-ios',
  },
  lowDiskSpace: {
    title: 'Low Disk Space',
    icon: 'low-disc-space',
  },
  isLowPowerModeEnabled: {
    title: 'Low Power Mode',
    icon: 'battery-charging',
  },
  batteryLevel: {
    title: 'Low Battery',
    icon: 'battery',
  },
};

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
  currentSnapshot: TarFile | FrameSnapshot | null;
  inBackground: boolean;
  orientation: 'portrait' | 'landscapeLeft' | 'landscapeRight';
}

const userEvents = new Set<number>([
  MType.MobileSwipeEvent,
  MType.MobileClickEvent,
  MType.MobileInputEvent,
  MType.MobileScreenChanges,
]);
const performanceStats = new Set(['background', 'memoryUsage', 'mainThreadCPU']);
const performanceWarningsSet = new Set(performanceWarnings);
/** Recorded but not replayed yet. */
const IGNORED_TYPES = new Set<number>([
  MType.MobileBatchMeta,
  MType.MobileScreenChanges,
  MType.MobileInputEvent,
  MType.MobileInternalError,
  MType.MobileIssueEvent,
]);

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
    currentSnapshot: null,
    inBackground: false,
    orientation: 'portrait',
  };

  private activityManager: ActivityManager | null = null;
  private performanceManager = new IOSPerformanceTrackManager();
  private touchManager: TouchManager;
  public snapshotManager: SnapshotManager;

  private readonly sessionStart: number;

  private lastMessageTime: number = 0;

  private lists: Lists;

  private appFocusTracker = new ListWalker<{
    tp: 102;
    time: number;
    timestamp: number;
    value: number;
    name: string;
  }>();
  private orientationManager = new ListWalker<{
    value: number;
    time: number;
  }>();

  private lastMessageTimeScheduled = false;

  private disposed = false;

  private dimensions?: Parameters<TouchManager['updateDimensions']>[0];

  /** Session-level items injected by updateLists, replaced (not duplicated) on every call. */
  private injectedExceptions: any[] = [];

  private injectedFrustrations: any[] = [];

  private warnedTypes = new Set<number>();

  constructor(
    private readonly session: Record<string, any>,
    private readonly state: Store<State & { time: number }>,
    private readonly screen: Screen,
    private readonly uiErrorHandler?: { error: (error: string) => void },
    initialLists?: Partial<InitialLists>,
  ) {
    this.sessionStart = this.session.startedAt;
    this.lists = new Lists(initialLists);
    this.touchManager = new TouchManager(screen);
    this.activityManager = new ActivityManager(
      this.session.duration.milliseconds,
    ); // only if not-live
    this.snapshotManager = new SnapshotManager();
  }

  public updateDimensions(dimensions: {
    width: number;
    height: number;
    sourceWidth?: number;
    sourceHeight?: number;
  }) {
    this.dimensions = dimensions;
    this.touchManager.updateDimensions(dimensions);
  }

  /**
   * Called by the UI whenever session data changes (possibly before any file is
   * parsed and again afterwards), so it replaces what it injected last time.
   */
  public updateLists(lists: Partial<InitialLists>) {
    if (this.disposed) return;
    const { exceptions: exceptionsList, log, frustrations } = this.lists.lists;
    const remove = (walker: typeof log | typeof frustrations, item: any) => {
      const index = walker.list.indexOf(item);
      if (index !== -1) walker.removeAt(index);
    };
    this.injectedExceptions.forEach((e) => {
      remove(exceptionsList, e);
      remove(log, e);
    });
    this.injectedFrustrations.forEach((f) => remove(frustrations, f));

    this.injectedExceptions = lists.exceptions ?? [];
    this.injectedFrustrations = lists.frustrations ?? [];
    this.injectedExceptions.forEach((e) => {
      exceptionsList.insert(e);
      log.insert(e);
    });
    this.injectedFrustrations.forEach((f) => frustrations.insert(f));

    this.state.update({
      eventCount: this.lists.lists.event.length,
      ...this.lists.getFullListsState(),
      ...this.lists.getNowState(),
    });
  }

  /** empty here. Kept for consistency with normal manager */
  sortDomRemoveMessages() {}

  public getListsFullState = () => this.lists.getFullListsState();

  private waitingForFiles: boolean = false;

  public onFileReadSuccess = () => {
    if (this.disposed) return;
    const newState: Partial<State> = {
      eventCount: this.lists.lists.event.length,
      performanceChartData: this.performanceManager.chartData,
      ...this.lists.getFullListsState(),
    };

    if (this.activityManager) {
      this.activityManager.end();
      newState.skipIntervals = this.activityManager.list;
    }
    this.state.update(newState);
  };

  public onFileReadFailed = (...e: any[]) => {
    if (this.disposed) return;
    logger.error(e);
    this.state.update({ error: true });
    this.uiErrorHandler?.error('Error requesting a session file');
  };

  public onFileReadFinally = () => {
    if (this.disposed) return;
    this.waitingForFiles = false;
    this.state.update({ messagesProcessed: true });
  };

  public startLoading = () => {
    this.waitingForFiles = true;
    this.state.update({ messagesProcessed: false });
    this.setMessagesLoading(true);
  };

  resetMessageManagers() {
    const touches = this.touchManager.list;
    this.touchManager.destroy();
    this.touchManager = new TouchManager(this.screen);
    touches.forEach((touch) => this.touchManager.append(touch));
    if (this.dimensions) {
      this.touchManager.updateDimensions(this.dimensions);
    }
    this.activityManager = new ActivityManager(
      this.session.duration.milliseconds,
    );
  }

  move(t: number): any {
    const stateToUpdate: Record<string, any> = {};

    // derive state from the walker position, not from moveGetLast's return:
    // it returns nothing when moving back before the first item
    if (moved(this.performanceManager, t)) {
      stateToUpdate.performanceChartTime =
        this.performanceManager.current?.time ?? 0;
    }
    if (moved(this.appFocusTracker, t)) {
      stateToUpdate.inBackground = this.appFocusTracker.current?.value === 1;
    }
    if (moved(this.orientationManager, t)) {
      const current = this.orientationManager.current;
      stateToUpdate.orientation = current
        ? getMobileOrientation(current.value)
        : 'portrait';
    }

    this.touchManager.move(t);
    if (
      this.waitingForFiles &&
      this.lastMessageTime <= t &&
      t !== this.session.duration.milliseconds
    ) {
      this.setMessagesLoading(true);
    }

    const snapshot = this.snapshotManager.moveReady(t);
    if (snapshot) {
      Object.assign(stateToUpdate, {
        currentSnapshot: snapshot,
      });
    }
    Object.assign(stateToUpdate, this.lists.moveGetState(t));
    Object.keys(stateToUpdate).length > 0 && this.state.update(stateToUpdate);
  }

  private publishLastMessageTime = () => {
    this.lastMessageTimeScheduled = false;
    if (this.disposed) return;
    this.state.update({ lastMessageTime: this.lastMessageTime });
  };

  distributeMessage = (msg: Message & { tabId: string }): void => {
    if ((msg.tp as number) === 9999 || this.disposed) return;
    // @ts-ignore mobile messages carry absolute timestamps
    if (typeof msg.timestamp === 'number') {
      // @ts-ignore
      msg.time = msg.timestamp - this.sessionStart;
    }
    if (msg.time > this.lastMessageTime) {
      this.lastMessageTime = msg.time;
      if (!this.lastMessageTimeScheduled) {
        this.lastMessageTimeScheduled = true;
        queueMicrotask(this.publishLastMessageTime);
      }
    }
    if (userEvents.has(msg.tp)) {
      this.activityManager?.updateAcctivity(msg.time);
    }

    switch (msg.tp) {
      case MType.MobilePerformanceEvent:
        if (performanceStats.has(msg.name)) {
          this.performanceManager.append(msg);
          if (msg.name === 'background') {
            this.appFocusTracker.append(msg);
          }
        }
        // UIDeviceOrientation: only 1-4 are orientations (0 unknown, 5/6 face up/down)
        if (msg.name === 'orientation' && msg.value >= 1 && msg.value <= 4) {
          this.orientationManager.append(msg);
        }
        if (performanceWarningsSet.has(msg.name)) {
          // @ts-ignore
          const item = perfWarningFrustrations[msg.name];
          this.lists.lists.performance.append({
            ...msg,
            name: item.title,
            techName: msg.name,
            icon: item.icon,
            type: 'ios_perf_event',
          } as any);
        }
        break;
      case MType.MobileNetworkCall:
        this.lists.lists.fetch.insert(
          getResourceFromNetworkRequest(msg, this.sessionStart),
        );
        break;
      case MType.WsChannel:
        this.lists.lists.websocket.insert(msg);
        break;
      case MType.MobileEvent:
        // @ts-ignore
        this.lists.lists.event.insert({ ...msg, source: 'openreplay' });
        break;
      case MType.MobileSwipeEvent:
      case MType.MobileClickEvent:
        this.touchManager.append(msg);
        break;
      case MType.MobileLog:
        // @ts-ignore
        this.lists.lists.log.append(Log(msg));
        break;
      case MType.MobileGraphQl:
        this.lists.lists.graphql.insert(msg);
        break;
      default:
        if (!IGNORED_TYPES.has(msg.tp) && !this.warnedTypes.has(msg.tp)) {
          this.warnedTypes.add(msg.tp);
          console.debug('Unrecognized mobile message type', msg.tp);
        }
        break;
    }
  };

  setMessagesLoading = (messagesLoading: boolean) => {
    if (this.disposed) return;
    this.screen.display(!messagesLoading);
    // @ts-ignore idk
    this.state.update({ messagesLoading, ready: !messagesLoading });
  };

  clean() {
    this.disposed = true;
    this.touchManager.destroy();
    this.snapshotManager?.clean();
    this.state.update(IOSMessageManager.INITIAL_STATE);
  }
}

function moved(walker: ListWalker<any>, t: number): boolean {
  const before = walker.countNow;
  walker.moveGetLast(t);
  return walker.countNow !== before;
}

const getMobileOrientation = (orientationRaw: number) => {
  if (orientationRaw === 3) return 'landscapeLeft';
  if (orientationRaw === 4) return 'landscapeRight';

  return 'portrait';
};
