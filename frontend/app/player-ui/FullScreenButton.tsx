import React from 'react';
import { Popover, Button } from 'antd';
import { FullscreenOutlined } from '@ant-design/icons';
import { PlaySessionInFullscreenShortcut } from 'Components/Session_/Player/Controls/components/KeyboardHelp';

interface IProps {
  size: number;
  onClick: () => void;
  customClasses: string;
}

export function FullScreenButton({ size = 18, onClick }: IProps) {
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
      <Button
        onClick={onClick}
        shape="circle"
        size={'small'}
        className={'flex items-center justify-center'}
        icon={<FullscreenOutlined />}
      />
    </Popover>
  );
}
