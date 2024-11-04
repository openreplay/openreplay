import React from 'react';
import { connect } from 'react-redux';
import { Button, Input, Form } from 'UI';
import { updateAccount, updateClient } from 'Duck/user';
import styles from './profileSettings.module.css';

@connect(
  (state) => ({
    accountName: state.getIn(['user', 'account', 'name']),
    organizationName: state.getIn(['user', 'account', 'tenantName']),
    loading:
      state.getIn(['user', 'updateAccountRequest', 'loading']) ||
      state.getIn(['user', 'putClientRequest', 'loading']),
  }),
  {
    updateAccount,
    updateClient,
  }
)
export default class Settings extends React.PureComponent {
  state = {
    accountName: this.props.accountName,
    organizationName: this.props.organizationName,
  };

  onChange = ({ target: { value, name } }) => {
    this.setState({ changed: true, [name]: value });
  };

  handleSubmit = (e) => {
    e.preventDefault();
    const { accountName, organizationName } = this.state;
    this.props
      .updateClient({ name: accountName, tenantName: organizationName })
      .then(() => this.setState({ changed: false }));
  };

  render() {
    const { loading } = this.props;
    const { accountName, organizationName, changed, copied } = this.state;

    return (
      <Form onSubmit={this.handleSubmit} className={styles.form}>
        <Form.Field>
          <label htmlFor="accountName">{'Name'}</label>
          <Input
            name="accountName"
            id="accountName"
            type="text"
            onChange={this.onChange}
            value={accountName}
            maxLength={50}
          />
        </Form.Field>

        <Form.Field>
          <label htmlFor="organizationName">{'Organization'}</label>
          <Input
            name="organizationName"
            id="organizationName"
            type="text"
            onChange={this.onChange}
            value={organizationName}
            maxLength={50}
          />
        </Form.Field>

        <Button variant="outline" loading={loading} disabled={!changed} type="submit">
          {'Update'}
        </Button>
      </Form>
    );
  }
}
