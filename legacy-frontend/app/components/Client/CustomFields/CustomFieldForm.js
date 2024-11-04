import React, { useRef } from 'react';
import { connect } from 'react-redux';
import { edit, save } from 'Duck/customField';
import { Form, Input, Button } from 'UI';
import styles from './customFieldForm.module.css';

const CustomFieldForm = ({ field, saving, errors, edit, save, onSave, onClose, onDelete }) => {
  const focusElementRef = useRef(null);

  const setFocus = () => focusElementRef.current.focus();
  const onChangeSelect = (event, { name, value }) => edit({ [name]: value });
  const write = ({ target: { value, name } }) => edit({ [name]: value });

  const exists = field.exists();

  return (
    <div className="bg-white h-screen overflow-y-auto">
      <h3 className="p-5 text-2xl">{exists ? 'Update' : 'Add'} Metadata Field</h3>
      <Form className={styles.wrapper}>
        <Form.Field>
          <label>{'Field Name'}</label>
          <Input
            ref={focusElementRef}
            name="key"
            value={field.key}
            onChange={write}
            placeholder="Field Name"
            maxLength={50}
          />
        </Form.Field>

        <div className="flex justify-between">
          <div className="flex items-center">
            <Button
              onClick={() => onSave(field)}
              disabled={!field.validate()}
              loading={saving}
              variant="primary"
              className="float-left mr-2"
            >
              {exists ? 'Update' : 'Add'}
            </Button>
            <Button data-hidden={!exists} onClick={onClose}>
              {'Cancel'}
            </Button>
          </div>

          <Button variant="text" icon="trash" data-hidden={!exists} onClick={onDelete}></Button>
        </div>
      </Form>
    </div>
  );
};

const mapStateToProps = (state) => ({
  field: state.getIn(['customFields', 'instance']),
  saving: state.getIn(['customFields', 'saveRequest', 'loading']),
  errors: state.getIn(['customFields', 'saveRequest', 'errors']),
});

export default connect(mapStateToProps, { edit, save })(CustomFieldForm);
