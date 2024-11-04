export interface IErrorStack {
  absPath?: string,
  filename?: string,
  function?: string,
  lineNo?: number,
  colNo?: number,
  offset?: number,
  context?: string
}

export default class ErrorStack {
  absPath: IErrorStack["absPath"]
  filename: IErrorStack["filename"]
  function: IErrorStack["function"]
  lineNo: IErrorStack["lineNo"]
  colNo: IErrorStack["colNo"]
  offset: IErrorStack["offset"]
  context: IErrorStack["context"]

  constructor(es: IErrorStack) {
    Object.assign(this, {
      ...es,
      offset: es.offset || 0,
    })
  }
}