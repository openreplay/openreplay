import { makeAutoObservable } from 'mobx';

import { validateURL } from 'App/validate';

export interface Integration {
  validate(): boolean;
  exists(): boolean;
  toData(): Record<string, any>;
}

export class SentryInt implements Integration {
  projectId: number;
  organizationSlug: string = '';
  projectSlug: string = '';
  token: string = '';

  constructor(config: any) {
    Object.assign(this, {
      ...config,
      projectId: config.projectId || -1,
    });
  }

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
      projectId: config.projectId || -1,
    });
  }

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

export class StackDriverInt implements Integration {
  projectId: number;
  logName: string = '';
  serviceAccountCredentials: string = '';

  constructor(config: any) {
    Object.assign(this, {
      ...config,
      projectId: config.projectId || -1,
    });
  }

  validate() {
    return Boolean(
      this.serviceAccountCredentials !== '' && this.logName !== ''
    );
  }

  exists() {
    return this.projectId >= 0;
  }

  toData() {
    return {
      logName: this.logName,
      serviceAccountCredentials: this.serviceAccountCredentials,
      projectId: this.projectId,
    };
  }
}

export class RollbarInt implements Integration {
  projectId: number;
  accessToken: string = '';

  constructor(config: any) {
    Object.assign(this, {
      ...config,
      projectId: config.projectId || -1,
    });
  }

  validate() {
    return Boolean(this.accessToken);
  }

  exists() {
    return this.projectId >= 0;
  }

  toData() {
    return {
      accessToken: this.accessToken,
      projectId: this.projectId,
    };
  }
}

export class NewRelicInt implements Integration {
  projectId: number;
  applicationId: string = '';
  xQueryKey: string = '';
  region: boolean = true;

  constructor(config: any) {
    Object.assign(this, {
      ...config,
      projectId: config.projectId || -1,
    });
  }

  validate() {
    return Boolean(this.applicationId && this.xQueryKey);
  }

  exists() {
    return this.projectId >= 0;
  }

  toData() {
    return {
      applicationId: this.applicationId,
      xQueryKey: this.xQueryKey,
      region: this.region,
      projectId: this.projectId,
    };
  }
}

export class Bugsnag implements Integration {
  projectId: number;
  authorizationToken: string = '';
  bugsnagProjectId: string = '';

  constructor(config: any) {
    Object.assign(this, {
      ...config,
      projectId: config.projectId || -1,
    });
  }

  validate() {
    return Boolean(
      this.bugsnagProjectId !== '' && tokenRE.test(this.authorizationToken)
    );
  }

  exists() {
    return this.projectId >= 0;
  }

  toData() {
    return {
      authorizationToken: this.authorizationToken,
      bugsnagProjectId: this.bugsnagProjectId,
      projectId: this.projectId,
    };
  }
}

export class Cloudwatch implements Integration {
  projectId: number;
  awsAccessKeyId: string = '';
  awsSecretAccessKey: string = '';
  region: string = 'us-east-1';
  logGroupName: string = '';

  constructor(config: any) {
    Object.assign(this, {
      ...config,
      projectId: config.projectId || -1,
    });
  }

  validate() {
    return Boolean(
      this.awsAccessKeyId !== '' &&
        this.awsSecretAccessKey !== '' &&
        this.logGroupName !== '' &&
        this.region !== ''
    );
  }

  exists() {
    return this.projectId >= 0;
  }

  toData() {
    return {
      awsAccessKeyId: this.awsAccessKeyId,
      awsSecretAccessKey: this.awsSecretAccessKey,
      region: this.region,
      logGroupName: this.logGroupName,
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
      projectId: config.projectId || -1,
    });
  }

  private validateKeys() {
    return Boolean(
      this.apiKeyId.length > API_KEY_ID_LENGTH &&
        this.apiKey.length > API_KEY_LENGTH &&
        validateURL(this.host)
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

export class SumoLogic implements Integration {
  projectId: number;
  accessId: string = '';
  accessKey: string = '';
  region: 'au';

  constructor(config: any) {
    Object.assign(this, {
      ...config,
      projectId: config.projectId || -1,
    });
  }

  validate() {
    return Boolean(this.accessKey && this.accessId);
  }

  exists() {
    return this.projectId >= 0;
  }

  toData() {
    return {
      accessId: this.accessId,
      accessKey: this.accessKey,
      region: this.region,
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
      projectId: config.projectId || -1,
    });
  }

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
      projectId: config.projectId || -1,
    });
  }

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
  }

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

export const sumoRegionLabels = {
  au: 'Asia Pacific (Sydney)',
  ca: 'Canada (Central)',
  de: 'EU (Frankfurt)',
  eu: 'EU (Ireland)',
  fed: 'US East (N. Virginia)',
  in: 'Asia Pacific (Mumbai)',
  jp: 'Asia Pacific (Tokyo)',
  us1: 'US East (N. Virginia)',
  us2: 'US West (Oregon)',
};
export const API_KEY_ID_LENGTH = 5;
export const API_KEY_LENGTH = 5;
export const SECRET_ACCESS_KEY_LENGTH = 40;
export const ACCESS_KEY_ID_LENGTH = 20;
export const tokenRE =
  /^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/i;
export const awsRegionLabels = {
  'us-east-1': 'US East (N. Virginia)',
  'us-east-2': 'US East (Ohio)',
  'us-west-1': 'US West (N. California)',
  'us-west-2': 'US West (Oregon)',
  'ap-east-1': 'Asia Pacific (Hong Kong)',
  'ap-south-1': 'Asia Pacific (Mumbai)',
  'ap-northeast-2': 'Asia Pacific (Seoul)',
  'ap-southeast-1': 'Asia Pacific (Singapore)',
  'ap-southeast-2': 'Asia Pacific (Sydney)',
  'ap-northeast-1': 'Asia Pacific (Tokyo)',
  'ca-central-1': 'Canada (Central)',
  'eu-central-1': 'EU (Frankfurt)',
  'eu-west-1': 'EU (Ireland)',
  'eu-west-2': 'EU (London)',
  'eu-west-3': 'EU (Paris)',
  'eu-north-1': 'EU (Stockholm)',
  'me-south-1': 'Middle East (Bahrain)',
  'sa-east-1': 'South America (São Paulo)',
};
