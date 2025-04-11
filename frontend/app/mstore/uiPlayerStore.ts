import { makeAutoObservable } from 'mobx';

interface ToggleZoomPayload {
  enabled: boolean;
  range?: [number, number];
}

export const NONE = 0;
export const CONSOLE = 1;
export const NETWORK = 2;
export const STACKEVENTS = 3;
export const STORAGE = 4;
export const PROFILER = 5;
export const PERFORMANCE = 6;
export const GRAPHQL = 7;
export const FETCH = 8;
export const EXCEPTIONS = 9;
export const INSPECTOR = 11;
export const OVERVIEW = 12;
export const BACKENDLOGS = 13;

export const blocks = {
  none: NONE,
  console: CONSOLE,
  network: NETWORK,
  stackEvents: STACKEVENTS,
  storage: STORAGE,
  profiler: PROFILER,
  performance: PERFORMANCE,
  graphql: GRAPHQL,
  fetch: FETCH,
  exceptions: EXCEPTIONS,
  inspector: INSPECTOR,
  overview: OVERVIEW,
  backendLogs: BACKENDLOGS,
} as const;

export const blockValues = [
  NONE,
  CONSOLE,
  NETWORK,
  STACKEVENTS,
  STORAGE,
  PROFILER,
  PERFORMANCE,
  GRAPHQL,
  FETCH,
  EXCEPTIONS,
  INSPECTOR,
  OVERVIEW,
  BACKENDLOGS,
] as const;

export default class UiPlayerStore {
  fullscreen = false;

  bottomBlock = 0;

  hiddenHints = {
    storage: localStorage.getItem('storageHideHint') || undefined,
    stack: localStorage.getItem('stackHideHint') || undefined,
  };

  skipInterval: 2 | 5 | 10 | 15 | 20 | 30 | 60 = parseInt(
    localStorage.getItem('CHANGE_SKIP_INTERVAL') || '10',
    10,
  ) as 2 | 5 | 10 | 15 | 20 | 30 | 60;

  timelineZoom = {
    enabled: false,
    startTs: 0,
    endTs: 0,
  };

  highlightSelection = {
    enabled: false,
    startTs: 0,
    endTs: 0,
  }
  exportEventsSelection = {
    enabled: false,
    startTs: 0,
    endTs: 0,
  }
  zoomTab: 'overview' | 'journey' | 'issues' | 'errors' = 'overview'
  dataSource: 'all' | 'current' = 'all'

  constructor() {
    makeAutoObservable(this);
  }

  changeDataSource = (source: 'all' | 'current') => {
    this.dataSource = source;
  };

  toggleFullscreen = (val?: boolean) => {
    this.fullscreen = val ?? !this.fullscreen;
  };

  fullscreenOff = () => {
    this.fullscreen = false;
  };

  fullscreenOn = () => {
    this.fullscreen = true;
  };

  toggleBottomBlock = (block: number) => {
    this.bottomBlock = this.bottomBlock === block ? 0 : block;
  };

  closeBottomBlock = () => {
    this.bottomBlock = 0;
  };

  changeSkipInterval = (interval: 2 | 5 | 10 | 15 | 20 | 30 | 60) => {
    localStorage.setItem('CHANGE_SKIP_INTERVAL', interval.toString());
    this.skipInterval = interval;
  };

  hideHint = (hint: 'storage' | 'stack') => {
    this.hiddenHints[hint] = 'true';
    localStorage.setItem(`${hint}HideHint`, 'true');
    this.bottomBlock = 0;
  };

  toggleZoom = (payload: ToggleZoomPayload) => {
    this.timelineZoom.enabled = payload.enabled;
    this.timelineZoom.startTs = payload.range?.[0] ?? 0;
    this.timelineZoom.endTs = payload.range?.[1] ?? 0;
  };

  toggleHighlightSelection = (payload: ToggleZoomPayload) => {
    this.highlightSelection.enabled = payload.enabled;
    this.highlightSelection.startTs = payload.range?.[0] ?? 0;
    this.highlightSelection.endTs = payload.range?.[1] ?? 0;
  };

  toggleExportEventsSelection = (payload: ToggleZoomPayload) => {
    this.exportEventsSelection.enabled = payload.enabled;
    this.exportEventsSelection.startTs = payload.range?.[0] ?? 0;
    this.exportEventsSelection.endTs = payload.range?.[1] ?? 0;
  }

  setZoomTab = (tab: 'overview' | 'journey' | 'issues' | 'errors') => {
    this.zoomTab = tab;
  };
}
