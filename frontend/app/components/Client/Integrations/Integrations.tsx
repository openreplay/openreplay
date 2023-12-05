import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { useModal } from 'App/components/Modal';
import cn from 'classnames';

import { fetch, init } from 'Duck/integrations/actions';
import { fetchIntegrationList, setSiteId } from 'Duck/integrations/integrations';
import SiteDropdown from 'Shared/SiteDropdown';
import ReduxDoc from './ReduxDoc';
import VueDoc from './VueDoc';
import GraphQLDoc from './GraphQLDoc';
import NgRxDoc from './NgRxDoc';
import MobxDoc from './MobxDoc';
import ProfilerDoc from './ProfilerDoc';
import AssistDoc from './AssistDoc';
import PiniaDoc from './PiniaDoc';
import ZustandDoc from './ZustandDoc';
import MSTeams from './Teams';
import DocCard from 'Shared/DocCard/DocCard';
import { PageTitle, Tooltip } from 'UI';
import withPageTitle from 'HOCs/withPageTitle';

import BugsnagForm from './BugsnagForm';
import CloudwatchForm from './CloudwatchForm';
import DatadogForm from './DatadogForm';
import ElasticsearchForm from './ElasticsearchForm';
import GithubForm from './GithubForm';
import IntegrationItem from './IntegrationItem';
import JiraForm from './JiraForm';
import NewrelicForm from './NewrelicForm';
import RollbarForm from './RollbarForm';
import SentryForm from './SentryForm';
import SlackForm from './SlackForm';
import StackdriverForm from './StackdriverForm';
import SumoLogicForm from './SumoLogicForm';
import IntegrationFilters from 'Components/Client/Integrations/IntegrationFilters';

interface Props {
  fetch: (name: string, siteId: string) => void;
  init: () => void;
  fetchIntegrationList: (siteId: any) => void;
  integratedList: any;
  initialSiteId: string;
  setSiteId: (siteId: string) => void;
  siteId: string;
  hideHeader?: boolean;
  loading?: boolean;
}

function Integrations(props: Props) {
  const { initialSiteId, hideHeader = false, loading = false } = props;
  const { showModal } = useModal();
  const [integratedList, setIntegratedList] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    const list = props.integratedList
      .filter((item: any) => item.integrated)
      .map((item: any) => item.name);
    setIntegratedList(list);
  }, [props.integratedList]);

  useEffect(() => {
    props.fetchIntegrationList(initialSiteId);
    props.setSiteId(initialSiteId);
  }, []);

  const onClick = (integration: any, width: number) => {
    if (integration.slug && integration.slug !== 'slack' && integration.slug !== 'msteams') {
      props.fetch(integration.slug, props.siteId);
    }

    showModal(
      React.cloneElement(integration.component, {
        integrated: integratedList.includes(integration.slug)
      }),
      { right: true, width }
    );
  };

  const onChangeSelect = ({ value }: any) => {
    props.setSiteId(value.value);
    props.fetchIntegrationList(value.value);
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
    icon: cat.icon
  }));


  const allIntegrations = filteredIntegrations.flatMap(cat => cat.integrations);


  return (
    <>
      <div className='mb-4 p-5 bg-white rounded-lg border'>
        {!hideHeader && <PageTitle title={<div>Integrations</div>} />}

        <IntegrationFilters onChange={onChange} activeItem={activeFilter} filters={filters} />
      </div>

      <div className='mb-4' />

      <div className={cn(`
    grid 
    gap-3 
    auto-cols-max 
    ${allIntegrations.length > 0 ? 'p-2' : ''}
    grid-cols-1    // default to 1 column
    sm:grid-cols-1 // 1 column on small screens and up
    md:grid-cols-2 // 2 columns on medium screens and up
    lg:grid-cols-3 // 3 columns on large screens and up
    xl:grid-cols-3 // 3 columns on extra-large screens
`)}>
        {allIntegrations.map((integration: any) => (
          <IntegrationItem
            integrated={integratedList.includes(integration.slug)}
            integration={integration}
            onClick={() =>
              onClick(integration, filteredIntegrations.find(cat => cat.integrations.includes(integration)).title === 'Plugins' ? 500 : 350)
            }
            hide={
              (integration.slug === 'github' &&
                integratedList.includes('jira')) ||
              (integration.slug === 'jira' &&
                integratedList.includes('github'))
            }
          />
        ))}
      </div>

    </>
  );
}

export default connect(
  (state: any) => ({
    initialSiteId: state.getIn(['site', 'siteId']),
    integratedList: state.getIn(['integrations', 'list']) || [],
    loading: state.getIn(['integrations', 'fetchRequest', 'loading']),
    siteId: state.getIn(['integrations', 'siteId'])
  }),
  { fetch, init, fetchIntegrationList, setSiteId }
)(withPageTitle('Integrations - OpenReplay Preferences')(Integrations));


