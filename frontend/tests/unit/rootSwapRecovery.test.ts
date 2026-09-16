/**
 * Regression cover for sessions recorded while the tracker still ignored a
 * replaced documentElement: the new <html> never got a CreateElementNode, so
 * every node under it referenced a parent the player had never created and the
 * replay froze on the pre-swap markup.
 */
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import TabSessionManager from '../../../player/src/web/TabManager';
import DOMManager from '../../../player/src/web/managers/DOM/DOMManager';
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

class FakeScreen {
  displayFrame = jest.fn();
  window: any = null;
  document: any = { body: { querySelector: jest.fn(), style: {} } };
  readonly selectMenu = {
    onValueApplied: jest.fn(),
    onFocus: jest.fn(),
    open: jest.fn(),
    hide: jest.fn(),
  };
}

const el = (id: number, parentID: number, index: number, tag: string) => ({
  tp: MType.CreateElementNode,
  id,
  parentID,
  index,
  tag,
  svg: false,
  time: 1000,
  tabId: 'tab1',
});

describe('TabManager: documentElement swap recovery', () => {
  let manager: TabSessionManager;
  let appended: any[];

  beforeEach(() => {
    const store = new SimpleStore({
      tabStates: { tab1: { ...TabSessionManager.INITIAL_STATE } },
      tabNames: {},
      eventCount: 0,
    });
    manager = new TabSessionManager(
      { isMobile: false } as any,
      store as any,
      new FakeScreen() as any,
      'tab1',
      jest.fn(),
      0,
    );
    appended = [];
    // @ts-ignore private access
    jest
      .spyOn((manager as any).pagesManager, 'appendMessage')
      .mockImplementation((m: any) => {
        appended.push(m);
      });
    manager.distributeMessage({
      tp: MType.CreateDocument,
      time: 0,
      tabId: 'tab1',
    } as any);
    manager.distributeMessage(el(1, 0, 0, 'HEAD') as any);
    manager.distributeMessage(el(8, 0, 1, 'BODY') as any);
    appended = [];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('synthesizes a CreateDocument in front of an orphaned HEAD', () => {
    manager.distributeMessage(el(16, 15, 0, 'HEAD') as any);

    expect(appended).toHaveLength(2);
    expect(appended[0]).toMatchObject({
      tp: MType.CreateDocument,
      rootId: 15,
      time: 1000,
      tabId: 'tab1',
    });
    expect(appended[1]).toMatchObject({ tp: MType.CreateElementNode, id: 16 });
  });

  it('recovers once per swap, not once per child', () => {
    manager.distributeMessage(el(16, 15, 0, 'HEAD') as any);
    expect(appended[0]).toMatchObject({ tp: MType.CreateDocument, rootId: 15 });
    appended = [];
    manager.distributeMessage(el(20, 15, 1, 'BODY') as any);

    expect(appended).toHaveLength(1);
    expect(appended[0]).toMatchObject({ tp: MType.CreateElementNode, id: 20 });
  });

  it('leaves a normal HEAD under the document root alone', () => {
    manager.distributeMessage(el(30, 0, 0, 'HEAD') as any);

    expect(appended.filter((m) => m.tp === MType.CreateDocument)).toHaveLength(
      0,
    );
  });

  it('leaves an iframe HEAD alone — iframe documents announce their own <html>', () => {
    manager.distributeMessage({
      tp: MType.CreateIFrameDocument,
      frameID: 2606,
      id: 3049,
      time: 1000,
      tabId: 'tab1',
    } as any);
    manager.distributeMessage(el(3050, 3049, 0, 'HTML') as any);
    appended = [];
    manager.distributeMessage(el(3051, 3050, 0, 'HEAD') as any);

    expect(appended.filter((m) => m.tp === MType.CreateDocument)).toHaveLength(
      0,
    );
  });

  it('recovers again when the page swaps its root a second time', () => {
    manager.distributeMessage(el(16, 15, 0, 'HEAD') as any);
    appended = [];
    manager.distributeMessage(el(100, 99, 0, 'HEAD') as any);

    expect(appended[0]).toMatchObject({
      tp: MType.CreateDocument,
      rootId: 99,
    });
  });
});

describe('DOMManager: CreateDocument carrying a recovered root id', () => {
  let frame: HTMLIFrameElement;
  let manager: DOMManager;

  const build = (rootId?: number) => {
    frame = document.createElement('iframe');
    document.body.appendChild(frame);
    manager = new DOMManager({
      screen: new FakeScreen() as any,
      isMobile: false,
      setCssLoading: jest.fn(),
      time: 0,
      stringDict: {},
      globalDict: { get: () => undefined, all: () => ({}) },
    });
    // @ts-ignore private access — screen.document must be a real Document here
    (manager as any).screen = { document: frame.contentDocument };
    // @ts-ignore private access
    (manager as any).applyMessage({
      tp: MType.CreateDocument,
      time: 0,
      ...(rootId !== undefined ? { rootId } : {}),
    });
  };

  afterEach(() => {
    frame.remove();
    jest.restoreAllMocks();
  });

  it('aliases the recovered id onto the fresh document element', () => {
    build(15);
    // @ts-ignore private access
    const vElements = (manager as any).vElements;
    expect(vElements.get(15)).toBe(vElements.get(0));
    expect(vElements.get(15).node.tagName).toBe('HTML');
  });

  it('adopts children addressed to the recovered root', () => {
    build(15);
    // @ts-ignore private access
    (manager as any).applyMessage({
      ...el(16, 15, 0, 'HEAD'),
      time: 0,
    });
    // @ts-ignore private access
    const vElements = (manager as any).vElements;
    expect(vElements.get(16).parentNode).toBe(vElements.get(0));
  });

  it('is a no-op without a rootId', () => {
    build();
    // @ts-ignore private access
    const vElements = (manager as any).vElements;
    expect(vElements.size).toBe(1);
    expect(vElements.get(0)).toBeDefined();
  });
});
