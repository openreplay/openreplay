import { Button, Tooltip } from 'antd';
import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export type CritState = 'none' | 'project' | 'mine';

/* Three-state critical triangle used in the issue-list row and the player.
   Red outline icon = project criticality; the red chip = "mine". Clicking only
   cycles my personal layer (Mehdi 07-07): gray→mine, project→adopt as mine,
   mine→step back — always silent. Removing the project-wide flag (with a
   teaching reason) lives on the detail page / list ellipsis, not here. */
export default function CriticalToggle({
  state,
  onMark,
  onRemoveMine,
  stopPropagation,
}: {
  state: CritState;
  onMark: () => void;
  onRemoveMine: () => void;
  stopPropagation?: boolean;
}) {
  const { t } = useTranslation();
  const tip =
    state === 'mine'
      ? t('Remove from my criticals')
      : state === 'project'
        ? t('Add to my criticals')
        : t('Mark critical for me');

  return (
    <Tooltip title={tip}>
      <Button
        type="text"
        size="small"
        aria-label={tip}
        aria-pressed={state !== 'none'}
        className={`flex items-center justify-center shrink-0 ${
          state === 'mine'
            ? 'bg-[rgba(204,0,0,0.09)] hover:!bg-[rgba(204,0,0,0.15)]'
            : 'hover:!bg-[rgba(204,0,0,0.06)]'
        }`}
        icon={
          <AlertTriangle
            size={15}
            strokeWidth={2}
            style={{
              color:
                state === 'none'
                  ? 'var(--color-gray-medium)'
                  : 'var(--color-red)',
              fill: 'none',
            }}
          />
        }
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          if (state === 'mine') onRemoveMine();
          else onMark();
        }}
      />
    </Tooltip>
  );
}
