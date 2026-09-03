import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  isCSSStyleRule,
  isDialogElement,
  isHTMLElement,
  isIFrameElement,
  isInputElement,
  isRootNode,
  isSelectElement,
  isTextAreaElement,
  isValueElement,
} from '../../app/player/guards';

let frame: HTMLIFrameElement;
let frameDoc: Document;

/** Element created in the iframe realm, i.e. with an iframe-realm prototype. */
function inFrame<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
): HTMLElementTagNameMap[K] {
  const el = frameDoc.createElement(tagName);
  frameDoc.body.appendChild(el);
  return el;
}

beforeAll(() => {
  frame = document.createElement('iframe');
  document.body.appendChild(frame);
  frameDoc = frame.contentDocument!;
});

afterAll(() => {
  frame.remove();
});

describe('cross-realm assumption', () => {
  // Guard against the whole suite quietly losing its teeth: if jsdom ever stops
  // separating realms, the tests below would pass with plain `instanceof` too.
  it('iframe-realm nodes fail outer-realm instanceof', () => {
    expect(inFrame('input') instanceof HTMLInputElement).toBe(false);
    expect(inFrame('select') instanceof HTMLSelectElement).toBe(false);
    expect(inFrame('div') instanceof HTMLElement).toBe(false);
  });
});

describe('isValueElement', () => {
  it('accepts input, textarea and select from the iframe realm', () => {
    expect(isValueElement(inFrame('input'))).toBe(true);
    expect(isValueElement(inFrame('textarea'))).toBe(true);
    expect(isValueElement(inFrame('select'))).toBe(true);
  });

  it('accepts the same tags from the outer realm', () => {
    expect(isValueElement(document.createElement('input'))).toBe(true);
    expect(isValueElement(document.createElement('textarea'))).toBe(true);
    expect(isValueElement(document.createElement('select'))).toBe(true);
  });

  it('rejects elements without a value, non-elements and nullish input', () => {
    expect(isValueElement(inFrame('div'))).toBe(false);
    expect(isValueElement(document.createTextNode('x'))).toBe(false);
    expect(isValueElement(document)).toBe(false);
    expect(isValueElement(null)).toBe(false);
    expect(isValueElement(undefined)).toBe(false);
  });
});

describe('single-tag guards', () => {
  it('discriminate between the value elements', () => {
    const input = inFrame('input');
    const textarea = inFrame('textarea');
    const select = inFrame('select');

    expect([
      isInputElement(input),
      isTextAreaElement(input),
      isSelectElement(input),
    ]).toEqual([true, false, false]);
    expect([
      isInputElement(textarea),
      isTextAreaElement(textarea),
      isSelectElement(textarea),
    ]).toEqual([false, true, false]);
    expect([
      isInputElement(select),
      isTextAreaElement(select),
      isSelectElement(select),
    ]).toEqual([false, false, true]);
  });

  it('recognise iframe and dialog elements across realms', () => {
    expect(isIFrameElement(inFrame('iframe'))).toBe(true);
    expect(isIFrameElement(frame)).toBe(true);
    expect(isIFrameElement(inFrame('div'))).toBe(false);

    expect(isDialogElement(inFrame('dialog'))).toBe(true);
    expect(isDialogElement(inFrame('div'))).toBe(false);
  });

  it('match lowercase tagNames in XML documents', () => {
    // tagName preserves case outside HTML documents, hence the toUpperCase().
    const xmlDoc = document.implementation.createDocument(
      'http://www.w3.org/1999/xhtml',
      'html',
    );
    const input = xmlDoc.createElement('input');
    expect(input.tagName).toBe('input');
    expect(isInputElement(input)).toBe(true);
    expect(isValueElement(input)).toBe(true);
  });
});

describe('isHTMLElement', () => {
  it('accepts elements from either realm', () => {
    expect(isHTMLElement(inFrame('div'))).toBe(true);
    expect(isHTMLElement(document.createElement('div'))).toBe(true);
  });

  it('rejects non-elements and nullish input', () => {
    expect(isHTMLElement(document.createTextNode('x'))).toBe(false);
    expect(isHTMLElement(document)).toBe(false);
    expect(isHTMLElement(null)).toBe(false);
    expect(isHTMLElement(undefined)).toBe(false);
  });

  it('rejects non-HTML elements', () => {
    const svg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle',
    );
    expect(isHTMLElement(svg)).toBe(false);
  });
});

describe('isRootNode', () => {
  it('returns true for document', () => {
    expect(isRootNode(document)).toBe(true);
  });

  it('returns true for an iframe document', () => {
    expect(isRootNode(frameDoc)).toBe(true);
  });

  it('returns false for element', () => {
    const div = document.createElement('div');
    expect(isRootNode(div)).toBe(false);
  });

  it('returns false for a shadow root and a fragment', () => {
    const host = document.createElement('div');
    expect(isRootNode(host.attachShadow({ mode: 'open' }))).toBe(false);
    expect(isRootNode(document.createDocumentFragment())).toBe(false);
  });
});

describe('isCSSStyleRule', () => {
  it('accepts style rules and rejects other rules across realms', () => {
    const style = inFrame('style');
    style.textContent = '.a { color: red } @media print { .b { color: blue } }';
    const rules = (style.sheet as CSSStyleSheet).cssRules;

    expect(isCSSStyleRule(rules[0])).toBe(true);
    expect(isCSSStyleRule(rules[1])).toBe(false);
  });
});
