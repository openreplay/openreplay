function getStck0InfoString(stack: Stack) {
  const stack0 = stack[0];
  if (!stack0) return "";
  let s = stack0.function || "";
  if (stack0.url) {
    s += ` (${stack0.url})`;
  }
  return s;
}

type Stack = { function: string; url: string }[]

export interface IError {
  sessionId: string
  messageId: string
  timestamp: number
  errorId: string
  projectId: string
  source: string
  name: string
  message: string
  time: number
  function: string
  stack: Stack
}

export default class Error {
  sessionId: IError["sessionId"];
  messageId: IError["messageId"];
  timestamp: IError["timestamp"];
  errorId: IError["errorId"];
  projectId: IError["projectId"];
  source: IError["source"];
  name: IError["name"];
  message: IError["message"];
  time: IError["time"];
  function: IError["function"];

  constructor({ stack, ...rest }: IError) {
    Object.assign(this, {
      ...rest,
      stack0InfoString: getStck0InfoString(stack || []),
      function: (stack && stack[0] && stack[0].function) || '?',
    })
  }
}
