import { Input, Modal } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [value, setValue] = React.useState(initial);
  // re-seed from `initial` on open — adjusting state during render (not an effect)
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
      title={t('Rename issue')}
      open={open}
      onCancel={onCancel}
      onOk={save}
      okText={t('Save')}
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
