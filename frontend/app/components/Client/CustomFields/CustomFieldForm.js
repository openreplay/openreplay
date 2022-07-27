import React from 'react';
import { connect } from 'react-redux';
import { edit, save } from 'Duck/customField';
import { Form, Input, Button, Message } from 'UI';
import styles from './customFieldForm.module.css';

@connect(
    (state) => ({
        field: state.getIn(['customFields', 'instance']),
        saving: state.getIn(['customFields', 'saveRequest', 'loading']),
        errors: state.getIn(['customFields', 'saveRequest', 'errors']),
    }),
    {
        edit,
        save,
    }
)
class CustomFieldForm extends React.PureComponent {
    setFocus = () => this.focusElement.focus();
    onChangeSelect = (event, { name, value }) => this.props.edit({ [name]: value });
    write = ({ target: { value, name } }) => this.props.edit({ [name]: value });

    render() {
        const { field, errors } = this.props;
        const exists = field.exists();
        return (
            <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
                <h3 className="p-5 text-2xl">{exists ? 'Update' : 'Add'} Metadata Field</h3>
                <Form className={styles.wrapper}>
                    <Form.Field>
                        <label>{'Field Name'}</label>
                        <Input
                            ref={(ref) => {
                                this.focusElement = ref;
                            }}
                            name="key"
                            value={field.key}
                            onChange={this.write}
                            placeholder="Field Name"
                        />
                    </Form.Field>

                    {errors && (
                        <div className="mb-3">
                            {errors.map((error) => (
                                <Message visible={errors} size="mini" error key={error} className={styles.error}>
                                    {error}
                                </Message>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between">
                        <div className="flex items-center">
                            <Button
                                onClick={() => this.props.onSave(field)}
                                disabled={!field.validate()}
                                loading={this.props.saving}
                                variant="primary"
                                className="float-left mr-2"
                            >
                                {exists ? 'Update' : 'Add'}
                            </Button>
                            <Button data-hidden={!exists} onClick={this.props.onClose}>
                                {'Cancel'}
                            </Button>
                        </div>

                        <Button variant="text" icon="trash" data-hidden={!exists} onClick={this.props.onDelete}></Button>
                    </div>
                </Form>
            </div>
        );
    }
}

export default CustomFieldForm;
