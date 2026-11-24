import { describe, expect, it, jest } from '@jest/globals';

import { csvCell, saveCsv } from 'App/utils/download';

describe('csv export', () => {
  it('quotes only fields that need it', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell(42)).toBe('42');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('writes a header and one row per item, CRLF separated', async () => {
    let saved: Blob | undefined;
    (URL as any).createObjectURL = jest.fn((b: Blob) => {
      saved = b;
      return 'blob:x';
    });
    (URL as any).revokeObjectURL = jest.fn();
    saveCsv('t.csv', ['Name', 'Members'], [['Ann', 'Bo, Cy'], ['Dee', 3]]);
    const text = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.readAsText(saved!);
    });
    expect(text).toBe('Name,Members\r\nAnn,"Bo, Cy"\r\nDee,3');
  });
});
