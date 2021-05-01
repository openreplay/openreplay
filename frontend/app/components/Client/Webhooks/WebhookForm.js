import React from 'react';
import { connect } from 'react-redux';
import { edit, save } from 'Duck/webhook';
import { Form, Button } from 'UI';
import styles from './webhookForm.css';

@connect(state => ({
  webhook: state.getIn(['webhooks', 'instance']),
  loading: state.getIn(['webhooks', 'saveRequest', 'loading']),
}), {
  edit,
  save,
})
class WebhookForm extends React.PureComponent {
  setFocus = () => this.focusElement.focus();
  onChangeSelect = (event, { name, value }) => this.props.edit({ [ name ]: value });
  write = ({ target: { value, name } }) => this.props.edit({ [ name ]: value });

  save = () => {
    this.props.save(this.props.webhook).then(() => {
      this.props.onClose();
    });
  };

  render() {
    const { webhook, loading } = this.props;
    return (
      <Form className={ styles.wrapper }>
        <Form.Field>
          <label>{'Name'}</label>
          <input
            ref={ (ref) => { this.focusElement = ref; } }
            name="name"
            value={ webhook.name }
            onChange={ this.write }
            placeholder="Name"
          />
        </Form.Field>

        <Form.Field>
          <label>{'Endpoint'}</label>
          <input
            ref={ (ref) => { this.focusElement = ref; } }
            name="endpoint"
            value={ webhook.endpoint }
            onChange={ this.write }
            placeholder="Endpoint"
          />
        </Form.Field>

        <Form.Field>
          <label>{'Auth Header (optional)'}</label>
          <input
            ref={ (ref) => { this.focusElement = ref; } }
            name="authHeader"
            value={ webhook.authHeader }
            onChange={ this.write }
            placeholder="Auth Header"
          />
        </Form.Field>

        <Button
          onClick={ this.save }    
          disabled={ !webhook.validate() }
          loading={ loading }
          primary
          marginRight
        >
          { webhook.exists() ? 'Update' : 'Add' }
        </Button>
        <Button
          data-hidden={ !webhook.exists() }
          onClick={ this.props.onClose }
          outline
        >
          { 'Cancel' }
        </Button>
      </Form>
    );
  }
}

export default WebhookForm;
