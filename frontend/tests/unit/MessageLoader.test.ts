import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import MessageLoader from '../../app/player/web/MessageLoader';
import { MType } from '../../app/player/web/messages';
import fs from 'fs';
import path from 'path';
import { TextDecoder } from 'util';

const loadFilesMock = jest.fn(async () => {});

jest.mock('../../app/player/web/network/loadFiles', () => ({
  __esModule: true,
  loadFiles: jest.fn(async () => {}),
  requestTarball: jest.fn(),
  requestEFSDom: jest.fn(),
  requestEFSDevtools: jest.fn(),
}));

const decryptSessionBytesMock = jest.fn((b: Uint8Array) => Promise.resolve(b));

jest.mock('../../app/player/web/network/crypto', () => ({
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

import MFileReader from '../../app/player/web/messages/MFileReader';

const readNextMock = jest.fn();

jest.mock('../../app/player/web/messages/MFileReader', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      return {
        append: jest.fn(),
        checkForIndexes: jest.fn(),
        readNext: readNextMock,
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
    expect(store.update).toHaveBeenLastCalledWith({
      ...manager.getListsFullState(),
      devtoolsLoading: false,
    });
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
    await parser(new Uint8Array());

    expect(onDone).toHaveBeenCalledWith([msgs[1], msgs[0]], 'file 1');
    expect(loader.rawMessages.length).toBe(2);
  });
});
