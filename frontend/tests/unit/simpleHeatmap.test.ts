import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import SimpleHeatmap from '../../../player/src/web/addons/simpleHeatmap';
import { getCanvasDownscale } from '../../../player/src/web/addons/TargetMarker';

type FakeCtx = Record<string, any>;

const contexts = new WeakMap<HTMLCanvasElement, FakeCtx>();

function makeCtx(canvas: HTMLCanvasElement): FakeCtx {
  return {
    canvas,
    globalAlpha: 1,
    clearRect: jest.fn(),
    drawImage: jest.fn(),
    getImageData: jest.fn((_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(Math.max(1, w * h * 4)),
    })),
    putImageData: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    setLineDash: jest.fn(),
    strokeRect: jest.fn(),
    measureText: jest.fn(() => ({ width: 30 })),
    fillText: jest.fn(),
  };
}

function withFakeContext(canvas: HTMLCanvasElement) {
  Object.defineProperty(canvas, 'getContext', {
    configurable: true,
    value: () => {
      let ctx = contexts.get(canvas);
      if (!ctx) {
        ctx = makeCtx(canvas);
        contexts.set(canvas, ctx);
      }
      return ctx;
    },
  });
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      width: canvas.width,
      height: canvas.height,
    }),
  });
  return canvas;
}

const createdCanvases: HTMLCanvasElement[] = [];
let createElementSpy: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
  const original = document.createElement.bind(document);
  createElementSpy = jest
    .spyOn(document, 'createElement')
    .mockImplementation(((tag: string, opts?: ElementCreationOptions) => {
      const el = original(tag, opts);
      if (tag === 'canvas') {
        withFakeContext(el as HTMLCanvasElement);
        createdCanvases.push(el as HTMLCanvasElement);
      }
      return el;
    }) as typeof document.createElement);
});

afterEach(() => {
  createElementSpy.mockRestore();
  createdCanvases.length = 0;
});

function makeTarget(width = 400, height = 400) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

const ctxOf = (canvas: HTMLCanvasElement) =>
  canvas.getContext('2d') as unknown as FakeCtx;

const fullSizeReadbacks = () =>
  createdCanvases
    .map((c) => contexts.get(c))
    .filter(Boolean)
    .flatMap((ctx) => ctx!.getImageData.mock.calls)
    .filter((args: any[]) => args[2] > 1).length;

function hover(canvas: HTMLCanvasElement, x: number, y: number) {
  canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }));
}

describe('SimpleHeatmap', () => {
  test('hover redraws blit the cached layer instead of recolorizing', () => {
    const canvas = makeTarget();
    const heatmap = new SimpleHeatmap()
      .setCanvas(canvas)
      .setData([
        [50, 50, 3],
        [300, 300, 1],
      ])
      .setMax(3)
      .draw()
      .enableInteractions(() => {});

    expect(fullSizeReadbacks()).toBe(1);
    const visible = ctxOf(canvas);
    const blitsBefore = visible.drawImage.mock.calls.length;

    hover(canvas, 50, 50);
    hover(canvas, 300, 300);
    hover(canvas, 5, 390);

    expect(fullSizeReadbacks()).toBe(1);
    expect(visible.drawImage.mock.calls.length).toBe(blitsBefore + 3);
    expect(visible.strokeRect).toHaveBeenCalled();

    heatmap.setData([[100, 100, 1]]).draw();
    expect(fullSizeReadbacks()).toBe(2);
  });

  test('instances do not share canvas, data or interactions', () => {
    const canvasA = makeTarget();
    const canvasB = makeTarget();
    const selectedA = jest.fn();
    const selectedB = jest.fn();
    new SimpleHeatmap()
      .setCanvas(canvasA)
      .setData([[50, 50, 2]])
      .draw()
      .enableInteractions(selectedA);
    new SimpleHeatmap()
      .setCanvas(canvasB)
      .setData([[300, 300, 5]])
      .draw()
      .enableInteractions(selectedB);

    const ctxA = ctxOf(canvasA);
    const ctxB = ctxOf(canvasB);
    const drawsB = ctxB.drawImage.mock.calls.length;

    canvasA.dispatchEvent(
      new MouseEvent('click', { clientX: 50, clientY: 50 }),
    );
    expect(selectedA).toHaveBeenCalledTimes(1);
    expect(selectedA.mock.calls[0][1]).toEqual({ clicks: 2 });
    expect(selectedB).not.toHaveBeenCalled();
    expect(ctxB.drawImage.mock.calls.length).toBe(drawsB);
    expect(ctxA.strokeRect).toHaveBeenCalled();
  });

  test('switching canvas or destroying detaches listeners', () => {
    const first = makeTarget();
    const second = makeTarget();
    const onSelect = jest.fn();
    const heatmap = new SimpleHeatmap()
      .setCanvas(first)
      .setData([[50, 50, 1]])
      .draw()
      .enableInteractions(onSelect);

    heatmap.setCanvas(second).setData([[50, 50, 1]]).draw();
    first.dispatchEvent(new MouseEvent('click', { clientX: 50, clientY: 50 }));
    expect(onSelect).not.toHaveBeenCalled();

    heatmap.enableInteractions(onSelect);
    heatmap.destroy();
    second.dispatchEvent(
      new MouseEvent('click', { clientX: 50, clientY: 50 }),
    );
    expect(onSelect).not.toHaveBeenCalled();
    expect(heatmap.checkReady()).toBe(false);
  });
});

describe('getCanvasDownscale', () => {
  test('keeps regular pages at full resolution', () => {
    expect(getCanvasDownscale(1440, 10000)).toBe(1);
    expect(getCanvasDownscale(0, 0)).toBe(1);
  });

  test('caps the longest side and the total area', () => {
    expect(getCanvasDownscale(1440, 40000)).toBeCloseTo(16384 / 40000);
    expect(getCanvasDownscale(8000, 8000)).toBeCloseTo(
      Math.sqrt(24_000_000 / 64_000_000),
    );
  });
});
