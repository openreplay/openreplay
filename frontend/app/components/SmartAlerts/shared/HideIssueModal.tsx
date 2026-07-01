import { Input, Modal } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ReasonChip from './ReasonChip';
import { HIDE_REASONS } from './model';

/* Shared hide-with-reason modal (issue list + detail). The reason teaches the
   agent why an issue was dismissed. The reason vocabulary comes from the server
   (GET …/reasons); we fall back to the built-in list until it loads. State is
   reset on close so each open is clean. */
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
  const cancel = () => {
    reset();
    onCancel();
  };
  const confirm = () => {
    onConfirm(reasons, note.trim());
    reset();
  };

  return (
    <Modal
      title={t('Hide this issue?')}
      open={open}
      onCancel={cancel}
      onOk={confirm}
      okText={t('Hide issue')}
    >
      <p className="mb-3 color-gray-dark">
        {t(
          '“{{head}}” will be removed from the list. Tell us why so the agent can learn.',
          { head },
        )}
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {options.map((r) => (
          <ReasonChip
            key={r}
            label={t(r)}
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
