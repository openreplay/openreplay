import { Button } from '@/ui/actions/button';
import { useTranslation } from 'react-i18next';

import './dialogs.css';
import { Modal } from './modal';

export interface UnsavedChangesDialogProps {
  open: boolean;
  /** what the edits belong to, named in the sentence */
  subject?: string;
  onDiscard: () => void;
  /** given, saving before leaving is the primary and Discard steps down */
  onSave?: () => void;
  onCancel: () => void;
}

/** Leaving with edits not saved; the browser's own prompt only on tab close. */
export function UnsavedChangesDialog({
  open,
  subject,
  onDiscard,
  onSave,
  onCancel,
}: UnsavedChangesDialogProps) {
  const { t } = useTranslation();
  return (
    <Modal
      title={onSave ? t('Save your changes?') : t('Discard your changes?')}
      open={open}
      onCancel={onCancel}
      width={440}
      footer={
        <>
          <Button onClick={onCancel}>{t('Cancel')}</Button>
          {onSave ? (
            <>
              <Button onClick={onDiscard}>{t('Discard changes')}</Button>
              <Button variant="primary" onClick={onSave}>
                {t('Save changes')}
              </Button>
            </>
          ) : (
            <Button variant="danger" onClick={onDiscard}>
              {t('Discard changes')}
            </Button>
          )}
        </>
      }
    >
      <p className="m-dlg__lede">
        {subject
          ? t(
              'Your edits to {{subject}} are not saved. Leaving without saving drops them.',
              { subject },
            )
          : t('Your edits are not saved. Leaving without saving drops them.')}
      </p>
    </Modal>
  );
}
