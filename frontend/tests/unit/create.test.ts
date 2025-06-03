import { jest, describe, it, expect, beforeEach } from '@jest/globals';

class MockIOSPlayer {
  static INITIAL_STATE = { ios: true };
  public toggleRange = jest.fn();
  constructor(
    public store: any,
    public session: any,
    public handler?: any,
  ) {}
}
class MockWebPlayer {
  static INITIAL_STATE = { web: true };
  public toggleRange = jest.fn();
  constructor(
    public store: any,
    public session: any,
    public live: boolean,
    public clickMap: boolean,
    public handler?: any,
    public prefetched?: boolean,
  ) {}
}
class MockWebLivePlayer {
  static INITIAL_STATE = { live: true };
  constructor(
    public store: any,
    public session: any,
    public config: any,
    public agentId: number,
    public projectId: number,
    public handler?: any,
  ) {}
}

jest.mock('../../app/player/mobile/IOSPlayer', () => ({
  __esModule: true,
  default: MockIOSPlayer,
}));

jest.mock('../../app/player/web/WebPlayer', () => ({
  __esModule: true,
  default: MockWebPlayer,
}));

jest.mock('../../app/player/web/WebLivePlayer', () => ({
  __esModule: true,
  default: MockWebLivePlayer,
}));

import {
  createIOSPlayer,
  createWebPlayer,
  createClickMapPlayer,
  createLiveWebPlayer,
  createClipPlayer,
} from '../../app/player/create';

const session = { id: 1 } as any;
const errorHandler = { error: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('player factory functions', () => {
  it('createIOSPlayer returns player and store', () => {
    const [player, store] = createIOSPlayer(session, undefined, errorHandler);
    expect(player).toBeInstanceOf(MockIOSPlayer);
    expect(store.get()).toEqual(MockIOSPlayer.INITIAL_STATE);
    expect((player as any).store).toBe(store);
    expect((player as any).session).toBe(session);
    expect((player as any).handler).toBe(errorHandler);
  });

  it('createIOSPlayer applies wrapStore', () => {
    const wrapper = jest.fn((s) => s);
    const [, store] = createIOSPlayer(session, wrapper);
    expect(wrapper).toHaveBeenCalledWith(store);
  });

  it('createWebPlayer passes arguments correctly', () => {
    const [player, store] = createWebPlayer(
      session,
      undefined,
      errorHandler,
      true,
    );
    expect(player).toBeInstanceOf(MockWebPlayer);
    expect(store.get()).toEqual(MockWebPlayer.INITIAL_STATE);
    expect((player as any).live).toBe(false);
    expect((player as any).clickMap).toBe(false);
    expect((player as any).prefetched).toBe(true);
  });

  it('createClickMapPlayer creates click map WebPlayer', () => {
    const [player] = createClickMapPlayer(session);
    expect(player).toBeInstanceOf(MockWebPlayer);
    expect((player as any).clickMap).toBe(true);
  });

  it('createLiveWebPlayer passes all params', () => {
    const cfg = [{ url: 'stun:test' }] as any;
    const [player, store] = createLiveWebPlayer(
      session,
      cfg,
      5,
      7,
      undefined,
      errorHandler,
    );
    expect(player).toBeInstanceOf(MockWebLivePlayer);
    expect(store.get()).toEqual(MockWebLivePlayer.INITIAL_STATE);
    expect((player as any).config).toBe(cfg);
    expect((player as any).agentId).toBe(5);
    expect((player as any).projectId).toBe(7);
  });

  it('createClipPlayer mobile uses IOSPlayer and toggles range', () => {
    const range: [number, number] = [1, 5];
    const [player] = createClipPlayer(
      session,
      undefined,
      undefined,
      range,
      true,
    );
    expect(player).toBeInstanceOf(MockIOSPlayer);
    expect((player as any).toggleRange).toHaveBeenCalledWith(1, 5);
  });

  it('createClipPlayer web uses WebPlayer when not mobile', () => {
    const range: [number, number] = [1, 5];
    const [player] = createClipPlayer(
      session,
      undefined,
      undefined,
      range,
      false,
    );
    expect(player).toBeInstanceOf(MockWebPlayer);
    expect((player as any).toggleRange).toHaveBeenCalledWith(1, 5);
  });
});
