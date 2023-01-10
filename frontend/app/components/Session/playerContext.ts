import { createContext } from 'react';
import {
  IWebPlayer,
  IWebPlayerStore,
  IWebLivePlayer,
  IWebLivePlayerStore,
} from 'Player'

export interface IPlayerContext {
  player: IWebPlayer
  store: IWebPlayerStore,
}

export interface ILivePlayerContext {
  player: IWebLivePlayer
  store: IWebLivePlayerStore
}

type ContextType =
  | IPlayerContext
  | ILivePlayerContext
export const defaultContextValue = { player: undefined, store: undefined}
// @ts-ignore
export const PlayerContext = createContext<ContextType>(defaultContextValue);
