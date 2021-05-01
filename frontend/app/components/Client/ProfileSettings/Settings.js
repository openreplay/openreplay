import copy from 'copy-to-clipboard';
import { connect } from 'react-redux';
import { Button } from 'UI';
import { updateAccount, updateClient } from 'Duck/user';

import styles from './profileSettings.css';

@connect(state => ({
  accountName: state.getIn([ 'user', 'account', 'name' ]),
  apiKey: state.getIn([ 'user', 'client', 'apiKey' ]),
  organizationName: state.getIn([ 'user', 'client', 'name' ]),
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

  copyHandler = () => {
    const { apiKey } = this.props;
    this.setState({ copied: true });
    copy(apiKey);
    setTimeout(() => {
      this.setState({ copied: false });
    }, 1000);
  };

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
    const { loading, apiKey } = this.props;
    const { accountName, organizationName, changed, copied } = this.state;

    return (
      <form onSubmit={ this.handleSubmit } className={ styles.form }>
        <div className={ styles.formGroup }>
          <label htmlFor="accountName">{ 'Name' }</label>
          <input
            name="accountName"
            id="accountName"
            type="text"
            onChange={ this.onChange }
            value={ accountName }
          />
        </div>

        <div className={ styles.formGroup }>
          <label htmlFor="organizationName">{ 'Organization' }</label>
          <input
            name="organizationName"
            id="organizationName"
            type="text"
            onChange={ this.onChange }
            value={ organizationName }
          />
        </div>

        <Button outline loading={ loading } disabled={ !changed } type="submit">{ 'Update' }</Button>
      </form>
    );
  }
}
