import React from 'react';
import { connect } from 'react-redux';
import { Button, Modal, Form, Icon, Checkbox, Input } from 'UI';
import { confirm } from 'UI';
import stl from './SaveSearchModal.module.css';
import cn from 'classnames';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore';

interface Props {
    filter: any;
    loading: boolean;
    show: boolean;
    closeHandler: () => void;
    savedSearch: any;
    userId: number;
    rename: boolean;
}
function SaveSearchModal(props: Props) {
    const { savedSearch, loading, show, closeHandler, rename = false } = props;
    const { searchStore } = useStore();

    const onNameChange = ({ target: { value } }: any) => {
      searchStore.edit({ name: value });
    };

    const onSave = () => {
        const { closeHandler } = props;

      searchStore.save(savedSearch.exists() ? savedSearch.searchId : null, rename)
            .then(() => {
                toast.success(`${savedSearch.exists() ? 'Updated' : 'Saved'} Successfully`);
                closeHandler();
            })
            .catch((e) => {
                toast.error('Something went wrong, please try again');
            });
    };

    const onDelete = async () => {
        if (
            await confirm({
                header: 'Confirm',
                confirmButton: 'Yes, delete',
                confirmation: `Are you sure you want to permanently delete this Saved search?`,
            })
        ) {
          searchStore.remove(savedSearch.searchId).then(() => {
                closeHandler();
            });
        }
    };

    const onChangeOption = ({ target: { checked, name } }: any) => searchStore.edit({ [name]: checked });

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
                        <div className={cn('flex items-center', { disabled: savedSearch.exists() && savedSearch.userId !== props.userId })}>
                            <Checkbox
                                name="isPublic"
                                className="font-medium mr-3"
                                type="checkbox"
                                checked={savedSearch.isPublic}
                                onClick={onChangeOption}
                            />
                            <div
                                className="flex items-center cursor-pointer select-none"
                                onClick={() => searchStore.edit({ isPublic: !savedSearch.isPublic })}
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
                    <Button variant="primary" onClick={onSave} loading={loading} disabled={!savedSearch.validate()} className="mr-2">
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

export default connect(
    (state: any) => ({
        userId: state.getIn(['user', 'account', 'id']),
        savedSearch: state.getIn(['search', 'savedSearch']),
        filter: state.getIn(['search', 'instance']),
        loading: state.getIn(['search', 'saveRequest', 'loading']) || state.getIn(['search', 'updateRequest', 'loading']),
    }),
)(SaveSearchModal);
