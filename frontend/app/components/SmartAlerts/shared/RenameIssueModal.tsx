import { Input, Modal } from 'antd';
import React from 'react';

export default function RenameIssueModal({
  open,
  initial,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  initial: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}) {
  const [value, setValue] = React.useState(initial);
  // Re-seed from `initial` when the modal opens — adjusting state during render
  // (React's recommended alternative to an effect for prop-derived state).
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setValue(initial);
  }

  const save = () => {
    const v = value.trim();
    if (v) onConfirm(v);
  };

  return (
    <Modal
      title="Rename issue"
      open={open}
      onCancel={onCancel}
      onOk={save}
      okText="Save"
    >
      <Input
        autoFocus
        value={value}
        maxLength={120}
        onChange={(e) => setValue(e.target.value)}
        onPressEnter={save}
      />
    </Modal>
  );
}
