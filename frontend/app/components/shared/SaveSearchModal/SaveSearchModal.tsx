import React, { useState } from 'react';
import { connect } from 'react-redux';
import { edit, save, remove } from 'Duck/search';
import { Button, Modal, Form, Icon, Checkbox } from 'UI';
import { confirm } from 'UI/Confirmation';
import stl from './SaveSearchModal.css';

interface Props {
  filter: any;
  loading: boolean;
  edit: (filter: any) => void;
  save: (searchId, name, filter: any) => Promise<void>;
  show: boolean;
  closeHandler: () => void;
  savedSearch: any;
  remove: (filterId: number) => Promise<void>;
}
function SaveSearchModal(props: Props) {
  const [name, setName] = useState(props.savedSearch ? props.savedSearch.name : '');
  const { savedSearch, filter, loading, show, closeHandler } = props;
  
  const onNameChange = ({ target: { value } }) => {
    // props.edit({ name: value });
    setName(value);
  };

  const onSave = () => {
    const { filter, closeHandler } = props;
    if (name.trim() === '') return;
    props.save(savedSearch ? savedSearch.searchId : null, name, filter).then(function() {
      // this.props.fetchFunnelsList();
      closeHandler();
    });
  }

  const onDelete = async () => {
    if (await confirm({
      header: 'Confirm',
      confirmButton: 'Yes, Delete',
      confirmation: `Are you sure you want to permanently delete this alert?`
    })) {
      props.remove(savedSearch.searchId).then(() => {
        closeHandler();
      });
    }
  }
    

  return (
    <Modal size="tiny" open={ show }>
      <Modal.Header className={ stl.modalHeader }>
        <div>{ 'Save Search' }</div>
        <Icon 
          role="button"
          tabIndex="-1"
          color="gray-dark"
          size="18"
          name="close"
          onClick={ closeHandler }
        />
      </Modal.Header>

      <Modal.Content>
        <Form onSubmit={onSave}>
          <Form.Field>
            <label>{'Title:'}</label>
            <input
              autoFocus={ true }
              // className={ stl.name }
              name="name"
              value={ name }
              onChange={ onNameChange }
              placeholder="Title"
            />
          </Form.Field>
        </Form>
      </Modal.Content>
      <Modal.Actions className="flex items-center">
        <div className="mr-auto">
          <Button
              primary
              onClick={ onSave }
              loading={ loading }
            >
              { savedSearch ? 'Update' : 'Create' }
            </Button>
            <Button className={ stl.cancelButton } marginRight onClick={ closeHandler }>{ 'Cancel' }</Button>
        </div>
        { savedSearch && <Button className={ stl.cancelButton } marginRight onClick={ onDelete }>{ 'Delete' }</Button> }
      </Modal.Actions>
    </Modal>
  );
}

export default connect(state => ({
  savedSearch: state.getIn([ 'search', 'savedSearch' ]),
  filter: state.getIn(['search', 'instance']),
  loading: state.getIn([ 'search', 'saveRequest', 'loading' ]) || 
    state.getIn([ 'search', 'updateRequest', 'loading' ]),
}), { edit, save, remove })(SaveSearchModal);