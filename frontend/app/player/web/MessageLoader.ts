import type { PlayerMsg, SessionFilesInfo, Store } from 'Player';
import unpackTar from 'Player/common/tarball';
import unpack from 'Player/common/unpack';
import IOSMessageManager from 'Player/mobile/IOSMessageManager';
import MessageManager from 'Player/web/MessageManager';
import { MType } from 'Player/web/messages';

import logger from 'App/logger';

import MFileReader from './messages/MFileReader';
import { decryptSessionBytes } from './network/crypto';
import {
  loadFiles,
  requestEFSDevtools,
  requestEFSDom,
  requestTarball,
} from './network/loadFiles';

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
    private session: SessionFilesInfo,
    private store: Store<State>,
    private messageManager: MessageManager | IOSMessageManager,
    private isClickmap: boolean,
    private uiErrorHandler?: { error: (msg: string) => void },
  ) {}

  setSession(session: SessionFilesInfo) {
    this.session = session;
  }

  rawMessages: any[] = []
  createNewParser(
    shouldDecrypt = true,
    onMessagesDone: (msgs: PlayerMsg[], file?: string) => void,
    file?: string,
  ) {
    const decrypt =
      shouldDecrypt && this.session.fileKey
        ? (b: Uint8Array) => decryptSessionBytes(b, this.session.fileKey!)
        : (b: Uint8Array) => Promise.resolve(b);
    const fileReader = new MFileReader(
      new Uint8Array(),
      this.session.startedAt,
    );
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
            this.rawMessages.push(msg)
            msgs.push(msg);
          } else {
            finished = true;
            break;
          }
        }

        let artificialStartTime = Infinity;
        let startTimeSet = false;
        msgs.forEach((msg, i) => {
          if (msg.tp === MType.Redux || msg.tp === MType.ReduxDeprecated) {
            if ('actionTime' in msg && msg.actionTime) {
              msg.time = msg.actionTime - this.session.startedAt;
            } else {
              // @ts-ignore
              Object.assign(msg, {
                actionTime: msg.time + this.session.startedAt,
              });
            }
          }
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
        const originalCopy = [...msgs];
        msgs.forEach((msg) => {
          if (!msg.time) {
            msg.time = artificialStartTime;
            brokenMessages += 1;
          }
        });

        const sortedMsgs = msgs
          // .sort((m1, m2) => m1.time - m2.time);
          .sort(brokenDomSorter)
          .sort(sortIframes);

        if (brokenMessages > 0) {
          console.warn(
            'Broken timestamp messages',
            brokenMessages,
            originalCopy,
          );
        }

        onMessagesDone(sortedMsgs, `${file} ${fileNum}`);
      } catch (e) {
        console.error(e);
        this.uiErrorHandler?.error(`Error parsing file: ${e.message}`);
      }
    };
  }

  waitForCanvasURL = () => {
    const start = Date.now();
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.session.canvasURL?.length) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - start > 15000) {
          clearInterval(checkInterval);
          throw new Error('could not load canvas data after 15 seconds');
        }
      }, 100);
    });
  };

  processMessages = (msgs: PlayerMsg[], file?: string) => {
    msgs.forEach(async (msg) => {
      if (msg.tp === MType.CanvasNode) {
        /**
         * in case of prefetched sessions with canvases,
         * we wait for signed urls and then parse the session
         * */
        if (file?.includes('p:dom') && !this.session.canvasURL?.length) {
          console.warn('⚠️Openreplay is waiting for canvas node to load');
          await this.waitForCanvasURL();
        }
      }
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

  createTabCloseEvents() {
    if ('createTabCloseEvents' in this.messageManager) {
      this.messageManager.createTabCloseEvents();
    }
  }

  preloaded = false;

  async preloadFirstFile(data: Uint8Array, fileKey?: string) {
    this.session.fileKey = fileKey;
    this.mobParser = this.createNewParser(true, this.processMessages, 'p:dom');

    try {
      await this.mobParser(data);
      this.preloaded = true;
    } catch (e) {
      console.error('error parsing msgs', e);
    }
  }

  async loadDomFiles(urls: string[], parser: (b: Uint8Array) => Promise<void>) {
    if (urls.length > 0) {
      this.store.update({ domLoading: true });
      await loadFiles(urls, parser, true);
      return this.store.update({ domLoading: false });
    }
    return Promise.resolve();
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
    }
    return Promise.resolve();
  }

  /**
   * Try to get session files, if they aren't present, try to load them from EFS
   * if EFS fails, then session doesn't exist
   * */
  async loadFiles() {
    if (!this.preloaded) {
      this.messageManager.startLoading();
    }

    try {
      await this.loadMobs();
    } catch (sessionLoadError) {
      console.info('!', sessionLoadError);
      try {
        await this.loadEFSMobs();
      } catch (unprocessedLoadError) {
        this.messageManager.onFileReadFailed(
          sessionLoadError,
          unprocessedLoadError,
        );
      }
    } finally {
      this.createTabCloseEvents();
      this.store.update({ domLoading: false, devtoolsLoading: false });
    }
  }

  mobParser: (b: Uint8Array) => Promise<void>;

  loadMobs = async () => {
    const loadMethod =
      this.session.domURL && this.session.domURL.length > 0
        ? {
            mobUrls: this.session.domURL,
            parser: () =>
              this.createNewParser(true, this.processMessages, 'd:dom'),
          }
        : {
            mobUrls: this.session.mobsUrl,
            parser: () =>
              this.createNewParser(false, this.processMessages, 'm:dom'),
          };

    if (!this.mobParser) {
      this.mobParser = loadMethod.parser();
    }
    const parser = this.mobParser;
    const devtoolsParser = this.createNewParser(
      true,
      this.processMessages,
      'devtools',
    );

    /**
     * to speed up time to replay
     * we load first dom mob file before the rest
     * (because parser can read them in parallel)
     * as a tradeoff we have some copy-paste code
     * for the devtools file
     * */
    if (!this.preloaded) await loadFiles([loadMethod.mobUrls[0]], parser);
    this.messageManager.onFileReadFinally();
    const restDomFilesPromise = this.loadDomFiles(
      [...loadMethod.mobUrls.slice(1)],
      parser,
    );
    const restDevtoolsFilesPromise = this.loadDevtools(devtoolsParser);

    await Promise.allSettled([restDomFilesPromise, restDevtoolsFilesPromise]);
    this.messageManager.onFileReadSuccess();
  };

  loadEFSMobs = async () => {
    this.store.update({ domLoading: true, devtoolsLoading: true });
    const efsDomFilePromise = requestEFSDom(this.session.sessionId);
    const efsDevtoolsFilePromise = requestEFSDevtools(this.session.sessionId);

    const domParser = this.createNewParser(
      false,
      this.processMessages,
      'domEFS',
    );
    const devtoolsParser = this.createNewParser(
      false,
      this.processMessages,
      'devtoolsEFS',
    );
    const [domData, devtoolsData] = await Promise.allSettled([
      efsDomFilePromise,
      efsDevtoolsFilePromise,
    ]);

    const parseDomPromise: Promise<any> =
      domData.status === 'fulfilled'
        ? domParser(domData.value)
        : Promise.reject('No dom file in EFS');
    const parseDevtoolsPromise: Promise<any> =
      devtoolsData.status === 'fulfilled'
        ? devtoolsParser(devtoolsData.value)
        : Promise.reject('No devtools file in EFS');

    await Promise.allSettled([parseDomPromise, parseDevtoolsPromise]);
    this.store.update({ domLoading: false, devtoolsLoading: false });
    this.messageManager.onFileReadFinally();
    this.messageManager.onFileReadSuccess();
  };

  clean() {
    this.store.update(MessageLoader.INITIAL_STATE);
  }
}

const DOMMessages = [
  MType.CreateElementNode,
  MType.CreateTextNode,
  MType.MoveNode,
  MType.CreateIFrameDocument,
];

// fixed times: 3
function brokenDomSorter(m1: PlayerMsg, m2: PlayerMsg) {
  if (m1.time !== m2.time) return m1.time - m2.time;

  // if (m1.tp === MType.CreateDocument && m2.tp !== MType.CreateDocument)
  //   return -1;
  // if (m1.tp !== MType.CreateDocument && m2.tp === MType.CreateDocument)
  //   return 1;

  // if (m1.tp === MType.RemoveNode)
  //   return 1;
  // if (m2.tp === MType.RemoveNode)
  //   return -1;

  // const m1IsDOM = DOMMessages.includes(m1.tp);
  // const m2IsDOM = DOMMessages.includes(m2.tp);
  // if (m1IsDOM && m2IsDOM) {
  //   // @ts-ignore DOM msg has id but checking for 'id' in m is expensive
  //   return m1.id - m2.id;
  // }

  // if (m1IsDOM && !m2IsDOM) return -1;
  // if (!m1IsDOM && m2IsDOM) return 1;

  return 0;
}

function sortIframes(m1, m2) {
  if (
    m1.time === m2.time &&
    [MType.CreateIFrameDocument, MType.CreateElementNode].includes(m1.tp) &&
    [MType.CreateIFrameDocument, MType.CreateElementNode].includes(m2.tp)
  ) {
    if (m1.frameID === m2.id) return 1;
    if (m1.id === m2.frameID) return -1;
  }
  return 0;
}

/**
 * Search for orphan nodes in session
 */
function findBrokenNodes(nodes: any[]) {
  const idToNode = {};
  const orphans: any[] = [];
  const result = {};

  // Map all nodes by id for quick access and identify potential orphans
  nodes.forEach((node) => {
    // @ts-ignore
    idToNode[node.id] = { ...node, children: [] };
  });

  // Identify true orphans (nodes whose parentID does not exist)
  nodes.forEach((node) => {
    if (node.parentID) {
      // @ts-ignore
      const parentNode = idToNode[node.parentID];
      if (parentNode) {
        // @ts-ignore
        parentNode.children.push(idToNode[node.id]);
      } else {
        orphans.push(node.id); // parentID does not exist
      }
    }
  });

  // Recursively collect all descendants of a node
  function collectDescendants(nodeId) {
    // @ts-ignore
    const node = idToNode[nodeId];
    node.children.forEach((child) => {
      collectDescendants(child.id);
    });
    return node;
  }

  // Build trees for each orphan
  orphans.forEach((orId: number) => {
    // @ts-ignore
    result[orId] = collectDescendants(orId);
  });

  return result;
}

// @ts-ignore
window.searchOrphans = (msgs) =>
  findBrokenNodes(msgs.filter((m) => [8, 9, 10, 70].includes(m.tp)));
