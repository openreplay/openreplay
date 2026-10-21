import { IconButton } from '@/ui/actions/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { PageCard, PageToolbar } from '@/ui/layout/PageCard';
import { Tabs, TabsList, TabsTrigger } from '@/ui/layout/tabs';
import { BookOpen, MoreHorizontal, Settings2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useHistory } from 'App/routing';

import PreferencesPage from '../../PreferencesPage';
import { KaiTab, kaiUi, useKaiUi } from './shared/uiStore';

const StandaloneCtx = React.createContext(false);
export const SyntheticsStandalone = StandaloneCtx.Provider;

/* Each section renders the frame itself, so its search and toolbar stay with
   its own state: a PageCard on /test-agents, the preferences page under Preferences. */
export function SyntheticsFrame({
  actions,
  toolbar,
  children,
}: {
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const history = useHistory();
  const standalone = React.useContext(StandaloneCtx);
  const { activeTab } = useKaiUi();
  const sections: { key: KaiTab; label: string; sub: string }[] = [
    {
      key: 'tests',
      label: t('Tests'),
      sub: t('End-to-end tests generated from real user journeys.'),
    },
    {
      key: 'runs',
      label: t('Runs'),
      sub: t('Every test run, newest first.'),
    },
    {
      key: 'settings',
      label: t('Environments'),
      sub: t('Where tests run, and the defaults a new test starts from.'),
    },
  ];
  const onTab = (key: string) => kaiUi.setActiveTab(key as KaiTab);

  const more = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <span>
          <IconButton
            icon={<MoreHorizontal size={15} />}
            label={t('More')}
            variant="ghost"
          />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItems
          items={[
            {
              key: 'settings',
              icon: <Settings2 size={13} />,
              label: t('Tests settings'),
              onClick: () => history.push('/client/agents?agent=tests'),
            },
            {
              key: 'docs',
              icon: <BookOpen size={13} />,
              label: t('Documentation'),
              onClick: () =>
                window.open('https://docs.openreplay.com/', '_blank'),
            },
          ]}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // a list's own menu ends its toolbar line; the header keeps search and the CTA
  const headActions = toolbar ? (
    actions
  ) : (
    <>
      {actions}
      {more}
    </>
  );
  const lineTools = toolbar ? (
    <>
      {toolbar}
      {more}
    </>
  ) : undefined;

  if (!standalone)
    return (
      <PreferencesPage
        title={t('Synthetics')}
        actions={headActions}
        tabs={sections}
        activeTab={activeTab}
        onTabChange={onTab}
        flush
      >
        {lineTools ? <PageToolbar>{lineTools}</PageToolbar> : null}
        {children}
      </PreferencesPage>
    );

  return (
    <PageCard
      title={t('Synthetics')}
      subtitle={sections.find((s) => s.key === activeTab)?.sub}
      tabs={
        <Tabs value={activeTab} onValueChange={onTab}>
          <TabsList
            aria-label={t('Sections of Synthetics')}
            className="border-b-0"
          >
            {sections.map((s) => (
              <TabsTrigger key={s.key} value={s.key}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
      actions={headActions}
      toolbar={lineTools}
    >
      {children}
    </PageCard>
  );
}
