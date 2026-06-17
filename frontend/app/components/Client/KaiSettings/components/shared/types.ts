export type TestStatus = 'pending' | 'approved' | 'paused';
export type RunResult = 'passed' | 'failed';
export type StepStatus = 'passed' | 'failed' | 'skipped';

export interface Environment {
  id: string;
  name: string;
  url: string;
  login?: string;
  password?: string;
}

export interface TestCase {
  key: string;
  title: string;
  steps: string[];
  status: TestStatus;
}

export interface TestStep {
  step: string;
  status: StepStatus;
}

export interface RunData {
  key: string;
  testName: string;
  date: number;
  duration: number;
  result: RunResult;
  steps: TestStep[];
  failedStep?: number;
  envName?: string;
}
