import logger from 'App/logger';

import { decryptSessionBytes } from './network/crypto';
import MFileReader from './messages/MFileReader';
import { loadFiles, requestEFSDom, requestEFSDevtools } from './network/loadFiles';
import type {
  Message,
} from './messages';

import type  { Store } from '../common/types';


interface SessionFilesInfo {
  startedAt: number
  sessionId: string
  
  domURL: string[]
  devtoolsURL: string[]
  mobsUrl: string[] // back-compatibility. TODO: Remove in the 1.11.0
  fileKey: string  | null
}

type State = typeof MessageLoader.INITIAL_STATE

export default class MessageLoader {
  static INITIAL_STATE = {
    firstFileLoading: false,
    domLoading: false,
    devtoolsLoading: false,
  }

  private lastMessageInFileTime: number = 0;

	constructor(
    private readonly session: SessionFilesInfo,
    private store: Store<State>,
    private distributeMessage: (msg: Message, index: number) => void,
  ) {}
  
  private createNewParser(shouldDecrypt=true) {
    const fKey = this.session.fileKey
    const decrypt = shouldDecrypt && fKey
      ? (b: Uint8Array) => decryptSessionBytes(b, fKey)
      : (b: Uint8Array) => Promise.resolve(b)
    // Each time called - new fileReader created. TODO: reuseable decryptor instance
    const fileReader = new MFileReader(new Uint8Array(), this.session.startedAt)
    return (b: Uint8Array) => decrypt(b).then(b => {
      fileReader.append(b)
      const msgs: Array<Message> = []
      for (let msg = fileReader.readNext();msg !== null;msg = fileReader.readNext()) {
        this.distributeMessage(msg, msg._index)
        msgs.push(msg)
      }

      logger.info("Messages loaded: ", msgs.length, msgs)

      //this._sortMessagesHack(fileReader) // TODO
      this.store.update({ firstFileLoading: false }) // How to do it more explicit: on the first file loading?
    })
  }

  requestFallbackDOM = () => 
    requestEFSDom(this.session.sessionId)
    .then(this.createNewParser(false))

	loadDOM() {
    this.store.update({ 
      domLoading: true,
      firstFileLoading: true,
    })

    const loadMethod = this.session.domURL && this.session.domURL.length > 0
      ? { url: this.session.domURL, needsDecryption: true }
      : { url: this.session.mobsUrl, needsDecryption: false }

    return loadFiles(loadMethod.url, this.createNewParser(loadMethod.needsDecryption))
      // EFS fallback
      .catch((e) => this.requestFallbackDOM())
      .finally(() => this.store.update({ domLoading: false }))
  }

  loadDevtools() {
    this.store.update({ devtoolsLoading: true })
    return loadFiles(this.session.devtoolsURL, this.createNewParser())
      // EFS fallback
      .catch(() =>
        requestEFSDevtools(this.session.sessionId)
          .then(this.createNewParser(false))
      )
      .finally(() => this.store.update({ devtoolsLoading: false }))
  }
}
