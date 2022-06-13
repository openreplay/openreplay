
export default class Error {
    sessionId: string = ''
    messageId: string = ''
    timestamp: string = ''
    errorId: string = ''
    projectId: string = ''
    source: string = ''
    name: string = ''
    message: string = ''
    time: string = ''
    function: string = '?'
    stack0InfoString: string = ''

    constructor() {
    }

    fromJSON(json: any) {
        this.sessionId = json.sessionId
        this.messageId = json.messageId
        this.timestamp = json.timestamp
        this.errorId = json.errorId
        this.projectId = json.projectId
        this.source = json.source
        this.name = json.name
        this.message = json.message
        this.time = json.time
        this.function = json.function
        this.stack0InfoString = getStck0InfoString(json.stack || [])
        return this
    }
}

function getStck0InfoString(stack) {
    const stack0 = stack[0];
    if (!stack0) return "";
    let s = stack0.function || "";
    if (stack0.url) {
      s += ` (${stack0.url})`;
    }
    return s;
  }