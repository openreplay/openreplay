import { Field } from '@/ui/inputs/Field';
import { Input } from '@/ui/inputs/input';
import { Textarea } from '@/ui/inputs/textarea';
import '@/ui/overlays/dialogs.css';
import { Modal } from '@/ui/overlays/modal';
import React from 'react';
import { useTranslation } from 'react-i18next';

/* Create or edit a journey tag; the description is the rule the agent applies. */
export default function TagDialog({
  open,
  initial,
  onCancel,
  onSave,
}: {
  open: boolean;
  initial?: { name: string; description: string } | null;
  onCancel: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(initial?.name ?? '');
      setDesc(initial?.description ?? '');
    }
  }

  return (
    <Modal
      width={480}
      title={initial ? t('Edit journey tag') : t('New journey tag')}
      open={open}
      onCancel={onCancel}
      onOk={() => onSave(name.trim(), desc.trim())}
      okText={initial ? t('Save tag') : t('Create tag')}
      okDisabled={!name.trim() || !desc.trim()}
    >
      <p className="m-dlg__lede">
        {t(
          'Describe the journey in plain words. The agent reads every captured session and applies the tag when it matches.',
        )}
      </p>
      <div className="flex flex-col gap-5">
        <Field label={t('Name')}>
          <Input
            autoFocus
            maxLength={40}
            placeholder={t('e.g. Offer scheduling')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field
          label={t('Description')}
          note={t(
            'Applies to sessions captured from now on; existing sessions are not re-scanned.',
          )}
        >
          <Textarea
            rows={3}
            maxLength={300}
            placeholder={t(
              'e.g. Any session where the user schedules or reschedules an offer, from the offers page or the email link.',
            )}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
