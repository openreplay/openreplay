import { it, expect, jest } from '@jest/globals';
// enter the TabManager -> index -> WebPlayer -> MessageManager import cycle from the side that resolves
import '../../../player/src/web/TabManager';
import MessageManager from '../../../player/src/web/MessageManager';
import SimpleStore from '../../../player/src/common/SimpleStore';
import { MType } from '../../../player/src/web/messages/raw.gen';

jest.mock('@medv/finder', () => ({
  default: jest.fn(() => 'mocked network-proxy content'),
}));

jest.mock('syncod', () => ({
  Decoder: jest
    .fn()
    .mockImplementation(() => ({ decode: jest.fn(), set: jest.fn() })),
}));

jest.mock('modern-tar', () => ({
  __esModule: true,
  unpackTar: jest.fn(async () => []),
}));

function create() {
  const store = new SimpleStore<any>({
    ...MessageManager.INITIAL_STATE,
    time: 0,
    tabStates: {},
    tabNames: {},
  });
  const screen = {
    displayFrame: jest.fn(),
    window: null,
    document: { body: { querySelector: jest.fn(), style: {} } },
    selectMenu: { hide: jest.fn() },
    cursor: { move: jest.fn(), click: jest.fn() },
    overlay: document.createElement('div'),
    setOnUpdate: jest.fn(),
    getLastDimensions: () => null,
  } as any;
  const manager = new MessageManager(
    { startedAt: 0, duration: { milliseconds: 60_000 } } as any,
    store as any,
    screen,
  );
  return { manager, store };
}

const connection = (time: number) =>
  ({
    tp: MType.ConnectionInformation,
    time,
    downlink: 1000,
    type: '4g',
    tabId: 'tab1',
  }) as any;

it('re-feeding the session after a reset does not duplicate connection items', () => {
  const { manager } = create();
  manager.distributeMessage(connection(10));
  manager.distributeMessage(connection(20));
  manager.resetMessageManagers();
  manager.distributeMessage(connection(10));
  manager.distributeMessage(connection(20));
  expect((manager as any).connectionInfoManger.length).toBe(2);
});

it('a publish queued before clean does not restore lastMessageTime', async () => {
  const { manager, store } = create();
  manager.distributeMessage(connection(500));
  manager.clean();
  await Promise.resolve();
  expect(store.get().lastMessageTime).toBe(0);
});
