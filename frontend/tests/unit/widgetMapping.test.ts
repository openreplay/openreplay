import { describe, it, expect } from '@jest/globals';
import Widget from 'App/mstore/types/widget';
import { FUNNEL, TIMESERIES } from 'App/constants/card';

// Helper to access private methods for testing
function getPrivate(widget: Widget) {
  return widget as any;
}

describe('Widget mapping functions', () => {
  describe('isNewSeriesFormat', () => {
    it('returns true for { series: { ... } }', () => {
      const w = new Widget();
      expect(getPrivate(w).isNewSeriesFormat({ series: { S1: {} } })).toBe(
        true,
      );
    });

    it('returns false for array data', () => {
      const w = new Widget();
      expect(getPrivate(w).isNewSeriesFormat([{ timestamp: 1 }])).toBeFalsy();
    });

    it('returns false for null', () => {
      const w = new Widget();
      expect(getPrivate(w).isNewSeriesFormat(null)).toBeFalsy();
    });

    it('returns false when series is not an object', () => {
      const w = new Widget();
      expect(getPrivate(w).isNewSeriesFormat({ series: 'string' })).toBe(
        false,
      );
    });
  });

  describe('transformNewSeriesFormat (timeseries)', () => {
    it('builds chart points and namesMap from flat series', () => {
      const w = new Widget();
      const result = getPrivate(w).transformNewSeriesFormat(
        {
          'Series 1': { $overall: { '1000': 10, '2000': 20 } },
        },
        false,
      );

      expect(result.namesMap).toEqual(['Series 1']);
      expect(result.chart).toEqual([
        { timestamp: 1000, 'Series 1': 10 },
        { timestamp: 2000, 'Series 1': 20 },
      ]);
    });

    it('sorts lines by total descending', () => {
      const w = new Widget();
      const result = getPrivate(w).transformNewSeriesFormat(
        {
          'Series 1': {
            $overall: { '1000': 5 },
            US: { '1000': 100 },
            UK: { '1000': 1 },
          },
        },
        false,
      );

      // US (100) should come before UK (1)
      expect(result.namesMap[0]).toContain('US');
      expect(result.namesMap[1]).toContain('UK');
    });

    it('prefixes names with "Previous" for comparison', () => {
      const w = new Widget();
      const result = getPrivate(w).transformNewSeriesFormat(
        {
          'Series 1': { $overall: { '1000': 10 } },
        },
        true,
      );

      expect(result.namesMap).toEqual(['Previous Series 1']);
      expect(result.chart[0]).toHaveProperty('Previous Series 1', 10);
    });

    it('builds breakdownData with $overall stripped', () => {
      const w = new Widget();
      const result = getPrivate(w).transformNewSeriesFormat(
        {
          'Series 1': {
            $overall: { '1000': 100 },
            US: { '1000': 60 },
            UK: { '1000': 40 },
          },
        },
        false,
      );

      // breakdownData should have $overall stripped, sorted by total
      expect(result.breakdownData['Series 1']).toEqual({
        US: { '1000': 60 },
        UK: { '1000': 40 },
      });
    });

    it('handles flat series without breakdowns', () => {
      const w = new Widget();
      const result = getPrivate(w).transformNewSeriesFormat(
        {
          'Series 1': { '1000': 10, '2000': 20 },
        },
        false,
      );

      // leaf series → breakdownData is the data itself
      expect(result.breakdownData['Series 1']).toEqual({
        '1000': 10,
        '2000': 20,
      });
      expect(result.namesMap).toEqual(['Series 1']);
    });

    it('handles multiple series', () => {
      const w = new Widget();
      const result = getPrivate(w).transformNewSeriesFormat(
        {
          'Sessions': { $overall: { '1000': 50 } },
          'Errors': { $overall: { '1000': 5 } },
        },
        false,
      );

      expect(result.namesMap).toContain('Sessions');
      expect(result.namesMap).toContain('Errors');
      expect(result.chart[0]).toHaveProperty('Sessions', 50);
      expect(result.chart[0]).toHaveProperty('Errors', 5);
    });

    it('fills missing timestamps with 0', () => {
      const w = new Widget();
      const result = getPrivate(w).transformNewSeriesFormat(
        {
          S: {
            $overall: { '1000': 10, '2000': 20 },
            US: { '1000': 5 }, // missing '2000'
          },
        },
        false,
      );

      const point2000 = result.chart.find(
        (p: any) => p.timestamp === 2000,
      );
      // US line should have 0 for timestamp 2000
      expect(point2000['S / US']).toBe(0);
    });
  });

  describe('transformFunnelSeriesFormat', () => {
    const makeStages = (counts: number[]) =>
      counts.map((count, i) => ({
        type: 'click',
        operator: 'is',
        count,
        value: [`step${i + 1}`],
      }));

    it('handles direct stages (no breakdown)', () => {
      const w = new Widget();
      const data = {
        'Funnel 1': {
          stages: makeStages([100, 80, 50]),
        },
      };

      const result = getPrivate(w).transformFunnelSeriesFormat(data);
      expect(result.funnel).toBeDefined();
      expect(result.funnel.stages).toHaveLength(3);
      expect(result.funnelBreakdown).toBeUndefined();
    });

    it('handles $overall + breakdown', () => {
      const w = new Widget();
      const data = {
        'Funnel 1': {
          $overall: { stages: makeStages([100, 80]) },
          US: { stages: makeStages([60, 50]) },
          UK: { stages: makeStages([40, 30]) },
        },
      };

      const result = getPrivate(w).transformFunnelSeriesFormat(data);
      expect(result.funnel.stages).toHaveLength(2);
      expect(result.funnelBreakdown).toBeDefined();
      expect(Object.keys(result.funnelBreakdown!)).toEqual(['US', 'UK']);
    });

    it('sorts breakdown by first stage count descending', () => {
      const w = new Widget();
      const data = {
        'Funnel 1': {
          $overall: { stages: makeStages([100]) },
          Small: { stages: makeStages([10]) },
          Big: { stages: makeStages([90]) },
          Mid: { stages: makeStages([50]) },
        },
      };

      const result = getPrivate(w).transformFunnelSeriesFormat(data);
      const keys = Object.keys(result.funnelBreakdown!);
      expect(keys).toEqual(['Big', 'Mid', 'Small']);
    });

    it('returns empty Funnel for empty series', () => {
      const w = new Widget();
      const result = getPrivate(w).transformFunnelSeriesFormat({});
      expect(result.funnel).toBeDefined();
      expect(result.funnel.stages).toHaveLength(0);
    });

    it('skips breakdown entries without stages', () => {
      const w = new Widget();
      const data = {
        'Funnel 1': {
          $overall: { stages: makeStages([100]) },
          US: { stages: makeStages([60]) },
          Invalid: { noStages: true },
        },
      };

      const result = getPrivate(w).transformFunnelSeriesFormat(data);
      expect(Object.keys(result.funnelBreakdown!)).toEqual(['US']);
    });
  });

  describe('setData (funnel integration)', () => {
    it('maps new series format for funnel without breakdown', () => {
      const w = new Widget();
      w.metricType = FUNNEL;

      const data = {
        series: {
          'Funnel 1': {
            stages: [
              { type: 'click', operator: 'is', count: 100, value: ['s1'] },
              { type: 'click', operator: 'is', count: 50, value: ['s2'] },
            ],
          },
        },
      };

      const result = w.setData(data, {});
      expect(w.data.funnel).toBeDefined();
      expect(w.data.funnel.stages).toHaveLength(2);
      expect(result.funnelBreakdown).toBeUndefined();
    });

    it('maps new series format for funnel with breakdown', () => {
      const w = new Widget();
      w.metricType = FUNNEL;

      const data = {
        series: {
          'Funnel 1': {
            $overall: {
              stages: [
                { type: 'click', operator: 'is', count: 100, value: ['s1'] },
              ],
            },
            US: {
              stages: [
                { type: 'click', operator: 'is', count: 70, value: ['s1'] },
              ],
            },
            UK: {
              stages: [
                { type: 'click', operator: 'is', count: 30, value: ['s1'] },
              ],
            },
          },
        },
      };

      const result = w.setData(data, {});
      expect(w.data.funnel.stages).toHaveLength(1);
      expect(w.data.funnelBreakdown).toBeDefined();
      expect(Object.keys(w.data.funnelBreakdown)).toEqual(['US', 'UK']);
    });

    it('comparison data is returned but not stored on widget.data', () => {
      const w = new Widget();
      w.metricType = FUNNEL;

      // First set main data
      w.setData(
        {
          series: {
            F: {
              stages: [
                { type: 'click', operator: 'is', count: 100, value: ['s1'] },
              ],
            },
          },
        },
        {},
      );

      // Now set comparison data
      const compResult = w.setData(
        {
          series: {
            F: {
              stages: [
                { type: 'click', operator: 'is', count: 80, value: ['s1'] },
              ],
            },
          },
        },
        {},
        true,
      );

      // Comparison should be returned for the caller
      expect(compResult).toBeDefined();
      expect(compResult.funnel.stages).toHaveLength(1);
      // Main data should not be overwritten
      expect(w.data.funnel.stages[0].count).toBe(100);
    });

    it('does not crash on funnel data with stages arrays (no stack overflow)', () => {
      const w = new Widget();
      w.metricType = FUNNEL;

      // This is the exact shape that caused the stack overflow before:
      // stages arrays are not NestedData and would cause infinite recursion
      // in isLeaf/sumAll if passed to transformNewSeriesFormat
      const data = {
        series: {
          F: {
            $overall: {
              stages: [
                { type: 'click', operator: 'is', count: 100, value: ['s1'] },
                { type: 'click', operator: 'is', count: 50, value: ['s2'] },
              ],
            },
            US: {
              stages: [
                { type: 'click', operator: 'is', count: 60, value: ['s1'] },
                { type: 'click', operator: 'is', count: 30, value: ['s2'] },
              ],
            },
          },
        },
      };

      // Should not throw (previously caused Maximum call stack size exceeded)
      expect(() => w.setData(data, {})).not.toThrow();
      expect(w.data.funnel.stages).toHaveLength(2);
    });
  });
});
