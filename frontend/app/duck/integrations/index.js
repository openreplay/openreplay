import SentryConfig from 'Types/integrations/sentryConfig';
import DatadogConfig from 'Types/integrations/datadogConfig';
import StackdriverConfig from 'Types/integrations/stackdriverConfig';
import RollbarConfig from 'Types/integrations/rollbarConfig';
import NewrelicConfig from 'Types/integrations/newrelicConfig';
import BugsnagConfig from 'Types/integrations/bugsnagConfig';
import CloudWatch from 'Types/integrations/cloudwatchConfig';
import ElasticsearchConfig from 'Types/integrations/elasticsearchConfig';
import SumoLogicConfig from 'Types/integrations/sumoLogicConfig';
import JiraConfig from 'Types/integrations/jiraConfig';
import GithubConfig from 'Types/integrations/githubConfig';
import IssueTracker from 'Types/integrations/issueTracker';
import slack from './slack';
import integrations from './integrations';

import { createIntegrationReducer } from './reducer';

export default {
    sentry: createIntegrationReducer('sentry', SentryConfig),
    datadog: createIntegrationReducer('datadog', DatadogConfig),
    stackdriver: createIntegrationReducer('stackdriver', StackdriverConfig),
    rollbar: createIntegrationReducer('rollbar', RollbarConfig),
    newrelic: createIntegrationReducer('newrelic', NewrelicConfig),
    bugsnag: createIntegrationReducer('bugsnag', BugsnagConfig),
    cloudwatch: createIntegrationReducer('cloudwatch', CloudWatch),
    elasticsearch: createIntegrationReducer('elasticsearch', ElasticsearchConfig),
    sumologic: createIntegrationReducer('sumologic', SumoLogicConfig),
    jira: createIntegrationReducer('jira', JiraConfig),
    github: createIntegrationReducer('github', GithubConfig),
    issues: createIntegrationReducer('issues', IssueTracker),
    slack,
    integrations,
};

export * from './actions';
