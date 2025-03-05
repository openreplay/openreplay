import { makeAutoObservable } from 'mobx';

import { getResourceFromNetworkRequest, Log as PLog } from 'App/player';
import { PlayingState } from 'App/player-ui';

interface Event {
  time: number;
  [key: string]: any;
}

interface Log extends Event {
  level: 'log' | 'error' | 'warn' | 'info';
  msg: string;
}

interface Location extends Event {
  location: string;
}

interface Click extends Event {
  label: string;
}

interface SpotNetworkRequest extends Event {
  type: string;
  statusCode: number;
  url: string;
  fromCache: boolean;
  body: string;
  encodedBodySize: number;
  responseBodySize: number;
  duration: number;
  method: string;
}

const mapSpotNetworkToEv = (ev: SpotNetworkRequest): any => {
  const { type, statusCode } = ev;
  const mapType = (type: string) => {
    switch (type) {
      case 'xmlhttprequest':
        return 'xhr';
      case 'fetch':
        return 'fetch';
      case 'graphql':
        return 'graphql';
      case 'resource':
        return 'resource';
      default:
        return 'other';
    }
  };

  const request = JSON.stringify({
    headers: ev.requestHeaders,
    body: ev.body,
  });
  const response = JSON.stringify({
    headers: ev.responseHeaders,
    body: ev.responseBody ?? {
      warn: 'Chrome Manifest V3 -- No response body available in Chrome 93+',
    },
  });
  return {
    ...ev,
    request,
    response,
    type: mapType(type),
    status: statusCode,
  };
};

export const PANELS = {
  CONSOLE: 'CONSOLE',
  NETWORK: 'NETWORK',
  OVERVIEW: 'OVERVIEW',
} as const;

export type PanelType = keyof typeof PANELS;

class SpotPlayerStore {
  time = 0;

  duration = 0;

  durationString = '';

  isPlaying = true;

  state = PlayingState.Playing;

  isMuted = false;

  volume = 1;

  playbackRate = 1;

  isFullScreen = false;

  logs: ReturnType<typeof PLog>[] = [];

  locations: Location[] = [];

  clicks: Click[] = [];

  network: ReturnType<typeof getResourceFromNetworkRequest>[] = [];

  startTs = 0;

  activePanel: PanelType | null = null;

  skipInterval = 10;

  browserVersion: string | null = null;

  resolution: string | null = null;

  platform: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  clearData = () => {
    this.time = 0;
    this.duration = 0;
    this.durationString = '';
    this.isPlaying = true;
    this.state = PlayingState.Playing;
    this.isMuted = false;
    this.volume = 1;
    this.playbackRate = 1;
    this.isFullScreen = false;
    this.logs = [];
    this.locations = [];
    this.clicks = [];
    this.network = [];
    this.startTs = 0;
    this.activePanel = null;
    this.skipInterval = 10;
    this.browserVersion = null;
    this.resolution = null;
    this.platform = null;
  };

  setDeviceData(browserVersion: string, resolution: string, platform: string) {
    this.browserVersion = browserVersion;
    this.resolution = resolution;
    this.platform = platform;
  }

  setSkipInterval = (interval: number) => {
    this.skipInterval = interval;
  };

  setActivePanel(panel: PanelType | null): void {
    this.activePanel = panel;
  }

  setDuration(durString: string) {
    const [minutes, seconds] = durString.split(':').map(Number);
    this.durationString = durString;
    this.duration = minutes * 60 + seconds;
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
  }

  setStartTs(ts: number): void {
    this.startTs = ts;
  }

  setTime(time: number): void {
    this.time = Math.max(0, Math.min(time, this.duration));
  }

  setIsPlaying(isPlaying: boolean): void {
    this.isPlaying = isPlaying;
    this.state = isPlaying ? PlayingState.Playing : PlayingState.Paused;
  }

  onComplete = () => {
    this.state = PlayingState.Completed;
  };

  setIsMuted(isMuted: boolean): void {
    this.isMuted = isMuted;
  }

  setVolume(volume: number): void {
    this.volume = volume;
  }

  setIsFullScreen(isFullScreen: boolean): void {
    this.isFullScreen = isFullScreen;
  }

  setEvents(
    logs: Log[],
    locations: Location[],
    clicks: Click[],
    network: SpotNetworkRequest[],
  ): void {
    this.logs = logs.map((log) =>
      PLog({
        ...log,
        time: log.time - this.startTs,
        value: log.msg,
      }),
    );

    this.locations = locations.map((location) => ({
      ...location,
      time: location.time - this.startTs,
      fcpTime: location.navTiming.fcpTime
        ? Math.round(location.navTiming.fcpTime)
        : null,
      timeToInteractive: location.navTiming.timeToInteractive
        ? Math.round(location.navTiming.timeToInteractive)
        : null,
      visuallyComplete: location.navTiming.visuallyComplete
        ? Math.round(location.navTiming.visuallyComplete)
        : null,
    }));

    this.clicks = clicks.map((click) => ({
      ...click,
      time: click.time - this.startTs,
    }));

    this.network = network.map((request) => {
      const ev = { ...request, timestamp: request.time };
      const req = getResourceFromNetworkRequest(
        mapSpotNetworkToEv(ev),
        this.startTs,
      );
      return {
        ...req,
        timestamp: request.timestamp,
      };
    });
  }

  get currentLogIndex() {
    return this.logs.findIndex((log) => log.time >= this.time);
  }

  getHighlightedEvent<T extends Log | Location | Click | SpotNetworkRequest>(
    time: number,
    events: T[],
  ): { event: T | null; index: number } {
    if (!events.length) {
      return { event: null, index: 0 };
    }
    let highlightedEvent = events[0];
    const currentTs = time * 1000;
    let index = 0;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const nextEvent = events[i + 1];

      if (
        currentTs >= event.time &&
        (!nextEvent || currentTs < nextEvent.time)
      ) {
        highlightedEvent = event;
        index = i;
        break;
      }
    }

    return { event: highlightedEvent, index };
  }

  getClosestLocation(time: number): Location {
    const { event } = this.getHighlightedEvent(time, this.locations);
    return event ?? { location: 'loading', time: 0 };
  }

  getClosestClick(time: number): Click {
    const { event } = this.getHighlightedEvent(time, this.clicks);
    return event ?? { label: 'loading', time: 0 };
  }

  getClosestNetworkIndex(time: number): SpotNetworkRequest {
    // @ts-ignore
    const event = this.getHighlightedEvent(time, this.network);
    // @ts-ignore
    return event ?? { type: 'loading', time: 0 };
  }

  getClosestLog(time: number): Log {
    const { event } = this.getHighlightedEvent(time, this.logs);
    return (
      event ?? {
        msg: 'loading',
        time: 0,
        level: 'info',
      }
    );
  }
}

const spotPlayerStore = new SpotPlayerStore();

export default spotPlayerStore;
