import { createContext } from 'react';
import {
  IWebPlayer,
  IStore
} from 'Player'

export interface IPlayerContext {
  player: IWebPlayer
  store: IStore,
}
export const defaultContextValue: IPlayerContext = { player: undefined, store: undefined}
export const PlayerContext = createContext<IPlayerContext>(defaultContextValue);
