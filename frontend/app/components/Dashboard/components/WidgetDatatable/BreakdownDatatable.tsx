/* eslint-disable i18next/no-literal-string */
import { Button, Checkbox, Divider, Table } from 'antd';
import type { TableProps } from 'antd';
import cn from 'classnames';
import { Download, Eye, EyeOff } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatIsoForColumn } from 'App/date';
import { useStore } from 'App/mstore';
import { exportAntCsv } from 'App/utils';
import {
  type NestedData,
  buildLevelTree,
  collectTimestamps,
  getDepth,
  sumAll,
} from 'App/utils/breakdownTree';

import BreakdownSelectionPanel from '../BreakdownFilter/BreakdownSelectionPanel';

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
): {
  levels: { label: string; total: number; pct: string; rowSpan: number }[];
  tsValues: Record<string, number>;
}[] {
  const firstVal = Object.values(obj)[0];
  if (firstVal == null) return [];

  if (typeof firstVal === 'number') {
    const tsValues: Record<string, number> = {};
    timestamps.forEach((ts) => {
      tsValues[ts] = (obj as Record<string, number>)[ts] ?? 0;
    });
    return [{ levels: [], tsValues }];
  }

  const rows: {
    levels: { label: string; total: number; pct: string; rowSpan: number }[];
    tsValues: Record<string, number>;
  }[] = [];
  const entries = Object.entries(obj).sort(
    ([, a], [, b]) => sumAll(b as NestedData) - sumAll(a as NestedData),
  );
  entries.forEach(([label, child]) => {
    const childData = child as NestedData;
    const childTotal = sumAll(childData);
    const pct =
      seriesTotal > 0 ? ((childTotal / seriesTotal) * 100).toFixed(1) : '0.0';
    const childRows = flattenNode(
      childData,
      seriesTotal,
      timestamps,
      `${parentKey}_${label}`,
    );
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

function buildTableData(data: Record<string, NestedData>): {
  rows: FlatRow[];
  timestamps: string[];
  depth: number;
} {
  if (!data || Object.keys(data).length === 0) {
    return { rows: [], timestamps: [], depth: 0 };
  }

  const tsSet = new Set<string>();
  Object.values(data).forEach((seriesData) =>
    collectTimestamps(seriesData, tsSet),
  );
  const timestamps = Array.from(tsSet).sort((a, b) => Number(a) - Number(b));

  const depth = Math.max(
    ...Object.values(data).map((seriesData) => getDepth(seriesData)),
  );

  const rows: FlatRow[] = [];
  let rowIdx = 0;

  Object.entries(data).forEach(([seriesName, seriesData]) => {
    const seriesDepth = getDepth(seriesData);
    const seriesTotal = sumAll(seriesData);

    if (seriesDepth === 0) {
      const tsValues: Record<string, any> = {};
      timestamps.forEach((ts) => {
        tsValues[`ts_${ts}`] = (seriesData as Record<string, number>)[ts] ?? 0;
      });
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

    const flatRows = flattenNode(
      seriesData,
      seriesTotal,
      timestamps,
      seriesName,
    );
    const leafCount = flatRows.length;

    flatRows.forEach((fr, i) => {
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

  const hasBreakdowns = useMemo(
    () => Object.values(props.data).some((d) => getDepth(d) > 0),
    [props.data],
  );

  // Stable tree of all breakdown values with totals
  const levelTree = useMemo(
    () => (hasBreakdowns ? buildLevelTree(props.data) : new Map()),
    [props.data, hasBreakdowns],
  );

  const handleToggle = useCallback(
    (parentPath: string, value: string, levelIdx: number) => {
      const currentSelection = { ...metricStore.breakdownSelection };
      const currentSel = currentSelection[parentPath];
      const allSiblings =
        levelTree
          .get(parentPath)
          ?.map((c: { key: string; total: number }) => c.key) ?? [];
      const isSelected =
        currentSel === undefined ||
        currentSel === null ||
        currentSel.includes(value);

      if (isSelected) {
        // Uncheck: remove from selection (don't allow empty)
        const current = !currentSel ? [...allSiblings] : [...currentSel];
        const newSel = current.filter((k) => k !== value);
        if (newSel.length === 0) return;
        currentSelection[parentPath] = newSel;
      } else {
        // Check: add back and initialize children
        const current = !currentSel ? [...allSiblings] : [...currentSel];
        if (!current.includes(value)) current.push(value);
        currentSelection[parentPath] =
          current.length === allSiblings.length ? null : current;

        // Initialize children for the newly-checked value if not already set
        const childPath = parentPath ? `${parentPath} / ${value}` : value;
        if (!(childPath in currentSelection)) {
          const childTopN = metricStore.breakdownLevelTopN[levelIdx + 1] ?? 0;
          const childKeys = levelTree.get(childPath)?.map((c) => c.key) ?? [];
          if (childKeys.length > 0) {
            currentSelection[childPath] =
              childTopN > 0 ? childKeys.slice(0, childTopN) : null;
          }
        }
      }

      metricStore.setBreakdownSelection(currentSelection);
    },
    [levelTree, metricStore],
  );

  const { rows, columns } = useMemo(() => {
    // Always build from full unfiltered data
    const { rows, timestamps, depth } = buildTableData(props.data);

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
          if (!level || level.rowSpan === 0) return null;

          if (!level.label || !hasBreakdowns) {
            return (
              <div>
                <div>{level.label}</div>
                <div className="text-xs text-gray-500">
                  {level.total > 0
                    ? `${level.total.toLocaleString()} (${level.pct})`
                    : ''}
                </div>
              </div>
            );
          }

          const parentPath = record.levels
            .slice(0, lvl)
            .map((l) => l.label)
            .filter(Boolean)
            .join(' / ');

          const value = level.label;
          const sel = metricStore.breakdownSelection[parentPath];
          const isSelected =
            sel === undefined || sel === null || sel.includes(value);

          // Check if every ancestor is selected (for dimming and disabling)
          let isParentSelected = true;
          for (let i = 0; i < lvl; i++) {
            const ancestorParentPath = record.levels
              .slice(0, i)
              .map((l) => l.label)
              .filter(Boolean)
              .join(' / ');
            const ancestorSel =
              metricStore.breakdownSelection[ancestorParentPath];
            if (
              ancestorSel !== undefined &&
              ancestorSel !== null &&
              !ancestorSel.includes(record.levels[i].label)
            ) {
              isParentSelected = false;
              break;
            }
          }

          // Indeterminate: selected but some children are deselected
          const childPath = parentPath ? `${parentPath} / ${value}` : value;
          const childSel = metricStore.breakdownSelection[childPath];
          const childKeys = levelTree.get(childPath)?.map((c) => c.key) ?? [];
          const isIndeterminate =
            isSelected &&
            isParentSelected &&
            childKeys.length > 0 &&
            childSel !== null &&
            childSel !== undefined &&
            childSel.length < childKeys.length;

          const effectiveChecked = isSelected && isParentSelected;

          return (
            <div
              className={cn(
                'flex items-start gap-2',
                !isParentSelected && 'opacity-40',
              )}
            >
              <Checkbox
                checked={effectiveChecked}
                indeterminate={isIndeterminate}
                disabled={!isParentSelected}
                onChange={() => handleToggle(parentPath, value, lvl)}
                className="mt-0.5 shrink-0"
              />
              <div>
                <div>{value}</div>
                <div className="text-xs text-gray-500">
                  {level.total.toLocaleString()} ({level.pct})
                </div>
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
  }, [
    props.data,
    props.breakdownLabels,
    hasBreakdowns,
    levelTree,
    metricStore.breakdownSelection,
    handleToggle,
  ]);

  // Dim rows where any breakdown level is deselected in the chart
  const rowClassName = useCallback(
    (record: FlatRow) => {
      if (!hasBreakdowns) return '';
      for (let i = 0; i < record.levels.length; i++) {
        const lvl = record.levels[i];
        if (!lvl.label) continue;
        const parentPath = record.levels
          .slice(0, i)
          .map((l) => l.label)
          .filter(Boolean)
          .join(' / ');
        if (!metricStore.isBreakdownValueSelected(parentPath, lvl.label)) {
          return 'opacity-50';
        }
      }
      return '';
    },
    [hasBreakdowns, metricStore],
  );

  const isTableOnlyMode = props.metric.viewType === 'table';

  if (!props.data || Object.keys(props.data).length === 0) {
    return null;
  }

  return (
    <div className={cn('relative -mx-4 px-2')}>
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
          <div className="flex items-center mb-2 gap-2">
            {hasBreakdowns && (
              <BreakdownSelectionPanel
                data={props.data}
                breakdownLabels={props.breakdownLabels}
              />
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
            rowClassName={rowClassName}
          />
        </div>
      ) : null}
    </div>
  );
}

export default observer(BreakdownDatatable);
