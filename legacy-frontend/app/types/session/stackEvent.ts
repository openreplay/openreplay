export const OPENREPLAY = 'openreplay';
export const SENTRY = 'sentry';
export const DATADOG = 'datadog';
export const STACKDRIVER = 'stackdriver';
export const ROLLBAR = 'rollbar';
export const NEWRELIC = 'newrelic';
export const BUGSNAG = 'bugsnag';
export const CLOUDWATCH = 'cloudwatch';
export const ELASTICSEARCH = 'elasticsearch';
export const SUMOLOGIC = 'sumologic';

export const typeList = [OPENREPLAY, SENTRY, DATADOG, STACKDRIVER, ROLLBAR, BUGSNAG, CLOUDWATCH, ELASTICSEARCH, SUMOLOGIC];

export function isRed(event: IStackEvent) {
  if (!event.payload) return false;
  switch (event.source) {
    case SENTRY:
      return event.payload['event.type'] === 'error';
    case DATADOG:
      return true;
    case STACKDRIVER:
      return false;
    case ROLLBAR:
      return true;
    case NEWRELIC:
      return true;
    case BUGSNAG:
      return true;
    case CLOUDWATCH:
      return true;
    case SUMOLOGIC:
      return false;
    default:
      return event.level === 'error';
  }
}

export interface IStackEvent {
  time: number;
  timestamp: number;
  index: number;
  name: string;
  message: string;
  payload: any;
  source: any;
  level: string;

  isRed: boolean;
}

export default class StackEvent {
  time: IStackEvent["time"]
  index: IStackEvent["index"];
  name: IStackEvent["name"];
  message: IStackEvent["message"];
  payload: IStackEvent["payload"];
  source: IStackEvent["source"];
  level: IStackEvent["level"];

  constructor(evt: IStackEvent) {
    const event = { ...evt, source: evt.source || OPENREPLAY, payload: evt.payload || {} };
    Object.assign(this, {
      ...event,
      isRed: isRed(event),
    });
  }
}
