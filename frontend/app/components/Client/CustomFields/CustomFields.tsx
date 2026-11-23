import usePageTitle from '@/hooks/usePageTitle';
import { CopyButton } from '@/ui/actions/CopyButton';
import { ExternalLink } from '@/ui/actions/ExternalLink';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { CodeBlock } from '@/ui/data/CodeBlock';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { Input } from '@/ui/inputs/input';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { RenameDialog } from '@/ui/overlays/RenameDialog';
import { useToast } from '@/ui/overlays/toast';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import CustomField from 'App/mstore/types/customField';

import { ExampleChip } from 'Shared/ExampleChip/ExampleChip';

import { PrefBlock, PrefField, PrefList, PrefListRow } from '../PrefSection';
import { useMetadataKeys, useMetadataMutations } from '../Projects/queries';

const MAX = 10;
const EXAMPLES = ['plan', 'accountId', 'role', 'company', 'tier'];
const KEY_RE = /^[A-Za-z_][\w.-]*$/;

const snippetFor = (platform: string, keys: string[]) =>
  keys
    .map((k) =>
      platform === 'web'
        ? `tracker.setMetadata('${k}', value);`
        : `ORTracker.shared.setMetadata(key: "${k}", value: value)`,
    )
    .join('\n');

/** A project's metadata keys: declared here, sent from the tracker. */
function CustomFields() {
  usePageTitle('Metadata - OpenReplay Preferences');
  const { t } = useTranslation();
  const toast = useToast();
  const { projectsStore } = useStore();
  const project = projectsStore.config.project;
  const siteId = `${project?.projectId}`;
  const platform = project?.platform === 'web' ? 'web' : 'ios';
  const fields = useMetadataKeys(siteId).data ?? [];
  const { save: saveKey, remove } = useMetadataMutations(siteId);
  const [key, setKey] = useState('');
  const [renaming, setRenaming] = useState<CustomField | null>(null);
  const [deleting, setDeleting] = useState<CustomField | null>(null);
  const [showHow, setShowHow] = useState(false);

  const keys = fields.map((f) => f.key);
  const remaining = MAX - fields.length;
  const taken = keys.includes(key.trim());
  const valid = KEY_RE.test(key.trim()) && !taken && remaining > 0;

  const save = (instance: CustomField, done: string) =>
    saveKey
      .mutateAsync(instance)
      .then(() => toast.success(done))
      .catch(() => toast.error(t('An error occurred while saving metadata.')));

  const add = (k: string) => {
    void save(
      new CustomField({ key: k }),
      t('{{key}} declared. Send it from your code and it becomes a filter.', {
        key: k,
      }),
    ).then(() => setKey(''));
  };

  return (
    <>
      <PrefBlock
        flush
        title={t('Keys')}
        hint={
          remaining > 0
            ? t('{{n}} of {{max}} left for this project.', {
                n: remaining,
                max: MAX,
              })
            : t('All {{max}} are in use. Remove one to add another.', {
                max: MAX,
              })
        }
      >
        <div style={{ padding: '0 var(--m-space-7) var(--m-space-6)' }}>
          <PrefField>
            <div className="m-pref__row">
              <Input
                value={key}
                placeholder="plan"
                maxLength={50}
                aria-label={t('New metadata key')}
                className="m-pref__grow"
                disabled={remaining === 0}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && valid) add(key.trim());
                }}
              />
              <Button
                variant="primary"
                disabled={!valid || saveKey.isPending}
                onClick={() => add(key.trim())}
              >
                {t('Declare')}
              </Button>
            </div>
            {taken ? (
              <p className="m-pref__field-note">
                {t('{{key}} is already declared here.', { key: key.trim() })}
              </p>
            ) : null}
          </PrefField>
          {remaining > 0 ? (
            <div
              className="m-pref__keys"
              style={{ marginTop: 'var(--m-space-4)' }}
            >
              {EXAMPLES.filter((e) => !keys.includes(e)).map((e) => (
                <ExampleChip key={e} label={e} onTake={() => add(e)} />
              ))}
            </div>
          ) : null}
        </div>

        {fields.length === 0 ? (
          <EmptyState
            art="bookmark"
            title={t('No keys yet')}
            hint={t(
              'Declare one above, then send it from your code. Anything you would filter sessions by: a plan, an account, a role.',
            )}
          />
        ) : (
          <PrefList>
            {fields.map((f) => (
              <PrefListRow
                key={f.index ?? f.key}
                title={f.key}
                actions={
                  <>
                    <CopyButton
                      variant="ghost"
                      text={snippetFor(platform, [f.key])}
                      label={t('Copy the call for {{key}}', { key: f.key })}
                    />
                    <IconButton
                      icon={<Pencil size={14} />}
                      label={t('Rename {{key}}', { key: f.key })}
                      variant="ghost"
                      onClick={() => setRenaming(f)}
                    />
                    <IconButton
                      icon={<Trash2 size={14} />}
                      label={t('Remove {{key}}', { key: f.key })}
                      variant="ghost"
                      onClick={() => setDeleting(f)}
                    />
                  </>
                }
              />
            ))}
          </PrefList>
        )}
        {fields.length > 0 ? (
          <button
            type="button"
            className="m-pref__quiet-link"
            aria-expanded={showHow}
            onClick={() => setShowHow((v) => !v)}
          >
            <ChevronDown
              size={12}
              aria-hidden="true"
              className={`m-pref__disclose${showHow ? ' is-open' : ''}`}
            />
            {showHow
              ? t('Hide how to send the values')
              : t('How to send the values')}
          </button>
        ) : null}
      </PrefBlock>

      {fields.length === 0 || showHow ? (
        <PrefBlock
          title={t('Send the values')}
          hint={t('Call this after the tracker starts, once per key.')}
        >
          <CodeBlock
            code={snippetFor(platform, keys.length ? keys : ['plan'])}
            language={platform === 'web' ? 'JavaScript' : 'Swift'}
            caption={t('After the tracker starts')}
          />
          <ExternalLink
            href="https://docs.openreplay.com/en/session-replay/metadata"
            className="link self-start text-sm"
          >
            {t('Learn more about metadata')}
          </ExternalLink>
        </PrefBlock>
      ) : null}

      <RenameDialog
        open={renaming != null}
        title={t('Rename metadata key')}
        value={renaming?.key ?? ''}
        onCancel={() => setRenaming(null)}
        onOk={(next) => {
          const f = renaming;
          setRenaming(null);
          if (!f || !next.trim() || next.trim() === f.key) return;
          void save(
            new CustomField({ ...f.toData(), key: next.trim() }),
            t('Metadata updated'),
          );
        }}
      />
      <ConfirmDialog
        open={deleting != null}
        title={t('Remove {{key}}?', { key: deleting?.key ?? '' })}
        okText={t('Remove')}
        danger
        onCancel={() => setDeleting(null)}
        onOk={() => {
          const f = deleting;
          setDeleting(null);
          if (f)
            remove
              .mutateAsync(f.index)
              .catch(() =>
                toast.error(t('Could not remove {{key}}', { key: f.key })),
              );
        }}
      >
        {t(
          'Sessions stop being filterable by this key. Values already recorded are kept.',
        )}
      </ConfirmDialog>
    </>
  );
}

export default observer(CustomFields);
