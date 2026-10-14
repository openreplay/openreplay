import { Button } from '@/ui/actions/button';
import { Loader } from '@/ui/feedback/Loader';
import { Input } from '@/ui/inputs/input';
import { PasswordInput } from '@/ui/inputs/password-input';
import { DrawerFooter, Field } from '@/ui/overlays/EntityDrawer';
import { confirm } from '@/ui/overlays/confirm';
import { toast } from '@/ui/overlays/toast';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import type { namedStore } from 'App/mstore/integrationsStore';

import { IntegrationPane } from './IntegrationPane';

export interface TrackerField {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
}

interface Props {
  name: 'jira' | 'github' | 'linear';
  title: string;
  icon: string;
  blurb: string;
  docs: string;
  fields: TrackerField[];
  integrated?: boolean;
  onClose?: () => void;
}

/** An issue tracker's panel: one connection for the whole workspace. */
function IssueTrackerDrawer({
  name,
  title,
  icon,
  blurb,
  docs,
  fields,
  integrated,
  onClose = () => {},
}: Props) {
  const { t } = useTranslation();
  const { integrationsStore } = useStore();
  const store = integrationsStore[name as namedStore] as any;
  const config = store.instance;
  const { siteId } = integrationsStore.integrations;
  const refresh = () =>
    void integrationsStore.integrations.fetchIntegrations(siteId);

  const [saving, setSaving] = React.useState(false);
  const save = async () => {
    setSaving(true);
    const res = await store
      .saveIntegration(name)
      .finally(() => setSaving(false));
    if (res?.errors?.length) {
      toast.error(res.errors.join(', '));
      return;
    }
    toast.success(t('{{name}} connected', { name: title }));
    refresh();
    onClose();
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
    await store.deleteIntegration();
    refresh();
    onClose();
  };

  const exists = integrated || !!config?.exists?.();
  return (
    <IntegrationPane
      category={t('Issue reporting')}
      title={title}
      icon={icon}
      blurb={blurb}
      docs={docs}
      onClose={onClose}
      projects={
        <p className="m-int__scope">
          {t('Every project: one connection serves the whole workspace.')}
        </p>
      }
      footer={
        <DrawerFooter
          left={
            exists ? (
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
                disabled={!config?.validate?.()}
                loading={saving}
              >
                {exists ? t('Save') : t('Connect')}
              </Button>
            </>
          }
        />
      }
    >
      <Loader loading={store.loading}>
        {fields.map((f, i) => (
          <Field key={f.key} label={f.label}>
            {f.secret ? (
              <PasswordInput
                value={config?.[f.key] ?? ''}
                placeholder={f.placeholder}
                autoComplete="off"
                autoFocus={i === 0}
                onChange={(e) => store.edit({ [f.key]: e.target.value })}
              />
            ) : (
              <Input
                value={config?.[f.key] ?? ''}
                placeholder={f.placeholder}
                autoComplete="off"
                autoFocus={i === 0}
                onChange={(e) => store.edit({ [f.key]: e.target.value })}
              />
            )}
          </Field>
        ))}
      </Loader>
    </IntegrationPane>
  );
}

export default observer(IssueTrackerDrawer);
