import { it, expect, beforeEach, jest } from '@jest/globals';
import TabSessionManager from '../../app/player/web/TabManager';
import SimpleStore from '../../app/player/common/SimpleStore';
import { TYPES as EVENT_TYPES } from '../../app/types/session/event';
import { MType } from '../../app/player/web/messages/raw.gen';

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

jest.mock('js-untar', () => ({
  __esModule: true,
  default: jest.fn(),
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
  manager.updateLists({ event: [event] });
  // @ts-ignore private access
  expect((manager as any).locationEventManager.list[0]).toBe(event);
  expect(store.get().tabStates['tab1'].eventList).toEqual([event]);
  expect(store.get().eventCount).toBe(1);
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
  manager.decodeMessage(msg);
  expect(decoder.decode).toHaveBeenCalledWith(msg);
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
