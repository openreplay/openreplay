/* eslint-disable i18next/no-literal-string */
import { Button, Divider, Table } from 'antd';
import type { TableProps } from 'antd';
import cn from 'classnames';
import { Download, Eye, EyeOff } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { exportAntCsv } from 'App/utils';

/**
 * Data format example:
 * {
 *   "Series A": {
 *     "US": {
 *       "New York": { "2024-01-01": 100, "2024-01-02": 200 },
 *       "LA":       { "2024-01-01": 50,  "2024-01-02": 80 }
 *     },
 *     "UK": {
 *       "London": { "2024-01-01": 30, "2024-01-02": 40 }
 *     }
 *   }
 * }
 *
 * breakdownLabels: ["Country", "City"]  — labels for each nesting level
 */

type NestedData = Record<string, number> | Record<string, NestedData>;

interface Props {
  data: Record<string, NestedData>;
  breakdownLabels?: string[];
  defaultOpen?: boolean;
  metric: { name: string; viewType: string };
  inBuilder?: boolean;
}

interface FlatRow {
  key: string;
  seriesName: string;
  seriesRowSpan: number;
  levels: { label: string; total: number; pct: string; rowSpan: number }[];
  [timestampKey: string]: any;
}

function getDepth(obj: NestedData): number {
  const firstVal = Object.values(obj)[0];
  if (firstVal == null || typeof firstVal === 'number') return 0;
  return 1 + getDepth(firstVal as NestedData);
}

function collectTimestamps(obj: NestedData, set: Set<string>): void {
  const firstVal = Object.values(obj)[0];
  if (firstVal == null) return;
  if (typeof firstVal === 'number') {
    Object.keys(obj).forEach((k) => set.add(k));
  } else {
    Object.values(obj).forEach((child) =>
      collectTimestamps(child as NestedData, set),
    );
  }
}

function sumAll(obj: NestedData): number {
  const firstVal = Object.values(obj)[0];
  if (firstVal == null) return 0;
  if (typeof firstVal === 'number') {
    return Object.values(obj).reduce((s: number, v) => s + (v as number), 0);
  }
  return Object.values(obj).reduce(
    (s, child) => s + sumAll(child as NestedData),
    0,
  );
}

function flattenNode(
  obj: NestedData,
  seriesTotal: number,
  timestamps: string[],
  parentKey: string,
): { levels: { label: string; total: number; pct: string; rowSpan: number }[]; tsValues: Record<string, number> }[] {
  const firstVal = Object.values(obj)[0];
  if (firstVal == null) return [];

  // Leaf level — obj is Record<string, number>
  if (typeof firstVal === 'number') {
    const tsValues: Record<string, number> = {};
    timestamps.forEach((ts) => {
      tsValues[ts] = (obj as Record<string, number>)[ts] ?? 0;
    });
    return [{ levels: [], tsValues }];
  }

  // Non-leaf level
  const rows: { levels: { label: string; total: number; pct: string; rowSpan: number }[]; tsValues: Record<string, number> }[] = [];
  const entries = Object.entries(obj);
  entries.forEach(([label, child]) => {
    const childData = child as NestedData;
    const childTotal = sumAll(childData);
    const pct = seriesTotal > 0 ? ((childTotal / seriesTotal) * 100).toFixed(1) : '0.0';
    const childRows = flattenNode(childData, seriesTotal, timestamps, `${parentKey}_${label}`);
    const leafCount = childRows.length;

    childRows.forEach((row, i) => {
      row.levels.unshift({
        label,
        total: childTotal,
        pct: `${pct}%`,
        rowSpan: i === 0 ? leafCount : 0,
      });
    });

    rows.push(...childRows);
  });

  return rows;
}

