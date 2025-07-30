import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import SimpleStore from '../../app/player/common/SimpleStore';

interface State {
  value: number;
  tabStates?: Record<string, { count: number }>;
}

describe('SimpleStore', () => {
  let store: SimpleStore<State>;

  beforeEach(() => {
    store = new SimpleStore<State>({ value: 1, tabStates: { t1: { count: 0 } } });
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('get returns current state', () => {
    expect(store.get()).toEqual({ value: 1, tabStates: { t1: { count: 0 } } });
  });

  it('update merges partial state', () => {
    store.update({ value: 5 });
    expect(store.get().value).toBe(5);
  });

  it('updateTabStates updates nested state', () => {
    store.updateTabStates('t1', { count: 10 });
    expect(store.get().tabStates?.t1.count).toBe(10);
  });

  it('updateTabStates logs error when tab state missing', () => {
    store = new SimpleStore<State>({ value: 1 });
    store.updateTabStates('unknown', { count: 3 });
    expect((console.log as jest.Mock).mock.calls.length).toBe(1);
  });
});
