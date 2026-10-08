import { observer } from 'mobx-react-lite';
import React from 'react';

import { numberWithCommas } from 'App/utils';

import '../../charts.css';

interface BreakdownNode {
  key: string;
  total: number;
  children: BreakdownNode[];
}

interface FlatItem {
  type: 'main' | 'sub';
  key: string;
  label: string;
  total: number;
  progress: number;
  depth: number;
  icon?: any;
  displayName?: string;
  sessionCount?: string;
  mainProgress?: number;
}

function flattenBreakdownRows(
  rows: BreakdownNode[],
  parentTotal: number,
  depth: number,
  keyPrefix: string,
): FlatItem[] {
  const items: FlatItem[] = [];
  for (const row of rows) {
    const pct =
      parentTotal > 0 ? Math.round((row.total / parentTotal) * 100) : 0;
    items.push({
      type: 'sub',
      key: `${keyPrefix}_${row.key}`,
      label: row.key,
      total: row.total,
      progress: pct,
      depth,
    });
    if (row.children.length > 0) {
      items.push(
        ...flattenBreakdownRows(
          row.children,
          row.total,
          depth + 1,
          `${keyPrefix}_${row.key}`,
        ),
      );
    }
  }
  return items;
}

interface Props {
  metric?: any;
  data: any;
  onClick?: (filters: any) => void;
  isTemplate?: boolean;
}

function SessionsByWithBreakdown(props: Props) {
  const { data = { values: [] } } = props;

  const flatList = React.useMemo(() => {
    const items: FlatItem[] = [];

    for (const row of data.values ?? []) {
      items.push({
        type: 'main',
        key: `main_${row.name}`,
        label: row.name,
        total: 0,
        progress: row.progress,
        depth: 0,
        icon: row.icon,
        displayName: row.displayName,
        sessionCount: row.sessionCount,
        mainProgress: row.progress,
      });
      const breakdownRows: BreakdownNode[] = row.breakdownRows ?? [];
      if (breakdownRows.length > 0) {
        // raw total from the overall row for percentage calculation
        const rawTotal =
          typeof row.sessionCount === 'string'
            ? parseInt(row.sessionCount.replace(/,/g, ''), 10)
            : (row.sessionCount ?? 0);
        items.push(
          ...flattenBreakdownRows(
            breakdownRows,
            rawTotal,
            1,
            `sub_${row.name}`,
          ),
        );
      }
    }
    return items;
  }, [data.values]);

  return (
    <div className="m-vlist">
      {flatList.map((item) => {
        if (item.type === 'main') {
          return (
            <div key={item.key} className="m-vlist__row is-main">
              {item.icon ? (
                <img className="m-vlist__icon" src={item.icon} alt="" />
              ) : null}
              <div className="m-vlist__body">
                <div className="m-vlist__line">
                  <span>{item.displayName}</span>
                  <span className="m-vlist__n">{item.sessionCount}</span>
                </div>
                <span className="m-vlist__bar">
                  <i style={{ width: `${item.progress}%` }} />
                </span>
              </div>
            </div>
          );
        }
        return (
          <div
            key={item.key}
            className="m-vlist__row is-sub"
            style={{ paddingLeft: 48 + (item.depth - 1) * 16 }}
          >
            <div className="m-vlist__body">
              <div className="m-vlist__line">
                <span>{item.label}</span>
                <span className="m-vlist__n">
                  {numberWithCommas(item.total)}
                </span>
              </div>
              <span className="m-vlist__bar">
                <i style={{ width: `${item.progress}%` }} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default observer(SessionsByWithBreakdown);
