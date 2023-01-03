import { createContext } from 'react';
import {
  IWebPlayer,
  IWebPlayerStore,
  IWebLivePlayer,
  IWebLivePlayerStore,
} from 'Player'

export interface IPlayerContext {
  player: IWebPlayer | IWebLivePlayer
  store: IWebPlayerStore | IWebLivePlayerStore,
}
export const defaultContextValue = { player: undefined, store: undefined}
// @ts-ignore
export const PlayerContext = createContext<IPlayerContext>(defaultContextValue);
