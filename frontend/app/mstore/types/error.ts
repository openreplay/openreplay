import Session from './session';

export default class Error {
  sessionId: string = '';

  messageId: string = '';

  errorId: string = '';

  projectId: string = '';

  source: string = '';

  name: string = '';

  message: string = '';

  time: string = '';

  function: string = '?';

  stack0InfoString: string = '';

  status: string = '';

  chart: any = [];

  sessions: number = 0;

  users: number = 0;

  firstOccurrence: string = '';

  lastOccurrence: string = '';

  timestamp: string = '';

  constructor() {}
}

function getStck0InfoString(stack: any) {
  const stack0 = stack[0];
  if (!stack0) return '';
  let s = stack0.function || '';
  if (stack0.url) {
    s += ` (${stack0.url})`;
  }
  return s;
}

export interface ErrorInfoData {
  errorId?: string;
  favorite: boolean;
  viewed: boolean;
  source: string;
  name: string;
  message: string;
  stack0InfoString: string;
  status: string;
  parentErrorId?: string;
  users: number;
  sessions: number;
  lastOccurrence: number;
  firstOccurrence: number;
  chart: any[];
  chart24: any[];
  chart30: any[];
  tags: string[];
  customTags: string[];
  lastHydratedSession: Session;
  disabled: boolean;
}

export class ErrorInfo implements ErrorInfoData {
  errorId?: string;

  favorite = false;

  viewed = false;

  source = '';

  name = '';

  message = '';

  stack0InfoString = '';

  status = '';

  parentErrorId?: string;

  users = 0;

  sessions = 0;

  lastOccurrence = Date.now();

  firstOccurrence = Date.now();

  chart: any[] = [];

  chart24: any[] = [];

  chart30: any[] = [];

  tags: string[] = [];

  customTags: string[] = [];

  lastHydratedSession: Session;

  disabled = false;

  constructor(data?: Partial<ErrorInfoData>) {
    if (data) {
      Object.assign(this, data);
    }
    if (data?.lastHydratedSession) {
      this.lastHydratedSession = new Session().fromJson(
        data.lastHydratedSession,
      );
    } else {
      this.lastHydratedSession = new Session();
    }
  }

  static fromJS(data: any): ErrorInfo {
    const { stack, lastHydratedSession, ...other } = data;
    return new ErrorInfo({
      ...other,
      lastHydratedSession: new Session().fromJson(data.lastHydratedSession),
      stack0InfoString: getStck0InfoString(stack || []),
    });
  }
}
