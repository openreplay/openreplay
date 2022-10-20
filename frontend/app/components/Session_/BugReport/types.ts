import { SeverityLevels } from 'App/mstore/bugReportStore';

export interface BugReportPdf extends ReportDefaults {
  title: string;
  comment?: string;
  severity: SeverityLevels;
  steps: Step[];
  activity: {
    network: NetworkError[];
    console: ConsoleError[];
    clickRage: ClickRage[];
  };
}

export interface ReportDefaults {
  author: string;
  env: EnvData;
  meta: {
    [key: string]: string;
  };
  session: {
    user: string;
    url: string;
    id: string;
  };
}

export interface EnvData {
  Browser: string;
  OS: string;
  Country: string;
  Device: string;
  Resolution: string;
}

export interface NetworkError {
  time: number;
}

export interface ConsoleError {
  time: number;
}

export interface ClickRage {
  time: number;
}

export type SubStep = Note | Error | Request;

export interface Step {
  key: string;
  type: string;
  time: number;
  details: string;
  icon: string;
  substeps?: SubStep[]
}

export interface Note {
  author: string;
  message: string;
  step: 'note';
}

export interface Error {
  timestamp: string;
  error: string;
  step: 'error';
}

export interface Request {
  url: string;
  status: number;
  type: 'GET' | 'POST' | 'PUT' | 'DELETE';
  time: number;
  name: string;
  step: 'request';
}
