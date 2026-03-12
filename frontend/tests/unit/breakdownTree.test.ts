import { describe, it, expect } from '@jest/globals';
import {
  isLeaf,
  getDepth,
  collectTimestamps,
  sumAll,
  sortByTotal,
  stripOverall,
  remapTimestamps,
  collectLeafLines,
  collectChartLines,
  NestedData,
} from 'App/utils/breakdownTree';

describe('breakdownTree utilities', () => {
  describe('isLeaf', () => {
    it('returns true for timestamp→number map', () => {
      expect(isLeaf({ '1000': 10, '2000': 20 })).toBe(true);
    });

    it('returns false for nested objects', () => {
      expect(isLeaf({ US: { '1000': 10 } })).toBe(false);
    });
  });

  describe('getDepth', () => {
    it('returns 0 for leaf', () => {
      expect(getDepth({ '1000': 5 })).toBe(0);
    });

    it('returns 1 for one level of nesting', () => {
      expect(getDepth({ US: { '1000': 5 } })).toBe(1);
    });

    it('returns 2 for two levels', () => {
      expect(getDepth({ US: { NY: { '1000': 5 } } })).toBe(2);
    });

    it('returns 0 for empty object', () => {
      expect(getDepth({})).toBe(0);
    });
  });

  describe('collectTimestamps', () => {
    it('collects keys from a leaf', () => {
      const set = new Set<string>();
      collectTimestamps({ '100': 1, '200': 2 }, set);
      expect(Array.from(set).sort()).toEqual(['100', '200']);
    });

    it('collects keys from nested data', () => {
      const set = new Set<string>();
      collectTimestamps(
        { US: { '100': 1, '200': 2 }, UK: { '200': 3, '300': 4 } },
        set,
      );
      expect(Array.from(set).sort()).toEqual(['100', '200', '300']);
    });
  });

  describe('sumAll', () => {
    it('sums leaf values', () => {
      expect(sumAll({ '100': 10, '200': 20 })).toBe(30);
    });

    it('sums nested values recursively', () => {
      expect(
        sumAll({
          US: { '100': 10, '200': 20 },
          UK: { '100': 5 },
        }),
      ).toBe(35);
    });
  });

  describe('sortByTotal', () => {
    it('returns leaf unchanged', () => {
      const leaf = { '100': 10 };
      expect(sortByTotal(leaf)).toEqual(leaf);
    });

    it('sorts children by total descending', () => {
      const data: NestedData = {
        small: { '1': 1 },
        big: { '1': 100 },
        mid: { '1': 50 },
      };
      const sorted = sortByTotal(data);
      expect(Object.keys(sorted)).toEqual(['big', 'mid', 'small']);
    });

    it('preserves $overall at the top', () => {
      const data: NestedData = {
        small: { '1': 1 },
        $overall: { '1': 10 },
        big: { '1': 100 },
      };
      const sorted = sortByTotal(data);
      expect(Object.keys(sorted)[0]).toBe('$overall');
      expect(Object.keys(sorted).slice(1)).toEqual(['big', 'small']);
    });
  });

  describe('stripOverall', () => {
    it('returns leaf unchanged', () => {
      expect(stripOverall({ '1': 10 })).toEqual({ '1': 10 });
    });

    it('removes $overall keys', () => {
      const data = {
        $overall: { '1': 100 },
        US: { '1': 50 },
        UK: { '1': 30 },
      };
      const result = stripOverall(data);
      expect(result).toEqual({ US: { '1': 50 }, UK: { '1': 30 } });
    });

    it('removes nested $overall keys', () => {
      const data = {
        $overall: { '1': 100 },
        US: {
          $overall: { '1': 50 },
          NY: { '1': 30 },
        },
      };
      const result = stripOverall(data);
      expect(result).toEqual({ US: { NY: { '1': 30 } } });
    });

    it('returns null if only $overall exists', () => {
      expect(stripOverall({ $overall: { '1': 10 } })).toBeNull();
    });
  });

  describe('remapTimestamps', () => {
    it('remaps leaf keys', () => {
      const data: NestedData = { '100': 10, '200': 20 };
      const tsMap = { '100': '500', '200': '600' };
      expect(remapTimestamps(data, tsMap)).toEqual({ '500': 10, '600': 20 });
    });

    it('remaps nested data recursively', () => {
      const data: NestedData = {
        US: { '100': 10 },
        UK: { '100': 5, '200': 15 },
      };
      const tsMap = { '100': '500', '200': '600' };
      const result = remapTimestamps(data, tsMap);
      expect(result).toEqual({
        US: { '500': 10 },
        UK: { '500': 5, '600': 15 },
      });
    });

    it('keeps unmapped keys as-is', () => {
      const data: NestedData = { '100': 10, '999': 5 };
      const tsMap = { '100': '500' };
      expect(remapTimestamps(data, tsMap)).toEqual({ '500': 10, '999': 5 });
    });

    it('sums values when multiple old keys map to the same new key', () => {
      const data: NestedData = { '100': 10, '200': 20 };
      const tsMap = { '100': '500', '200': '500' };
      expect(remapTimestamps(data, tsMap)).toEqual({ '500': 30 });
    });
  });

  describe('collectLeafLines', () => {
    it('returns single line for leaf', () => {
      const result = collectLeafLines({ '1': 10 }, 'Series');
      expect(result).toEqual([{ name: 'Series', data: { '1': 10 } }]);
    });

    it('skips $overall and collects leaf paths', () => {
      const data = {
        $overall: { '1': 100 },
        US: { '1': 50 },
        UK: { '1': 30 },
      };
      const result = collectLeafLines(data, 'S1');
      expect(result).toEqual([
        { name: 'S1 / US', data: { '1': 50 } },
        { name: 'S1 / UK', data: { '1': 30 } },
      ]);
    });

    it('handles deeply nested data', () => {
      const data = {
        US: {
          NY: { '1': 10 },
          LA: { '1': 20 },
        },
      };
      const result = collectLeafLines(data, 'S');
      expect(result).toEqual([
        { name: 'S / US / NY', data: { '1': 10 } },
        { name: 'S / US / LA', data: { '1': 20 } },
      ]);
    });
  });

  describe('collectChartLines', () => {
    it('uses $overall when no breakdowns', () => {
      const data = { $overall: { '1': 100 } };
      const result = collectChartLines(data, 'S1');
      expect(result).toEqual([{ name: 'S1', data: { '1': 100 } }]);
    });

    it('returns leaf lines for breakdowns', () => {
      const data = {
        $overall: { '1': 100 },
        US: { '1': 50 },
        UK: { '1': 30 },
      };
      const result = collectChartLines(data, 'S1');
      expect(result).toEqual([
        { name: 'S1 / US', data: { '1': 50 } },
        { name: 'S1 / UK', data: { '1': 30 } },
      ]);
    });

    it('returns single line for leaf input', () => {
      const result = collectChartLines({ '1': 10 }, 'S');
      expect(result).toEqual([{ name: 'S', data: { '1': 10 } }]);
    });
  });
});
