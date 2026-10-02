import type { PlayerMsg, SessionFilesInfo, Store } from '../index';
import { isPlayerDebug } from '../config';
import unpackTar from '../common/tarball';
import unpack from '../common/unpack';
import IOSMessageManager from '../mobile/IOSMessageManager';
import MessageManager from './MessageManager';
import { MType } from './messages';

import logger from '../logger';

import MobFileParser from './messages/MobFileParser';
import { fixMessageOrder } from './messages/messageOrder';
import TrackerReader from './messages/TrackerReader';
import { decryptSessionBytes } from './network/crypto';
import {
  NO_URLS,
  isAbortError,
  loadFiles,
  requestEFSDevtools,
  requestEFSDom,
  requestSecondEFSDom,
  requestTarball,
} from './network/loadFiles';

interface State {
  firstFileLoading: boolean;
  domLoading: boolean;
  devtoolsLoading: boolean;
  error: boolean;
}

const CANVAS_URL_TIMEOUT = 15000;

export default class MessageLoader {
  static INITIAL_STATE: State = {
    firstFileLoading: false,
    domLoading: false,
    devtoolsLoading: false,
    error: false,
  };

  /** Aborted on clean(): downloads, decryption and parsing of a left session stop. */
  private readonly abortController = new AbortController();

  private preloadPromise: Promise<void> | null = null;

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

  private get signal() {
    return this.abortController.signal;
  }

  private get isMobile() {
    return this.messageManager instanceof IOSMessageManager;
  }

  /** Only kept in debug mode (see isPlayerDebug): a second copy of every message. */
  rawMessages: any[] = [];

  /**
   * Parser for a session's consecutive files: decrypts and decompresses each file
   * once, detects the format on the first one and keeps reader state between files.
   */
  createNewParser(
    shouldDecrypt = true,
    onMessagesDone: (msgs: PlayerMsg[], file?: string) => void,
    file?: string,
  ) {
    const parser = new MobFileParser(this.session.startedAt, {
      trackerVersion: this.session.trackerVersion,
      mobile: this.isMobile,
    });
    const keepRawMessages = isPlayerDebug();
    let fileNum = 0;
    let readErrorReported = false;
    return async (b: Uint8Array) => {
      if (this.signal.aborted) return;
      fileNum += 1;
      let data: Uint8Array;
      try {
        const { fileKey } = this.session;
        const bytes =
          shouldDecrypt && fileKey ? await decryptSessionBytes(b, fileKey) : b;
        data = unpack(bytes);
      } catch (e) {
        if (isAbortError(e) || this.signal.aborted) return;
        // an undecodable first file means a wrong source: let the caller fall back (EFS)
        if (fileNum === 1) throw e;
        console.error(e);
        this.uiErrorHandler?.error(`Error decoding file: ${e?.message ?? e}`);
        return;
      }
      if (this.signal.aborted) return;
      let msgs: PlayerMsg[];
      try {
        msgs = parser.parse(data);
      } catch (e) {
        if (isAbortError(e) || this.signal.aborted) return;
        // same as an undecodable first file: let the caller fall back
        if (fileNum === 1) throw e;
        console.error(e);
        this.uiErrorHandler?.error(`Error parsing file: ${e?.message ?? e}`);
        return;
      }
      try {
        if (parser.readError && !readErrorReported) {
          readErrorReported = true;
          this.uiErrorHandler?.error('Error parsing file: unreadable message');
        }
        if (keepRawMessages) {
          for (const msg of msgs) this.rawMessages.push(msg);
        }
        onMessagesDone(msgs, `${file} ${fileNum}`);
      } catch (e) {
        if (isAbortError(e) || this.signal.aborted) return;
        console.error(e);
        this.uiErrorHandler?.error(`Error processing file: ${e?.message ?? e}`);
      }
    };
  }

