import SimpleStore from './common/SimpleStore'
import type { Store } from './common/types'

import WebPlayer from './web/WebPlayer'

type WebState = typeof WebPlayer.INITIAL_STATE //?
type WebPlayerStore = Store<WebState>
export type IWebPlayer = WebPlayer
export type IWebPlayerStore = WebPlayerStore

export function createWebPlayer(session: Record<string, any>, wrapStore?: (s:IWebPlayerStore) => IWebPlayerStore): [IWebPlayer, IWebPlayerStore] {
	let store: WebPlayerStore = new SimpleStore<WebState>({
		...WebPlayer.INITIAL_STATE,
	})
	if (wrapStore) {
		store = wrapStore(store)
	}

	const player = new WebPlayer(store, session, null, false)
	return [player, store]
}


export function createLiveWebPlayer(session: Record<string, any>, config: RTCIceServer[], wrapStore?: (s:IWebPlayerStore) => IWebPlayerStore): [IWebPlayer, IWebPlayerStore] {
	let store: WebPlayerStore = new SimpleStore<WebState>({
		...WebPlayer.INITIAL_STATE,
	})
	if (wrapStore) {
		store = wrapStore(store)
	}

	const player = new WebPlayer(store, session, config, true)
	return [player, store]
}
