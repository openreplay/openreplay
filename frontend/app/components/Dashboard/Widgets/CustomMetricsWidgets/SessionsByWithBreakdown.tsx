import { Avatar, Progress, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { numberWithCommas } from 'App/utils';

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
    const pct = parentTotal > 0 ? Math.round((row.total / parentTotal) * 100) : 0;
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
            : row.sessionCount ?? 0;
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
    <div>
      {flatList.map((item) => {
        if (item.type === 'main') {
          return (
            <div
              key={item.key}
              className="rounded-lg hover:bg-active-blue cursor-pointer"
              style={{ padding: '4px 10px' }}
            >
              <div className="flex items-center gap-2">
                <Avatar src={item.icon} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <Typography.Text ellipsis className="w-[90%]!">
                      {item.displayName}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      {item.sessionCount}
                    </Typography.Text>
                  </div>
                  <Progress
                    percent={item.progress}
                    showInfo={false}
                    strokeColor={{ '0%': '#394EFF', '100%': '#394EFF' }}
                    size={['small', 2]}
                    style={{ padding: 0, margin: 0, height: 4 }}
                  />
                </div>
              </div>
            </div>
          );
        }

        const indent = 42 + (item.depth - 1) * 16;
        return (
          <div
            key={item.key}
            style={{ paddingLeft: indent, paddingRight: 10, paddingTop: 2, paddingBottom: 2 }}
          >
            <div className="flex justify-between text-sm text-disabled-text">
              <span>{item.label}</span>
              <span>{numberWithCommas(item.total)}</span>
            </div>
            <Progress
              percent={item.progress}
              showInfo={false}
              strokeColor={{ '0%': '#394EFF', '100%': '#394EFF' }}
              size={['small', 2]}
              style={{ padding: 0, margin: 0, height: 3 }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default observer(SessionsByWithBreakdown);