  waitForCanvasURL = () => {
    const start = Date.now();
    return new Promise<void>((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.session.canvasURL?.length) {
          clearInterval(checkInterval);
          resolve();
        } else if (
          this.signal.aborted ||
          Date.now() - start > CANVAS_URL_TIMEOUT
        ) {
          clearInterval(checkInterval);
          reject(new Error('could not load canvas data after 15 seconds'));
        }
      }, 100);
    });
  };

  processMessages = (msgs: PlayerMsg[], file?: string) => {
    if (this.signal.aborted) return;
    const tabSources =
      file?.includes('dom') && 'messageTabSourceManager' in this.messageManager
        ? this.messageManager.messageTabSourceManager
        : null;
    // prefetched sessions get signed canvas urls later; their canvas nodes wait for them
    const waitsForCanvasUrls =
      !!file?.includes('p:dom') && !this.session.canvasURL?.length;
    const deferredCanvasNodes: PlayerMsg[] = [];

    for (const msg of msgs) {
      if (tabSources && msg.tabId) {
        tabSources.processMessage(msg);
      }
      if (waitsForCanvasUrls && msg.tp === MType.CanvasNode) {
        deferredCanvasNodes.push(msg);
        continue;
      }
      this.messageManager.distributeMessage(msg);
    }
    logger.info('Messages count: ', msgs.length, file);
    this.messageManager.sortDomRemoveMessages(msgs);
    this.messageManager.setMessagesLoading(false);

    if (deferredCanvasNodes.length) {
      console.warn('⚠️Openreplay is waiting for canvas node to load');
      this.waitForCanvasURL()
        .then(() => {
          if (this.signal.aborted) return;
          deferredCanvasNodes.forEach((msg) =>
            this.messageManager.distributeMessage(msg),
          );
        })
        .catch((e) => logger.warn(e));
    }
  };

  async loadTarball(url: string) {
    const tarBufferZstd = await requestTarball(url, this.signal);
    if (tarBufferZstd) {
      return unpackTar(unpack(tarBufferZstd));
    }
  }

  createTabCloseEvents() {
    if ('createTabCloseEvents' in this.messageManager) {
      this.messageManager.createTabCloseEvents();
    }
  }

  preloaded = false;

  preloadFirstFile(data: Uint8Array, fileKey?: string) {
    this.session.fileKey = fileKey;
    this.mobParser = this.createNewParser(true, this.processMessages, 'p:dom');
    const parser = this.mobParser;
    this.preloadPromise = (async () => {
      try {
        await parser(data);
        this.preloaded = true;
      } catch (e) {
        console.error('error parsing msgs', e);
        // a half-fed reader must not receive the re-fetched first file
        this.mobParser = undefined;
      }
    })();
    return this.preloadPromise;
  }

  async loadDomFiles(urls: string[], parser: (b: Uint8Array) => Promise<void>) {
    if (urls.length > 0) {
      this.store.update({ domLoading: true });
      await loadFiles(urls, parser, true, this.signal);
      return this.store.update({ domLoading: false });
    }
    return Promise.resolve();
  }

  loadDevtools(parser: (b: Uint8Array) => Promise<void>) {
    if (this.isClickmap || !this.session.devtoolsURL?.length) {
      return Promise.resolve();
    }
    this.store.update({ devtoolsLoading: true });
    // a missing devtools file (404) is fine; other failures are reported by loadMobs
    return loadFiles(this.session.devtoolsURL, parser, true, this.signal).finally(
      () => this.store.update({ devtoolsLoading: false }),
    );
  }

  /**
   * Try to get session files, if they aren't present, try to load them from EFS
   * if EFS fails, then session doesn't exist
   * */
  async loadFiles() {
    // a preload still in flight owns the first file
    if (this.preloadPromise) {
      await this.preloadPromise;
    }
    if (!this.preloaded) {
      this.messageManager.startLoading();
    }

    try {
      await this.loadMobs();
    } catch (sessionLoadError) {
      if (this.signal.aborted) return;
      console.info('!', sessionLoadError);
      try {
        await this.loadEFSMobs();
      } catch (unprocessedLoadError) {
        if (!this.signal.aborted) {
          this.messageManager.onFileReadFailed(
            sessionLoadError,
            unprocessedLoadError,
          );
        }
      }
    } finally {
      if (!this.signal.aborted) {
        this.createTabCloseEvents();
        this.store.update({ domLoading: false, devtoolsLoading: false });
      }
    }
  }

  mobParser: ((b: Uint8Array) => Promise<void>) | undefined;

  loadMobs = async () => {
    const useDomUrls = !!this.session.domURL?.length;
    const mobUrls = useDomUrls ? this.session.domURL : this.session.mobsUrl;
    if (!mobUrls?.length) {
      throw NO_URLS;
    }

    if (!this.mobParser) {
      this.mobParser = this.createNewParser(
        useDomUrls,
        this.processMessages,
        useDomUrls ? 'd:dom' : 'm:dom',
      );
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
    if (!this.preloaded) {
      await loadFiles([mobUrls[0]], parser, false, this.signal);
    }
    if (this.signal.aborted) return;
    this.messageManager.onFileReadFinally();

    const results = await Promise.allSettled([
      this.loadDomFiles(mobUrls.slice(1), parser),
      this.loadDevtools(devtoolsParser),
    ]);
    if (this.signal.aborted) return;
    const failures = results.filter(
      (r): r is PromiseRejectedResult =>
        r.status === 'rejected' && !isAbortError(r.reason),
    );
    if (failures.length) {
      logger.warn('Some session files failed to load', failures);
      this.uiErrorHandler?.error('Part of the recording failed to load');
    }
    this.messageManager.onFileReadSuccess();
  };

  loadEFSMobs = async () => {
    this.store.update({ domLoading: true, devtoolsLoading: true });

    const [domData, secondDomData, devtoolsData] = await Promise.allSettled([
      requestEFSDom(this.session.sessionId, this.signal),
      requestSecondEFSDom(this.session.sessionId, this.signal),
      requestEFSDevtools(this.session.sessionId, this.signal),
    ]);
    if (this.signal.aborted) return;
    if (domData.status !== 'fulfilled' && secondDomData.status !== 'fulfilled') {
      throw 'No dom files in EFS';
    }

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

    if (domData.status === 'fulfilled') {
      await domParser(domData.value);
    }
    if (secondDomData.status === 'fulfilled') {
      await domParser(secondDomData.value);
    }
    if (devtoolsData.status === 'fulfilled') {
      // devtools are optional: a bad file must not fail the DOM that loaded
      await devtoolsParser(devtoolsData.value).catch((e) => {
        if (!isAbortError(e)) console.error('Error parsing EFS devtools', e);
      });
    }
    if (this.signal.aborted) return;
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
    const collected: PlayerMsg[] = [];

    for (const url of batchUrls) {
      try {
        const resp = await window.fetch(url, { signal: this.signal });
        if (!resp.ok) {
          console.warn(`TrackerReader: failed to fetch ${url}: ${resp.status}`);
          continue;
        }
        reader.append(unpack(new Uint8Array(await resp.arrayBuffer())));
        for (const msg of reader.readBatch()) {
          collected.push(msg as PlayerMsg);
        }
      } catch (e) {
        if (isAbortError(e)) return;
        console.error(`TrackerReader: error processing ${url}:`, e);
      }
    }

    const sorted = fixMessageOrder(collected);
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
    this.abortController.abort();
    this.rawMessages = [];
    this.store.update(MessageLoader.INITIAL_STATE);
  }
}

export {
  getMsgPriority,
  needsSorting,
  sortTimeGroup,
  fixMessageOrder,
  sortIframes,
} from './messages/messageOrder';
