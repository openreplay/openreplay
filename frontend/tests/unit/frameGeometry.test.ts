import { describe, test, expect, jest } from '@jest/globals';
import {
  getDocumentOffset,
  getElementsFromPointDeep,
  getFrameContentOffset,
} from '../../../player/src/web/Screen/frameGeometry';

type Rect = { left: number; top: number };

function fakeWindow(padding = { left: '0px', top: '0px' }) {
  return {
    getComputedStyle: () => ({
      paddingLeft: padding.left,
      paddingTop: padding.top,
    }),
  };
}

function fakeFrame(
  rect: Rect,
  contentDocument: unknown,
  border = { left: 0, top: 0 },
  hostWindow = fakeWindow(),
) {
  return {
    tagName: 'IFRAME',
    contentDocument,
    clientLeft: border.left,
    clientTop: border.top,
    getBoundingClientRect: () => rect,
    ownerDocument: { defaultView: hostWindow },
  } as unknown as HTMLIFrameElement;
}

function fakeDoc(hits: (x: number, y: number) => unknown[]) {
  return {
    elementsFromPoint: jest.fn(hits),
  } as unknown as Document & {
    elementsFromPoint: jest.Mock<(x: number, y: number) => Element[]>;
  };
}

describe('getFrameContentOffset', () => {
  test('adds border and padding to the frame position', () => {
    const frame = fakeFrame(
      { left: 300, top: 200 },
      null,
      { left: 2, top: 3 },
      fakeWindow({ left: '5px', top: '1px' }),
    );
    expect(getFrameContentOffset(frame)).toEqual({ x: 307, y: 204 });
  });
});

describe('getElementsFromPointDeep', () => {
  test('queries an iframe document in its own viewport coordinates', () => {
    const inner = { tagName: 'BUTTON' };
    const innerDoc = fakeDoc(() => [inner]);
    const frame = fakeFrame({ left: 300, top: 200 }, innerDoc, {
      left: 2,
      top: 2,
    });
    const body = { tagName: 'BODY' };
    const rootDoc = fakeDoc(() => [frame, body]);

    const result = getElementsFromPointDeep(rootDoc, { x: 400, y: 250 });

    expect(innerDoc.elementsFromPoint).toHaveBeenCalledTimes(1);
    expect(innerDoc.elementsFromPoint).toHaveBeenCalledWith(98, 48);
    expect(result).toEqual([frame, body, inner]);
  });

  test('visits nested iframes exactly once each, accumulating offsets', () => {
    const deepest = { tagName: 'SPAN' };
    const level2Doc = fakeDoc(() => [deepest]);
    const frame2 = fakeFrame({ left: 10, top: 20 }, level2Doc);
    const level1Doc = fakeDoc(() => [frame2]);
    const frame1 = fakeFrame({ left: 100, top: 100 }, level1Doc);
    const rootDoc = fakeDoc(() => [frame1]);

    const result = getElementsFromPointDeep(rootDoc, { x: 150, y: 170 });

    expect(level1Doc.elementsFromPoint).toHaveBeenCalledTimes(1);
    expect(level1Doc.elementsFromPoint).toHaveBeenCalledWith(50, 70);
    expect(level2Doc.elementsFromPoint).toHaveBeenCalledTimes(1);
    expect(level2Doc.elementsFromPoint).toHaveBeenCalledWith(40, 50);
    expect(result).toEqual([frame1, frame2, deepest]);
  });

  test('skips iframes without an accessible document', () => {
    const frame = fakeFrame({ left: 0, top: 0 }, null);
    const rootDoc = fakeDoc(() => [frame]);
    expect(getElementsFromPointDeep(rootDoc, { x: 1, y: 1 })).toEqual([frame]);
  });
});

describe('getDocumentOffset', () => {
  test('sums content-box offsets of every frame up to the root window', () => {
    const rootWin = { name: 'root' } as unknown as Window;
    const outerWin = {
      parent: rootWin,
      frameElement: fakeFrame(
        { left: 100, top: 50 },
        null,
        { left: 2, top: 2 },
      ),
    } as unknown as Window;
    const innerWin = {
      parent: outerWin,
      frameElement: fakeFrame({ left: 10, top: 5 }, null),
    } as unknown as Window;
    const doc = { defaultView: innerWin } as unknown as Document;

    expect(getDocumentOffset(doc, rootWin)).toEqual({ x: 112, y: 57 });
    expect(getDocumentOffset(doc, outerWin)).toEqual({ x: 10, y: 5 });
  });

  test('is zero for the root document itself', () => {
    const rootWin = { frameElement: {} } as unknown as Window;
    const doc = { defaultView: rootWin } as unknown as Document;
    expect(getDocumentOffset(doc, rootWin)).toEqual({ x: 0, y: 0 });
  });
});
