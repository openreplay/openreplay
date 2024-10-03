import withPageTitle from 'HOCs/withPageTitle';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import IntegrationFilters from 'Components/Client/Integrations/IntegrationFilters';
import { PageTitle } from 'UI';

import DocCard from 'Shared/DocCard/DocCard';
import SiteDropdown from 'Shared/SiteDropdown';

import BugsnagForm from './Backend/BugsnagForm';
import CloudwatchForm from './Backend/CloudwatchForm';
import DatadogForm from './Backend/DatadogForm';
import ElasticsearchForm from './Backend/ElasticsearchForm';
import NewrelicForm from './Backend/NewrelicForm';
import RollbarForm from './Backend/RollbarForm';
import SentryForm from './Backend/SentryForm';
import StackdriverForm from './Backend/StackdriverForm';
import SumoLogicForm from './Backend/SumoLogicForm';
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

interface Props {
  siteId: string;
  hideHeader?: boolean;
}

function Integrations(props: Props) {
  const { integrationsStore, projectsStore } = useStore();
  const initialSiteId = projectsStore.siteId;
  const siteId = integrationsStore.integrations.siteId;
  const fetchIntegrationList = integrationsStore.integrations.fetchIntegrations;
  const storeIntegratedList = integrationsStore.integrations.list;
  const { hideHeader = false } = props;
  const { showModal } = useModal();
  const [integratedList, setIntegratedList] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    const list = storeIntegratedList
      .filter((item: any) => item.integrated)
      .map((item: any) => item.name);
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
      }),
      { right: true, width }
    );
  };

  const onChange = (key: string) => {
    setActiveFilter(key);
  };

  const filteredIntegrations = integrations.filter((cat: any) => {
    if (activeFilter === 'all') {
      return true;
    }

    return cat.key === activeFilter;
  });

  const filters = integrations.map((cat: any) => ({
    key: cat.key,
    title: cat.title,
    label: cat.title,
    icon: cat.icon,
  }));

  const allIntegrations = filteredIntegrations.flatMap(
    (cat) => cat.integrations
  );

  const onChangeSelect = (siteId: string) => {
    integrationsStore.integrations.setSiteId(siteId);
  }

  return (
    <>
      <div className="bg-white rounded-lg border shadow-sm p-5 mb-4">
        <div className={'flex items-center gap-4 mb-2'}>
          {!hideHeader && <PageTitle title={<div>Integrations</div>} />}
          <SiteDropdown value={siteId} onChange={onChangeSelect} />
        </div>
        <IntegrationFilters
          onChange={onChange}
          activeItem={activeFilter}
          filters={filters}
        />
      </div>

      <div className="mb-4" />

      <div
        className={'mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'}
      >
        {allIntegrations.map((integration: any) => (
          <IntegrationItem
            integrated={integratedList.includes(integration.slug)}
            integration={integration}
            onClick={() =>
              onClick(
                integration,
                filteredIntegrations.find((cat) =>
                  cat.integrations.includes(integration)
                )?.title === 'Plugins'
                  ? 500
                  : 350
              )
            }
            hide={
              (integration.slug === 'github' &&
                integratedList.includes('jira')) ||
              (integration.slug === 'jira' && integratedList.includes('github'))
            }
          />
        ))}
      </div>
    </>
  );
}

export default withPageTitle('Integrations - OpenReplay Preferences')(
  observer(Integrations)
);

