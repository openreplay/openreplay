import { Icon } from '@/ui/icons/Icon';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { toast } from '@/ui/overlays/toast';
import { useQuery } from '@tanstack/react-query';
import withPageTitle from 'HOCs/withPageTitle';
import { TFunction } from 'i18next';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { namedStore } from 'App/mstore/integrationsStore';
import { integrationsService } from 'App/services';

import DocCard from 'Shared/DocCard/DocCard';

import { PrefBlock } from '../PrefSection';
import PreferencesPage from '../PreferencesPage';
import DatadogForm from './Backend/DatadogForm/DatadogFormModal';
import DynatraceFormModal from './Backend/DynatraceForm/DynatraceFormModal';
import ElasticsearchForm from './Backend/ElasticForm/ElasticFormModal';
import SentryForm from './Backend/SentryForm/SentryFormModal';
import GithubForm from './GithubForm';
import JiraForm from './JiraForm';
import LinearForm from './LinearForm';
import ProfilerDoc from './ProfilerDoc';
import SlackForm from './SlackForm';
import MSTeams from './Teams';
import AssistDoc from './Tracker/AssistDoc';
import GraphQLDoc from './Tracker/GraphQLDoc';
import MobxDoc from './Tracker/MobxDoc';
import NgRxDoc from './Tracker/NgRxDoc';
import PiniaDoc from './Tracker/PiniaDoc';
import ReduxDoc from './Tracker/ReduxDoc';
import VueDoc from './Tracker/VueDoc';
import ZustandDoc from './Tracker/ZustandDoc';

/* Issue trackers are mutually exclusive: only one can be connected, so the
   others are disabled (not hidden) while one is, with a tooltip saying which
   connection to drop first. Slug -> display name. */
const issueTrackers: Record<string, string> = {
  jira: 'Jira',
  github: 'GitHub',
  linear: 'Linear',
};

/** the connected issue tracker's slug, if any */
const connectedTracker = (integrated: string[]) =>
  integrated.find((name) => name in issueTrackers);

interface Props {
  siteId: string;
}

function Integrations(props: Props) {
  const { t } = useTranslation();
  const { integrationsStore, projectsStore } = useStore();
  const initialSiteId = projectsStore.siteId;
  const { siteId } = integrationsStore.integrations;
  const fetchIntegrationList = integrationsStore.integrations.fetchIntegrations;
  const storeIntegratedList = integrationsStore.integrations.list;
  const { showModal, hideModal } = useModal();
  // derived, not mirrored through an effect (which rendered a stale frame first)
  const integratedList = React.useMemo<string[]>(
    () =>
      integrationsStore.integrations.integratedServices.map(
        (item: any) => item.name,
      ),
    [storeIntegratedList],
  );

  useEffect(() => {
    if (siteId) {
      void fetchIntegrationList(siteId);
    } else if (initialSiteId) {
      integrationsStore.integrations.setSiteId(initialSiteId);
    }
  }, [siteId]);

  // a connection covers projects of its own choosing: a card is connected
  // where any project has it, and a backend one says how many
  const projectIds = projectsStore.list.map((p) => String(p.projectId));
  const { data: byProject, refetch: refetchByProject } = useQuery({
    queryKey: ['integrationsByProject', projectIds],
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(
          projectIds.map(async (id) => {
            const { data } = await integrationsService
              .fetchList(undefined, id)
              .catch(() => ({ data: [] }));
            const names = (Array.isArray(data) ? data : [])
              .filter((i: any) => i.integrated)
              .map((i: any) => i.name as string);
            return [id, names] as const;
          }),
        ),
      ) as Record<string, string[]>,
    enabled: projectIds.length > 0,
  });
  const projectsWith = (slug: string) =>
    byProject
      ? projectIds.filter((id) => byProject[id]?.includes(slug)).length
      : integratedList.includes(slug)
        ? 1
        : 0;

  const onClick = (integration: any) => {
    if (
      integration.slug &&
      integration.slug !== 'slack' &&
      integration.slug !== 'msteams'
    ) {
      const intName = integration.slug as
        | 'sentry'
        | 'bugsnag'
        | 'rollbar'
        | 'elasticsearch'
        | 'datadog'
        | 'sumologic'
        | 'stackdriver'
        | 'cloudwatch'
        | 'newrelic';
      if (integrationsStore[intName]) {
        void integrationsStore[intName].fetchIntegration(siteId);
      }
    }

    const close = () => {
      hideModal();
      void refetchByProject();
    };
    showModal(
      React.cloneElement(integration.component, {
        integrated: integratedList.includes(integration.slug),
        siteId,
        onClose: close,
      }),
      { right: true, onClose: () => void refetchByProject() },
    );
  };

  const onDisconnect = async (slug: string) => {
    try {
      await integrationsStore[slug as namedStore].deleteIntegration();
      toast.success(t('Integration removed'));
    } catch (e) {
      console.error(e);
      toast.error(t('Failed to remove integration'));
    } finally {
      void fetchIntegrationList(siteId);
      void refetchByProject();
    }
  };

  const activeTracker = connectedTracker(integratedList);
  const [disconnecting, setDisconnecting] = useState<any | null>(null);

  const open = (integration: any) => {
    if (integration.oauth && integratedList.includes(integration.slug)) {
      setDisconnecting(integration);
      return;
    }
    onClick(integration);
  };

  return (
    <PreferencesPage title={t('Integrations')} flush>
      {integrations(t).map((cat) => (
        <PrefBlock key={cat.key} title={cat.title} hint={cat.description}>
          <div className="m-pref__cards">
            {cat.integrations.map((integration: any) => {
              const covered = integration.slug
                ? projectsWith(integration.slug)
                : 0;
              const on = covered > 0;
              const blocked =
                integration.slug in issueTrackers &&
                activeTracker &&
                activeTracker !== integration.slug
                  ? activeTracker
                  : undefined;
              const card = (
                <button
                  key={integration.slug ?? integration.title}
                  type="button"
                  className={`m-pref__card m-hover${on ? ' is-on' : ''}`}
                  disabled={!!blocked}
                  onClick={() => open(integration)}
                >
                  <span className="m-pref__card-mark">
                    {integration.useIcon ? (
                      <Icon name={integration.icon} size={16} />
                    ) : (
                      <img
                        src={`/assets/${integration.icon}.svg`}
                        alt=""
                        height={16}
                        width={16}
                      />
                    )}
                  </span>
                  <span className="m-pref__card-lead">
                    <span className="m-pref__card-title">
                      {integration.title}
                      {on ? (
                        <span className="m-pref__on">
                          {cat.isProject && covered > 1
                            ? t('Connected · {{n}} projects', {
                                n: covered,
                                count: covered,
                              })
                            : t('Connected')}
                        </span>
                      ) : null}
                    </span>
                    <span className="m-pref__card-sub">
                      {blocked
                        ? t(
                            'Only one issue tracker can be connected at a time. Disconnect {{name}} first.',
                            { name: issueTrackers[blocked] },
                          )
                        : integration.subtitle}
                    </span>
                  </span>
                </button>
              );
              return card;
            })}
          </div>
        </PrefBlock>
      ))}
      <ConfirmDialog
        open={disconnecting != null}
        title={t('Disconnect {{name}}?', { name: disconnecting?.title ?? '' })}
        okText={t('Disconnect')}
        danger
        onCancel={() => setDisconnecting(null)}
        onOk={() => {
          const i = disconnecting;
          setDisconnecting(null);
          if (i) void onDisconnect(i.slug);
        }}
      >
        {t('Sessions stop linking to it. You can connect it again later.')}
      </ConfirmDialog>
    </PreferencesPage>
  );
}

