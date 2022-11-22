import SimpleStore from './_common/SimpleStore'
import type { Store } from './player/types'
import { State as MMState, INITIAL_STATE as MM_INITIAL_STATE } from './_web/MessageManager'
import Player, { State as PState } from './player/Player'

import WebPlayer from './_web/WebPlayer'

type WebPlayerStore = Store<PState & MMState>

export function createWebPlayer(session, wrapStore?: (s:WebPlayerStore) => WebPlayerStore): [WebPlayer, WebPlayerStore] {
	let store: WebPlayerStore = new SimpleStore<PState & MMState>({
		...Player.INITIAL_STATE,
		...MM_INITIAL_STATE,
	})
	if (wrapStore) {
		store = wrapStore(store)
	}
	const player = new WebPlayer(store, session, null, false)
	return [player, store]
}


export function createLiveWebPlayer(session, config: RTCIceServer[], wrapStore?: (s:WebPlayerStore) => WebPlayerStore): [WebPlayer, WebPlayerStore] {
	let store: WebPlayerStore = new SimpleStore<PState & MMState>({
		...Player.INITIAL_STATE,
		...MM_INITIAL_STATE,
	})
	if (wrapStore) {
		store = wrapStore(store)
	}
	const player = new WebPlayer(store, session, config, true)
	return [player, store]
}