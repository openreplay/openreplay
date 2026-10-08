import { IconButton } from '@/ui/actions/IconButton';
import { Chip } from '@/ui/data/Chip';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { SearchField } from '@/ui/inputs/SearchField';
import { ListFooter } from '@/ui/layout/ListFooter';
import withPageTitle from 'HOCs/withPageTitle';
import { Link2, Pencil, RefreshCw } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { checkForRecent } from 'App/date';
import { useStore } from 'App/mstore';
import { debounce, filterList, sliceListPerPage } from 'App/utils';

import { SessionAvatar } from 'Shared/SessionAvatar/SessionAvatar';

import { PrefList, PrefListRow } from '../PrefSection';
import PreferencesPage from '../PreferencesPage';
import AddUserButton from './components/AddUserButton';
import UserForm from './components/UserForm';

const seedOf = (s: string) =>
  [...(s || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function UsersView({ isOnboarding = false }: { isOnboarding?: boolean }) {
  const { t } = useTranslation();
  const { userStore, roleStore } = useStore();
  const { account, isEnterprise, loading } = userStore;
  const isAdmin = account.admin || account.superAdmin;
  const [editing, setEditing] = React.useState(false);
  const [query, setQuery] = React.useState(userStore.searchQuery);
  const pushQuery = React.useMemo(
    () =>
      debounce((v: string) => {
        userStore.updateKey('searchQuery', v);
        userStore.updateKey('page', 1);
      }, 300),
    [],
  );

  useEffect(() => {
    void userStore.fetchUsers();
    if (roleStore.list.length === 0 && isEnterprise)
      void roleStore.fetchRoles();
    return () => userStore.updateKey('page', 1);
  }, []);

  const users = userStore.list;
  const list: any[] =
    userStore.searchQuery !== ''
      ? filterList(users, userStore.searchQuery, ['email', 'roleName', 'name'])
      : users;
  const rows = sliceListPerPage(list, userStore.page - 1, userStore.pageSize);

  const open = (user: any = null) =>
    userStore.initUser(user).then(() => setEditing(true));

  const roleOf = (u: any) =>
    u.isSuperAdmin
      ? t('Owner')
      : (isEnterprise && u.roleName) || (u.isAdmin ? t('Admin') : t('Member'));

  return (
    <PreferencesPage
      title={t('Team')}
      value={t('{{n}} members', { n: users.length })}
      flush
      actions={
        <>
          {isOnboarding ? null : (
            <SearchField
              placeholder={t('Filter by name, email or role')}
              value={query}
              onChange={(v) => {
                setQuery(v);
                pushQuery(v);
              }}
            />
          )}
          <AddUserButton isAdmin={isAdmin} onClick={() => void open(null)} />
        </>
      }
    >
      {loading && users.length === 0 ? (
        <SkeletonRows rows={4} columns={[50, 30, 20]} />
      ) : list.length === 0 ? (
        <div className="m-pref__list-empty">
          <EmptyState
            title={
              userStore.searchQuery
                ? t('Nobody matches “{{q}}”', { q: userStore.searchQuery })
                : t('Nobody here yet')
            }
            hint={t('Try a name, an address or a role, or clear the search.')}
          />
        </div>
      ) : (
        <PrefList>
          {rows.map((u: any) => {
            const invited = !u.isJoined;
            return (
              <PrefListRow
                key={u.userId}
                lead={<SessionAvatar seed={seedOf(u.email)} size={26} />}
                title={u.name || u.email}
                sub={[
                  u.email,
                  invited
                    ? u.isExpiredInvite
                      ? t('invitation expired')
                      : t('invited')
                    : null,
                  !isOnboarding && u.createdAt
                    ? t('since {{date}}', {
                        date: checkForRecent(u.createdAt, 'LLL dd, yyyy'),
                      })
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                meta={
                  <>
                    <span className="m-pref__action-slot">
                      {invited && u.invitationLink && !u.isExpiredInvite ? (
                        <IconButton
                          icon={<Link2 size={14} />}
                          label={t('Copy invite link')}
                          variant="ghost"
                          onClick={() => userStore.copyInviteCode(u.userId)}
                        />
                      ) : null}
                      {invited && u.isExpiredInvite ? (
                        <IconButton
                          icon={<RefreshCw size={14} />}
                          label={t('Generate a new invite')}
                          variant="ghost"
                          onClick={() => userStore.generateInviteCode(u.userId)}
                        />
                      ) : null}
                    </span>
                    <Chip kind="tag">{roleOf(u)}</Chip>
                  </>
                }
                actions={
                  <IconButton
                    icon={<Pencil size={14} />}
                    label={t('Edit {{name}}', { name: u.name || u.email })}
                    variant="ghost"
                    onClick={() => void open(u)}
                  />
                }
              />
            );
          })}
        </PrefList>
      )}
      {list.length > userStore.pageSize ? (
        <ListFooter
          page={userStore.page}
          pageSize={userStore.pageSize}
          total={list.length}
          noun={[t('member'), t('members')]}
          onPage={(p) => userStore.updateKey('page', p)}
        />
      ) : null}
      <UserForm open={editing} onClose={() => setEditing(false)} />
    </PreferencesPage>
  );
}

export default withPageTitle('Team - OpenReplay Preferences')(
  observer(UsersView),
);
