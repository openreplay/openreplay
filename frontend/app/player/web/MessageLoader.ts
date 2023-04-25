import type { Store } from 'Player';
import { decryptSessionBytes } from './network/crypto';
import MFileReader from './messages/MFileReader';
import { loadFiles, requestEFSDom, requestEFSDevtools } from './network/loadFiles';
import type {
  Message,
} from './messages';
import logger from 'App/logger';
import MessageManager from "Player/web/MessageManager";


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
    private messageManager: MessageManager,
    private isClickmap: boolean,
  ) {}

  createNewParser(shouldDecrypt = true, file?: string, onReady?: () => void) {
    const decrypt = shouldDecrypt && this.session.fileKey
      ? (b: Uint8Array) => decryptSessionBytes(b, this.session.fileKey!)
      : (b: Uint8Array) => Promise.resolve(b)
    // Each time called - new fileReader created
    const fileReader = new MFileReader(new Uint8Array(), this.session.startedAt)
    return (b: Uint8Array) => decrypt(b).then(b => {
      fileReader.append(b)
      const msgs: Array<Message & { _index: number }> = []
      for (let msg = fileReader.readNext();msg !== null;msg = fileReader.readNext()) {
        msgs.push(msg)
      }
      const sorted = msgs.sort((m1, m2) => {
        // @ts-ignore
        if (!m1.time || !m2.time || m1.time === m2.time) return m1._index - m2._index
        return m1.time - m2.time
      })

      let indx = sorted[0]._index
      let outOfOrderCounter = 0
      sorted.forEach(msg => {
        if (indx > msg._index) outOfOrderCounter++
        else indx = msg._index
        this.messageManager.distributeMessage(msg)
      })

      if (outOfOrderCounter > 0) console.warn("Unsorted mob file, error count: ", outOfOrderCounter)
      logger.info("Messages count: ", msgs.length, sorted, file)

      this.messageManager._sortMessagesHack(sorted)
      onReady?.();
      this.messageManager.setMessagesLoading(false)
    })
  }

  loadDomFiles(urls: string[], parser: (b: Uint8Array) => Promise<void>) {
    if (urls.length > 0) {
      this.store.update({ domLoading: true })
      return loadFiles(urls, parser, true)
        .catch(e => this.messageManager.onFileReadFailed(e))
    } else {
      return Promise.resolve()
    }
  }

  loadDevtools() {
    if (!this.isClickmap) {
      this.store.update({ devtoolsLoading: true })
      return loadFiles(this.session.devtoolsURL, this.createNewParser(true, 'devtools', () => this.store.update({ devtoolsLoading: false })))
        // TODO: also in case of dynamic update through assist
        .then(() => {
          // @ts-ignore ?
          this.store.update({ ...this.messageManager.getListsFullState() });
        })
    } else {
      return Promise.resolve()
    }
  }

  async loadFiles() {
    this.messageManager.startLoading()

    const loadMethod = this.session.domURL && this.session.domURL.length > 0
      ? { url: this.session.domURL, parser: () => this.createNewParser(true, 'dom', () => this.store.update({ domLoading: false })) }
      : { url: this.session.mobsUrl, parser: () => this.createNewParser(false, 'dom', () => this.store.update({ domLoading: false }))}

    const parser = loadMethod.parser()
    /**
     * We load first dom mob file before the rest
     * to speed up time to replay
     * but as a tradeoff we have to have some copy-paste
     * for the devtools file
     * */
    try {
      await loadFiles([loadMethod.url[0]], parser)
      const restDomFilesPromise = this.loadDomFiles([...loadMethod.url.slice(1)], parser)
      const restDevtoolsFilesPromise = this.loadDevtools()

      await Promise.allSettled([restDomFilesPromise, restDevtoolsFilesPromise])
      this.messageManager.onFileReadSuccess()
    } catch (e) {
      console.error(e)
      try {
        const efsDomFilePromise = requestEFSDom(this.session.sessionId)
        const efsDevtoolsFilePromise = requestEFSDevtools(this.session.sessionId)

        const [domData, devtoolsData] = await Promise.all([efsDomFilePromise, efsDevtoolsFilePromise])
        const domParser = this.createNewParser(false, 'domEFS')
        const devtoolsParser = this.createNewParser(false, 'devtoolsEFS')
        const parseDomPromise = domParser(domData)
        const parseDevtoolsPromise = devtoolsParser(devtoolsData)

        await Promise.all([parseDomPromise, parseDevtoolsPromise])
        this.messageManager.onFileReadSuccess()
      } catch (e2) {
        console.error(e2)
      }
    } finally {
      this.messageManager.onFileReadFinally()
    }
  }

  clean() {
    this.store.update(MessageLoader.INITIAL_STATE);
  }
}