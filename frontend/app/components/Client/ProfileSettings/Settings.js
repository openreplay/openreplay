import React from 'react';
import { connect } from 'react-redux';
import { Button, Input, Form } from 'UI';
import { updateAccount, updateClient } from 'Duck/user';
import styles from './profileSettings.module.css';

@connect(state => ({
  accountName: state.getIn([ 'user', 'account', 'name' ]),
  organizationName: state.getIn([ 'user', 'account', 'tenantName' ]),
  loading: state.getIn([ 'user', 'updateAccountRequest', 'loading' ]) ||
    state.getIn([ 'user', 'putClientRequest', 'loading' ]),
}), {
  updateAccount,
  updateClient,
})
export default class Settings extends React.PureComponent {
  state = {
    accountName: this.props.accountName,
    organizationName: this.props.organizationName,
  }

  onChange = ({ target: { value, name } }) => {
    this.setState({ changed: true, [ name ]: value });
  }

  handleSubmit = (e) => {
    e.preventDefault();
    const { accountName, organizationName } = this.state;
    const promises = [];
    if (accountName !== this.props.accountName) {
      promises.push(this.props.updateAccount({ name: accountName }));
    }
    if (organizationName !== this.props.organizationName) {
      promises.push(this.props.updateClient({ name: organizationName }));
    }
    Promise.all(promises)
      .then(() => this.setState({ changed: false }));
  }

  render() {
    const { loading } = this.props;
    const { accountName, organizationName, changed, copied } = this.state;

    return (
      <Form onSubmit={ this.handleSubmit } className={ styles.form }>
        <Form.Field>
          <label htmlFor="accountName">{ 'Name' }</label>
          <Input
            name="accountName"
            id="accountName"
            type="text"
            onChange={ this.onChange }
            value={ accountName }
          />
        </Form.Field>

        <Form.Field>
          <label htmlFor="organizationName">{ 'Organization' }</label>
          <Input
            name="organizationName"
            id="organizationName"
            type="text"
            onChange={ this.onChange }
            value={ organizationName }
          />
        </Form.Field>

        <Button variant="outline" loading={ loading } disabled={ !changed } type="submit">{ 'Update' }</Button>
      </Form>
    );
  }
}
