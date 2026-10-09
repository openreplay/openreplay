import { Button } from '@/ui/actions/button';
import { Notice } from '@/ui/feedback/Notice';
import { Input } from '@/ui/inputs/input';
import { SimpleSelect } from '@/ui/inputs/select';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import {
  DrawerFooter,
  EntityDrawer,
  Field,
  Section,
} from '@/ui/overlays/EntityDrawer';
import { Tooltip } from '@/ui/overlays/tooltip';
import copy from 'copy-to-clipboard';
import { Link2, UserCog } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import { PrefToggle } from '../../../PrefSection';

/** Invite someone, or edit a member: name, admin rights, role, ownership. */
function UserForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { userStore, roleStore } = useStore();
  const { isEnterprise, account } = userStore;
  const user: any = userStore.instance;
  const [confirm, setConfirm] = React.useState<'delete' | 'owner' | null>(null);
  if (!user) return null;

  const exists = user.exists();
  const isOwner = !!account.superAdmin;
  const canMakeOwner = user.isJoined && user.userId !== account.id;
  const ownerHint = !user.isJoined
    ? t('User has not accepted the invitation yet')
    : user.userId === account.id
      ? t('Cannot transfer ownership to yourself')
      : undefined;
  const roles = roleStore.list
    .filter((r: any) => (r.protected ? user.isSuperAdmin : true))
    .map((r: any) => ({ value: String(r.roleId), label: r.name }));

  const save = () =>
    userStore.saveUser(user).then(() => {
      onClose();
      void userStore.fetchLimits();
    });

  return (
    <>
      <EntityDrawer
        open={open}
        onClose={onClose}
        eyebrow={t('Team')}
        title={exists ? user.name || user.email : t('Invite someone')}
        footer={
          <DrawerFooter
            left={
              exists ? (
                <Button
                  variant="danger-outline"
                  disabled={user.isSuperAdmin}
                  onClick={() => setConfirm('delete')}
                >
                  {t('Remove')}
                </Button>
              ) : null
            }
            right={
              <>
                <Button variant="subtle" onClick={onClose}>
                  {t('Cancel')}
                </Button>
                <Button
                  variant="primary"
                  disabled={!user.valid(isEnterprise) || userStore.saving}
                  onClick={() => void save()}
                >
                  {exists ? t('Update') : t('Send invitation')}
                </Button>
              </>
            }
          />
        }
      >
        <Section title={t('Who')}>
          <Field label={t('Full name')}>
            <Input
              autoFocus
              maxLength={50}
              value={user.name ?? ''}
              onChange={(e) => user.updateKey('name', e.target.value)}
            />
          </Field>
          <Field label={t('Email address')}>
            <Input
              type="email"
              maxLength={320}
              disabled={exists}
              value={user.email ?? ''}
              placeholder="you@acme.com"
              onChange={(e) => user.updateKey('email', e.target.value)}
            />
          </Field>
          {!account.smtp ? (
            <Notice kind="info">
              {t(
                'SMTP is not configured, so no email is sent. Copy the invitation link and send it yourself.',
              )}{' '}
              <a
                className="link"
                href="https://docs.openreplay.com/configuration/configure-smtp"
                target="_blank"
                rel="noreferrer"
              >
                {t('How to set it up')}
              </a>
            </Notice>
          ) : null}
        </Section>
        <Section
          title={t('What they can reach')}
          hint={t('You can change this at any time from the members list.')}
        >
          <div className="flex flex-col items-start gap-4">
            <PrefToggle
              checked={!!user.isAdmin || !!user.isSuperAdmin}
              disabled={user.isSuperAdmin}
              onChange={(v) => user.updateKey('isAdmin', v)}
              label={t('Admin: can manage projects and team members')}
            />
            {isEnterprise ? (
              <Field label={t('Role')}>
                <SimpleSelect<string>
                  value={user.roleId != null ? String(user.roleId) : undefined}
                  placeholder={t('Select role')}
                  ariaLabel={t('Role')}
                  disabled={user.isSuperAdmin}
                  onChange={(v) => v && user.updateKey('roleId', Number(v))}
                  options={roles}
                />
              </Field>
            ) : null}
            {exists && isOwner ? (
              <Tooltip title={ownerHint}>
                <span className="self-start">
                  <Button
                    variant="subtle"
                    disabled={!canMakeOwner}
                    onClick={() => setConfirm('owner')}
                  >
                    <UserCog size={14} />
                    {t('Make owner')}
                  </Button>
                </span>
              </Tooltip>
            ) : null}
            {!user.isJoined && user.invitationLink ? (
              <Button
                variant="subtle"
                className="self-start"
                onClick={() => copy(user.invitationLink)}
              >
                <Link2 size={14} />
                {t('Copy invite link')}
              </Button>
            ) : null}
          </div>
        </Section>
      </EntityDrawer>
      <ConfirmDialog
        open={confirm === 'delete'}
        title={t('Remove {{name}}?', { name: user.name || user.email })}
        okText={t('Remove')}
        danger
        onCancel={() => setConfirm(null)}
        onOk={() => {
          setConfirm(null);
          void userStore.deleteUser(user.userId).then(() => {
            onClose();
            void userStore.fetchLimits();
          });
        }}
      >
        {t(
          'They lose access immediately. Nothing they recorded or bookmarked is deleted.',
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'owner'}
        title={t('Transfer ownership?')}
        okText={t('Yes, transfer')}
        onCancel={() => setConfirm(null)}
        onOk={() => {
          setConfirm(null);
          void userStore
            .makeOwner(user.userId)
            .then(() => userStore.fetchUsers())
            .then(onClose);
        }}
      >
        {t(
          'There can only be one owner account. By proceeding, the ownership will be transferred to {{name}}. You will lose your owner privileges.',
          { name: user.name },
        )}
      </ConfirmDialog>
    </>
  );
}

export default observer(UserForm);
