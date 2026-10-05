import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import SimpleStore from '../../../player/src/common/SimpleStore';
import IOSMessageManager from '../../../player/src/mobile/IOSMessageManager';
import { MOUSE_TRAIL } from '../../../player/src/constants';
import { MType } from '../../../player/src/web/messages/raw.gen';

const START = 1_000_000;

function create() {
  localStorage.setItem(MOUSE_TRAIL, 'false');
  const store = new SimpleStore<any>({ ...IOSMessageManager.INITIAL_STATE, time: 0 });
  const screen = { overlay: document.createElement('div'), display: jest.fn() } as any;
  const manager = new IOSMessageManager(
    { startedAt: START, duration: { milliseconds: 60_000 } },
    store,
    screen,
  );
  return { manager, store };
}

const perf = (name: string, value: number, t: number) =>
  ({ tp: MType.MobilePerformanceEvent, name, value, timestamp: START + t, time: 0 }) as any;

beforeEach(() => {
  jest.spyOn(console, 'debug').mockImplementation(() => {});
});

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe('IOSMessageManager', () => {
  it('updateLists replaces injected errors instead of duplicating them', () => {
    const { manager, store } = create();
    const errors = [{ time: 50, isRed: true, name: 'crash' }];
    manager.updateLists({ exceptions: errors, frustrations: [] } as any);
    manager.distributeMessage({
      tp: MType.MobileLog,
      severity: 'info',
      content: 'early log',
      timestamp: START + 10,
      time: 0,
    } as any);
    manager.updateLists({ exceptions: errors, frustrations: [] } as any);
    const state = store.get();
    expect(state.exceptionsList).toHaveLength(1);
    // the log older than the injected error is kept, the error appears once
    expect(state.logList.map((l: any) => l.time)).toEqual([10, 50]);
  });

  it('ignores face up/down orientation values', () => {
    const { manager, store } = create();
    manager.distributeMessage(perf('orientation', 3, 10));
    manager.distributeMessage(perf('orientation', 5, 20));
    manager.move(30);
    expect(store.get().orientation).toBe('landscapeLeft');
  });

  it('resets background state when seeking back before the first event', () => {
    const { manager, store } = create();
    manager.distributeMessage(perf('background', 1, 100));
    manager.move(200);
    expect(store.get().inBackground).toBe(true);
    manager.move(50);
    expect(store.get().inBackground).toBe(false);
  });

  it('does not touch the store on a move that changes nothing', () => {
    const { manager, store } = create();
    manager.distributeMessage({
      tp: MType.MobileLog,
      severity: 'info',
      content: 'log',
      timestamp: START + 10,
      time: 0,
    } as any);
    manager.move(30);
    const update = jest.spyOn(store, 'update');
    manager.move(30);
    expect(update).not.toHaveBeenCalled();
  });

  it('keeps the performance chart sorted when points arrive late', () => {
    const { manager } = create();
    manager.distributeMessage(perf('memoryUsage', 1, 200));
    manager.distributeMessage(perf('memoryUsage', 2, 100));
    manager.distributeMessage(perf('mainThreadCPU', 3, 150));
    const chart = (manager as any).performanceManager.chartData;
    expect(chart.map((p: any) => p.time)).toEqual([100, 150, 200]);
  });

  it('stops writing to the store after clean', async () => {
    const { manager, store } = create();
    manager.clean();
    manager.distributeMessage(perf('memoryUsage', 1, 10));
    manager.setMessagesLoading(true);
    // lastMessageTime is published from a microtask
    await Promise.resolve();
    expect(store.get().messagesLoading).toBe(false);
    expect(store.get().lastMessageTime).toBe(0);
  });

  it('drops a lastMessageTime publish queued right before clean', async () => {
    const { manager, store } = create();
    manager.distributeMessage(perf('memoryUsage', 1, 10));
    manager.clean();
    await Promise.resolve();
    expect(store.get().lastMessageTime).toBe(0);
  });
});
