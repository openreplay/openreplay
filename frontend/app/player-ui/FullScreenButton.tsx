import { IconButton } from '@/ui/actions/IconButton';
import { Tooltip } from '@/ui/overlays/tooltip';
import { Maximize } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlaySessionInFullscreenShortcut } from 'Components/Session_/Player/Controls/components/KeyboardHelp';

interface IProps {
  size: number;
  onClick: () => void;
  customClasses?: string;
  noShortcut?: boolean;
}

export function FullScreenButton({ size = 15, onClick, noShortcut }: IProps) {
  const { t } = useTranslation();
  return (
    <Tooltip
      title={
        <span className="flex gap-2 items-center">
          {!noShortcut ? <PlaySessionInFullscreenShortcut /> : null}
          {t('Play In Fullscreen')}
        </span>
      }
    >
      <span>
        <IconButton
          icon={<Maximize size={size} />}
          label={t('Play In Fullscreen')}
          variant="ghost"
          onClick={onClick}
        />
      </span>
    </Tooltip>
  );
}
