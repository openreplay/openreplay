import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import TabSessionManager from '../../../player/src/web/TabManager';
import SimpleStore from '../../../player/src/common/SimpleStore';
import { TYPES as EVENT_TYPES } from '../../app/types/session/event';
import { MType } from '../../../player/src/web/messages/raw.gen';

jest.mock('@medv/finder', () => ({
  default: jest.fn(() => 'mocked network-proxy content'),
}));

jest.mock('syncod', () => {
  return {
    Decoder: jest
      .fn()
      .mockImplementation(() => ({ decode: jest.fn(), set: jest.fn() })),
  };
});

const mockCanvas = { startVideo: jest.fn(), reset: jest.fn(), move: jest.fn(), destroy: jest.fn() };
jest.mock('../../../player/src/web/managers/CanvasManager', () => ({
  __esModule: true,
  default: jest.fn(() => mockCanvas),
}));

jest.mock('modern-tar', () => ({
  __esModule: true,
  unpackTar: jest.fn(async () => []),
}));

class FakeScreen {
  displayFrame = jest.fn();
  window: any = null;
  document: any = { body: { querySelector: jest.fn(), style: {} } };
}

const session = { isMobile: false } as any;
const setSize = jest.fn();

let store: SimpleStore<any>;
let manager: TabSessionManager;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  store = new SimpleStore({
    tabStates: { tab1: { ...TabSessionManager.INITIAL_STATE } },
    tabNames: {},
    eventCount: 0,
  });
  manager = new TabSessionManager(
    session,
    store as any,
    new FakeScreen() as any,
    'tab1',
    setSize,
    0,
  );
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

it('updateLists should append location events and update store', () => {
  const event = { time: 1, key: 1, type: EVENT_TYPES.LOCATION } as any;
  expect(manager.updateLists({ event: [event] })).toBe(1);
  // @ts-ignore private access
  expect((manager as any).locationEventManager.list[0]).toBe(event);
  expect(store.get().tabStates['tab1'].eventList).toEqual([event]);
});

it('updateLists is idempotent for repeated session data', () => {
  const event = { time: 1, key: 1, type: EVENT_TYPES.LOCATION } as any;
  manager.updateLists({ event: [event] });
  expect(manager.updateLists({ event: [{ ...event }] })).toBe(1);
  expect(store.get().tabStates['tab1'].eventList.length).toBe(1);
});

it('resetMessageManagers should clear managers', () => {
  // @ts-ignore private access
  (manager as any).locationEventManager.append({ time: 1 });
  // @ts-ignore private access
  (manager as any).scrollManager.append({ time: 2 });
  const oldPages = (manager as any).pagesManager;
  manager.resetMessageManagers();
  // @ts-ignore private access
  expect((manager as any).locationEventManager.list.length).toBe(0);
  // @ts-ignore private access
  expect((manager as any).scrollManager.list.length).toBe(0);
  // @ts-ignore private access
  expect((manager as any).pagesManager).not.toBe(oldPages);
});

it('onFileReadSuccess should update store with lists and performance data', () => {
  (manager as any).performanceTrackManager['chart'] = [
    { time: 1, usedHeap: 0, totalHeap: 0, fps: null, cpu: null, nodesCount: 0 },
  ];
  (manager as any).performanceTrackManager['cpuAvailable'] = true;
  (manager as any).performanceTrackManager['fpsAvailable'] = true;
  manager.locationManager.append({ time: 2, url: 'http://example.com' } as any);
  manager.onFileReadSuccess();
  const state = store.get().tabStates['tab1'];
  expect(state.performanceChartData.length).toBe(1);
  expect(state.performanceAvailability).toEqual({
    cpu: true,
    fps: true,
    heap: false,
    nodes: true,
  });
  expect(state.urlsList[0].url).toBe('http://example.com');
});

it('decodeMessage should delegate to decoder', () => {
  const msg = { tp: MType.Timestamp, time: 0 } as any;
  const decoder = (manager as any).decoder;
  const decodeSpy = jest.spyOn(decoder, 'decode').mockReturnValue(msg);
  manager.decodeMessage(msg);
  expect(decodeSpy).toHaveBeenCalledWith(msg);
});

it('sortDomRemoveMessages comparator should prioritize head nodes', () => {
  const mock = { sortPages: jest.fn() };
  // @ts-ignore private access
  (manager as any).pagesManager = mock;
  const msgs = [
    { id: 1, parentID: 1, tp: MType.RemoveNode, time: 10 },
    { id: 2, parentID: 2, tp: MType.RemoveNode, time: 10 },
    { id: 3, parentID: 2, tp: MType.CreateElementNode, time: 10 },
  ] as any[];
  manager.sortDomRemoveMessages(msgs);
  const comparator = mock.sortPages.mock.calls[0][0];
  expect(comparator(msgs[0], msgs[2])).toBe(-1);
  expect(comparator(msgs[2], msgs[0])).toBe(1);
  expect(comparator(msgs[0], msgs[1])).toBe(-1);
  expect(comparator(msgs[1], msgs[0])).toBe(1);
});

