import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import MessageLoader from '../../../player/src/web/MessageLoader';
import { MType } from '../../../player/src/web/messages';
import fs from 'fs';
import path from 'path';
import { TextDecoder } from 'util';

const loadFilesMock = jest.fn(async () => {});

jest.mock('../../../player/src/web/network/loadFiles', () => ({
  __esModule: true,
  NO_URLS: 'No-urls-provided',
  isAbortError: (e: any) => e?.name === 'AbortError',
  loadFiles: jest.fn(async () => {}),
  requestTarball: jest.fn(),
  requestEFSDom: jest.fn(),
  requestSecondEFSDom: jest.fn(async () => {
    throw 'No-efs-file';
  }),
  requestEFSDevtools: jest.fn(),
}));

const decryptSessionBytesMock = jest.fn((b: Uint8Array) => Promise.resolve(b));

jest.mock('../../../player/src/web/network/crypto', () => ({
  __esModule: true,
  decryptSessionBytes: jest.fn((b: Uint8Array) => Promise.resolve(b)),
}));

jest.mock('Player/common/unpack', () => ({
  __esModule: true,
  default: jest.fn((b: Uint8Array) => b),
}));

jest.mock('Player/common/tarball', () => ({
  __esModule: true,
  default: jest.fn((b: Uint8Array) => b),
}));

import MFileReader from '../../../player/src/web/messages/MFileReader';

const readNextMock = jest.fn();

jest.mock('../../../player/src/web/messages/MFileReader', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      return {
        append: jest.fn(),
        checkForIndexes: jest.fn(),
        readNext: readNextMock,
        releaseConsumed: jest.fn(),
      };
    }),
  };
});

import { mockSession } from '../mocks/sessionData';

const createStore = () => {
  const state: Record<string, any> = {};
  return {
    get: () => state,
    update: jest.fn((s: any) => Object.assign(state, s)),
    updateTabStates: jest.fn(),
  };
};

const createManager = () => ({
  distributeMessage: jest.fn(),
  sortDomRemoveMessages: jest.fn(),
  setMessagesLoading: jest.fn(),
  startLoading: jest.fn(),
  getListsFullState: jest.fn(() => ({ list: true })),
  createTabCloseEvents: jest.fn(),
  onFileReadFinally: jest.fn(),
  onFileReadSuccess: jest.fn(),
  onFileReadFailed: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MessageLoader.loadDomFiles', () => {
  test('loads dom files and updates store', async () => {
    const session = mockSession({});
    const store = createStore();
    const loader = new MessageLoader(
      session,
      store as any,
      createManager() as any,
      false,
    );

    const parser = jest.fn();
    await loader.loadDomFiles(['u1', 'u2'], parser);

    expect(store.update).toHaveBeenNthCalledWith(1, { domLoading: true });
    expect(store.update).toHaveBeenNthCalledWith(2, { domLoading: false });
  });

  test('skips when no urls provided', async () => {
    const loader = new MessageLoader(
      mockSession({}),
      createStore() as any,
      createManager() as any,
      false,
    );
    const parser = jest.fn();
    await loader.loadDomFiles([], parser);
    expect(loadFilesMock).not.toHaveBeenCalled();
  });
});

describe('MessageLoader.loadDevtools', () => {
  test('loads devtools when not clickmap', async () => {
    const session = mockSession({});
    session.devtoolsURL = ['d1'];
    const store = createStore();
    const manager = createManager();
    const loader = new MessageLoader(
      session,
      store as any,
      manager as any,
      false,
    );

    const parser = jest.fn();
    await loader.loadDevtools(parser);

    expect(store.update).toHaveBeenCalledWith({ devtoolsLoading: true });
    // lists live in per-tab state; the loader only toggles the flag
    expect(store.update).toHaveBeenLastCalledWith({ devtoolsLoading: false });
  });

  test('skips devtools for clickmap', async () => {
    const session = mockSession({});
    session.devtoolsURL = ['d1'];
    const loader = new MessageLoader(
      session,
      createStore() as any,
      createManager() as any,
      true,
    );
    await loader.loadDevtools(jest.fn());
    expect(loadFilesMock).not.toHaveBeenCalled();
  });
});

describe('MessageLoader.createTabCloseEvents', () => {
  test('delegates to manager when method exists', () => {
    const manager = createManager();
    const loader = new MessageLoader(
      mockSession({}),
      createStore() as any,
      manager as any,
      false,
    );
    loader.createTabCloseEvents();
    expect(manager.createTabCloseEvents).toHaveBeenCalled();
  });
});

describe('MessageLoader.preloadFirstFile', () => {
  test('stores key and marks as preloaded', async () => {
    const loader = new MessageLoader(
      mockSession({}),
      createStore() as any,
      createManager() as any,
      false,
    );
    const parser = jest.fn(() => Promise.resolve());
    jest.spyOn(loader, 'createNewParser').mockReturnValue(parser);

    await loader.preloadFirstFile(new Uint8Array([1]), 'key');

    expect(loader.session.fileKey).toBe('key');
    expect(parser).toHaveBeenCalled();
    expect(loader.preloaded).toBe(true);
    expect(loader.mobParser).toBe(parser);
  });
});

