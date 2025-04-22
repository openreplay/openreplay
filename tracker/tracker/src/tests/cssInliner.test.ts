// @ts-nocheck

const mockNextID = jest.fn().mockReturnValue(123);
const mockAdoptedSSInsertRuleURLBased = jest.fn();
const mockAdoptedSSAddOwner = jest.fn();

global.fetch = jest.fn();

import { inlineRemoteCss } from '../main/app/observer/cssInliner';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

describe('inlineRemoteCss', () => {
  let mockNode;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdoptedSSInsertRuleURLBased.mockImplementation((id, cssText, index, baseHref) => ({
      type: "AdoptedSSInsertRuleURLBased",
      id,
      cssText,
      index,
      baseHref
    }));

    mockAdoptedSSAddOwner.mockImplementation((sheetId, ownerId) => ({
      type: "AdoptedSSAddOwner",
      sheetId,
      ownerId
    }));
    mockNode = document.createElement('link');
    Object.defineProperty(mockNode, 'sheet', {
      configurable: true,
      value: null,
      writable: true
    });
    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('body { color: red; }')
    });
  });

  test('should process rules directly if node has a sheet with accessible rules', () => {
    jest.useFakeTimers();
    const mockRule = { cssText: 'body { color: red; }' };
    const mockRules = [mockRule];
    Object.defineProperty(mockRules, 'length', { value: 1 });

    const mockSheet = { cssRules: mockRules };
    Object.defineProperty(mockNode, 'sheet', {
      get: () => mockSheet
    });
    inlineRemoteCss(mockNode, 456, 'http://example.com', mockNextID,mockAdoptedSSInsertRuleURLBased,mockAdoptedSSAddOwner);
    jest.runAllTimers();
    expect(mockNextID).toHaveBeenCalled();
    expect(mockAdoptedSSAddOwner).toHaveBeenCalledWith(123, 456);
    expect(mockAdoptedSSInsertRuleURLBased).toHaveBeenCalledWith(456, 'body { color: red; }', 0, 'http://example.com');
    jest.useRealTimers();
  });

  test('should fetch CSS if accessing rules throws an error', () => {
    mockNode.href = 'http://example.com/style.css';
    const mockSheet = {};
    Object.defineProperty(mockSheet, 'cssRules', {
      get: () => { throw new Error('CORS error'); }
    });
    Object.defineProperty(mockNode, 'sheet', {
      get: () => mockSheet
    });
    inlineRemoteCss(mockNode, 456,  'http://example.com',mockNextID,mockAdoptedSSInsertRuleURLBased, mockAdoptedSSAddOwner);
    expect(global.fetch).toHaveBeenCalledWith('http://example.com/style.css');
  });

  test('should handle successful fetch and process CSS text', async () => {
    mockNode.href = 'http://example.com/style.css';
    const mockSheet = {};
    Object.defineProperty(mockSheet, 'cssRules', {
      get: () => { throw new Error('CORS error'); }
    });
    Object.defineProperty(mockNode, 'sheet', {
      get: () => mockSheet
    });
    inlineRemoteCss(mockNode, 456,  'http://example.com',mockNextID,mockAdoptedSSInsertRuleURLBased, mockAdoptedSSAddOwner);
    await new Promise(process.nextTick);
    expect(mockNextID).toHaveBeenCalled();
    expect(mockAdoptedSSAddOwner).toHaveBeenCalledWith(123, 456);
    expect(mockAdoptedSSInsertRuleURLBased).toHaveBeenCalledWith(123, 'body { color: red; }', 0, 'http://example.com');
  });

  test('should fetch CSS if node has no sheet but has href', () => {
    Object.defineProperty(mockNode, 'sheet', {
      get: () => null
    });
    mockNode.href = 'http://example.com/style.css';
    inlineRemoteCss(mockNode, 456,  'http://example.com',mockNextID,mockAdoptedSSInsertRuleURLBased, mockAdoptedSSAddOwner);
    expect(global.fetch).toHaveBeenCalledWith('http://example.com/style.css');
  });

  test('should handle complex CSS with multiple rules', async () => {
    Object.defineProperty(mockNode, 'sheet', {
      get: () => null
    });
    mockNode.href = 'http://example.com/style.css';
    const complexCss = `
      body { color: red; }
      .class { background: blue; }
      @media (max-width: 600px) { body { font-size: 14px; } }
    `;
    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(complexCss)
    });
    inlineRemoteCss(mockNode, 456, 'http://example.com',mockNextID,mockAdoptedSSInsertRuleURLBased, mockAdoptedSSAddOwner);
    await new Promise(process.nextTick);
    expect(mockNextID).toHaveBeenCalled();
    expect(mockAdoptedSSAddOwner).toHaveBeenCalledWith(123, 456);
    expect(mockAdoptedSSInsertRuleURLBased).toHaveBeenCalledWith(
      123, 'body { color: red; }', 0, 'http://example.com'
    );
    expect(mockAdoptedSSInsertRuleURLBased).toHaveBeenCalledWith(
      123, '.class { background: blue; }', 1, 'http://example.com'
    );
    expect(mockAdoptedSSInsertRuleURLBased).toHaveBeenCalledWith(
      123, '@media (max-width: 600px) { body { font-size: 14px; } }', 2, 'http://example.com'
    );
  });

  test('should handle CSS with comments', async () => {
    Object.defineProperty(mockNode, 'sheet', {
      get: () => null
    });
    mockNode.href = 'http://example.com/style.css';
    const cssWithComments = `
      /* This is a comment */
      body { color: red; }
      /* Another comment */
      .class { background: blue; }
    `;
    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(cssWithComments)
    });
    inlineRemoteCss(mockNode, 456,  'http://example.com',mockNextID,mockAdoptedSSInsertRuleURLBased, mockAdoptedSSAddOwner);
    await new Promise(process.nextTick);
    expect(mockNextID).toHaveBeenCalled();
    expect(mockAdoptedSSAddOwner).toHaveBeenCalledWith(123, 456);
    expect(mockAdoptedSSInsertRuleURLBased).toHaveBeenCalledWith(
      123, 'body { color: red; }', 0, 'http://example.com'
    );
    expect(mockAdoptedSSInsertRuleURLBased).toHaveBeenCalledWith(
      123, '.class { background: blue; }', 1, 'http://example.com'
    );
  });

  test('should handle failed fetch', async () => {
    Object.defineProperty(mockNode, 'sheet', {
      get: () => null
    });
    mockNode.href = 'http://example.com/style.css';
    global.fetch.mockRejectedValue(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    inlineRemoteCss(mockNode, 456,  'http://example.com',mockNextID,mockAdoptedSSInsertRuleURLBased, mockAdoptedSSAddOwner);
    await new Promise(process.nextTick);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch CSS from http://example.com/style.css:'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  test('should handle non-OK response from fetch', async () => {
    Object.defineProperty(mockNode, 'sheet', {
      get: () => null
    });
    mockNode.href = 'http://example.com/style.css';
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('')
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    inlineRemoteCss(mockNode, 456,  'http://example.com',mockNextID,mockAdoptedSSInsertRuleURLBased, mockAdoptedSSAddOwner);

    await new Promise(process.nextTick);
    expect.any(Error)
    consoleSpy.mockRestore();
  });

  test('should handle nested CSS rules correctly', async () => {
    Object.defineProperty(mockNode, 'sheet', {
      get: () => null
    });
    mockNode.href = 'http://example.com/style.css';
    const nestedCss = `
      @media (max-width: 600px) {
        .header {
          font-size: 14px;
        }
        .footer {
          font-size: 12px;
        }
      }
      .container {
        padding: 20px;
      }
    `;
    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(nestedCss)
    });
    inlineRemoteCss(mockNode, 456, 'http://example.com',mockNextID,mockAdoptedSSInsertRuleURLBased, mockAdoptedSSAddOwner);
    await new Promise(process.nextTick);
    expect(mockNextID).toHaveBeenCalled();
    expect(mockAdoptedSSAddOwner).toHaveBeenCalledWith(123, 456);
    expect(mockAdoptedSSInsertRuleURLBased).toHaveBeenCalledWith(
      123,
      '@media (max-width: 600px) {\n        .header {\n          font-size: 14px;\n        }\n        .footer {\n          font-size: 12px;\n        }\n      }',
      0,
      'http://example.com'
    );
    expect(mockAdoptedSSInsertRuleURLBased).toHaveBeenCalledWith(
      123,
      '.container {\n        padding: 20px;\n      }',
      1,
      'http://example.com'
    );
  });
});