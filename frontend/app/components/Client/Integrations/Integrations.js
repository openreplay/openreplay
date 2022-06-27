import React from "react";
import { connect } from "react-redux";
import withPageTitle from "HOCs/withPageTitle";
import { Loader, IconButton, SlideModal } from "UI";
import { fetchList as fetchListSlack } from "Duck/integrations/slack";
import { remove as removeIntegrationConfig } from "Duck/integrations/actions";
import { fetchList, init } from "Duck/integrations/actions";
import cn from "classnames";

import IntegrationItem from "./IntegrationItem";
import SentryForm from "./SentryForm";
import GithubForm from "./GithubForm";
import SlackForm from "./SlackForm";
import DatadogForm from "./DatadogForm";
import StackdriverForm from "./StackdriverForm";
import RollbarForm from "./RollbarForm";
import NewrelicForm from "./NewrelicForm";
import BugsnagForm from "./BugsnagForm";
import CloudwatchForm from "./CloudwatchForm";
import ElasticsearchForm from "./ElasticsearchForm";
import SumoLogicForm from "./SumoLogicForm";
import JiraForm from "./JiraForm";
import styles from "./integrations.module.css";
import ReduxDoc from "./ReduxDoc";
import VueDoc from "./VueDoc";
import GraphQLDoc from "./GraphQLDoc";
import NgRxDoc from "./NgRxDoc/NgRxDoc";
import SlackAddForm from "./SlackAddForm";
import FetchDoc from "./FetchDoc";
import MobxDoc from "./MobxDoc";
import ProfilerDoc from "./ProfilerDoc";
import AssistDoc from "./AssistDoc";
import AxiosDoc from "./AxiosDoc/AxiosDoc";

const NONE = -1;
const SENTRY = 0;
const DATADOG = 1;
const STACKDRIVER = 2;
const ROLLBAR = 3;
const NEWRELIC = 4;
const BUGSNAG = 5;
const CLOUDWATCH = 6;
const ELASTICSEARCH = 7;
const SUMOLOGIC = 8;
const JIRA = 9;
const GITHUB = 10;
const REDUX = 11;
const VUE = 12;
const GRAPHQL = 13;
const NGRX = 14;
const SLACK = 15;
const FETCH = 16;
const MOBX = 17;
const PROFILER = 18;
const ASSIST = 19;
const AXIOS = 20;

const TITLE = {
    [SENTRY]: "Sentry",
    [SLACK]: "Slack",
    [DATADOG]: "Datadog",
    [STACKDRIVER]: "Stackdriver",
    [ROLLBAR]: "Rollbar",
    [NEWRELIC]: "New Relic",
    [BUGSNAG]: "Bugsnag",
    [CLOUDWATCH]: "CloudWatch",
    [ELASTICSEARCH]: "Elastic Search",
    [SUMOLOGIC]: "Sumo Logic",
    [JIRA]: "Jira",
    [GITHUB]: "Github",
    [REDUX]: "Redux",
    [VUE]: "VueX",
    [GRAPHQL]: "GraphQL",
    [NGRX]: "NgRx",
    [FETCH]: "Fetch",
    [MOBX]: "MobX",
    [PROFILER]: "Profiler",
    [ASSIST]: "Assist",
    [AXIOS]: "Axios",
};

const DOCS = [REDUX, VUE, GRAPHQL, NGRX, FETCH, MOBX, PROFILER, ASSIST];

const integrations = [
    "sentry",
    "datadog",
    "stackdriver",
    "rollbar",
    "newrelic",
    "bugsnag",
    "cloudwatch",
    "elasticsearch",
    "sumologic",
    "issues",
];

