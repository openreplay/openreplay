export interface BugReportPdf {
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
  comment?: string;
  steps: Step[];
  activity: {
    network: NetworkError[];
    console: ConsoleError[];
    clickRage: ClickRage[];
  };
}

export interface EnvData {
  browser: string;
  os: string;
  country: string;
  device: string;
  resolution: string;
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

export interface Step {
  type: string;
  icon: string;
  details: string;
  substeps?: SubStep[];
}

export type SubStep = Note | Error | Request;

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
