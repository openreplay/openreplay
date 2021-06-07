import { classes, BatchMeta, Timestamp, SetPageVisibility, CreateDocument } from '../messages';
import Message from '../messages/message';
import Writer from '../messages/writer';

import type { MessageData } from './types';

// TODO: what if on message overflows? (maybe one option)
const MAX_BATCH_SIZE = 4 * 1e5; // Max 400kB  
const SEND_INTERVAL = 20 * 1000;

const writer: Writer = new Writer(MAX_BATCH_SIZE);

let ingestPoint: string = "";
let token: string = "";
let pageNo: number = 0;
let timestamp: number = 0;
let timeAdjustment: number = 0;
let nextIndex: number = 0;
// TODO: clear logic: isEmpty here means presense of BatchMeta but absence of other  messages
// BatchWriter should be abstracted
let isEmpty: boolean = true; 

function writeBatchMeta(): boolean { // TODO: move to encoder
  return new BatchMeta(pageNo, nextIndex, timestamp).encode(writer)
}

let sendIntervalID: ReturnType<typeof setInterval>;

const sendQueue: Array<Uint8Array> = [];
let busy = false;
let attemptsCount = 0;
let ATTEMPT_TIMEOUT = 8000;
let MAX_ATTEMPTS_COUNT = 10;
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
  req.onerror = function(e) {
    if (attemptsCount >= MAX_ATTEMPTS_COUNT) {
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
  if (isEmpty || token === "" || ingestPoint === "") {
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
  ingestPoint = ""
  token = ""
  clearInterval(sendIntervalID);
  writer.reset();
}

let restartTimeoutID: ReturnType<typeof setTimeout>;

function hasTimestamp(msg: any): msg is { timestamp: number } {
  return typeof msg === 'object' && typeof msg.timestamp === 'number';
}

self.onmessage = ({ data }: MessageEvent) => {
  if (data === null) {
    send();
    return;
  }
  if (data === "stop") {
    send();
    reset();
    return;
  }
  if (!Array.isArray(data)) {
    ingestPoint = data.ingestPoint || ingestPoint;
    token = data.token || token;
    pageNo = data.pageNo || pageNo;
    timestamp = data.startTimestamp || timestamp;
    timeAdjustment = data.timeAdjustment || timeAdjustment;
    MAX_ATTEMPTS_COUNT = data.connAttemptCount || MAX_ATTEMPTS_COUNT;
    ATTEMPT_TIMEOUT = data.connAttemptGap || ATTEMPT_TIMEOUT;
    if (writer.isEmpty()) {
      writeBatchMeta();
    }
    if (sendIntervalID == null) {
      sendIntervalID = setInterval(send, SEND_INTERVAL);
    }
    return;
  }
  data.forEach((data: any) => {
    const message: Message = new (<any>classes.get(data._id))();
    Object.assign(message, data);

    if (message instanceof Timestamp) {
      timestamp = (<any>message).timestamp;
    } else if (message instanceof SetPageVisibility) {
      if ( (<any>message).hidden) {
        restartTimeoutID = setTimeout(() => self.postMessage("restart"), 5*60*1000);
      } else {
        clearTimeout(restartTimeoutID);
      }
    }

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
