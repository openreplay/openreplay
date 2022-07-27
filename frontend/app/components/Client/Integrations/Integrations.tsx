import { useModal } from 'App/components/Modal';
import React from 'react';
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

interface Props {}
function Integrations(props: Props) {
    const { showModal } = useModal();
    // const _integrations: any = React.useMemo(() => {
    //     return integrations.reduce((acc: any, curr: any) => {
    //         if (!acc[curr.category]) {
    //             acc[curr.category] = [];
    //         }
    //         acc[curr.category].push(curr);
    //         return acc;
    //     }, {});
    // }, [integrations]);

    const onClick = (integration: any) => {
        showModal(integration.component, { right: true });
    };

    return (
        <div className="mb-4">
            {integrations.map((cat: any) => (
                <div className="mb-2 border-b last:border-none py-3">
                    <h2 className="font-medium text-lg">{cat.title}</h2>
                    <div className="">{cat.description}</div>
                    <div className="flex flex-wrap mt-4">
                        {cat.integrations.map((integration: any) => (
                            <IntegrationItem key={integration.name} integration={integration} onClick={() => onClick(integration)} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default Integrations;


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
            { title: 'Sentry', icon: 'integrations/sentry', component: <SentryForm /> },
            { title: 'Bugsnag', icon: 'integrations/bugsnag', component: <BugsnagForm /> },
            { title: 'Rollbar', icon: 'integrations/rollbar', component: <RollbarForm /> },
            { title: 'Elasticsearch', icon: 'integrations/elasticsearch', component: <ElasticsearchForm /> },
            { title: 'Datadog', icon: 'integrations/datadog', component: <DatadogForm /> },
            { title: 'Sumo Logic', icon: 'integrations/sumologic', component: <SumoLogicForm /> },
            { title: 'Google Cloud', subtitle: "(Stackdriver)", icon: 'integrations/stackdriver', component: <StackdriverForm /> },
            { title: 'AWS', subtitle: "(CloudWatch)", icon: 'integrations/cloudwatch', component: <CloudwatchForm /> },
            { title: 'Newrelic', icon: 'integrations/newrelic', component: <NewrelicForm /> },
        ],
    },
    {
        title: 'Plugins',
        description:
            "Reproduce issues as if they happened in your own browser. Plugins help capture your application's store, HTTP requeets, GraphQL queries, and more.",
        integrations: [
            { title: 'Sentry', icon: 'integrations/sentry', component: <SentryForm /> },
            { title: 'Bugsnag', icon: 'integrations/bugsnag', component: <BugsnagForm /> },
        ],
    },
];
