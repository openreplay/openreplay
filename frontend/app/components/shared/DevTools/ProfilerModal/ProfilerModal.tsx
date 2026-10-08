import { CodeBlock } from '@/ui/data/CodeBlock';
import { DrawerHeader, Section } from '@/ui/overlays/EntityDrawer';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';

/** One profiled call: the arguments it got and what it returned. */
function ProfilerModal({ profile }: { profile: any }) {
  const { t } = useTranslation();
  const { hideModal } = useModal();
  const { name, args, result } = profile;
  const argList: string[] = String(args ?? '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);

  return (
    <div className="m-drawer__pane">
      <header className="m-drawer__head">
        <DrawerHeader
          eyebrow={t('Profiler')}
          title={name}
          onClose={hideModal}
        />
      </header>
      <div className="m-drawer__body">
        <Section title={t('Arguments')}>
          {argList.length ? (
            <CodeBlock plain code={argList.join('\n')} />
          ) : (
            <p className="text-sm text-content-muted">{t('None')}</p>
          )}
        </Section>
        <Section title={t('Result')}>
          <CodeBlock plain code={`${result}`} />
        </Section>
      </div>
    </div>
  );
}

export default ProfilerModal;
