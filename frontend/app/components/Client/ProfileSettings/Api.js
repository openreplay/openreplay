import React from 'react';
import copy from 'copy-to-clipboard';
import { connect } from 'react-redux';
import styles from './profileSettings.module.css';
import { Form, Input, Button, CopyButton } from 'UI';

@connect(state => ({
  apiKey: state.getIn([ 'user', 'account', 'apiKey' ]),
  loading: state.getIn([ 'user', 'updateAccountRequest', 'loading' ]) ||
    state.getIn([ 'user', 'putClientRequest', 'loading' ]),
}))
export default class Api extends React.PureComponent {
  state = { copied: false }

  copyHandler = () => {
    const { apiKey } = this.props;
    this.setState({ copied: true });
    copy(apiKey);
    setTimeout(() => {
      this.setState({ copied: false });
    }, 1000);
  };

  render() {
    const { apiKey } = this.props;
    const { copied } = this.state;

    return (
      <Form onSubmit={ this.handleSubmit } className={ styles.form }>
        <Form.Field>
          <label htmlFor="apiKey">{ 'Organization API Key' }</label>
          <Input
            name="apiKey"
            id="apiKey"
            type="text"
            readOnly={ true }
            value={ apiKey }
            leadingButton={
              <CopyButton content={ apiKey } />
            }
          />
        </Form.Field>
      </Form>
    );
  }
}
