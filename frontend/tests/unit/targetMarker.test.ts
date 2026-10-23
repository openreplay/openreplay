import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';

import Screen, { ScaleMode } from '../../../player/src/web/Screen/Screen';
import TargetMarker from '../../../player/src/web/addons/TargetMarker';

const heatmapCalls: { data?: number[][]; max?: number } = {};
jest.mock('../../../player/src/web/addons/simpleHeatmap', () => {
  return class FakeHeatmap {
    setCanvas() {
      return this;
    }
    setData(d: number[][]) {
      heatmapCalls.data = d;
      return this;
    }
    setRadius() {
      return this;
    }
    setMax(m: number) {
      heatmapCalls.max = m;
      return this;
    }
    resize() {
      return this;
    }
    draw() {
      return this;
    }
    enableInteractions() {
      return this;
    }
    destroy() {}
  };
});

let resizeCallbacks: (() => void)[] = [];
const disconnect = jest.fn();

beforeEach(() => {
  resizeCallbacks = [];
  disconnect.mockClear();
  (globalThis as any).ResizeObserver = class {
    constructor(cb: () => void) {
      resizeCallbacks.push(cb);
    }
    observe() {}
    disconnect = disconnect;
  };
  jest
    .spyOn(globalThis, 'requestAnimationFrame')
    .mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
});

afterEach(() => {
  jest.restoreAllMocks();
  delete (globalThis as any).ResizeObserver;
});

function replayDoc(height: number) {
  const doc = document.implementation.createHTMLDocument('replay');
  let h = height;
  Object.defineProperty(doc.documentElement, 'scrollHeight', {
    configurable: true,
    get: () => h,
  });
  Object.defineProperty(doc.documentElement, 'scrollWidth', {
    configurable: true,
    get: () => 1000,
  });
  return { doc, setHeight: (next: number) => (h = next) };
}

function fakeScreen(doc: Document) {
  const host = document.createElement('div');
  return {
    host,
    screen: {
      document: doc,
      addToScreen: (el: HTMLElement) => host.appendChild(el),
    },
  };
}

const overlayHeight = (host: HTMLElement) =>
  (host.querySelector('canvas') as HTMLCanvasElement).style.height;

describe('TargetMarker', () => {
  test('weighs each cell by its click count', () => {
    const { doc } = replayDoc(1000);
    const { screen } = fakeScreen(doc);
    const marker = new TargetMarker(screen as any);
    marker.injectTargets([
      { normalizedX: 10, normalizedY: 10, count: 3 },
      { normalizedX: 10, normalizedY: 10, count: 2 },
      { normalizedX: 20, normalizedY: 20 },
    ]);
    expect(heatmapCalls.data?.map((p) => p[2])).toEqual([5, 1]);
    expect(heatmapCalls.max).toBe(5);
  });

  test('re-fits the overlay when the frozen document grows', () => {
    const { doc, setHeight } = replayDoc(1000);
    const { host, screen } = fakeScreen(doc);
    const rescale = jest.fn();
    const marker = new TargetMarker(screen as any, rescale);
    marker.injectTargets([{ normalizedX: 50, normalizedY: 50, count: 1 }]);
    expect(overlayHeight(host)).toBe('1000px');

    setHeight(3000);
    doc.dispatchEvent(new Event('load')); // a late <img>, caught on capture
    expect(rescale).toHaveBeenCalledTimes(1);
    expect(host.querySelectorAll('canvas')).toHaveLength(1);
    expect(overlayHeight(host)).toBe('3000px');

    // resize callbacks without a height change don't redraw
    resizeCallbacks.forEach((cb) => cb());
    expect(rescale).toHaveBeenCalledTimes(1);
  });

  test('stops watching once removed', () => {
    const { doc, setHeight } = replayDoc(1000);
    const { host, screen } = fakeScreen(doc);
    const rescale = jest.fn();
    const marker = new TargetMarker(screen as any, rescale);
    marker.injectTargets([{ normalizedX: 50, normalizedY: 50, count: 1 }]);
    marker.destroy();
    expect(disconnect).toHaveBeenCalled();

    setHeight(3000);
    doc.dispatchEvent(new Event('load'));
    expect(rescale).not.toHaveBeenCalled();
    expect(host.querySelector('canvas')).toBeNull();
  });
});

describe('Screen in clickmap mode', () => {
  test('sizes the replay to the document height, not just the body', () => {
    const screen = new Screen(false, ScaleMode.AdjustParentHeight);
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    screen.attach(parent);
    const docEl = screen.document!.documentElement;
    Object.defineProperty(docEl, 'scrollHeight', {
      configurable: true,
      get: () => 2400,
    });
    Object.defineProperty(screen.document!.body, 'scrollHeight', {
      configurable: true,
      get: () => 2384, // body misses its own margins
    });

    screen.scale({ width: 1280, height: 800 });
    const iframe = parent.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.style.height).toBe('2400px');

    // short pages still fill the recorded viewport
    Object.defineProperty(docEl, 'scrollHeight', {
      configurable: true,
      get: () => 300,
    });
    screen.scale({ width: 1280, height: 800 });
    expect(iframe.style.height).toBe('800px');
    parent.remove();
  });
});
