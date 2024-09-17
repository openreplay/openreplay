import { makeAutoObservable } from 'mobx';

import { integrationsService } from 'App/services';

import {
  Bugsnag,
  Cloudwatch,
  DatadogInt,
  ElasticSearchInt,
  GithubInt,
  Integration,
  IssueTracker,
  JiraInt,
  NewRelicInt,
  RollbarInt,
  SentryInt,
  StackDriverInt,
  SumoLogic,
} from './types/integrations';

class GenericIntegrationsStore {
  list: any[] = [];
  siteId: string | null = null;
  constructor() {
    makeAutoObservable(this);
  }

  setSiteId(siteId: string) {
    this.siteId = siteId;
  }

  setList(list: any[]) {
    this.list = list;
  }

  fetchIntegrations = async () => {
    //client.get(`/${siteID}/integrations`)
    // this.setList()
  };
}

class NamedIntegrationStore<T extends Integration> {
  instance: T | null = null;
  list: T[] = [];
  fetched: boolean = false;
  issuesFetched: boolean = false;

  constructor(
    private readonly name: string,
    private readonly NamedType: new (config: Record<string, any>) => T
  ) {
    makeAutoObservable(this);
  }

  setInstance(instance: T): void {
    this.instance = instance;
  }

  setList(list: T[]): void {
    this.list = list;
  }

  setFetched(fetched: boolean): void {
    this.fetched = fetched;
  }

  setIssuesFetched(issuesFetched: boolean): void {
    this.issuesFetched = issuesFetched;
  }

  fetchIntegrations = async (): Promise<void> => {
    const { data } = await integrationsService.fetchList(this.name);
    this.setList(
      data.map((config: Record<string, any>) => new this.NamedType(config))
    );
  };

  fetchIntegration = async (siteId: string): void => {
    const { data } = await integrationsService.fetchIntegration(
      this.name,
      siteId
    );
    this.setInstance(new this.NamedType(data));
  };

  saveIntegration(name: string, siteId: string): void {
    if (!this.instance) return;
    const response = integrationsService.saveIntegration(
      name,
      siteId,
      this.instance.toData()
    );
    return;
  }

  edit(data: T): void {
    this.setInstance(data);
  }

  deleteIntegration(siteId: string) {
    if (!this.instance) return;
    return integrationsService.removeIntegration(this.name, siteId);
  }

  init(config: Record<string, any>): void {
    this.instance = new this.NamedType(config);
  }
}

export class IntegrationsStore {
  sentry = new NamedIntegrationStore('sentry', SentryInt);
  datadog = new NamedIntegrationStore('datadog', DatadogInt);
  stackdriver = new NamedIntegrationStore('stackdriver', StackDriverInt);
  rollbar = new NamedIntegrationStore('rollbar', RollbarInt);
  newrelic = new NamedIntegrationStore('newrelic', NewRelicInt);
  bugsnag = new NamedIntegrationStore('bugsnag', Bugsnag);
  cloudwatch = new NamedIntegrationStore('cloudwatch', Cloudwatch);
  elasticsearch = new NamedIntegrationStore('elasticsearch', ElasticSearchInt);
  sumologic = new NamedIntegrationStore('sumologic', SumoLogic);
  jira = new NamedIntegrationStore('jira', JiraInt);
  github = new NamedIntegrationStore('github', GithubInt);
  issues = new NamedIntegrationStore('issues', IssueTracker);
  integrations = new GenericIntegrationsStore();
  // + slack
  // + teams
}
