import { useSyncExternalStore } from 'react';

/* UX Audits ("CYUX", Mehdi 06-29/07-01): a long-running JOB over a sample of
   sessions that produces a static, consulting-style artifact (slide deck /
   PDF). The workflow is deliberately simple — the artifact is the product.
   Mock/in-memory, same module-store pattern as KaiSettings. */

export type AuditStatus = 'running' | 'ready';

export interface Audit {
  id: number;
  name: string;
  /** scope chips shown in the table + report cover (segment and/or filters) */
  scope: string[];
  periodDays: 7 | 30 | 90;
  /** sessions matching the scope in the period */
  matched: number;
  /** sessions actually analysed (the sample) */
  sampleSize: number;
  status: AuditStatus;
  /** 0–100 while running */
  progress: number;
  createdBy: string;
  mine: boolean;
  createdAt: number;
  /** composite UX health score, once ready */
  healthScore?: number;
  emailWhenDone?: boolean;
}

const JUL = (day: number, hour = 10) => new Date(2026, 6, day, hour).getTime();

export const MOCK_AUDITS: Audit[] = [
  {
    id: 3,
    name: 'Mobile visitors — July',
    scope: ['Segment: Mobile visitors'],
    periodDays: 7,
    matched: 5320,
    sampleSize: 1000,
    status: 'running',
    progress: 38,
    createdBy: 'You',
    mine: true,
    createdAt: JUL(9, 9),
    emailWhenDone: true,
  },
  {
    id: 2,
    name: 'Checkout & billing — July',
    scope: ['Segment: Billing & checkout', 'Last 30 days'],
    periodDays: 30,
    matched: 8140,
    sampleSize: 2000,
    status: 'ready',
    progress: 100,
    createdBy: 'You',
    mine: true,
    createdAt: JUL(7, 15),
    healthScore: 67,
  },
  {
    id: 1,
    name: 'Full traffic baseline — June',
    scope: ['Full traffic', '30 days'],
    periodDays: 30,
    matched: 58200,
    sampleSize: 2000,
    status: 'ready',
    progress: 100,
    createdBy: 'Mehdi',
    mine: false,
    createdAt: JUL(1, 11),
    healthScore: 71,
  },
];

interface AuditsState {
  audits: Audit[];
}

let state: AuditsState = { audits: MOCK_AUDITS };

const listeners = new Set<() => void>();
const set = (patch: Partial<AuditsState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const auditsStore = {
  get: (): AuditsState => state,
  subscribe: (l: () => void): (() => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  byId(id?: number): Audit | undefined {
    return id == null ? undefined : state.audits.find((a) => a.id === id);
  },

  start(
    audit: Pick<
      Audit,
      'name' | 'scope' | 'periodDays' | 'matched' | 'sampleSize' | 'emailWhenDone'
    >,
  ): Audit {
    const id = Math.max(0, ...state.audits.map((a) => a.id)) + 1;
    const created: Audit = {
      ...audit,
      id,
      status: 'running',
      progress: 2,
      createdBy: 'You',
      mine: true,
      createdAt: Date.now(),
    };
    set({ audits: [created, ...state.audits] });
    return created;
  },

  /** demo liveness — the list page ticks running audits forward; returns the
      audits that finished on this tick so the UI can announce them */
  advance(): Audit[] {
    const finished: Audit[] = [];
    const audits = state.audits.map((a) => {
      if (a.status !== 'running') return a;
      const progress = Math.min(100, a.progress + 2 + Math.round(Math.random() * 5));
      if (progress >= 100) {
        const done: Audit = {
          ...a,
          progress: 100,
          status: 'ready',
          healthScore: 60 + Math.round(Math.random() * 20),
        };
        finished.push(done);
        return done;
      }
      return { ...a, progress };
    });
    if (finished.length || audits.some((a, i) => a !== state.audits[i]))
      set({ audits });
    return finished;
  },

  remove(id: number) {
    set({ audits: state.audits.filter((a) => a.id !== id) });
  },
};

export function useAuditsStore(): AuditsState {
  return useSyncExternalStore(auditsStore.subscribe, auditsStore.get);
}
