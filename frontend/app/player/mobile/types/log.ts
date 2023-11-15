export const enum LogLevel {
  INFO = 'info',
  LOG = 'log',
  //ASSERT = 'assert', //?
  WARN = 'warn',
  ERROR = 'error',
  EXCEPTION = 'exception',
}

export interface ILog {
  content: string;
  severity: "info" | "log" | "warn" | "error" | "exception";
  time: number;
  timestamp: number;
  tp: number;
  _index: number;
}

export const Log = (log: ILog) => ({
  isRed: log.severity === LogLevel.EXCEPTION || log.severity === LogLevel.ERROR,
  isYellow: log.severity === LogLevel.WARN,
  value: log.content,
  ...log
})

// content
//   :
//   ">>>POST:https://foss.openreplay.com/ingest/v1/mobile/i\n<<<\n"
// length
//   :
//   65
// severity
//   :
//   "info"
// tabId
//   :
//   "back-compatability"
// time
//   :
//   10048
// timestamp
//   :
//   1692966743780
// tp
//   :
//   103
// _index
//   :
//   50