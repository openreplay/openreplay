import React from 'react';
import cn from 'classnames';
import { typeToNameMap } from './sunburstUtils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Tabs } from 'antd';

const MODE = {
  CLOSED: 'CLOSED',
  DROP: 'DROP',
  LEGEND: 'LEGEND',
} as const;

function DroppedSessionsList({
  colorMap,
  onHover,
  dropsByUrl,
  onLeave,
  legend,
}: {
  colorMap: Map<string, string>;
  onHover: (dataIndex: any[]) => void;
  dropsByUrl: Record<string, { drop: number; ids: any[] }> | null;
  onLeave: () => void;
  legend: Record<string, { color: string; ids: any[] }>;
}) {
  if (!dropsByUrl) return null;
  const totalDropSessions = Object.values(dropsByUrl).reduce(
    (sum, { drop }) => sum + drop,
    0,
  );

  const sortedDrops = Object.entries(dropsByUrl)
    .map(([url, { drop, ids }]) => ({
      url,
      drop,
      ids,
      percentage: Math.round((drop / totalDropSessions) * 100),
    }))
    .sort((a, b) => b.drop - a.drop);

  // DROP and OTHER are last
  const legendList = Object.keys(legend).sort((a, b) => {
    if (a === typeToNameMap.DROP) return 1;
    if (b === typeToNameMap.DROP) return -1;
    if (a === typeToNameMap.OTHER) return 1;
    if (b === typeToNameMap.OTHER) return -1;
  });

  const items = [
    {
      key: '1',
      label: 'Drop by Page',
      children: (
        <div className={cn('space-y-1.5 max-h-[500px] overflow-y-auto')}>
          {sortedDrops.length > 0 ? (
            sortedDrops.map((item, index) => (
              <div
                key={index}
                className="py-1.5 px-2 hover:bg-gray-lightest rounded transition-colors flex justify-between gap-2 relative"
                onMouseEnter={() => onHover(item.ids)}
                onMouseLeave={() => onLeave()}
              >
                <ColoredBar color={colorMap.get(item.url)} />
                <span className="truncate flex-1 ml-1">{item.url}</span>
                <span className="ml-2"> {item.drop}</span>
                <span className="text-gray-400">({item.percentage}%)</span>
              </div>
            ))
          ) : (
            <div>No drops found.</div>
          )}
        </div>
      ),
    },
    {
      key: '2',
      label: 'Legend',
      children: (
        <div className={cn('space-y-1.5 max-h-[500px] overflow-y-auto')}>
          {legendList.length > 0
            ? legendList.map((item) => (
                <div
                  key={item}
                  className="py-1.5 px-2 hover:bg-gray-lightest rounded transition-colors relative"
                  onMouseEnter={() => onHover(legend[item].ids)}
                  onMouseLeave={() => onLeave()}
                >
                  <ColoredBar color={legend[item].color} />
                  <span className="truncate ml-1">{item}</span>
                </div>
              ))
            : null}
        </div>
      ),
    },
  ];
  return (
    <div className="bg-white rounded-lg border shadow p-4 w-[260px] absolute top-0 bottom-0 my-4 right-4">
      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
}

function ColoredBar({ color }: { color?: string }) {
  return (
    <div
      style={{
        background: color ?? 'gray',
        width: 3,
        height: 32,
        position: 'absolute',
        top: 0,
        borderRadius: 3,
        left: 0,
      }}
    />
  );
}

function CardTitle({
  title,
  isOpen,
  onClick,
}: {
  title: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 cursor-pointer mb-2"
      onClick={onClick}
    >
      <h3 className="text-lg font-medium">{title}</h3>
      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </div>
  );
}

export default DroppedSessionsList;
