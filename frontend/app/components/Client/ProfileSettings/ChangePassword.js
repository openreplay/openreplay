import { connect } from 'react-redux';
import { Button, Message } from 'UI';
import styles from './profileSettings.css';
import { updatePassword } from 'Duck/user';

const ERROR_DOESNT_MATCH = "Passwords doesn't match";
const MIN_LENGTH = 8;
const PASSWORD_POLICY = `Password should contain at least ${ MIN_LENGTH } symbols`;
const checkDoesntMatch = (newPassword, newPasswordRepeat) => newPasswordRepeat.length > 0 && newPasswordRepeat !== newPassword;

const defaultState = {
  oldPassword: '',
  newPassword: '',
  newPasswordRepeat: '',
  success: false,
};
@connect(state => ({
  passwordErrors: state.getIn(['user', 'passwordErrors']),
  loading: state.getIn(['user', 'updatePasswordRequest', 'loading'])
}), {
  updatePassword
})
export default class ChangePassword extends React.PureComponent {
  state = defaultState

  write = ({ target: { name, value } }) => {
    this.setState({
      [ name ]: value,
    });
  }

  handleSubmit = (e) => {
    e.preventDefault();
    if (this.isSubmitDisabled()) return;

    const { oldPassword, newPassword } = this.state;
    this.setState({
      success: false,
    });

    this.props.updatePassword({
      oldPassword,
      newPassword,
    }).then(() => {
      if (this.props.passwordErrors.size === 0) {
        this.setState({
          ...defaultState,
          success: true,
        });
      }
    });
  }

  isSubmitDisabled() {
    const { oldPassword, newPassword, newPasswordRepeat } = this.state;
    if (newPassword !== newPasswordRepeat ||
      newPassword.length < MIN_LENGTH ||
      oldPassword.length < MIN_LENGTH) return true;
    return false;
  }

  render() {
    const {
      oldPassword, newPassword, newPasswordRepeat, success
    } = this.state;
    const { loading, passwordErrors } = this.props;

    const doesntMatch = checkDoesntMatch(newPassword, newPasswordRepeat);
    return (
      <form onSubmit={ this.handleSubmit } className={ styles.form } >
        <div className={ styles.formGroup }>
          <label htmlFor="oldPassword">
            { 'Old Password: ' }
          </label>
          <input
            // label="Old Password: "
            id="oldPassword"
            name="oldPassword"
            value={ oldPassword }
            type="password"
            // error={ wrongPassword }
            onChange={ this.write }
          />
        </div>
        <div className={ styles.formGroup }>
          <label htmlFor="newPassword">
            { 'New Password: ' }
          </label>
          <input
            id="newPassword"            
            name="newPassword"
            value={ newPassword }
            type="password"
            onChange={ this.write }
          />
          <div className={ styles.passwordPolicy } >
            { PASSWORD_POLICY }
          </div>
        </div>
        <div className={ styles.formGroup }>
          <label htmlFor="newPasswordRepeat">
            { 'Repeat New Password: ' }
          </label>
          <input
            id="newPasswordRepeat"            
            name="newPasswordRepeat"
            value={ newPasswordRepeat }
            type="password"
            onChange={ this.write }
          />
        </div>
        { passwordErrors.map(err => (
          <Message error>
            { err }
          </Message>
        ))}
        <Message error hidden={ !doesntMatch }>
          { ERROR_DOESNT_MATCH }
        </Message>
        <Button
          outline
          content="Change Password"
          type="submit"
          disabled={ this.isSubmitDisabled() }
          loading={ loading }
        />        
        <Message success hidden={ !success }>
          { 'Successfully changed the password!' }
        </Message>
      </form>
    );
  }
}
