import { Textarea } from '@/ui/inputs/textarea';
import '@/ui/overlays/dialogs.css';
import { Modal } from '@/ui/overlays/modal';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import ReasonChip from './ReasonChip';
import { CRITICAL_REASONS, humanizeReason } from './model';

/* Per-user "not critical for me" (list + detail); teammates keep their view. */
export default function NotCriticalDialog({
  issue,
  reasons: options = CRITICAL_REASONS,
  onClose,
}: {
  issue: { id: string; head: string } | null;
  reasons?: string[];
  onClose: () => void;
}) {
  const { issuesStore } = useStore();
  const { t } = useTranslation();
  const [reasons, setReasons] = React.useState<string[]>([]);
  const [note, setNote] = React.useState('');
  const isOpen = issue != null;
  const [wasOpen, setWasOpen] = React.useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setReasons([]);
      setNote('');
    }
  }

  return (
    <Modal
      width={440}
      title={t('Not critical for you?')}
      open={isOpen}
      onCancel={onClose}
      onOk={() => {
        if (issue) issuesStore.setNotCriticalForMe(issue.id, reasons, note);
        onClose();
      }}
      okText={t('Not critical for me')}
      okVariant="danger"
    >
      <p className="m-dlg__lede">
        <span className="m-dlg__subject">{issue?.head}</span>{' '}
        {t(
          'stops showing as critical for you. Teammates keep their own view, and your reason helps the agent learn.',
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
        placeholder={t('Anything else worth knowing (optional)')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </Modal>
  );
}
