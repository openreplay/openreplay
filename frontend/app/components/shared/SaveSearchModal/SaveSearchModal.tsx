import React from 'react';
import { Button, Modal, Form, Icon, Checkbox, Input } from 'UI';
import { confirm } from 'UI';
import stl from './SaveSearchModal.module.css';
import cn from 'classnames';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

interface Props {
  show: boolean;
  closeHandler: () => void;
  rename?: boolean;
}

function SaveSearchModal({ show, closeHandler, rename = false }: Props) {
  const { searchStore, userStore } = useStore();
  const userId = userStore.account.id;
  const savedSearch = searchStore.savedSearch;
  const loading = searchStore.isSaving;

  const onNameChange = ({ target: { value } }: any) => {
    searchStore.editSavedSearch({ name: value });
  };

  const onSave = () => {
    searchStore.save(savedSearch.exists() ? savedSearch.searchId : null, rename)
      .then(() => {
        toast.success(`${savedSearch.exists() ? 'Updated' : 'Saved'} Successfully`);
        closeHandler();
      })
      .catch((e) => {
        console.error(e)
        toast.error('Something went wrong, please try again');
      });
  };

  const onDelete = async () => {
    if (
      await confirm({
        header: 'Confirm',
        confirmButton: 'Yes, delete',
        confirmation: `Are you sure you want to permanently delete this Saved search?`
      })
    ) {
      searchStore.removeSavedSearch(savedSearch.searchId!).then(() => {
        closeHandler();
      });
    }
  };

  const onChangeOption = ({ target: { checked, name } }: any) => searchStore.editSavedSearch({ [name]: checked });

  return (
    <Modal size="small" open={show} onClose={closeHandler}>
      <Modal.Header className={stl.modalHeader}>
        <div>{'Save Search'}</div>
        <Icon role="button" tabIndex="-1" color="gray-dark" size="18" name="close" onClick={closeHandler} />
      </Modal.Header>

      <Modal.Content>
        <Form onSubmit={onSave}>
          <Form.Field>
            <label>{'Title:'}</label>
            <Input
              autoFocus={true}
              // className={ stl.name }
              name="name"
              value={savedSearch.name}
              onChange={onNameChange}
              placeholder="Title"
            />
          </Form.Field>

          <Form.Field>
            <div
              className={cn('flex items-center', { disabled: savedSearch.exists() && savedSearch.userId !== userId })}>
              <Checkbox
                name="isPublic"
                className="font-medium mr-3"
                type="checkbox"
                checked={savedSearch.isPublic}
                onClick={onChangeOption}
              />
              <div
                className="flex items-center cursor-pointer select-none"
                onClick={() => searchStore.editSavedSearch({ isPublic: !savedSearch.isPublic })}
              >
                <Icon name="user-friends" size="16" />
                <span className="ml-2"> Team Visible</span>
              </div>
            </div>
          </Form.Field>
        </Form>
        {/* {savedSearch.exists() && <div className="mt-4">Changes in filters will be updated.</div>} */}
      </Modal.Content>
      <Modal.Footer className="flex items-center px-6">
        <div className="mr-auto flex items-center">
          <Button variant="primary" onClick={onSave} loading={loading} disabled={!savedSearch.validate()}
                  className="mr-2">
            {savedSearch.exists() ? 'Update' : 'Create'}
          </Button>
          <Button onClick={closeHandler}>{'Cancel'}</Button>
        </div>
        {savedSearch.exists() && (
          <Button variant="text" onClick={onDelete}>
            <Icon name="trash" size="18" />
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default observer(SaveSearchModal);
