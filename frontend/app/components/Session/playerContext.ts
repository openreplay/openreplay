import { createContext, Context } from 'react';
import {
  IWebPlayer,
  IIosPlayer,
  IIOSPlayerStore,
  IWebPlayerStore,
  IWebLivePlayer,
  IWebLivePlayerStore,
} from 'Player'

export interface IOSPlayerContext {
  player: IIosPlayer
  store: IIOSPlayerStore
}

export interface IPlayerContext {
  player: IWebPlayer
  store: IWebPlayerStore,
}

export interface ILivePlayerContext {
  player: IWebLivePlayer
  store: IWebLivePlayerStore
}

type WebContextType =
  | IPlayerContext
  | ILivePlayerContext

type MobileContextType = IOSPlayerContext

export const defaultContextValue = { player: undefined, store: undefined }

const ContextProvider = createContext<Partial<WebContextType | MobileContextType>>(defaultContextValue);

export const PlayerContext = ContextProvider as Context<WebContextType>
export const MobilePlayerContext = ContextProvider as Context<MobileContextType>