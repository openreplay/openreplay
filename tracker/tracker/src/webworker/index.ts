import { classes, BatchMeta, Timestamp, SetPageVisibility } from '../messages';
import Message from '../messages/message';
import Writer from '../messages/writer';

// TODO: what if on message overflows? (maybe one option)
const MAX_BATCH_SIZE = 4 * 1e5; // Max 400kB  
const SEND_INTERVAL = 20 * 1000;

const writer: Writer = new Writer(MAX_BATCH_SIZE);

let ingestPoint: string = "";
let token: string = "";
let pageNo: number = 0;
let timestamp: number = 0;
let nextIndex: number = 0;
let isEmpty: boolean = true;

function writeBatchMeta(): boolean { // TODO: move to encoder
  return new BatchMeta(pageNo, nextIndex, timestamp).encode(writer)
}

let sendIntervalID: ReturnType<typeof setInterval>;

const sendQueue: Array<Uint8Array> = [];
let busy = false;
let attemptsCount = 0;
const ATTEMPT_TIMEOUT = 5000;
function sendBatch(batch: Uint8Array):void {
  const req = new XMLHttpRequest();
  req.open("POST", ingestPoint + "/v1/web/i");  // TODO opaque request?
  req.setRequestHeader("Authorization", "Bearer " + token);
  // req.setRequestHeader("Content-Type", "");
  req.onreadystatechange = function() {
    if (this.readyState === 4) {
      if (this.status == 0) {
        return; // happens simultaneously with onerror TODO: clear codeflow
      }
      if (this.status >= 400) {
        reset();
        sendQueue.length = 0;
        if (this.status === 403) { // Unauthorised (Token expired)
          self.postMessage("restart")
          return
        }
        self.postMessage(null);
        return
      }
      //if (this.response == null) 
      const nextBatch = sendQueue.shift();
      if (nextBatch) {
        sendBatch(nextBatch);
      } else {
        busy = false;
      }
    }
  };
  req.onerror = function() {
    if (attemptsCount >= 3) {
      reset();
      self.postMessage(null);
      return
    }
    attemptsCount++;
    setTimeout(() => sendBatch(batch), ATTEMPT_TIMEOUT); 
  }
  req.send(batch);
}

function send(): void {
  if (isEmpty || ingestPoint === "") {
    return;
  }
  const batch = writer.flush();
  if (busy) {
    sendQueue.push(batch);
  } else {
    busy = true;
    sendBatch(batch);
  }
  isEmpty = true;
  writeBatchMeta();
}

function reset() {
  clearInterval(sendIntervalID);
  writer.reset();
}

let restartTimeoutID: ReturnType<typeof setTimeout>;

self.onmessage = ({ data }: MessageEvent) => {
  if (data === null) {
    send();
    return;
  }
  if (!Array.isArray(data)) {
    reset();
    ingestPoint = data.ingestPoint;
    token = data.token;
    pageNo = data.pageNo;
    timestamp = data.startTimestamp;
    writeBatchMeta();
    sendIntervalID = setInterval(send, SEND_INTERVAL);
    return;
  }
  data.forEach((data: any) => {
    const message: Message = new (<any>classes.get(data._id))();

    if (message instanceof Timestamp) {
      timestamp = (<any>message).timestamp;
    } else if (message instanceof SetPageVisibility) {
      if ( (<any>message).hidden) {
        restartTimeoutID = setTimeout(() => self.postMessage("restart"), 5*60*1000);
      } else {
        clearTimeout(restartTimeoutID);
      }
    }

    Object.assign(message, data);
    writer.checkpoint();
    nextIndex++;
    if (message.encode(writer)) {
      isEmpty = false; 
    } else {
      send();
      if (message.encode(writer)) {
        isEmpty = false;
      } else {
        // MAX_BATCH_SIZE overflow by one message
        // TODO: correct handle
        nextIndex--;
        return;
      }
    };
  });
};
