import { Input, Modal } from 'antd';
import React from 'react';

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
      title="Hide this issue?"
      open={open}
      onCancel={cancel}
      onOk={confirm}
      okText="Hide issue"
    >
      <p className="mb-3 color-gray-dark">
        “{head}” will be removed from the list. Tell us why so the agent can
        learn.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {HIDE_REASONS.map((t) => (
          <ReasonChip
            key={t}
            label={t}
            checked={tags.includes(t)}
            onChange={(on) =>
              setTags((prev) =>
                on ? [...prev, t] : prev.filter((x) => x !== t),
              )
            }
          />
        ))}
      </div>
      <Input.TextArea
        rows={3}
        placeholder="Add a note (optional)…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </Modal>
  );
}
