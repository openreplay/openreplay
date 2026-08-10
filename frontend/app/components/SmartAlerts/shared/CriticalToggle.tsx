import { Button, Tooltip } from 'antd';
import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export type CritState = 'none' | 'team' | 'mine';

/* The critical triangle in the issue-list row and the player. Opens the
   CriticalDialog; state only drives the look: faint gray outline = none, red
   outline = team, red outline on a red-tinted bg = mine (never a solid fill). */
export default function CriticalToggle({
  state,
  onOpen,
  stopPropagation,
}: {
  state: CritState;
  onOpen: () => void;
  stopPropagation?: boolean;
}) {
  const { t } = useTranslation();
  const tip =
    state === 'mine'
      ? t('Critical for you')
      : state === 'team'
        ? t('Critical — see why')
        : t('Describe what’s critical');

  return (
    <Tooltip title={tip}>
      <Button
        type="text"
        size="small"
        aria-label={tip}
        aria-pressed={state !== 'none'}
        className={`flex items-center justify-center shrink-0 ${
          state === 'mine'
            ? '!bg-[rgba(204,0,0,0.09)] hover:!bg-[rgba(204,0,0,0.03)]'
            : 'hover:!bg-[rgba(204,0,0,0.06)]'
        }`}
        icon={
          <AlertTriangle
            size={15}
            strokeWidth={2}
            style={{
              // faint gray until critical; red outline once flagged — never a
              // solid fill (the red-tinted bg marks "mine")
              color:
                state === 'none'
                  ? 'var(--color-gray-light)'
                  : 'var(--color-red)',
              fill: 'none',
            }}
          />
        }
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          onOpen();
        }}
      />
    </Tooltip>
  );
}
