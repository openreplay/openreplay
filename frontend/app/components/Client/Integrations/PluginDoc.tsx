import { CodeBlock } from '@/ui/data/CodeBlock';
import { Section } from '@/ui/overlays/EntityDrawer';
import type { TFunction } from 'i18next';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ToggleContent from 'Shared/ToggleContent';

import { PluginPane, usePluginProject } from './PluginPane';

interface PluginDocConfig {
  title: string;
  icon: string;
  docs: string;
  /** npm package to install */
  pkg: string;
  blurb: (t: TFunction) => string;
  hint: (t: TFunction) => string;
  usage: (projectKey: string) => string;
  usageCjs: (projectKey: string) => string;
  cjsLanguage?: string;
}

/** A tracker plugin's side panel: install the package, then wire it in (ESM or SSR). */
export function pluginDoc(c: PluginDocConfig) {
  function PluginDoc({ onClose }: { onClose?: () => void }) {
    const { t } = useTranslation();
    const scope = usePluginProject();
    return (
      <PluginPane
        title={c.title}
        icon={c.icon}
        blurb={c.blurb(t)}
        docs={c.docs}
        scope={scope}
        onClose={onClose}
      >
        <Section title={t('Install')}>
          <CodeBlock
            inline
            code={`npm i ${c.pkg} --save`}
            copyLabel={t('Copy command')}
          />
        </Section>
        <Section title={t('Use')} hint={c.hint(t)}>
          <ToggleContent
            label={t('Server-Side-Rendered (SSR)?')}
            first={<CodeBlock language="js" code={c.usage(scope.projectKey)} />}
            second={
              <CodeBlock
                language={c.cjsLanguage ?? 'jsx'}
                code={c.usageCjs(scope.projectKey)}
              />
            }
          />
        </Section>
      </PluginPane>
    );
  }
  PluginDoc.displayName = `${c.title}Doc`;
  return observer(PluginDoc);
}
