import * as lstore from './localStorage'

import type { SimpleState } from './PlayerState'

const SPEED_STORAGE_KEY = "__$player-speed$__";
const SKIP_STORAGE_KEY = "__$player-skip$__";
const SKIP_TO_ISSUE_STORAGE_KEY = "__$session-skipToIssue$__";
const AUTOPLAY_STORAGE_KEY = "__$player-autoplay$__";
const SHOW_EVENTS_STORAGE_KEY = "__$player-show-events$__";


const storedSpeed = lstore.number(SPEED_STORAGE_KEY, 1)
const initialSpeed = [1,2,4,8,16].includes(storedSpeed) ? storedSpeed : 1;
const initialSkip = lstore.boolean(SKIP_STORAGE_KEY)
const initialSkipToIssue = lstore.boolean(SKIP_TO_ISSUE_STORAGE_KEY)
const initialAutoplay = lstore.boolean(AUTOPLAY_STORAGE_KEY)
const initialShowEvents = lstore.boolean(SHOW_EVENTS_STORAGE_KEY)

export const INITIAL_STATE = {
  skipToIssue: initialSkipToIssue,
  autoplay: initialAutoplay,
  showEvents: initialShowEvents,
  skip: initialSkip,
  speed: initialSpeed,
}

const KEY_MAP = {
	speed: SPEED_STORAGE_KEY,
	skip: SKIP_STORAGE_KEY,
	skipToIssue: SKIP_TO_ISSUE_STORAGE_KEY,
	autoplay: AUTOPLAY_STORAGE_KEY,
	showEvents: SHOW_EVENTS_STORAGE_KEY,
}

type KeysOfBoolean<T> = keyof T & keyof { [ K in keyof T as T[K] extends boolean ? K : never ] : K };

type Entries<T> = {
    [K in keyof T]: [K, T[K]];
}[keyof T][];

export default class LSCache<G extends Record<string, boolean | number | string> {
	constructor(private state: SimpleState<G>, private keyMap: Record<keyof Partial<G>, string>) {
	}
	update(newState: Partial<G>) {
		for (let [k, v] of Object.entries(newState) as Entries<Partial<G>>) {
			if (k in this.keyMap) {
				// @ts-ignore TODO: nice typing
				//lstore[typeof v](this.keyMap[k], v)
				localStorage.setItem(this.keyMap[k], String(v))
			}
		}
		this.state.update(newState)
	}
	toggle(key: KeysOfBoolean<G>) {
		// @ts-ignore TODO: nice typing
		this.update({ 
			[key]: !this.get()[key] 
		})
	}
	get() {
		return this.state.get()
	}
}