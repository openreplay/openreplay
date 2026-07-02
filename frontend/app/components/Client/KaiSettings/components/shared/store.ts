import { useSyncExternalStore } from 'react';

import { MOCK_ENVIRONMENTS, MOCK_TEST_CASES } from './mockData';
import { Environment, TestCase } from './types';

export type KaiTab = 'tests' | 'runs' | 'settings';

// Tests and environments live here (module-level, in-memory — mock data) rather than
// inside their tabs, because they interact across tabs: deleting an environment in
// Settings has to pause tests in the Tests tab, and a test's "View runs" shortcut has
// to switch to the Runs tab pre-filtered.
interface KaiState {
  tests: TestCase[];
  environments: Environment[];
  activeTab: KaiTab;
  // one-shot handoff: set by the test drawer's "View runs", consumed by RunsTab
  runsTestFilter: string | null;
}

let state: KaiState = {
  tests: MOCK_TEST_CASES,
  environments: MOCK_ENVIRONMENTS,
  activeTab: 'tests',
  runsTestFilter: null,
};

const listeners = new Set<() => void>();

const set = (patch: Partial<KaiState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const kaiStore = {
  get: (): KaiState => state,
  subscribe: (l: () => void): (() => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  setTests: (updater: (prev: TestCase[]) => TestCase[]) =>
    set({ tests: updater(state.tests) }),
  setEnvironments: (updater: (prev: Environment[]) => Environment[]) =>
    set({ environments: updater(state.environments) }),

  setActiveTab: (activeTab: KaiTab) => set({ activeTab }),
  /** "View runs" on a test — jump to the Runs tab filtered to that test. */
  showRunsForTest: (testName: string) =>
    set({ activeTab: 'runs', runsTestFilter: testName }),
  clearRunsTestFilter: () => set({ runsTestFilter: null }),

  /** Deleting an environment detaches it from every test. A test left with no
   *  environment at all reads "Not set" — and if it was active, it pauses (there is
   *  nothing to run against) until an environment is set again. Tests that still have
   *  other environments just drop this one and keep running. */
  deleteEnvironment: (env: Environment) => {
    const tests = state.tests.map((tc) => {
      if (!tc.envNames?.includes(env.name)) return tc;
      const envNames = tc.envNames.filter((n) => n !== env.name);
      const next: TestCase = { ...tc, envNames };
      if (envNames.length === 0 && tc.status === 'active')
        next.status = 'paused';
      return next;
    });
    set({
      tests,
      environments: state.environments.filter((e) => e.id !== env.id),
    });
  },
};

/** A test with no environment can't run — gates Resume until one is set. */
export const hasNoEnvironment = (tc: TestCase): boolean =>
  !tc.envNames || tc.envNames.length === 0;

export function useKaiStore(): KaiState {
  return useSyncExternalStore(kaiStore.subscribe, kaiStore.get);
}
