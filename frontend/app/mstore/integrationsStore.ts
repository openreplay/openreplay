import { makeAutoObservable } from 'mobx';

import { integrationsService } from 'App/services';

import { serviceNames } from 'App/components/Client/Integrations/apiMethods';
import { toast } from 'react-toastify';
import { MessengerConfig } from './types/integrations/messengers';
import {
  DatadogInt,
  ElasticSearchInt,
  GithubInt,
  Integration,
  IssueTracker,
  JiraInt,
  SentryInt,
} from './types/integrations/services';

class GenericIntegrationsStore {
  list: any[] = [];

  isLoading: boolean = false;

  siteId: string = '';

  constructor() {
    makeAutoObservable(this);
  }

  setSiteId(siteId: string) {
    this.siteId = siteId;
  }

  get integratedServices() {
    return this.list.filter((int) => int.integrated);
  }

  get backendLogIntegrations(): { name: string; integrated: boolean }[] {
    const backendServices = Object.keys(serviceNames);
    return this.list.filter(
      (int) => int.integrated && backendServices.includes(int.name),
    );
  }

  setList(list: any[]) {
    this.list = list;
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  fetchIntegrations = async (siteId?: string) => {
    this.setLoading(true);
    try {
      const { data } = await integrationsService.fetchList(undefined, siteId);
      this.setList(data);
    } catch (e) {
      console.log(e);
    } finally {
      this.setLoading(false);
    }
  };
}

class NamedIntegrationStore<T extends Integration> {
  instance: T | null = null;

  list: T[] = [];

  fetched: boolean = false;

  issuesFetched: boolean = false;

  loading = false;

  constructor(
    private readonly name: string,
    private readonly namedTypeCreator: (config: Record<string, any>) => T,
  ) {
    this.instance = namedTypeCreator({});
    makeAutoObservable(this);
  }

  setLoading(loading: boolean): void {
    this.loading = loading;
  }

  setInstance(instance: T): void {
    this.instance = instance;
  }

  setList = (list: T[]): void => {
    this.list = list;
  };

  setFetched = (fetched: boolean): void => {
    this.fetched = fetched;
  };

  setIssuesFetched = (issuesFetched: boolean): void => {
    this.issuesFetched = issuesFetched;
  };

  fetchIntegrations = async (): Promise<void> => {
    this.setLoading(true);
    try {
      const { data } = await integrationsService.fetchList(this.name);
      if (Array.isArray(data)) {
        this.setList(
          data.map((config: Record<string, any>) =>
            this.namedTypeCreator(config),
          ),
        );
      } else {
        this.setList([this.namedTypeCreator(data)]);
      }
    } catch (e) {
      console.log(e);
    } finally {
      this.setFetched(true);
      this.setLoading(false);
    }
  };

  fetchIntegration = async (siteId: string): Promise<void> => {
    this.setLoading(true);
    try {
      const { data } = await integrationsService.fetchIntegration(
        this.name,
        siteId,
      );
      this.setInstance(this.namedTypeCreator(data));
    } catch (e) {
      console.log(e);
    } finally {
      this.setLoading(false);
    }
  };

  saveIntegration = async (name: string, siteId?: string): Promise<void> => {
    if (!this.instance) return;
    await integrationsService.saveIntegration(
      this.name ?? name,
      this.instance.toData(),
      siteId,
    );
  };

  edit = (data: T): void => {
    if (!this.instance) {
      this.instance = this.namedTypeCreator({});
    }
    this.instance.edit(data);
  };

  deleteIntegration = async (siteId?: string) => {
    if (!this.instance) return;
    return integrationsService.removeIntegration(this.name, siteId);
  };

  init = (config: Record<string, any>): void => {
    this.instance = this.namedTypeCreator(config);
  };
}

class MessengerIntegrationStore {
  list: MessengerConfig[] = [];

  instance: MessengerConfig | null = null;

  loaded: boolean = false;