it('sortDomRemoveMessages skips the sort when it cannot change anything', () => {
  const mock = { sortPages: jest.fn() };
  // @ts-ignore private access
  (manager as any).pagesManager = mock;
  manager.sortDomRemoveMessages([
    { id: 2, parentID: 2, tp: MType.RemoveNode, time: 10 },
  ] as any[]);
  expect(mock.sortPages).not.toHaveBeenCalled();
});

it('sortDomRemoveMessages still re-sorts indexed (v1) files by _index', () => {
  const mock = { sortPages: jest.fn() };
  // @ts-ignore private access
  (manager as any).pagesManager = mock;
  manager.sortDomRemoveMessages([
    { id: 2, parentID: 2, tp: MType.CreateElementNode, time: 10, _index: 3 },
  ] as any[]);
  expect(mock.sortPages).toHaveBeenCalled();
});

it('keeps a canvas running when seeking back between its message time and its own timestamp', async () => {
  const canvas = mockCanvas;
  const m = manager as any;
  m.session = { ...session, canvasURL: ['https://x/150_5.mp4'], canvasFrames: [] };
  m.pagesManager = { moveReady: () => Promise.resolve() };
  // the batch Timestamp (msg.time) precedes the CanvasNode's own timestamp
  manager.distributeMessage({ tp: MType.CanvasNode, time: 100, timestamp: 150, nodeId: 5 } as any);
  const flush = () => new Promise((r) => setTimeout(r, 0));

  manager.move(200);
  await flush();
  expect(canvas.startVideo).toHaveBeenCalledTimes(1);

  manager.move(120);
  await flush();
  expect(canvas.reset).not.toHaveBeenCalled();
  expect(canvas.move).toHaveBeenLastCalledWith(120);

  manager.move(50);
  await flush();
  expect(canvas.reset).toHaveBeenCalledTimes(1);
  manager.move(200);
  await flush();
  expect(canvas.startVideo).toHaveBeenCalledTimes(2);
});

it('resetMessageManagers rebuilds session lists and keeps virtual mode', () => {
  const location = { time: 1, key: 1, type: EVENT_TYPES.LOCATION } as any;
  const click = { time: 2, key: 2, type: EVENT_TYPES.CLICK } as any;
  const m = new TabSessionManager(
    session,
    store as any,
    new FakeScreen() as any,
    'tab1',
    setSize,
    0,
    { event: [location, click] },
  ) as any;
  m.setVirtualMode(true);
  m.canvasManagers.x = { manager: mockCanvas, start: 0, running: true };
  m.lists.lists.event.append({ time: 3, key: 3 });

  m.resetMessageManagers();

  expect(m.lists.lists.event.list).toEqual([location, click]);
  expect(m.locationEventManager.list).toEqual([location]);
  expect(m.pagesManager.virtualMode).toBe(true);
  expect(mockCanvas.destroy).toHaveBeenCalled();
  expect(m.canvasManagers).toEqual({});
});

describe('LoadFontFace sources', () => {
  const resolveFont = (source: string) => {
    const m = manager as any;
    m.pagesManager = { appendMessage: jest.fn() };
    manager.distributeMessage({
      tp: MType.SetPageLocation,
      time: 1,
      url: 'http://localhost:3000/app/page',
      referrer: '',
      navigationStart: 0,
    } as any);
    const msg = { tp: MType.LoadFontFace, time: 2, parentID: 1, family: 'f', source, descriptors: '' } as any;
    manager.distributeMessage(msg);
    return msg.source;
  };

  it('resolves root-relative urls against the page origin, keeping the port', () => {
    expect(resolveFont('url(/fonts/a.woff2) format("woff2")')).toBe(
      'url(http://localhost:3000/fonts/a.woff2) format("woff2")',
    );
  });

  it('handles quotes and several urls', () => {
    expect(resolveFont(`url("/a.woff"), url('/b.woff')`)).toBe(
      `url("http://localhost:3000/a.woff"), url('http://localhost:3000/b.woff')`,
    );
  });

  it('leaves protocol-relative, absolute and relative urls alone', () => {
    const source = 'url(//cdn.example.com/a.woff), url(https://x.com/b.woff), url(c.woff)';
    expect(resolveFont(source)).toBe(source);
  });
});
