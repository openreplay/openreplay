import { Button } from '@/ui/actions/button';
import { Input } from '@/ui/inputs/input';
import { PasswordInput } from '@/ui/inputs/password-input';
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

interface Props {
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function WebhookForm({ open, onClose, onDelete }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const { settingsStore } = useStore();
  const {
    webhookInst: webhook,
    saveWebhook,
    editWebhook,
    saving,
  } = settingsStore;
  if (!webhook) return null;
  const exists = webhook.exists();

  const save = () =>
    saveWebhook(webhook)
      .then(() => {
        toast.success(t('Webhook saved'));
        onClose();
      })
      .catch((e: any) =>
        toast.error(e?.message || t('Failed to save webhook')),
      );

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      eyebrow={t('Webhook')}
      title={exists ? webhook.name : t('New webhook')}
      footer={
        <DrawerFooter
          left={
            exists ? (
              <Button
                variant="danger-outline"
                onClick={() => onDelete(webhook.webhookId)}
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
                disabled={!webhook.validate() || saving}
                onClick={() => void save()}
              >
                {exists ? t('Update') : t('Add')}
              </Button>
            </>
          }
        />
      }
    >
      <Section title={t('Where it goes')}>
        <Field label={t('Name')}>
          <Input
            value={webhook.name ?? ''}
            placeholder={t('Deploy notifier')}
            maxLength={50}
            onChange={(e) => editWebhook({ name: e.target.value })}
          />
        </Field>
        <Field label={t('Endpoint')}>
          <Input
            value={webhook.endpoint ?? ''}
            placeholder="https://hooks.acme.com/openreplay"
            onChange={(e) => editWebhook({ endpoint: e.target.value })}
          />
        </Field>
      </Section>
      <Section
        title={t('Authentication')}
        hint={t('Optional. Sent as an Authorization header on every call.')}
      >
        <Field label={t('Auth header')}>
          {/* a credential: masked (with a reveal toggle) so a screen share doesn't leak it */}
          <PasswordInput
            value={webhook.authHeader ?? ''}
            placeholder="Bearer …"
            autoComplete="new-password"
            onChange={(e) => editWebhook({ authHeader: e.target.value })}
          />
        </Field>
      </Section>
    </EntityDrawer>
  );
}

export default observer(WebhookForm);
