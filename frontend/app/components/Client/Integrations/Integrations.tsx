import { useModal } from 'App/components/Modal';
import React, { useEffect } from 'react';
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
import { fetch, init } from 'Duck/integrations/actions';
import { fetchIntegrationList, setSiteId } from 'Duck/integrations/integrations';
import { connect } from 'react-redux';
import SiteDropdown from 'Shared/SiteDropdown';
import ReduxDoc from './ReduxDoc';
import VueDoc from './VueDoc';
import GraphQLDoc from './GraphQLDoc';
import NgRxDoc from './NgRxDoc';
import MobxDoc from './MobxDoc';
import ProfilerDoc from './ProfilerDoc';
import AssistDoc from './AssistDoc';
import { PageTitle, Tooltip } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import withPageTitle from 'HOCs/withPageTitle';
import PiniaDoc from './PiniaDoc'
import ZustandDoc from './ZustandDoc'
import MSTeams from './Teams'

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
    const [integratedList, setIntegratedList] = React.useState([]);

    useEffect(() => {
        const list = props.integratedList.filter((item: any) => item.integrated).map((item: any) => item.name);
        setIntegratedList(list);
    }, [props.integratedList]);

    useEffect(() => {
        if (!props.siteId) {
            props.setSiteId(initialSiteId);
            props.fetchIntegrationList(initialSiteId);
        } else {
            props.fetchIntegrationList(props.siteId);
        }
    }, []);

    const onClick = (integration: any, width: number) => {
        if (integration.slug) {
            props.fetch(integration.slug, props.siteId);
        }
        showModal(integration.component, { right: true, width });
    };

    const onChangeSelect = ({ value }: any) => {
        props.setSiteId(value.value);
        props.fetchIntegrationList(value.value);
    };

    return (
        <div className="mb-4 p-5">
            {!hideHeader && <PageTitle title={<div>Integrations</div>} />}
            {integrations.map((cat: any) => (
                <div className="mb-2 border-b last:border-none py-3" key={cat.key}>
                    <div className="flex items-center">
                        <h2 className="font-medium text-lg">{cat.title}</h2>
                        {cat.isProject && (
                            <div className="flex items-center">
                                <div className="flex flex-wrap mx-4">
                                    <SiteDropdown value={props.siteId} onChange={onChangeSelect} />
                                </div>
                                {loading && cat.isProject && <AnimatedSVG name={ICONS.LOADER} size={20} />}
                            </div>
                        )}
                    </div>
                    <div className="">{cat.description}</div>

                    <div className="flex flex-wrap mt-4">
                        {cat.integrations.map((integration: any) => (
                          <React.Fragment key={integration.slug}>
                              <Tooltip
                                delay={50}
                                title="Global configuration, available to all team members."
                                disabled={!integration.shared}
                                placement={"bottom"}
                              >
                                <IntegrationItem
                                    integrated={integratedList.includes(integration.slug)}
                                    integration={integration}
                                    onClick={() => onClick(integration, cat.title === "Plugins" ? 500 : 350)}
                                    hide={
                                        (integration.slug === 'github' && integratedList.includes('jira')) ||
                                        (integration.slug === 'jira' && integratedList.includes('github'))
                                    }
                                />
                              </Tooltip>
                          </React.Fragment>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default connect(
    (state: any) => ({
        initialSiteId: state.getIn(['site', 'siteId']),
        integratedList: state.getIn(['integrations', 'list']) || [],
        loading: state.getIn(['integrations', 'fetchRequest', 'loading']),
        siteId: state.getIn(['integrations', 'siteId']),
    }),
    { fetch, init, fetchIntegrationList, setSiteId }
)(withPageTitle('Integrations - OpenReplay Preferences')(Integrations));

const integrations = [
    {
        title: 'Issue Reporting and Collaborations',
        key: 1,
        description: 'Seamlessly report issues or share issues with your team right from OpenReplay.',
        isProject: false,
        integrations: [
            { title: 'Jira', slug: 'jira', category: 'Errors', icon: 'integrations/jira', component: <JiraForm /> },
            { title: 'Github', slug: 'github', category: 'Errors', icon: 'integrations/github', component: <GithubForm /> },
            { title: 'Slack', slug: 'slack', category: 'Errors', icon: 'integrations/slack', component: <SlackForm />, shared: true },
            { title: 'MS Teams', slug: 'msteams', category: 'Errors', icon: 'integrations/teams', component: <MSTeams />, shared: true },
        ],
    },
    {
        title: 'Backend Logging',
        key: 2,
        isProject: true,
        description: 'Sync your backend errors with sessions replays and see what happened front-to-back.',
        integrations: [
            { title: 'Sentry', slug: 'sentry', icon: 'integrations/sentry', component: <SentryForm /> },
            { title: 'Bugsnag', slug: 'bugsnag', icon: 'integrations/bugsnag', component: <BugsnagForm /> },
            { title: 'Rollbar', slug: 'rollbar', icon: 'integrations/rollbar', component: <RollbarForm /> },
            { title: 'Elasticsearch', slug: 'elasticsearch', icon: 'integrations/elasticsearch', component: <ElasticsearchForm /> },
            { title: 'Datadog', slug: 'datadog', icon: 'integrations/datadog', component: <DatadogForm /> },
            { title: 'Sumo Logic', slug: 'sumologic', icon: 'integrations/sumologic', component: <SumoLogicForm /> },
            {
                title: 'Stackdriver',
                slug: 'stackdriver',
                icon: 'integrations/google-cloud',
                component: <StackdriverForm />,
            },
            { title: 'CloudWatch', slug: 'cloudwatch', icon: 'integrations/aws', component: <CloudwatchForm /> },
            { title: 'Newrelic', slug: 'newrelic', icon: 'integrations/newrelic', component: <NewrelicForm /> },
        ],
    },
    {
        title: 'Plugins',
        key: 3,
        isProject: true,
        description:
            "Reproduce issues as if they happened in your own browser. Plugins help capture your application's store, HTTP requeets, GraphQL queries, and more.",
        integrations: [
            { title: 'Redux', slug: 'redux', icon: 'integrations/redux', component: <ReduxDoc /> },
            { title: 'VueX', slug: 'vuex', icon: 'integrations/vuejs', component: <VueDoc /> },
            { title: 'Pinia', slug: 'pinia', icon: 'integrations/pinia', component: <PiniaDoc /> },
            { title: 'GraphQL', slug: 'graphql', icon: 'integrations/graphql', component: <GraphQLDoc /> },
            { title: 'NgRx', slug: 'ngrx', icon: 'integrations/ngrx', component: <NgRxDoc /> },
            { title: 'MobX', slug: 'mobx', icon: 'integrations/mobx', component: <MobxDoc /> },
            { title: 'Profiler', slug: 'profiler', icon: 'integrations/openreplay', component: <ProfilerDoc /> },
            { title: 'Assist', slug: 'assist', icon: 'integrations/openreplay', component: <AssistDoc /> },
            { title: 'Zustand', slug: 'zustand', icon: '', header: '🐻', component: <ZustandDoc /> }
        ],
    },
];
