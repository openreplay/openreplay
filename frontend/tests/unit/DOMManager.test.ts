import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import logger from 'App/logger';
import DOMManager from '../../app/player/web/managers/DOM/DOMManager';
import { VElement } from '../../app/player/web/managers/DOM/VirtualDOM';
import { MType } from '../../app/player/web/messages/raw.gen';

jest.mock('App/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    group: jest.fn(),
  },
}));

const loggedError = logger.error as jest.Mock;

class FrameVElement extends VElement {
  constructor(
    tagName: string,
    private readonly doc: Document,
    nodeId: number,
  ) {
    super(tagName, false, 0, nodeId);
  }

  protected createNode(): Element {
    return this.doc.createElement(this.tagName);
  }
}

class FakeScreen {
  constructor(readonly document: Document) {}
}

let frame: HTMLIFrameElement;
let frameDoc: Document;
let screen: FakeScreen;
let manager: DOMManager;

/** Creates an iframe-realm node, mounts it, and registers it under `nodeId`. */
function mount(tagName: string, nodeId: number): any {
  const vElem = new FrameVElement(tagName, frameDoc, nodeId);
  const node = vElem.node;
  frameDoc.body.appendChild(node);
  // @ts-ignore private access
  manager.vElements.set(nodeId, vElem);
  return node;
}

function setInputValue(id: number, value: string, mask = 0): void {
  // @ts-ignore private access
  manager.applyMessage({ tp: MType.SetInputValue, id, value, mask });
}

beforeEach(() => {
  frame = document.createElement('iframe');
  document.body.appendChild(frame);
  frameDoc = frame.contentDocument!;
  screen = new FakeScreen(frameDoc);
  manager = new DOMManager({
    screen: screen as any,
    isMobile: false,
    setCssLoading: jest.fn(),
    time: 0,
    stringDict: {},
    globalDict: { get: () => undefined, all: () => ({}) },
  });
});

afterEach(() => {
  frame.remove();
  jest.restoreAllMocks();
  loggedError.mockClear();
});

describe('SetInputValue on nodes in the replay iframe', () => {
  it('reproduces the cross-realm state the bug depended on', () => {
    const input = mount('input', 973);
    expect(input instanceof HTMLInputElement).toBe(false);
    expect(input.tagName).toBe('INPUT');
  });

  it('applies an incremental value to an input (#4858)', () => {
    const input = mount('input', 973);
    setInputValue(973, '1');
    expect(input.value).toBe('1');

    setInputValue(973, '2');
    expect(input.value).toBe('2');
  });

  it('applies a value to a textarea', () => {
    const textarea = mount('textarea', 42);
    setInputValue(42, 'hello');
    expect(textarea.value).toBe('hello');
  });

  it('masks the value when mask is set', () => {
    const input = mount('input', 973);
    setInputValue(973, 'ignored', 4);
    expect(input.value).toBe('****');
  });

  it('defers the update to blur while the input is focused', () => {
    const input = mount('input', 973);
    input.focus();
    expect(frameDoc.activeElement).toBe(input);

    setInputValue(973, '2');
    expect(input.value).toBe(''); // held back so typing is not clobbered

    input.blur();
    expect(input.value).toBe('2');
  });
});

describe('SetInputValue on a <select>', () => {
  /** <select> values are queued: the options may not have arrived yet. */
  function mountSelect(nodeId: number, values: string[]): any {
    const select = mount('select', nodeId);
    values.forEach((value) => {
      const option = frameDoc.createElement('option');
      option.value = value;
      select.appendChild(option);
    });
    return select;
  }

  it('queues the value and applies it on flush', () => {
    const select = mountSelect(500, ['a', 'b']);
    setInputValue(500, 'b');
    // @ts-ignore private access
    expect(manager.pendingSelectValues.get(500)).toBe('b');

    // @ts-ignore private access
    manager.flushPendingSelectValues();
    expect(select.value).toBe('b');
    // @ts-ignore private access
    expect(manager.pendingSelectValues.size).toBe(0);
  });

  it('keeps the value queued until the options exist', () => {
    const select = mount('select', 501);
    setInputValue(501, 'b');

    // @ts-ignore private access
    manager.flushPendingSelectValues();
    expect(select.value).toBe('');
    // @ts-ignore private access
    expect(manager.pendingSelectValues.get(501)).toBe('b');

    const option = frameDoc.createElement('option');
    option.value = 'b';
    select.appendChild(option);
    // @ts-ignore private access
    manager.flushPendingSelectValues();
    expect(select.value).toBe('b');
  });
});

describe('SetInputValue rejections', () => {
  it('logs and skips an element that has no value', () => {
    const div = mount('div', 7);

    expect(() => setInputValue(7, '2')).not.toThrow();
    expect(div.value).toBeUndefined();
    expect(loggedError).toHaveBeenCalled();
  });

  it('logs and skips an unknown node id', () => {
    expect(() => setInputValue(999, '2')).not.toThrow();
    expect(loggedError).toHaveBeenCalled();
  });
});
