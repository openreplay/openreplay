import { Input, Modal } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ReasonChip from './ReasonChip';
import { HIDE_REASONS } from './model';

/* Shared hide-with-reason modal (issue list + detail). The reason teaches the
   agent why an issue was dismissed. State is reset on close so each open is
   clean. */
export default function HideIssueModal({
  open,
  head,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  head?: string;
  onCancel: () => void;
  onConfirm: (note: string, tags: string[]) => void;
}) {
  const { t } = useTranslation();
  const [note, setNote] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);

  const reset = () => {
    setNote('');
    setTags([]);
  };
  const cancel = () => {
    reset();
    onCancel();
  };
  const confirm = () => {
    onConfirm(note.trim(), tags);
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
        {HIDE_REASONS.map((r) => (
          <ReasonChip
            key={r}
            label={t(r)}
            checked={tags.includes(r)}
            onChange={(on) =>
              setTags((prev) =>
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
