import type { Store, SessionFilesInfo, PlayerMsg } from 'Player';
import { decryptSessionBytes } from './network/crypto';
import MFileReader from './messages/MFileReader';
import { loadFiles, requestEFSDom, requestEFSDevtools, requestTarball } from './network/loadFiles';
import logger from 'App/logger';
import unpack from 'Player/common/unpack';
import unpackTar from 'Player/common/tarball';
import MessageManager from 'Player/web/MessageManager';
import IOSMessageManager from 'Player/mobile/IOSMessageManager';
import { MType } from 'Player/web/messages';

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
    let fileNum = 0;
    return async (b: Uint8Array) => {
      try {
        fileNum += 1;
        const mobBytes = await decrypt(b);
        const data = unpack(mobBytes);
        fileReader.append(data);
        fileReader.checkForIndexes();
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

        let artificialStartTime = Infinity;
        let startTimeSet = false;
        msgs.forEach((msg) => {
          if (
            msg.tp === MType.CreateDocument &&
            msg.time !== undefined &&
            msg.time < artificialStartTime
          ) {
            artificialStartTime = msg.time;
            startTimeSet = true;
          }
        });

        if (!startTimeSet) {
          artificialStartTime = 0;
        }

        let brokenMessages = 0;
        msgs.forEach((msg) => {
          if (!msg.time) {
            msg.time = artificialStartTime;
            brokenMessages += 1;
          }
        });

        const DOMMessages = [
          MType.CreateElementNode,
          MType.CreateTextNode,
          MType.MoveNode,
          MType.RemoveNode,
        ];
        const sortedMsgs = msgs.sort((m1, m2) => {
          if (m1.time !== m2.time) return m1.time - m2.time;

          if (m1.tp === MType.CreateDocument && m2.tp !== MType.CreateDocument) return -1;
          if (m1.tp !== MType.CreateDocument && m2.tp === MType.CreateDocument) return 1;

          const m1IsDOM = DOMMessages.includes(m1.tp);
          const m2IsDOM = DOMMessages.includes(m2.tp);
          if (m1IsDOM && m2IsDOM) {
            // @ts-ignore DOM msg has id but checking for 'id' in m is expensive
            if (m1.id !== m2.id) return m1.id - m2.id;
            return m1.tp - m2.tp;
          }

          if (m1IsDOM && !m2IsDOM) return -1;
          if (!m1IsDOM && m2IsDOM) return 1;

          return 0;
        });

        if (brokenMessages > 0) {
          console.warn('Broken timestamp messages', brokenMessages);
        }

        onMessagesDone(sortedMsgs, `${file} ${fileNum}`);
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

  async loadTarball(url: string) {
    try {
      const tarBufferZstd = await requestTarball(url);
      if (tarBufferZstd) {
        const tar = unpack(tarBufferZstd);
        return await unpackTar(tar);
      }
    } catch (e) {
      throw e;
    }
  }

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

  /**
   * Try to get session files, if they aren't present, try to load them from EFS
   * if EFS fails, then session doesn't exist
   * */
  async loadFiles() {
    this.messageManager.startLoading();

    try {
      await this.loadMobs();
    } catch (sessionLoadError) {
      try {
        await this.loadEFSMobs();
      } catch (unprocessedLoadError) {
        this.messageManager.onFileReadFailed(sessionLoadError, unprocessedLoadError);
      }
    } finally {
      this.store.update({ domLoading: false, devtoolsLoading: false });
    }
  }

  loadMobs = async () => {
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
    await loadFiles([loadMethod.mobUrls[0]], parser);
    this.messageManager.onFileReadFinally();
    const restDomFilesPromise = this.loadDomFiles([...loadMethod.mobUrls.slice(1)], parser);
    const restDevtoolsFilesPromise = this.loadDevtools(devtoolsParser);

    await Promise.allSettled([restDomFilesPromise, restDevtoolsFilesPromise]);
    this.messageManager.onFileReadSuccess();
  };

  loadEFSMobs = async () => {
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
  };

  clean() {
    this.store.update(MessageLoader.INITIAL_STATE);
  }
}
