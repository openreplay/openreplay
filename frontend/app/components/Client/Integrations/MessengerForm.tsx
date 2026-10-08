import { Button } from '@/ui/actions/button';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { Notice } from '@/ui/feedback/Notice';
import { Field } from '@/ui/inputs/Field';
import { Input } from '@/ui/inputs/input';
import {
  DrawerFooter,
  DrawerHeader,
  Section,
} from '@/ui/overlays/EntityDrawer';
import { confirm } from '@/ui/overlays/confirm';
import { ExternalLink, Pencil, Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';

import './messenger-form.css';

const COPY = {
  slack: {
    title: 'Slack',
    docs: 'https://docs.openreplay.com/integrations/slack',
    placeholder: 'Slack webhook URL',
  },
  msteams: {
    title: 'Microsoft Teams',
    docs: 'https://docs.openreplay.com/integrations/msteams',
    placeholder: 'Teams webhook URL',
  },
} as const;

/** Webhook channels for Slack or Teams: the list, and one channel's form beside it. */
function MessengerForm({ kind }: { kind: 'slack' | 'msteams' }) {
  const { t } = useTranslation();
  const { hideModal } = useModal();
  const { integrationsStore } = useStore();
  const store = integrationsStore[kind];
  const { list, instance, loading, errors } = store;
  const [editing, setEditing] = React.useState(false);
  const copy = COPY[kind];

  useEffect(() => {
    void store.fetchIntegrations();
    return () => store.init({});
  }, [kind]);

  const open = (data: Record<string, any>) => {
    if (data.webhookId) store.edit(data);
    else store.init({});
    setEditing(true);
  };
  const close = () => {
    store.init({});
    setEditing(false);
  };
  const save = async () => {
    const ok = instance?.exists()
      ? await store.update()
      : await store.saveIntegration();
    // on a failure the store has toasted; keep what was typed
    if (ok) close();
  };
  const remove = async () => {
    if (!instance?.webhookId) return;
    const ok = await confirm({
      header: t('Delete channel'),
      confirmButton: t('Delete'),
      confirmation: t('Notes and issues can no longer be shared to {{name}}.', {
        name: instance.name,
      }),
      danger: true,
    });
    if (!ok) return;
    await store.removeInt(instance.webhookId);
    close();
  };

  const description =
    kind === 'slack'
      ? t('Share sessions and notes with your team in Slack channels.')
      : t('Share sessions and notes with your team in Teams channels.');

  return (
    <div className="m-drawer__pane">
      <header className="m-drawer__head">
        <DrawerHeader
          title={copy.title}
          meta={
            <p className="m-msgr__lede">
              {description}{' '}
              <a href={copy.docs} target="_blank" rel="noreferrer">
                {t('Docs')}
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            </p>
          }
          actions={
            !editing && (
              <Button size="sm" onClick={() => open({})}>
                <Plus size={14} />
                {t('Add channel')}
              </Button>
            )
          }
          onClose={hideModal}
        />
      </header>
      <div className="m-drawer__body">
        {editing && instance ? (
          <Section
            title={instance.exists() ? t('Edit channel') : t('New channel')}
          >
            <div className="m-msgr__fields">
              <Field label={t('Name')}>
                {(id) => (
                  <Input
                    id={id}
                    autoFocus
                    value={instance.name}
                    placeholder={t('Any name, e.g. #product')}
                    onChange={(e) => store.edit({ name: e.target.value })}
                  />
                )}
              </Field>
              <Field label={t('Webhook URL')}>
                {(id) => (
                  <Input
                    id={id}
                    value={instance.endpoint}
                    placeholder={copy.placeholder}
                    onChange={(e) => store.edit({ endpoint: e.target.value })}
                  />
                )}
              </Field>
              {errors?.length > 0 && (
                <Notice kind="danger">{errors.join(' ')}</Notice>
              )}
            </div>
          </Section>
        ) : list.length === 0 ? (
          <EmptyState
            title={t('No channels yet')}
            hint={t('Add a channel’s incoming webhook to share to it.')}
          />
        ) : (
          <ul className="m-msgr__list">
            {list.map((c: any) => (
              <li key={c.webhookId}>
                <button
                  type="button"
                  className="m-msgr__row"
                  onClick={() => open(c.toData())}
                >
                  <span className="m-msgr__name">{c.name}</span>
                  <span className="m-msgr__url m-mono m-truncate">
                    {c.endpoint}
                  </span>
                  <Pencil size={13} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {editing && instance && (
        <footer className="m-drawer__foot">
          <DrawerFooter
            left={
              instance.exists() && (
                <Button variant="danger-subtle" onClick={remove}>
                  {t('Delete')}
                </Button>
              )
            }
            right={
              <>
                <Button variant="subtle" onClick={close}>
                  {t('Cancel')}
                </Button>
                <Button
                  onClick={save}
                  loading={loading}
                  disabled={!instance.validate()}
                >
                  {instance.exists() ? t('Save') : t('Add channel')}
                </Button>
              </>
            }
          />
        </footer>
      )}
    </div>
  );
}

export default observer(MessengerForm);