describe('MessageLoader.createNewParser', () => {
  test('parses messages and sorts them', async () => {
    const loader = new MessageLoader(
      mockSession({}),
      createStore() as any,
      createManager() as any,
      false,
    );
    const msgs = [
      { tp: MType.SetNodeAttribute, time: 2 },
      { tp: MType.SetNodeAttribute, time: 1 },
    ];
    readNextMock
      .mockReturnValueOnce(msgs[0])
      .mockReturnValueOnce(msgs[1])
      .mockReturnValueOnce(null);

    const onDone = jest.fn();
    const parser = loader.createNewParser(false, onDone, 'file');
    // v1 header: 8x 0xff
    await parser(new Uint8Array(8).fill(0xff));

    expect(onDone).toHaveBeenCalledWith([msgs[1], msgs[0]], 'file 1');
    // raw copies are kept only in debug mode
    expect(loader.rawMessages.length).toBe(0);
  });

  test('rethrows a parse failure on the first file so the caller can fall back', async () => {
    const loader = new MessageLoader(
      mockSession({}),
      createStore() as any,
      createManager() as any,
      false,
    );
    readNextMock.mockImplementationOnce(() => {
      throw new Error('bad body');
    });
    const parser = loader.createNewParser(false, jest.fn(), 'file');
    await expect(parser(new Uint8Array(8).fill(0xff))).rejects.toThrow('bad body');
  });

  test('stops parsing once cleaned', async () => {
    const loader = new MessageLoader(
      mockSession({}),
      createStore() as any,
      createManager() as any,
      false,
    );
    const onDone = jest.fn();
    const parser = loader.createNewParser(false, onDone, 'file');
    loader.clean();
    await parser(new Uint8Array(8).fill(0xff));
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('MessageLoader.loadFiles', () => {
  test('reports failure when both the files and the EFS backup are missing', async () => {
    const { loadFiles, requestEFSDom } = jest.requireMock(
      '../../../player/src/web/network/loadFiles',
    ) as any;
    loadFiles.mockRejectedValueOnce('Bad file status code 404');
    requestEFSDom.mockRejectedValue('No-efs-file');
    const session = mockSession({});
    session.domURL = ['d1'];
    const manager = createManager();
    const loader = new MessageLoader(session, createStore() as any, manager as any, false);
    await loader.loadFiles();
    expect(manager.onFileReadFailed).toHaveBeenCalled();
    expect(manager.onFileReadSuccess).not.toHaveBeenCalled();
  });

  test('a broken first EFS dom file falls through to the second one', async () => {
    const { loadFiles, requestEFSDom, requestSecondEFSDom } = jest.requireMock(
      '../../../player/src/web/network/loadFiles',
    ) as any;
    loadFiles.mockRejectedValueOnce('Bad file status code 404');
    requestEFSDom.mockResolvedValueOnce(new Uint8Array(8).fill(0xff));
    requestSecondEFSDom.mockResolvedValueOnce(new Uint8Array(8).fill(0xff));
    const msg = { tp: MType.SetNodeAttribute, time: 5 };
    readNextMock
      .mockImplementationOnce(() => {
        throw new Error('bad first file');
      })
      .mockReturnValueOnce(msg)
      .mockReturnValueOnce(null);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const session = mockSession({});
    session.domURL = ['d1'];
    const manager = createManager();
    const loader = new MessageLoader(session, createStore() as any, manager as any, false);
    await loader.loadFiles();
    expect(manager.distributeMessage).toHaveBeenCalledWith(msg);
    expect(manager.onFileReadSuccess).toHaveBeenCalled();
    expect(manager.onFileReadFailed).not.toHaveBeenCalled();
  });

  test('an unreadable EFS devtools file does not fail the EFS dom that loaded', async () => {
    const { loadFiles, requestEFSDom, requestEFSDevtools } = jest.requireMock(
      '../../../player/src/web/network/loadFiles',
    ) as any;
    loadFiles.mockRejectedValueOnce('Bad file status code 404');
    requestEFSDom.mockResolvedValueOnce(new Uint8Array(8).fill(0xff));
    requestEFSDevtools.mockResolvedValueOnce(new Uint8Array(8).fill(0xff));
    // dom file reads fine, the devtools one is broken
    readNextMock.mockReturnValueOnce(null).mockImplementationOnce(() => {
      throw new Error('bad devtools');
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const session = mockSession({});
    session.domURL = ['d1'];
    const manager = createManager();
    const loader = new MessageLoader(session, createStore() as any, manager as any, false);
    await loader.loadFiles();
    expect(manager.onFileReadSuccess).toHaveBeenCalled();
    expect(manager.onFileReadFailed).not.toHaveBeenCalled();
  });
});
