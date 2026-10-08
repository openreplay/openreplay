import { Button } from '@/ui/actions/button';
import { Checkbox } from '@/ui/inputs/checkbox';
import { Input } from '@/ui/inputs/input';
import { confirm } from '@/ui/overlays/confirm';
import '@/ui/overlays/dialogs.css';
import { Modal } from '@/ui/overlays/modal';
import { useToast } from '@/ui/overlays/toast';
import cn from 'classnames';
import { Trash2, Users } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

interface Props {
  show: boolean;
  closeHandler: () => void;
  rename?: boolean;
}

function SaveSearchModal({ show, closeHandler, rename = false }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const { searchStore, userStore } = useStore();
  const userId = userStore.account.id;
  const { savedSearch } = searchStore;
  const loading = searchStore.isSaving;
  const existing = React.useRef(savedSearch.exists()).current;
  const onNameChange = ({ target: { value } }: any) => {
    searchStore.editSavedSearch({ name: value });
  };

  const onSave = () => {
    searchStore
      .save(existing ? savedSearch.searchId : null, rename)
      .then(() => {
        toast.success(
          `${existing ? t('Updated') : t('Saved')} ${t('Successfully')}`,
        );
        closeHandler();
      })
      .catch((e) => {
        console.error(e);
        toast.error(t('Something went wrong, please try again'));
      });
  };

  const onDelete = () => {
    void confirm({
      header: t('Delete this segment?'),
      confirmation: t(
        'Are you sure you want to permanently delete this Saved segment?',
      ),
      confirmButton: t('Yes, delete'),
      cancelButton: t('Cancel'),
      danger: true,
    }).then((ok: boolean) => {
      if (!ok) return;
      void searchStore.removeSavedSearch(savedSearch.searchId!).then(() => {
        closeHandler();
      });
    });
  };

  return (
    <Modal
      title={existing ? t('Update Segment') : t('Save Segment')}
      open={show}
      onCancel={closeHandler}
      width={480}
      footer={
        <div className="m-dlg__foot w-full">
          {existing && (
            <Button variant="danger-subtle" onClick={onDelete}>
              <Trash2 size={14} />
              {t('Delete')}
            </Button>
          )}
          <span className="ml-auto flex items-center gap-2">
            <Button variant="subtle" onClick={closeHandler}>
              {t('Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={onSave}
              loading={loading}
              disabled={!savedSearch.name || savedSearch.name.trim() === ''}
            >
              {existing ? t('Update') : t('Save')}
            </Button>
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="m-dfield">
          <span className="m-dfield__label">{t('Title')}</span>
          <Input
            autoFocus
            size="md"
            name="name"
            value={savedSearch.name}
            onChange={onNameChange}
            placeholder={t('Title')}
          />
        </label>

        <div
          className={cn('flex items-center gap-2', {
            'opacity-50 pointer-events-none':
              existing && savedSearch.userId !== userId,
          })}
        >
          <Checkbox
            checked={savedSearch.isPublic}
            onCheckedChange={(v) =>
              searchStore.editSavedSearch({ isPublic: v === true })
            }
            aria-label={t('Team Visible')}
          />
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() =>
              searchStore.editSavedSearch({ isPublic: !savedSearch.isPublic })
            }
          >
            <Users size={14} className="text-content-muted" />
            <span className="text-sm text-content-primary">
              {t('Team visible')}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default observer(SaveSearchModal);
