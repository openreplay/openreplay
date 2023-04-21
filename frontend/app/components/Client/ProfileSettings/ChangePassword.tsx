import React, { useState, useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Button, Message, Form, Input } from 'UI';
import styles from './profileSettings.module.css';
import { updatePassword } from 'Duck/user';
import { toast } from 'react-toastify';
import { validatePassword } from 'App/validate';
import { PASSWORD_POLICY } from 'App/constants';

const ERROR_DOESNT_MATCH = "Passwords don't match";
const MIN_LENGTH = 8;

type PropsFromRedux = ConnectedProps<typeof connector>;

const ChangePassword: React.FC<PropsFromRedux> = ({ passwordErrors, loading, updatePassword }) => {
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<{ value: string; error: boolean }>({
    value: '',
    error: false,
  });
  const [newPasswordRepeat, setNewPasswordRepeat] = useState<{ value: string; error: boolean }>({
    value: '',
    error: false,
  });
  const [success, setSuccess] = useState<boolean>(false);
  const [show, setShow] = useState<boolean>(false);

  const checkDoesntMatch = useCallback((newPassword: string, newPasswordRepeat: string) => {
    return newPasswordRepeat.length > 0 && newPasswordRepeat !== newPassword;
  }, []);

  const isSubmitDisabled = useCallback(() => {
    if (
      newPassword.value !== newPasswordRepeat.value ||
      newPassword.value.length < MIN_LENGTH ||
      oldPassword.length === 0
    ) {
      return true;
    }
    return false;
  }, [newPassword, newPasswordRepeat, oldPassword]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isSubmitDisabled()) return;

      if (!validatePassword(newPassword.value)) {
        setNewPassword({ ...newPassword, error: true });
        return;
      }

      updatePassword({
        oldPassword,
        newPassword: newPassword.value,
      }).then((e: any) => {
        const success = !e || !e.errors || e.errors.length === 0;
        setSuccess(success);
        setShow(!success);
        if (success) {
          toast.success(`Successfully changed password`);
          setOldPassword('');
          setNewPassword({ value: '', error: false });
          setNewPasswordRepeat({ value: '', error: false });
        }
      });
    },
    [isSubmitDisabled, oldPassword, newPassword, updatePassword]
  );

  return show ? (
    <Form onSubmit={handleSubmit} className={styles.form}>
      <Form.Field>
        <label htmlFor="oldPassword">{'Old Password: '}</label>
        <Input
          id="oldPassword"
          name="oldPassword"
          value={oldPassword}
          type="password"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOldPassword(e.target.value)}
        />
      </Form.Field>
      <Form.Field>
        <label htmlFor="newPassword">{'New Password: '}</label>
        <Input
          id="newPassword"
          name="newPassword"
          value={newPassword.value}
          type="password"
          error={newPassword.error}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.value;
            const isValid = validatePassword(newValue);
            setNewPassword({ value: newValue, error: !isValid });
          }}
        />
      </Form.Field>
      <Form.Field>
        <label htmlFor="newPasswordRepeat">{'Repeat New Password: '}</label>
        <Input
          id="newPasswordRepeat"
          name="newPasswordRepeat"
          value={newPasswordRepeat.value}
          type="password"
          error={
            newPasswordRepeat.error || checkDoesntMatch(newPassword.value, newPasswordRepeat.value)
          }
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.value;
            const isValid = newValue === newPassword.value;
            setNewPasswordRepeat({ value: newValue, error: !isValid });
          }}
        />
      </Form.Field>
      {passwordErrors.map((err, i) => (
        <Message error key={i}>
          {err}
        </Message>
      ))}
      <Message error hidden={!checkDoesntMatch(newPassword.value, newPasswordRepeat.value)}>
        {ERROR_DOESNT_MATCH}
      </Message>
      <Message error hidden={!newPassword.error}>
        {PASSWORD_POLICY}
      </Message>
      <div className="flex items-center pt-3">
        <Button type="submit" variant="outline" disabled={isSubmitDisabled()} loading={loading}>
          Change Password
        </Button>
        <Button
          className="ml-2"
          onClick={() => {
            setOldPassword('');
            setNewPassword({ value: '', error: false });
            setNewPasswordRepeat({ value: '', error: false });
            setSuccess(false);
            setShow(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </Form>
  ) : (
    <div onClick={() => setShow(true)}>
      <Button variant="text-primary">Change Password</Button>
    </div>
  );
};

const mapStateToProps = (state: any) => ({
  passwordErrors: state.getIn(['user', 'passwordErrors']),
  loading: state.getIn(['user', 'updatePasswordRequest', 'loading']),
});

const mapDispatchToProps = {
  updatePassword,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export default connector(ChangePassword);
