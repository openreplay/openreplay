import SimpleStore from './_common/SimpleStore'
import type { Store } from './player/types'

import WebPlayer, { State as WebState} from './_web/WebPlayer'

type WebPlayerStore = Store<WebState>
export type IWebState = WebState
export type IWebPlayer = WebPlayer
export type IWebPlayerStore = WebPlayerStore

export function createWebPlayer(session: Record<string, any>, wrapState?: (s:IWebState) => IWebState): [IWebPlayer, IWebPlayerStore] {
	let state: WebState = {
		...WebPlayer.INITIAL_STATE,
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
		...WebPlayer.INITIAL_STATE,
	}
	if (wrapState) {
		state = wrapState(state)
	}
	const store: WebPlayerStore = new SimpleStore<WebState>(state)

	const player = new WebPlayer(store, session, config, true)
	return [player, store]
}
