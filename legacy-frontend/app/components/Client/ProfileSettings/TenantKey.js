// TODO this can be deleted
import React from 'react';
import copy from 'copy-to-clipboard';
import { connect } from 'react-redux';
import styles from './profileSettings.module.css';
import { Form, Input, Button } from "UI";

@connect(state => ({
  tenantKey: state.getIn([ 'user', 'account', 'tenantKey' ]),
}))
export default class TenantKey extends React.PureComponent {
  state = { copied: false }

  copyHandler = () => {
    const { tenantKey } = this.props;
    this.setState({ copied: true });
    copy(tenantKey);
    setTimeout(() => {
      this.setState({ copied: false });
    }, 1000);
  };

  render() {
    const { tenantKey } = this.props;
    const { copied } = this.state;

    return (
      <Form onSubmit={ this.handleSubmit } className={ styles.form }>
        <Form.Field>
          <label htmlFor="tenantKey">{ 'Tenant Key' }</label>
            <Input
              name="tenantKey"
              id="tenantKey"
              type="text"
              readOnly={ true }
              value={ tenantKey }
              leadingButton={
                <Button
                  variant="text-primary"
                  role="button"
                  onClick={ this.copyHandler }
                >
                  { copied ? 'Copied' : 'Copy' }
                </Button>
              }
            />
        </Form.Field>
      </Form>
    );
  }
}
