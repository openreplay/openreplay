import { CodeBlock } from '@/ui/data/CodeBlock';
import { TagInput } from '@/ui/inputs/tag-input';
import { Step } from '@/ui/layout/Steps';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { useToast } from '@/ui/overlays/toast';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import CustomField from 'App/mstore/types/customField';

import { ExampleChip } from 'Shared/ExampleChip/ExampleChip';

import {
  type InstallMethod,
  MAX_METADATA_KEYS,
  METADATA_EXAMPLES,
  PLATFORMS,
  type Platform,
  identifySnippet,
  isMetadataKey,
  metadataSnippet,
} from '../install';

/** setUserID, then the project's metadata keys, declared right here. */
function IdentifyStep({
  siteId,
  platform,
  method,
}: {
  siteId: string;
  platform: Platform;
  method: InstallMethod;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { customFieldStore, userStore } = useStore();
  const fields = customFieldStore.list;
  const keys = fields.map((f: any) => f.key as string);
  const language = PLATFORMS.find((p) => p.key === platform)!.language;
  const userId = userStore.account.email || 'john@doe.com';
  const remaining = METADATA_EXAMPLES.filter((e) => !keys.includes(e.key));
  const [removing, setRemoving] = React.useState<CustomField | null>(null);

  React.useEffect(() => {
    void customFieldStore.fetchList(siteId);
  }, [siteId]);

  const add = (key: string) => {
    if (keys.length >= MAX_METADATA_KEYS) {
      toast.error(
        t('A project holds up to {{n}} metadata keys', {
          n: MAX_METADATA_KEYS,
        }),
      );
      return;
    }
    void customFieldStore
      .save(siteId, new CustomField({ key }))
      .catch((e: any) =>
        toast.error(e?.message || t('Failed to add the metadata key')),
      );
  };

  // removing a key also strips it from saved conditions, so it asks first
  const onChange = (next: string[]) => {
    next.filter((k) => !keys.includes(k)).forEach(add);
    const gone = fields.find((f: any) => !next.includes(f.key));
    if (gone) setRemoving(gone);
  };

  return (
    <div className="m-ob__stack">
      <Step n={1} title={t('Set the user ID after sign-in')}>
        <CodeBlock
          code={identifySnippet(platform, method, userId)}
          language={language}
          caption={t('OpenReplay keeps the last user ID it was given.')}
          highlight={userId}
        />
      </Step>

      <Step
        n={2}
        title={
          <>
            {t('Add metadata')}{' '}
            <span className="m-ob__muted">{t('optional')}</span>
          </>
        }
      >
        <div className="m-ob__meta-row">
          <TagInput
            value={keys}
            onChange={onChange}
            accept={isMetadataKey}
            placeholder={
              keys.length ? t('Another key') : t('Your key, or take one below')
            }
            ariaLabel={t('Metadata keys')}
            className="m-ob__meta-input"
            backspaceRemoves={false}
          />
          {remaining.length > 0 && keys.length < MAX_METADATA_KEYS && (
            <div className="m-ob__examples" aria-label={t('Example keys')}>
              {remaining.map((e) => (
                <ExampleChip
                  key={e.key}
                  label={e.key}
                  onTake={() => add(e.key)}
                />
              ))}
            </div>
          )}
        </div>
        {keys.length > 0 && (
          <div className="m-step-in">
            <CodeBlock
              code={metadataSnippet(platform, method, keys)}
              language={language}
              caption={t('After the tracker starts')}
            />
          </div>
        )}
      </Step>
      <ConfirmDialog
        open={removing != null}
        title={t('Remove {{key}}?', { key: removing?.key ?? '' })}
        okText={t('Remove')}
        danger
        onCancel={() => setRemoving(null)}
        onOk={() => {
          const f = removing;
          setRemoving(null);
          if (f)
            customFieldStore
              .remove(siteId, f.index)
              .catch(() =>
                toast.error(t('Could not remove {{key}}', { key: f.key })),
              );
        }}
      >
        {t(
          'Sessions stop being filterable by this key. Values already recorded are kept.',
        )}
      </ConfirmDialog>
    </div>
  );
}

export default observer(IdentifyStep);
