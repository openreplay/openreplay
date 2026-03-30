/* eslint-disable i18next/no-literal-string */
import { Button, InputNumber, Popover } from 'antd';
import { ChevronDown } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import {
  type NestedData,
  buildLevelTree,
  computeSelectionFromTopN,
  getDepth,
} from 'App/utils/breakdownTree';

interface Props {
  data: Record<string, NestedData>;
  breakdownLabels?: string[];
}

function LevelControl({
  label,
  n,
  total,
  onApply,
}: {
  label: string;
  n: number;
  total: number;
  onApply: (n: number) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(n || 3);

  React.useEffect(() => {
    if (n) setDraft(n);
  }, [n]);

  const apply = (val: number) => {
    onApply(val);
    setOpen(false);
  };

  const buttonLabel =
    n === 0
      ? `${label}: ${t('All')}${total ? ` (${total})` : ''}`
      : `${label}: ${t('Top')} ${n}`;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      content={
        <div className="flex flex-col gap-2" style={{ width: 200 }}>
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">{t('Show top')}</span>
            <InputNumber
              size="small"
              min={1}
              max={total || 999}
              value={draft}
              onChange={(v) => v && setDraft(v)}
              style={{ width: 70 }}
            />
            <Button size="small" type="primary" onClick={() => apply(draft)}>
              {t('Apply')}
            </Button>
          </div>
          <Button size="small" type="default" block onClick={() => apply(3)}>
            {t('Top 3')}
          </Button>
          {total > 0 && (
            <Button size="small" type="default" block onClick={() => apply(0)}>
              {t('Show all')} ({total})
            </Button>
          )}
        </div>
      }
    >
      <Button size="small" type="default">
        {buttonLabel} <ChevronDown size={12} />
      </Button>
    </Popover>
  );
}

/** Count unique values at a given breakdown level across all parent paths. */
function getTotalAtLevel(
  levelTree: Map<string, { key: string; total: number }[]>,
  levelIdx: number,
): number {
  // Build up parent paths level by level, then count unique children
  let parentPaths: string[] = [''];
  for (let d = 0; d < levelIdx; d++) {
    const next: string[] = [];
    parentPaths.forEach((p) => {
      levelTree.get(p)?.forEach((c) => {
        next.push(p === '' ? c.key : `${p} / ${c.key}`);
      });
    });
    parentPaths = next;
  }
  const unique = new Set<string>();
  parentPaths.forEach((p) => {
    levelTree.get(p)?.forEach((c) => unique.add(c.key));
  });
  return unique.size;
}

function BreakdownSelectionPanel({ data, breakdownLabels }: Props) {
  const { metricStore } = useStore();

  const { levelTree, depth } = React.useMemo(() => {
    const tree = buildLevelTree(data);
    const d = Math.max(
      0,
      ...Object.values(data).map((d) => getDepth(d as NestedData)),
    );
    return { levelTree: tree, depth: d };
  }, [data]);

  if (depth === 0) return null;

  const applyForLevel = (levelIdx: number, n: number) => {
    metricStore.setBreakdownLevelTopN(levelIdx, n);
    const newTopN = [...metricStore.breakdownLevelTopN];

    if (levelIdx === 0) {
      // Recompute everything from root
      metricStore.setBreakdownSelection(
        computeSelectionFromTopN(levelTree, newTopN, depth),
      );
      return;
    }

    // For level > 0: preserve upper-level selections, update this level and below
    // under every currently-selected parent path.
    const updated = { ...metricStore.breakdownSelection };

    // Collect all selected paths at depth `levelIdx` using the existing selection
    function getParentPaths(parentPath: string, currentDepth: number): string[] {
      if (currentDepth === levelIdx) return [parentPath];
      const sel = updated[parentPath];
      const allKeys = levelTree.get(parentPath)?.map((c) => c.key) ?? [];
      const selected = sel === null || sel === undefined ? allKeys : sel;
      return selected.flatMap((key) => {
        const childPath = parentPath ? `${parentPath} / ${key}` : key;
        return getParentPaths(childPath, currentDepth + 1);
      });
    }

    // Apply topN at `lvl` under parentPath, then propagate deeper levels
    function applyDown(parentPath: string, lvl: number) {
      if (lvl >= depth) return;
      const children = levelTree.get(parentPath) ?? [];
      const topNForLevel = newTopN[lvl] ?? 0;
      const selected =
        topNForLevel > 0
          ? children.slice(0, topNForLevel).map((c) => c.key)
          : null;
      updated[parentPath] = selected;
      const toProcess = selected ?? children.map((c) => c.key);
      toProcess.forEach((key) => {
        const childPath = parentPath ? `${parentPath} / ${key}` : key;
        applyDown(childPath, lvl + 1);
      });
    }

    getParentPaths('', 0).forEach((parentPath) =>
      applyDown(parentPath, levelIdx),
    );
    metricStore.setBreakdownSelection(updated);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-2 py-1 mb-1">
      {Array.from({ length: depth }, (_, i) => {
        const label = breakdownLabels?.[i] ?? `Level ${i + 1}`;
        const n = metricStore.breakdownLevelTopN[i] ?? 0;
        const total = getTotalAtLevel(levelTree, i);
        return (
          <LevelControl
            key={i}
            label={label}
            n={n}
            total={total}
            onApply={(val) => applyForLevel(i, val)}
          />
        );
      })}
    </div>
  );
}

export default observer(BreakdownSelectionPanel);
