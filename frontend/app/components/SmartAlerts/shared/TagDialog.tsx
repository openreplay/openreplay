import { Input, Modal } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

/* THE journey-tag dialog — creating (from the Tags filter) and editing (from
   Preferences > Agents) share it. App dialog grammar (Hide modal): no icon,
   default width, explanation in a gray body line. The description IS the
   matching rule; the caption sets expectations so a zero-match tag is never a
   surprise. It IS the intermediary layer (Gabriel/Mehdi 07-28): a small control
   never drops the user into a settings page — the tag is authored here. */
export default function TagDialog({
  open,
  initial,
  onCancel,
  onSave,
}: {
  open: boolean;
  /** editing an existing tag; omit when creating */
  initial?: { name: string; description: string } | null;
  onCancel: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  // seed from `initial` on open — adjusting state during render (React's
  // recommended alternative to an effect for prop-derived state)
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
      title={initial ? t('Edit journey tag') : t('New journey tag')}
      open={open}
      onCancel={onCancel}
      onOk={() => onSave(name.trim(), desc.trim())}
      okText={initial ? t('Save tag') : t('Create tag')}
      okButtonProps={{ disabled: !name.trim() || !desc.trim() }}
    >
      <p className="mb-3 color-gray-dark">
        {t(
          'Describe the journey in plain words. The agent reads every captured session and applies the tag automatically when it matches.',
        )}
      </p>
      <div className="flex flex-col gap-3">
        <Input
          autoFocus
          maxLength={40}
          placeholder={t('Name, e.g. Offer scheduling')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input.TextArea
          rows={3}
          maxLength={300}
          placeholder={t(
            'e.g. Any session where the user schedules or reschedules an offer, from the offers page or the email link.',
          )}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <span className="text-xs color-gray-medium">
          {t(
            'Applies to sessions captured from now on; existing sessions are not re-scanned.',
          )}
        </span>
      </div>
    </Modal>
  );
}
