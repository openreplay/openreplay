import { classes, BatchMeta, Timestamp, SetPageVisibility, CreateDocument } from "../messages/index.js";
import Message from "../messages/message.js";
import Writer from "../messages/writer.js";

import type { WorkerMessageData } from "../messages/webworker.js";


const SEND_INTERVAL = 10 * 1000;
let BEACON_SIZE_LIMIT = 1e6 // Limit is set in the backend/services/http
let beaconSize = 2 * 1e5; // Default 400kB


let writer: Writer = new Writer(beaconSize);

let ingestPoint: string = "";
let token: string = "";
let pageNo: number = 0;
let timestamp: number = 0;
let timeAdjustment: number = 0;
let nextIndex: number = 0;
// TODO: clear logic: isEmpty here means presence of BatchMeta but absence of other  messages
// BatchWriter should be abstracted
let isEmpty: boolean = true;

function writeBatchMeta(): boolean { // TODO: move to encoder
  return new BatchMeta(pageNo, nextIndex, timestamp).encode(writer)
}

let sendIntervalID: ReturnType<typeof setInterval> | null = null;

const sendQueue: Array<Uint8Array> = [];
let busy = false;
let attemptsCount = 0;
let ATTEMPT_TIMEOUT = 3000;
let MAX_ATTEMPTS_COUNT = 10;

// TODO?: exploit https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon
function sendBatch(batch: Uint8Array):void {
  const xhr = new XMLHttpRequest();
  // TODO:  async=false (3d param) instead of sendQueue array ?
  xhr.open("POST", ingestPoint + "/v1/web/i", false);
  xhr.setRequestHeader("Authorization", "Bearer " + token);
  // xhr.setRequestHeader("Content-Type", "");

  function retry() {
    if (attemptsCount >= MAX_ATTEMPTS_COUNT) {
      reset();
      self.postMessage(null);
      return
    }
    attemptsCount++;
    setTimeout(() => sendBatch(batch), ATTEMPT_TIMEOUT);
  }
  xhr.onreadystatechange = function() {
    if (this.readyState === 4) {
      if (this.status == 0) {
        return; // happens simultaneously with onerror TODO: clear codeflow
      }
      if (this.status === 401) { // Unauthorised (Token expired)
        busy = false
        self.postMessage("restart")
        return
      } else if (this.status >= 400) { // TODO: test workflow. After 400+ it calls /start for some reason
        retry()
        return
      }
      // Success
      attemptsCount = 0
      const nextBatch = sendQueue.shift();
      if (nextBatch) {
        sendBatch(nextBatch);
      } else {
        busy = false;
      }
    }
  };
  xhr.onerror = retry // TODO: when in Offline mode it doesn't handle the error
  // TODO: handle offline exception (?)
  xhr.send(batch.buffer);
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
  if (sendIntervalID !== null) {
    clearInterval(sendIntervalID);
    sendIntervalID = null;
  }
  sendQueue.length = 0;
  writer.reset();
}

let restartTimeoutID: ReturnType<typeof setTimeout>;

function hasTimestamp(msg: any): msg is { timestamp: number } {
  return typeof msg === 'object' && typeof msg.timestamp === 'number';
}

self.onmessage = ({ data }: MessageEvent<WorkerMessageData>) => {
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
    BEACON_SIZE_LIMIT = data.beaconSizeLimit || BEACON_SIZE_LIMIT;
    beaconSize = Math.min(BEACON_SIZE_LIMIT, data.beaconSize || beaconSize);
    if (writer.isEmpty()) {
      writeBatchMeta();
    }
    if (sendIntervalID === null) {
      sendIntervalID = setInterval(send, SEND_INTERVAL);
    }
    return;
  }
  data.forEach((data) => {
    const message: Message = new (<any>classes.get(data._id))();
    Object.assign(message, data);

    if (message instanceof Timestamp) {
      timestamp = (<any>message).timestamp;
    } else if (message instanceof SetPageVisibility) {
      if ( (<any>message).hidden) {
        restartTimeoutID = setTimeout(() => self.postMessage("restart"), 30*60*1000);
      } else {
        clearTimeout(restartTimeoutID);
      }
    }

    writer.checkpoint(); // TODO: encapsulate in writer
    if (!message.encode(writer)) {
      send();
      // writer.reset(); // TODO: semantically clear code
      if (!message.encode(writer)) { // Try to encode within empty state
        // MBTODO: tempWriter for one message?
        while (!message.encode(writer)) {
          if (beaconSize === BEACON_SIZE_LIMIT) {
            console.warn("OpenReplay: beacon size overflow.");
            writer.reset();
            writeBatchMeta();
            return
          }
          beaconSize = Math.min(beaconSize*2, BEACON_SIZE_LIMIT);
          writer = new Writer(beaconSize);
          writeBatchMeta();
        }
      }
    };
    nextIndex++; // TODO: encapsulate in writer
    isEmpty = false;
  });
};
