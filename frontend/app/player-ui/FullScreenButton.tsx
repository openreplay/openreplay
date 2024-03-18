import { PlaySessionInFullscreenShortcut } from 'Components/Session_/Player/Controls/components/KeyboardHelp';
import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import { Popover } from 'antd';

interface IProps {
  size: number;
  onClick: () => void;
  customClasses: string;
}
export function FullScreenButton({ size = 18, onClick, customClasses }: IProps) {

  return (
    <Popover
      content={
        <div className={'flex gap-2 items-center'}>
          <PlaySessionInFullscreenShortcut />
          <div>Play In Fullscreen</div>
        </div>
      }
      placement={"topRight"}
    >
      <div
        onClick={onClick}
        className={cn('py-1 px-2 hover-main cursor-pointer bg-gray-lightest', customClasses)}
      >
        <Icon name="arrows-angle-extend" size={size} color="inherit" />
      </div>
    </Popover>
  );
}