function buildTableData(
  data: Record<string, NestedData>,
): { rows: FlatRow[]; timestamps: string[]; depth: number } {
  if (!data || Object.keys(data).length === 0) {
    return { rows: [], timestamps: [], depth: 0 };
  }

  const tsSet = new Set<string>();
  Object.values(data).forEach((seriesData) => collectTimestamps(seriesData, tsSet));
  const timestamps = Array.from(tsSet).sort();

  // compute max depth across all series so columns cover every level
  const depth = Math.max(
    ...Object.values(data).map((seriesData) => getDepth(seriesData)),
  );

  const rows: FlatRow[] = [];
  let rowIdx = 0;

  Object.entries(data).forEach(([seriesName, seriesData]) => {
    const seriesDepth = getDepth(seriesData);
    const seriesTotal = sumAll(seriesData);

    if (seriesDepth === 0) {
      // No breakdowns — just series with timestamp values
      const tsValues: Record<string, any> = {};
      timestamps.forEach((ts) => {
        tsValues[`ts_${ts}`] = (seriesData as Record<string, number>)[ts] ?? 0;
      });
      // pad levels so this row has empty cells for all breakdown columns
      const emptyLevels: FlatRow['levels'] = [];
      for (let i = 0; i < depth; i++) {
        emptyLevels.push({ label: '', total: 0, pct: '', rowSpan: 1 });
      }
      const row: FlatRow = {
        key: `row_${rowIdx++}`,
        seriesName,
        seriesRowSpan: 1,
        levels: emptyLevels,
        ...tsValues,
      };
      for (let i = 0; i < depth; i++) {
        row[`level_${i}`] = '';
      }
      rows.push(row);
      return;
    }

    const flatRows = flattenNode(seriesData, seriesTotal, timestamps, seriesName);
    const leafCount = flatRows.length;

    flatRows.forEach((fr, i) => {
      // pad levels if this series has fewer breakdown levels than the max
      while (fr.levels.length < depth) {
        fr.levels.push({ label: '', total: 0, pct: '', rowSpan: 1 });
      }
      const row: FlatRow = {
        key: `row_${rowIdx++}`,
        seriesName,
        seriesRowSpan: i === 0 ? leafCount : 0,
        levels: fr.levels,
      };
      fr.levels.forEach((lvl, lvlIdx) => {
        row[`level_${lvlIdx}`] = lvl.label
          ? `${lvl.label} - ${lvl.total.toLocaleString()} (${lvl.pct})`
          : '';
      });
      timestamps.forEach((ts) => {
        row[`ts_${ts}`] = fr.tsValues[ts] ?? 0;
      });
      rows.push(row);
    });
  });

  return { rows, timestamps, depth };
}

function BreakdownDatatable(props: Props) {
  const { t } = useTranslation();
  const [showTable, setShowTable] = useState(props.defaultOpen);

  const { rows, timestamps, depth, columns } = useMemo(() => {
    const { rows, timestamps, depth } = buildTableData(props.data);

    const cols: TableProps['columns'] = [
      {
        title: <span className="font-medium">Series</span>,
        dataIndex: 'seriesName',
        key: 'seriesName',
        fixed: 'left' as const,
        // @ts-ignore
        _pureTitle: 'Series',
        onCell: (record: FlatRow) => ({
          rowSpan: record.seriesRowSpan,
        }),
      },
    ];

    const labels = props.breakdownLabels ?? [];
    for (let lvl = 0; lvl < depth; lvl++) {
      const levelLabel = labels[lvl] ?? `Level ${lvl + 1}`;
      cols.push({
        title: <span className="font-medium">{levelLabel}</span>,
        dataIndex: `level_${lvl}`,
        key: `level_${lvl}`,
        fixed: 'left' as const,
        // @ts-ignore
        _pureTitle: levelLabel,
        render: (_: any, record: FlatRow) => {
          const level = record.levels[lvl];
          if (!level) return null;
          return (
            <div>
              <div>{level.label}</div>
              <div className="text-xs text-gray-500">
                {level.total.toLocaleString()} ({level.pct})
              </div>
            </div>
          );
        },
        onCell: (record: FlatRow) => ({
          rowSpan: record.levels[lvl]?.rowSpan ?? 1,
        }),
      });
    }

    timestamps.forEach((ts, i) => {
      cols.push({
        title: <span className="font-medium">{ts}</span>,
        dataIndex: `ts_${ts}`,
        key: `ts_${ts}`,
        // @ts-ignore
        _pureTitle: ts,
      });
    });

    return { rows, timestamps, depth, columns: cols };
  }, [props.data, props.breakdownLabels]);

  const isTableOnlyMode = props.metric.viewType === 'table';

  if (!props.data || Object.keys(props.data).length === 0) {
    return null;
  }

  return (
    <div className={cn('relative -mx-4 px-2', showTable ? '' : '')}>
      {!isTableOnlyMode && (
        <div className="flex gap-2">
          <Divider
            style={{
              borderColor: showTable ? '#efefef' : 'transparent',
              borderStyle: 'dashed',
            }}
            variant="dashed"
          >
            <Button
              icon={showTable ? <EyeOff size={16} /> : <Eye size={16} />}
              size="small"
              type="default"
              onClick={() => setShowTable(!showTable)}
              className="btn-show-hide-table"
            >
              {showTable ? t('Hide Table') : t('Show Table')}
            </Button>
          </Divider>
        </div>
      )}

      {showTable || isTableOnlyMode ? (
        <div className="relative pb-2">
          <Table
            columns={columns}
            dataSource={rows}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
            bordered
          />
          <div className="flex justify-end mt-2">
            <Button
              icon={<Download size={14} />}
              size="small"
              type="default"
              onClick={() => exportAntCsv(columns, rows, props.metric.name)}
            >
              {t('Export as CSV')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BreakdownDatatable;
