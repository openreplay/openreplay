// Lifecycle of a test: the agent surfaces a `draft`, the user approves it into an
// `active` test that runs on a schedule, and an active test can be `paused`.
export type TestLifecycle = 'draft' | 'active' | 'paused';
export type RunResult = 'passed' | 'failed';
// A run can still be in flight, hence `running`.
export type RunStatus = 'running' | 'passed' | 'failed';
export type StepStatus = 'passed' | 'failed' | 'skipped' | 'running' | 'pending';

export interface HttpHeader {
  name: string;
  value: string;
}

export interface Environment {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  headers?: HttpHeader[];
  ignoreHttpsErrors?: boolean;
}

// Run viewport, simplified to three device classes.
export type Resolution = 'mobile' | 'tablet' | 'desktop';

// When a test runs. days: 0=Sun … 6=Sat. time: "HH:mm" (24h). A null schedule on an
// active test means "run manually only" / disabled.
export interface Schedule {
  days: number[];
  time: string;
}

// An alternative branch the agent observed in real sessions — rendered as a fork
// under the step it diverges from.
export interface TestAlternative {
  afterStep: number;
  note: string;
}

export interface TestCase {
  key: string;
  title: string;
  steps: string[];
  status: TestLifecycle;
  envName?: string;
  schedule?: Schedule | null;
  resolution?: Resolution;
  region?: string;
  tags?: string[]; // up to 3
  alternatives?: TestAlternative[];
  // status snapshot for active/paused tests — drives the table and health summary
  lastResult?: RunResult;
  lastRunAt?: number; // epoch ms
  recent?: RunResult[]; // most-recent-last, for the trend dots
}

export interface TestStep {
  step: string;
  status: StepStatus;
}

export interface RunData {
  key: string;
  testName: string;
  date: number; // when the run started (epoch ms)
  duration?: number; // omitted while running
  status: RunStatus;
  steps: TestStep[];
  failedStep?: number;
  error?: string;
  envName?: string;
  tags?: string[];
}
