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

  it('keeps a spreadsheet from running a cell as a formula', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(
      `"'=HYPERLINK(""http://x"")"`,
    );
    expect(csvCell('+1 555')).toBe("'+1 555");
    expect(csvCell('-2')).toBe("'-2");
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('\t=1')).toBe("'\t=1");
    expect(csvCell('a=b')).toBe('a=b');
  });

  it('writes a header and one row per item, CRLF separated', async () => {
    let saved: Blob | undefined;
    (URL as any).createObjectURL = jest.fn((b: Blob) => {
      saved = b;
      return 'blob:x';
    });
    (URL as any).revokeObjectURL = jest.fn();
    saveCsv('t.csv', ['Name', 'Members'], [['Ann', 'Bo, Cy'], ['Dee', 3]]);
    const read = <T>(as: 'readAsText' | 'readAsArrayBuffer') =>
      new Promise<T>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as T);
        r[as](saved!);
      });
    // readAsText drops the BOM
    expect(await read<string>('readAsText')).toBe(
      'Name,Members\r\nAnn,"Bo, Cy"\r\nDee,3',
    );
    const head = new Uint8Array(await read<ArrayBuffer>('readAsArrayBuffer'));
    expect([...head.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });
});
