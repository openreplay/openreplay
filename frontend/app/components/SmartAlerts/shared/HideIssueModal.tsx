import { Textarea } from '@/ui/inputs/textarea';
import '@/ui/overlays/dialogs.css';
import { Modal } from '@/ui/overlays/modal';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ReasonChip from './ReasonChip';
import { HIDE_REASONS, humanizeReason } from './model';

/* Hide-with-reason (list + detail); reasons come from the server when loaded. */
export default function HideIssueModal({
  open,
  head,
  reasons: options = HIDE_REASONS,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  head?: string;
  reasons?: string[];
  onCancel: () => void;
  onConfirm: (reasons: string[], note: string) => void;
}) {
  const { t } = useTranslation();
  const [note, setNote] = React.useState('');
  const [reasons, setReasons] = React.useState<string[]>([]);
  const reset = () => {
    setNote('');
    setReasons([]);
  };

  return (
    <Modal
      width={440}
      title={t('Hide this issue?')}
      open={open}
      onCancel={() => {
        reset();
        onCancel();
      }}
      onOk={() => {
        onConfirm(reasons, note.trim());
        reset();
      }}
      okText={t('Hide issue')}
    >
      <p className="m-dlg__lede">
        <span className="m-dlg__subject">{head}</span>{' '}
        {t(
          'leaves the list. Telling the agent why is what stops it finding this again.',
        )}
      </p>
      <div className="m-dlg__chips">
        {options.map((r) => (
          <ReasonChip
            key={r}
            label={t(humanizeReason(r))}
            checked={reasons.includes(r)}
            onChange={(on) =>
              setReasons((prev) =>
                on ? [...prev, r] : prev.filter((x) => x !== r),
              )
            }
          />
        ))}
      </div>
      <Textarea
        rows={3}
        maxLength={280}
        placeholder={t('Anything else worth knowing (optional)')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </Modal>
  );
}
