import { Button } from '@/ui/actions/button';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { Input } from '@/ui/inputs/input';
import { MultiSelect } from '@/ui/inputs/multi-select';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import {
  DrawerFooter,
  EntityDrawer,
  Field,
  Section,
} from '@/ui/overlays/EntityDrawer';
import { useToast } from '@/ui/overlays/toast';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import { PrefToggle } from '../../../PrefSection';

/** A role: its name, which projects it reaches and what it may do there. */
function RoleForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { roleStore, projectsStore } = useStore();
  const role: any = roleStore.instance;
  const [deleting, setDeleting] = React.useState(false);
  if (!role) return null;
  const exists = role.exists();
  const perms: string[] = role.permissions ?? [];

  const save = () =>
    roleStore
      .saveRole(role)
      .then(() => {
        toast.success(exists ? t('Role updated') : t('Role created'));
        onClose();
      })
      .catch(() => toast.error(t('Could not save the role')));

  const togglePerm = (value: string) =>
    roleStore.editRole({
      permissions: perms.includes(value)
        ? perms.filter((p) => p !== value)
        : [...perms, value],
    });

  return (
    <>
      <EntityDrawer
        open={open}
        onClose={onClose}
        eyebrow={t('Role')}
        title={role.name || t('New role')}
        onTitleChange={(name) => roleStore.editRole({ name })}
        autoEditTitle={!exists}
        namePlaceholder={t('Ex. Support')}
        footer={
          <DrawerFooter
            left={
              exists ? (
                <Button
                  variant="danger-outline"
                  onClick={() => setDeleting(true)}
                >
                  {t('Delete')}
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
                  disabled={!role.validate || roleStore.loading}
                  onClick={() => void save()}
                >
                  {exists ? t('Update') : t('Add')}
                </Button>
              </>
            }
          />
        }
      >
        <Section title={t('Projects')}>
          <PrefToggle
            checked={!!role.allProjects}
            onChange={(v) => roleStore.editRole({ allProjects: v })}
            label={t('All projects, including new ones')}
          />
          {!role.allProjects ? (
            <Field label={t('Only these')}>
              <MultiSelect<string>
                value={(role.projects ?? []).map(String)}
                onChange={(ids) =>
                  roleStore.editRole({ projects: ids.map(Number) as any })
                }
                ariaLabel={t('Projects')}
                placeholder={t('Select projects')}
                options={projectsStore.list.map((p: any) => ({
                  value: String(p.projectId),
                  label: p.name,
                }))}
              />
            </Field>
          ) : null}
        </Section>
        <Section
          title={t('Capabilities')}
          hint={t('What members with this role may open.')}
        >
          <div className="m-checklist">
            {roleStore.permissions.map((p: any) => (
              <CheckRow
                key={p.value}
                on={perms.includes(p.value)}
                onToggle={() => togglePerm(p.value)}
              >
                {p.text}
              </CheckRow>
            ))}
          </div>
        </Section>
      </EntityDrawer>
      <ConfirmDialog
        open={deleting}
        title={t('Delete {{name}}?', { name: role.name })}
        okText={t('Delete')}
        danger
        onCancel={() => setDeleting(false)}
        onOk={() => {
          setDeleting(false);
          roleStore
            .deleteRole(role.roleId)
            .then(onClose)
            .catch(() => toast.error(t('Could not delete the role')));
        }}
      >
        {t('Members with this role lose what it gave them.')}
      </ConfirmDialog>
    </>
  );
}

export default observer(RoleForm);
