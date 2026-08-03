import withPageTitle from 'HOCs/withPageTitle';
import { Button, Divider, Switch, Tabs, Tooltip, Typography } from 'antd';
import { ArrowLeft, Info } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useHistory, useLocation } from 'App/routing';

import {
  useNotifications,
  useSettings,
  useUpdateNotifications,
  useUpdateSettings,
} from '../KaiSettings/queries';

/* Preferences > Agents (Mehdi 07-27): the formula is MAIN components stay as
   tabs in each agent's page (Tests keeps Environments + run defaults), while
   preferences, notifications and behaviour toggles live HERE — otherwise every
   agent grows a Settings tab that competes with Preferences.

   ONE TAB PER AGENT. The tab says which agent, so the sections inside are free
   to say what they are — Notifications, Behaviour. The chrome mirrors the Tests
   agent page (KaiSettings/index.tsx): bordered white card, one border-b header
   row with the 18px semibold title, then antd Tabs at the same 16px tab-bar
   padding, each panel `p-5` with Title level 5 sections split by Dividers.

   Only the Tests tab ships here; the Issues (journey tags + critical rules) and
   Audits tabs land on their own branches. See todo.md. */

/* full width is for tables and controls, never for a line of prose: hints stay
   at a readable measure so they wrap where the eye expects, not at 1300px.
   display:block is load-bearing — Typography.Text renders a span, and max-width
   does nothing to an inline element. */
const PROSE = { display: 'block', maxWidth: '72ch' } as const;

type AgentKey = 'tests';
const AGENTS: AgentKey[] = ['tests'];

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

/** a titled group inside a panel — the Environments tab's section shape. */
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
  const history = useHistory();
  const location = useLocation();

  // real project settings + notifications (same sources the Tests page used
  // before these controls moved here)
  const { data: settings } = useSettings();
  const { data: notifications } = useNotifications();
  const updateSettings = useUpdateSettings();
  const updateNotifications = useUpdateNotifications();
  const pauseOnRevision = settings?.pauseOnNewRevisions ?? true;
  const dailySummary = !!notifications?.dailySummary;
  const weeklySummary = !!notifications?.weeklySummary;

  // the agent pages' Settings buttons deep-link to their own tab, the same
  // query-param pattern Data Management's Properties page uses (?view=)
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
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* the Settings shortcut on the agent pages lands here mid-flow — the
          same back button as the issue detail page returns the user */}
      <Button
        type="text"
        size="small"
        icon={<ArrowLeft size={15} />}
        onClick={() => history.goBack()}
        className="self-start -ml-2"
      >
        {t('Back')}
      </Button>
      <div className="flex flex-col rounded-lg border bg-white">
        {/* header — mirrors the agent pages' header grammar */}
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <span className="font-semibold text-lg">{t('Agents')}</span>
          <Tooltip
            placement="bottom"
            title={t(
              'Notifications and behaviour for each agent. Core configuration like environments and run defaults lives with the agent itself.',
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
    </div>
  );
}

export default withPageTitle('Agents - OpenReplay')(observer(AgentsPreferences));
