// TODO this can be deleted
import copy from 'copy-to-clipboard';
import { connect } from 'react-redux';
import styles from './profileSettings.css';

@connect(state => ({
  apiKey: state.getIn([ 'user', 'client', 'apiKey' ]),
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
      <form onSubmit={ this.handleSubmit } className={ styles.form }>
        <div className={ styles.formGroup }>
          <label htmlFor="apiKey">{ 'Organization API Key' }</label>
          <div className="ui action input">
            <input
              name="apiKey"
              id="apiKey"
              type="text"
              readOnly={ true }
              value={ apiKey }
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
