import { Input } from '@/ui/inputs/input';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import './dialogs.css';
import { Modal } from './modal';

export interface RenameDialogProps {
  open: boolean;

  title: string;
  value: string;
  okText?: string;
  placeholder?: string;
  onOk: (value: string) => void;
  onCancel: () => void;
}

export function RenameDialog({
  open,
  title,
  value,
  okText: okTextProp,
  placeholder,
  onOk,
  onCancel,
}: RenameDialogProps) {
  const { t } = useTranslation();
  const okText = okTextProp ?? t('Save');
  const [draft, setDraft] = useState(value);
  // reseed on opening only: a value refreshed while open keeps the typing
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(value);
  }
  const unchanged = !draft.trim() || draft.trim() === value;
  const commit = () => {
    if (!unchanged) onOk(draft.trim());
  };
  return (
    <Modal
      width={440}
      title={title}
      open={open}
      onCancel={onCancel}
      okText={okText}
      okDisabled={unchanged}
      onOk={commit}
    >
      <Input
        autoFocus
        value={draft}
        placeholder={placeholder}
        aria-label={t('New name')}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        maxLength={80}
      />
    </Modal>
  );
}
