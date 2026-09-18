/**
 * Regression cover for sprite playback: the tracker inlines each `<use>` target and
 * MessageManager rewrites the href to `#symbol-N`, so the replay document must carry a
 * sprite host holding those symbols. The host insertion was dropped in a26411f2 and every
 * sprite icon replayed blank.
 */
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import DOMManager from '../../../player/src/web/managers/DOM/DOMManager';
import { MType } from '../../../player/src/web/messages/raw.gen';

const SYMBOLS = '<symbol id="symbol-209" viewBox="0 0 16 16"><path d="M0 0" /></symbol>';

const el = (
  id: number,
  parentID: number,
  index: number,
  tag: string,
  svg = false,
) => ({
  tp: MType.CreateElementNode,
  id,
  parentID,
  index,
  tag,
  svg,
  time: 0,
});

let frame: HTMLIFrameElement;
let frameDoc: Document;
let manager: DOMManager;

/** The messages a page using an external SVG sprite produces, after the href rewrite. */
const pageMessages = () => [
  { tp: MType.CreateDocument, time: 0 },
  el(1, 0, 0, 'BODY'),
  el(2, 1, 0, 'svg', true),
  el(3, 2, 0, 'use', true),
  { tp: MType.SetNodeAttribute, id: 3, name: 'href', value: '#symbol-209', time: 0 },
];

async function apply(msgs: any[]): Promise<void> {
  msgs.forEach((m) => manager.append(m as any));
  await manager.moveReady(1000);
}

const spriteHost = () => frameDoc.getElementById('OPENREPLAY_SPRITES_MAP');

beforeEach(() => {
  frame = document.createElement('iframe');
  document.body.appendChild(frame);
  frameDoc = frame.contentDocument!;
  manager = new DOMManager({
    screen: {
      document: frameDoc,
      selectMenu: { onFocus: jest.fn(), onValueApplied: jest.fn() },
    } as any,
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
});

describe('DOMManager sprite map', () => {
  it('gives the replayed <body> a sprite host that resolves #symbol-N', async () => {
    await apply(pageMessages());
    manager.setSpriteContent(SYMBOLS);

    const host = spriteHost();
    expect(host).not.toBeNull();
    expect(host!.parentElement!.tagName).toBe('BODY');
    expect(frameDoc.getElementById('symbol-209')).not.toBeNull();
  });

  it('keeps the symbols when content arrives before the <body> is built', async () => {
    manager.setSpriteContent(SYMBOLS);
    await apply(pageMessages());

    expect(frameDoc.getElementById('symbol-209')).not.toBeNull();
  });

  it('survives the VDOM reconciliation of later mutations', async () => {
    await apply(pageMessages());
    manager.setSpriteContent(SYMBOLS);

    // Every flush prunes <body> children it does not know about; the sprite host must not
    // be one of them.
    await apply([el(4, 1, 1, 'DIV'), el(5, 1, 2, 'SPAN')]);

    expect(spriteHost()).not.toBeNull();
    expect(frameDoc.getElementById('symbol-209')).not.toBeNull();
  });

  it('restores the symbols when the page is replayed from scratch', async () => {
    await apply(pageMessages());
    manager.setSpriteContent(SYMBOLS);

    // What PagesManager.moveReady does when it switches back to this page.
    manager.reset();
    await manager.moveReady(1000);

    expect(spriteHost()).not.toBeNull();
    expect(frameDoc.getElementById('symbol-209')).not.toBeNull();
  });
});