  loading: boolean = false;

  errors: any[] = [];

  constructor(private readonly mName: 'slack' | 'msteams') {
    makeAutoObservable(this);
  }

  setList(list: MessengerConfig[]): void {
    this.list = list;
  }

  setLoading(loading: boolean): void {
    this.loading = loading;
  }

  setInstance(instance: MessengerConfig): void {
    this.instance = instance;
  }

  setLoaded(loaded: boolean): void {
    this.loaded = loaded;
  }

  setErrors = (errors: any[]) => {
    this.errors = errors;
  };

  saveIntegration = async (): Promise<void> => {
    if (!this.instance) return;
    this.setLoading(true);
    try {
      const response = await integrationsService.saveIntegration(
        this.mName,
        this.instance.toData(),
        undefined,
      );
      if (response.errors) {
        toast.error(
          response.errors[0] ||
            "Couldn't process the request: check your data.",
        );
        return response;
      }
      this.instance.edit({ webhookId: response.data.webhookId });
      this.setList([...this.list, this.instance]);
    } catch (e) {
      toast.error("Couldn't process the request: check your data.");
    } finally {
      this.setLoading(false);
    }
  };

  fetchIntegrations = async (): Promise<void> => {
    const { data } = await integrationsService.fetchMessengerChannels(
      this.mName,
    );
    this.setList(
      data.map((config: Record<string, any>) => new MessengerConfig(config)),
    );
    this.setLoaded(true);
  };

  sendMessage = ({
    integrationId,
    entity,
    entityId,
    data,
  }: {
    integrationId: string;
    entity: string;
    entityId: string;
    data: any;
  }) =>
    integrationsService.sendMsg(
      integrationId,
      entity,
      entityId,
      this.mName,
      data,
    );

  init = (config: Record<string, any>): void => {
    this.instance = new MessengerConfig(config);
  };

  removeInt = async (intId: string) => {
    await integrationsService.removeMessengerInt(this.mName, intId);
    this.setList(this.list.filter((int) => int.webhookId !== intId));
  };

  edit = (data: Record<string, any>): void => {
    if (!this.instance) {
      this.instance = new MessengerConfig({});
    }
    this.instance.edit(data);
  };

  update = async () => {
    if (!this.instance) return;
    this.setLoading(true);
    try {
      const response = await integrationsService.updateMessengerInt(
        this.mName,
        this.instance.toData(),
      );

      if (response.errors) {
        toast.error(
          response.errors[0] ||
            "Couldn't process the request: check your data.",
        );
        return response;
      }
      this.setList(
        this.list.map((int) =>
          int.webhookId === this.instance?.webhookId ? this.instance : int,
        ),
      );
    } catch (e) {
      toast.error("Couldn't process the request: check your data.");
    } finally {
      this.setLoading(false);
    }
  };
}

export type namedStore =
  | 'sentry'
  | 'datadog'
  | 'stackdriver'
  | 'rollbar'
  | 'newrelic'
  | 'bugsnag'
  | 'cloudwatch'
  | 'elasticsearch'
  | 'sumologic'
  | 'jira'
  | 'github'
  | 'issues';

export class IntegrationsStore {
  sentry = new NamedIntegrationStore('sentry', (d) => new SentryInt(d));

  datadog = new NamedIntegrationStore('datadog', (d) => new DatadogInt(d));

  elasticsearch = new NamedIntegrationStore(
    'elasticsearch',
    (d) => new ElasticSearchInt(d),
  );

  jira = new NamedIntegrationStore('jira', (d) => new JiraInt(d));

  github = new NamedIntegrationStore('github', (d) => new GithubInt(d));

  issues = new NamedIntegrationStore('issues', (d) => new IssueTracker(d));

  integrations = new GenericIntegrationsStore();

  slack = new MessengerIntegrationStore('slack');

  msteams = new MessengerIntegrationStore('msteams');

  constructor() {
    makeAutoObservable(this);
  }
}
