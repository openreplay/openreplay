import React from 'react'
import type { Data } from '../SankeyChart'

function DroppedSessionsList({ data, colorMap }: { data: Data, colorMap: Map<string, string> }) {
  const dropsByUrl: Record<string, number> = {};

  data.links.forEach(link => {
    const targetNode = data.nodes.find(node => node.id === link.target)
    const sourceNode = data.nodes.find(node => node.id === link.source)
    if (!targetNode || !sourceNode) return;

    const isDrop = targetNode.eventType === 'DROP'
    if (!isDrop) return;

    const sourceUrl = sourceNode.name;

    if (sourceUrl) {
      dropsByUrl[sourceUrl] = (dropsByUrl[sourceUrl] || 0) + link.sessionsCount;
    }
  });

  const totalDropSessions = Object.values(dropsByUrl).reduce((sum, count) => sum + count, 0);

  const sortedDrops = Object.entries(dropsByUrl)
    .map(([url, count]) => ({
      url,
      count,
      percentage: Math.round((count / totalDropSessions) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mt-6 bg-white rounded-lg shadow p-4 max-w-md">
      <h3 className="text-lg font-medium mb-3">Droppe Sessions by Page</h3>
      <div className="space-y-1.5">
        {sortedDrops.length > 0 ? (
          sortedDrops.map((item, index) => (
            <div
              key={index}
              className="py-1.5 px-2 hover:bg-gray-50 rounded transition-colors flex justify-between gap-2 relative"
            >
              <div style={{ background: colorMap.get(item.url), width: 2, height: 32, position: 'absolute', top: 0, left: -3, borderRadius: 3, }} />
              <span className="truncate flex-1">{item.url}</span>
              <span className="ml-2"> {item.count}</span>
              <span className="text-gray-400">({item.percentage}%)</span>
            </div>
          ))
        ) : (
          <div className="text-gray-500 py-2">No drop sessions found</div>
        )}
      </div>
    </div>
  );
};

export default DroppedSessionsList;
