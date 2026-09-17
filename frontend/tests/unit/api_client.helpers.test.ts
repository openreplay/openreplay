import { clean } from '../../app/api_client';
import { queried } from '../../app/extraRoutes';

jest.mock('../../env', () => ({
  __esModule: true,
  default: { API_EDP: '', NODE_ENV: 'test' },
}));

describe('clean', () => {
  it('drops undefined and empty-string values', () => {
    expect(clean({ a: 1, b: undefined, c: '', d: 'x' })).toEqual({
      a: 1,
      d: 'x',
    });
  });

  it('keeps null, false and 0', () => {
    expect(clean({ a: null, b: false, c: 0 })).toEqual({
      a: null,
      b: false,
      c: 0,
    });
  });

  it('walks nested objects and arrays', () => {
    expect(clean({ a: { b: '', c: 1 }, d: [1, 2] })).toEqual({
      a: { c: 1 },
      d: [1, 2],
    });
  });

  it('leaves a hole where an array element was dropped', () => {
    // Pre-existing: arrays are rebuilt by index, so a skipped element stays as
    // a hole and serialises to null rather than shortening the array.
    const out = clean({ d: [1, undefined, 2] });
    expect(out.d).toHaveLength(3);
    expect(JSON.stringify(out)).toBe('{"d":[1,null,2]}');
  });

  it('passes forbiddenValues down into nested objects', () => {
    expect(clean({ a: { b: null, c: 1 } }, [undefined, '', null])).toEqual({
      a: { c: 1 },
    });
  });

  it('leaves non-plain objects intact rather than flattening them to {}', () => {
    const date = new Date('2020-01-01T00:00:00.000Z');
    const out = clean({ from: date });
    expect(out.from).toBe(date);
    expect(JSON.parse(JSON.stringify(out))).toEqual({
      from: '2020-01-01T00:00:00.000Z',
    });
  });
});

describe('queried', () => {
  it('serialises scalars and encodes them', () => {
    expect(queried('/sessions', { limit: 10, live: true, q: 'a b' })).toBe(
      '/sessions?limit=10&live=true&q=a%20b',
    );
  });

  it('skips objects, null and undefined', () => {
    expect(queried('/x', { a: 1, o: { b: 2 }, n: null, u: undefined })).toBe(
      '/x?a=1',
    );
  });

  it('repeats the key for each array element', () => {
    expect(queried('/x', { ids: [1, 2, 3] })).toBe('/x?ids=1&ids=2&ids=3');
  });

  it('returns the bare path when nothing is serialisable', () => {
    expect(queried('/x')).toBe('/x');
    expect(queried('/x', {})).toBe('/x');
    expect(queried('/x', { o: {} })).toBe('/x');
  });
});
