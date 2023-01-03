import SimpleStore from './common/SimpleStore'
import type { Store } from './common/types'

import WebPlayer from './web/WebPlayer'
import WebLivePlayer from './web/WebLivePlayer'

type WebState = typeof WebPlayer.INITIAL_STATE
type WebPlayerStore = Store<WebState>
export type IWebPlayer = WebPlayer
export type IWebPlayerStore = WebPlayerStore

type WebLiveState = typeof WebLivePlayer.INITIAL_STATE
type WebLivePlayerStore = Store<WebLiveState>
export type IWebLivePlayer = WebLivePlayer
export type IWebLivePlayerStore = WebLivePlayerStore

export function createWebPlayer(session: Record<string, any>, wrapStore?: (s:IWebPlayerStore) => IWebPlayerStore): [IWebPlayer, IWebPlayerStore] {
	let store: WebPlayerStore = new SimpleStore<WebState>({
		...WebPlayer.INITIAL_STATE,
	})
	if (wrapStore) {
		store = wrapStore(store)
	}

	const player = new WebPlayer(store, session, false)
	return [player, store]
}


export function createLiveWebPlayer(session: Record<string, any>, config: RTCIceServer[], wrapStore?: (s:IWebLivePlayerStore) => IWebLivePlayerStore): [IWebLivePlayer, IWebLivePlayerStore] {
	let store: WebLivePlayerStore = new SimpleStore<WebLiveState>({
		...WebLivePlayer.INITIAL_STATE,
	})
	if (wrapStore) {
		store = wrapStore(store)
	}

	const player = new WebLivePlayer(store, session, config)
	return [player, store]
}
