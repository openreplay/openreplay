import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { Chip } from '@/ui/data/Chip';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { Tooltip } from '@/ui/overlays/tooltip';
import withPageTitle from 'HOCs/withPageTitle';
import { Lock, Pencil, Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import { PrefList, PrefListRow } from '../PrefSection';
import PreferencesPage from '../PreferencesPage';
import RoleForm from './components/RoleForm';

const SHOWN = 4;

function Roles() {
  const { t } = useTranslation();
  const { roleStore, projectsStore, userStore } = useStore();
  const { account } = userStore;
  const isAdmin = account.admin || account.superAdmin;
  const [editing, setEditing] = React.useState(false);
  const projectNames: Record<string, string> = Object.fromEntries(
    projectsStore.list.map((p: any) => [p.id, p.name]),
  );
  const permissionNames: Record<string, string> = Object.fromEntries(
    roleStore.permissions.map((p: any) => [p.value, p.text]),
  );

  useEffect(() => {
    void roleStore.fetchRoles();
  }, []);

  const open = (role: any) => {
    roleStore.init(role);
    setEditing(true);
  };

  const addButton = (
    <Button variant="primary" disabled={!isAdmin} onClick={() => open({})}>
      <Plus size={14} />
      {t('Add role')}
    </Button>
  );

  return (
    <PreferencesPage
      title={t('Roles and Access')}
      flush
      actions={
        isAdmin ? (
          addButton
        ) : (
          <Tooltip
            title={t('You don’t have the permissions to perform this action.')}
          >
            <span>{addButton}</span>
          </Tooltip>
        )
      }
    >
      {roleStore.loading && roleStore.list.length === 0 ? (
        <SkeletonRows rows={3} columns={[30, 40, 30]} />
      ) : (
        <PrefList>
          {roleStore.list.map((role: any) => {
            const perms: string[] = role.permissions ?? [];
            return (
              <PrefListRow
                key={role.roleId}
                title={
                  <span className="m-roles__name">
                    {role.name}
                    {role.protected ? (
                      <Lock size={12} aria-label={t('Built-in role')} />
                    ) : null}
                  </span>
                }
                sub={
                  role.allProjects
                    ? t('All projects')
                    : (role.projects ?? [])
                        .map((p: string) => projectNames[p] ?? p)
                        .join(', ') || t('No projects')
                }
                meta={
                  <span className="m-roles__chips">
                    {perms.slice(0, SHOWN).map((p) => (
                      <Chip key={p} kind="tag">
                        {permissionNames[p] ?? p}
                      </Chip>
                    ))}
                    {perms.length > SHOWN ? (
                      <Chip kind="tag">+{perms.length - SHOWN}</Chip>
                    ) : null}
                  </span>
                }
                actions={
                  isAdmin ? (
                    <IconButton
                      icon={<Pencil size={14} />}
                      label={t('Edit {{name}}', { name: role.name })}
                      variant="ghost"
                      disabled={role.protected}
                      onClick={() => open(role)}
                    />
                  ) : null
                }
              />
            );
          })}
        </PrefList>
      )}
      <RoleForm open={editing} onClose={() => setEditing(false)} />
    </PreferencesPage>
  );
}

export default withPageTitle('Roles & Access - OpenReplay Preferences')(
  observer(Roles),
);
