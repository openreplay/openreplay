import cn from 'classnames';
import { useObserver, observer } from 'mobx-react-lite';
import React from 'react';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { confirm, CopyButton, Form, Icon, Input } from 'UI';
import { Button } from 'antd';

import Select from 'Shared/Select';
import { useTranslation } from 'react-i18next';

function UserForm() {
  const { t } = useTranslation();
  const { hideModal } = useModal();
  const { userStore, roleStore } = useStore();
  const { isEnterprise } = userStore;
  const isSmtp = userStore.account.smtp;
  const isSaving = userStore.saving;
  const user: any = userStore.instance || userStore.initUser();
  const roles = roleStore.list
    .filter((r) => (r.protected ? user.isSuperAdmin : true))
    .map((r) => ({ label: r.name, value: r.roleId }));

  const onChangeCheckbox = (e: any) => {
    user.updateKey('isAdmin', !user.isAdmin);
  };

  const onSave = () => {
    userStore.saveUser(user).then(() => {
      hideModal();
      userStore.fetchLimits();
    });
  };

  const write = ({ target: { name, value } }) => {
    user.updateKey(name, value);
  };

  const deleteHandler = async () => {
    if (
      await confirm({
        header: t('Confirm'),
        confirmButton: t('Yes, delete'),
        confirmation: t(
          'Are you sure you want to permanently delete this user?',
        ),
      })
    ) {
      userStore.deleteUser(user.userId).then(() => {
        hideModal();
        userStore.fetchLimits();
      });
    }
  };

  return useObserver(() => (
    <div className="bg-white h-screen p-6">
      <div className="">
        <h1 className="text-2xl mb-4">
          {`${user.exists() ? 'Update' : 'Invite'} User`}
        </h1>
      </div>
      <Form onSubmit={onSave}>
        <Form.Field>
          <label>{t('Full Name')}</label>
          <Input
            name="name"
            autoFocus
            maxLength="50"
            value={user.name}
            onChange={write}
            className="w-full"
            id="name-field"
          />
        </Form.Field>

        <div className="form-group">
          <label>{t('Email Address')}</label>
          <Input
            disabled={user.exists()}
            name="email"
            maxLength="320"
            value={user.email}
            onChange={write}
            className="w-full"
          />
        </div>
        {!isSmtp && (
          <div className={cn('mb-4 p-2 bg-yellow rounded')}>
            {t('SMTP is not configured (see')}&nbsp;
            <a
              className="link"
              href="https://docs.openreplay.com/configuration/configure-smtp"
              target="_blank"
              rel="noreferrer"
            >
              {t('here')}
            </a>{' '}
            {t(
              'how to set it up). You can still add new users, but you’d have to manually copy then send them the invitation link.',
            )}
          </div>
        )}
        <Form.Field>
          <label className="flex items-start cursor-pointer">
            <input
              name="admin"
              type="checkbox"
              checked={!!user.isAdmin || !!user.isSuperAdmin}
              onChange={onChangeCheckbox}
              disabled={user.isSuperAdmin}
              className="mt-1"
            />
            <div className="ml-2 select-none">
              <span>{t('Admin Privileges')}</span>
              <div className="text-sm color-gray-medium -mt-1">
                {t('Can manage Projects and team members.')}
              </div>
            </div>
          </label>
        </Form.Field>

        {isEnterprise && (
          <Form.Field>
            <label htmlFor="role">{t('Role')}</label>
            <Select
              placeholder={t('Select Role')}
              selection
              options={roles}
              name="roleId"
              defaultValue={user.roleId}
              onChange={({ value }) => user.updateKey('roleId', value.value)}
              className="block"
              isDisabled={user.isSuperAdmin}
            />
          </Form.Field>
        )}
      </Form>

      <div className="flex items-center">
        <div className="flex items-center mr-auto">
          <Button
            onClick={onSave}
            disabled={!user.valid(isEnterprise) || isSaving}
            loading={isSaving}
            type="primary"
            className="float-left mr-2"
          >
            {user.exists() ? t('Update') : t('Invite')}
          </Button>
          {user.exists() && <Button onClick={hideModal}>{t('Cancel')}</Button>}
        </div>
        {!user.exists() ? null : (
          <div>
            <Button disabled={user.isSuperAdmin} onClick={deleteHandler}>
              <Icon name="trash" size="16" />
            </Button>
          </div>
        )}
      </div>

      {!user.isJoined && user.invitationLink && (
        <CopyButton
          content={user.invitationLink}
          className="link mt-4"
          btnText="Copy invite link"
        />
      )}
    </div>
  ));
}

export default observer(UserForm);
