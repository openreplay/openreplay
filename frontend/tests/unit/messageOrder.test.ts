import { describe, expect, test, jest } from '@jest/globals';

jest.mock('Player/common/tarball', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('Player/common/unpack', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('Player/mobile/IOSMessageManager', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('Player/web/MessageManager', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('App/logger', () => ({ __esModule: true, default: { info: jest.fn() } }));
jest.mock('../../../player/src/web/messages/MFileReader', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../player/src/web/network/loadFiles', () => ({ __esModule: true, loadFiles: jest.fn(), requestTarball: jest.fn(), requestEFSDom: jest.fn(), requestEFSDevtools: jest.fn() }));
jest.mock('../../../player/src/web/network/crypto', () => ({ __esModule: true, decryptSessionBytes: jest.fn() }));

import {
  getMsgPriority,
  needsSorting,
  sortTimeGroup,
  fixMessageOrder,
} from '../../../player/src/web/MessageLoader';
import { MType } from '../../../player/src/web/messages';

type Msg = { tp: number; time: number; tabId: string; [k: string]: any };

function msg(tp: number, time: number, extra: Record<string, any> = {}): Msg {
  return { tp, time, tabId: 'tab1', ...extra };
}

/**
 * Broken message slice from a real customer session (Deel).
 * All messages share time=887. The original order has AdoptedSS and
 * non-DOM messages before CreateDocument, which breaks DOM replay.
 */
const brokenCustomerSlice: Msg[] = [
  { tp: 9999, tabId: '', time: 887 },
  { tp: 122, url: 'https://app.example.com/', referrer: '', navigationStart: 1774356183369, documentTitle: 'Example App', time: 887, tabId: 'tab1' },
  { tp: 5, width: 1920, height: 911, time: 887, tabId: 'tab1' },
  { tp: 55, hidden: false, time: 887, tabId: 'tab1' },
  { tp: 49, frames: -1, ticks: -1, totalJSHeapSize: 341963595, usedJSHeapSize: 238719147, time: 887, tabId: 'tab1' },
  { tp: 6, x: 0, y: 0, time: 887, tabId: 'tab1' },
  { tp: 76, sheetID: 15, id: 0, time: 887, tabId: 'tab1' },
  { tp: 74, sheetID: 15, rule: '.widget-1 { --base-accent: rgb(120, 86, 255); }', index: 0, time: 887, tabId: 'tab1' },
  { tp: 76, sheetID: 16, id: 0, time: 887, tabId: 'tab1' },
  { tp: 74, sheetID: 16, rule: '.widget-0 { --base-accent: rgb(120, 86, 255); }', index: 0, time: 887, tabId: 'tab1' },
  { tp: 7, time: 887, tabId: 'tab1' },
  { tp: 12, id: 0, name: 'lang', value: 'en', time: 887, tabId: 'tab1' },
  { tp: 12, id: 0, name: 'translate', value: 'no', time: 887, tabId: 'tab1' },
  { tp: 12, id: 0, name: 'class', value: 'notranslate', time: 887, tabId: 'tab1' },
  { tp: 12, id: 0, name: 'data-theme', value: 'rebrand-light', time: 887, tabId: 'tab1' },
  { tp: 12, id: 0, name: 'dir', value: 'ltr', time: 887, tabId: 'tab1' },
  { tp: 12, id: 0, name: 'style', value: '--dui-palette-mode: light;', time: 887, tabId: 'tab1' },
  { tp: 8, id: 1, parentID: 0, index: 0, tag: 'HEAD', svg: false, time: 887, tabId: 'tab1' },
  { tp: 9, id: 2, parentID: 1, index: 0, time: 887, tabId: 'tab1' },
  { tp: 14, id: 2, data: '\n    ', time: 887, tabId: 'tab1' },
  { tp: 9, id: 3, parentID: 1, index: 1, time: 887, tabId: 'tab1' },
  { tp: 14, id: 3, data: '\n    ', time: 887, tabId: 'tab1' },
  { tp: 8, id: 22, parentID: 1, index: 20, tag: 'STYLE', svg: false, time: 887, tabId: 'tab1' },
  { tp: 12, id: 22, name: 'data-styles', value: '', time: 887, tabId: 'tab1' },
  { tp: 9, id: 23, parentID: 22, index: 0, time: 887, tabId: 'tab1' },
  { tp: 15, id: 23, data: 'zapier-app{visibility:hidden}.hydrated{visibility:inherit}', time: 887, tabId: 'tab1' },
  { tp: 8, id: 37, parentID: 1, index: 34, tag: 'STYLE', svg: false, time: 887, tabId: 'tab1' },
  { tp: 9, id: 38, parentID: 37, index: 0, time: 887, tabId: 'tab1' },
  { tp: 15, id: 38, data: '@page { margin: 0 auto; }', time: 887, tabId: 'tab1' },
];

describe('getMsgPriority', () => {
  test('CreateDocument is priority 0', () => {
    expect(getMsgPriority(MType.CreateDocument)).toBe(0);
  });

  test('SetPageLocation is priority 1', () => {
    expect(getMsgPriority(MType.SetPageLocation)).toBe(1);
    expect(getMsgPriority(MType.SetPageLocationDeprecated)).toBe(1);
  });

  test('node creation is priority 2', () => {
    expect(getMsgPriority(MType.CreateElementNode)).toBe(2);
    expect(getMsgPriority(MType.CreateTextNode)).toBe(2);
    expect(getMsgPriority(MType.CreateIFrameDocument)).toBe(2);
  });

  test('node attributes/data is priority 3', () => {
    expect(getMsgPriority(MType.SetNodeAttribute)).toBe(3);
    expect(getMsgPriority(MType.SetNodeData)).toBe(3);
    expect(getMsgPriority(MType.SetCssData)).toBe(3);
    expect(getMsgPriority(MType.RemoveNodeAttribute)).toBe(3);
  });

  test('AdoptedSsAddOwner is priority 4', () => {
    expect(getMsgPriority(MType.AdoptedSsAddOwner)).toBe(4);
  });

  test('AdoptedSS mutations are priority 5', () => {
    expect(getMsgPriority(MType.AdoptedSsInsertRule)).toBe(5);
    expect(getMsgPriority(MType.AdoptedSsReplace)).toBe(5);
    expect(getMsgPriority(MType.AdoptedSsDeleteRule)).toBe(5);
  });

  test('MoveNode is priority 6', () => {
    expect(getMsgPriority(MType.MoveNode)).toBe(6);
  });

  test('non-DOM messages are priority 7', () => {
    expect(getMsgPriority(MType.SetViewportSize)).toBe(7);
    expect(getMsgPriority(MType.MouseMove)).toBe(7);
    expect(getMsgPriority(MType.PerformanceTrack)).toBe(7);
    expect(getMsgPriority(MType.SetPageVisibility)).toBe(7);
  });

  test('RemoveNode/RemoveOwner is priority 8', () => {
    expect(getMsgPriority(MType.RemoveNode)).toBe(8);
    expect(getMsgPriority(MType.AdoptedSsRemoveOwner)).toBe(8);
  });
});

describe('needsSorting', () => {
  test('returns false for already-ordered group', () => {
    const msgs = [
      msg(MType.CreateDocument, 100),
      msg(MType.CreateElementNode, 100),
      msg(MType.SetNodeAttribute, 100),
    ];
    expect(needsSorting(msgs as any, 0, msgs.length)).toBe(false);
  });

  test('returns true when CreateDocument is not first', () => {
    const msgs = [
      msg(MType.SetNodeAttribute, 100),
      msg(MType.CreateDocument, 100),
    ];
    expect(needsSorting(msgs as any, 0, msgs.length)).toBe(true);
  });

  test('returns true when AdoptedSS comes before CreateDocument', () => {
    const msgs = [
      msg(MType.AdoptedSsAddOwner, 100),
      msg(MType.CreateDocument, 100),
    ];
    expect(needsSorting(msgs as any, 0, msgs.length)).toBe(true);
  });

  test('returns true for broken customer slice', () => {
    expect(
      needsSorting(brokenCustomerSlice as any, 0, brokenCustomerSlice.length),
    ).toBe(true);
  });

  test('respects start/end bounds', () => {
    const msgs = [
      msg(MType.SetNodeAttribute, 50),
      msg(MType.CreateDocument, 100),
      msg(MType.CreateElementNode, 100),
      msg(MType.SetNodeAttribute, 100),
      msg(MType.RemoveNode, 150),
    ];
    // only check the ordered middle group [1..4)
    expect(needsSorting(msgs as any, 1, 4)).toBe(false);
  });
});

describe('sortTimeGroup', () => {
  test('puts CreateDocument first in group', () => {
    const msgs = [
      msg(MType.SetNodeAttribute, 100),
      msg(MType.AdoptedSsAddOwner, 100),
      msg(MType.CreateDocument, 100),
    ];
    sortTimeGroup(msgs as any, 0, msgs.length);
    expect(msgs[0].tp).toBe(MType.CreateDocument);
  });

  test('preserves relative order within same priority', () => {
    const msgs = [
      msg(MType.CreateDocument, 100),
      msg(MType.CreateElementNode, 100, { id: 1 }),
      msg(MType.CreateTextNode, 100, { id: 2 }),
      msg(MType.CreateElementNode, 100, { id: 3 }),
    ];
    sortTimeGroup(msgs as any, 0, msgs.length);
    const ids = msgs.filter((m) => m.tp !== MType.CreateDocument).map((m) => m.id);
    expect(ids).toEqual([1, 2, 3]);
  });

  test('orders all tiers correctly', () => {
    const msgs = [
      msg(MType.RemoveNode, 100),
      msg(MType.MoveNode, 100),
      msg(MType.AdoptedSsInsertRule, 100),
      msg(MType.AdoptedSsAddOwner, 100),
      msg(MType.SetNodeAttribute, 100),
      msg(MType.CreateElementNode, 100),
      msg(MType.SetPageLocation, 100),
      msg(MType.CreateDocument, 100),
      msg(MType.SetViewportSize, 100),
    ];
    sortTimeGroup(msgs as any, 0, msgs.length);
    const tps = msgs.map((m) => m.tp);
    expect(tps).toEqual([
      MType.CreateDocument,
      MType.SetPageLocation,
      MType.CreateElementNode,
      MType.SetNodeAttribute,
      MType.AdoptedSsAddOwner,
      MType.AdoptedSsInsertRule,
      MType.MoveNode,
      MType.SetViewportSize,
      MType.RemoveNode,
    ]);
  });
});

describe('fixMessageOrder — broken customer slice', () => {
  test('CreateDocument comes before any DOM messages', () => {
    const msgs = [...brokenCustomerSlice];
    fixMessageOrder(msgs as any);

    const docIdx = msgs.findIndex((m) => m.tp === MType.CreateDocument);
    const domTypes = new Set([
      MType.CreateElementNode,
      MType.CreateTextNode,
      MType.SetNodeAttribute,
      MType.SetNodeData,
      MType.SetCssData,
    ]);

    msgs.forEach((m, i) => {
      if (domTypes.has(m.tp)) {
        expect(i).toBeGreaterThan(docIdx);
      }
    });
  });

  test('SetPageLocation comes right after CreateDocument', () => {
    const msgs = [...brokenCustomerSlice];
    fixMessageOrder(msgs as any);

    const docIdx = msgs.findIndex((m) => m.tp === MType.CreateDocument);
    const locIdx = msgs.findIndex((m) => m.tp === MType.SetPageLocation);
    expect(locIdx).toBeGreaterThan(docIdx);

    // nothing between them should have lower priority than SetPageLocation
    for (let i = docIdx + 1; i < locIdx; i++) {
      expect(getMsgPriority(msgs[i].tp)).toBeLessThanOrEqual(
        getMsgPriority(MType.SetPageLocation),
      );
    }
  });

  test('AdoptedSsAddOwner comes before AdoptedSsInsertRule', () => {
    const msgs = [...brokenCustomerSlice];
    fixMessageOrder(msgs as any);

    const ownerIdxs = msgs
      .map((m, i) => (m.tp === MType.AdoptedSsAddOwner ? i : -1))
      .filter((i) => i >= 0);
    const ruleIdxs = msgs
      .map((m, i) => (m.tp === MType.AdoptedSsInsertRule ? i : -1))
      .filter((i) => i >= 0);

    expect(ownerIdxs.length).toBeGreaterThan(0);
    expect(ruleIdxs.length).toBeGreaterThan(0);
    expect(Math.max(...ownerIdxs)).toBeLessThan(Math.min(...ruleIdxs));
  });

  test('AdoptedSS messages come after node creation', () => {
    const msgs = [...brokenCustomerSlice];
    fixMessageOrder(msgs as any);

    const lastCreateIdx = Math.max(
      ...msgs
        .map((m, i) =>
          [MType.CreateElementNode, MType.CreateTextNode].includes(m.tp)
            ? i
            : -1,
        )
        .filter((i) => i >= 0),
    );
    const firstOwnerIdx = msgs.findIndex(
      (m) => m.tp === MType.AdoptedSsAddOwner,
    );

    expect(firstOwnerIdx).toBeGreaterThan(lastCreateIdx);
  });

  test('non-DOM messages sort after DOM messages', () => {
    const msgs = [...brokenCustomerSlice];
    fixMessageOrder(msgs as any);

    const nonDom = new Set([
      MType.SetViewportSize,
      MType.SetViewportScroll,
      MType.SetPageVisibility,
      MType.PerformanceTrack,
    ]);
    const lastDomIdx = Math.max(
      ...msgs
        .map((m, i) => (getMsgPriority(m.tp) <= 6 ? i : -1))
        .filter((i) => i >= 0),
    );
    msgs.forEach((m, i) => {
      if (nonDom.has(m.tp)) {
        expect(i).toBeGreaterThan(lastDomIdx);
      }
    });
  });

  test('priorities are monotonically non-decreasing after fix', () => {
    const msgs = [...brokenCustomerSlice];
    fixMessageOrder(msgs as any);

    for (let i = 1; i < msgs.length; i++) {
      if (msgs[i].time === msgs[i - 1].time) {
        expect(getMsgPriority(msgs[i].tp)).toBeGreaterThanOrEqual(
          getMsgPriority(msgs[i - 1].tp),
        );
      }
    }
  });
});

describe('fixMessageOrder — multi-time groups', () => {
  test('sorts by time first, then fixes broken groups', () => {
    const msgs = [
      msg(MType.SetNodeAttribute, 200),
      msg(MType.CreateDocument, 200),
      msg(MType.CreateElementNode, 100),
      msg(MType.CreateDocument, 100),
    ];
    fixMessageOrder(msgs as any);

    expect(msgs[0].time).toBe(100);
    expect(msgs[1].time).toBe(100);
    expect(msgs[2].time).toBe(200);
    expect(msgs[3].time).toBe(200);

    expect(msgs[0].tp).toBe(MType.CreateDocument);
    expect(msgs[1].tp).toBe(MType.CreateElementNode);
    expect(msgs[2].tp).toBe(MType.CreateDocument);
    expect(msgs[3].tp).toBe(MType.SetNodeAttribute);
  });

  test('skips groups that are already ordered', () => {
    const msgs = [
      msg(MType.CreateDocument, 100),
      msg(MType.CreateElementNode, 100),
      msg(MType.SetNodeAttribute, 100),
      msg(MType.MouseMove, 200),
      msg(MType.MouseMove, 200),
    ];
    const original = msgs.map((m) => m.tp);
    fixMessageOrder(msgs as any);
    expect(msgs.map((m) => m.tp)).toEqual(original);
  });

  test('single-message groups are untouched', () => {
    const msgs = [
      msg(MType.MouseMove, 100),
      msg(MType.CreateDocument, 200),
      msg(MType.RemoveNode, 300),
    ];
    fixMessageOrder(msgs as any);
    expect(msgs.map((m) => m.tp)).toEqual([
      MType.MouseMove,
      MType.CreateDocument,
      MType.RemoveNode,
    ]);
  });
});
