import { Button } from '@/ui/actions/button';
import { Loader } from '@/ui/feedback/Loader';
import { Input } from '@/ui/inputs/input';
import { MultiSelect } from '@/ui/inputs/multi-select';
import { PasswordInput } from '@/ui/inputs/password-input';
import { DrawerFooter, Field } from '@/ui/overlays/EntityDrawer';
import { confirm } from '@/ui/overlays/confirm';
import { toast } from '@/ui/overlays/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { client, useStore } from 'App/mstore';

import { IntegrationPane } from './IntegrationPane';
import { type ServiceName, getIntegrationData } from './apiMethods';

export interface BackendField {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  optional?: boolean;
}

interface Props {
  name: ServiceName;
  title: string;
  icon: string;
  useIcon?: boolean;
  blurb: string;
  docs: string;
  fields: BackendField[];
  initialValues: Record<string, string>;
  /** the field a saved connection always has */
  existsKey: string;
  onClose?: () => void;
}

type Scope = Record<string, Record<string, string> | null>;

/** Which projects hold this connection, and with what. */
export const integrationScopeKey = (name: string) => ['integrationScope', name];

async function readScope(name: ServiceName, ids: string[], existsKey: string) {
  const entries = await Promise.all(
    ids.map(async (id) => {
      const data = await getIntegrationData<Record<string, string>>(
        name,
        id,
      ).catch(() => null);
      return [id, data && data[existsKey] ? data : null] as const;
    }),
  );
  return Object.fromEntries(entries) as Scope;
}

/** A backend log source's panel: one connection, as many projects as it covers. */
function BackendIntegrationDrawer({
  name,
  title,
  icon,
  useIcon,
  blurb,
  docs,
  fields,
  initialValues,
  existsKey,
  onClose = () => {},
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { projectsStore, integrationsStore } = useStore();
  const projects = projectsStore.list.map((p) => ({
    id: String(p.projectId),
    name: p.name,
  }));
  const ids = projects.map((p) => p.id);

  const { data: scope, isPending } = useQuery({
    queryKey: [...integrationScopeKey(name), ids],
    queryFn: () => readScope(name, ids, existsKey),
  });
  const connected = ids.filter((id) => scope?.[id]);

  const sameAs = (
    a: Record<string, string> | null | undefined,
    b: Record<string, string> | null | undefined,
  ) => fields.every((f) => (a?.[f.key] ?? '') === (b?.[f.key] ?? ''));
  const nameOf = (id: string) => projects.find((p) => p.id === id)?.name ?? id;

  const [values, setValues] = React.useState<Record<string, string>>();
  const [covered, setCovered] = React.useState<string[]>();
  /* the projects holding the connection the form shows: projects connected
     with other credentials are another connection and stay untouched */
  const [group, setGroup] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (!scope || values) return;
    const active = String(integrationsStore.integrations.siteId || ids[0]);
    const source = scope[active] ? active : connected[0];
    const base = source ? scope[source] : null;
    setValues({ ...initialValues, ...(base ?? {}) });
    const holders = base
      ? connected.filter((id) => sameAs(scope[id], base))
      : [];
    setGroup(holders);
    setCovered(holders.length ? holders : [active]);
  }, [scope]);

  const [saving, setSaving] = React.useState(false);
  const complete = fields.every(
    (f) => f.optional || (values?.[f.key] ?? '').trim().length > 0,
  );
  const valid = complete && (covered?.length ?? 0) > 0;

  const done = () => {
    void queryClient.invalidateQueries({ queryKey: integrationScopeKey(name) });
    void queryClient.invalidateQueries({ queryKey: ['integrationData'] });
    void integrationsStore.integrations.fetchIntegrations(
      integrationsStore.integrations.siteId,
    );
  };

  const save = async () => {
    if (!values || !covered) return;
    const replaced = covered.filter((id) => scope?.[id] && !group.includes(id));
    if (
      replaced.length &&
      !(await confirm({
        header: t('Replace the credentials in {{n}} projects?', {
          n: replaced.length,
          count: replaced.length,
        }),
        confirmButton: t('Replace'),
        confirmation: t(
          '{{names}} connect to {{name}} with different credentials. Saving replaces them with these.',
          {
            names: replaced.map(nameOf).join(', '),
            name: title,
            count: replaced.length,
          },
        ),
        danger: true,
      }))
    )
      return;
    setSaving(true);
    const dropped = group.filter((id) => !covered.includes(id));
    try {
      await Promise.all([
        ...covered.map((id) =>
          client[scope?.[id] ? 'patch' : 'post'](`/${id}/integration/${name}`, {
            data: values,
          }),
        ),
        ...dropped.map((id) => client.delete(`/${id}/integration/${name}`)),
      ]);
      toast.success(t('{{name}} connected', { name: title }));
      done();
      onClose();
    } catch (e: any) {
      const status = (e?.cause ?? e?.response)?.status;
      toast.error(
        status === 422
          ? t('{{name}} did not accept these credentials', { name: title })
          : t('Failed to save {{name}}', { name: title }),
      );
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    const ok = await confirm({
      header: t('Disconnect {{name}}?', { name: title }),
      confirmButton: t('Disconnect'),
      confirmation: t(
        'Your credentials are removed from OpenReplay. Anything already created over there stays where it is.',
      ),
      danger: true,
    });
    if (!ok) return;
    await Promise.all(
      group.map((id) => client.delete(`/${id}/integration/${name}`)),
    ).catch(() => toast.error(t('Failed to remove {{name}}', { name: title })));
    done();
    onClose();
  };

  return (
    <IntegrationPane
      category={t('Backend logging')}
      title={title}
      icon={icon}
      useIcon={useIcon}
      blurb={blurb}
      docs={docs}
      onClose={onClose}
      projects={
        <MultiSelect
          value={covered ?? []}
          onChange={setCovered}
          ariaLabel={t('Projects this integration covers')}
          placeholder={t('Pick at least one')}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
        />
      }
      footer={
        <DrawerFooter
          left={
            group.length ? (
              <Button variant="danger-subtle" onClick={() => void disconnect()}>
                {t('Disconnect')}
              </Button>
            ) : undefined
          }
          right={
            <>
              <Button variant="subtle" onClick={onClose}>
                {t('Cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={() => void save()}
                disabled={!valid}
                loading={saving}
              >
                {group.length ? t('Save') : t('Connect')}
              </Button>
            </>
          }
        />
      }
    >
      <Loader loading={isPending}>
        <div className="m-int__fields">
          {fields.map((f, i) => {
            const props = {
              value: values?.[f.key] ?? '',
              placeholder: f.placeholder,
              autoComplete: 'off',
              autoFocus: i === 0,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                setValues((v) => ({ ...v, [f.key]: e.target.value })),
            };
            return (
              <Field key={f.key} label={f.label}>
                {f.secret ? <PasswordInput {...props} /> : <Input {...props} />}
              </Field>
            );
          })}
        </div>
      </Loader>
    </IntegrationPane>
  );
}

export default observer(BackendIntegrationDrawer);
