import { numberWithCommas } from 'App/utils';
import { countries } from 'App/constants';
import {
  BrowserIconProvider,
  CountryIconProvider, DeviceIconProvider,
  IconProvider,
  IssueIconProvider, OsIconProvider,
  UrlIconProvider, UserIconProvider
} from './IconProvider';
import React from 'react';

interface NameFormatter {
  format(name: string): string;
}

class BaseFormatter implements NameFormatter {
  format(name: string): string {
    return name?.replace(/_/g, ' ').replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase()))).trim();
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
    if (name === null || name === undefined || name === '' || name === 'null' || name === 'undefined') {
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
    this.sessionCount = numberWithCommas(json.sessionCount);
    this.progress = Math.round((json.sessionCount / totalSessions) * 100);
    this.icon = iconProvider.getIcon(json);
    return this;
  }

  private getFormatters(metricType: string): { nameFormatter: NameFormatter; iconProvider: IconProvider } {
    switch (metricType) {
      case 'userBrowser':
        return { nameFormatter: new BrowserFormatter(), iconProvider: new BrowserIconProvider() };
      case 'userCountry':
        return { nameFormatter: new CountryFormatter(), iconProvider: new CountryIconProvider() };
      case 'issue':
        return { nameFormatter: new IssueFormatter(), iconProvider: new IssueIconProvider() };
      case 'location':
        return { nameFormatter: new BaseFormatter(), iconProvider: new UrlIconProvider() };
      case 'userDevice':
        return { nameFormatter: new BaseFormatter(), iconProvider: new DeviceIconProvider() };
      case 'platform':
        return { nameFormatter: new BaseFormatter(), iconProvider: new OsIconProvider() };
      case 'userId':
        return { nameFormatter: new UserNameFormatter(), iconProvider: new UserIconProvider() };
      default:
        return { nameFormatter: new BaseFormatter(), iconProvider: new DefaultIconProvider() };
    }
  }
}

class DefaultIconProvider implements IconProvider {
  getIcon(name: string): string {
    return 'ic-user-path';
  }
}