@connect(
    (state) => {
        const props = {};
        integrations.forEach((name) => {
            props[`${name}Integrated`] =
                name === "issues"
                    ? !!(
                          state.getIn([name, "list"]).first() &&
                          state.getIn([name, "list"]).first().token
                      )
                    : state.getIn([name, "list"]).size > 0;
            props.loading =
                props.loading || state.getIn([name, "fetchRequest", "loading"]);
        });
        const site = state.getIn(["site", "instance"]);
        return {
            ...props,
            issues: state.getIn(["issues", "list"]).first() || {},
            slackChannelListExists: state.getIn(["slack", "list"]).size > 0,
            tenantId: state.getIn(["user", "account", "tenantId"]),
            jwt: state.get("jwt"),
            projectKey: site ? site.projectKey : "",
        };
    },
    {
        fetchList,
        init,
        fetchListSlack,
        removeIntegrationConfig,
    }
)
@withPageTitle("Integrations - OpenReplay Preferences")
export default class Integrations extends React.PureComponent {
    state = {
        modalContent: NONE,
        showDetailContent: false,
    };

    componentWillMount() {
        integrations.forEach((name) => this.props.fetchList(name));
        this.props.fetchListSlack();
    }

    onClickIntegrationItem = (e, url) => {
        e.preventDefault();
        window.open(url);
    };

    closeModal = () =>
        this.setState({ modalContent: NONE, showDetailContent: false });

    onOauthClick = (source) => {
        if (source === GITHUB) {
            const githubUrl = `https://auth.openreplay.com/oauth/login?provider=github&back_url=${document.location.href}`;
            const options = {
                method: "GET",
                credentials: "include",
                headers: new Headers({
                    Authorization: "Bearer " + this.props.jwt.toString(),
                }),
            };
            fetch(githubUrl, options).then((resp) =>
                resp.text().then((txt) => window.open(txt, "_self"))
            );
        }
    };

    renderDetailContent() {
        switch (this.state.modalContent) {
            case SLACK:
                return (
                    <SlackAddForm
                        onClose={() =>
                            this.setState({ showDetailContent: false })
                        }
                    />
                );
        }
    }

    renderModalContent() {
        const { projectKey } = this.props;

        switch (this.state.modalContent) {
            case SENTRY:
                return <SentryForm onClose={this.closeModal} />;
            case GITHUB:
                return <GithubForm onClose={this.closeModal} />;
            case SLACK:
                return (
                    <SlackForm
                        onClose={this.closeModal}
                        onEdit={() =>
                            this.setState({ showDetailContent: true })
                        }
                    />
                );
            case DATADOG:
                return <DatadogForm onClose={this.closeModal} />;
            case STACKDRIVER:
                return <StackdriverForm onClose={this.closeModal} />;
            case ROLLBAR:
                return <RollbarForm onClose={this.closeModal} />;
            case NEWRELIC:
                return <NewrelicForm onClose={this.closeModal} />;
            case BUGSNAG:
                return <BugsnagForm onClose={this.closeModal} />;
            case CLOUDWATCH:
                return <CloudwatchForm onClose={this.closeModal} />;
            case ELASTICSEARCH:
                return <ElasticsearchForm onClose={this.closeModal} />;
            case SUMOLOGIC:
                return <SumoLogicForm onClose={this.closeModal} />;
            case JIRA:
                return <JiraForm onClose={this.closeModal} />;
            case REDUX:
                return (
                    <ReduxDoc
                        onClose={this.closeModal}
                        projectKey={projectKey}
                    />
                );
            case VUE:
                return (
                    <VueDoc onClose={this.closeModal} projectKey={projectKey} />
                );
            case GRAPHQL:
                return (
                    <GraphQLDoc
                        onClose={this.closeModal}
                        projectKey={projectKey}
                    />
                );
            case NGRX:
                return (
                    <NgRxDoc
                        onClose={this.closeModal}
                        projectKey={projectKey}
                    />
                );
            case FETCH:
                return (
                    <FetchDoc
                        onClose={this.closeModal}
                        projectKey={projectKey}
                    />
                );
            case MOBX:
                return (
                    <MobxDoc
                        onClose={this.closeModal}
                        projectKey={projectKey}
                    />
                );
            case PROFILER:
                return (
                    <ProfilerDoc
                        onClose={this.closeModal}
                        projectKey={projectKey}
                    />
                );
            case ASSIST:
                return (
                    <AssistDoc
                        onClose={this.closeModal}
                        projectKey={projectKey}
                    />
                );
            case AXIOS:
                return (
                    <AxiosDoc
                        onClose={this.closeModal}
                        projectKey={projectKey}
                    />
                );
            default:
                return null;
        }
    }

