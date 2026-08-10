import withPageTitle from 'HOCs/withPageTitle';
import { Divider, Switch, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { useHistory, useLocation } from 'App/routing';
import { NoPermission } from 'UI';

import {
  useNotifications,
  useSettings,
  useUpdateNotifications,
  useUpdateSettings,
} from '../KaiSettings/queries';
import PreferencesPage from '../PreferencesPage';
import CriticalRules from './CriticalRules';
import JourneyTags from './JourneyTags';

/* Preferences > Agents: one tab per agent; per-agent journey tags, critical
   rules, notifications and behaviour toggles live here rather than as a
   Settings tab on each agent page. */

// display:block is load-bearing: Typography.Text renders a span, max-width does
// nothing to an inline element
const PROSE = { display: 'block', maxWidth: '72ch' } as const;

type AgentKey = 'tests' | 'issues';
const AGENTS: AgentKey[] = ['tests', 'issues'];
// each tab needs the permission that guards that agent's own page
const AGENT_PERMISSION: Record<AgentKey, string> = {
  tests: 'BROWSER_TESTS',
  issues: 'SMART_ISSUES',
};

// HOCs/withPermissions' rule as a hook, since the check picks tabs rather than
// gating the whole render
function usePermittedAgents(): AgentKey[] {
  const { userStore } = useStore();
  const granted = userStore.account.permissions ?? [];
  const unrestricted = userStore.isAdmin || !userStore.isEnterprise;
  return AGENTS.filter(
    (key) => unrestricted || granted.includes(AGENT_PERMISSION[key]),
  );
}

function PrefRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">{label}</span>
      <Typography.Text type="secondary" className="text-sm!" style={PROSE}>
        {hint}
      </Typography.Text>
      <div className="flex flex-col gap-2.5 mt-3">{children}</div>
    </div>
  );
}

function Channel({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <Switch size="small" checked={checked} onChange={onChange} />
      {label}
    </span>
  );
}

/** a titled group inside a panel. */
function PrefSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-0.5 -mb-1.5">
        <Typography.Title level={5} style={{ marginBottom: 0 }}>
          {title}
        </Typography.Title>
        <Typography.Text type="secondary" className="text-sm!" style={PROSE}>
          {hint}
        </Typography.Text>
      </div>
      {children}
    </section>
  );
}

// own component so its queries only mount when the tab is permitted — hooks
// can't be conditional, so the element boundary is the gate
const TestsPanel = observer(() => {
  const { t } = useTranslation();

  const { data: settings } = useSettings();
  const { data: notifications } = useNotifications();
  const updateSettings = useUpdateSettings();
  const updateNotifications = useUpdateNotifications();
  const pauseOnRevision = settings?.pauseOnNewRevisions ?? true;
  const failedRuns = notifications?.tests?.failedRuns;
  const failedRunsEmail = !!failedRuns?.email;
  const failedRunsSlack = !!failedRuns?.slack;
  const setFailedRuns = (delivery: 'email' | 'slack', v: boolean) =>
    updateNotifications.mutate({
      agentKey: 'tests',
      patch: { failedRuns: { [delivery]: v } },
    });

  return (
    <div className="flex flex-col p-5">
      <PrefSection
        title={t('Notifications')}
        hint={t('How you hear from the Tests agent.')}
      >
        <PrefRow
          label={t('Failed test runs')}
          hint={t('When a scheduled run fails.')}
        >
          <Channel
            label={t('Email')}
            checked={failedRunsEmail}
            onChange={(v) => setFailedRuns('email', v)}
          />
          <Channel
            label={t('Slack')}
            checked={failedRunsSlack}
            onChange={(v) => setFailedRuns('slack', v)}
          />
        </PrefRow>
      </PrefSection>

      <Divider />

      <PrefSection
        title={t('Behaviour')}
        hint={t('What the agent does when it proposes a new version.')}
      >
        <PrefRow
          label={t('Pause tests on new revisions')}
          hint={t(
            'A changed flow usually breaks the current steps. When on, tests pause until the new version is reviewed; when off, they keep running on the current version.',
          )}
        >
          <Channel
            label={pauseOnRevision ? t('On') : t('Off')}
            checked={pauseOnRevision}
            onChange={(v) => updateSettings.mutate({ pauseOnNewRevisions: v })}
          />
        </PrefRow>
      </PrefSection>
    </div>
  );
});

const IssuesPanel = observer(() => {
  const { t } = useTranslation();
  const { issuesStore, projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;

  /* This page is reachable without ever opening Issues, so issuesStore may have
     no `projectId`. Without these the tag + critical-rule managers render empty
     AND their writes silently no-op (every mutation guards on `projectId`). */
  React.useEffect(() => {
    if (siteId) {
      issuesStore.ensureJourneyTags(String(siteId));
      issuesStore.ensureCriticalDefinitions(String(siteId));
    }
  }, [siteId]);

  return (
    <div className="flex flex-col gap-8 p-5">
      <PrefSection
        title={t('Journey tags')}
        hint={t(
          'Plain-words descriptions the agent matches against each session’s journey. Rename or remove any of them; new tags apply to sessions captured from now on.',
        )}
      >
        <JourneyTags />
      </PrefSection>

      <PrefSection
        title={t('What’s critical')}
        hint={t(
          'Describe what critical means to you. The agent flags issues that match, per author, so “Critical to me” filters by whose description matched.',
        )}
      >
        <CriticalRules />
      </PrefSection>
    </div>
  );
});

function AgentsPreferences() {
  const { t } = useTranslation();
  const { issuesStore, projectsStore } = useStore();
  const history = useHistory();
  const location = useLocation();
  const permitted = usePermittedAgents();

  // agent pages' Settings buttons deep-link to their own tab via ?agent=
  const requested = new URLSearchParams(location.search).get(
    'agent',
  ) as AgentKey | null;
  const openTab = (key: string) => {
    // replace, not push: switching tabs shouldn't stack up back steps
    history.replace(`/client/agents?agent=${key}`);
  };

  const help = t(
    'Journey tags, critical rules, notifications and behaviour for each agent. Core configuration like environments and run defaults lives with the agent itself.',
  );

  const panels: Record<AgentKey, { label: string; children: React.ReactNode }> =
    {
      tests: { label: t('Tests'), children: <TestsPanel /> },
      issues: { label: t('Issues'), children: <IssuesPanel /> },
    };
  const tabItems = permitted.map((key) => ({ key, ...panels[key] }));

  if (!tabItems.length) {
    return (
      <PreferencesPage title={t('Agents')} help={help}>
        <NoPermission />
      </PreferencesPage>
    );
  }

  const agent: AgentKey =
    requested && permitted.includes(requested) ? requested : permitted[0];

  return (
    <PreferencesPage
      title={t('Agents')}
      help={help}
      tabs={tabItems}
      activeTab={agent}
      onTabChange={openTab}
    />
  );
}

export default withPageTitle('Agents - OpenReplay')(
  observer(AgentsPreferences),
);
