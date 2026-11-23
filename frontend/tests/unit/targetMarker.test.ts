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
import { watchDocumentHeight } from '../../../player/src/web/addons/watchDocumentHeight';

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
  frames = [];
  jest
    .spyOn(globalThis, 'requestAnimationFrame')
    .mockImplementation((cb: FrameRequestCallback) => frames.push(cb));
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
});

let frames: FrameRequestCallback[] = [];
function nextFrame() {
  const due = frames;
  frames = [];
  due.forEach((cb) => cb(0));
}

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

  test("redraws at the document's new size", () => {
    const { doc, setHeight } = replayDoc(1000);
    const { host, screen } = fakeScreen(doc);
    const marker = new TargetMarker(screen as any);
    marker.injectTargets([{ normalizedX: 50, normalizedY: 50, count: 1 }]);
    expect(overlayHeight(host)).toBe('1000px');

    setHeight(3000);
    marker.redraw();
    expect(host.querySelectorAll('canvas')).toHaveLength(1);
    expect(overlayHeight(host)).toBe('3000px');
    expect(marker.canvas).toBe(host.querySelector('canvas'));
  });

  test('a scroll map clears the click layer', () => {
    const { doc } = replayDoc(1000);
    const { host, screen } = fakeScreen(doc);
    const marker = new TargetMarker(screen as any);
    marker.injectTargets([{ normalizedX: 50, normalizedY: 50, count: 1 }]);
    marker.setTargets(null);
    marker.redraw();
    expect(host.querySelector('canvas')).toBeNull();
    expect(marker.canvas).toBeNull();
  });
});

describe('watchDocumentHeight', () => {
  test('reports height changes from late loads and resizes, once each', () => {
    const { doc, setHeight } = replayDoc(1000);
    const onChange = jest.fn();
    const unwatch = watchDocumentHeight(doc, onChange);

    resizeCallbacks.forEach((cb) => cb());
    nextFrame();
    expect(onChange).not.toHaveBeenCalled();

    // several signals in one frame are one check
    setHeight(3000);
    doc.dispatchEvent(new Event('load')); // a late <img>, caught on capture
    resizeCallbacks.forEach((cb) => cb());
    nextFrame();
    expect(onChange).toHaveBeenCalledTimes(1);

    setHeight(3200);
    resizeCallbacks.forEach((cb) => cb());
    nextFrame();
    expect(onChange).toHaveBeenCalledTimes(2);

    unwatch();
    expect(disconnect).toHaveBeenCalled();
    setHeight(4000);
    doc.dispatchEvent(new Event('load'));
    nextFrame();
    expect(onChange).toHaveBeenCalledTimes(2);
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

    Object.defineProperty(parent, 'offsetWidth', {
      configurable: true,
      get: () => 640,
    });
    screen.scale({ width: 1280, height: 800 });
    const iframe = parent.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.style.height).toBe('2400px');
    // the parent is the card's fixed window; labels read the scale back
    expect(parent.style.height).toBe('');
    expect(screen.screenElement.style.getPropertyValue('--m-screen-k')).toBe(
      '0.5',
    );

    // short pages still fill the recorded viewport
    Object.defineProperty(docEl, 'scrollHeight', {
      configurable: true,
      get: () => 300,
    });
    screen.scale({ width: 1280, height: 800 });
    expect(iframe.style.height).toBe('800px');
    parent.remove();
  });

  test('a 100vh section does not grow the page on every fit', () => {
    const screen = new Screen(false, ScaleMode.AdjustParentHeight);
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    screen.attach(parent);
    const iframe = parent.querySelector('iframe') as HTMLIFrameElement;
    // a 100vh hero (as tall as the iframe) above 3000px of content
    Object.defineProperty(screen.document!.documentElement, 'scrollHeight', {
      configurable: true,
      get: () => (parseFloat(iframe.style.height) || 800) + 3000,
    });
    Object.defineProperty(parent, 'offsetWidth', {
      configurable: true,
      get: () => 640,
    });

    screen.scale({ width: 1280, height: 800 });
    expect(iframe.style.height).toBe('3800px');
    screen.scale({ width: 1280, height: 800 });
    expect(iframe.style.height).toBe('3800px');
    parent.remove();
  });
});
