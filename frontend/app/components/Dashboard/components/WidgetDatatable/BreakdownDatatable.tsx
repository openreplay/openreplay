/* eslint-disable i18next/no-literal-string */
import { Button, Divider, Table } from 'antd';
import type { TableProps } from 'antd';
import cn from 'classnames';
import { Download, Eye, EyeOff } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatIsoForColumn } from 'App/date';
import { useStore } from 'App/mstore';
import { exportAntCsv } from 'App/utils';
import {
  type NestedData,
  collectTimestamps,
  getDepth,
  isLeaf,
  sumAll,
} from 'App/utils/breakdownTree';
import TopNButton from '../BreakdownFilter/TopNButton';

type TopNLimit = 3 | 10 | 0; // 0 = all

/**
 * Trim the data tree so that at the deepest breakdown level of each branch,
 * only the top N entries (by sumAll) are kept.
 * E.g. Country→City with topN=3 keeps only top 3 cities per country.
 */
function trimTopN(
  obj: NestedData,
  topN: TopNLimit,
): NestedData {
  if (topN === 0) return obj;
  if (isLeaf(obj)) return obj;

  const entries = Object.entries(obj);
  const firstChild = entries[0]?.[1];
  if (firstChild == null) return obj;

  // Check if children are leaves — this is the deepest level to trim
  if (isLeaf(firstChild as NestedData)) {
    const sorted = entries
      .map(([key, child]) => ({ key, child, total: sumAll(child as NestedData) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, topN);
    const result: Record<string, NestedData> = {};
    sorted.forEach(({ key, child }) => {
      result[key] = child as NestedData;
    });
    return result;
  }

  // Non-leaf children — recurse deeper
  const result: Record<string, NestedData> = {};
  entries.forEach(([key, child]) => {
    result[key] = trimTopN(child as NestedData, topN);
  });
  return result;
}

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

  // Non-leaf level — sort children by total descending
  const rows: { levels: { label: string; total: number; pct: string; rowSpan: number }[]; tsValues: Record<string, number> }[] = [];
  const entries = Object.entries(obj).sort(
    ([, a], [, b]) => sumAll(b as NestedData) - sumAll(a as NestedData),
  );
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
  const timestamps = Array.from(tsSet).sort((a, b) => Number(a) - Number(b));

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
  const { metricStore } = useStore();
  const [showTable, setShowTable] = useState(props.defaultOpen);
  const topN = metricStore.breakdownTopN as TopNLimit;

  const hasBreakdowns = useMemo(
    () => Object.values(props.data).some((d) => getDepth(d) > 0),
    [props.data],
  );

  const totalBreakdownValues = useMemo(() => {
    if (!hasBreakdowns) return 0;
    const allKeys = new Set<string>();
    Object.values(props.data).forEach((d) => {
      if (getDepth(d) > 0) {
        Object.keys(d).forEach((k) => allKeys.add(k));
      }
    });
    return allKeys.size;
  }, [props.data, hasBreakdowns]);

  const { rows, columns } = useMemo(() => {
    const trimmed = hasBreakdowns
      ? Object.fromEntries(
          Object.entries(props.data).map(([k, v]) => [k, trimTopN(v, topN)]),
        )
      : props.data;
    const { rows, timestamps, depth } = buildTableData(trimmed);

    const cols: NonNullable<TableProps['columns']> = [
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

    timestamps.forEach((ts) => {
      const label = formatIsoForColumn(Number(ts));
      cols.push({
        title: <span className="font-medium">{label}</span>,
        dataIndex: `ts_${ts}`,
        key: `ts_${ts}`,
        // @ts-ignore
        _pureTitle: label,
      });
    });

    return { rows, timestamps, depth, columns: cols };
  }, [props.data, props.breakdownLabels, topN, hasBreakdowns]);

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
        <div className="relative">
          <div className="flex items-center mb-2">
            {hasBreakdowns && props.inBuilder && (
              <TopNButton totalValues={totalBreakdownValues} />
            )}
            <Button
              icon={<Download size={14} />}
              size="small"
              type="default"
              className="ml-auto"
              onClick={() => exportAntCsv(columns, rows, props.metric.name)}
            >
              {t('Export as CSV')}
            </Button>
          </div>
          <Table
            columns={columns}
            dataSource={rows}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
            bordered
          />
        </div>
      ) : null}
    </div>
  );
}

export default observer(BreakdownDatatable);