const integrations = [
  {
    title: 'Issue Reporting',
    key: 'issue-reporting',
    description:
      'Seamlessly report issues or share issues with your team right from OpenReplay.',
    isProject: false,
    icon: 'exclamation-triangle',
    integrations: [
      {
        title: 'Jira',
        subtitle:
          'Integrate Jira with OpenReplay to enable the creation of a new ticket directly from a session.',
        slug: 'jira',
        category: 'Errors',
        icon: 'integrations/jira',
        component: <JiraForm />,
      },
      {
        title: 'Github',
        subtitle:
          'Integrate GitHub with OpenReplay to enable the direct creation of a new issue from a session.',
        slug: 'github',
        category: 'Errors',
        icon: 'integrations/github',
        component: <GithubForm />,
      },
    ],
  },
  {
    title: 'Backend Logging',
    key: 'backend-logging',
    isProject: true,
    icon: 'terminal',
    description:
      'Sync your backend errors with sessions replays and see what happened front-to-back.',
    docs: () => (
      <DocCard
        title="Why use integrations?"
        icon="question-lg"
        iconBgColor="bg-red-lightest"
        iconColor="red"
      >
        Sync your backend errors with sessions replays and see what happened
        front-to-back.
      </DocCard>
    ),
    integrations: [
      {
        title: 'Sentry',
        subtitle:
          'Integrate Sentry with session replays to seamlessly observe backend errors.',
        slug: 'sentry',
        icon: 'integrations/sentry',
        component: <SentryForm />,
      },
      {
        title: 'Bugsnag',
        subtitle:
          'Integrate Bugsnag to access the OpenReplay session linked to the JS exception within its interface.',
        slug: 'bugsnag',
        icon: 'integrations/bugsnag',
        component: <BugsnagForm />,
      },
      {
        title: 'Rollbar',
        subtitle:
          'Integrate Rollbar with session replays to seamlessly observe backend errors.',
        slug: 'rollbar',
        icon: 'integrations/rollbar',
        component: <RollbarForm />,
      },
      {
        title: 'Elasticsearch',
        subtitle:
          'Integrate Elasticsearch with session replays to seamlessly observe backend errors.',
        slug: 'elasticsearch',
        icon: 'integrations/elasticsearch',
        component: <ElasticsearchForm />,
      },
      {
        title: 'Datadog',
        subtitle:
          'Incorporate DataDog to visualize backend errors alongside session replay, for easy troubleshooting.',
        slug: 'datadog',
        icon: 'integrations/datadog',
        component: <DatadogForm />,
      },
      {
        title: 'Sumo Logic',
        subtitle:
          'Integrate Sumo Logic with session replays to seamlessly observe backend errors.',
        slug: 'sumologic',
        icon: 'integrations/sumologic',
        component: <SumoLogicForm />,
      },
      {
        title: 'Google Cloud',
        subtitle:
          'Integrate Google Cloud to view backend logs and errors in conjunction with session replay',
        slug: 'stackdriver',
        icon: 'integrations/google-cloud',
        component: <StackdriverForm />,
      },
      {
        title: 'CloudWatch',
        subtitle:
          'Integrate CloudWatch to see backend logs and errors alongside session replay.',
        slug: 'cloudwatch',
        icon: 'integrations/aws',
        component: <CloudwatchForm />,
      },
      {
        title: 'Newrelic',
        subtitle:
          'Integrate NewRelic with session replays to seamlessly observe backend errors.',
        slug: 'newrelic',
        icon: 'integrations/newrelic',
        component: <NewrelicForm />,
      },
    ],
  },
  {
    title: 'Collaboration',
    key: 'collaboration',
    isProject: false,
    icon: 'file-code',
    description:
      'Share your sessions with your team and collaborate on issues.',
    integrations: [
      {
        title: 'Slack',
        subtitle:
          'Integrate Slack to empower every user in your org with the ability to send sessions to any Slack channel.',
        slug: 'slack',
        category: 'Errors',
        icon: 'integrations/slack',
        component: <SlackForm />,
        shared: true,
      },
      {
        title: 'MS Teams',
        subtitle:
          'Integrate MS Teams to empower every user in your org with the ability to send sessions to any MS Teams channel.',
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
    title: 'Plugins',
    key: 'plugins',
    isProject: true,
    icon: 'chat-left-text',
    docs: () => (
      <DocCard
        title="What are plugins?"
        icon="question-lg"
        iconBgColor="bg-red-lightest"
        iconColor="red"
      >
        Plugins capture your application’s store, monitor queries, track
        performance issues and even assist your end user through live sessions.
      </DocCard>
    ),
    description:
      "Reproduce issues as if they happened in your own browser. Plugins help capture your application's store, HTTP requeets, GraphQL queries, and more.",
    integrations: [
      {
        title: 'Redux',
        subtitle:
          'Capture Redux actions/state and inspect them later on while replaying session recordings.',
        icon: 'integrations/redux',
        component: <ReduxDoc />,
      },
      {
        title: 'VueX',
        subtitle:
          'Capture VueX mutations/state and inspect them later on while replaying session recordings.',
        icon: 'integrations/vuejs',
        component: <VueDoc />,
      },
      {
        title: 'Pinia',
        subtitle:
          'Capture Pinia mutations/state and inspect them later on while replaying session recordings.',
        icon: 'integrations/pinia',
        component: <PiniaDoc />,
      },
      {
        title: 'GraphQL',
        subtitle:
          'Capture GraphQL requests and inspect them later on while replaying session recordings. This plugin is compatible with Apollo and Relay implementations.',
        icon: 'integrations/graphql',
        component: <GraphQLDoc />,
      },
      {
        title: 'NgRx',
        subtitle:
          'Capture NgRx actions/state and inspect them later on while replaying session recordings.\n',
        icon: 'integrations/ngrx',
        component: <NgRxDoc />,
      },
      {
        title: 'MobX',
        subtitle:
          'Capture MobX mutations and inspect them later on while replaying session recordings.',
        icon: 'integrations/mobx',
        component: <MobxDoc />,
      },
      {
        title: 'Profiler',
        subtitle:
          'Plugin allows you to measure your JS functions performance and capture both arguments and result for each call.',
        icon: 'integrations/openreplay',
        component: <ProfilerDoc />,
      },
      {
        title: 'Assist',
        subtitle:
          'OpenReplay Assist allows you to support your users by seeing their live screen and instantly hopping on call (WebRTC) with them without requiring any 3rd-party screen sharing software.\n',
        icon: 'integrations/openreplay',
        component: <AssistDoc />,
      },
      {
        title: 'Zustand',
        subtitle:
          'Capture Zustand mutations/state and inspect them later on while replaying session recordings.',
        icon: 'integrations/zustand',
        // header: '🐻',
        component: <ZustandDoc />,
      },
    ],
  },
];
