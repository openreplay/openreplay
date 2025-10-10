import React from 'react';
import { Modal, Button, Input, Checkbox, message } from 'antd';
import { Trash2, Users } from 'lucide-react';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

interface Props {
  show: boolean;
  closeHandler: () => void;
  rename?: boolean;
}

function SaveSearchModal({ show, closeHandler, rename = false }: Props) {
  const { t } = useTranslation();
  const { searchStore, userStore } = useStore();
  const userId = userStore.account.id;
  const { savedSearch } = searchStore;
  const loading = searchStore.isSaving;

  const onNameChange = ({ target: { value } }: any) => {
    searchStore.editSavedSearch({ name: value });
  };

  const onSave = () => {
    searchStore
      .save(savedSearch.exists() ? savedSearch.searchId : null, rename)
      .then(() => {
        message.success(
          `${savedSearch.exists() ? t('Updated') : t('Saved')} ${t('Successfully')}`,
        );
        closeHandler();
      })
      .catch((e) => {
        console.error(e);
        message.error(t('Something went wrong, please try again'));
      });
  };

  const onDelete = () => {
    Modal.confirm({
      title: t('Confirm'),
      content: t('Are you sure you want to permanently delete this Saved search?'),
      okText: t('Yes, delete'),
      cancelText: t('Cancel'),
      okButtonProps: { danger: true },
      onOk: () => {
        searchStore.removeSavedSearch(savedSearch.searchId!).then(() => {
          closeHandler();
        });
      },
    });
  };

  return (
    <Modal
      title={savedSearch.exists() ? t('Update Search') : t('Save Search')}
      open={show}
      onCancel={closeHandler}
      width={480}
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="primary"
              onClick={onSave}
              loading={loading}
              disabled={!savedSearch.name || savedSearch.name.trim() === ''}
            >
              {savedSearch.exists() ? t('Update') : t('Save')}
            </Button>
            <Button onClick={closeHandler}>{t('Cancel')}</Button>
          </div>
          {savedSearch.exists() && (
            <Button
              type="text"
              danger
              icon={<Trash2 size={18} />}
              onClick={onDelete}
            />
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('Title:')}</label>
          <Input
            autoFocus
            name="name"
            value={savedSearch.name}
            onChange={onNameChange}
            placeholder={t('Title')}
            size="large"
          />
        </div>

        <div
          className={cn('flex items-center gap-2', {
            'opacity-50 pointer-events-none': savedSearch.exists() && savedSearch.userId !== userId,
          })}
        >
          <Checkbox
            checked={savedSearch.isPublic}
            onChange={(e) => searchStore.editSavedSearch({ isPublic: e.target.checked })}
          />
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => searchStore.editSavedSearch({ isPublic: !savedSearch.isPublic })}
          >
            <Users size={16} className="text-gray-600" />
            <span>{t('Team Visible')}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default observer(SaveSearchModal);
