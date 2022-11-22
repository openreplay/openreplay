import SimpleStore from './_common/SimpleStore'
import type { Store } from './player/types'
import { State as MMState, INITIAL_STATE as MM_INITIAL_STATE } from './_web/MessageManager'
import Player, { State as PState } from './player/Player'

import WebPlayer from './_web/WebPlayer'

type WebState = PState & MMState
type WebPlayerStore = Store<WebState>
export type IWebState = WebState
export type IWebPlayer = WebPlayer
export type IWebPlayerStore = WebPlayerStore

export function createWebPlayer(session: Record<string, any>, wrapState?: (s:IWebState) => IWebState): [IWebPlayer, IWebPlayerStore] {
	let state: WebState = {
		...Player.INITIAL_STATE,
		...MM_INITIAL_STATE,
	}
	if (wrapState) {
		state = wrapState(state)
	}
	const store: WebPlayerStore = new SimpleStore<WebState>(state)

	const player = new WebPlayer(store, session, null, false)
	return [player, store]
}


export function createLiveWebPlayer(session: Record<string, any>, config: RTCIceServer[], wrapState?: (s:IWebState) => IWebState): [IWebPlayer, IWebPlayerStore] {
	let state: WebState = {
		...Player.INITIAL_STATE,
		...MM_INITIAL_STATE,
	}
	if (wrapState) {
		state = wrapState(state)
	}
	const store: WebPlayerStore = new SimpleStore<WebState>(state)

	const player = new WebPlayer(store, session, config, true)
	return [player, store]
}
