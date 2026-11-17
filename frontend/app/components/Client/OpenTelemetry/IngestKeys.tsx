import usePageTitle from '@/hooks/usePageTitle';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { Chip } from '@/ui/data/Chip';
import { CodeBlock } from '@/ui/data/CodeBlock';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { RenameDialog } from '@/ui/overlays/RenameDialog';
import { Modal } from '@/ui/overlays/modal';
import { useToast } from '@/ui/overlays/toast';
import { Ban, KeyRound } from 'lucide-react';
import { DateTime } from 'luxon';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { type IngestKey, OTLP_LOGS_PATH } from 'App/services/IngestKeysService';
import { ingestPoint } from 'Components/Onboarding/install';

import { PrefBlock, PrefList, PrefListRow } from '../PrefSection';

const SAAS_INGEST = 'https://api.openreplay.com/ingest';

export const otlpLogsEndpoint = () =>
  `${window.location.hostname === 'app.openreplay.com' ? SAAS_INGEST : ingestPoint()}${OTLP_LOGS_PATH}`;

const day = (iso: string) =>
  DateTime.fromISO(iso).toLocaleString(DateTime.DATE_MED);

function IngestKeys() {
  const { t } = useTranslation();
  const toast = useToast();
  const { otelLogsStore, projectsStore } = useStore();
  const { ingestKeys: keys, ingestKeysLoading: loading } = otelLogsStore;
  const [naming, setNaming] = useState(false);
  const [created, setCreated] = useState<IngestKey | null>(null);
  const [revoking, setRevoking] = useState<IngestKey | null>(null);
  usePageTitle('OpenTelemetry - OpenReplay Preferences');
  const siteId = projectsStore.siteId;

  useEffect(() => {
    otelLogsStore
      .fetchIngestKeys()
      .catch(() => toast.error(t('Could not load the ingest keys')));
  }, [siteId]);

  const create = (name: string) => {
    setNaming(false);
    otelLogsStore
      .createIngestKey(name)
      .then(setCreated)
      .catch(() => toast.error(t('Could not create the key')));
  };

  const revoke = (key: IngestKey) =>
    otelLogsStore
      .revokeIngestKey(key.keyId)
      .then(() => toast.success(t('Key revoked')))
      .catch(() => toast.error(t('Could not revoke the key')));

  const endpoint = otlpLogsEndpoint();
  const env = [
    `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=${endpoint}`,
    'OTEL_EXPORTER_OTLP_LOGS_PROTOCOL=http/protobuf',
    'OTEL_EXPORTER_OTLP_LOGS_HEADERS=Authorization=Bearer <ingest key>',
  ].join('\n');

  return (
    <>
      <PrefBlock
        title={t('Endpoint')}
        hint={t(
          'Point any OpenTelemetry SDK or collector here over OTLP/HTTP, with one of the keys below. Logs show up in Observability > Logs for this project.',
        )}
      >
        <CodeBlock code={env} language="bash" />
      </PrefBlock>
      <PrefBlock
        flush
        title={t('Ingest keys')}
        hint={t(
          'Each key sends logs to this project only. Revoke a key to stop accepting what is sent with it.',
        )}
        actions={
          <Button variant="primary" onClick={() => setNaming(true)}>
            {t('Create key')}
          </Button>
        }
      >
        {loading && keys.length === 0 ? (
          <SkeletonRows rows={3} columns={[60, 40]} />
        ) : keys.length === 0 ? (
          <EmptyState
            art="frame"
            title={t('No ingest keys yet')}
            hint={t(
              'Create one for each service or collector that sends logs, so you can revoke them one by one.',
            )}
          />
        ) : (
          <PrefList>
            {keys.map((k) => (
              <PrefListRow
                key={k.keyId}
                lead={<KeyRound size={15} className="m-pref__proj-icon" />}
                title={k.name}
                sub={
                  k.revokedAt
                    ? t(
                        '{{prefix}}… · created {{created}} · revoked {{revoked}}',
                        {
                          prefix: k.prefix,
                          created: day(k.createdAt),
                          revoked: day(k.revokedAt),
                        },
                      )
                    : t('{{prefix}}… · created {{created}}', {
                        prefix: k.prefix,
                        created: day(k.createdAt),
                      })
                }
                meta={k.revokedAt ? <Chip>{t('Revoked')}</Chip> : undefined}
                actions={
                  k.revokedAt ? undefined : (
                    <IconButton
                      icon={<Ban size={14} />}
                      label={t('Revoke {{name}}', { name: k.name })}
                      variant="ghost"
                      onClick={() => setRevoking(k)}
                    />
                  )
                }
              />
            ))}
          </PrefList>
        )}
      </PrefBlock>
      <RenameDialog
        open={naming}
        title={t('New ingest key')}
        value=""
        okText={t('Create')}
        placeholder={t('Name, e.g. checkout-api')}
        onOk={create}
        onCancel={() => setNaming(false)}
      />
      <Modal
        open={created != null}
        title={t('Key created')}
        onCancel={() => setCreated(null)}
        width={520}
        footer={
          <Button variant="primary" onClick={() => setCreated(null)}>
            {t('Done')}
          </Button>
        }
      >
        <p className="m-dlg__lede">
          {t('Copy it now: this is the only time the full key is shown.')}
        </p>
        <CodeBlock code={created?.key ?? ''} />
      </Modal>
      <ConfirmDialog
        open={revoking != null}
        title={t('Revoke {{name}}?', { name: revoking?.name ?? '' })}
        okText={t('Revoke')}
        danger
        onCancel={() => setRevoking(null)}
        onOk={() => {
          const k = revoking;
          setRevoking(null);
          if (k) void revoke(k);
        }}
      >
        {t(
          'Logs sent with this key are refused from now on. This cannot be undone.',
        )}
      </ConfirmDialog>
    </>
  );
}

export default observer(IngestKeys);
