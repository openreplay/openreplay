import { Input } from '@/ui/inputs/input';
import '@/ui/overlays/dialogs.css';
import { Modal } from '@/ui/overlays/modal';
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
      width={440}
      title={t('Rename issue')}
      open={open}
      onCancel={onCancel}
      onOk={save}
      okText={t('Save')}
      okDisabled={!value.trim()}
    >
      <p className="m-dlg__lede">
        {t(
          'The agent wrote this title. Yours replaces it everywhere, for everyone.',
        )}
      </p>
      <Input
        autoFocus
        value={value}
        maxLength={120}
        aria-label={t('Issue title')}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
    </Modal>
  );
}
