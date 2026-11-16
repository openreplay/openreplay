import { describe, it, expect, beforeEach } from '@jest/globals';
import FocusManager from '../../../player/src/web/managers/DOM/FocusManager';
import type { VElement } from '../../../player/src/web/managers/DOM/VirtualDOM';
import type { SetNodeFocus } from '../../../player/src/web/messages';
import { MType } from '../../../player/src/web/messages/raw.gen';

const FOCUS = '-openreplay-focus';
const VISIBLE = '-openreplay-focus-visible';
const WITHIN = '-openreplay-focus-within';

let vElements: Map<number, VElement>;
let fm: FocusManager;

function add(id: number, html: string): Element {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  const el = wrap.firstElementChild!;
  vElements.set(id, { node: el } as unknown as VElement);
  return el;
}

function focus(id: number, time: number) {
  fm.append({ tp: MType.SetNodeFocus, id, time } as SetNodeFocus);
  fm.move(time);
}

beforeEach(() => {
  document.body.innerHTML = '';
  vElements = new Map();
  fm = new FocusManager(vElements);
});

describe('FocusManager focus-visible', () => {
  it('marks text fields as focus-visible', () => {
    const text = add(1, '<input type="text">');
    const date = add(2, '<input type="date">');
    const area = add(3, '<textarea></textarea>');
    focus(1, 10);
    expect(text.classList.contains(VISIBLE)).toBe(true);
    focus(2, 20);
    expect(date.classList.contains(VISIBLE)).toBe(true);
    focus(3, 30);
    expect(area.classList.contains(VISIBLE)).toBe(true);
  });

  it('leaves buttons and checkable inputs at plain focus', () => {
    const button = add(1, '<button>b</button>');
    const checkbox = add(2, '<input type="checkbox">');
    focus(1, 10);
    expect(button.classList.contains(FOCUS)).toBe(true);
    expect(button.classList.contains(VISIBLE)).toBe(false);
    focus(2, 20);
    expect(checkbox.classList.contains(VISIBLE)).toBe(false);
  });

  it('clears focus-visible on focus change and blur', () => {
    const a = add(1, '<input>');
    const b = add(2, '<input>');
    focus(1, 10);
    focus(2, 20);
    expect(a.classList.contains(VISIBLE)).toBe(false);
    expect(a.classList.contains(FOCUS)).toBe(false);
    expect(b.classList.contains(VISIBLE)).toBe(true);
    expect(b.parentElement!.classList.contains(WITHIN)).toBe(true);
    focus(-1, 30);
    expect(b.classList.contains(VISIBLE)).toBe(false);
    expect(b.parentElement!.classList.contains(WITHIN)).toBe(false);
  });
});
