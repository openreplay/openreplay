import React from 'react';
import { connect } from 'react-redux';
import withPageTitle from 'HOCs/withPageTitle';
import { Loader, Button, Message } from 'UI';
import { updatePassword } from 'Duck/user';
import styles from './updatePassword.module.css';

const ERROR_DOESNT_MATCH = "Passwords doesn't match";
const MIN_LENGTH = 8;
const PASSWORD_POLICY = `Password should contain at least ${ MIN_LENGTH } symbols`;

const checkDoesntMatch = (newPassword, newPasswordRepeat) =>
  newPasswordRepeat.length > 0 && newPasswordRepeat !== newPassword;

@connect(
  state => ({
    errors: state.getIn([ 'user', 'updatePasswordRequest', 'errors' ]),
    loading: state.getIn([ 'user', 'updatePasswordRequest', 'loading' ]),
  }),
  { updatePassword },
)
@withPageTitle("Password Change - OpenReplay")
export default class UpdatePassword extends React.Component {
  state = {
    oldPassword: '',
    newPassword: '',
    newPasswordRepeat: '',
  };

  handleSubmit = (event) => {
    event.preventDefault();
    if (this.isSubmitDisabled()) return;

    const { oldPassword, newPassword } = this.state;
    this.props.updatePassword({ oldPassword, newPassword });
  }

  write = ({ target: { value, name } }) => this.setState({ [ name ]: value })

  isSubmitDisabled() {
    const { oldPassword, newPassword, newPasswordRepeat } = this.state;
    if (newPassword !== newPasswordRepeat ||
      newPassword.length < MIN_LENGTH ||
      oldPassword.length < MIN_LENGTH) return true;
    return false;
  }

  render() {
    const { errors, loading } = this.props;
    const { newPassword, newPasswordRepeat } = this.state;
    const doesntMatch = checkDoesntMatch(newPassword, newPasswordRepeat);

    return (
      <div className={ styles.form }>
        {/* <div className={ styles.betaTag }>{'BETA'}</div> */}
        <div className={ styles.logo } />
        <form onSubmit={ this.handleSubmit }>
          <h2>{ 'Password Change' }</h2>
          <Loader loading={ loading }>
            <div>
              <div className={ styles.inputWithIcon }>
                <i className={ styles.inputIconPassword } />
                <input
                  type="password"
                  placeholder="Old Password"
                  name="oldPassword"
                  onChange={ this.write }
                  className={ styles.password }
                />
              </div>
              <div className={ styles.inputWithIcon }>
                <i className={ styles.inputIconPassword } />
                <input
                  type="password"
                  placeholder="New Password"
                  name="newPassword"
                  onChange={ this.write }
                  className={ styles.password }
                />
              </div>
              <div className={ styles.passwordPolicy } data-hidden={ newPassword.length > 7 }>
                { PASSWORD_POLICY }
              </div>
              <div className={ styles.inputWithIcon }>
                <i className={ styles.inputIconPassword } />
                <input
                  type="password"
                  placeholder="Repeat New Password"
                  name="newPasswordRepeat"
                  onChange={ this.write }
                  className={ styles.password }
                />
              </div>
              <Message error hidden={ !doesntMatch }>
                { ERROR_DOESNT_MATCH }
              </Message>
            </div>
          </Loader>
          { errors &&
            <div className={ styles.errors }>
              { errors.map(error => <span>{ error }<br /></span>) }
            </div>
          }
          <div className={ styles.formFooter }>
            <Button type="submit" variant="primary" >{ 'Update' }</Button>
          </div>
        </form>
      </div>
    );
  }
}
