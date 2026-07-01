import { Button, Input } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ReasonChip from './ReasonChip';
import { CRITICAL_REASONS } from './model';

/* The "why is this not critical?" picker used inside the detail/player popovers.
   Un-marking critical is a teaching moment, so a reason is collected. The reason
   vocabulary comes from the server (GET …/reasons); we fall back to the built-in
   list until it loads. */
export default function CriticalReasonPanel({
  reasons: options = CRITICAL_REASONS,
  onCancel,
  onConfirm,
}: {
  reasons?: string[];
  onCancel: () => void;
  onConfirm: (reasons: string[], note: string) => void;
}) {
  const { t } = useTranslation();
  const [reasons, setReasons] = React.useState<string[]>([]);
  const [note, setNote] = React.useState('');
  return (
    <div className="flex flex-col gap-2" style={{ width: 264 }}>
      <span className="text-sm color-gray-dark">
        {t('Why is this not critical?')}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((r) => (
          <ReasonChip
            key={r}
            label={t(r)}
            checked={reasons.includes(r)}
            onChange={(on) =>
              setReasons((p) => (on ? [...p, r] : p.filter((x) => x !== r)))
            }
          />
        ))}
      </div>
      <Input.TextArea
        rows={2}
        placeholder={t('Add a note (optional)…')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button size="small" type="text" onClick={onCancel}>
          {t('Cancel')}
        </Button>
        <Button
          size="small"
          type="primary"
          danger
          onClick={() => onConfirm(reasons, note.trim())}
        >
          {t('Mark as not critical')}
        </Button>
      </div>
    </div>
  );
}
