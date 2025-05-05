import React from 'react';
import type { Data } from '../SankeyChart';

function DroppedSessionsList({
  colorMap,
  onHover,
  dropsByUrl,
  onLeave,
}: {
  colorMap: Map<string, string>;
  onHover: (dataIndex: any[]) => void;
  dropsByUrl: Record<string, { drop: number, ids: any[] }> | null;
  onLeave: () => void;
}) {
  console.log(colorMap, dropsByUrl)
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
  return (
    <div className="bg-white rounded-lg border shadow p-4 h-fit min-w-[210px] w-1/3">
      <h3 className="text-lg font-medium mb-3">Sessions Drop by Page</h3>
      <div className="space-y-1.5">
        {sortedDrops.length > 0 ? (
          sortedDrops.map((item, index) => (
            <div
              key={index}
              className="py-1.5 px-2 hover:bg-gray-50 rounded transition-colors flex justify-between gap-2 relative"
              onMouseEnter={() => onHover(item.ids)}
              onMouseLeave={() => onLeave()}
            >
              <div
                style={{
                  background: colorMap.get(item.url),
                  width: 2,
                  height: 32,
                  position: 'absolute',
                  top: 0,
                  left: -3,
                  borderRadius: 3,
                }}
              />
              <span className="truncate flex-1">{item.url}</span>
              <span className="ml-2"> {item.drop}</span>
              <span className="text-gray-400">({item.percentage}%)</span>
            </div>
          ))
        ) : (
          <div className="text-gray-500 py-2">No drop sessions found</div>
        )}
      </div>
    </div>
  );
}

export default DroppedSessionsList;
