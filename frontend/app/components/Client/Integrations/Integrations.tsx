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
    const _integrations: any = React.useMemo(() => {
        return integrations.reduce((acc: any, curr: any) => {
            if (!acc[curr.category]) {
                acc[curr.category] = [];
            }
            acc[curr.category].push(curr);
            return acc;
        }, {});
    }, [integrations]);

    const onClick = (integration: any) => {
        showModal(integration.component, { right: true });
    };

    return (
        <div className="mb-4">
            {Object.keys(_integrations).map((cat: any) => (
                <div className="mb-2">
                    <h2 className="border-b py-3 uppercase color-gray-medium">{cat}</h2>
                    <div className="grid grid-cols-8 gap-4 py-4">
                        {_integrations[cat].map((integration: any) => (
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
    { title: 'Jira', category: 'Errors', icon: 'integrations/jira', component: <JiraForm /> },
    { title: 'Github', category: 'Errors', icon: 'integrations/github', component: <GithubForm /> },
    { title: 'Slack', category: 'Errors', icon: 'integrations/slack', component: <SlackForm /> },
    { title: 'Sentry', category: 'Errors', icon: 'integrations/sentry', component: <SentryForm /> },
    { title: 'Bugsnag', category: 'Errors', icon: 'integrations/bugsnag', component: <BugsnagForm /> },
    { title: 'Rollbar', category: 'Errors', icon: 'integrations/rollbar', component: <RollbarForm /> },
    { title: 'Elasticsearch', category: 'Search', icon: 'integrations/elasticsearch', component: <ElasticsearchForm /> },
    { title: 'Datadog', category: 'Logs', icon: 'integrations/datadog', component: <DatadogForm /> },
    { title: 'Sumo Logic', category: 'Logs', icon: 'integrations/sumologic', component: <SumoLogicForm /> },
    { title: 'Stackdriver', category: 'Logs', icon: 'integrations/stackdriver', component: <StackdriverForm /> },
    { title: 'CloudWatch', category: 'Logs', icon: 'integrations/cloudwatch', component: <CloudwatchForm /> },
    { title: 'Newrelic', category: 'Logs', icon: 'integrations/newrelic', component: <NewrelicForm /> },
];
