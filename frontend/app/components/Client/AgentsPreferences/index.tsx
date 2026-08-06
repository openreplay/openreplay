import withPageTitle from 'HOCs/withPageTitle';
import { Divider, Switch, Tabs, Tooltip, Typography } from 'antd';
import { Info } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { useHistory, useLocation } from 'App/routing';

import {
  useNotifications,
  useSettings,
  useUpdateNotifications,
  useUpdateSettings,
} from '../KaiSettings/queries';
import CriticalRules from './CriticalRules';
import JourneyTags from './JourneyTags';

/* Preferences > Agents (Mehdi 07-27): the formula is MAIN components stay as
   tabs in each agent's page (Tests keeps Environments + run defaults), while
   preferences, journey tags, critical rules, notifications and behaviour
   toggles live HERE — otherwise every agent grows a Settings tab that competes
   with Preferences.

   ONE TAB PER AGENT. The tab says which agent, so the sections inside are free
   to say what they are — Journey tags, What's critical, Notifications,
   Behaviour. The chrome mirrors the Tests agent page (KaiSettings/index.tsx):
   bordered white card, one border-b header row with the 18px semibold title,
   then antd Tabs at the same 16px tab-bar padding, each panel `p-5` with Title
   level 5 sections split by Dividers.

   Both tabs ship here (merged from kai-testing-ui + smart-issues-ui): Tests
   (notifications + behaviour) and Issues (journey tags + critical rules). The
   Audits tab lands on its own branch. See todo.md. */

/* Hints run the full width of the card, so each must stay short — one or two
   sentences that sit on one line. */
const PROSE = { display: 'block' } as const;

type AgentKey = 'tests' | 'issues';
const AGENTS: AgentKey[] = ['tests', 'issues'];

/** one preference: label, hint, then its controls DIRECTLY BENEATH, left
    aligned (Mehdi 07-30). A label on the left with its control pinned right puts
    an arbitrary 700 to 1000px between two things that belong together, and
    padding cannot fix a gap that size — so the pairing goes vertical instead. */
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

/** a labelled switch — the switch leads and the label follows, as on the Weekly
    Report page. One switch size on the page: the small one the other agent
    surfaces already use (Environments, the segment drawer, the capture pill). */
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

function AgentsPreferences() {
  const { t } = useTranslation();
  const { issuesStore, projectsStore } = useStore();
  const history = useHistory();
  const location = useLocation();
  const siteId = projectsStore.activeSiteId;

  /* This page is reachable without ever opening Issues, so issuesStore may have
     no `projectId`. Without this the tag manager renders empty AND its writes
     silently no-op (every mutation guards on `projectId`). */
  React.useEffect(() => {
    if (siteId) issuesStore.ensureJourneyTags(String(siteId));
  }, [siteId]);

  // real project settings + notifications (same sources the Tests page used
  // before these controls moved here)
  const { data: settings } = useSettings();
  const { data: notifications } = useNotifications();
  const updateSettings = useUpdateSettings();
  const updateNotifications = useUpdateNotifications();
  const pauseOnRevision = settings?.pauseOnNewRevisions ?? true;
  const dailySummary = !!notifications?.dailySummary;
  const weeklySummary = !!notifications?.weeklySummary;

  // the agent pages' Settings buttons deep-link to their own tab via ?agent=
  const requested = new URLSearchParams(location.search).get(
    'agent',
  ) as AgentKey | null;
  const agent: AgentKey =
    requested && AGENTS.includes(requested) ? requested : 'tests';
  const openTab = (key: string) => {
    // replace, not push: switching tabs should not stack up back steps
    history.replace(`/client/agents?agent=${key}`);
  };

  const tabItems = [
    {
      key: 'tests',
      label: t('Tests'),
      children: (
        <div className="flex flex-col p-5">
          <PrefSection
            title={t('Notifications')}
            hint={t('How you hear from the Tests agent.')}
          >
            <PrefRow
              label={t('Run summaries')}
              hint={t('A digest of your test runs, sent to your email.')}
            >
              <Channel
                label={t('Daily email')}
                checked={dailySummary}
                onChange={(v) =>
                  updateNotifications.mutate({ dailySummary: v })
                }
              />
              <Channel
                label={t('Weekly email')}
                checked={weeklySummary}
                onChange={(v) =>
                  updateNotifications.mutate({ weeklySummary: v })
                }
              />
            </PrefRow>
          </PrefSection>

          <Divider />

          {/* moved here from the Tests page's old Settings tab */}
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
              {/* a lone boolean still gets a word beside it, the way the Weekly
                  Report page pairs its switch with On/Off — a naked switch under
                  a paragraph leaves you guessing which way is on */}
              <Channel
                label={pauseOnRevision ? t('On') : t('Off')}
                checked={pauseOnRevision}
                onChange={(v) =>
                  updateSettings.mutate({ pauseOnNewRevisions: v })
                }
              />
            </PrefRow>
          </PrefSection>
        </div>
      ),
    },
    {
      key: 'issues',
      label: t('Issues'),
      children: (
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
      ),
    },
  ];

  return (
    <div className="flex flex-col rounded-lg border bg-white">
      {/* header */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <span className="font-semibold text-lg">{t('Agents')}</span>
        <Tooltip
          placement="bottom"
          title={t(
            'Journey tags, critical rules, notifications and behaviour for each agent. Core configuration like environments and run defaults lives with the agent itself.',
          )}
        >
          <span
            className="flex items-center cursor-help"
            style={{ color: 'var(--color-gray-medium)' }}
          >
            <Info size={15} />
          </span>
        </Tooltip>
      </div>
      <Tabs
        activeKey={agent}
        onChange={openTab}
        items={tabItems}
        tabBarStyle={{ paddingLeft: 16, paddingRight: 16, marginBottom: 0 }}
      />
    </div>
  );
}

export default withPageTitle('Agents - OpenReplay')(observer(AgentsPreferences));
