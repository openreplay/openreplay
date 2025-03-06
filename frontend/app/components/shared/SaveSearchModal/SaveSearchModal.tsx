import React from 'react';
import { confirm, Modal, Form, Icon, Checkbox, Input } from 'UI';
import { Button } from 'antd';
import cn from 'classnames';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import stl from './SaveSearchModal.module.css';
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
        toast.success(
          `${savedSearch.exists() ? t('Updated') : t('Saved')} ${t('Successfully')}`,
        );
        closeHandler();
      })
      .catch((e) => {
        console.error(e);
        toast.error(t('Something went wrong, please try again'));
      });
  };

  const onDelete = async () => {
    if (
      await confirm({
        header: t('Confirm'),
        confirmButton: t('Yes, delete'),
        confirmation: t(
          'Are you sure you want to permanently delete this Saved search?',
        ),
      })
    ) {
      searchStore.removeSavedSearch(savedSearch.searchId!).then(() => {
        closeHandler();
      });
    }
  };

  const onChangeOption = ({ target: { checked, name } }: any) =>
    searchStore.editSavedSearch({ [name]: checked });

  return (
    <Modal size="small" open={show} onClose={closeHandler}>
      <Modal.Header className={stl.modalHeader}>
        <div>{t('Save Search')}</div>
        <Icon
          role="button"
          tabIndex="-1"
          color="gray-dark"
          size="18"
          name="close"
          onClick={closeHandler}
        />
      </Modal.Header>

      <Modal.Content>
        <Form onSubmit={onSave}>
          <Form.Field>
            <label>{t('Title:')}</label>
            <Input
              autoFocus
              // className={ stl.name }
              name="name"
              value={savedSearch.name}
              onChange={onNameChange}
              placeholder={t('Title')}
            />
          </Form.Field>

          <Form.Field>
            <div
              className={cn('flex items-center', {
                disabled: savedSearch.exists() && savedSearch.userId !== userId,
              })}
            >
              <Checkbox
                name="isPublic"
                type="checkbox"
                checked={savedSearch.isPublic}
                onClick={onChangeOption}
              />
              <div
                className="flex items-center cursor-pointer select-none ml-2"
                onClick={() => searchStore.editSavedSearch({ isPublic: !savedSearch.isPublic })}
              >
                <Icon name="user-friends" size="16" />
                <span className="ml-2">{t('Team Visible')}</span>
              </div>
            </div>
          </Form.Field>
        </Form>
        {/* {savedSearch.exists() && <div className="mt-4">Changes in filters will be updated.</div>} */}
      </Modal.Content>
      <Modal.Footer className="flex items-center px-6">
        <div className="mr-auto flex items-center">
          <Button
            type="primary"
            onClick={onSave}
            loading={loading}
            disabled={!savedSearch.validate()}
            className="mr-2"
          >
            {savedSearch.exists() ? t('Update') : t('Save')}
          </Button>
          <Button onClick={closeHandler}>{t('Cancel')}</Button>
        </div>
        {savedSearch.exists() && (
          <Button type="text" onClick={onDelete}>
            <Icon name="trash" size="18" />
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default observer(SaveSearchModal);
