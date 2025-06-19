import React from 'react';
import cn from 'classnames';
import { typeToNameMap } from './sunburstUtils';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
  const [mode, setMode] = React.useState(MODE.DROP);

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

  const toggleMode = (section: keyof typeof MODE) => {
    setMode((prev) => (prev === section ? MODE.CLOSED : section));
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="bg-white rounded-lg border shadow p-4 h-fit min-w-[210px] w-1/3">
        <CardTitle
          title="Drop by Page"
          isOpen={mode === MODE.DROP}
          onClick={() => toggleMode(MODE.DROP)}
        />
        <div
          className={cn(
            'space-y-1.5 max-h-[240px] overflow-y-auto',
            mode !== MODE.DROP ? 'hidden' : '',
          )}
        >
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
      </div>

      <div className="bg-white rounded-lg border shadow p-4 h-fit min-w-[210px] w-1/3">
        <CardTitle
          title="Legend"
          isOpen={mode === MODE.LEGEND}
          onClick={() => toggleMode(MODE.LEGEND)}
        />
        <div
          className={cn(
            'space-y-1.5 max-h-[240px] overflow-y-auto',
            mode !== MODE.LEGEND ? 'hidden' : '',
          )}
        >
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
      </div>
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
