import { Tooltip } from 'antd';
import cn from 'classnames';
import React from 'react';

interface Props {
  i: number;
  tab: string;
  currentTab: string;
  changeTab?: (tab: string) => void;
  isLive?: boolean;
  isClosed?: boolean;
  name?: string;
}

function Tab({ i, tab, currentTab, changeTab, isLive, isClosed, name }: Props) {
  return (
    <div
      key={tab}
      style={{
        marginBottom: '-2px',
      }}
      onClick={() => changeTab?.(tab)}
      className={cn(
        'self-end py-1 px-4 text-sm',
        changeTab && !isLive ? 'cursor-pointer' : 'cursor-default',
        currentTab === tab
          ? 'border-gray-lighter border-t border-l border-r !border-b-white bg-white rounded-tl rounded-tr font-semibold'
          : 'cursor-pointer border-gray-lighter !border-b !border-t-transparent !border-l-transparent !border-r-transparent',
      )}
    >
      <Tooltip title={name && name.length > 20 ? name : ''}>
        <div className="flex items-center gap-2">
          <div className="bg-gray-light rounded-full min-w-5 min-h-5 w-5 h-5 flex items-center justify-center text-xs">
            <div>{i + 1}</div>
          </div>
          <div
            className={cn('whitespace-nowrap', isClosed ? 'line-through' : '')}
            style={{
              maxWidth: 114,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name || `Tab ${i + 1}`}
          </div>
        </div>
      </Tooltip>
    </div>
  );
}

export default Tab;