export default withPageTitle('Integrations - OpenReplay Preferences')(
  observer(Integrations),
);

const integrations = (t: TFunction) => [
  {
    title: t('Issue reporting'),
    key: 'issue-reporting',
    description: t('Open a ticket from a session, with the replay attached.'),
    isProject: false,
    icon: 'exclamation-triangle',
    integrations: [
      {
        title: t('Jira'),
        subtitle: t('Tickets in Jira Cloud or Server, through an API token.'),
        slug: 'jira',
        category: 'Errors',
        icon: 'integrations/jira',
        component: <JiraForm />,
      },
      {
        title: t('GitHub'),
        subtitle: t('Issues in any repository your token can reach.'),
        slug: 'github',
        category: 'Errors',
        icon: 'integrations/github',
        component: <GithubForm />,
      },
      {
        title: t('Linear'),
        subtitle: t('Issues in one of your Linear teams.'),
        slug: 'linear',
        category: 'Errors',
        icon: 'integrations/linear',
        component: <LinearForm />,
      },
    ],
  },
  {
    title: t('Backend logging'),
    key: 'backend-logging',
    isProject: true,
    icon: 'terminal',
    description: t('Put your server errors and logs on the session timeline.'),
    docs: () => (
      <DocCard
        title={t('Why use integrations?')}
        icon="question-lg"
        iconBgColor="bg-red-lightest"
        iconColor="red"
      >
        {t(
          'Sync your backend errors with sessions replays and see what happened front-to-back.',
        )}
      </DocCard>
    ),
    integrations: [
      {
        title: t('Sentry'),
        subtitle: t('Backend errors from Sentry, matched by a session tag.'),
        slug: 'sentry',
        icon: 'integrations/sentry',
        component: <SentryForm />,
      },
      {
        title: t('Elasticsearch'),
        subtitle: t('Log lines from your own indexes.'),
        slug: 'elasticsearch',
        icon: 'integrations/elasticsearch',
        component: <ElasticsearchForm />,
      },
      {
        title: t('Datadog'),
        subtitle: t('Datadog logs, matched by a session attribute.'),
        slug: 'datadog',
        icon: 'integrations/datadog',
        component: <DatadogForm />,
      },
      {
        title: t('Dynatrace'),
        subtitle: t('Dynatrace log records, through an OAuth client.'),
        slug: 'dynatrace',
        icon: 'integrations/dynatrace',
        useIcon: true,
        component: <DynatraceFormModal />,
      },
    ],
  },
  {
    title: t('Collaboration'),
    key: 'collaboration',
    isProject: false,
    icon: 'file-code',
    description: t('Share sessions and alerts where your team already talks.'),
    integrations: [
      {
        title: t('Slack'),
        subtitle: t('Any Slack channel with an incoming webhook.'),
        slug: 'slack',
        category: 'Errors',
        icon: 'integrations/slack',
        component: <SlackForm />,
        shared: true,
      },
      {
        title: t('Microsoft Teams'),
        subtitle: t('Any Teams channel with an incoming webhook.'),
        slug: 'msteams',
        category: 'Errors',
        icon: 'integrations/teams',
        component: <MSTeams />,
        shared: true,
      },
    ],
  },
  // {
  //   title: 'State Management',
  //   key: 'state-management',
  //   isProject: true,
  //   icon: 'layers-half',
  //   description: 'Sync your Redux or VueX store with sessions replays and see what happened front-to-back.',
  //   integrations: []
  // },
  {
    title: t('Plugins'),
    key: 'plugins',
    isProject: true,
    icon: 'chat-left-text',
    docs: () => (
      <DocCard
        title={t('What are plugins?')}
        icon="question-lg"
        iconBgColor="bg-red-lightest"
        iconColor="red"
      >
        {t(
          'Plugins capture your application’s store, monitor queries, track performance issues and even assist your end user through live sessions.',
        )}
      </DocCard>
    ),
    description: t(
      'Capture more of your app in each recording: state, queries, timings.',
    ),
    integrations: [
      {
        title: t('Redux'),
        subtitle: t('Every dispatched action and the store after it.'),
        icon: 'integrations/redux',
        component: <ReduxDoc />,
      },
      {
        title: t('VueX'),
        subtitle: t('VueX mutations and the store after each one.'),
        icon: 'integrations/vuejs',
        component: <VueDoc />,
      },
      {
        title: t('Pinia'),
        subtitle: t('Pinia store mutations, store by store.'),
        icon: 'integrations/pinia',
        component: <PiniaDoc />,
      },
      {
        title: t('GraphQL'),
        subtitle: t(
          'Apollo or Relay operations with their variables and results.',
        ),
        icon: 'integrations/graphql',
        component: <GraphQLDoc />,
      },
      {
        title: t('NgRx'),
        subtitle: t('NgRx actions and the state they produce.'),
        icon: 'integrations/ngrx',
        component: <NgRxDoc />,
      },
      {
        title: t('MobX'),
        subtitle: t('MobX observable changes as they happen.'),
        icon: 'integrations/mobx',
        component: <MobxDoc />,
      },
      {
        title: t('Profiler'),
        subtitle: t(
          'Timings, arguments and results of the functions you wrap.',
        ),
        icon: 'integrations/openreplay',
        component: <ProfilerDoc />,
      },
      {
        title: t('Assist'),
        subtitle: t(
          'See a user’s live screen and call them, no extra software.',
        ),
        icon: 'integrations/openreplay',
        component: <AssistDoc />,
      },
      {
        title: t('Zustand'),
        subtitle: t('Zustand store changes, before and after.'),
        icon: 'integrations/zustand',
        // header: '🐻',
        component: <ZustandDoc />,
      },
    ],
  },
];

