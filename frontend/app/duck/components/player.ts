import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PlayerState {
  fullscreen: boolean;
  bottomBlock: number;
  hiddenHints: {
    storage?: string;
    stack?: string;
  };
  skipInterval: number;
  timelineZoom: {
    enabled: boolean;
    startTs: number;
    endTs: number;
  }
  zoomTab: 'overview' | 'journey' | 'issues' | 'errors',
}

const initialState: PlayerState = {
  fullscreen: false,
  bottomBlock: 0,
  hiddenHints: {
    storage: localStorage.getItem('storageHideHint') || undefined,
    stack: localStorage.getItem('stackHideHint') || undefined,
  },
  skipInterval: parseInt(localStorage.getItem('CHANGE_SKIP_INTERVAL') || '10', 10),
  timelineZoom: {
    enabled: false,
    startTs: 0,
    endTs: 0,
  },
  zoomTab: 'overview',
};

export const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    toggleFullscreen: (state, action: PayloadAction<boolean | undefined>) => {
      state.fullscreen = action.payload !== undefined ? action.payload : !state.fullscreen;
    },
    toggleBottomBlock: (state, action: PayloadAction<number>) => {
      state.bottomBlock = state.bottomBlock !== action.payload && action.payload !== 0 ? action.payload : 0;
    },
    closeBottomBlock: (state) => {
      state.bottomBlock = 0;
    },
    changeSkipInterval: (state, action: PayloadAction<number>) => {
      const skipInterval = action.payload;
      localStorage.setItem('CHANGE_SKIP_INTERVAL', skipInterval.toString());
      state.skipInterval = skipInterval;
    },
    hideHint: (state, action: PayloadAction<'storage' | 'stack'>) => {
      const name = action.payload;
      localStorage.setItem(`${name}HideHint`, 'true');
      state.hiddenHints[name] = 'true';
      state.bottomBlock = 0;
    },
    toggleZoom: (state, action: PayloadAction<ToggleZoomPayload>) => {
      const { enabled, range } = action.payload;
      state.timelineZoom = {
        enabled,
        startTs: range?.[0] || 0,
        endTs: range?.[1] || 0,
      };
    },
    setZoomTab: (state, action: PayloadAction<'overview' | 'journey' | 'issues' | 'errors'>) => {
      state.zoomTab = action.payload;
    }
  },
});

interface ToggleZoomPayload { enabled: boolean, range?: [number, number]}

export const { toggleFullscreen, toggleBottomBlock, changeSkipInterval, hideHint, toggleZoom, setZoomTab, closeBottomBlock } = playerSlice.actions;

export default playerSlice.reducer;

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
] as const;
