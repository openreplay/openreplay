import { useSyncExternalStore } from 'react';

import { RunData, RunDefaults } from './types';

export type KaiTab = 'tests' | 'runs' | 'settings';

// Ephemeral, cross-tab UI state — the bits that interact *between* tabs and so can't
// live inside a single tab's local state: the active tab (drawers deep-link across
// tabs), the Settings → Default run configuration (pre-fills new drafts / manual
// tests), and one-shot handoffs from a test drawer to the Runs tab. Server data stays
// in react-query; this holds none of it. Defaults are local-only until a backend
// endpoint exists (see todo.md).
interface KaiUiState {
  activeTab: KaiTab;
  defaults: RunDefaults;
  // set by the test drawer's "View all runs" / "View" (last failed run), read by RunsTab.
  // `handoffId` bumps on each handoff so RunsTab can adopt it exactly once (a new id,
  // not a cleared flag — RunsTab's pane stays mounted between visits).
  runsTestFilter: string | null;
  runsOpenRunKey: string | null;
  handoffId: number;
}

let state: KaiUiState = {
  activeTab: 'tests',
  defaults: { resolution: 'desktop', region: 'paris' },
  runsTestFilter: null,
  runsOpenRunKey: null,
  handoffId: 0,
};

const listeners = new Set<() => void>();
const set = (patch: Partial<KaiUiState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const kaiUi = {
  get: (): KaiUiState => state,
  subscribe: (l: () => void): (() => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },

  setActiveTab: (activeTab: KaiTab) => set({ activeTab }),
  setDefaults: (patch: Partial<RunDefaults>) =>
    set({ defaults: { ...state.defaults, ...patch } }),

  /** "View all runs" on a test — jump to the Runs tab filtered to that test. */
  showRunsForTest: (testName: string) =>
    set({
      activeTab: 'runs',
      runsTestFilter: testName,
      runsOpenRunKey: null,
      handoffId: state.handoffId + 1,
    }),
  /** "View" on the last-failed-run row — jump to the Runs tab, filtered to that test,
   *  with that exact run's drawer already open. */
  openRunInRunsTab: (run: RunData) =>
    set({
      activeTab: 'runs',
      runsTestFilter: run.testName,
      runsOpenRunKey: run.key,
      handoffId: state.handoffId + 1,
    }),
};

export function useKaiUi(): KaiUiState {
  return useSyncExternalStore(kaiUi.subscribe, kaiUi.get);
}
