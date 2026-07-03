// Lifecycle of a test: the agent surfaces a `draft`; the user approves its steps into
// an `approved` test (ready but with no schedule yet); attaching a schedule makes it
// `active`; an active test can be `paused`. Approving and scheduling are two distinct
// steps — `approved` is the state in between.
export type TestLifecycle = 'draft' | 'approved' | 'active' | 'paused';
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

// The preset environment / viewport / region (Settings → Default run configuration)
// that pre-fill a new draft's or manually-created test's run settings.
export interface RunDefaults {
  envName?: string;
  resolution?: Resolution;
  region?: string;
}

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

// One proposed step change in a pending revision, authored against the CURRENT step
// list (indices refer to positions in `TestCase.steps`), so applying is order-stable.
export type StepChange =
  | { type: 'added'; afterIndex: number; text: string } // -1 = before the first step
  | { type: 'removed'; index: number }
  | { type: 'updated'; index: number; text: string };

// A saved snapshot of the steps as they were at `version` — powers the version
// switcher and per-step history. Oldest → newest; the current steps are NOT in here.
export interface TestVersion {
  version: number;
  savedAt: number; // epoch ms
  steps: string[];
}

// The flow changed in real sessions: a new version of the steps is proposed and waits
// for review. While pending, the test reads "Needs review" and scheduled runs pause.
export interface PendingRevision {
  toVersion: number;
  detectedAt: number; // epoch ms
  changes: StepChange[];
}

export interface TestCase {
  key: string;
  title: string;
  steps: string[];
  status: TestLifecycle;
  // an unreviewed draft the user hasn't opened yet — drives the "new" dot in the table
  isNew?: boolean;
  // a test can target a matrix of environments / resolutions / regions; each run
  // (RunData) is one concrete combination from that matrix.
  envNames?: string[];
  resolutions?: Resolution[];
  regions?: string[];
  schedule?: Schedule | null;
  tags?: string[]; // up to 3
  alternatives?: TestAlternative[];
  // status snapshot for active/paused tests — drives the table and health summary
  lastResult?: RunResult;
  lastRunAt?: number; // epoch ms
  recent?: RunResult[]; // most-recent-last, for the trend dots
  // step versioning — steps carry a version (default 1); saved snapshots of older
  // versions live in `history`, and a detected flow change sits in `pendingRevision`
  // until the user reviews it (accept/discard/edit per change → save as vN).
  version?: number;
  history?: TestVersion[];
  pendingRevision?: PendingRevision;
}

export interface TestStep {
  step: string;
  status: StepStatus;
  // a single step can capture several screenshots during execution; the run drawer
  // shows them as a per-step carousel. Defaults to 1 when omitted.
  shots?: number;
}

// Per-run DevTools captured during execution — mirrors what a session shows.
export type ConsoleLevel = 'info' | 'warn' | 'error';
export interface ConsoleLog {
  level: ConsoleLevel;
  text: string;
  time: number; // ms into the run
}

// Per-request timing breakdown (ms), mirroring the HAR phases shown in the viewer.
export interface NetworkTiming {
  dns?: number;
  connect?: number;
  ssl?: number;
  ttfb?: number; // waiting
  download?: number; // content download
}

export interface NetworkRequest {
  method: string;
  url: string;
  name: string; // last path segment / display name
  type: string; // xhr | fetch | script | stylesheet | img | document | media | font
  status: number; // HTTP status; 0 = failed / no response
  size?: number; // bytes
  duration: number; // ms (0 when failed)
  time: number; // ms into the run
  // HAR-style detail, shown when a request is selected in the network panel
  ip?: string;
  protocol?: string; // e.g. "HTTP/2.0"
  requestHeaders?: HttpHeader[];
  responseHeaders?: HttpHeader[];
  payload?: string; // request body (pretty JSON / text)
  response?: string; // response body (pretty JSON / text)
  timing?: NetworkTiming;
}

export interface RunData {
  key: string;
  testName: string;
  version?: number; // which step version the run executed (default 1)
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
