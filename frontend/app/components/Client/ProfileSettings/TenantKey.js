// TODO this can be deleted
import copy from 'copy-to-clipboard';
import { connect } from 'react-redux';
import styles from './profileSettings.css';

@connect(state => ({
  key: state.getIn([ 'user', 'client', 'tenantKey' ]),
  loading: state.getIn([ 'user', 'updateAccountRequest', 'loading' ]) ||
    state.getIn([ 'user', 'putClientRequest', 'loading' ]),
}))
export default class TenantKey extends React.PureComponent {
  state = { copied: false }

  copyHandler = () => {
    const { key } = this.props;
    this.setState({ copied: true });
    copy(key);
    setTimeout(() => {
      this.setState({ copied: false });
    }, 1000);
  };

  render() {
    const { key } = this.props;
    const { copied } = this.state;

    return (
      <form onSubmit={ this.handleSubmit } className={ styles.form }>
        <div className={ styles.formGroup }>
          <label htmlFor="key">{ 'Tenant Key' }</label>
          <div className="ui action input">
            <input
              name="key"
              id="key"
              type="text"
              readOnly={ true }
              value={ key }
            />
            <div
              className="ui button copy-button"
              role="button"
              onClick={ this.copyHandler }
            >
              { copied ? 'copied' : 'copy' }
            </div>
          </div>
        </div>
      </form>
    );
  }
}
