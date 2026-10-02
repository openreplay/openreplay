import { describe, it, expect, beforeEach, jest } from '@jest/globals';
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

  it('stops writing to the store after clean', () => {
    const { manager, store } = create();
    manager.clean();
    manager.distributeMessage(perf('memoryUsage', 1, 10));
    manager.setMessagesLoading(true);
    expect(store.get().messagesLoading).toBe(false);
  });
});
