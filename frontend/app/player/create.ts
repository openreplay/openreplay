import SimpleStore from './common/SimpleStore'
import type { Store, SessionFilesInfo } from './common/types'

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

export function createWebPlayer(
	session: SessionFilesInfo,
	wrapStore?: (s:IWebPlayerStore) => IWebPlayerStore,
	uiErrorHandler?: { error: (msg: string) => void }
): [IWebPlayer, IWebPlayerStore] {
	let store: WebPlayerStore = new SimpleStore<WebState>({
		...WebPlayer.INITIAL_STATE,
	})
	if (wrapStore) {
		store = wrapStore(store)
	}

	const player = new WebPlayer(store, session, false, false, uiErrorHandler)
	return [player, store]
}


export function createClickMapPlayer(
	session: SessionFilesInfo,
	wrapStore?: (s:IWebPlayerStore) => IWebPlayerStore,
	uiErrorHandler?: { error: (msg: string) => void }
): [IWebPlayer, IWebPlayerStore] {
	let store: WebPlayerStore = new SimpleStore<WebState>({
		...WebPlayer.INITIAL_STATE,
	})
	if (wrapStore) {
		store = wrapStore(store)
	}

	const player = new WebPlayer(store, session, false, true, uiErrorHandler)
	return [player, store]
}

export function createLiveWebPlayer(
	session: SessionFilesInfo,
	config: RTCIceServer[] | null,
	wrapStore?: (s:IWebLivePlayerStore) => IWebLivePlayerStore,
	uiErrorHandler?: { error: (msg: string) => void }
): [IWebLivePlayer, IWebLivePlayerStore] {
	let store: WebLivePlayerStore = new SimpleStore<WebLiveState>({
		...WebLivePlayer.INITIAL_STATE,
	})
	if (wrapStore) {
		store = wrapStore(store)
	}

	const player = new WebLivePlayer(store, session, config, uiErrorHandler)
	return [player, store]
}
