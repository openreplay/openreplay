import { makeAutoObservable } from 'mobx';

interface Event {
  time: number;
  [key: string]: any;
}

interface Log extends Event {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
}

interface Location extends Event {
  location: string;
}

interface Click extends Event {
  label: string;
}

interface SpotNetworkRequest extends Event{
  type: string;
  statusCode: number;
  url: string;
  fromCache: boolean;
  body: string;
}

export const PANELS = {
  CONSOLE: 'CONSOLE',
  NETWORK: 'NETWORK',
} as const

type PanelType = keyof typeof PANELS

class SpotPlayerStore {
  time = 0
  duration = 0
  durationString = ''
  isPlaying = true
  isMuted = false
  volume = 1
  playbackRate = 1
  isFullScreen = false
  logs: Log[] = []
  locations: Location[] = []
  clicks: Click[] = []
  network: SpotNetworkRequest[] = []
  startTs = 0
  activePanel: PanelType | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setActivePanel(panel: PanelType | null): void {
    this.activePanel = panel
  }

  setDuration(durString: string) {
    const [minutes,seconds] = durString.split(':').map(Number)
    this.durationString = durString
    this.duration = minutes * 60 + seconds
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = rate
  }

  setStartTs(ts: number): void {
    this.startTs = ts
  }

  setTime(time: number): void {
    this.time = time
  }

  setIsPlaying(isPlaying: boolean): void {
    this.isPlaying = isPlaying
  }

  setIsMuted(isMuted: boolean): void {
    this.isMuted = isMuted
  }

  setVolume(volume: number): void {
    this.volume = volume
  }

  setIsFullScreen(isFullScreen: boolean): void {
    this.isFullScreen = isFullScreen
  }

  setEvents(logs: Log[], locations: Location[], clicks: Click[], network: SpotNetworkRequest[]): void {
    this.logs = logs.map(log => ({ ...log, time: log.time - this.startTs }))
    this.locations = locations.map(location => ({ ...location, time: location.time - this.startTs }))
    console.log(this.locations)
    this.clicks = clicks.map(click => ({ ...click, time: click.time - this.startTs }))
    this.network = network.map(request => ({ ...request, time: request.time - this.startTs }))
  }

  get currentLogIndex() {
    return this.logs.findIndex(log => log.time >= this.time)
  }

  getHighlightedEvent<T extends (Log | Location | Click | SpotNetworkRequest)>(time: number, events: T[]): T | null {
    if (!events.length) {
      return null
    }
    let highlightedEvent = events[0];
    const currentTs = time * 1000
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const nextEvent = events[i + 1];

      if (currentTs >= event.time && (!nextEvent || currentTs < nextEvent.time)) {
        highlightedEvent = event;
        break;
      }
    }

    return highlightedEvent;
  }

  getClosestLocation(time: number): Location {
    const event = this.getHighlightedEvent(time, this.locations)
    return event ?? { location: "loading", time: 0 }
  }

  getClosestClick(time: number): Click {
    return this.getHighlightedEvent(time, this.clicks) ?? { label: "loading", time: 0 }
  }

  getClosestNetworkIndex(time: number): SpotNetworkRequest {
    // @ts-ignore
    return this.getHighlightedEvent(time, this.network) ?? { type: "loading", time: 0 }
  }

  getClosestLog(time: number): Log {
    return this.getHighlightedEvent(time, this.logs) ?? { message: "loading", time: 0, type: "info" }
  }
}

const spotPlayerStore = new SpotPlayerStore()

export default spotPlayerStore