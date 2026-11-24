import { makeAutoObservable } from 'mobx';

import { validateURL } from 'App/validate';

import { API_KEY_ID_LENGTH, API_KEY_LENGTH } from './consts';

export interface Integration {
  validate(): boolean;
  exists(): boolean;
  toData(): Record<string, any>;
  edit(data: Record<string, any>): void;
}

export class SentryInt implements Integration {
  projectId: number;

  organizationSlug: string = '';

  projectSlug: string = '';

  token: string = '';

  constructor(config: any) {
    Object.assign(this, {
      ...config,
      projectId: config?.projectId ?? -1,
    });
    makeAutoObservable(this);
  }

  edit = (data: Record<string, any>) => {
    Object.keys(data).forEach((key) => {
      this[key] = data[key];
    });
  };

  validate() {
    return Boolean(this.organizationSlug && this.projectSlug && this.token);
  }

  exists() {
    return this.projectId >= 0;
  }

  toData() {
    return {
      organizationSlug: this.organizationSlug,
      projectSlug: this.projectSlug,
      token: this.token,
      projectId: this.projectId,
    };
  }
}

export class DatadogInt implements Integration {
  apiKey: string = '';

  applicationKey: string = '';

  projectId: number;

  constructor(config: any) {
    Object.assign(this, {
      ...config,
      projectId: config?.projectId ?? -1,
    });
    makeAutoObservable(this);
  }

  edit = (data: Record<string, any>) => {
    Object.keys(data).forEach((key) => {
      this[key] = data[key];
    });
  };

  validate() {
    return Boolean(this.apiKey && this.applicationKey);
  }

  exists() {
    return this.projectId >= 0;
  }

  toData() {
    return {
      apiKey: this.apiKey,
      applicationKey: this.applicationKey,
      projectId: this.projectId,
    };
  }
}

export class ElasticSearchInt implements Integration {
  projectId: number;

  host: string = '';

  apiKeyId: string = '';

  apiKey: string = '';

  indexes: string = '*log*';

  port: number = 9200;

  constructor(config: any) {
    Object.assign(this, {
      ...config,
      projectId: config?.projectId ?? -1,
    });
    makeAutoObservable(this);
  }

  edit = (data: Record<string, any>) => {
    Object.keys(data).forEach((key) => {
      this[key] = data[key];
    });
  };

  private validateKeys() {
    return Boolean(
      this.apiKeyId.length > API_KEY_ID_LENGTH &&
        this.apiKey.length > API_KEY_LENGTH &&
        validateURL(this.host),
    );
  }

  validate() {
    return (
      this.host !== '' &&
      this.apiKeyId !== '' &&
      this.apiKey !== '' &&
      this.indexes !== '' &&
      !!this.port &&
      this.validateKeys()
    );
  }

  exists() {
    return this.projectId >= 0;
  }

  toData() {
    return {
      host: this.host,
      apiKeyId: this.apiKeyId,
      apiKey: this.apiKey,
      indexes: this.indexes,
      port: this.port,
      projectId: this.projectId,
    };
  }
}

export class JiraInt implements Integration {
  projectId: number;

  username: string = '';

  token: string = '';

  url: string = '';

  constructor(config: any) {
    Object.assign(this, {
      ...config,
      projectId: config?.projectId ?? -1,
    });
    makeAutoObservable(this);
  }

  edit = (data: Record<string, any>) => {
    Object.keys(data).forEach((key) => {
      this[key] = data[key];
    });
  };

  validateFetchProjects() {
    return this.username !== '' && this.token !== '' && validateURL(this.url);
  }

  validate() {
    return this.validateFetchProjects();
  }

  exists() {
    return !!this.token;
  }

  toData() {
    return {
      username: this.username,
      token: this.token,
      url: this.url,
      projectId: this.projectId,
    };
  }
}

export class GithubInt implements Integration {
  projectId: number;

  provider: string = 'github';

  token: string = '';

  constructor(config: any) {
    Object.assign(this, {
      ...config,
      projectId: config?.projectId ?? -1,
    });
    makeAutoObservable(this);
  }

  edit = (data: Record<string, any>) => {
    Object.keys(data).forEach((key) => {
      this[key] = data[key];
    });
  };

  validate() {
    return this.token !== '';
  }

  exists() {
    return !!this.token;
  }

  toData() {
    return {
      provider: this.provider,
      token: this.token,
      projectId: this.projectId,
    };
  }
}

export class LinearInt implements Integration {
  projectId: number;

  provider: string = 'linear';

  token: string = '';

  constructor(config: any) {
    Object.assign(this, {
      ...config,
      projectId: config?.projectId ?? -1,
    });
    makeAutoObservable(this);
  }

  edit = (data: Record<string, any>) => {
    Object.keys(data).forEach((key) => {
      this[key] = data[key];
    });
  };

  validate() {
    return this.token !== '';
  }

  exists() {
    return !!this.token;
  }

  toData() {
    return {
      provider: this.provider,
      token: this.token,
      projectId: this.projectId,
    };
  }
}

export class IssueTracker implements Integration {
  username: string = '';

  token: string = '';

  url: string = '';

  provider = 'jira';

  constructor(config: any) {
    Object.assign(this, {
      ...config,
    });
    makeAutoObservable(this);
  }

  edit = (data: Record<string, any>) => {
    Object.keys(data).forEach((key) => {
      this[key] = data[key];
    });
  };

  validateFetchProjects() {
    return this.username !== '' && this.token !== '' && validateURL(this.url);
  }

  validate() {
    return !!this.url;
  }

  exists() {
    return !!this.token;
  }

  toData() {
    return {
      username: this.username,
      token: this.token,
      url: this.url,
      provider: this.provider,
    };
  }
}
