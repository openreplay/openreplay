import { useSyncExternalStore } from 'react';

import { RunData } from './types';

export type KaiTab = 'tests' | 'runs' | 'settings';

// Ephemeral, cross-tab UI state — only the bits that interact *between* tabs: the active
// tab (drawers deep-link across tabs) and one-shot handoffs from a test drawer to the
// Runs tab. Everything with a real source (run defaults, pause-on-revision) reads from
// react-query (`useSettings` / `useEnvironments`), not here.
interface KaiUiState {
  activeTab: KaiTab;
  // set by the test drawer's "View all runs" / "View" (last failed run), read by RunsTab.
  // `handoffId` bumps on each handoff so RunsTab can adopt it exactly once (a new id,
  // not a cleared flag — RunsTab's pane stays mounted between visits).
  runsTestFilter: string | null;
  runsOpenRunKey: string | null;
  handoffId: number;
  // testId -> epoch ms of a trigger whose run hasn't surfaced in the Runs list yet. The
  // trigger endpoint only acknowledges (no runId), so RunsTab holds its loading state
  // until the row lands rather than rendering a table that is missing the run.
  pendingRuns: Record<string, number>;
}

let state: KaiUiState = {
  activeTab: 'tests',
  runsTestFilter: null,
  runsOpenRunKey: null,
  handoffId: 0,
  pendingRuns: {},
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

  /** "View all runs" on a test — jump to the Runs tab filtered to that test. */
  showRunsForTest: (testName: string) =>
    set({
      activeTab: 'runs',
      runsTestFilter: testName,
      runsOpenRunKey: null,
      handoffId: state.handoffId + 1,
    }),
  /** A manual trigger was accepted; its run row is expected shortly. */
  markRunTriggered: (testId: string) =>
    set({ pendingRuns: { ...state.pendingRuns, [testId]: Date.now() } }),
  /** The run landed in the list (or the wait ran out) — stop holding for it. */
  clearRunTriggered: (testId: string) => {
    if (!(testId in state.pendingRuns)) return;
    const { [testId]: _dropped, ...rest } = state.pendingRuns;
    set({ pendingRuns: rest });
  },

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
