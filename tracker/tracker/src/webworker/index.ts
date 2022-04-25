import Message from "../messages/message.js";
import { 
  classes,
  SetPageVisibility,
  MouseMove,
} from "../messages/index.js";
import QueueSender from "./QueueSender.js";
import BatchWriter from "./BatchWriter.js";

import type { WorkerMessageData } from "./types.js";


const AUTO_SEND_INTERVAL = 10 * 1000

let sender: QueueSender | null = null
let writer: BatchWriter | null = null

function send(): void {
  if (!writer) {
    return
  }
  writer.finaliseBatch()
}


function reset() {
  if (sendIntervalID !== null) {
    clearInterval(sendIntervalID);
    sendIntervalID = null;
  }
  if (writer) {
    writer.clean()
    writer = null
  }
}

function resetCleanQueue() {
  if (sender) {
    sender.clean()
    sender = null
  } 
  reset()  
}

let sendIntervalID: ReturnType<typeof setInterval> | null = null
let restartTimeoutID: ReturnType<typeof setTimeout>

self.onmessage = ({ data }: MessageEvent<WorkerMessageData>) => {
  if (data == null) {
    send() // TODO: sendAll?
    return
  }

  if (data === "stop") {
    send()
    reset()
    return
  }

  if (Array.isArray(data)) {
    if (!writer) {
      throw new Error("WebWorker: writer not initialised.")
    }
    const w = writer
    // Message[]
    data.forEach((data) => {
      const message: Message = new (<any>classes.get(data._id))();
      Object.assign(message, data)
      if (message instanceof SetPageVisibility) {
        if ( (<any>message).hidden) {
          restartTimeoutID = setTimeout(() => self.postMessage("restart"), 30*60*1000)
        } else {
          clearTimeout(restartTimeoutID)
        }
      }     
      w.writeMessage(message)
    })
    return
  }

  if (data.type === 'start') {
    sender = new QueueSender(
      data.ingestPoint,
      () => { // onUnauthorised
        self.postMessage("restart")
      },
      () => { // onFailure
        resetCleanQueue()
        self.postMessage("failed")
      },
      data.connAttemptCount,
      data.connAttemptGap,
    )
    writer = new BatchWriter(
      data.pageNo,
      data.timestamp,
      // onBatch
      batch => sender && sender.push(batch)
    )
    if (sendIntervalID === null) {
      sendIntervalID = setInterval(send, AUTO_SEND_INTERVAL)
    }
    return
  }

  if (data.type === "auth") {
    if (!sender) {
      throw new Error("WebWorker: sender not initialised. Recieved auth.")
    }
    if (!writer) {
      throw new Error("WebWorker: writer not initialised. Recieved auth.")
    }
    sender.authorise(data.token)
    data.beaconSizeLimit && writer.setBeaconSizeLimit(data.beaconSizeLimit)
    return
  }
};
