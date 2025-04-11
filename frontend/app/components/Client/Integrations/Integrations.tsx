import withPageTitle from 'HOCs/withPageTitle';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import IntegrationFilters from 'Components/Client/Integrations/IntegrationFilters';
import { PageTitle } from 'UI';

import DocCard from 'Shared/DocCard/DocCard';
import SiteDropdown from 'Shared/SiteDropdown';

import DatadogForm from './Backend/DatadogForm/DatadogFormModal';
import DynatraceFormModal from './Backend/DynatraceForm/DynatraceFormModal';
import ElasticsearchForm from './Backend/ElasticForm/ElasticFormModal';
import SentryForm from './Backend/SentryForm/SentryFormModal';
import GithubForm from './GithubForm';
import IntegrationItem from './IntegrationItem';
import JiraForm from './JiraForm';
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
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

interface Props {
  siteId: string;
  hideHeader?: boolean;
}

function Integrations(props: Props) {
  const { t } = useTranslation();
  const { integrationsStore, projectsStore } = useStore();
  const initialSiteId = projectsStore.siteId;
  const { siteId } = integrationsStore.integrations;
  const fetchIntegrationList = integrationsStore.integrations.fetchIntegrations;
  const storeIntegratedList = integrationsStore.integrations.list;
  const { hideHeader = false } = props;
  const { showModal, hideModal } = useModal();
  const [integratedList, setIntegratedList] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    const list = integrationsStore.integrations.integratedServices.map(
      (item: any) => item.name,
    );
    setIntegratedList(list);
  }, [storeIntegratedList]);

  useEffect(() => {
    if (siteId) {
      void fetchIntegrationList(siteId);
    } else if (initialSiteId) {
      integrationsStore.integrations.setSiteId(initialSiteId);
    }
  }, [siteId]);

  const onClick = (integration: any, width: number) => {
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

    showModal(
      React.cloneElement(integration.component, {
        integrated: integratedList.includes(integration.slug),
        siteId,
        onClose: hideModal,
      }),
      { right: true, width },
    );
  };

  const onChange = (key: string) => {
    setActiveFilter(key);
  };

  const filteredIntegrations = integrations(t).filter((cat: any) => {
    if (activeFilter === 'all') {
      return true;
    }

    return cat.key === activeFilter;
  });

  const filters = integrations(t).map((cat: any) => ({
    key: cat.key,
    title: cat.title,
    label: cat.title,
    icon: cat.icon,
  }));

  const allIntegrations = filteredIntegrations.flatMap(
    (cat) => cat.integrations,
  );

  const onChangeSelect = ({ value }: any) => {
    integrationsStore.integrations.setSiteId(value.value);
  };

  return (
    <>
      <div className="bg-white rounded-lg border shadow-sm p-5 mb-4">
        <div className="flex items-center gap-4 mb-2">
          {!hideHeader && <PageTitle title={<div>{t('Integrations')}</div>} />}
          <SiteDropdown value={siteId} onChange={onChangeSelect} />
        </div>
        <IntegrationFilters
          onChange={onChange}
          activeItem={activeFilter}
          filters={filters}
        />
      </div>

      <div className="mb-4" />

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {allIntegrations.map((integration, i) => (
          <React.Fragment key={`${integration.slug}+${i}`}>
            <IntegrationItem
              integrated={integratedList.includes(integration.slug)}
              integration={integration}
              useIcon={integration.useIcon}
              onClick={() =>
                onClick(
                  integration,
                  filteredIntegrations.find((cat) =>
                    cat.integrations.includes(integration),
                  )?.title === 'Plugins'
                    ? 500
                    : 350,
                )
              }
              hide={
                (integration.slug === 'github' &&
                  integratedList.includes('jira')) ||
                (integration.slug === 'jira' &&
                  integratedList.includes('github'))
              }
            />
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

export default withPageTitle('Integrations - OpenReplay Preferences')(
  observer(Integrations),
);

const integrations = (t: TFunction) => [
  {
    title: t('Issue Reporting'),
    key: 'issue-reporting',
    description: t(
      'Seamlessly report issues or share issues with your team right from OpenReplay.',
    ),
    isProject: false,
    icon: 'exclamation-triangle',
    integrations: [
      {
        title: t('Jira'),
        subtitle: t(
          'Integrate Jira with OpenReplay to enable the creation of a new ticket directly from a session.',
        ),
        slug: 'jira',
        category: 'Errors',
        icon: 'integrations/jira',
        component: <JiraForm />,
      },
      {
        title: t('Github'),
        subtitle: t(
          'Integrate GitHub with OpenReplay to enable the direct creation of a new issue from a session.',
        ),
        slug: 'github',
        category: 'Errors',
        icon: 'integrations/github',
        component: <GithubForm />,
      },
    ],
  },
  {
    title: t('Backend Logging'),
    key: 'backend-logging',
    isProject: true,
    icon: 'terminal',
    description: t(
      'Sync your backend errors with sessions replays and see what happened front-to-back.',
    ),
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
        subtitle: t(
          'Integrate Sentry with session replays to seamlessly observe backend errors.',
        ),
        slug: 'sentry',
        icon: 'integrations/sentry',
        component: <SentryForm />,
      },
      {
        title: t('Elasticsearch'),
        subtitle: t(
          'Integrate Elasticsearch with session replays to seamlessly observe backend errors.',
        ),
        slug: 'elasticsearch',
        icon: 'integrations/elasticsearch',
        component: <ElasticsearchForm />,
      },
      {
        title: t('Datadog'),
        subtitle: t(
          'Incorporate DataDog to visualize backend errors alongside session replay, for easy troubleshooting.',
        ),
        slug: 'datadog',
        icon: 'integrations/datadog',
        component: <DatadogForm />,
      },
      {
        title: t('Dynatrace'),
        subtitle: t(
          'Integrate Dynatrace with session replays to link backend logs with user sessions for faster issue resolution.',
        ),
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
    description: t(
      'Share your sessions with your team and collaborate on issues.',
    ),
    integrations: [
      {
        title: t('Slack'),
        subtitle: t(
          'Integrate Slack to empower every user in your org with the ability to send sessions to any Slack channel.',
        ),
        slug: 'slack',
        category: 'Errors',
        icon: 'integrations/slack',
        component: <SlackForm />,
        shared: true,
      },
      {
        title: t('MS Teams'),
        subtitle: t(
          'Integrate MS Teams to empower every user in your org with the ability to send sessions to any MS Teams channel.',
        ),
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
      "Reproduce issues as if they happened in your own browser. Plugins help capture your application's store, HTTP requeets, GraphQL queries, and more.",
    ),
    integrations: [
      {
        title: t('Redux'),
        subtitle: t(
          'Capture Redux actions/state and inspect them later on while replaying session recordings.',
        ),
        icon: 'integrations/redux',
        component: <ReduxDoc />,
      },
      {
        title: t('VueX'),
        subtitle: t(
          'Capture VueX mutations/state and inspect them later on while replaying session recordings.',
        ),
        icon: 'integrations/vuejs',
        component: <VueDoc />,
      },
      {
        title: t('Pinia'),
        subtitle: t(
          'Capture Pinia mutations/state and inspect them later on while replaying session recordings.',
        ),
        icon: 'integrations/pinia',
        component: <PiniaDoc />,
      },
      {
        title: t('GraphQL'),
        subtitle: t(
          'Capture GraphQL requests and inspect them later on while replaying session recordings. This plugin is compatible with Apollo and Relay implementations.',
        ),
        icon: 'integrations/graphql',
        component: <GraphQLDoc />,
      },
      {
        title: t('NgRx'),
        subtitle: t(
          'Capture NgRx actions/state and inspect them later on while replaying session recordings.\n',
        ),
        icon: 'integrations/ngrx',
        component: <NgRxDoc />,
      },
      {
        title: t('MobX'),
        subtitle: t(
          'Capture MobX mutations and inspect them later on while replaying session recordings.',
        ),
        icon: 'integrations/mobx',
        component: <MobxDoc />,
      },
      {
        title: t('Profiler'),
        subtitle: t(
          'Plugin allows you to measure your JS functions performance and capture both arguments and result for each call.',
        ),
        icon: 'integrations/openreplay',
        component: <ProfilerDoc />,
      },
      {
        title: t('Assist'),
        subtitle: t(
          'OpenReplay Assist allows you to support your users by seeing their live screen and instantly hopping on call (WebRTC) with them without requiring any 3rd-party screen sharing software.\n',
        ),
        icon: 'integrations/openreplay',
        component: <AssistDoc />,
      },
      {
        title: t('Zustand'),
        subtitle: t(
          'Capture Zustand mutations/state and inspect them later on while replaying session recordings.',
        ),
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