/**
 *
 * @deprecated
 * */
// {
//   title: 'Sumo Logic',
//     subtitle:
//   'Integrate Sumo Logic with session replays to seamlessly observe backend errors.',
//     slug: 'sumologic',
//   icon: 'integrations/sumologic',
//   component: <SumoLogicForm />,
// },
// {
//   title: 'Bugsnag',
//     subtitle:
//   'Integrate Bugsnag to access the OpenReplay session linked to the JS exception within its interface.',
//     slug: 'bugsnag',
//   icon: 'integrations/bugsnag',
//   component: <BugsnagForm />,
// },
// {
//   title: 'Rollbar',
//     subtitle:
//   'Integrate Rollbar with session replays to seamlessly observe backend errors.',
//     slug: 'rollbar',
//   icon: 'integrations/rollbar',
//   component: <RollbarForm />,
// },
// {
//   title: 'Google Cloud',
//     subtitle:
//   'Integrate Google Cloud to view backend logs and errors in conjunction with session replay',
//     slug: 'stackdriver',
//   icon: 'integrations/google-cloud',
//   component: <StackdriverForm />,
// },
// {
//   title: 'CloudWatch',
//     subtitle:
//   'Integrate CloudWatch to see backend logs and errors alongside session replay.',
//     slug: 'cloudwatch',
//   icon: 'integrations/aws',
//   component: <CloudwatchForm />,
// },
// {
//   title: 'Newrelic',
//     subtitle:
//   'Integrate NewRelic with session replays to seamlessly observe backend errors.',
//     slug: 'newrelic',
//   icon: 'integrations/newrelic',
//   component: <NewrelicForm />,
// },
