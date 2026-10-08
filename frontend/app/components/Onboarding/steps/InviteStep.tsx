import { useCopy } from '@/lib/use-copy';
import { Button } from '@/ui/actions/button';
import { Chip } from '@/ui/data/Chip';
import { Input } from '@/ui/inputs/input';
import { SimpleSelect } from '@/ui/inputs/select';
import { Tooltip } from '@/ui/overlays/tooltip';
import { Check, Info, Link2, Plus, X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { validateEmail } from 'App/validate';

export interface Invite {
  id: number;
  name: string;
  email: string;
  admin: boolean;
  roleId?: number;
  invitationLink?: string;
}

export const canSend = (i: Invite) => validateEmail(i.email.trim());

/** Rows of people; they are invited when setup finishes. */
function InviteStep({
  rows,
  onRows,
  invited,
}: {
  rows: Invite[];
  onRows: (next: Invite[]) => void;
  invited: Invite[];
}) {
  const { t } = useTranslation();
  const { userStore, roleStore } = useStore();
  const { isEnterprise } = userStore;
  const sendable = rows.filter(canSend).length;

  React.useEffect(() => {
    if (isEnterprise && roleStore.list.length === 0)
      void roleStore.fetchRoles();
  }, [isEnterprise]);

  const update = (id: number, patch: Partial<Invite>) =>
    onRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: number) => {
    const next = rows.filter((r) => r.id !== id);
    onRows(next.length ? next : [newInvite()]);
  };

  const roleOptions = isEnterprise
    ? roleStore.list.map((r: any) => ({
        value: String(r.roleId),
        label: r.name,
      }))
    : [
        { value: 'member', label: t('Member') },
        { value: 'admin', label: t('Admin') },
      ];

  return (
    <div className="m-ob__stack">
      <div
        className="m-ob__invites"
        role="group"
        aria-label={t('People to invite')}
      >
        <div className="m-ob__invite-head">
          <span aria-hidden="true">{t('Name')}</span>
          <span aria-hidden="true">{t('Email')}</span>
          <span className="m-ob__invite-col">
            <span aria-hidden="true">{t('Role')}</span>
            {!isEnterprise && (
              <Tooltip
                title={t(
                  'Admins can manage projects and team members. Members can watch, search and comment.',
                )}
              >
                <button
                  type="button"
                  className="m-ob__hint-btn m-hover"
                  aria-label={t('What a role can do')}
                >
                  <Info size={12} aria-hidden="true" />
                </button>
              </Tooltip>
            )}
          </span>
          <span />
        </div>
        {rows.map((r) => {
          const bad = r.email.length > 0 && !canSend(r);
          return (
            <div key={r.id} className="m-ob__invite-row">
              <Input
                value={r.name}
                onChange={(e) => update(r.id, { name: e.target.value })}
                placeholder={t('Name')}
                aria-label={t('Name')}
                autoComplete="off"
              />
              <Input
                type="email"
                value={r.email}
                onChange={(e) => update(r.id, { email: e.target.value })}
                placeholder="name@company.com"
                aria-label={t('Email address')}
                aria-invalid={bad || undefined}
                autoComplete="off"
              />
              <SimpleSelect<string>
                value={
                  isEnterprise
                    ? r.roleId != null
                      ? String(r.roleId)
                      : undefined
                    : r.admin
                      ? 'admin'
                      : 'member'
                }
                placeholder={t('Role')}
                onChange={(v) =>
                  v &&
                  update(
                    r.id,
                    isEnterprise
                      ? { roleId: Number(v) }
                      : { admin: v === 'admin' },
                  )
                }
                options={roleOptions}
                ariaLabel={t('Role')}
              />
              <button
                type="button"
                className={`m-ob__row-x m-hover${rows.length > 1 || r.email || r.name ? '' : ' is-hidden'}`}
                onClick={() => remove(r.id)}
                aria-label={t('Remove this row')}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
        <div className="m-ob__invite-actions">
          <Button
            variant="subtle"
            onClick={() => onRows([...rows, newInvite()])}
          >
            <Plus size={14} />
            {t('Add another')}
          </Button>
          <span className="m-ob__when" role="status">
            {sendable === 0
              ? t('Invitations go out when you finish setup.')
              : sendable === 1
                ? t('One invitation goes out when you finish setup.')
                : t('{{n}} invitations go out when you finish setup.', {
                    n: sendable,
                  })}
          </span>
        </div>
      </div>

      {invited.length > 0 && (
        <ul className="m-ob__sent m-step-in" aria-label={t('Invited')}>
          {invited.map((i) => (
            <SentRow key={i.id} invite={i} />
          ))}
        </ul>
      )}
    </div>
  );
}

let seq = 0;
export const newInvite = (): Invite => ({
  id: (seq += 1),
  name: '',
  email: '',
  admin: false,
});

function SentRow({ invite }: { invite: Invite }) {
  const { t } = useTranslation();
  const { copy, done } = useCopy();
  return (
    <li className="m-ob__sent-row">
      <span className="m-ob__sent-who">
        <span className="m-ob__sent-name">
          {invite.name.trim() || invite.email}
        </span>
        {invite.name.trim() && (
          <span className="m-ob__muted">{invite.email}</span>
        )}
      </span>
      {invite.admin && <Chip kind="tag">{t('Admin')}</Chip>}
      <Chip tone="success" kind="status">
        {t('Invited')}
      </Chip>
      {invite.invitationLink && (
        <button
          type="button"
          className="m-ob__link-copy m-hover"
          onClick={() => void copy(invite.invitationLink!)}
        >
          {done ? <Check size={13} className="m-mark" /> : <Link2 size={13} />}
          {done ? t('Copied') : t('Invite link')}
        </button>
      )}
    </li>
  );
}

export default observer(InviteStep);
