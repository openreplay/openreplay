import * as lstore from './localStorage';
import SimpleStore from 'App/player/common/SimpleStore';

const SPEED_STORAGE_KEY = '__$player-speed$__';
const SKIP_STORAGE_KEY = '__$player-skip$__';
const SKIP_TO_ISSUE_STORAGE_KEY = '__$session-skipToIssue$__';
const AUTOPLAY_STORAGE_KEY = '__$player-autoplay$__';
const SHOW_EVENTS_STORAGE_KEY = '__$player-show-events$__';

const storedSpeed = lstore.number(SPEED_STORAGE_KEY, 1);
const initialSpeed = [0.5, 1, 2, 4, 8, 16].includes(storedSpeed) ? storedSpeed : 1;
const initialSkip = lstore.boolean(SKIP_STORAGE_KEY);
const initialSkipToIssue = lstore.boolean(SKIP_TO_ISSUE_STORAGE_KEY);
const initialAutoplay = lstore.boolean(AUTOPLAY_STORAGE_KEY);
const initialShowEvents = lstore.boolean(SHOW_EVENTS_STORAGE_KEY);

const INITIAL_STATE = {
  skipToIssue: initialSkipToIssue,
  autoplay: initialAutoplay,
  showEvents: initialShowEvents,
  skip: initialSkip,
  speed: initialSpeed,
};

const KEY_MAP = {
  skipToIssue: SKIP_TO_ISSUE_STORAGE_KEY,
  autoplay: AUTOPLAY_STORAGE_KEY,
  showEvents: SHOW_EVENTS_STORAGE_KEY,
  skip: SKIP_STORAGE_KEY,
  speed: SPEED_STORAGE_KEY,
} as const

const keys = Object.keys(KEY_MAP) as (keyof typeof KEY_MAP)[];
const booleanKeys = ['skipToIssue', 'autoplay', 'showEvents', 'skip'] as const;
type LSCState = typeof INITIAL_STATE

export default class LSCache {
  static readonly INITIAL_STATE = INITIAL_STATE;
	private readonly state: SimpleStore<typeof LSCache.INITIAL_STATE>;

  constructor() {
    this.state = new SimpleStore<typeof LSCache.INITIAL_STATE>(LSCache.INITIAL_STATE);
  }

  update(newState: Partial<LSCState>) {
    for (let [k, v] of Object.entries(newState) as [keyof LSCState, LSCState[keyof LSCState]][]) {
      if (k in keys) {
        localStorage.setItem(KEY_MAP[k], String(v));
      }
    }
    this.state.update(newState);
  }

  toggle(key: typeof booleanKeys[number]) {
    // @ts-ignore TODO: nice typing
    this.update({
      [key]: !this.get()[key],
    });
  }

  get() {
    return this.state.get();
  }
}
