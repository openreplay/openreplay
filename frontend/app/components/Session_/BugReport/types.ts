import { SeverityLevels } from 'App/mstore/bugReportStore';
import { SubItem } from './components/StepsComponents/SubModalItems';

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

export interface BugReportPdf extends ReportDefaults {
  title: string;
  comment?: string;
  severity: SeverityLevels;
  steps: Step[];
  activity: Activity
}

export interface Activity {
  network: NetworkEvent[];
  console: Exception[];
  clickRage: ClickRage[];
};

interface Event {
  time: number;
  key: string;
}

interface NetworkEvent extends Event {
  decodedBodySize: number | null;
  duration: number | null;
  encodedBodySize: number | null;
  headerSize: number | null;
  index?: number;
  method: string;
  name: string;
  payload: string;
  response: string;
  responseBodySize: number;
  score: number;
  status: string;
  success: boolean;
  timewidth: number;
  timings: Record<string, any>;
  ttfb: number;
  type: string;
  url: string;
}

interface Exception extends Event {
  errorId: string;
  function: string;
  key: string;
  message: string;
  messageId: number;
  name: string;
  projectId: number;
  sessionId: number;
  source: string;
  timestamp: number;
}

interface ClickRage extends Event {
  type: 'CLICKRAGE';
  label: string
  targetContent: string,
  target: {
    key: string,
    path: string,
    label: string | null
  },
  count: number
}


export interface EnvData {
  Browser: string;
  OS: string;
  Country: string;
  Device: string;
  Resolution: string;
}

export interface Step {
  key: string;
  type: string;
  time: number;
  details: string;
  icon: string;
  substeps?: SubItem[];
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
