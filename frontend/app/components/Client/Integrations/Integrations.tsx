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
import { fetchList, init } from 'Duck/integrations/actions';
import { connect } from 'react-redux';
import { withRequest } from 'HOCs';

interface Props {
    fetchList: (name: string) => void;
    init: () => void;
    fetchIntegratedList: () => void;
    integratedList: any;
}
function Integrations(props: Props) {
    const { showModal } = useModal();
    const [loading, setLoading] = React.useState(true);
    const [integratedList, setIntegratedList] = React.useState([]);

    useEffect(() => {
        const list = props.integratedList.map((item: any) => item.name);
        console.log('list', list)
        setIntegratedList(list);
    }, [props.integratedList]);

    useEffect(() => {
    //     const promosies: any[] = [];
        props.fetchIntegratedList();
    //     console.log('fetchIntegratedList', props);
    //     // integrations.forEach((cat: any) => {
    //     //     cat.integrations.forEach((integration: any) => {
    //     //         if (integration.slug) {
    //     //             promosies.push(props.fetchList(integration.slug));
    //     //         }
    //     //     });
    //     // });

    //     // Promise.all(promosies)
    //     //     .then(() => {
    //     //         setLoading(false);
    //     //     })
    //     //     .catch(() => {});
    }, []);

    useEffect(() => {
        if (loading) {
            return;
        }
    }, [loading]);

    const onClick = (integration: any) => {
        showModal(integration.component, { right: true });
    };

    console.log('integratedList',integratedList);

    return (
        <div className="mb-4">
            {integrations.map((cat: any) => (
                <div className="mb-2 border-b last:border-none py-3">
                    <h2 className="font-medium text-lg">{cat.title}</h2>
                    <div className="">{cat.description}</div>
                    <div className="flex flex-wrap mt-4">
                        {cat.integrations.map((integration: any) => (
                            <IntegrationItem
                                integrated={integratedList.includes(integration.slug)}
                                key={integration.name}
                                integration={integration}
                                onClick={() => onClick(integration)}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default connect(null, { fetchList, init })(
    withRequest({
        dataName: 'integratedList',
        initialData: [],
        dataWrapper: (data: any) => data.filter((i: any) => i.integrated),
        loadingName: 'listLoading',
        requestName: 'fetchIntegratedList',
        endpoint: `/integrations`,
        method: 'GET',
    })(Integrations)
);

const integrations = [
    {
        title: 'Issue Reporting and Collaborations',
        description: 'Seamlessly report issues or share issues with your team right from OpenReplay.',
        integrations: [
            { title: 'Jira', category: 'Errors', icon: 'integrations/jira', component: <JiraForm /> },
            { title: 'Github', category: 'Errors', icon: 'integrations/github', component: <GithubForm /> },
            { title: 'Slack', category: 'Errors', icon: 'integrations/slack', component: <SlackForm /> },
        ],
    },
    {
        title: 'Backend Logging',
        description: 'Sync your backend errors with sessions replays and see what happened front-to-back.',
        integrations: [
            { title: 'Sentry', slug: 'sentry', icon: 'integrations/sentry', component: <SentryForm /> },
            { title: 'Datadog', slug: 'datadog', icon: 'integrations/datadog', component: <BugsnagForm /> },
            { title: 'Rollbar', slug: 'rollbar', icon: 'integrations/rollbar', component: <RollbarForm /> },
            { title: 'Elasticsearch', slug: 'elasticsearch', icon: 'integrations/elasticsearch', component: <ElasticsearchForm /> },
            { title: 'Datadog', slug: 'datadog', icon: 'integrations/datadog', component: <DatadogForm /> },
            { title: 'Sumo Logic', slug: 'sumologic', icon: 'integrations/sumologic', component: <SumoLogicForm /> },
            {
                title: 'Google Cloud',
                slug: 'stackdriver',
                subtitle: '(Stackdriver)',
                icon: 'integrations/google-cloud',
                component: <StackdriverForm />,
            },
            { title: 'AWS', slug: 'cloudwatch', subtitle: '(CloudWatch)', icon: 'integrations/aws', component: <CloudwatchForm /> },
            { title: 'Newrelic', slug: 'newrelic', icon: 'integrations/newrelic', component: <NewrelicForm /> },
        ],
    },
    {
        title: 'Plugins',
        description:
            "Reproduce issues as if they happened in your own browser. Plugins help capture your application's store, HTTP requeets, GraphQL queries, and more.",
        integrations: [
            { title: 'Sentry', slug: 'sentry', icon: 'integrations/sentry', component: <SentryForm /> },
            { title: 'Bugsnag', slug: '', icon: 'integrations/bugsnag', component: <BugsnagForm /> },
        ],
    },
];
