import { Button, Popover, Tooltip } from 'antd';
import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import CriticalReasonPanel from './CriticalReasonPanel';

/* The AlertTriangle icon toggle used in the issue-list row and the player
   header. Marking critical is instant; un-marking opens the reason popover. A
   subtle red backdrop marks the active state. */
export default function CriticalToggle({
  critical,
  onSet,
  reasons,
  stopPropagation,
  zIndex,
}: {
  critical: boolean;
  onSet: (val: boolean, reasons?: string[], note?: string) => void;
  /** reason vocabulary for the un-mark popover (server-provided) */
  reasons?: string[];
  stopPropagation?: boolean;
  zIndex?: number;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const btn = (
    <Tooltip
      title={critical ? t('Critical — click to remove') : t('Mark as critical')}
    >
      <Button
        type="text"
        size="small"
        aria-pressed={critical}
        aria-label={
          critical ? t('Remove critical flag') : t('Mark as critical')
        }
        className={`flex items-center justify-center shrink-0 ${
          critical
            ? 'bg-[rgba(204,0,0,0.09)] hover:!bg-[rgba(204,0,0,0.15)]'
            : ''
        }`}
        icon={
          <AlertTriangle
            size={15}
            strokeWidth={2}
            style={{
              color: critical ? 'var(--color-red)' : 'var(--color-gray-medium)',
              fill: 'none',
            }}
          />
        }
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          if (critical) setOpen(true);
          else onSet(true);
        }}
      />
    </Tooltip>
  );

  if (!critical) return btn;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      zIndex={zIndex}
      content={
        <CriticalReasonPanel
          reasons={reasons}
          onCancel={() => setOpen(false)}
          onConfirm={(rs, note) => {
            onSet(false, rs, note);
            setOpen(false);
          }}
        />
      }
    >
      {btn}
    </Popover>
  );
}
