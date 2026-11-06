import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import DOMManager from '../../../player/src/web/managers/DOM/DOMManager';
import { MType } from '../../../player/src/web/messages/raw.gen';

const el = (id: number, parentID: number, index: number, tag: string) => ({
  tp: MType.CreateElementNode,
  id,
  parentID,
  index,
  tag,
  svg: false,
  time: 0,
});

describe('RemoveNode of a node moved into a shadow root that is not ready yet', () => {
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

  // a seek applies both messages in one batch, before the root's deferred insert runs
  it('does not insert it once the root is ready', async () => {
    [
      { tp: MType.CreateDocument, time: 0 },
      el(1, 0, 0, 'BODY'),
      el(2, 1, 0, 'DIV'),
      el(5, 2, 0, 'I'),
      el(7, 1, 1, 'MY-HOST'),
      { tp: MType.CreateIFrameDocument, frameID: 7, id: 8, time: 0 },
      { tp: MType.MoveNode, id: 5, parentID: 8, index: 0, time: 0 },
      { tp: MType.RemoveNode, id: 5, time: 0 },
    ].forEach((m) => manager.append(m as any));
    await manager.moveReady(0);
    await new Promise((r) => setTimeout(r, 0));

    const host = frame.contentDocument!.querySelector('my-host')!;
    expect(host.shadowRoot).toBeTruthy();
    expect(host.shadowRoot!.querySelector('i')).toBeNull();
    expect(frame.contentDocument!.querySelector('i')).toBeNull();
    expect(manager.getNode(5)).toBeUndefined();
  });
});
