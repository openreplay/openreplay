import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import SimpleStore from '../../../player/src/common/SimpleStore';
import AssistManager, {
  ConnectionStatus,
  RemoteControlStatus,
} from '../../../player/src/web/assist/AssistManager';

class FakeSocket {
  id = 'agent-socket';
  active = true;
  connected = true;
  private handlers: Record<string, Array<(...args: any[]) => void>> = {};
  on(event: string, cb: (...args: any[]) => void) {
    (this.handlers[event] ||= []).push(cb);
    return this;
  }
  off() {
    return this;
  }
  emit = jest.fn();
  open = jest.fn(() => {
    this.active = true;
  });
  close = jest.fn(() => {
    this.active = false;
    this.connected = false;
    this.fire('disconnect', 'io client disconnect');
  });
  fire(event: string, ...args: any[]) {
    this.handlers[event]?.forEach((cb) => cb(...args));
  }
}

let mockSocket: FakeSocket;
// the player resolves its own copy of socket.io-client
jest.mock('../../../player/node_modules/socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(() => mockSocket),
}));

let hidden = false;

function connect() {
  const store = new SimpleStore<any>({
    ...AssistManager.INITIAL_STATE,
    tabs: new Set(),
  });
  const manager = new AssistManager(
    { projectKey: 'pk', sessionId: '1', agentInfo: {}, startedAt: 0 },
    jest.fn(),
    jest.fn(),
    {
      display: jest.fn(),
      setRemoteControlActive: jest.fn(),
      setBorderStyle: jest.fn(),
      overlay: document.createElement('div'),
    } as any,
    null,
    store as any,
    jest.fn() as any,
    1,
    jest.fn(),
  );
  manager.connect('token', 1, 1);
  return { manager, store };
}

beforeEach(() => {
  mockSocket = new FakeSocket();
  hidden = false;
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
});

afterEach(() => {
  // @ts-ignore restore jsdom's prototype getter
  delete document.hidden;
  jest.useRealTimers();
});

describe('AssistManager socket status', () => {
  it('closes on a server-side disconnect, which socket.io never retries', () => {
    const { manager, store } = connect();
    mockSocket.fire('disconnect', 'io server disconnect');
    expect(store.get().peerConnectionStatus).toBe(ConnectionStatus.Closed);
    manager.clean();
  });

  it('waits for the automatic reconnect after a transport drop', () => {
    const { manager, store } = connect();
    mockSocket.fire('disconnect', 'transport close');
    expect(store.get().peerConnectionStatus).toBe(ConnectionStatus.Connecting);
    manager.clean();
  });
});

describe('AssistManager in a background tab', () => {
  it('drops the socket after 30s hidden and reconnects when visible', () => {
    jest.useFakeTimers();
    const { manager } = connect();
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    jest.advanceTimersByTime(30000);
    expect(mockSocket.close).toHaveBeenCalled();

    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(mockSocket.open).toHaveBeenCalled();
    manager.clean();
  });

  it('keeps the socket while remote control is active', () => {
    jest.useFakeTimers();
    const { manager, store } = connect();
    store.update({ remoteControl: RemoteControlStatus.Enabled });
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    jest.advanceTimersByTime(30000);
    expect(mockSocket.close).not.toHaveBeenCalled();
    manager.clean();
  });

  it('stops listening after clean', () => {
    jest.useFakeTimers();
    const { manager } = connect();
    manager.clean();
    mockSocket.close.mockClear();
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    jest.advanceTimersByTime(30000);
    expect(mockSocket.close).not.toHaveBeenCalled();
  });
});
