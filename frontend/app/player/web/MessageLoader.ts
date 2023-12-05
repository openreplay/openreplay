import type { Store, SessionFilesInfo } from 'Player';
import {IMessageManager} from "Player/player/Animator";
import { decryptSessionBytes } from './network/crypto';
import MFileReader from './messages/MFileReader';
import { loadFiles, requestEFSDom, requestEFSDevtools } from './network/loadFiles';
import type {
  Message,
} from './messages';
import logger from 'App/logger';
import * as fzstd from 'fzstd';


interface State {
  firstFileLoading: boolean,
  domLoading: boolean,
  devtoolsLoading: boolean,
  error: boolean,
}

export default class MessageLoader {
  static INITIAL_STATE: State = {
    firstFileLoading: false,
    domLoading: false,
    devtoolsLoading: false,
    error: false,
  }

  constructor(
    private readonly session: SessionFilesInfo,
    private store: Store<State>,
    private messageManager: IMessageManager,
    private isClickmap: boolean,
    private uiErrorHandler?: { error: (msg: string) => void }
  ) {}

  createNewParser(shouldDecrypt = true, file?: string, toggleStatus?: (isLoading: boolean) => void) {
    const decrypt = shouldDecrypt && this.session.fileKey
      ? (b: Uint8Array) => decryptSessionBytes(b, this.session.fileKey!)
      : (b: Uint8Array) => Promise.resolve(b)
    // Each time called - new fileReader created
    const unarchived = (b: Uint8Array) => {
      const isZstd = b[0] === 0x28 && b[1] === 0xb5 && b[2] === 0x2f && b[3] === 0xfd
      // zstd magical numbers 40 181 47 253
      console.log(isZstd, b[0], b[1], b[2], b[3])
      if (isZstd) {
       return fzstd.decompress(b)
      } else {
        return b
      }
    }
    const fileReader = new MFileReader(new Uint8Array(), this.session.startedAt)
    return (b: Uint8Array) => {
      decrypt(b).then(b => {
        const data = unarchived(b)
        toggleStatus?.(true);
        fileReader.append(data)
        fileReader.checkForIndexes()
        const msgs: Array<Message & { _index?: number }> = []
        for (let msg = fileReader.readNext();msg !== null;msg = fileReader.readNext()) {
          msgs.push(msg)
        }
        const sorted = msgs.sort((m1, m2) => {
          return m1.time - m2.time
        })

        sorted.forEach(msg => {
          this.messageManager.distributeMessage(msg)
        })
        logger.info("Messages count: ", msgs.length, sorted, file)

        this.messageManager._sortMessagesHack(sorted)
        toggleStatus?.(false);
        this.messageManager.setMessagesLoading(false)
      }).catch(e => {
        console.error(e)
        this.uiErrorHandler?.error('Error parsing file: ' + e.message)
      })
    }
  }

  loadDomFiles(urls: string[], parser: (b: Uint8Array) => Promise<void>) {
    if (urls.length > 0) {
      this.store.update({ domLoading: true })
      return loadFiles(urls, parser, true).then(() => this.store.update({ domLoading: false }))
    } else {
      return Promise.resolve()
    }
  }

  loadDevtools(parser: (b: Uint8Array) => Promise<void>) {
    if (!this.isClickmap) {
      this.store.update({ devtoolsLoading: true })
      return loadFiles(this.session.devtoolsURL, parser)
        // TODO: also in case of dynamic update through assist
        .then(() => {
          // @ts-ignore ?
          this.store.update({ ...this.messageManager.getListsFullState(), devtoolsLoading: false });
        })
    } else {
      return Promise.resolve()
    }
  }

  async loadFiles() {
    this.messageManager.startLoading()

    const loadMethod = this.session.domURL && this.session.domURL.length > 0
      ? { url: this.session.domURL, parser: () => this.createNewParser(true, 'dom') }
      : { url: this.session.mobsUrl, parser: () => this.createNewParser(false, 'dom') }

    const parser = loadMethod.parser()
    const devtoolsParser = this.createNewParser(true, 'devtools')
    /**
     * We load first dom mob file before the rest
     * to speed up time to replay
     * but as a tradeoff we have to have some copy-paste
     * for the devtools file
     * */
    try {
      await loadFiles([loadMethod.url[0]], parser)
      const restDomFilesPromise = this.loadDomFiles([...loadMethod.url.slice(1)], parser)
      const restDevtoolsFilesPromise = this.loadDevtools(devtoolsParser)

      await Promise.allSettled([restDomFilesPromise, restDevtoolsFilesPromise])
      this.messageManager.onFileReadSuccess()
    } catch (e) {
      try {
        this.store.update({ domLoading: true, devtoolsLoading: true })
        const efsDomFilePromise = requestEFSDom(this.session.sessionId)
        const efsDevtoolsFilePromise = requestEFSDevtools(this.session.sessionId)

        const [domData, devtoolsData] = await Promise.allSettled([efsDomFilePromise, efsDevtoolsFilePromise])
        const domParser = this.createNewParser(false, 'domEFS')
        const devtoolsParser = this.createNewParser(false, 'devtoolsEFS')
        const parseDomPromise: Promise<any> = domData.status === 'fulfilled'
          ? domParser(domData.value) : Promise.reject('No dom file in EFS')
        const parseDevtoolsPromise: Promise<any> = devtoolsData.status === 'fulfilled'
          ? devtoolsParser(devtoolsData.value) : Promise.reject('No devtools file in EFS')

        await Promise.all([parseDomPromise, parseDevtoolsPromise])
        this.messageManager.onFileReadSuccess()
      } catch (e2) {
        this.messageManager.onFileReadFailed(e)
      }
    } finally {
      this.messageManager.onFileReadFinally()
      this.store.update({ domLoading: false, devtoolsLoading: false })
    }
  }

  clean() {
    this.store.update(MessageLoader.INITIAL_STATE);
  }
}