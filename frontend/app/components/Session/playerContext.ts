import { createContext } from 'react';
import {
  IWebPlayer,
  IWebPlayerStore
} from 'Player'

export interface IPlayerContext {
  player: IWebPlayer
  store: IWebPlayerStore,
}
export const defaultContextValue: IPlayerContext = { player: undefined, store: undefined}
export const PlayerContext = createContext<IPlayerContext>(defaultContextValue);
