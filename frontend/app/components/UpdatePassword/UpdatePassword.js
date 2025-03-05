import withPageTitle from 'HOCs/withPageTitle';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { Button, Loader, Message } from 'UI';

import styles from './updatePassword.module.css';

const ERROR_DOESNT_MATCH = "Passwords doesn't match";
const MIN_LENGTH = 8;
const PASSWORD_POLICY = `Password should contain at least ${MIN_LENGTH} symbols`;

const checkDoesntMatch = (newPassword, newPasswordRepeat) =>
  newPasswordRepeat.length > 0 && newPasswordRepeat !== newPassword;

function UpdatePassword() {
  const { userStore } = useStore();
  const updatePassword = userStore.updatePassword;
  const errors = userStore.updatePasswordRequest.errors;
  const loading = userStore.updatePasswordRequest.loading;
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [newPasswordRepeat, setNewPasswordRepeat] = React.useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitDisabled()) return;

    void updatePassword({ oldPassword, newPassword });
  };

  const writeOldPass = ({ target: { value } }) => setOldPassword(value);
  const writeNewPass = ({ target: { value } }) => setNewPassword(value);
  const writeNewPassRepeat = ({ target: { value } }) =>
    setNewPasswordRepeat(value);

  const isSubmitDisabled = () => {
    if (
      newPassword !== newPasswordRepeat ||
      newPassword.length < MIN_LENGTH ||
      oldPassword.length < MIN_LENGTH
    )
      return true;
    return false;
  };

  const doesntMatch = checkDoesntMatch(newPassword, newPasswordRepeat);

  return (
    <div className={styles.form}>
      <div className={styles.logo} />
      <form onSubmit={handleSubmit}>
        <h2>{'Password Change'}</h2>
        <Loader loading={loading}>
          <div>
            <div className={styles.inputWithIcon}>
              <i className={styles.inputIconPassword} />
              <input
                type="password"
                placeholder="Old Password"
                name="oldPassword"
                onChange={writeOldPass}
                className={styles.password}
              />
            </div>
            <div className={styles.inputWithIcon}>
              <i className={styles.inputIconPassword} />
              <input
                type="password"
                placeholder="New Password"
                name="newPassword"
                onChange={writeNewPass}
                className={styles.password}
              />
            </div>
            <div
              className={styles.passwordPolicy}
              data-hidden={newPassword.length > 7}
            >
              {PASSWORD_POLICY}
            </div>
            <div className={styles.inputWithIcon}>
              <i className={styles.inputIconPassword} />
              <input
                type="password"
                placeholder="Repeat New Password"
                name="newPasswordRepeat"
                onChange={writeNewPassRepeat}
                className={styles.password}
              />
            </div>
            <Message error hidden={!doesntMatch}>
              {ERROR_DOESNT_MATCH}
            </Message>
          </div>
        </Loader>
        {errors && (
          <div className={styles.errors}>
            {errors.map((error) => (
              <span>
                {error}
                <br />
              </span>
            ))}
          </div>
        )}
        <div className={styles.formFooter}>
          <Button type="submit" variant="primary">
            {'Update'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default withPageTitle('Password Change - OpenReplay')(
  observer(UpdatePassword)
);
