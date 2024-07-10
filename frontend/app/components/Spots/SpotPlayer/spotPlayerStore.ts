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

class SpotPlayerStore {
  time = 0
  isPlaying = false
  isMuted = false
  volume = 1
  isFullScreen = false
  logs: Log[] = []
  locations: Location[] = []
  clicks: Click[] = []
  network: SpotNetworkRequest[] = []
  startTs = 0

  constructor() {
    makeAutoObservable(this)
  }

  setStartTs(ts: number) {
    this.startTs = ts
  }

  setTime(time: number) {
    this.time = time
  }

  setIsPlaying(isPlaying: boolean) {
    this.isPlaying = isPlaying
  }

  setIsMuted(isMuted: boolean) {
    this.isMuted = isMuted
  }

  setVolume(volume: number) {
    this.volume = volume
  }

  setIsFullScreen(isFullScreen: boolean) {
    this.isFullScreen = isFullScreen
  }

  setEvents(logs: Log[], locations: Location[], clicks: Click[], network: SpotNetworkRequest[]) {
    this.logs = logs.map(log => ({ ...log, time: log.time - this.startTs }))
    this.locations = locations.map(location => ({ ...location, time: location.time - this.startTs }))
    this.clicks = clicks.map(click => ({ ...click, time: click.time - this.startTs }))
    this.network = network.map(request => ({ ...request, time: request.time - this.startTs }))
  }
}

const spotPlayerStore = new SpotPlayerStore()

export default spotPlayerStore