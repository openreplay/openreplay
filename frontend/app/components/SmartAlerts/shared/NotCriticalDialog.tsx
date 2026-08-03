import { Input, Modal } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import ReasonChip from './ReasonChip';
import { CRITICAL_REASONS, humanizeReason } from './model';

/* THE "not critical for me" dialog — one component for the list + detail, which
   both offer the action from their own menu/button. Deliberately NOT part of
   CriticalDialog (a dialog does one job, Gabriel 07-31). Per-user: it suppresses
   the flag for me and the reason teaches the agent — a teammate's view is
   untouched. */
export default function NotCriticalDialog({
  issue,
  reasons: options = CRITICAL_REASONS,
  onClose,
}: {
  /** null closes it */
  issue: { id: string; head: string } | null;
  /** server reason vocabulary; falls back to the built-in list */
  reasons?: string[];
  onClose: () => void;
}) {
  const { issuesStore } = useStore();
  const { t } = useTranslation();
  const [reasons, setReasons] = React.useState<string[]>([]);
  const [note, setNote] = React.useState('');

  // reset on open — adjusting state during render (not an effect)
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
      title={t('Not critical for you?')}
      open={issue != null}
      onCancel={onClose}
      onOk={() => {
        if (issue)
          issuesStore.setNotCriticalForMe(
            issue.id,
            [...reasons, note.trim()].filter(Boolean).join(' · '),
          );
        onClose();
      }}
      okText={t('Not critical for me')}
      okButtonProps={{ danger: true }}
    >
      <p className="mb-3 color-gray-dark">
        {t(
          '“{{head}}” stops showing as critical for you. Teammates keep their own view, and your reason helps the agent learn.',
          { head: issue?.head },
        )}
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
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
      <Input.TextArea
        rows={3}
        placeholder={t('Add a note (optional)…')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </Modal>
  );
}
