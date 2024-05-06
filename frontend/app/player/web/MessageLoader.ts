import type { Store, SessionFilesInfo, PlayerMsg } from "Player";
import { decryptSessionBytes }                     from './network/crypto';
import MFileReader from './messages/MFileReader';
import { loadFiles, requestEFSDom, requestEFSDevtools } from './network/loadFiles';
import logger from 'App/logger';
import unpack from 'Player/common/unpack';
import MessageManager from 'Player/web/MessageManager';
import IOSMessageManager from 'Player/mobile/IOSMessageManager';

interface State {
  firstFileLoading: boolean;
  domLoading: boolean;
  devtoolsLoading: boolean;
  error: boolean;
}

export default class MessageLoader {
  static INITIAL_STATE: State = {
    firstFileLoading: false,
    domLoading: false,
    devtoolsLoading: false,
    error: false,
  };

  constructor(
    private readonly session: SessionFilesInfo,
    private store: Store<State>,
    private messageManager: MessageManager | IOSMessageManager,
    private isClickmap: boolean,
    private uiErrorHandler?: { error: (msg: string) => void }
  ) {}

  createNewParser(
    shouldDecrypt = true,
    onMessagesDone: (msgs: PlayerMsg[], file?: string) => void,
    file?: string
  ) {
    const decrypt =
      shouldDecrypt && this.session.fileKey
        ? (b: Uint8Array) => decryptSessionBytes(b, this.session.fileKey!)
        : (b: Uint8Array) => Promise.resolve(b);
    const fileReader = new MFileReader(new Uint8Array(), this.session.startedAt);
    return async (b: Uint8Array) => {
      try {
        const mobBytes = await decrypt(b);
        const data = unpack(mobBytes);
        fileReader.append(data);
        if (file?.endsWith('EFS')) {
          fileReader.forceSkipIndexes()
        } else {
         fileReader.checkForIndexes();
        }
        const msgs: Array<PlayerMsg> = [];
        let finished = false;
        while (!finished) {
          const msg = fileReader.readNext();
          if (msg) {
            msgs.push(msg);
          } else {
            finished = true;
            break;
          }
        }

        const sortedMsgs = msgs.sort((m1, m2) => {
          return m1.time - m2.time;
        });
        onMessagesDone(sortedMsgs, file);
      } catch (e) {
        console.error(e);
        this.uiErrorHandler?.error('Error parsing file: ' + e.message);
      }
    };
  }

  processMessages = (msgs: PlayerMsg[], file?: string) => {
    msgs.forEach((msg) => {
      this.messageManager.distributeMessage(msg);
    });
    logger.info('Messages count: ', msgs.length, msgs, file);

    this.messageManager.sortDomRemoveMessages(msgs);
    this.messageManager.setMessagesLoading(false);
  };

  async loadDomFiles(urls: string[], parser: (b: Uint8Array) => Promise<void>) {
    if (urls.length > 0) {
      this.store.update({ domLoading: true });
      await loadFiles(urls, parser, true);
      return this.store.update({ domLoading: false });
    } else {
      return Promise.resolve();
    }
  }

  loadDevtools(parser: (b: Uint8Array) => Promise<void>) {
    if (!this.isClickmap) {
      this.store.update({ devtoolsLoading: true });
      return (
        loadFiles(this.session.devtoolsURL, parser)
          // TODO: also in case of dynamic update through assist
          .then(() => {
            // @ts-ignore ?
            this.store.update({
              ...this.messageManager.getListsFullState(),
              devtoolsLoading: false,
            });
          })
      );
    } else {
      return Promise.resolve();
    }
  }

  async loadFiles() {
    this.messageManager.startLoading();

    const loadMethod =
      this.session.domURL && this.session.domURL.length > 0
        ? {
            mobUrls: this.session.domURL,
            parser: () => this.createNewParser(true, this.processMessages, 'dom'),
          }
        : {
            mobUrls: this.session.mobsUrl,
            parser: () => this.createNewParser(false, this.processMessages, 'dom'),
          };

    const parser = loadMethod.parser();
    const devtoolsParser = this.createNewParser(true, this.processMessages, 'devtools');
    /**
     * to speed up time to replay
     * we load first dom mob file before the rest
     * (because parser can read them in parallel)
     * as a tradeoff we have some copy-paste code
     * for the devtools file
     * */
    try {
      await loadFiles([loadMethod.mobUrls[0]], parser);
      const restDomFilesPromise = this.loadDomFiles([...loadMethod.mobUrls.slice(1)], parser);
      const restDevtoolsFilesPromise = this.loadDevtools(devtoolsParser);

      await Promise.allSettled([restDomFilesPromise, restDevtoolsFilesPromise]);
      this.messageManager.onFileReadSuccess();
    } catch (sessionLoadError) {
      try {
        this.store.update({ domLoading: true, devtoolsLoading: true });
        const efsDomFilePromise = requestEFSDom(this.session.sessionId);
        const efsDevtoolsFilePromise = requestEFSDevtools(this.session.sessionId);

        const [domData, devtoolsData] = await Promise.allSettled([
          efsDomFilePromise,
          efsDevtoolsFilePromise,
        ]);
        const domParser = this.createNewParser(false, this.processMessages, 'domEFS');
        const devtoolsParser = this.createNewParser(false, this.processMessages, 'devtoolsEFS');
        const parseDomPromise: Promise<any> =
          domData.status === 'fulfilled'
            ? domParser(domData.value)
            : Promise.reject('No dom file in EFS');
        const parseDevtoolsPromise: Promise<any> =
          devtoolsData.status === 'fulfilled'
            ? devtoolsParser(devtoolsData.value)
            : Promise.reject('No devtools file in EFS');

        await Promise.all([parseDomPromise, parseDevtoolsPromise]);
        this.messageManager.onFileReadSuccess();
      } catch (unprocessedLoadError) {
        this.messageManager.onFileReadFailed(sessionLoadError, unprocessedLoadError);
      }
    } finally {
      this.messageManager.onFileReadFinally();
      this.store.update({ domLoading: false, devtoolsLoading: false });
    }
  }

  clean() {
    this.store.update(MessageLoader.INITIAL_STATE);
  }
}
