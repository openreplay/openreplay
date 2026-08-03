import { Button, Tooltip } from 'antd';
import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export type CritState = 'none' | 'team' | 'mine';

/* The critical triangle used in the issue-list row and the player. Criticality
   is a described RULE now (§14): the triangle no longer flags the issue, it
   OPENS the CriticalDialog — the one place that explains which description
   matched and whose, lets you add your own, and holds the "not critical for me"
   step. State only drives the look: gray = none, red outline = a teammate's/
   agent's description, red fill = one of mine. */
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
              // red fill marks "mine"; outline for a teammate's/agent's
              fill: state === 'mine' ? 'var(--color-red)' : 'none',
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
