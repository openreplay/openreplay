import SimpleStore from './common/SimpleStore';
import type { Store, SessionFilesInfo } from './common/types';

import WebPlayer from './web/WebPlayer';
import WebLivePlayer from './web/WebLivePlayer';

import IOSPlayer from 'Player/mobile/IOSPlayer';

type IosState = typeof IOSPlayer.INITIAL_STATE;
type IOSPlayerStore = Store<IosState>;
export type IIosPlayer = IOSPlayer;
export type IIOSPlayerStore = IOSPlayerStore;

type WebState = typeof WebPlayer.INITIAL_STATE;
type WebPlayerStore = Store<WebState>;
export type IWebPlayer = WebPlayer;
export type IWebPlayerStore = WebPlayerStore;

type WebLiveState = typeof WebLivePlayer.INITIAL_STATE;
type WebLivePlayerStore = Store<WebLiveState>;
export type IWebLivePlayer = WebLivePlayer;
export type IWebLivePlayerStore = WebLivePlayerStore;

export function createIOSPlayer(
  session: SessionFilesInfo,
  wrapStore?: (s: IOSPlayerStore) => IOSPlayerStore,
  uiErrorHandler?: { error: (msg: string) => void }
): [IIosPlayer, IOSPlayerStore] {
  let store: IOSPlayerStore = new SimpleStore<IosState>({
    ...IOSPlayer.INITIAL_STATE,
  });
  if (wrapStore) {
    store = wrapStore(store);
  }

  const player = new IOSPlayer(store, session, uiErrorHandler);
  return [player, store];
}

export function createWebPlayer(
  session: SessionFilesInfo,
  wrapStore?: (s: IWebPlayerStore) => IWebPlayerStore,
  uiErrorHandler?: { error: (msg: string) => void }
): [IWebPlayer, IWebPlayerStore] {
  let store: WebPlayerStore = new SimpleStore<WebState>({
    ...WebPlayer.INITIAL_STATE,
  });
  if (wrapStore) {
    store = wrapStore(store);
  }

  const player = new WebPlayer(store, session, false, false, uiErrorHandler);
  return [player, store];
}

export function createClickMapPlayer(
  session: SessionFilesInfo,
  wrapStore?: (s: IWebPlayerStore) => IWebPlayerStore,
  uiErrorHandler?: { error: (msg: string) => void }
): [IWebPlayer, IWebPlayerStore] {
  let store: WebPlayerStore = new SimpleStore<WebState>({
    ...WebPlayer.INITIAL_STATE,
  });
  if (wrapStore) {
    store = wrapStore(store);
  }

  const player = new WebPlayer(store, session, false, true, uiErrorHandler);
  return [player, store];
}

export function createLiveWebPlayer(
	session: SessionFilesInfo,
	config: RTCIceServer[] | null,
	agentId: number,
	projectId: number,
	wrapStore?: (s:IWebLivePlayerStore) => IWebLivePlayerStore,
	uiErrorHandler?: { error: (msg: string) => void }
): [IWebLivePlayer, IWebLivePlayerStore] {
	let store: WebLivePlayerStore = new SimpleStore<WebLiveState>({
		...WebLivePlayer.INITIAL_STATE,
	})
	if (wrapStore) {
		store = wrapStore(store)
	}

	const player = new WebLivePlayer(store, session, config, agentId, projectId, uiErrorHandler)
	return [player, store]
}
