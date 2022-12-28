export enum LogLevel {
  INFO = 'info',
  LOG = 'log',
  //ASSERT = 'assert', //?
  WARN = 'warn',
  ERROR = 'error',
  EXCEPTION = 'exception',
}

export interface ILog {
  level: LogLevel
  value: string
  time: number
  index?: number
  errorId?: string
}

export const Log = (log: ILog) => ({
  isRed: () => log.level === LogLevel.EXCEPTION || log.level === LogLevel.ERROR,
  isYellow: () => log.level === LogLevel.WARN,
  ...log
})




// func getResourceType(initiator string, URL string) string {
//   switch initiator {
//   case "xmlhttprequest", "fetch":
//     return "fetch"
//   case "img":
//     return "img"
//   default:
//     switch getURLExtention(URL) {
//     case "css":
//       return "stylesheet"
//     case "js":
//       return "script"
//     case "png", "gif", "jpg", "jpeg", "svg":
//       return "img"
//     case "mp4", "mkv", "ogg", "webm", "avi", "mp3":
//       return "media"
//     default:
//       return "other"
//     }
//   }
// }