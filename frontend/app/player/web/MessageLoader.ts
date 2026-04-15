import type { PlayerMsg, SessionFilesInfo, Store } from 'Player';
import unpackTar from 'Player/common/tarball';
import unpack from 'Player/common/unpack';
import IOSMessageManager from 'Player/mobile/IOSMessageManager';
import MessageManager from 'Player/web/MessageManager';
import { MType } from 'Player/web/messages';

import logger from 'App/logger';

import MFileReader from './messages/MFileReader';
import TrackerReader from './messages/TrackerReader';
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

  /**
   * Detect protocol format from the 8-byte header.
   * V1 = all 0xff (legacy mob format, with or without indexes depending on version)
   * V2 = 7x 0xff + 0xfe (tracker batch format)
   * V3 = 7x 0xff + 0xfd (new or old tracker without indexes)
   */
  checkProtoFormat = (binary: Uint8Array) => {
    console.debug(
      'Checking protocol format from header',
      binary.slice(0, 24).join(' '),
    );
    const isV2 =
      binary.slice(0, 7).every((b) => b === 0xff) && binary[7] === 0xfe;
    if (isV2) return 2;
    const isV3 =
      binary.slice(0, 7).every((b) => b === 0xff) && binary[7] === 0xfd;
    if (isV3) return 3;
    return 1;
  };

  /** Strip the 8-byte format header (v1: 0xff, v2: 0xfe, v3: 0xfd) if present */
  private stripHeader(data: Uint8Array): Uint8Array {
    const hasHeader =
      data.slice(0, 7).every((b) => b === 0xff) &&
      (data[7] === 0xff || data[7] === 0xfe || data[7] === 0xfd);
    return hasHeader ? data.slice(8) : data;
  }

  rawMessages: any[] = [];

  /**
   * Create a parser for the legacy v1 mob format.
   * Used as the default parser and as fallback when format is v1.
   */
  createV1Parser(
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
            this.rawMessages.push(msg);
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

        const sortedMsgs = fixMessageOrder(msgs).sort(sortIframes);

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

  /**
   * Create a parser for the v2 tracker batch format.
   * Uses TrackerReader to handle BatchMetadata, size-prefixed messages, and asset separation.
   */
  createV2Parser(
    shouldDecrypt = true,
    onMessagesDone: (msgs: PlayerMsg[], file?: string) => void,
    file?: string,
  ) {
    const decrypt =
      shouldDecrypt && this.session.fileKey
        ? (b: Uint8Array) => decryptSessionBytes(b, this.session.fileKey!)
        : (b: Uint8Array) => Promise.resolve(b);

    const reader = new TrackerReader(this.session.startedAt);
    let fileNum = 0;

    return async (b: Uint8Array) => {
      try {
        fileNum += 1;
        const mobBytes = await decrypt(b);
        const data = unpack(mobBytes);

        const batchData = this.stripHeader(data);
        reader.append(batchData);
        const messages = reader.readBatch();

        messages.forEach((msg) => this.rawMessages.push(msg));

        const sortedMsgs = fixMessageOrder(messages).sort(sortIframes);
        onMessagesDone(sortedMsgs, `${file} ${fileNum}`);
      } catch (e) {
        console.error(e);
        this.uiErrorHandler?.error(`Error parsing file: ${e.message}`);
      }
    };
  }

  /**
   * Create a format-detecting parser that checks the 8-byte header
   * and dispatches to v1 or v2 parser accordingly.
   * Once the format is determined from the first file, subsequent files use the same parser.
   */
  createNewParser(
    shouldDecrypt = true,
    onMessagesDone: (msgs: PlayerMsg[], file?: string) => void,
    file?: string,
  ) {
    const decrypt =
      shouldDecrypt && this.session.fileKey
        ? (b: Uint8Array) => decryptSessionBytes(b, this.session.fileKey!)
        : (b: Uint8Array) => Promise.resolve(b);

    let resolvedParser: ((b: Uint8Array) => Promise<void>) | null = null;

    return async (b: Uint8Array) => {
      if (resolvedParser) {
        return resolvedParser(b);
      }

      // Detect format from first file's raw bytes (before decrypt/unpack, header is prepended)
      const mobBytes = await decrypt(b);
      const data = unpack(mobBytes);
      const version = this.checkProtoFormat(data);

      if (version === 2 || version === 3) {
        resolvedParser = this.createV2Parser(
          shouldDecrypt,
          onMessagesDone,
          file,
        );
      } else {
        resolvedParser = this.createV1Parser(
          shouldDecrypt,
          onMessagesDone,
          file,
        );
      }

      // Re-feed the original bytes so the resolved parser processes this file
      return resolvedParser(b);
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

  allMessages: any[] = [];
  processMessages = (msgs: PlayerMsg[], file?: string) => {
    msgs.forEach(async (msg) => {
      if (msg.tabId && file?.includes('dom')) {
        this.allMessages.push(msg);
      }
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
      if ('messageTabSourceManager' in this.messageManager) {
        this.messageManager.messageTabSourceManager.processMessages(
          this.allMessages,
        );
      }
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

  /**
   * Load raw tracker batches from a list of URLs.
   * These are unprocessed tracker output (no 8-byte header, raw batch format).
   * Parses all batches, merges messages, sorts by time, and feeds into the
   * existing distribution pipeline.
   */
  async loadDebugBatches(batchUrls: string[]) {
    this.messageManager.startLoading();
    this.store.update({ domLoading: true });

    const reader = new TrackerReader(this.session.startedAt);
    const allPlayer: PlayerMsg[] = [];
    const allAssets: PlayerMsg[] = [];

    for (const url of batchUrls) {
      try {
        const resp = await window.fetch(url);
        if (!resp.ok) {
          console.warn(`TrackerReader: failed to fetch ${url}: ${resp.status}`);
          continue;
        }
        const buf = new Uint8Array(await resp.arrayBuffer());
        const data = unpack(buf);
        const { kind, messages } = reader.readBatch(data);

        if (kind === 'assets') {
          allAssets.push(...messages);
        } else {
          allPlayer.push(...messages);
        }
      } catch (e) {
        console.error(`TrackerReader: error processing ${url}:`, e);
      }
    }

    // Merge and sort
    const merged = [...allPlayer, ...allAssets];
    const sorted = fixMessageOrder(merged).sort(sortIframes);

    logger.info(
      'TrackerReader: loaded',
      sorted.length,
      'messages from',
      batchUrls.length,
      'batches',
    );
    this.processMessages(sorted, 'debug');

    this.messageManager.onFileReadFinally();
    this.messageManager.onFileReadSuccess();
    this.createTabCloseEvents();
    this.store.update({ domLoading: false });
  }

  clean() {
    this.store.update(MessageLoader.INITIAL_STATE);
  }
}

/**
 * Priority tiers for ordering messages within same-timestamp groups.
 * Uses bucket sort instead of comparator-based sort to avoid
 * native V8 TimSort transitivity issues on large (20k+) arrays.
 *
 * CREATE -> MODIFY -> DELETE
 */
export function getMsgPriority(tp: number): number {
  switch (tp) {
    case MType.CreateDocument:
      return 0;
    case MType.SetPageLocation:
    case MType.SetPageLocationDeprecated:
      return 1;
    case MType.CreateElementNode:
    case MType.CreateTextNode:
    case MType.CreateIFrameDocument:
      return 2;
    case MType.SetNodeAttribute:
    case MType.SetNodeAttributeURLBased:
    case MType.SetNodeAttributeDictGlobal:
    case MType.SetNodeAttributeDict:
    case MType.SetNodeAttributeDictDeprecated:
    case MType.RemoveNodeAttribute:
    case MType.SetNodeData:
    case MType.SetCssData:
    case MType.SetCssDataURLBased:
    case MType.SetNodeSlot:
    case MType.LoadFontFace:
    case MType.NodeAnimationResult:
      return 3;
    case MType.AdoptedSsAddOwner:
      return 4;
    case MType.AdoptedSsInsertRule:
    case MType.AdoptedSsInsertRuleURLBased:
    case MType.AdoptedSsReplace:
    case MType.AdoptedSsReplaceURLBased:
    case MType.AdoptedSsDeleteRule:
      return 5;
    case MType.MoveNode:
      return 6;
    case MType.RemoveNode:
    case MType.AdoptedSsRemoveOwner:
      return 8;
    default:
      return 7;
  }
}

const BUCKET_COUNT = 9;

export function needsSorting(
  msgs: PlayerMsg[],
  start: number,
  end: number,
): boolean {
  let maxPriority = -1;
  for (let i = start; i < end; i++) {
    const p = getMsgPriority(msgs[i].tp);
    if (p < maxPriority) return true;
    maxPriority = p;
  }
  return false;
}

export function sortTimeGroup(msgs: PlayerMsg[], start: number, end: number) {
  const buckets: PlayerMsg[][] = [];
  for (let b = 0; b < BUCKET_COUNT; b++) buckets.push([]);
  for (let i = start; i < end; i++) {
    buckets[getMsgPriority(msgs[i].tp)].push(msgs[i]);
  }
  let idx = start;
  for (let b = 0; b < BUCKET_COUNT; b++) {
    const bucket = buckets[b];
    for (let j = 0; j < bucket.length; j++) {
      msgs[idx++] = bucket[j];
    }
  }
}

export function fixMessageOrder(msgs: PlayerMsg[]): PlayerMsg[] {
  msgs.sort((a, b) => a.time - b.time);

  let i = 0;
  while (i < msgs.length) {
    const time = msgs[i].time;
    let j = i + 1;
    while (j < msgs.length && msgs[j].time === time) j++;

    if (j - i > 1 && needsSorting(msgs, i, j)) {
      sortTimeGroup(msgs, i, j);
    }

    i = j;
  }

  return msgs;
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
