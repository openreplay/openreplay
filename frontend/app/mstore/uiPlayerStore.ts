import { makeAutoObservable, observableRef } from 'mobx';

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
export const LONG_TASK = 14;

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
  longTask: LONG_TASK,
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
  LONG_TASK,
] as const;

const CHANGE_SKIP_INTERVAL = 'CHANGE_SKIP_INTERVAL';
const DATA_SOURCE = '__DATA_SOURCE__';

export default class UiPlayerStore {
  fullscreen = false;
  showOnlySearchEvents = false;
  showSearchEventsSwitchButton = false;
  resolvingInputs = false;

  bottomBlock = 0;

  hiddenHints = {
    storage: localStorage.getItem('storageHideHint') || undefined,
    stack: localStorage.getItem('stackHideHint') || undefined,
  };
  skipInterval: 2 | 5 | 10 | 15 | 20 | 30 | 60 = parseInt(
    localStorage.getItem(CHANGE_SKIP_INTERVAL) || '10',
    10,
  ) as 2 | 5 | 10 | 15 | 20 | 30 | 60;
  timelineZoom = {
    enabled: false,
    startTs: 0,
    endTs: 0,
  };

  exportEventsSelection = {
    enabled: false,
    startTs: 0,
    endTs: 0,
  };
  zoomTab: 'overview' | 'journey' | 'issues' | 'errors' = 'overview';
  // @ts-ignore
  dataSource: 'all' | 'current' = localStorage.getItem(DATA_SOURCE) ?? 'all';

  /** The request open in the player's sheet; rows are the list it pages through. */
  requestSheet: {
    rows: any[];
    index: number;
    onIndex?: (index: number) => void;
    onClose?: () => void;
  } | null = null;

  requestSheetHosts = 0;

  /** The click map row under the pointer: its dot on the page is lit. */
  clickMapHot: string | null = null;

  constructor() {
    makeAutoObservable(this, { requestSheet: observableRef });
  }

  setClickMapHot = (selector: string | null) => {
    this.clickMapHot = selector;
  };

  openRequestSheet = (
    rows: any[],
    index: number,
    hooks: { onIndex?: (index: number) => void; onClose?: () => void } = {},
  ) => {
    this.requestSheet = { rows, index, ...hooks };
  };

  setRequestSheetIndex = (index: number) => {
    if (!this.requestSheet) return;
    this.requestSheet = { ...this.requestSheet, index };
    this.requestSheet.onIndex?.(index);
  };

  closeRequestSheet = () => {
    const closing = this.requestSheet;
    this.requestSheet = null;
    closing?.onClose?.();
  };

  setRequestSheetHost = (on: boolean) => {
    this.requestSheetHosts += on ? 1 : -1;
  };

  changeDataSource = (source: 'all' | 'current') => {
    this.dataSource = source;
    localStorage.setItem(DATA_SOURCE, source);
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
    localStorage.setItem(CHANGE_SKIP_INTERVAL, interval.toString());
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

  toggleExportEventsSelection = (payload: ToggleZoomPayload) => {
    this.exportEventsSelection.enabled = payload.enabled;
    this.exportEventsSelection.startTs = payload.range?.[0] ?? 0;
    this.exportEventsSelection.endTs = payload.range?.[1] ?? 0;
  };

  setZoomTab = (tab: 'overview' | 'journey' | 'issues' | 'errors') => {
    this.zoomTab = tab;
  };

  setShowOnlySearchEvents = (show: boolean) => {
    this.showOnlySearchEvents = show;
  };

  setSearchEventsSwitchButton = (show: boolean) => {
    this.showSearchEventsSwitchButton = show;
  };

  setResolvingInputs = (val: boolean) => {
    this.resolvingInputs = val;
  };
}
