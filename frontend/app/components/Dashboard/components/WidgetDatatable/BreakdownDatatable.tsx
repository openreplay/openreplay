/* eslint-disable i18next/no-literal-string */
import { Checkbox } from '@/ui/inputs/checkbox';
import { DateTime } from 'luxon';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { getLocalHourFormat } from 'App/utils/intlUtils';

import BreakdownSelectionPanel from '../BreakdownFilter/BreakdownSelectionPanel';
import {
  type StoredBreakdown,
  breakdownName,
  getBreakdownDisplayName,
} from '../BreakdownFilter/breakdownDimensions';
import { usePreviewTable } from '../WidgetPreview/previewTable';

interface Props {
  data: Record<string, NestedData>;
  breakdownLabels?: StoredBreakdown[];
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
  const { metricStore, filterStore } = useStore();
  // in the card builder the preview's toolbar shows / hides and exports it
  const preview = usePreviewTable();

  // props.breakdownLabels are API dimension keys; show the catalog label instead.
  // Keyed on the joined names because getCurrentProjectFilters() returns a fresh array.
  const labelsKey = (props.breakdownLabels ?? []).map(breakdownName).join('|');
  const breakdownLabels = useMemo(() => {
    const allFilterOptions = filterStore.getCurrentProjectFilters();
    return (props.breakdownLabels ?? []).map((breakdown) =>
      getBreakdownDisplayName(breakdown, allFilterOptions),
    );
  }, [labelsKey, filterStore.isLoadingFilters]);

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

  const { rows, timestamps, depth } = useMemo(
    () => buildTableData(props.data),
    [props.data],
  );
  const tsLabels = useMemo(() => {
    const subDay =
      timestamps.length > 1 &&
      Number(timestamps[1]) - Number(timestamps[0]) < 86_400_000;
    return timestamps.map((ts) => {
      const label = formatIsoForColumn(Number(ts));
      const at = DateTime.fromMillis(Number(ts));
      // past days print only the date; hourly buckets need the hour too
      return subDay && !at.hasSame(DateTime.now(), 'day')
        ? `${label}, ${at.toFormat(getLocalHourFormat(false)).toLowerCase()}`
        : label;
    });
  }, [timestamps]);
  // export reads `_pureTitle`/`dataIndex`, the shape exportAntCsv expects
  const exportColumns = useMemo(
    () => [
      { _pureTitle: 'Series', dataIndex: 'seriesName' },
      ...Array.from({ length: depth }, (_, lvl) => ({
        _pureTitle: breakdownLabels[lvl] ?? `Level ${lvl + 1}`,
        dataIndex: `level_${lvl}`,
      })),
      ...timestamps.map((ts, i) => ({
        _pureTitle: tsLabels[i],
        dataIndex: `ts_${ts}`,
      })),
    ],
    [depth, timestamps, tsLabels, breakdownLabels],
  );
  const exportNow = useRef(() => {});
  exportNow.current = () =>
    exportAntCsv(exportColumns, rows, props.metric.name);
  const setExport = preview?.setExport;
  useEffect(() => {
    if (!setExport) return undefined;
    setExport(() => exportNow.current());
    return () => setExport(null);
  }, [setExport]);

  const pathOf = (record: FlatRow, upTo: number) =>
    record.levels
      .slice(0, upTo)
      .map((l) => l.label)
      .filter(Boolean)
      .join(' / ');

  const dimmed = (record: FlatRow) => {
    if (!hasBreakdowns) return false;
    return record.levels.some(
      (lvl, i) =>
        !!lvl.label &&
        !metricStore.isBreakdownValueSelected(pathOf(record, i), lvl.label),
    );
  };

  const levelCell = (record: FlatRow, lvl: number) => {
    const level = record.levels[lvl];
    const meta =
      level.total > 0 ? `${level.total.toLocaleString()} (${level.pct})` : '';
    if (!level.label || !hasBreakdowns) {
      return (
        <span className="m-ttable__level">
          <span>{level.label}</span>
          <span className="m-ttable__meta">{meta}</span>
        </span>
      );
    }
    const parentPath = pathOf(record, lvl);
    const value = level.label;
    const sel = metricStore.breakdownSelection[parentPath];
    const isSelected = sel == null || sel.includes(value);
    let parentOn = true;
    for (let i = 0; i < lvl; i++) {
      const s = metricStore.breakdownSelection[pathOf(record, i)];
      if (s != null && !s.includes(record.levels[i].label)) {
        parentOn = false;
        break;
      }
    }
    const childPath = parentPath ? `${parentPath} / ${value}` : value;
    const childSel = metricStore.breakdownSelection[childPath];
    const childCount = levelTree.get(childPath)?.length ?? 0;
    const partial =
      isSelected &&
      parentOn &&
      childCount > 0 &&
      childSel != null &&
      childSel.length < childCount;
    return (
      <span className={`m-ttable__level${parentOn ? '' : ' is-off'}`}>
        <Checkbox
          checked={partial ? 'indeterminate' : isSelected && parentOn}
          disabled={!parentOn}
          onCheckedChange={() => handleToggle(parentPath, value, lvl)}
          aria-label={value}
        />
        <span className="flex flex-col">
          <span>{value}</span>
          <span className="m-ttable__meta">{meta}</span>
        </span>
      </span>
    );
  };

  const isTableOnlyMode = props.metric.viewType === 'table';
  const inGrid = !props.inBuilder;

  if (!props.data || Object.keys(props.data).length === 0) {
    return null;
  }
  if (!isTableOnlyMode && preview && !preview.shown) return null;

  return (
    <div className="m-ttable">
      {!inGrid && hasBreakdowns && (
        <div className="m-ttable__tools">
          <BreakdownSelectionPanel
            data={props.data}
            breakdownLabels={breakdownLabels}
          />
        </div>
      )}
      <div
        className="m-ttable__scroll"
        style={inGrid ? { maxHeight: 240 } : undefined}
      >
        <table className="m-ttable__table">
          <thead>
            <tr>
              <th className="is-pinned">{t('Series')}</th>
              {Array.from({ length: depth }, (_, lvl) => (
                <th key={lvl}>{breakdownLabels[lvl] ?? `Level ${lvl + 1}`}</th>
              ))}
              {tsLabels.map((label, i) => (
                <th key={timestamps[i]} className="is-num">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={dimmed(r) ? 'is-dim' : undefined}>
                {r.seriesRowSpan > 0 ? (
                  <td className="is-pinned" rowSpan={r.seriesRowSpan}>
                    {r.seriesName}
                  </td>
                ) : null}
                {r.levels.map((lvl, i) =>
                  lvl.rowSpan > 0 ? (
                    <td key={i} rowSpan={lvl.rowSpan}>
                      {levelCell(r, i)}
                    </td>
                  ) : null,
                )}
                {timestamps.map((ts) => (
                  <td key={ts} className="is-num">
                    {(r[`ts_${ts}`] ?? 0).toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default observer(BreakdownDatatable);
