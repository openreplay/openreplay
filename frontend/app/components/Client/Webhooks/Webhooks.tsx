import usePageTitle from '@/hooks/usePageTitle';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { useToast } from '@/ui/overlays/toast';
import { IWebhook } from 'Types/webhook';
import { Trash2, Webhook as WebhookIcon } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import { PrefBlock, PrefList, PrefListRow } from '../PrefSection';
import WebhookForm from './WebhookForm';

function Webhooks() {
  const { t } = useTranslation();
  const toast = useToast();
  const { settingsStore } = useStore();
  const { webhooks, hooksLoading: loading } = settingsStore;
  const [editing, setEditing] = React.useState(false);
  const [deleting, setDeleting] = React.useState<any | null>(null);
  usePageTitle('Webhooks - OpenReplay Preferences');
  const custom = webhooks.filter((h) => h.type === 'webhook');

  useEffect(() => {
    void settingsStore.fetchWebhooks();
  }, []);

  const open = (w?: Partial<IWebhook>) => {
    settingsStore.initWebhook({ ...w });
    setEditing(true);
  };

  const remove = (id: string) =>
    settingsStore
      .removeWebhook(id)
      .then(() => toast.success(t('Webhook removed successfully')))
      .catch(() => toast.error(t('Could not remove the webhook')));

  return (
    <>
      <PrefBlock
        flush
        title={t('Endpoints')}
        hint={t(
          'An alert can call any of these when it fires. OpenReplay posts the alert as JSON.',
        )}
        actions={
          <Button variant="primary" onClick={() => open()}>
            {t('Add webhook')}
          </Button>
        }
      >
        {loading && custom.length === 0 ? (
          <SkeletonRows rows={3} columns={[60, 40]} />
        ) : custom.length === 0 ? (
          <EmptyState
            art="frame"
            title={t('No endpoints yet')}
            hint={t(
              'Add one, then pick it on an alert. OpenReplay posts there the moment the alert fires.',
            )}
          />
        ) : (
          <PrefList>
            {custom.map((w) => (
              <PrefListRow
                key={w.webhookId}
                lead={<WebhookIcon size={15} className="m-pref__proj-icon" />}
                title={w.name}
                sub={w.endpoint}
                actions={
                  <>
                    <Button variant="subtle" size="sm" onClick={() => open(w)}>
                      {t('Edit')}
                    </Button>
                    <IconButton
                      icon={<Trash2 size={14} />}
                      label={t('Delete {{name}}', { name: w.name })}
                      variant="ghost"
                      onClick={() => setDeleting(w)}
                    />
                  </>
                }
              />
            ))}
          </PrefList>
        )}
      </PrefBlock>
      <WebhookForm
        open={editing}
        onClose={() => setEditing(false)}
        onDelete={(id) => {
          setEditing(false);
          setDeleting(custom.find((w) => w.webhookId === id) ?? null);
        }}
      />
      <ConfirmDialog
        open={deleting != null}
        title={t('Delete {{name}}?', { name: deleting?.name ?? '' })}
        okText={t('Delete')}
        danger
        onCancel={() => setDeleting(null)}
        onOk={() => {
          const w = deleting;
          setDeleting(null);
          if (w) void remove(w.webhookId);
        }}
      >
        {t('Alerts that call it stop notifying this endpoint.')}
      </ConfirmDialog>
    </>
  );
}

export default observer(Webhooks);