    deleteHandler = (name) => {
        this.props.removeIntegrationConfig(name, null).then(
            function () {
                this.props.fetchList(name);
            }.bind(this)
        );
    };

    showIntegrationConfig = (type) => {
        this.setState({ modalContent: type });
    };

    render() {
        const {
            loading,
            sentryIntegrated,
            stackdriverIntegrated,
            datadogIntegrated,
            rollbarIntegrated,
            newrelicIntegrated,
            bugsnagIntegrated,
            cloudwatchIntegrated,
            elasticsearchIntegrated,
            sumologicIntegrated,
            hideHeader = false,
            plugins = false,
            jiraIntegrated,
            issuesIntegrated,
            tenantId,
            slackChannelListExists,
            issues,
        } = this.props;
        const { modalContent, showDetailContent } = this.state;
        return (
            <div className={styles.wrapper}>
                <SlideModal
                    title={
                        <div className="flex items-center">
                            <div className="mr-4">{TITLE[modalContent]}</div>
                            {modalContent === SLACK && (
                                <IconButton
                                    circle
                                    icon="plus"
                                    outline
                                    small="small"
                                    onClick={() =>
                                        this.setState({
                                            showDetailContent: true,
                                        })
                                    }
                                />
                            )}
                        </div>
                    }
                    isDisplayed={modalContent !== NONE}
                    onClose={this.closeModal}
                    size={
                        DOCS.includes(this.state.modalContent)
                            ? "middle"
                            : "small"
                    }
                    content={this.renderModalContent()}
                    detailContent={
                        showDetailContent && this.renderDetailContent()
                    }
                />

                {!hideHeader && (
                    <div className={styles.tabHeader}>
                        <h3 className={cn(styles.tabTitle, "text-2xl")}>
                            {"Integrations"}
                        </h3>
                        <p className={styles.subText}>
                            Power your workflow with your favourite tools.
                        </p>
                        <div className={styles.divider} />
                    </div>
                )}

                {plugins && (
                    <div className="">
                        <div className="mb-4">
                            Use plugins to better debug your application's
                            store, monitor queries and track performance issues.
                        </div>
                        <div className="flex flex-wrap">
                            <IntegrationItem
                                title="Redux"
                                icon="integrations/redux"
                                url={null}
                                dockLink="https://docs.openreplay.com/integrations/sentry"
                                onClick={() =>
                                    this.showIntegrationConfig(REDUX)
                                }
                                // integrated={ sentryIntegrated }
                            />
                            <IntegrationItem
                                title="VueX"
                                icon="integrations/vuejs"
                                url={null}
                                dockLink="https://docs.openreplay.com/integrations/sentry"
                                onClick={() => this.showIntegrationConfig(VUE)}
                                // integrated={ sentryIntegrated }
                            />
                            <IntegrationItem
                                title="GraphQL"
                                icon="integrations/graphql"
                                url={null}
                                dockLink="https://docs.openreplay.com/integrations/sentry"
                                onClick={() =>
                                    this.showIntegrationConfig(GRAPHQL)
                                }
                                // integrated={ sentryIntegrated }
                            />
                            <IntegrationItem
                                title="NgRx"
                                icon="integrations/ngrx"
                                url={null}
                                dockLink="https://docs.openreplay.com/integrations/sentry"
                                onClick={() => this.showIntegrationConfig(NGRX)}
                                // integrated={ sentryIntegrated }
                            />
                            <IntegrationItem
                                title="MobX"
                                icon="integrations/mobx"
                                url={null}
                                dockLink="https://docs.openreplay.com/integrations/sentry"
                                onClick={() => this.showIntegrationConfig(MOBX)}
                                // integrated={ sentryIntegrated }
                            />
                            <IntegrationItem
                                title="Fetch"
                                icon="integrations/openreplay"
                                url={null}
                                dockLink="https://docs.openreplay.com/integrations/sentry"
                                onClick={() =>
                                    this.showIntegrationConfig(FETCH)
                                }
                                // integrated={ sentryIntegrated }
                            />
                            <IntegrationItem
                                title="Profiler"
                                icon="integrations/openreplay"
                                url={null}
                                dockLink="https://docs.openreplay.com/integrations/sentry"
                                onClick={() =>
                                    this.showIntegrationConfig(PROFILER)
                                }
                                // integrated={ sentryIntegrated }
                            />
                            <IntegrationItem
                                title="Axios"
                                icon="integrations/openreplay"
                                url={null}
                                dockLink="https://docs.openreplay.com/plugins/axios"
                                onClick={() =>
                                    this.showIntegrationConfig(AXIOS)
                                }
                                // integrated={ sentryIntegrated }
                            />
                            <IntegrationItem
                                title="Assist"
                                icon="integrations/assist"
                                url={null}
                                dockLink="https://docs.openreplay.com/installation/assist"
                                onClick={() =>
                                    this.showIntegrationConfig(ASSIST)
                                }
                                // integrated={ sentryIntegrated }
                            />
                        </div>
                    </div>
                )}

                {!plugins && (
                    <Loader loading={loading}>
                        <div className={styles.content}>
                            <div className="">
                                <div className="mb-4">
                                    How are you monitoring errors and crash
                                    reporting?
                                </div>
                                <div className="flex flex-wrap">
                                    {(!issues.token ||
                                        issues.provider !== "github") && (
                                        <IntegrationItem
                                            title="Jira"
                                            description="Jira is a proprietary issue tracking product developed by Atlassian that allows bug tracking and agile project management."
                                            icon="integrations/jira"
                                            url={null}
                                            dockLink="https://docs.openreplay.com/integrations/jira"
                                            onClick={() =>
                                                this.showIntegrationConfig(JIRA)
                                            }
                                            integrated={issuesIntegrated}
                                        />
                                    )}
                                    {(!issues.token ||
                                        issues.provider !== "jira") && (
                                        <IntegrationItem
                                            title="Github"
                                            description="Easily share issues on GitHub directly from any session replay."
                                            icon="integrations/github"
                                            url={`https://auth.openreplay.com/oauth/login?provider=github&back_url=${
                                                window.env.ORIGIN ||
                                                window.location.origin
                                            }`}
                                            onClick={() =>
                                                this.showIntegrationConfig(
                                                    GITHUB
                                                )
                                            }
                                            integrated={issuesIntegrated}
                                            deleteHandler={
                                                issuesIntegrated
                                                    ? () =>
                                                          this.deleteHandler(
                                                              "issues"
                                                          )
                                                    : null
                                            }
                                        />
                                    )}

                                    <IntegrationItem
                                        title="Slack"
                                        description="Error tracking that helps developers monitor and fix crashes in real time."
                                        icon="integrations/slack"
                                        url={null}
                                        dockLink="https://docs.openreplay.com/integrations/sentry"
                                        onClick={() =>
                                            this.showIntegrationConfig(SLACK)
                                        }
                                        integrated={sentryIntegrated}
                                    />
                                    <IntegrationItem
                                        title="Sentry"
                                        description="Error tracking that helps developers monitor and fix crashes in real time."
                                        icon="integrations/sentry"
                                        url={null}
                                        dockLink="https://docs.openreplay.com/integrations/sentry"
                                        onClick={() =>
                                            this.showIntegrationConfig(SENTRY)
                                        }
                                        integrated={sentryIntegrated}
                                    />

                                    <IntegrationItem
                                        title="Bugsnag"
                                        description="Bugsnag is an error-monitoring tool that allows your developers to identify, prioritize and replicate bugs in a time-efficient and enjoyable manner."
                                        icon="integrations/bugsnag"
                                        url={null}
                                        dockLink="https://docs.openreplay.com/integrations/bugsnag"
                                        onClick={() =>
                                            this.showIntegrationConfig(BUGSNAG)
                                        }
                                        integrated={bugsnagIntegrated}
                                    />

                                    <IntegrationItem
                                        title="Rollbar"
                                        description="Rollbar provides real-time error tracking & debugging tools for developers."
                                        icon="integrations/rollbar"
                                        url={null}
                                        dockLink="https://docs.openreplay.com/integrations/rollbar"
                                        onClick={() =>
                                            this.showIntegrationConfig(ROLLBAR)
                                        }
                                        integrated={rollbarIntegrated}
                                    />

                                    <IntegrationItem
                                        title="Elastic Search"
                                        description="Elasticsearch is a distributed, RESTful search and analytics engine capable of addressing a growing number of use cases."
                                        icon="integrations/elasticsearch"
                                        url={null}
                                        dockLink="https://docs.openreplay.com/integrations/elastic"
                                        onClick={() =>
                                            this.showIntegrationConfig(
                                                ELASTICSEARCH
                                            )
                                        }
                                        integrated={elasticsearchIntegrated}
                                    />

                                    <IntegrationItem
                                        title="Datadog"
                                        description="Monitoring service for cloud-scale applications, providing monitoring of servers, databases, tools, and services."
                                        icon="integrations/datadog"
                                        url={null}
                                        dockLink="https://docs.openreplay.com/integrations/datadog"
                                        onClick={() =>
                                            this.showIntegrationConfig(DATADOG)
                                        }
                                        integrated={datadogIntegrated}
                                    />
                                    <IntegrationItem
                                        title="Sumo Logic"
                                        description="Sumo Logic to collaborate, develop, operate, and secure their applications at cloud scale."
                                        icon="integrations/sumologic"
                                        url={null}
                                        dockLink="https://docs.openreplay.com/integrations/sumo"
                                        onClick={() =>
                                            this.showIntegrationConfig(
                                                SUMOLOGIC
                                            )
                                        }
                                        integrated={sumologicIntegrated}
                                    />
                                    <IntegrationItem
                                        title="Stackdriver"
                                        description="Monitoring and management for services, containers, applications, and infrastructure."
                                        icon="integrations/stackdriver"
                                        url={null}
                                        dockLink="https://docs.openreplay.com/integrations/stackdriver"
                                        onClick={() =>
                                            this.showIntegrationConfig(
                                                STACKDRIVER
                                            )
                                        }
                                        integrated={stackdriverIntegrated}
                                    />

                                    <IntegrationItem
                                        title="CloudWatch"
                                        description="Amazon CloudWatch is a monitoring and management service that provides data and actionable insights for AWS, hybrid, and on-premises applications and infrastructure resources."
                                        icon="integrations/cloudwatch"
                                        url={null}
                                        dockLink="https://docs.openreplay.com/integrations/cloudwatch"
                                        onClick={() =>
                                            this.showIntegrationConfig(
                                                CLOUDWATCH
                                            )
                                        }
                                        integrated={cloudwatchIntegrated}
                                    />

                                    <IntegrationItem
                                        title="New Relic"
                                        description="New Relic's application monitoring gives you detailed performance metrics for every aspect of your environment."
                                        icon="integrations/newrelic"
                                        url={null}
                                        dockLink="https://docs.openreplay.com/integrations/newrelic"
                                        onClick={() =>
                                            this.showIntegrationConfig(NEWRELIC)
                                        }
                                        integrated={newrelicIntegrated}
                                    />
                                </div>
                            </div>
                        </div>
                    </Loader>
                )}
            </div>
        );
    }
}
