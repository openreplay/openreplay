import { toast } from 'react-toastify';
import logger from 'App/logger';

import { decryptSessionBytes } from '../network/crypto';
import MFileReader from '../messages/MFileReader';
import { loadFiles, requestEFSDom, requestEFSDevtools } from './loadFiles';
import type {
  Message,
} from '../messages';



export default class MessageLoader {
  private lastMessageInFileTime: number = 0;

	constructor(
    private readonly session: any /*Session*/,
    private setMessagesLoading: (flag: boolean) => void,
    private distributeMessage: (msg: Message, index: number) => void,
  ) {}

  requestEFSFile() {
    this.setMessagesLoading(true)
    this.waitingForFiles = true
    const onData = (byteArray: Uint8Array) => {
      const onMessage = (msg: Message) => { this.lastMessageInFileTime = msg.time }
      this.parseAndDistributeMessages(new MFileReader(byteArray, this.session.startedAt), onMessage)
    }

    // assist will pause and skip messages to prevent timestamp related errors
    // ----> this.reloadMessageManagers()
    // ---> this.windowNodeCounter.reset()

    

    return requestEFSDom(this.session.sessionId)
      .then(onData)
      // --->.then(this.onFileReadSuccess)
      // --->.catch(this.onFileReadFailed)
      .finally(this.onFileReadFinally)
  }

  private parseAndDistributeMessages(fileReader: MFileReader, onMessage?: (msg: Message) => void) {
    const msgs: Array<Message> = []
    let next: ReturnType<MFileReader['next']>
    while (next = fileReader.next()) {
      const [msg, index] = next
      this.distributeMessage(msg, index)
      msgs.push(msg)
      onMessage?.(msg)
    }


    logger.info("Messages loaded: ", msgs.length, msgs)

    // @ts-ignore Hack for upet (TODO: fix ordering in one mutation in tracker(removes first))
    //--->// const headChildrenIds = msgs.filter(m => m.parentID === 1).map(m => m.id);
    // this.pagesManager.sortPages((m1, m2) => {
    //   if (m1.time === m2.time) {
    //     if (m1.tp === MType.RemoveNode && m2.tp !== MType.RemoveNode) {
    //       if (headChildrenIds.includes(m1.id)) {
    //         return -1;
    //       }
    //     } else if (m2.tp === MType.RemoveNode && m1.tp !== MType.RemoveNode) {
    //       if (headChildrenIds.includes(m2.id)) {
    //         return 1;
    //       }
    //     }  else if (m2.tp === MType.RemoveNode && m1.tp === MType.RemoveNode) {
    //       const m1FromHead = headChildrenIds.includes(m1.id);
    //       const m2FromHead = headChildrenIds.includes(m2.id);
    //       if (m1FromHead && !m2FromHead) {
    //         return -1;
    //       } else if (m2FromHead && !m1FromHead) {
    //         return 1;
    //       }
    //     }
    //   }
    //   return 0;
    // })
  }

  private waitingForFiles: boolean = false
  //--->// private onFileReadSuccess = () => {
  //   const stateToUpdate : Partial<State>= {
  //     performanceChartData: this.performanceTrackManager.chartData,
  //     performanceAvaliability: this.performanceTrackManager.avaliability,
  //     ...this.lists.getFullListsState(),
  //   }
  //   if (this.activityManager) {
  //     this.activityManager.end()
  //     stateToUpdate.skipIntervals = this.activityManager.list
  //   }
  //   this.state.update(stateToUpdate)
  // }
  //---> private onFileReadFailed = (e: any) => {
  //   this.state.update({ error: true })
  //   logger.error(e)
  //   toast.error('Error requesting a session file')
  // }
  private onFileReadFinally = () => {
    //--->// this.incomingMessages
    //   .filter(msg => msg.time >= this.lastMessageInFileTime)
    //   .forEach(msg => this.distributeMessage(msg, 0))

    this.waitingForFiles = false
    this.setMessagesLoading(false)
  }

  
  private createNewParser(shouldDecrypt=true) {
    const decrypt = shouldDecrypt && this.session.fileKey
      ? (b: Uint8Array) => decryptSessionBytes(b, this.session.fileKey)
      : (b: Uint8Array) => Promise.resolve(b)
    // Each time called - new fileReader created. TODO: reuseable decryptor instance
    const fileReader = new MFileReader(new Uint8Array(), this.session.startedAt)
    return (b: Uint8Array) => decrypt(b).then(b => {
      fileReader.append(b)
      this.parseAndDistributeMessages(fileReader)
      this.setMessagesLoading(false)
    })
  }

	loadDOM() {
    this.setMessagesLoading(true)
    this.waitingForFiles = true

    let fileReadPromise = this.session.domURL && this.session.domURL.length > 0
      ? loadFiles(this.session.domURL, this.createNewParser())
      : Promise.reject()
    
    return fileReadPromise
    // EFS fallback
    .catch(() => requestEFSDom(this.session.sessionId).then(this.createNewParser(false)))
    // old url fallback
    .catch(e => {
      logger.error('Can not get normal session replay file:', e)
      // back compat fallback to an old mobsUrl
      return loadFiles(this.session.mobsUrl, this.createNewParser(false))
    })
    // --->.then(this.onFileReadSuccess)
    // --->.catch(this.onFileReadFailed)
    .finally(this.onFileReadFinally)
  }

  loadDevtools() {
    // load devtools
    if (this.session.devtoolsURL.length) {
      // ---> this.state.update({ devtoolsLoading: true })
      return loadFiles(this.session.devtoolsURL, this.createNewParser())
      .catch(() =>
        requestEFSDevtools(this.session.sessionId)
          .then(this.createNewParser(false))
      )
      //--->// .then(() => {
      //   this.state.update(this.lists.getFullListsState())
      // })
      // --->.catch(e => logger.error("Can not download the devtools file", e))
      // --->//.finally(() => this.state.update({ devtoolsLoading: false }))
    }
    return Promise.resolve()
  }

}