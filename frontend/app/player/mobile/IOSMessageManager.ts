import logger from 'App/logger';

import type { Store } from 'Player';
import { IMessageManager } from 'Player/player/Animator';
import ListWalker from '../common/ListWalker';

import TouchManager from 'Player/mobile/managers/TouchManager';
import ActivityManager from '../web/managers/ActivityManager';
import Lists, {
  InitialLists,
  INITIAL_STATE as LISTS_INITIAL_STATE,
  State as ListsState,
} from './IOSLists';

import { MType } from '../web/messages';
import type { Message } from '../web/messages';

import Screen, {
  INITIAL_STATE as SCREEN_INITIAL_STATE,
  State as ScreenState,
} from '../web/Screen/Screen';

import { Log } from './types/log'

import type { SkipInterval } from '../web/managers/ActivityManager';

export interface State extends ScreenState, ListsState {
  skipIntervals: SkipInterval[];
  location?: string;

  error: boolean;
  messagesLoading: boolean;

  cssLoading: boolean;
  ready: boolean;
  lastMessageTime: number;
  messagesProcessed: boolean;
  eventCount: number;
}

const userEvents = [MType.IosSwipeEvent, MType.IosClickEvent, MType.IosScreenChanges];

export default class IOSMessageManager implements IMessageManager {
  static INITIAL_STATE: State = {
    ...SCREEN_INITIAL_STATE,
    ...LISTS_INITIAL_STATE,
    eventCount: 0,
    skipIntervals: [],
    error: false,
    ready: false,
    cssLoading: false,
    lastMessageTime: 0,
    messagesProcessed: false,
    messagesLoading: false,
  };

  private activityManager: ActivityManager | null = null;

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

  public updateLists(lists: Partial<InitialLists>) {
    Object.keys(lists).forEach((k: 'event') => {
      const currentList = this.lists.lists[k];
      lists[k]!.forEach((i) => currentList.insert(i));
    });
    const eventCount = lists?.event?.length || 0;
    const currentState = this.state.get();
    this.state.update({
      eventCount: currentState.eventCount + eventCount,
      ...this.lists.getFullListsState(),
    });
  }

  private setCSSLoading = (cssLoading: boolean) => {
    this.screen.displayFrame(!cssLoading);
    this.state.update({
      cssLoading,
      ready: !this.state.get().messagesLoading && !cssLoading,
    });
  };

  _sortMessagesHack() {
    return;
  }

  private waitingForFiles: boolean = false;
  public onFileReadSuccess = () => {
    if (this.activityManager) {
      this.activityManager.end();
      this.state.update({
        skipIntervals: this.activityManager.list,
        ...this.lists.getFullListsState(),
      });
    }
  };

  public onFileReadFailed = (e: any) => {
    logger.error(e);
    this.state.update({ error: true });
    this.uiErrorHandler?.error('Error requesting a session file');
  };

  public onFileReadFinally = () => {
    this.waitingForFiles = false;
    this.state.update({ messagesProcessed: true });
  };

  public startLoading = () => {
    this.waitingForFiles = true;
    this.state.update({ messagesProcessed: false });
    this.setMessagesLoading(true);
  };

  resetMessageManagers() {
    this.touchManager = new TouchManager(this.screen);
    this.activityManager = new ActivityManager(this.session.duration.milliseconds);
  }

  move(t: number): any {
    // Moving mouse and setting :hover classes on ready view
    this.touchManager.move(t);

    if (
      this.waitingForFiles &&
      this.lastMessageTime <= t &&
      t !== this.session.duration.milliseconds
    ) {
      this.setMessagesLoading(true);
    }
  }

  distributeMessage = (msg: Message & { tabId: string }): void => {
    const lastMessageTime = Math.max(msg.time, this.lastMessageTime);
    this.lastMessageTime = lastMessageTime;
    this.state.update({ lastMessageTime });
    if (userEvents.includes(msg.tp)) {
      this.activityManager?.updateAcctivity(msg.time);
    }
    switch (msg.tp) {
      case MType.IosSwipeEvent:
      case MType.IosClickEvent:
        console.log(msg.time)
        this.touchManager.append(msg);
        break;
      case MType.IosLog:
        // @ts-ignore
        this.lists.lists.log.append(Log(msg));
        break;
      default:
        // stuff
        break;
    }
  };

  setMessagesLoading = (messagesLoading: boolean) => {
    this.screen.display(!messagesLoading);
    // @ts-ignore idk
    this.state.update({ messagesLoading, ready: !messagesLoading && !this.state.get().cssLoading });
  };

  private setSize({ height, width }: { height: number; width: number }) {
    this.screen.scale({ height, width });
    this.state.update({ width, height });
  }

  // TODO: clean managers?
  clean() {
    this.state.update(IOSMessageManager.INITIAL_STATE);
  }
}
