// TODO this can be deleted
import copy from 'copy-to-clipboard';
import { connect } from 'react-redux';
import styles from './profileSettings.css';

@connect(state => ({
  tenantKey: state.getIn([ 'user', 'client', 'tenantKey' ]),
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
      <form onSubmit={ this.handleSubmit } className={ styles.form }>
        <div className={ styles.formGroup }>
          <label htmlFor="tenantKey">{ 'Tenant Key' }</label>
          <div className="ui action input">
            <input
              name="tenantKey"
              id="tenantKey"
              type="text"
              readOnly={ true }
              value={ tenantKey }
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
