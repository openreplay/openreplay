import { describe, it, expect } from '@jest/globals';
import { autorun, isObservable } from 'mobx';
import SimpleStore from '../../../player/src/common/SimpleStore';
import { wrapPlayerStore } from '../../app/components/Session/playerStore';

describe('wrapPlayerStore', () => {
  it('keeps list items plain and still reacts to per-tab updates', () => {
    const store = wrapPlayerStore(
      new SimpleStore<any>({ tabStates: {}, skipIntervals: [], time: 0 }),
    );
    const log = { time: 1, value: 'a' };
    store.update({ tabStates: { t1: { logListNow: [], logList: [log] } } });

    const seen: number[] = [];
    const dispose = autorun(() => {
      seen.push(store.get().tabStates.t1.logListNow.length);
    });
    store.updateTabStates('t1', { logListNow: [log] });
    dispose();

    expect(seen).toEqual([0, 1]);
    const { logList, logListNow } = store.get().tabStates.t1;
    expect(isObservable(logListNow)).toBe(true);
    // items are stored by reference, not rebuilt as observable objects
    expect(logList[0]).toBe(log);
    expect(isObservable(logListNow[0])).toBe(false);
  });

  it('shallow-wraps top-level arrays', () => {
    const store = wrapPlayerStore(new SimpleStore<any>({ skipIntervals: [] }));
    const interval = { start: 1, end: 2 };
    store.update({ skipIntervals: [interval] });
    expect(store.get().skipIntervals[0]).toBe(interval);
  });
});
