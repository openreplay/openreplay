import SimpleStore from './_common/SimpleStore'
import type { Store } from './player/types'
import { State as MMState, INITIAL_STATE as MM_INITIAL_STATE } from './_web/MessageManager'
import { State as PState, INITIAL_STATE as PLAYER_INITIAL_STATE } from './player/Player'

import WebPlayer from './_web/WebPlayer'

export function createWebPlayer(session, config): [WebPlayer, Store<PState & MMState>] {
	const store = new SimpleStore<PState & MMState>({
		...PLAYER_INITIAL_STATE,
		...MM_INITIAL_STATE,
	})
	const player = new WebPlayer(store, session, config, false)
	return [player, store]
}


export function createLiveWebPlayer(session, config): [WebPlayer, Store<PState & MMState>] {
	const store = new SimpleStore<PState & MMState>({
		...PLAYER_INITIAL_STATE,
		...MM_INITIAL_STATE,
	})
	const player = new WebPlayer(store, session, config, true)
	return [player, store]
}