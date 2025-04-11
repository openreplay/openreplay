import React from 'react';
import cn from 'classnames';
import { Segmented } from 'antd';
import { Icon } from 'UI';
import stl from './tabs.module.css';

interface Props {
  tabs: Array<any>;
  active: string;
  onClick: (key: any) => void;
  border?: boolean;
  className?: string;
}

const iconMap = {
  INSPECTOR: 'filters/tag-element',
  CLICKMAP: 'mouse-pointer-click',
  EVENTS: 'user-switch',
} as const;

function Tabs({ tabs, active, onClick, border = true, className }: Props) {
  return (
    <div
      className={cn(stl.tabs, className, { [stl.bordered]: border })}
      role="tablist"
    >
      <Segmented
        size="small"
        value={active}
        options={tabs.map(
          ({
            key,
            text,
            hidden = false,
            disabled = false,
            iconComp = null,
          }) => ({
            label: (
              <div
                onClick={() => {
                  onClick(key);
                }}
                className="font-medium flex gap-1 items-center hover:text-teal rounded-lg"
              >
                {iconComp || (
                  <Icon
                    size={14}
                    color="currentColor"
                    style={{ fill: 'currentColor', strokeWidth: '0' }}
                    name={iconMap[key as keyof typeof iconMap]}
                  />
                )}
                <span>{text}</span>
              </div>
            ),
            value: key,
            disabled,
          }),
        )}
      />
    </div>
  );
}

Tabs.displayName = 'Tabs';

export default Tabs;
