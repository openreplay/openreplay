import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import DOMManager from '../../../player/src/web/managers/DOM/DOMManager';
import TabClosingManager from '../../../player/src/web/managers/TabClosingManager';
import HookManager from '../../../player/src/web/managers/HookManager';
import Lists from '../../../player/src/web/Lists';
import { MType } from '../../../player/src/web/messages/raw.gen';

const el = (id: number, parentID: number, index: number, tag: string, time = 0) => ({
  tp: MType.CreateElementNode,
  id,
  parentID,
  index,
  tag,
  svg: false,
  time,
});

describe('DOMManager removed subtrees', () => {
  let frame: HTMLIFrameElement;
  let manager: DOMManager;

  beforeEach(() => {
    frame = document.createElement('iframe');
    document.body.appendChild(frame);
    manager = new DOMManager({
      screen: {
        document: frame.contentDocument!,
        selectMenu: { onFocus: jest.fn(), onValueApplied: jest.fn() },
      } as any,
      isMobile: false,
      setCssLoading: jest.fn(),
      time: 0,
      stringDict: {},
      globalDict: { get: () => undefined, all: () => ({}) },
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    frame.remove();
    jest.restoreAllMocks();
  });

  it('forgets descendants of a removed node but keeps ones moved out in the same batch', async () => {
    [
      { tp: MType.CreateDocument, time: 0 },
      el(1, 0, 0, 'BODY'),
      el(2, 1, 0, 'DIV'),
      el(3, 2, 0, 'SPAN'),
      el(4, 3, 0, 'B'),
      el(5, 2, 1, 'I'),
      { tp: MType.CreateTextNode, id: 6, parentID: 5, index: 0, time: 0 },
    ].forEach((m) => manager.append(m as any));
    await manager.moveReady(0);

    // one mutation: <i> moves to <body>, then <div> (with <span><b>) is removed
    manager.append({ tp: MType.MoveNode, id: 5, parentID: 1, index: 1, time: 10 } as any);
    manager.append({ tp: MType.RemoveNode, id: 2, time: 10 } as any);
    await manager.moveReady(10);

    expect(manager.getNode(2)).toBeUndefined();
    expect(manager.getNode(3)).toBeUndefined();
    expect(manager.getNode(4)).toBeUndefined();
    expect(manager.getNode(5)).toBeDefined();
    expect(manager.getNode(6)).toBeDefined();
  });
});

describe('TabClosingManager', () => {
  it('shows closed tabs again right after a rewind', () => {
    const m = new TabClosingManager();
    m.append({ tabId: 'a', time: 30 });
    m.append({ tabId: 'b', time: 200 });
    expect(m.moveReady(300)).toBe('b');
    expect(m.moveReady(60)).toBeTruthy();
    expect(Array.from(m.closedTabs)).toEqual(['a']);
    expect(m.moveReady(61)).toBeNull();
    expect(Array.from(m.closedTabs)).toEqual(['a']);
  });
});

describe('HookManager', () => {
  it('only keeps watched message types', () => {
    const h = new HookManager();
    h.setTypes([{ tp: 4, name: 'LOCATION', attrKey: 'url' }]);
    h.append({ tp: 4, time: 1, url: 'a' });
    h.append({ tp: 5, time: 2 });
    expect(h.length).toBe(1);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(h.moveReady(5)).toBe(true);
    expect(log).toHaveBeenCalledWith('TRIGGER:LOCATION_url:a');
    log.mockRestore();
  });
});

describe('Lists', () => {
  it('publishes marked counts for the current move and clears "now" lists on seek back', () => {
    const lists = new Lists({
      log: [
        { time: 10, isRed: true },
        { time: 20, isRed: false },
      ],
    } as any);
    const state = lists.moveGetState(15);
    expect(state.logMarkedCountNow).toBe(1);
    expect(state.logListNow).toHaveLength(1);
    // unchanged counts are not re-published every frame
    expect(lists.moveGetState(16).logMarkedCountNow).toBeUndefined();
    const back = lists.moveGetState(5);
    expect(back.logListNow).toEqual([]);
    expect(back.logMarkedCountNow).toBe(0);
  });
});
