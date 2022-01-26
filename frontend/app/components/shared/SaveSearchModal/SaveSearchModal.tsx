import React from 'react';
import { connect } from 'react-redux';
import { edit, save } from 'Duck/search';
import { Button, Modal, Form, Icon, Checkbox } from 'UI';
import stl from './SaveSearchModal.css';

interface Props {
  filter: any;
  loading: boolean;
  edit: (filter: any) => void;
  save: (filter: any) => Promise<void>;
  show: boolean;
  closeHandler: () => void;
}
function SaveSearchModal(props: Props) {
  const { filter, loading, show, closeHandler } = props;
  
  const onNameChange = ({ target: { value } }) => {
    props.edit({ name: value });
  };

  const onSave = () => {
    const { filter, closeHandler } = props;
    if (filter.name.trim() === '') return;
    props.save(filter).then(function() {
      // this.props.fetchFunnelsList();
      closeHandler();
    });
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
              value={ filter.name }
              onChange={ onNameChange }
              placeholder="Title"
            />
          </Form.Field>
        </Form>
      </Modal.Content>
      <Modal.Actions className="">
        <Button
          primary
          onClick={ onSave }
          loading={ loading }
        >
          { filter.exists() ? 'Modify' : 'Save' }
        </Button>
        <Button className={ stl.cancelButton } marginRight onClick={ closeHandler }>{ 'Cancel' }</Button>
      </Modal.Actions>
    </Modal>
  );
}

export default connect(state => ({
  filter: state.getIn(['search', 'instance']),
  loading: state.getIn([ 'filters', 'saveRequest', 'loading' ]) || 
    state.getIn([ 'filters', 'updateRequest', 'loading' ]),
}), { edit, save })(SaveSearchModal);