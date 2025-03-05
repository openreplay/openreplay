import React from 'react';

import { countries } from 'App/constants';
import { numberWithCommas } from 'App/utils';

import { FilterKey } from 'Types/filter/filterType';
import {
  BrowserIconProvider,
  CountryIconProvider,
  DeviceIconProvider,
  IconProvider,
  IssueIconProvider,
  OsIconProvider,
  ReferrerIconProvider,
  UrlIconProvider,
  UserIconProvider,
  FetchIconProvider,
} from './IconProvider';

interface NameFormatter {
  format(name: string): string;
}

class DefaultFormatter implements NameFormatter {
  format(name: string): string {
    return name;
  }
}

class BaseFormatter implements NameFormatter {
  format(name: string): string {
    return name
      ?.replace(/_/g, ' ')
      .replace(/\w\S*/g, (w) => w.replace(/^\w/, (c) => c.toUpperCase()))
      .trim();
  }
}

class BrowserFormatter extends BaseFormatter {
  format(name: string): string {
    return super.format(name);
  }
}

class CountryFormatter extends BaseFormatter {
  format(name: string): string {
    if (name === 'UN') {
      return 'Unknown Country';
    }
    return countries[name.toUpperCase()] || name;
  }
}

class IssueFormatter extends BaseFormatter {
  format(name: string): string {
    return super.format(name);
  }
}

class UserNameFormatter extends BaseFormatter {
  format(name: string): string {
    if (
      name === null ||
      name === undefined ||
      name === '' ||
      name === 'null' ||
      name === 'undefined'
    ) {
      return 'Anonymous';
    }

    return super.format(name);
  }
}

export class SessionsByRow {
  name: string;

  displayName: string;

  sessionCount: number;

  progress: number;

  icon: React.ReactNode;

  fromJson(json: any, totalSessions: number, metricType: string) {
    const { nameFormatter, iconProvider } = this.getFormatters(metricType);
    this.name = json.name;
    this.displayName = nameFormatter.format(json.name) || 'Unidentified';
    this.sessionCount = numberWithCommas(json.total);
    this.progress = Math.round((json.total / totalSessions) * 100);
    this.icon = iconProvider.getIcon(json);
    return this;
  }

  private getFormatters(metricType: string): {
    nameFormatter: NameFormatter;
    iconProvider: IconProvider;
  } {
    switch (metricType) {
      case 'userBrowser':
        return {
          nameFormatter: new BrowserFormatter(),
          iconProvider: new BrowserIconProvider(),
        };
      case 'userCountry':
        return {
          nameFormatter: new CountryFormatter(),
          iconProvider: new CountryIconProvider(),
        };
      case 'issue':
        return {
          nameFormatter: new IssueFormatter(),
          iconProvider: new IssueIconProvider(),
        };
      case FilterKey.LOCATION:
        return {
          nameFormatter: new DefaultFormatter(),
          iconProvider: new UrlIconProvider(),
        };
      case 'userDevice':
        return {
          nameFormatter: new BaseFormatter(),
          iconProvider: new DeviceIconProvider(),
        };
      case 'platform':
        return {
          nameFormatter: new BaseFormatter(),
          iconProvider: new OsIconProvider(),
        };
      case 'userId':
        return {
          nameFormatter: new UserNameFormatter(),
          iconProvider: new UserIconProvider(),
        };
      case FilterKey.REFERRER:
        return {
          nameFormatter: new DefaultFormatter(),
          iconProvider: new ReferrerIconProvider(),
        };
      case FilterKey.FETCH:
        return {
          nameFormatter: new DefaultFormatter(),
          iconProvider: new FetchIconProvider(),
        };
      default:
        return {
          nameFormatter: new BaseFormatter(),
          iconProvider: new DefaultIconProvider(),
        };
    }
  }
}

class DefaultIconProvider implements IconProvider {
  getIcon(name: string): string {
    return 'ic-user-path';
  }
}
