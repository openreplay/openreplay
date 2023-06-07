import React from 'react';
import cn from 'classnames';

interface Props {
  i: number;
  tab: string;
  currentTab: string;
  changeTab?: (tab: string) => void;
}

function Tab({ i, tab, currentTab, changeTab }: Props) {
  return (
    <div
      key={tab}
      style={{ marginBottom: '-2px' }}
      onClick={() => changeTab?.(tab)}
      className={cn(
        'self-end py-1 px-4 cursor-pointer',
        currentTab === tab
          ? 'border-gray-light border-t border-l border-r !border-b-white bg-white rounded-tl rounded-tr font-semibold'
          : 'cursor-pointer border-gray-light !border-b !border-t-0 !border-l-0 !border-r-0'
      )}
    >
      Tab {i + 1}
    </div>
  );
}

export default Tab;
