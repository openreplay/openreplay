import React, { useState, useCallback } from 'react';
import { Message, Form, Input } from 'UI';
import { Button } from 'antd';
import { validatePassword } from 'App/validate';
import { PASSWORD_POLICY } from 'App/constants';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import styles from './profileSettings.module.css';
import { useTranslation } from 'react-i18next';

const ERROR_DOESNT_MATCH = (t) => "Passwords don't match";
const MIN_LENGTH = 8;

function ChangePassword() {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const { updatePassword } = userStore;
  const passwordErrors = userStore.updatePasswordRequest.errors;
  const { loading } = userStore.updatePasswordRequest;
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<{
    value: string;
    error: boolean;
  }>({
    value: '',
    error: false,
  });
  const [newPasswordRepeat, setNewPasswordRepeat] = useState<{
    value: string;
    error: boolean;
  }>({
    value: '',
    error: false,
  });
  const [show, setShow] = useState<boolean>(false);

  const checkDoesntMatch = useCallback(
    (newPassword: string, newPasswordRepeat: string) =>
      newPasswordRepeat.length > 0 && newPasswordRepeat !== newPassword,
    [],
  );

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
      })
        .then(() => {
          setShow(false);
          setOldPassword('');
          setNewPassword({ value: '', error: false });
          setNewPasswordRepeat({ value: '', error: false });
        })
        .catch((e) => {});
    },
    [isSubmitDisabled, oldPassword, newPassword, updatePassword],
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setOldPassword(e.target.value)
          }
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
        <label htmlFor="newPasswordRepeat">
          {t('Repeat New Password')}&nbsp;
        </label>
        <Input
          id="newPasswordRepeat"
          name="newPasswordRepeat"
          value={newPasswordRepeat.value}
          type="password"
          error={
            newPasswordRepeat.error ||
            checkDoesntMatch(newPassword.value, newPasswordRepeat.value)
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
      <Message
        error
        hidden={!checkDoesntMatch(newPassword.value, newPasswordRepeat.value)}
      >
        {ERROR_DOESNT_MATCH(t)}
      </Message>
      <Message error hidden={!newPassword.error}>
        {PASSWORD_POLICY(t)}
      </Message>
      <div className="flex items-center pt-3">
        <Button
          htmlType="submit"
          type="default"
          disabled={isSubmitDisabled()}
          loading={loading}
        >
          {t('Change Password')}
        </Button>
        <Button
          className="ml-2"
          onClick={() => {
            setOldPassword('');
            setNewPassword({ value: '', error: false });
            setNewPasswordRepeat({ value: '', error: false });
            setShow(false);
          }}
        >
          {t('Cancel')}
        </Button>
      </div>
    </Form>
  ) : (
    <div onClick={() => setShow(true)}>
      <Button type="text">{t('Change Password')}</Button>
    </div>
  );
}

export default observer(ChangePassword);
