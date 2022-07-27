import React from 'react';
import { connect } from 'react-redux';
import { edit, save } from 'Duck/webhook';
import { Form, Button, Input } from 'UI';
import styles from './webhookForm.module.css';

@connect(
    (state) => ({
        webhook: state.getIn(['webhooks', 'instance']),
        loading: state.getIn(['webhooks', 'saveRequest', 'loading']),
    }),
    {
        edit,
        save,
    }
)
class WebhookForm extends React.PureComponent {
    setFocus = () => this.focusElement.focus();
    onChangeSelect = (event, { name, value }) => this.props.edit({ [name]: value });
    write = ({ target: { value, name } }) => this.props.edit({ [name]: value });

    save = () => {
        this.props.save(this.props.webhook).then(() => {
            this.props.onClose();
        });
    };

    render() {
        const { webhook, loading } = this.props;
        return (
            <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
                <h3 className="p-5 text-2xl">{webhook.exists() ? 'Update' : 'Add'} Webhook</h3>
                <Form className={styles.wrapper}>
                    <Form.Field>
                        <label>{'Name'}</label>
                        <Input
                            ref={(ref) => {
                                this.focusElement = ref;
                            }}
                            name="name"
                            value={webhook.name}
                            onChange={this.write}
                            placeholder="Name"
                        />
                    </Form.Field>

                    <Form.Field>
                        <label>{'Endpoint'}</label>
                        <Input
                            ref={(ref) => {
                                this.focusElement = ref;
                            }}
                            name="endpoint"
                            value={webhook.endpoint}
                            onChange={this.write}
                            placeholder="Endpoint"
                        />
                    </Form.Field>

                    <Form.Field>
                        <label>{'Auth Header (optional)'}</label>
                        <Input
                            ref={(ref) => {
                                this.focusElement = ref;
                            }}
                            name="authHeader"
                            value={webhook.authHeader}
                            onChange={this.write}
                            placeholder="Auth Header"
                        />
                    </Form.Field>

                    <div className="flex justify-between">
                        <div className="flex items-center">
                            <Button
                                onClick={this.save}
                                disabled={!webhook.validate()}
                                loading={loading}
                                variant="primary"
                                className="float-left mr-2"
                            >
                                {webhook.exists() ? 'Update' : 'Add'}
                            </Button>
                            {webhook.exists() && <Button onClick={this.props.onClose}>{'Cancel'}</Button>}
                        </div>
                        {webhook.exists() && <Button icon="trash" variant="text" onClick={() => this.props.onDelete(webhook.webhookId)}></Button>}
                    </div>
                </Form>
            </div>
        );
    }
}

export default WebhookForm;
