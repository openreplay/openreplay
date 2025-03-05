import React from 'react';
import { Popover, Button } from 'antd';
import { FullscreenOutlined } from '@ant-design/icons';
import { PlaySessionInFullscreenShortcut } from 'Components/Session_/Player/Controls/components/KeyboardHelp';
import { useTranslation } from 'react-i18next';

interface IProps {
  size: number;
  onClick: () => void;
  customClasses?: string;
  noShortcut?: boolean;
}

export function FullScreenButton({ size = 18, onClick, noShortcut }: IProps) {
  const { t } = useTranslation();

  return (
    <Popover
      content={
        <div className="flex gap-2 items-center">
          {!noShortcut ? <PlaySessionInFullscreenShortcut /> : null}
          <div>{t('Play In Fullscreen')}</div>
        </div>
      }
      placement="topRight"
    >
      <Button
        onClick={onClick}
        shape="circle"
        size="small"
        className="flex items-center justify-center"
        icon={<FullscreenOutlined />}
      />
    </Popover>
  );
}