const integrations = [
  {
    title: 'Issue Reporting',
    key: 'issue-reporting',
    description: 'Seamlessly report issues or share issues with your team right from OpenReplay.',
    isProject: false,
    icon: 'exclamation-triangle',
    integrations: [
      {
        title: 'Jira',
        subtitle: 'Integrate Jira with OpenReplay to enable the creation of a new ticket directly from a session.',
        slug: 'jira',
        category: 'Errors',
        icon: 'integrations/jira',
        component: <JiraForm />
      },
      {
        title: 'Github',
        subtitle: 'Integrate GitHub with OpenReplay to enable the direct creation of a new issue from a session.',
        slug: 'github',
        category: 'Errors',
        icon: 'integrations/github',
        component: <GithubForm />
      }
    ]
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
        title='Why use integrations?'
        icon='question-lg'
        iconBgColor='bg-red-lightest'
        iconColor='red'
      >
        Sync your backend errors with sessions replays and see what happened front-to-back.
      </DocCard>
    ),
    integrations: [
      {
        title: 'Sentry',
        subtitle: 'Integrate Sentry with session replays to seamlessly observe backend errors.',
        slug: 'sentry',
        icon: 'integrations/sentry',
        component: <SentryForm />
      },
      {
        title: 'Bugsnag',
        subtitle: 'Integrate Bugsnag to access the OpenReplay session linked to the JS exception within its interface.',
        slug: 'bugsnag',
        icon: 'integrations/bugsnag',
        component: <BugsnagForm />
      },
      {
        title: 'Rollbar',
        subtitle: 'Integrate Rollbar with session replays to seamlessly observe backend errors.',
        slug: 'rollbar',
        icon: 'integrations/rollbar',
        component: <RollbarForm />
      },
      {
        title: 'Elasticsearch',
        subtitle: 'Integrate Elasticsearch with session replays to seamlessly observe backend errors.',
        slug: 'elasticsearch',
        icon: 'integrations/elasticsearch',
        component: <ElasticsearchForm />
      },
      {
        title: 'Datadog',
        subtitle: 'Incorporate DataDog to visualize backend errors alongside session replay, for easy troubleshooting.',
        slug: 'datadog',
        icon: 'integrations/datadog',
        component: <DatadogForm />
      },
      {
        title: 'Sumo Logic',
        subtitle: 'Integrate Sumo Logic with session replays to seamlessly observe backend errors.',
        slug: 'sumologic',
        icon: 'integrations/sumologic',
        component: <SumoLogicForm />
      },
      {
        title: 'Google Cloud',
        subtitle: 'Integrate Google Cloud to view backend logs and errors in conjunction with session replay',
        slug: 'stackdriver',
        icon: 'integrations/google-cloud',
        component: <StackdriverForm />
      },
      {
        title: 'CloudWatch',
        subtitle: 'Integrate CloudWatch to see backend logs and errors alongside session replay.',
        slug: 'cloudwatch',
        icon: 'integrations/aws',
        component: <CloudwatchForm />
      },
      {
        title: 'Newrelic',
        subtitle: 'Integrate NewRelic with session replays to seamlessly observe backend errors.',
        slug: 'newrelic',
        icon: 'integrations/newrelic',
        component: <NewrelicForm />
      }
    ]
  },
  {
    title: 'Collaboration',
    key: 'collaboration',
    isProject: false,
    icon: 'file-code',
    description: 'Share your sessions with your team and collaborate on issues.',
    integrations: [
      {
        title: 'Slack',
        subtitle: 'Integrate Slack to empower every user in your org with the ability to send sessions to any Slack channel.',
        slug: 'slack',
        category: 'Errors',
        icon: 'integrations/slack',
        component: <SlackForm />,
        shared: true
      },
      {
        title: 'MS Teams',
        subtitle: 'Integrate MS Teams to empower every user in your org with the ability to send sessions to any MS Teams channel.',
        slug: 'msteams',
        category: 'Errors',
        icon: 'integrations/teams',
        component: <MSTeams />,
        shared: true
      }
    ]
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
        title='What are plugins?'
        icon='question-lg'
        iconBgColor='bg-red-lightest'
        iconColor='red'
      >
        Plugins capture your application’s store, monitor queries, track performance issues and even
        assist your end user through live sessions.
      </DocCard>
    ),
    description:
      'Reproduce issues as if they happened in your own browser. Plugins help capture your application\'s store, HTTP requeets, GraphQL queries, and more.',
    integrations: [
      {
        title: 'Redux',
        subtitle: 'Capture Redux actions/state and inspect them later on while replaying session recordings.',
        icon: 'integrations/redux', component: <ReduxDoc />
      },
      {
        title: 'VueX',
        subtitle: 'Capture VueX mutations/state and inspect them later on while replaying session recordings.',
        icon: 'integrations/vuejs',
        component: <VueDoc />
      },
      {
        title: 'Pinia',
        subtitle: 'Capture Pinia mutations/state and inspect them later on while replaying session recordings.',
        icon: 'integrations/pinia',
        component: <PiniaDoc />
      },
      {
        title: 'GraphQL',
        subtitle: 'Capture GraphQL requests and inspect them later on while replaying session recordings. This plugin is compatible with Apollo and Relay implementations.',
        icon: 'integrations/graphql',
        component: <GraphQLDoc />
      },
      {
        title: 'NgRx',
        subtitle: 'Capture NgRx actions/state and inspect them later on while replaying session recordings.\n',
        icon: 'integrations/ngrx',
        component: <NgRxDoc />
      },
      {
        title: 'MobX',
        subtitle: 'Capture MobX mutations and inspect them later on while replaying session recordings.',
        icon: 'integrations/mobx',
        component: <MobxDoc />
      },
      {
        title: 'Profiler',
        subtitle: 'Plugin allows you to measure your JS functions performance and capture both arguments and result for each call.',
        icon: 'integrations/openreplay',
        component: <ProfilerDoc />
      },
      {
        title: 'Assist',
        subtitle: 'OpenReplay Assist allows you to support your users by seeing their live screen and instantly hopping on call (WebRTC) with them without requiring any 3rd-party screen sharing software.\n',
        icon: 'integrations/openreplay',
        component: <AssistDoc />
      },
      {
        title: 'Zustand',
        subtitle: 'Capture Zustand mutations/state and inspect them later on while replaying session recordings.',
        icon: 'integrations/zustand',
        // header: '🐻',
        component: <ZustandDoc />
      }
    ]
  }
];
