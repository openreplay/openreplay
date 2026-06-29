// Lifecycle of a test: the agent surfaces a `draft`, the user approves it into an
// `active` test that runs on a schedule, and an active test can be `paused`.
export type TestLifecycle = 'draft' | 'active' | 'paused';
export type RunResult = 'passed' | 'failed';
// A run can still be in flight, hence `running`.
export type RunStatus = 'running' | 'passed' | 'failed';
export type StepStatus =
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'running'
  | 'pending';

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

// How often a test runs. `custom` falls back to the day picker.
export type ScheduleFreq =
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'monthly'
  | 'custom';

// When a test runs.
//  - days: 0=Sun … 6=Sat (daily / weekdays / weekly / custom).
//  - dayOfMonth: 1–28, or 0 = "last day" (monthly only).
//  - time: "HH:mm" (24h).
// A null schedule on an active test means "run manually only" / disabled.
// `freq` is optional on stored data — it's inferred from days/dayOfMonth when absent.
export interface Schedule {
  days: number[];
  time: string;
  freq?: ScheduleFreq;
  dayOfMonth?: number;
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
  // an unreviewed draft the user hasn't opened yet — drives the "new" dot in the table
  isNew?: boolean;
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

// Per-run DevTools captured during execution — mirrors what a session shows.
export type ConsoleLevel = 'info' | 'warn' | 'error';
export interface ConsoleLog {
  level: ConsoleLevel;
  text: string;
  time: number; // ms into the run
}

export interface NetworkRequest {
  method: string;
  url: string;
  name: string; // last path segment / display name
  type: string; // xhr | fetch | script | stylesheet | img | document
  status: number; // HTTP status; 0 = failed / no response
  size?: number; // bytes
  duration: number; // ms (0 when failed)
  time: number; // ms into the run
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
  resolution?: Resolution;
  region?: string;
  tags?: string[];
  console?: ConsoleLog[];
  network?: NetworkRequest[];
}
